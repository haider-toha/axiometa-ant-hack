#include <Adafruit_VL53L0X.h>
#include <Arduino.h>
#include <Wire.h>

#include "buzzer_experiment_pure.h"
#include "tof_bench_pure.h"
#include "tof_proximity_pure.h"

namespace {

constexpr uint8_t LEDC_RESOLUTION_BITS = 10;
constexpr uint16_t RANGE_PERIOD_MS = 50;
constexpr uint16_t PULSE_ON_MS = 120;
constexpr uint16_t BENCH_DURATION_MS = 5000;

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
TofBenchSession benchSession;

void setLeftTone(bool on) {
    ledcWriteTone(BUZZER_LEFT_PIN, on ? AUDIO_PROXY_LEFT_HZ : 0);
    toneOn = on;
}

void allOutputsOff() {
    setLeftTone(false);
    ledcWriteTone(BUZZER_RIGHT_PIN, 0);
}

void finishBench() {
    abortTofBenchSession(benchSession);
    const TofBenchStats& benchStats = benchSession.stats;
    Serial.printf(
        "BENCH result expected_mm=%u duration_ms=%u samples=%lu valid=%lu "
        "valid_pct=%u min_mm=%u mean_mm=%u max_mm=%u mean_abs_error_mm=%u "
        "status_2=%lu status_4=%lu other_invalid=%lu\n",
        benchStats.expectedMm,
        BENCH_DURATION_MS,
        static_cast<unsigned long>(benchStats.sampleCount),
        static_cast<unsigned long>(benchStats.validCount),
        tofBenchValidPercent(benchStats),
        benchStats.minMm,
        tofBenchMeanMm(benchStats),
        benchStats.maxMm,
        tofBenchMeanAbsoluteErrorMm(benchStats),
        static_cast<unsigned long>(benchStats.signalFailCount),
        static_cast<unsigned long>(benchStats.outOfRangeCount),
        static_cast<unsigned long>(benchStats.otherInvalidCount));
}

void startBench(uint16_t expectedMm) {
    if (!startTofBenchSession(benchSession, expectedMm, millis())) {
        Serial.println(F("BENCH active; wait for the result or enter x to abort."));
        return;
    }
    reflexEnabled = false;
    proximityOutputAllowed = false;
    proximity = ProximityState{};
    allOutputsOff();
    Serial.printf("BENCH start expected_mm=%u duration_ms=%u reflex=0\n",
                  expectedMm,
                  BENCH_DURATION_MS);
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
    Serial.println(F("1..6  capture 5 s at 300, 600, 1200, 2000, 3000, or 4000 mm"));
    Serial.println(F("h  print this help"));
    Serial.println(F("Raw ToF readings continue while the proxy is disabled."));
    Serial.printf("Proxy: P1 / LEFT at %u Hz; future motor channel A.\n",
                  AUDIO_PROXY_LEFT_HZ);
    Serial.println();
}

void handleCommand(char command) {
    if (command >= 'A' && command <= 'Z') {
        command = static_cast<char>(command - 'A' + 'a');
    }

    switch (command) {
        case 'r':
            if (benchSession.active) {
                Serial.println(F("BENCH active; wait for the result or enter x to abort."));
                break;
            }
            reflexEnabled = !reflexEnabled;
            allOutputsOff();
            nextToneTransitionMs = millis();
            Serial.printf("REFLEX enabled=%u\n", reflexEnabled ? 1 : 0);
            break;
        case 'x':
            if (benchSession.active) {
                abortTofBenchSession(benchSession);
                Serial.println(F("BENCH aborted"));
            }
            stopReflex("REFLEX enabled=0 reason=serial_stop");
            break;
        case '1':
            startBench(300);
            break;
        case '2':
            startBench(600);
            break;
        case '3':
            startBench(1200);
            break;
        case '4':
            startBench(2000);
            break;
        case '5':
            startBench(3000);
            break;
        case '6':
            startBench(4000);
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
    if (benchSession.active) {
        addTofBenchSample(benchSession.stats, distanceMm, status);
    }
    const ProximityUpdate update = updateProximity(proximity, distanceMm, valid);
    proximityOutputAllowed = update.outputAllowed;
    currentPulseGapMs = update.pulseGapMs;
    lastRangeCompletionMs = millis();
    rangeTimeoutActive = false;
    ++readingSequence;

    if (!benchSession.active) {
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
    }

    if (update.entered && !benchSession.active) {
        nextToneTransitionMs = millis();
        Serial.println(F("PROXIMITY transition=entered"));
    } else if (update.exited && !benchSession.active) {
        allOutputsOff();
        Serial.println(F("PROXIMITY transition=exited"));
    }
}

void serviceBench(uint32_t nowMs) {
    if (tofBenchSessionElapsed(benchSession, nowMs, BENCH_DURATION_MS)) {
        finishBench();
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

    if (!tof.begin(0x29,
                   false,
                   &Wire,
                   Adafruit_VL53L0X::VL53L0X_SENSE_LONG_RANGE)) {
        haltWithError("ERROR component=tof reason=init_failed expected_address=0x29");
    }
    if (!tof.startRangeContinuous(RANGE_PERIOD_MS)) {
        haltWithError("ERROR component=tof reason=continuous_start_failed");
    }
    lastRangeCompletionMs = millis();

    Serial.println(
        F("READY component=tof address=0x29 profile=long_range period_ms=50 reflex=0"));
    printHelp();
}

void loop() {
    serviceSerial();
    serviceRange();
    const uint32_t nowMs = millis();
    serviceBench(nowMs);
    serviceRangeWatchdog(nowMs);
    serviceOutput(nowMs);
    delay(1);
}
