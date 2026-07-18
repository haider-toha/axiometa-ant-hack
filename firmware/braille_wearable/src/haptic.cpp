#include <Arduino.h>

#include "haptic.h"
#include "output_telemetry_pure.h"
#include "pins.h"

namespace {

constexpr uint8_t LEDC_RESOLUTION_BITS = 10;
uint16_t currentP1Hz = UINT16_MAX;
uint16_t currentP3Hz = UINT16_MAX;
uint16_t hardwareP1Hz = UINT16_MAX;
uint16_t hardwareP3Hz = UINT16_MAX;
OutputMode currentOutputMode = DEFAULT_OUTPUT_MODE;
uint32_t lastTelemetryMs = 0;

void applyHardwareDrive() {
    const HapticDrive hardware = hardwareDriveFor(
        {currentP1Hz == UINT16_MAX ? uint16_t{0} : currentP1Hz,
         currentP3Hz == UINT16_MAX ? uint16_t{0} : currentP3Hz},
        currentOutputMode);
    if (hardware.p1Hz != hardwareP1Hz) {
        ledcWriteTone(BUZZER_LEFT_PIN, hardware.p1Hz);
        hardwareP1Hz = hardware.p1Hz;
    }
    if (hardware.p3Hz != hardwareP3Hz) {
        ledcWriteTone(BUZZER_RIGHT_PIN, hardware.p3Hz);
        hardwareP3Hz = hardware.p3Hz;
    }
}

} // namespace

bool hapticBegin() {
    const bool p1Attached = ledcAttach(BUZZER_LEFT_PIN, 100, LEDC_RESOLUTION_BITS);
    const bool p3Attached = ledcAttach(BUZZER_RIGHT_PIN, 100, LEDC_RESOLUTION_BITS);
    hapticStop();
    return p1Attached && p3Attached;
}

void hapticWrite(uint16_t p1Hz, uint16_t p3Hz) {
    bool changed = false;
    if (p1Hz != currentP1Hz) {
        currentP1Hz = p1Hz;
        changed = true;
    }
    if (p3Hz != currentP3Hz) {
        currentP3Hz = p3Hz;
        changed = true;
    }
    applyHardwareDrive();

    const uint32_t nowMs = millis();
    if (outputTelemetryDue(changed, nowMs, lastTelemetryMs)) {
        char telemetry[96];
        const int length = formatOutputTelemetry(
            telemetry,
            sizeof(telemetry),
            currentP1Hz,
            currentP3Hz,
            nowMs);
        if (length > 0) {
            Serial.write(
                reinterpret_cast<const uint8_t *>(telemetry),
                static_cast<size_t>(length));
            lastTelemetryMs = nowMs;
        }
    }
}

void hapticStop() {
    hapticWrite(0, 0);
}

void hapticSetOutputMode(OutputMode mode) {
    if (currentOutputMode == mode) {
        return;
    }
    currentOutputMode = mode;
    applyHardwareDrive();
    Serial.printf("OUTPUT mode=%s hardware=%s logical_patterns=active\n",
                  outputModeName(mode),
                  mode == OutputMode::NIGHT ? "muted" : "enabled");
}

OutputMode hapticOutputMode() {
    return currentOutputMode;
}
