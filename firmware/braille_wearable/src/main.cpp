#include <Arduino.h>
#include <math.h>
#include <string.h>

#include "audio.h"
#include "haptic.h"
#include "haptic_pure.h"
#include "navigation_pure.h"
#include "net.h"
#include "output_telemetry_pure.h"
#include "patterns.h"
#include "siren_runtime_pure.h"
#include "tof.h"

namespace {

constexpr uint16_t PROXIMITY_PULSE_ON_MS = 120;
constexpr uint32_t READY_DELAY_MS = 1100;

ActivityControlState activityControl;
RelaySequenceState relaySequence;
UserActivity currentActivity = UserActivity::MOVING;
PatternPlayer cloudPlayer;
OutputTelemetrySource cloudPlayerSource = OutputTelemetrySource::NONE;
PatternPlayer sirenPlayer;
OutputEnableLatch outputLatch;
SirenDecision activeSirenOutput = SirenDecision::NONE;
SirenDecision detectedSiren = SirenDecision::NONE;
const OutputPattern* pendingSirenPattern = nullptr;
bool sirenClearing = false;
uint32_t sirenClearingStartedMs = 0;
bool proximityActive = false;
bool proximityOutputAllowed = false;
bool proximityToneOn = false;
bool proximityClearing = false;
uint16_t proximityGapMs = PROXIMITY_SLOW_GAP_MS;
uint32_t proximityClearingStartedMs = 0;
uint32_t nextProximityTransitionMs = 0;
bool readyPending = true;
uint32_t readyEligibleAtMs = 0;
RelayTelemetry relayTelemetry;
uint32_t lastTelemetryPublishMs = 0;
bool hasOutputTelemetry = false;
HapticDrive lastOutputTelemetryDrive{0, 0};
OutputSemanticSnapshot lastOutputTelemetrySnapshot{
    OutputTelemetryState::IDLE,
    OutputTelemetrySource::NONE,
    "NONE",
    UserActivity::MOVING,
    OutputTelemetryReason::NO_OUTPUT,
    -1,
    DEFAULT_OUTPUT_MODE,
};
uint32_t lastOutputTelemetryMs = 0;

void startSirenOutput(SirenDecision decision, uint32_t nowMs);

bool sirenOutputActive() {
    return activeSirenOutput != SirenDecision::NONE;
}

bool proximityCanRender() {
    return shouldRenderProximity(currentActivity, proximityActive,
                                 proximityOutputAllowed);
}

const OutputPattern& patternForSirenDecision(SirenDecision decision) {
    switch (decision) {
        case SirenDecision::ATTENTION: return ATTENTION_PATTERN;
        case SirenDecision::SIREN_WARNING: return SIREN_WARNING_PATTERN;
        case SirenDecision::DANGER: return DANGER_PATTERN;
        case SirenDecision::NONE: return ATTENTION_PATTERN;
    }
    return ATTENTION_PATTERN;
}

void stopCloudPattern() {
    stopPattern(cloudPlayer);
    if (!proximityCanRender() && !sirenOutputActive()) {
        hapticStop();
    }
}

void refreshEffectiveActivity(uint32_t nowMs, const char* source) {
    const UserActivity nextActivity = effectiveActivity(activityControl, nowMs);
    if (currentActivity == nextActivity) {
        return;
    }

    const UserActivity previousActivity = currentActivity;
    currentActivity = nextActivity;
    stopPattern(cloudPlayer);
    if (activityTransitionClearsProximity(previousActivity, currentActivity)) {
        proximityToneOn = false;
        proximityClearing = false;
        if (!sirenOutputActive()) {
            hapticStop();
        }
        Serial.printf("PROXIMITY output=cleared reason=activity_%s\n",
                      userActivityName(currentActivity));
    } else if (proximityCanRender() && !sirenOutputActive()) {
        stopPattern(cloudPlayer);
        proximityToneOn = false;
        proximityClearing = true;
        proximityClearingStartedMs = nowMs;
        hapticStop();
    }
    Serial.printf("ACTIVITY changed=%s previous=%s source=%s\n",
                  userActivityName(currentActivity),
                  userActivityName(previousActivity), source);
}

void setServiceActivityMode(UserActivity activity) {
    if (activity == UserActivity::UNKNOWN) {
        return;
    }
    setServiceActivity(activityControl, activity);
    refreshEffectiveActivity(millis(), "service_serial");
    Serial.printf("ACTIVITY service_override=%s\n", userActivityName(activity));
}

void clearServiceActivityMode() {
    clearServiceActivity(activityControl);
    refreshEffectiveActivity(millis(), "relay_control");
    Serial.println(F("ACTIVITY service_override=cleared source=relay"));
}

void submitCloudCommand(CloudCommand command, const char* name,
                        OutputTelemetrySource source) {
    switch (evaluateCommandGate(outputLatch.enabled, currentActivity, command,
                                proximityCanRender(), sirenOutputActive())) {
        case CommandGate::OUTPUT_STOPPED:
            Serial.printf("COMMAND dropped=%s reason=output_stopped\n", name);
            return;
        case CommandGate::ACTIVITY_GATE:
            Serial.printf("COMMAND dropped=%s activity=%s reason=activity_gate\n",
                          name, userActivityName(currentActivity));
            return;
        case CommandGate::LOCAL_PROXIMITY:
            Serial.printf("COMMAND dropped=%s activity=%s reason=local_proximity\n",
                          name, userActivityName(currentActivity));
            return;
        case CommandGate::LOCAL_SIREN:
            Serial.printf("COMMAND dropped=%s activity=%s reason=local_siren\n",
                          name, userActivityName(currentActivity));
            return;
        case CommandGate::ALLOW:
            break;
    }
    const OutputPattern* pattern = cloudPattern(command);
    if (pattern == nullptr) {
        Serial.printf("COMMAND unsupported=%s\n", name);
        return;
    }
    startPattern(cloudPlayer, *pattern, millis());
    cloudPlayerSource = source;
    Serial.printf("COMMAND accepted=%s activity=%s\n", name,
                  userActivityName(currentActivity));
}

void submitServiceDirection(ServiceDirection direction, const char* name) {
    if (!outputLatch.enabled) {
        Serial.printf("CHANNEL_SIMULATION dropped=%s reason=output_stopped\n", name);
        return;
    }
    if (currentActivity != UserActivity::MOVING) {
        Serial.printf("CHANNEL_SIMULATION dropped=%s activity=%s reason=movement_only\n",
                      name, userActivityName(currentActivity));
        return;
    }
    if (proximityCanRender() || sirenOutputActive()) {
        Serial.printf("CHANNEL_SIMULATION dropped=%s reason=local_priority\n", name);
        return;
    }
    const OutputPattern* pattern = serviceDirectionPattern(direction);
    if (pattern != nullptr) {
        startPattern(cloudPlayer, *pattern, millis());
        cloudPlayerSource = OutputTelemetrySource::SERVICE;
        Serial.printf("CHANNEL_SIMULATION accepted=%s claim=concept_only\n", name);
    }
}

void printHelp() {
    Serial.println();
    Serial.println(F("=== Integrated board firmware: local sensing + relay gate ==="));
    Serial.println(F("n/s  service override MOVING or STILL"));
    Serial.println(F("c  clear service override and return activity control to relay"));
    Serial.println(F("l/r/a  conceptual channel simulation only; no sensed direction"));
    Serial.println(F("b/w  BUS or WAIT relay-scenario input"));
    Serial.println(F("8/u/e  route 88, UNKNOWN, or ERROR relay-scenario input"));
    Serial.println(F("x  emergency stop all output; sensing continues"));
    Serial.println(F("o  resume board output after an emergency stop"));
    Serial.println(F("q/v  NIGHT hardware mute or AUDIBLE output mode"));
    Serial.println(F("h  print this help"));
    Serial.println(F("ToF samples in both states but outputs only while MOVING."));
    Serial.println(F("Siren sensing and output run locally in both states."));
    Serial.println();
}

void handleSerial(char command) {
    if (command >= 'A' && command <= 'Z') {
        command = static_cast<char>(command - 'A' + 'a');
    }
    switch (command) {
        case 'n': setServiceActivityMode(UserActivity::MOVING); break;
        case 's': setServiceActivityMode(UserActivity::STILL); break;
        case 'c': clearServiceActivityMode(); break;
        case 'l': submitServiceDirection(ServiceDirection::LEFT, "LEFT"); break;
        case 'r': submitServiceDirection(ServiceDirection::RIGHT, "RIGHT"); break;
        case 'a': submitServiceDirection(ServiceDirection::AHEAD, "AHEAD"); break;
        case 'b':
            submitCloudCommand(CloudCommand::BUS, "BUS",
                               OutputTelemetrySource::SERVICE);
            break;
        case 'w':
            submitCloudCommand(CloudCommand::WAIT, "WAIT",
                               OutputTelemetrySource::SERVICE);
            break;
        case '8':
            submitCloudCommand(CloudCommand::NUMBER, "NUMBER_88",
                               OutputTelemetrySource::SERVICE);
            break;
        case 'u':
            submitCloudCommand(CloudCommand::UNKNOWN, "UNKNOWN",
                               OutputTelemetrySource::SERVICE);
            break;
        case 'e':
            submitCloudCommand(CloudCommand::ERROR, "ERROR",
                               OutputTelemetrySource::SERVICE);
            break;
        case 'x':
            stopPattern(cloudPlayer);
            stopPattern(sirenPlayer);
            activeSirenOutput = SirenDecision::NONE;
            pendingSirenPattern = nullptr;
            sirenClearing = false;
            stopAllOutput(outputLatch);
            proximityToneOn = false;
            hapticStop();
            Serial.println(F("OUTPUT stopped=all sensing=active"));
            break;
        case 'o':
            resumeOutput(outputLatch);
            if (proximityCanRender()) {
                proximityToneOn = false;
                proximityClearing = true;
                proximityClearingStartedMs = millis();
            }
            if (detectedSiren != SirenDecision::NONE) {
                startSirenOutput(detectedSiren, millis());
            }
            Serial.println(F("OUTPUT resumed=all"));
            break;
        case 'q':
            hapticSetOutputMode(OutputMode::NIGHT);
            Serial.println(F("NIGHT_MODE active=1 hardware=muted telemetry=active"));
            break;
        case 'v':
            hapticSetOutputMode(OutputMode::AUDIBLE);
            Serial.println(F("NIGHT_MODE active=0 hardware=enabled telemetry=active"));
            break;
        case 'h': printHelp(); break;
        case '\r':
        case '\n': break;
        default: Serial.println(F("Unknown command. Enter h for controls.")); break;
    }
}

void startSirenOutput(SirenDecision decision, uint32_t nowMs) {
    if (!outputLatch.enabled) {
        Serial.printf("SIREN_OUTPUT dropped=%s reason=output_stopped\n",
                      sirenDecisionName(decision));
        return;
    }
    if (!canStartSirenOutput(decision, activeSirenOutput, proximityCanRender())) {
        Serial.printf("SIREN_OUTPUT dropped=%s active=%s proximity=%u reason=priority\n",
                      sirenDecisionName(decision),
                      sirenDecisionName(activeSirenOutput),
                      proximityCanRender() ? 1 : 0);
        return;
    }

    const bool preempting = patternOutput(cloudPlayer).active ||
                            patternOutput(sirenPlayer).active ||
                            proximityCanRender();
    stopPattern(cloudPlayer);
    stopPattern(sirenPlayer);
    proximityToneOn = false;
    hapticStop();

    activeSirenOutput = decision;
    pendingSirenPattern = &patternForSirenDecision(decision);
    sirenClearing = preempting;
    sirenClearingStartedMs = nowMs;
    if (!sirenClearing) {
        startPattern(sirenPlayer, *pendingSirenPattern, nowMs);
        pendingSirenPattern = nullptr;
    }
    Serial.printf("SIREN_OUTPUT accepted=%s clearing_ms=%u\n",
                  sirenDecisionName(decision),
                  sirenClearing ? HAPTIC_CLEARING_GAP_MS : 0);
}

void serviceAudio(uint32_t nowMs) {
    SirenDecision currentDecision = SirenDecision::NONE;
    if (audioPollCurrentDecision(currentDecision)) {
        detectedSiren = currentDecision;
    }

    SirenDecision decision = SirenDecision::NONE;
    while (audioPollDecision(decision)) {
        startSirenOutput(decision, nowMs);
    }

    AudioTelemetry telemetry{};
    if (audioPollTelemetry(telemetry)) {
        constexpr float BAND_BIN_COUNT =
            SIREN_ENERGY_LAST_BIN - SIREN_ENERGY_FIRST_BIN + 1;
        relayTelemetry.bandRms = sqrtf(telemetry.features.bandEnergy / BAND_BIN_COUNT);
        relayTelemetry.peakHz = static_cast<uint16_t>(
            telemetry.features.peakBin * SIREN_BIN_HZ);
        relayTelemetry.trendRising = telemetry.decision == SirenDecision::DANGER;
        Serial.printf(
            "AUDIO frames=%lu partial=%lu errors=%lu dropped=%lu sigma=%.1f "
            "band=%.3e floor=%.3e peak_bin=%u peak_ratio=%.3f health=%s decision=%s\n",
            static_cast<unsigned long>(telemetry.fullFrames),
            static_cast<unsigned long>(telemetry.partialReads),
            static_cast<unsigned long>(telemetry.readErrors),
            static_cast<unsigned long>(telemetry.droppedDecisions),
            telemetry.frame.standardDeviation,
            telemetry.features.bandEnergy,
            telemetry.features.noiseFloorEstimate,
            telemetry.features.peakBin,
            telemetry.features.peakEnergyRatio,
            audioFrameHealthName(telemetry.health),
            sirenDecisionName(telemetry.decision));
    }
}

void serviceReady(uint32_t nowMs) {
    if (!readyPending || !outputLatch.enabled || proximityCanRender() ||
        sirenOutputActive() || patternOutput(cloudPlayer).active ||
        static_cast<int32_t>(nowMs - readyEligibleAtMs) < 0) {
        return;
    }
    readyPending = false;
    startPattern(cloudPlayer, READY_PATTERN, nowMs);
    cloudPlayerSource = OutputTelemetrySource::SYSTEM;
    Serial.printf("READY activity=%s transport=%s tof=local mic=local\n",
                  userActivityName(currentActivity),
                  relayNetworkConfigured() ? "relay" : "offline_service");
}

void serviceSerial() {
    while (Serial.available() > 0) {
        handleSerial(static_cast<char>(Serial.read()));
    }
}

void applyTofUpdate(const TofUpdate& update, uint32_t nowMs) {
    if (!update.updated) {
        return;
    }

    const bool wasActive = proximityActive;
    const bool wasRendering = proximityCanRender();
    proximityActive = update.proximity.active;
    proximityOutputAllowed = update.proximity.outputAllowed;
    proximityGapMs = update.proximity.pulseGapMs;
    if (update.status == 0 && update.distanceMm > 0) {
        relayTelemetry.tofMm = update.distanceMm;
    }

    if (update.proximity.entered) {
        if (proximityCanRender()) {
            stopPattern(cloudPlayer);
            if (activeSirenOutput == SirenDecision::SIREN_WARNING) {
                stopPattern(sirenPlayer);
                activeSirenOutput = SirenDecision::NONE;
                pendingSirenPattern = nullptr;
                sirenClearing = false;
            }
            proximityToneOn = false;
            if (!sirenOutputActive()) {
                proximityClearing = true;
                proximityClearingStartedMs = nowMs;
                hapticStop();
            }
        }
        Serial.printf("PROXIMITY entered mm=%u activity=%s output=%s\n",
                      update.distanceMm,
                      userActivityName(currentActivity),
                      proximityCanRender() ? "enabled" : "suppressed");
    }
    if (update.proximity.exited) {
        proximityToneOn = false;
        proximityClearing = false;
        if (wasRendering && !sirenOutputActive()) {
            hapticStop();
        }
        Serial.println(F("PROXIMITY exited"));
    }
    if (wasActive && !proximityOutputAllowed &&
        allowsProximityOutput(currentActivity)) {
        proximityToneOn = false;
        if (!sirenOutputActive()) {
            hapticStop();
        }
    }
    if (update.timedOut) {
        Serial.println(F("TOF invalid=range_timeout output=revoked"));
    }
}

void serviceRelay(uint32_t nowMs) {
    RelayUpdate update{};
    while (relayPollUpdate(update)) {
        if (update.resetCommandBaseline) {
            resetRelayControlAfterOutage(relaySequence, activityControl);
            refreshEffectiveActivity(nowMs, "long_outage");
            Serial.println(F("RELAY command=baseline_reset activity=invalidated reason=long_outage"));
        }
        if (update.hasActivity) {
            if (update.activity == UserActivity::UNKNOWN) {
                invalidateCloudActivity(activityControl);
                Serial.printf("RELAY activity=invalidated override=%u\n",
                              activityControl.serviceOverride ? 1 : 0);
            } else {
                applyCloudActivity(activityControl, update.activity, nowMs);
                Serial.printf("RELAY activity=%s seq=%lu override=%u\n",
                              userActivityName(update.activity),
                              static_cast<unsigned long>(update.activitySeq),
                              activityControl.serviceOverride ? 1 : 0);
            }
            refreshEffectiveActivity(nowMs, "relay");
        }
        if (!update.hasCommand) {
            continue;
        }

        const RelayDecision decision = consumeRelayCommand(
            relaySequence, update.command, currentActivity);
        if (decision.sequenceGap) {
            Serial.printf("RELAY command=gap seq=%lu missed=%lu\n",
                          static_cast<unsigned long>(update.command.seq),
                          static_cast<unsigned long>(decision.missedCount));
        }
        Serial.printf(
            "RELAY command=%s pattern=%s seq=%lu activity=%s route=%s\n",
            relayDispositionName(decision.disposition),
            cloudCommandName(update.command.pattern),
            static_cast<unsigned long>(update.command.seq),
            userActivityName(currentActivity), update.command.route);

        if (decision.disposition == RelayDisposition::ACCEPT) {
            submitCloudCommand(update.command.pattern,
                               cloudCommandName(update.command.pattern),
                               OutputTelemetrySource::RELAY);
        } else if (decision.disposition == RelayDisposition::NO_OUTPUT) {
            stopCloudPattern();
        }
    }
}

const char* currentlyPlayingName() {
    if (!outputLatch.enabled) {
        return "NONE";
    }
    if (sirenOutputActive()) {
        if (activeSirenOutput == SirenDecision::SIREN_WARNING) return "SIREN";
        return sirenDecisionName(activeSirenOutput);
    }
    if (proximityCanRender()) {
        return "PROXIMITY";
    }
    if (cloudPlayer.pattern == nullptr || !patternOutput(cloudPlayer).active) {
        return "NONE";
    }
    if (cloudPlayer.pattern == &NUMBER_PATTERN) {
        return "NUMBER";
    }
    return cloudPlayer.pattern->name;
}

const char* currentSirenPatternName() {
    if (!sirenOutputActive()) {
        return "NONE";
    }
    if (activeSirenOutput == SirenDecision::SIREN_WARNING) {
        return "SIREN";
    }
    return sirenDecisionName(activeSirenOutput);
}

const char* currentCloudPatternName() {
    if (cloudPlayer.pattern == nullptr || !patternOutput(cloudPlayer).active) {
        return "NONE";
    }
    return cloudPlayer.pattern == &NUMBER_PATTERN ? "NUMBER" :
                                                    cloudPlayer.pattern->name;
}

OutputSemanticSnapshot currentOutputSemantics() {
    const OutputSemanticInputs inputs{
        outputLatch.enabled,
        sirenOutputActive(),
        currentSirenPatternName(),
        proximityActive,
        proximityCanRender(),
        patternOutput(cloudPlayer).active,
        cloudPlayerSource,
        currentCloudPatternName(),
        currentActivity,
        relayTelemetry.tofMm > 0 ? static_cast<int32_t>(relayTelemetry.tofMm) : -1,
        hapticOutputMode(),
    };
    return selectOutputSemantics(inputs);
}

void serviceOutputTelemetry(uint32_t nowMs) {
    const HapticDrive drive = hapticHardwareDrive();
    const OutputSemanticSnapshot snapshot = currentOutputSemantics();
    const bool changed = !hasOutputTelemetry ||
                         !sameOutputTelemetry(
                             drive, snapshot,
                             lastOutputTelemetryDrive,
                             lastOutputTelemetrySnapshot);
    if (!outputTelemetryDue(changed, nowMs, lastOutputTelemetryMs)) {
        return;
    }

    char telemetry[320];
    const int length = formatOutputTelemetry(
        telemetry, sizeof(telemetry), drive, nowMs, snapshot);
    if (length <= 0) {
        return;
    }
    Serial.write(
        reinterpret_cast<const uint8_t*>(telemetry),
        static_cast<size_t>(length));
    hasOutputTelemetry = true;
    lastOutputTelemetryDrive = drive;
    lastOutputTelemetrySnapshot = snapshot;
    lastOutputTelemetryMs = nowMs;
}

void serviceRelayTelemetry(uint32_t nowMs) {
    if (static_cast<uint32_t>(nowMs - lastTelemetryPublishMs) < 500) {
        return;
    }
    lastTelemetryPublishMs = nowMs;
    copyRelayRoute(relayTelemetry.playing, currentlyPlayingName());
    relayPublishTelemetry(relayTelemetry);
}

void serviceOutput(uint32_t nowMs) {
    if (!outputLatch.enabled) {
        hapticStop();
        return;
    }
    if (sirenOutputActive()) {
        if (sirenClearing) {
            if (!clearingGapElapsed(nowMs, sirenClearingStartedMs)) {
                hapticStop();
                return;
            }
            sirenClearing = false;
            startPattern(sirenPlayer, *pendingSirenPattern, nowMs);
            pendingSirenPattern = nullptr;
        }
        if (tickPattern(sirenPlayer, nowMs)) {
            activeSirenOutput = SirenDecision::NONE;
            hapticStop();
            if (proximityCanRender()) {
                proximityClearing = true;
                proximityClearingStartedMs = nowMs;
            }
            return;
        }
        const PatternOutput output = patternOutput(sirenPlayer);
        hapticWrite(output.p1Hz, output.p3Hz);
        return;
    }
    if (proximityCanRender()) {
        if (proximityClearing) {
            if (!clearingGapElapsed(nowMs, proximityClearingStartedMs)) {
                hapticStop();
                return;
            }
            proximityClearing = false;
            nextProximityTransitionMs = nowMs;
        }
        if (static_cast<int32_t>(nowMs - nextProximityTransitionMs) < 0) {
            return;
        }
        proximityToneOn = !proximityToneOn;
        const HapticDrive drive = proximityDrive(proximityToneOn);
        hapticWrite(drive.p1Hz, drive.p3Hz);
        nextProximityTransitionMs = nowMs +
                                    (proximityToneOn ? PROXIMITY_PULSE_ON_MS : proximityGapMs);
        return;
    }

    tickPattern(cloudPlayer, nowMs);
    const PatternOutput output = patternOutput(cloudPlayer);
    hapticWrite(output.p1Hz, output.p3Hz);
}

[[noreturn]] void haltWithError(const char* message) {
    hapticStop();
    Serial.println(message);
    while (true) {
        serviceSerial();
        delay(10);
    }
}

} // namespace

void setup() {
    Serial.begin(115200);
    delay(800);

    if (!hapticBegin()) {
        haltWithError("ERROR component=buzzer reason=ledc_attach_failed");
    }
    if (!tofBegin()) {
        haltWithError("ERROR component=tof reason=init_failed");
    }
    if (!audioBegin()) {
        haltWithError("ERROR component=microphone reason=init_failed");
    }
    if (!relayStart()) {
        Serial.println(F("RELAY start=degraded local_sensing=active"));
    }

    readyEligibleAtMs = millis() + READY_DELAY_MS;
    Serial.printf(
        "BOOTING sensors=active activity=%s acoustic_bootstrap_ms=1100 output_mode=%s\n",
        userActivityName(currentActivity), outputModeName(hapticOutputMode()));
    printHelp();
}

void loop() {
    serviceSerial();
    const uint32_t nowMs = millis();
    refreshEffectiveActivity(nowMs, "activity_lease");
    serviceRelay(nowMs);
    serviceAudio(nowMs);
    applyTofUpdate(tofService(nowMs), nowMs);
    serviceReady(nowMs);
    serviceOutput(nowMs);
    serviceOutputTelemetry(nowMs);
    serviceRelayTelemetry(nowMs);
    delay(1);
}
