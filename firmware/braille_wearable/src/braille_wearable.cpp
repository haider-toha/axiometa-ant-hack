#include <Arduino.h>
#include <vector>
#include "pins.h"
#include "secrets.h"
#include "braille.h"
#include "net.h"
#include "display.h"
#include "encoder.h"

// ==========================================================================
//  Speech-to-Braille wearable — main sketch (Genesis Mini, ESP32-S3).
//  Rung 1+2: WiFi join -> LCD status -> poll Vercel -> caption + buzz.
//  Rung 3:   onboard "repeat" button re-buzzes the last message.
//  Rung 4:   (stretch) reply mode — encoder scroll, buzz highlighted, POST.
// ==========================================================================

static const uint32_t POLL_MS = 700;     // poll cadence (~700 ms, plan Task B2)

static uint32_t            s_lastPoll = 0;
static String              s_lastMsg;     // last forward keyword (for repeat)
static std::vector<String> s_replies;     // Rung-4 suggestions
static bool                s_replyActive = false;
static int                 s_replyIdx = 0;

// ---- Rung-4 reply mode (stubbed-but-complete; compiles + is coherent) -----
static void enterReplyMode() {
    if (s_replies.empty()) return;
    s_replyActive = true;
    s_replyIdx = 0;
    Serial.println(F("[reply] suggestions ready — scroll the encoder, press to send"));
    for (size_t i = 0; i < s_replies.size(); i++) {
        Serial.printf("  [%u] %s\n", (unsigned)i, s_replies[i].c_str());
    }
    showCaption(s_replies[s_replyIdx].c_str());
    buzzWord(s_replies[s_replyIdx].c_str());     // buzz the highlighted one
}

static void serviceReplyMode() {
    if (!s_replyActive) return;
    int d = encoderDelta();
    if (d != 0) {
        int n = (int)s_replies.size();
        s_replyIdx = ((s_replyIdx + d) % n + n) % n;   // wrap both directions
        showCaption(s_replies[s_replyIdx].c_str());
        buzzWord(s_replies[s_replyIdx].c_str());       // buzz only the highlight
    }
    if (encoderPressed()) {
        bool ok = postReply(s_replyIdx, s_replies[s_replyIdx].c_str());
        Serial.printf("[reply] selected %d: \"%s\" (POST %s)\n",
                      s_replyIdx, s_replies[s_replyIdx].c_str(), ok ? "ok" : "failed");
        s_replyActive = false;
    }
}

// Debounced onboard "repeat" button. GPIO45 is the VDD_SPI strapping pin:
// idle LOW via its internal weak pull-down, pressed = 3.3 V => ACTIVE-HIGH,
// and it must NEVER get a pull-up (would mis-strap flash voltage at reset).
static bool repeatPressed() {
    static bool     stable   = LOW;
    static bool     lastRead = LOW;
    static uint32_t lastEdge = 0;
    bool raw = digitalRead(BTN_REPEAT);
    if (raw != lastRead) { lastRead = raw; lastEdge = millis(); }
    if (millis() - lastEdge > 30 && raw != stable) {
        stable = raw;
        if (stable == HIGH) return true;            // rising edge = press (active-high)
    }
    return false;
}

void setup() {
    Serial.begin(115200);
    delay(200);

    // Motors: outputs, idle low.
    pinMode(MOTOR_L, OUTPUT); digitalWrite(MOTOR_L, LOW);
    pinMode(MOTOR_R, OUTPUT); digitalWrite(MOTOR_R, LOW);

    // Repeat button on GPIO45: plain INPUT — NO pull-up (strapping-pin safety,
    // Phase 1C §g). The internal weak pull-down holds it low at reset.
    pinMode(BTN_REPEAT, INPUT);

    encoderInit();
    displayInit();
    showStatus(WIFI_SSID, "connecting", "JOIN...");

    brailleSelfTest();                              // Serial dump for chart diffing

    bool ok = wifiJoin();
    showStatus(WIFI_SSID, deviceIp(), ok ? "READY" : "NO WIFI");
}

void loop() {
    uint32_t now = millis();

    if (now - s_lastPoll >= POLL_MS) {
        s_lastPoll = now;
        PullResult pr;
        if (pollPull(pr)) {
            if (pr.mode == "forward") {
                s_replyActive = false;              // a new forward cancels reply mode
                s_lastMsg = pr.msg;
                showCaption(s_lastMsg.c_str());
                Serial.println(s_lastMsg);
                buzzWord(s_lastMsg.c_str());
            } else if (pr.mode == "reply") {
                s_replies = pr.replies;
                enterReplyMode();
            }
        }
    }

    // Rung 3: re-buzz the last forward message on demand.
    if (repeatPressed() && s_lastMsg.length()) {
        showCaption(s_lastMsg.c_str());
        Serial.print(F("[repeat] "));
        Serial.println(s_lastMsg);
        buzzWord(s_lastMsg.c_str());
    }

    // Rung 4: scroll/select the reply suggestions (no-op unless active).
    serviceReplyMode();
}
