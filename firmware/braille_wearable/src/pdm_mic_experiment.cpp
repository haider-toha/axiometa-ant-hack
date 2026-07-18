#include <Arduino.h>
#include <driver/i2s_pdm.h>
#include <esp_err.h>

#include "audio_pure.h"
#include "pins.h"

namespace {

constexpr uint32_t SAMPLE_RATE_HZ = 16000;
constexpr size_t FRAME_SAMPLE_COUNT = 512;
constexpr uint32_t READ_TIMEOUT_MS = 100;
constexpr uint32_t REPORT_INTERVAL_MS = 1000;

i2s_chan_handle_t rxChannel = nullptr;
int16_t samples[FRAME_SAMPLE_COUNT] = {};

struct ReportWindow {
    uint32_t fullFrames = 0;
    uint32_t partialReads = 0;
    uint32_t readErrors = 0;
    double meanSum = 0.0;
    double sigmaSum = 0.0;
    float peakSigma = 0.0f;
    int16_t minimum = INT16_MAX;
    int16_t maximum = INT16_MIN;
    uint32_t clippingSamples = 0;
    bool sawHealthy = false;
    bool sawSilent = false;
    bool sawRawPdm = false;
    bool sawClipping = false;
};

ReportWindow report;
uint32_t lastReportMs = 0;

void stopWithError(const char* operation, esp_err_t error) {
    Serial.printf("FATAL operation=%s error=%s (0x%x)\n",
                  operation,
                  esp_err_to_name(error),
                  static_cast<unsigned int>(error));
    while (true) {
        delay(1000);
    }
}

void initializePdmCapture() {
    pinMode(MIC_SELECT_PIN, OUTPUT);
    digitalWrite(MIC_SELECT_PIN, MIC_SELECT_LEVEL ? HIGH : LOW);

    i2s_chan_config_t channelConfig = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    channelConfig.dma_desc_num = 4;
    channelConfig.dma_frame_num = 256;

    esp_err_t error = i2s_new_channel(&channelConfig, nullptr, &rxChannel);
    if (error != ESP_OK) {
        stopWithError("i2s_new_channel", error);
    }

    i2s_pdm_rx_config_t pdmConfig = {};
    pdmConfig.clk_cfg = I2S_PDM_RX_CLK_DEFAULT_CONFIG(SAMPLE_RATE_HZ);
    pdmConfig.slot_cfg = I2S_PDM_RX_SLOT_PCM_FMT_DEFAULT_CONFIG(
        I2S_DATA_BIT_WIDTH_16BIT,
        I2S_SLOT_MODE_MONO);
    // ESP-IDF calls the PDM lane selected by a pulled-high SL pin RIGHT.
    pdmConfig.slot_cfg.slot_mask = I2S_PDM_SLOT_RIGHT;
    pdmConfig.gpio_cfg.clk = static_cast<gpio_num_t>(MIC_CLK_PIN);
    pdmConfig.gpio_cfg.din = static_cast<gpio_num_t>(MIC_DATA_PIN);
    pdmConfig.gpio_cfg.invert_flags.clk_inv = false;

    error = i2s_channel_init_pdm_rx_mode(rxChannel, &pdmConfig);
    if (error != ESP_OK) {
        stopWithError("i2s_channel_init_pdm_rx_mode", error);
    }
    error = i2s_channel_enable(rxChannel);
    if (error != ESP_OK) {
        stopWithError("i2s_channel_enable", error);
    }
}

void addFrameToReport(const AudioFrameStats& stats, AudioFrameHealth health) {
    ++report.fullFrames;
    report.meanSum += stats.mean;
    report.sigmaSum += stats.standardDeviation;
    report.peakSigma = max(report.peakSigma, stats.standardDeviation);
    report.minimum = min(report.minimum, stats.minimum);
    report.maximum = max(report.maximum, stats.maximum);
    report.clippingSamples += stats.clippingSamples;

    switch (health) {
        case AudioFrameHealth::SILENT_OR_WRONG_SLOT:
            report.sawSilent = true;
            break;
        case AudioFrameHealth::HEALTHY:
            report.sawHealthy = true;
            break;
        case AudioFrameHealth::RAW_PDM_OR_EXCESSIVE_NOISE:
            report.sawRawPdm = true;
            break;
        case AudioFrameHealth::CLIPPING:
            report.sawClipping = true;
            break;
        case AudioFrameHealth::EMPTY:
            break;
    }
}

AudioFrameHealth reportHealth() {
    if (report.fullFrames == 0) {
        return AudioFrameHealth::EMPTY;
    }
    if (report.sawClipping) {
        return AudioFrameHealth::CLIPPING;
    }
    if (report.sawRawPdm) {
        return AudioFrameHealth::RAW_PDM_OR_EXCESSIVE_NOISE;
    }
    if (report.sawHealthy) {
        return AudioFrameHealth::HEALTHY;
    }
    return AudioFrameHealth::SILENT_OR_WRONG_SLOT;
}

void printReport(uint32_t nowMs) {
    const AudioFrameHealth health = reportHealth();
    const double divisor = report.fullFrames == 0 ? 1.0 : report.fullFrames;
    const int16_t minimum = report.fullFrames == 0 ? 0 : report.minimum;
    const int16_t maximum = report.fullFrames == 0 ? 0 : report.maximum;

    Serial.printf(
        "PDM frames=%lu partial=%lu errors=%lu mean=%.1f sigma=%.1f "
        "peak_sigma=%.1f min=%d max=%d clipping=%lu health=%s\n",
        static_cast<unsigned long>(report.fullFrames),
        static_cast<unsigned long>(report.partialReads),
        static_cast<unsigned long>(report.readErrors),
        report.meanSum / divisor,
        report.sigmaSum / divisor,
        report.peakSigma,
        minimum,
        maximum,
        static_cast<unsigned long>(report.clippingSamples),
        audioFrameHealthName(health));

    if (health == AudioFrameHealth::SILENT_OR_WRONG_SLOT) {
        Serial.println(F("HINT SL=HIGH expects ESP-IDF I2S_PDM_SLOT_RIGHT."));
    } else if (health == AudioFrameHealth::RAW_PDM_OR_EXCESSIVE_NOISE) {
        Serial.println(F("HINT Verify PCM conversion remains bound to I2S_NUM_0."));
    }

    report = ReportWindow{};
    lastReportMs = nowMs;
}

} // namespace

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println(F("\n=== AX22-0044 / T3902 PDM microphone bring-up ==="));
    Serial.printf("P4 CLK=GPIO%u DT=GPIO%u SL=GPIO%u SL_LEVEL=HIGH\n",
                  MIC_CLK_PIN,
                  MIC_DATA_PIN,
                  MIC_SELECT_PIN);
    Serial.printf("I2S=0 rate_hz=%lu bits=16 mono_slot=RIGHT frame_samples=%u\n",
                  static_cast<unsigned long>(SAMPLE_RATE_HZ),
                  static_cast<unsigned int>(FRAME_SAMPLE_COUNT));
    initializePdmCapture();
    lastReportMs = millis();
    Serial.println(F("PDM capture started. Speak or clap near the microphone."));
}

void loop() {
    size_t bytesRead = 0;
    const esp_err_t error = i2s_channel_read(
        rxChannel,
        samples,
        sizeof(samples),
        &bytesRead,
        pdMS_TO_TICKS(READ_TIMEOUT_MS));

    if (error == ESP_OK && bytesRead == sizeof(samples)) {
        const AudioFrameStats stats = analyzeAudioFrame(samples, FRAME_SAMPLE_COUNT);
        addFrameToReport(stats, classifyAudioFrame(stats));
    } else if (error == ESP_OK) {
        ++report.partialReads;
    } else {
        ++report.readErrors;
    }

    const uint32_t nowMs = millis();
    if (static_cast<uint32_t>(nowMs - lastReportMs) >= REPORT_INTERVAL_MS) {
        printReport(nowMs);
    }
}
