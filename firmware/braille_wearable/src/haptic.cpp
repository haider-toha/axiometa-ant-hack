#include <Arduino.h>

#include "haptic.h"
#include "output_telemetry_pure.h"
#include "pins.h"

namespace {

constexpr uint8_t LEDC_RESOLUTION_BITS = 10;
uint16_t currentP1Hz = UINT16_MAX;
uint16_t currentP3Hz = UINT16_MAX;
uint32_t lastTelemetryMs = 0;

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
        ledcWriteTone(BUZZER_LEFT_PIN, p1Hz);
        currentP1Hz = p1Hz;
        changed = true;
    }
    if (p3Hz != currentP3Hz) {
        ledcWriteTone(BUZZER_RIGHT_PIN, p3Hz);
        currentP3Hz = p3Hz;
        changed = true;
    }

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
