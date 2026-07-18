#include <Arduino.h>
#include <arduinoFFT.h>
#include <driver/i2s_pdm.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

#include "audio.h"
#include "pins.h"
#include "siren_runtime_pure.h"

namespace {

constexpr uint32_t READ_TIMEOUT_MS = 100;
constexpr uint32_t TELEMETRY_INTERVAL_MS = 1000;
constexpr uint8_t AUDIO_TASK_CORE = 1;
constexpr UBaseType_t AUDIO_TASK_PRIORITY = 3;
constexpr uint32_t AUDIO_TASK_STACK_BYTES = 8192;

i2s_chan_handle_t rxChannel = nullptr;
QueueHandle_t decisionQueue = nullptr;
QueueHandle_t currentDecisionQueue = nullptr;
QueueHandle_t telemetryQueue = nullptr;
TaskHandle_t audioTaskHandle = nullptr;

int16_t pcmSamples[SIREN_FFT_SIZE] = {};
float fftReal[SIREN_FFT_SIZE] = {};
float fftImaginary[SIREN_FFT_SIZE] = {};
ArduinoFFT<float> fft(
    fftReal, fftImaginary, SIREN_FFT_SIZE, SIREN_SAMPLE_RATE_HZ, true);

void resetCaptureState(SirenState& sirenState, SirenProducerState& producerState) {
    resetSiren(sirenState);
    producerState.previousDecision = SirenDecision::NONE;
}

void publishDecision(
    SirenProducerState& producerState,
    SirenDecision decision,
    uint32_t nowMs,
    uint32_t& droppedDecisions) {
    const SirenProducerState beforeAttempt = producerState;
    if (!shouldPublishSirenDecision(producerState, decision, nowMs)) {
        return;
    }
    if (xQueueSend(decisionQueue, &decision, 0) != pdTRUE) {
        producerState = beforeAttempt;
        ++droppedDecisions;
    }
}

void audioTask(void*) {
    SirenState sirenState{};
    SirenProducerState producerState{};
    AudioTelemetry telemetry{};
    uint32_t lastTelemetryMs = millis();

    while (true) {
        size_t bytesRead = 0;
        const esp_err_t error = i2s_channel_read(
            rxChannel,
            pcmSamples,
            sizeof(pcmSamples),
            &bytesRead,
            pdMS_TO_TICKS(READ_TIMEOUT_MS));

        if (error != ESP_OK) {
            ++telemetry.readErrors;
            telemetry.health = AudioFrameHealth::EMPTY;
            telemetry.features = SirenFeatures{};
            telemetry.decision = SirenDecision::NONE;
            xQueueOverwrite(currentDecisionQueue, &telemetry.decision);
            resetCaptureState(sirenState, producerState);
        } else if (bytesRead != sizeof(pcmSamples)) {
            ++telemetry.partialReads;
            telemetry.health = AudioFrameHealth::EMPTY;
            telemetry.features = SirenFeatures{};
            telemetry.decision = SirenDecision::NONE;
            xQueueOverwrite(currentDecisionQueue, &telemetry.decision);
            resetCaptureState(sirenState, producerState);
        } else {
            ++telemetry.fullFrames;
            telemetry.frame = analyzeAudioFrame(pcmSamples, SIREN_FFT_SIZE);
            telemetry.health = classifyAudioFrame(telemetry.frame);

            if (telemetry.health == AudioFrameHealth::HEALTHY) {
                for (uint16_t index = 0; index < SIREN_FFT_SIZE; ++index) {
                    fftReal[index] = static_cast<float>(pcmSamples[index]);
                    fftImaginary[index] = 0.0f;
                }
                fft.windowing(FFTWindow::Hann, FFTDirection::Forward, false);
                fft.compute(FFTDirection::Forward);
                fft.complexToMagnitude();

                telemetry.features = extractSirenFeatures(fftReal);
                telemetry.decision = updateSiren(sirenState, telemetry.features);
                xQueueOverwrite(currentDecisionQueue, &telemetry.decision);
                publishDecision(
                    producerState,
                    telemetry.decision,
                    millis(),
                    telemetry.droppedDecisions);
            } else {
                telemetry.features = SirenFeatures{};
                telemetry.decision = SirenDecision::NONE;
                xQueueOverwrite(currentDecisionQueue, &telemetry.decision);
                resetCaptureState(sirenState, producerState);
            }
        }

        const uint32_t nowMs = millis();
        if (static_cast<uint32_t>(nowMs - lastTelemetryMs) >= TELEMETRY_INTERVAL_MS) {
            xQueueOverwrite(telemetryQueue, &telemetry);
            telemetry = AudioTelemetry{};
            lastTelemetryMs = nowMs;
        }
    }
}

bool initializePdmChannel() {
    pinMode(MIC_SELECT_PIN, OUTPUT);
    digitalWrite(MIC_SELECT_PIN, MIC_SELECT_LEVEL ? HIGH : LOW);

    i2s_chan_config_t channelConfig = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    channelConfig.dma_desc_num = 4;
    channelConfig.dma_frame_num = 256;
    esp_err_t error = i2s_new_channel(&channelConfig, nullptr, &rxChannel);
    if (error != ESP_OK) {
        Serial.printf("AUDIO_INIT failed=i2s_new_channel error=%s\n", esp_err_to_name(error));
        return false;
    }

    i2s_pdm_rx_config_t pdmConfig = {};
    pdmConfig.clk_cfg = I2S_PDM_RX_CLK_DEFAULT_CONFIG(SIREN_SAMPLE_RATE_HZ);
    pdmConfig.slot_cfg = I2S_PDM_RX_SLOT_PCM_FMT_DEFAULT_CONFIG(
        I2S_DATA_BIT_WIDTH_16BIT,
        I2S_SLOT_MODE_MONO);
    pdmConfig.slot_cfg.slot_mask = I2S_PDM_SLOT_RIGHT;
    pdmConfig.gpio_cfg.clk = static_cast<gpio_num_t>(MIC_CLK_PIN);
    pdmConfig.gpio_cfg.din = static_cast<gpio_num_t>(MIC_DATA_PIN);
    pdmConfig.gpio_cfg.invert_flags.clk_inv = false;

    error = i2s_channel_init_pdm_rx_mode(rxChannel, &pdmConfig);
    if (error == ESP_OK) {
        error = i2s_channel_enable(rxChannel);
    }
    if (error != ESP_OK) {
        Serial.printf("AUDIO_INIT failed=pdm_config error=%s\n", esp_err_to_name(error));
        i2s_del_channel(rxChannel);
        rxChannel = nullptr;
        return false;
    }
    return true;
}

} // namespace

bool audioBegin() {
    decisionQueue = xQueueCreate(4, sizeof(SirenDecision));
    currentDecisionQueue = xQueueCreate(1, sizeof(SirenDecision));
    telemetryQueue = xQueueCreate(1, sizeof(AudioTelemetry));
    if (decisionQueue == nullptr || currentDecisionQueue == nullptr ||
        telemetryQueue == nullptr) {
        Serial.println(F("AUDIO_INIT failed=queue_allocation"));
        return false;
    }
    if (!initializePdmChannel()) {
        return false;
    }
    const BaseType_t created = xTaskCreatePinnedToCore(
        audioTask,
        "audioTask",
        AUDIO_TASK_STACK_BYTES,
        nullptr,
        AUDIO_TASK_PRIORITY,
        &audioTaskHandle,
        AUDIO_TASK_CORE);
    if (created != pdPASS) {
        Serial.println(F("AUDIO_INIT failed=task_creation"));
        i2s_channel_disable(rxChannel);
        i2s_del_channel(rxChannel);
        rxChannel = nullptr;
        return false;
    }
    return true;
}

bool audioPollDecision(SirenDecision& decision) {
    return decisionQueue != nullptr && xQueueReceive(decisionQueue, &decision, 0) == pdTRUE;
}

bool audioPollCurrentDecision(SirenDecision& decision) {
    return currentDecisionQueue != nullptr &&
           xQueueReceive(currentDecisionQueue, &decision, 0) == pdTRUE;
}

bool audioPollTelemetry(AudioTelemetry& telemetry) {
    return telemetryQueue != nullptr && xQueueReceive(telemetryQueue, &telemetry, 0) == pdTRUE;
}

const char* sirenDecisionName(SirenDecision decision) {
    switch (decision) {
        case SirenDecision::NONE: return "NONE";
        case SirenDecision::ATTENTION: return "ATTENTION";
        case SirenDecision::SIREN_WARNING: return "SIREN_WARNING";
        case SirenDecision::DANGER: return "DANGER";
    }
    return "UNKNOWN";
}
