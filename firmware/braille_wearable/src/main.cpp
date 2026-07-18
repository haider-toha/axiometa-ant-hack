#include <Arduino.h>

#include "haptic.h"
#include "haptic_pure.h"
#include "navigation_pure.h"
#include "patterns.h"
#include "tof.h"

namespace {

constexpr uint16_t PROXIMITY_PULSE_ON_MS = 120;

BoardMode boardMode = BoardMode::WAITING;
PatternPlayer cloudPlayer;
bool proximityActive = false;
bool proximityOutputAllowed = false;
bool proximityToneOn = false;
uint16_t proximityGapMs = PROXIMITY_SLOW_GAP_MS;
uint32_t nextProximityTransitionMs = 0;

const char* modeName(BoardMode mode) {
    return mode == BoardMode::NAVIGATION ? "NAVIGATION" : "WAITING";
}

void stopCloudPattern() {
    stopPattern(cloudPlayer);
    if (!proximityActive) {
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
    if (!acceptsCloudCommand(boardMode, command)) {
        Serial.printf("COMMAND dropped=%s mode=%s reason=mode_gate\n", name, modeName(boardMode));
        return;
    }
    if (proximityActive) {
        Serial.printf("COMMAND dropped=%s mode=%s reason=local_proximity\n", name, modeName(boardMode));
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
    Serial.println(F("=== Integrated board firmware: ToF + two runtime modes ==="));
    Serial.println(F("n  phone MOVING stub -> NAVIGATION mode"));
    Serial.println(F("s  phone STILL stub -> WAITING mode"));
    Serial.println(F("l/r/a  LEFT, RIGHT, or AHEAD navigation command"));
    Serial.println(F("b/w  BUS or WAIT predefined waiting-mode scenario"));
    Serial.println(F("x  stop cloud output immediately; local ToF remains active"));
    Serial.println(F("h  print this help"));
    Serial.println(F("ToF runs locally in both modes and overrides cloud commands."));
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
        case 'x':
            stopCloudPattern();
            Serial.println(F("COMMAND stopped=cloud_output"));
            break;
        case 'h': printHelp(); break;
        case '\r':
        case '\n': break;
        default: Serial.println(F("Unknown command. Enter h for controls.")); break;
    }
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
        proximityToneOn = false;
        nextProximityTransitionMs = nowMs;
        Serial.printf("PROXIMITY entered mm=%u mode=%s\n",
                      update.distanceMm,
                      modeName(boardMode));
    }
    if (update.proximity.exited) {
        proximityToneOn = false;
        hapticStop();
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
    if (proximityActive) {
        if (!proximityOutputAllowed) {
            hapticStop();
            return;
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

    Serial.println(F("READY mode=WAITING transport=serial_phone_stub tof=local"));
    printHelp();
}

void loop() {
    serviceSerial();
    const uint32_t nowMs = millis();
    applyTofUpdate(tofService(nowMs), nowMs);
    serviceOutput(nowMs);
    delay(1);
}
