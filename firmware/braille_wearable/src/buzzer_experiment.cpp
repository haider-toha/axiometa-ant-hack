#include <Arduino.h>
#include <esp_system.h>

#include "buzzer_experiment_pure.h"

namespace {

constexpr uint8_t LEDC_RESOLUTION_BITS = 10;
constexpr uint8_t TRIAL_COUNT = 12;
constexpr uint8_t PASS_SCORE = 10;
constexpr uint16_t BUTTON_DEBOUNCE_MS = 50;
constexpr uint16_t BUTTON_POLL_MS = 5;

enum class SessionMode : uint8_t {
    NONE,
    NAVIGATION,
    SITUATIONAL,
};

struct TrialSession {
    SessionMode mode = SessionMode::NONE;
    BuzzerPatternId schedule[TRIAL_COUNT] = {};
    uint8_t trialIndex = 0;
    uint8_t score = 0;
    bool awaitingGuess = false;
};

TrialSession session;
bool outputArmed = false;
bool previousButtonDown = false;
uint32_t lastButtonPressMs = 0;

void setTone(uint8_t pin, uint16_t frequencyHz) {
    ledcWriteTone(pin, frequencyHz);
}

void allOff() {
    setTone(BUZZER_LEFT_PIN, 0);
    setTone(BUZZER_RIGHT_PIN, 0);
}

void setControlLed(bool on) {
    digitalWrite(CONTROL_LED_PIN,
                 on ? CONTROL_LED_ACTIVE_LEVEL : !CONTROL_LED_ACTIVE_LEVEL);
}

void disarmOutput(const char* message) {
    allOff();
    session = TrialSession{};
    outputArmed = false;
    setControlLed(false);
    if (message != nullptr) {
        Serial.println(message);
    }
}

void armOutput() {
    session = TrialSession{};
    outputArmed = true;
    setControlLed(true);
    Serial.println(F("\nARMED: LED on. Enter v, n, or s. Press the P2 button again to stop."));
}

bool consumeButtonPress() {
    const bool buttonDown = digitalRead(CONTROL_BUTTON_PIN) == CONTROL_BUTTON_ACTIVE_LEVEL;
    const uint32_t now = millis();
    const bool pressed = buttonDown && !previousButtonDown &&
                         now - lastButtonPressMs >= BUTTON_DEBOUNCE_MS;
    previousButtonDown = buttonDown;
    if (pressed) {
        lastButtonPressMs = now;
    }
    return pressed;
}

bool serviceControlButton() {
    if (!consumeButtonPress()) {
        return false;
    }
    if (outputArmed) {
        disarmOutput("STOPPED: both buzzers off; LED off.");
    } else {
        armOutput();
    }
    return true;
}

bool waitInterruptibly(uint32_t durationMs) {
    const uint32_t startedAt = millis();
    while (millis() - startedAt < durationMs) {
        serviceControlButton();
        if (!outputArmed) {
            return false;
        }
        delay(BUTTON_POLL_MS);
    }
    return true;
}

bool requireArmed() {
    if (outputArmed) {
        return true;
    }
    Serial.println(F("Output is disarmed. Press the LED button in P2 first."));
    return false;
}

bool playPattern(BuzzerPatternId id) {
    if (!outputArmed) {
        return false;
    }
    const BuzzerPattern& pattern = patternFor(id);
    allOff();
    if (!waitInterruptibly(100)) {
        return false;
    }
    for (uint8_t i = 0; i < pattern.stepCount; ++i) {
        setTone(BUZZER_LEFT_PIN, pattern.steps[i].leftHz);
        setTone(BUZZER_RIGHT_PIN, pattern.steps[i].rightHz);
        if (!waitInterruptibly(pattern.steps[i].durationMs)) {
            allOff();
            return false;
        }
    }
    allOff();
    return true;
}

void printHelp() {
    Serial.println();
    Serial.println(F("=== AX22-0018 audio proxy for future vibration motors ==="));
    Serial.println(F("P2 LED button: press to arm; press again to stop immediately"));
    Serial.printf("v  audible proxy check: LEFT %u Hz, then RIGHT %u Hz\n",
                  AUDIO_PROXY_LEFT_HZ,
                  AUDIO_PROXY_RIGHT_HZ);
    Serial.println(F("n  start 12 blind navigation trials (guess with l or r)"));
    Serial.println(F("s  start 12 blind situational trials (guess with e or w)"));
    Serial.println(F("p  replay the current blind trial without revealing it"));
    Serial.println(F("x  stop and disarm from Serial"));
    Serial.println(F("h  print this help"));
    Serial.println(F("Pass threshold: 10/12 in each scored session."));
    Serial.println();
}

void playAudioProxyCheck() {
    if (!requireArmed()) {
        return;
    }
    session = TrialSession{};
    Serial.println(F("\nAUDIO PROXY CHECK: this does not test tactile output."));
    for (uint8_t side = 0; side < 2; ++side) {
        const char* sideName = side == 0 ? "LEFT / Port 1" : "RIGHT / Port 3";
        const uint8_t pin = side == 0 ? BUZZER_LEFT_PIN : BUZZER_RIGHT_PIN;
        const uint16_t hz = side == 0 ? AUDIO_PROXY_LEFT_HZ : AUDIO_PROXY_RIGHT_HZ;
        Serial.printf("%s audio proxy: %u Hz\n", sideName, hz);
        setTone(pin, hz);
        if (!waitInterruptibly(800)) {
            return;
        }
        allOff();
        if (!waitInterruptibly(500)) {
            return;
        }
    }
    Serial.println(F("Proxy check complete. This confirms routing and sound only."));
    disarmOutput("OUTPUT DISARMED: LED off.");
}

void shuffleSchedule() {
    for (int i = TRIAL_COUNT - 1; i > 0; --i) {
        const uint32_t j = esp_random() % static_cast<uint32_t>(i + 1);
        const BuzzerPatternId tmp = session.schedule[i];
        session.schedule[i] = session.schedule[j];
        session.schedule[j] = tmp;
    }
}

void playCurrentTrial() {
    if (!outputArmed || session.mode == SessionMode::NONE || session.trialIndex >= TRIAL_COUNT) {
        return;
    }
    Serial.printf("\n%s trial %u/%u: playing now...\n",
                  session.mode == SessionMode::NAVIGATION ? "NAV" : "SITUATIONAL",
                  session.trialIndex + 1,
                  TRIAL_COUNT);
    if (!waitInterruptibly(700) || !playPattern(session.schedule[session.trialIndex])) {
        return;
    }
    session.awaitingGuess = true;
    Serial.println(session.mode == SessionMode::NAVIGATION
                       ? F("Enter wearer guess: l or r. Use p to replay.")
                       : F("Enter wearer guess: e (event) or w (wait). Use p to replay."));
}

void startSession(SessionMode mode) {
    if (!requireArmed()) {
        return;
    }
    session = TrialSession{};
    session.mode = mode;

    const BuzzerPatternId first = mode == SessionMode::NAVIGATION
                                      ? BuzzerPatternId::NAV_LEFT
                                      : BuzzerPatternId::EVENT;
    const BuzzerPatternId second = mode == SessionMode::NAVIGATION
                                       ? BuzzerPatternId::NAV_RIGHT
                                       : BuzzerPatternId::WAIT;
    for (uint8_t i = 0; i < TRIAL_COUNT / 2; ++i) {
        session.schedule[i] = first;
        session.schedule[i + TRIAL_COUNT / 2] = second;
    }
    shuffleSchedule();

    Serial.printf("\nStarting %s: 12 balanced blind trials, pass = 10/12.\n",
                  mode == SessionMode::NAVIGATION ? "NAVIGATION" : "SITUATIONAL");
    playCurrentTrial();
}

char expectedGuess(BuzzerPatternId id) {
    switch (id) {
        case BuzzerPatternId::NAV_LEFT:  return 'l';
        case BuzzerPatternId::NAV_RIGHT: return 'r';
        case BuzzerPatternId::EVENT:     return 'e';
        case BuzzerPatternId::WAIT:      return 'w';
    }
    return '?';
}

bool validGuess(char guess) {
    if (session.mode == SessionMode::NAVIGATION) {
        return guess == 'l' || guess == 'r';
    }
    if (session.mode == SessionMode::SITUATIONAL) {
        return guess == 'e' || guess == 'w';
    }
    return false;
}

void submitGuess(char guess) {
    if (!session.awaitingGuess || !validGuess(guess)) {
        Serial.println(F("No matching trial is awaiting that guess. Press h for controls."));
        return;
    }

    const BuzzerPatternId actual = session.schedule[session.trialIndex];
    const bool correct = guess == expectedGuess(actual);
    if (correct) {
        ++session.score;
    }
    Serial.printf("%s. Actual: %s. Score: %u/%u.\n",
                  correct ? "CORRECT" : "INCORRECT",
                  patternFor(actual).name,
                  session.score,
                  session.trialIndex + 1);

    session.awaitingGuess = false;
    ++session.trialIndex;
    if (session.trialIndex >= TRIAL_COUNT) {
        Serial.printf("SESSION COMPLETE: %u/%u - %s\n",
                      session.score,
                      TRIAL_COUNT,
                      session.score >= PASS_SCORE ? "PASS" : "NOT YET DISCRIMINABLE");
        Serial.println(F("Press the P2 button, then n or s, to run another session."));
        disarmOutput("OUTPUT DISARMED: LED off. Press the P2 button to arm another session.");
        return;
    }

    if (!waitInterruptibly(1200)) {
        return;
    }
    playCurrentTrial();
}

void replayCurrentTrial() {
    if (!session.awaitingGuess || session.trialIndex >= TRIAL_COUNT) {
        Serial.println(F("No blind trial is awaiting a guess."));
        return;
    }
    Serial.println(F("Replaying current trial without revealing it..."));
    playPattern(session.schedule[session.trialIndex]);
}

void handleCommand(char command) {
    if (command >= 'A' && command <= 'Z') {
        command = static_cast<char>(command - 'A' + 'a');
    }
    switch (command) {
        case 'v': playAudioProxyCheck(); break;
        case 'n': startSession(SessionMode::NAVIGATION); break;
        case 's': startSession(SessionMode::SITUATIONAL); break;
        case 'l':
        case 'r':
        case 'e':
        case 'w': submitGuess(command); break;
        case 'p': replayCurrentTrial(); break;
        case 'x':
            if (outputArmed) {
                disarmOutput("STOPPED from Serial: both buzzers off; LED off.");
            } else {
                Serial.println(F("Output is already disarmed."));
            }
            break;
        case 'h': printHelp(); break;
        case '\r':
        case '\n': break;
        default: Serial.println(F("Unknown command. Press h for controls.")); break;
    }
}

} // namespace

void setup() {
    Serial.begin(115200);
    delay(800);

    pinMode(CONTROL_BUTTON_PIN, INPUT);
    pinMode(CONTROL_LED_PIN, OUTPUT);
    setControlLed(false);
    previousButtonDown = digitalRead(CONTROL_BUTTON_PIN) == CONTROL_BUTTON_ACTIVE_LEVEL;

    const bool leftAttached = ledcAttach(BUZZER_LEFT_PIN, 100, LEDC_RESOLUTION_BITS);
    const bool rightAttached = ledcAttach(BUZZER_RIGHT_PIN, 100, LEDC_RESOLUTION_BITS);
    allOff();

    if (!leftAttached || !rightAttached) {
        Serial.printf("LEDC attach failed: left=%s right=%s\n",
                      leftAttached ? "ok" : "failed",
                      rightAttached ? "ok" : "failed");
        while (true) {
            delay(1000);
        }
    }
    printHelp();
}

void loop() {
    serviceControlButton();
    while (Serial.available() > 0) {
        handleCommand(static_cast<char>(Serial.read()));
    }
    delay(5);
}
