#include <Arduino.h>
#include <RotaryEncoder.h>
#include "pins.h"
#include "encoder.h"

// mathertel/RotaryEncoder (Phase 1C §e): we call tick() from a pin-change ISR
// on both channels, and also once per poll in loop() as a safety net.
// FOUR3 matches common detented (EC11-style) encoders.
static RotaryEncoder s_enc(ENC_DT, ENC_CL, RotaryEncoder::LatchMode::FOUR3);
static long          s_lastPos = 0;

static void IRAM_ATTR onEncTick() { s_enc.tick(); }

void encoderInit() {
    pinMode(ENC_CL, INPUT_PULLUP);
    pinMode(ENC_DT, INPUT_PULLUP);
    pinMode(ENC_BT, INPUT_PULLUP);                 // button to GND, active-low
    attachInterrupt(digitalPinToInterrupt(ENC_CL), onEncTick, CHANGE);
    attachInterrupt(digitalPinToInterrupt(ENC_DT), onEncTick, CHANGE);
    s_lastPos = s_enc.getPosition();
}

int encoderDelta() {
    s_enc.tick();                                  // safety net for missed ISRs
    long pos = s_enc.getPosition();
    int delta = (int)(pos - s_lastPos);
    s_lastPos = pos;
    return delta;
}

bool encoderPressed() {
    // 25 ms debounce; report a single event on the HIGH->LOW (press) edge.
    static bool     stable    = HIGH;
    static bool     lastRead  = HIGH;
    static uint32_t lastEdge  = 0;
    bool raw = digitalRead(ENC_BT);
    if (raw != lastRead) { lastRead = raw; lastEdge = millis(); }
    if (millis() - lastEdge > 25 && raw != stable) {
        stable = raw;
        if (stable == LOW) return true;            // just pressed
    }
    return false;
}
