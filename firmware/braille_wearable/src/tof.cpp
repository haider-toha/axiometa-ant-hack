#include <Adafruit_VL53L0X.h>
#include <Arduino.h>
#include <Wire.h>

#include "pins.h"
#include "tof.h"

namespace {

constexpr uint16_t RANGE_PERIOD_MS = 50;
Adafruit_VL53L0X sensor;
ProximityState proximityState;
uint32_t lastRangeCompletionMs = 0;
uint32_t lastTimeoutInvalidMs = 0;
bool timeoutActive = false;

} // namespace

bool tofBegin() {
    proximityState = ProximityState{};
    Wire.begin(TOF_SDA_PIN, TOF_SCL_PIN);
    Wire.setClock(400000);

    // XSHUT is pulled up to the sensor's 2.8 V rail on the module. Release it
    // as an input after reset instead of driving 3.3 V into the line.
    pinMode(TOF_XSHUT_PIN, OUTPUT);
    digitalWrite(TOF_XSHUT_PIN, LOW);
    delay(10);
    pinMode(TOF_XSHUT_PIN, INPUT);
    delay(10);

    if (!sensor.begin(0x29,
                      false,
                      &Wire,
                      Adafruit_VL53L0X::VL53L0X_SENSE_LONG_RANGE)) {
        return false;
    }
    if (!sensor.startRangeContinuous(RANGE_PERIOD_MS)) {
        return false;
    }
    lastRangeCompletionMs = millis();
    lastTimeoutInvalidMs = lastRangeCompletionMs;
    timeoutActive = false;
    return true;
}

TofUpdate tofService(uint32_t nowMs) {
    TofUpdate result;
    if (sensor.isRangeComplete()) {
        result.updated = true;
        result.distanceMm = sensor.readRangeResult();
        result.status = sensor.readRangeStatus();
        const bool valid = result.status == 0 && result.distanceMm > 0;
        result.proximity = updateProximity(proximityState, result.distanceMm, valid);
        lastRangeCompletionMs = nowMs;
        timeoutActive = false;
        return result;
    }

    if (!rangeCompletionTimedOut(nowMs, lastRangeCompletionMs)) {
        return result;
    }
    if (timeoutActive &&
        static_cast<uint32_t>(nowMs - lastTimeoutInvalidMs) < RANGE_PERIOD_MS) {
        return result;
    }

    result.updated = true;
    result.timedOut = true;
    result.proximity = updateProximity(proximityState, 0, false);
    timeoutActive = true;
    lastTimeoutInvalidMs = nowMs;
    return result;
}
