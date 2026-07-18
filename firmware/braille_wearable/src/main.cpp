#include <Arduino.h>

#include "audio.h"
#include "haptic.h"
#include "haptic_pure.h"
#include "navigation_pure.h"
#include "patterns.h"
#include "siren_runtime_pure.h"
#include "tof.h"

namespace {

constexpr uint16_t PROXIMITY_PULSE_ON_MS = 120;
constexpr uint32_t READY_DELAY_MS = 1100;

BoardMode boardMode = BoardMode::WAITING;
PatternPlayer cloudPlayer;
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

const char* modeName(BoardMode mode) {
    return mode == BoardMode::NAVIGATION ? "NAVIGATION" : "WAITING";
}

void startSirenOutput(SirenDecision decision, uint32_t nowMs);

bool sirenOutputActive() {
    return activeSirenOutput != SirenDecision::NONE;
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
    if (!proximityActive && !sirenOutputActive()) {
        hapticStop();
    }
}

void setMode(BoardMode mode) {
    if (boardMode == mode) {
        Serial.printf("MODE unchanged=%s\n", modeName(mode));
        return;
    }
    boardMode = mode;
    stopCloudPattern();
    Serial.printf("MODE changed=%s source=serial_phone_stub\n", modeName(mode));
}

void submitCloudCommand(CloudCommand command, const char* name) {
    if (!outputLatch.enabled) {
        Serial.printf("COMMAND dropped=%s reason=output_stopped\n", name);
        return;
    }
    if (!acceptsCloudCommand(boardMode, command)) {
        Serial.printf("COMMAND dropped=%s mode=%s reason=mode_gate\n", name, modeName(boardMode));
        return;
    }
    if (proximityActive) {
        Serial.printf("COMMAND dropped=%s mode=%s reason=local_proximity\n", name, modeName(boardMode));
        return;
    }
    if (sirenOutputActive()) {
        Serial.printf("COMMAND dropped=%s mode=%s reason=local_siren\n", name, modeName(boardMode));
        return;
    }
    const OutputPattern* pattern = cloudPattern(command);
    if (pattern == nullptr) {
        Serial.printf("COMMAND unsupported=%s\n", name);
        return;
    }
    startPattern(cloudPlayer, *pattern, millis());
    Serial.printf("COMMAND accepted=%s mode=%s\n", name, modeName(boardMode));
}

void printHelp() {
    Serial.println();
    Serial.println(F("=== Integrated board firmware: ToF + PDM siren + two runtime modes ==="));
    Serial.println(F("n  phone MOVING stub -> NAVIGATION mode"));
    Serial.println(F("s  phone STILL stub -> WAITING mode"));
    Serial.println(F("l/r/a  LEFT, RIGHT, or AHEAD navigation command"));
    Serial.println(F("b/w  BUS or WAIT predefined waiting-mode scenario"));
    Serial.println(F("8/u/e  route 88, UNKNOWN, or ERROR waiting-mode scenario"));
    Serial.println(F("x  emergency stop all output; sensing continues"));
    Serial.println(F("o  resume board output after an emergency stop"));
    Serial.println(F("h  print this help"));
    Serial.println(F("ToF and siren sensing run locally in both modes."));
    Serial.println();
}

void handleSerial(char command) {
    if (command >= 'A' && command <= 'Z') {
        command = static_cast<char>(command - 'A' + 'a');
    }
    switch (command) {
        case 'n': setMode(BoardMode::NAVIGATION); break;
        case 's': setMode(BoardMode::WAITING); break;
        case 'l': submitCloudCommand(CloudCommand::LEFT, "LEFT"); break;
        case 'r': submitCloudCommand(CloudCommand::RIGHT, "RIGHT"); break;
        case 'a': submitCloudCommand(CloudCommand::AHEAD, "AHEAD"); break;
        case 'b': submitCloudCommand(CloudCommand::BUS, "BUS"); break;
        case 'w': submitCloudCommand(CloudCommand::WAIT, "WAIT"); break;
        case '8': submitCloudCommand(CloudCommand::NUMBER, "NUMBER_88"); break;
        case 'u': submitCloudCommand(CloudCommand::UNKNOWN, "UNKNOWN"); break;
        case 'e': submitCloudCommand(CloudCommand::ERROR, "ERROR"); break;
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
            if (proximityActive) {
                proximityToneOn = false;
                proximityClearing = true;
                proximityClearingStartedMs = millis();
            }
            if (detectedSiren != SirenDecision::NONE) {
                startSirenOutput(detectedSiren, millis());
            }
            Serial.println(F("OUTPUT resumed=all"));
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
    if (!canStartSirenOutput(decision, activeSirenOutput, proximityActive)) {
        Serial.printf("SIREN_OUTPUT dropped=%s active=%s proximity=%u reason=priority\n",
                      sirenDecisionName(decision),
                      sirenDecisionName(activeSirenOutput),
                      proximityActive ? 1 : 0);
        return;
    }

    const bool preempting = patternOutput(cloudPlayer).active ||
                            patternOutput(sirenPlayer).active ||
                            (proximityActive && proximityOutputAllowed);
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
    if (!readyPending || !outputLatch.enabled || proximityActive ||
        sirenOutputActive() || patternOutput(cloudPlayer).active ||
        static_cast<int32_t>(nowMs - readyEligibleAtMs) < 0) {
        return;
    }
    readyPending = false;
    startPattern(cloudPlayer, READY_PATTERN, nowMs);
    Serial.println(F("READY mode=WAITING transport=serial_phone_stub tof=local mic=local"));
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
    proximityActive = update.proximity.active;
    proximityOutputAllowed = update.proximity.outputAllowed;
    proximityGapMs = update.proximity.pulseGapMs;

    if (update.proximity.entered) {
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
        Serial.printf("PROXIMITY entered mm=%u mode=%s\n",
                      update.distanceMm,
                      modeName(boardMode));
    }
    if (update.proximity.exited) {
        proximityToneOn = false;
        proximityClearing = false;
        if (!sirenOutputActive()) {
            hapticStop();
        }
        Serial.println(F("PROXIMITY exited"));
    }
    if (wasActive && !proximityOutputAllowed) {
        proximityToneOn = false;
        hapticStop();
    }
    if (update.timedOut) {
        Serial.println(F("TOF invalid=range_timeout output=revoked"));
    }
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
            if (proximityActive) {
                proximityClearing = true;
                proximityClearingStartedMs = nowMs;
            }
            return;
        }
        const PatternOutput output = patternOutput(sirenPlayer);
        hapticWrite(output.p1Hz, output.p3Hz);
        return;
    }
    if (proximityActive) {
        if (!proximityOutputAllowed) {
            hapticStop();
            return;
        }
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
        hapticWrite(proximityToneOn ? AUDIO_PROXY_LEFT_HZ : 0, 0);
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

    readyEligibleAtMs = millis() + READY_DELAY_MS;
    Serial.println(F("BOOTING sensors=active acoustic_bootstrap_ms=1100"));
    printHelp();
}

void loop() {
    serviceSerial();
    const uint32_t nowMs = millis();
    serviceAudio(nowMs);
    applyTofUpdate(tofService(nowMs), nowMs);
    serviceReady(nowMs);
    serviceOutput(nowMs);
    delay(1);
}
