#include <Adafruit_VL53L0X.h>
#include <Arduino.h>
#include <Wire.h>

#include "buzzer_experiment_pure.h"
#include "tof_proximity_pure.h"

namespace {

constexpr uint8_t TOF_SDA_PIN = 10;       // P2 SDA
constexpr uint8_t TOF_SCL_PIN = 11;       // P2 SCL
constexpr uint8_t TOF_XSHUT_PIN = 6;      // P2 IO1; module schematic net IO1D
constexpr uint8_t LEDC_RESOLUTION_BITS = 10;
constexpr uint16_t RANGE_PERIOD_MS = 50;
constexpr uint16_t PULSE_ON_MS = 120;

Adafruit_VL53L0X tof;
ProximityState proximity;
bool reflexEnabled = false;
bool proximityOutputAllowed = false;
bool toneOn = false;
uint32_t nextToneTransitionMs = 0;
uint16_t currentPulseGapMs = PROXIMITY_SLOW_GAP_MS;
uint32_t readingSequence = 0;
uint32_t lastRangeCompletionMs = 0;
uint32_t lastTimeoutInvalidMs = 0;
bool rangeTimeoutActive = false;

void setLeftTone(bool on) {
    ledcWriteTone(BUZZER_LEFT_PIN, on ? AUDIO_PROXY_LEFT_HZ : 0);
    toneOn = on;
}

void allOutputsOff() {
    setLeftTone(false);
    ledcWriteTone(BUZZER_RIGHT_PIN, 0);
}

void stopReflex(const char* reason) {
    reflexEnabled = false;
    allOutputsOff();
    nextToneTransitionMs = 0;
    if (reason != nullptr) {
        Serial.println(reason);
    }
}

void printHelp() {
    Serial.println();
    Serial.println(F("=== AX22-0015 local ToF proximity experiment ==="));
    Serial.println(F("r  enable/disable the P1 proximity audio proxy"));
    Serial.println(F("x  immediately silence and disable the proxy"));
    Serial.println(F("h  print this help"));
    Serial.println(F("Raw ToF readings continue while the proxy is disabled."));
    Serial.println(F("Proxy: P1 / LEFT at 700 Hz; future motor channel A."));
    Serial.println();
}

void handleCommand(char command) {
    if (command >= 'A' && command <= 'Z') {
        command = static_cast<char>(command - 'A' + 'a');
    }

    switch (command) {
        case 'r':
            reflexEnabled = !reflexEnabled;
            allOutputsOff();
            nextToneTransitionMs = millis();
            Serial.printf("REFLEX enabled=%u\n", reflexEnabled ? 1 : 0);
            break;
        case 'x':
            stopReflex("REFLEX enabled=0 reason=serial_stop");
            break;
        case 'h':
            printHelp();
            break;
        case '\r':
        case '\n':
            break;
        default:
            Serial.println(F("Unknown command. Enter h for controls."));
            break;
    }
}

void serviceSerial() {
    while (Serial.available() > 0) {
        handleCommand(static_cast<char>(Serial.read()));
    }
}

void serviceOutput(uint32_t nowMs) {
    if (!reflexEnabled || !proximityOutputAllowed) {
        if (toneOn) {
            allOutputsOff();
        }
        nextToneTransitionMs = nowMs;
        return;
    }

    if (static_cast<int32_t>(nowMs - nextToneTransitionMs) < 0) {
        return;
    }

    if (toneOn) {
        setLeftTone(false);
        nextToneTransitionMs = nowMs + currentPulseGapMs;
    } else {
        setLeftTone(true);
        nextToneTransitionMs = nowMs + PULSE_ON_MS;
    }
}

void serviceRange() {
    if (!tof.isRangeComplete()) {
        return;
    }

    const uint16_t distanceMm = tof.readRangeResult();
    const uint8_t status = tof.readRangeStatus();
    const bool valid = status == 0 && distanceMm > 0;
    const ProximityUpdate update = updateProximity(proximity, distanceMm, valid);
    proximityOutputAllowed = update.outputAllowed;
    currentPulseGapMs = update.pulseGapMs;
    lastRangeCompletionMs = millis();
    rangeTimeoutActive = false;
    ++readingSequence;

    Serial.printf(
        "TOF seq=%lu mm=%u status=%u valid=%u active=%u reflex=%u gap_ms=%u invalid_count=%u\n",
        static_cast<unsigned long>(readingSequence),
        distanceMm,
        status,
        valid ? 1 : 0,
        update.active ? 1 : 0,
        reflexEnabled ? 1 : 0,
        update.pulseGapMs,
        proximity.invalidCount);

    if (update.entered) {
        nextToneTransitionMs = millis();
        Serial.println(F("PROXIMITY transition=entered"));
    } else if (update.exited) {
        allOutputsOff();
        Serial.println(F("PROXIMITY transition=exited"));
    }
}

void serviceRangeWatchdog(uint32_t nowMs) {
    if (!rangeCompletionTimedOut(nowMs, lastRangeCompletionMs)) {
        return;
    }
    if (rangeTimeoutActive &&
        static_cast<uint32_t>(nowMs - lastTimeoutInvalidMs) < RANGE_PERIOD_MS) {
        return;
    }

    const ProximityUpdate update = updateProximity(proximity, 0, false);
    proximityOutputAllowed = false;
    allOutputsOff();
    rangeTimeoutActive = true;
    lastTimeoutInvalidMs = nowMs;
    Serial.printf("TOF_TIMEOUT active=%u invalid_count=%u elapsed_ms=%lu\n",
                  update.active ? 1 : 0,
                  proximity.invalidCount,
                  static_cast<unsigned long>(nowMs - lastRangeCompletionMs));
    if (update.exited) {
        Serial.println(F("PROXIMITY transition=exited reason=range_timeout"));
    }
}

[[noreturn]] void haltWithError(const char* message) {
    allOutputsOff();
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

    const bool leftAttached = ledcAttach(BUZZER_LEFT_PIN, 100, LEDC_RESOLUTION_BITS);
    const bool rightAttached = ledcAttach(BUZZER_RIGHT_PIN, 100, LEDC_RESOLUTION_BITS);
    if (!leftAttached || !rightAttached) {
        haltWithError("ERROR component=ledc reason=attach_failed");
    }
    allOutputsOff();

    Wire.begin(TOF_SDA_PIN, TOF_SCL_PIN);
    Wire.setClock(400000);

    // XSHUT is pulled up to the sensor's 2.8 V rail on the module. Release the
    // line as an input after reset instead of driving 3.3 V into it.
    pinMode(TOF_XSHUT_PIN, OUTPUT);
    digitalWrite(TOF_XSHUT_PIN, LOW);
    delay(10);
    pinMode(TOF_XSHUT_PIN, INPUT);
    delay(10);

    if (!tof.begin(0x29, false, &Wire)) {
        haltWithError("ERROR component=tof reason=init_failed expected_address=0x29");
    }
    if (!tof.startRangeContinuous(RANGE_PERIOD_MS)) {
        haltWithError("ERROR component=tof reason=continuous_start_failed");
    }
    lastRangeCompletionMs = millis();

    Serial.println(F("READY component=tof address=0x29 period_ms=50 reflex=0"));
    printHelp();
}

void loop() {
    serviceSerial();
    serviceRange();
    const uint32_t nowMs = millis();
    serviceRangeWatchdog(nowMs);
    serviceOutput(nowMs);
    delay(1);
}
