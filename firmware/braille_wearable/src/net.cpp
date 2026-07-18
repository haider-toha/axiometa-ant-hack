#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "net.h"
#include "network_config.h"

namespace {

constexpr uint32_t HEALTHY_POLL_MS = 300;
constexpr uint32_t LONG_OUTAGE_MS = 10000;
constexpr uint32_t JOIN_WINDOW_MS = 10000;
constexpr uint32_t BACKOFF_MS[] = {1000, 2000, 4000, 8000};
constexpr size_t MAX_RESPONSE_BYTES = 768;
constexpr UBaseType_t UPDATE_QUEUE_LENGTH = 8;
constexpr uint32_t NETWORK_TASK_STACK_BYTES = 12288;

QueueHandle_t updateQueue = nullptr;
QueueHandle_t telemetryQueue = nullptr;
TaskHandle_t networkTaskHandle = nullptr;

WiFiClientSecure tlsClient;
HTTPClient httpClient;
JsonDocument responseDocument;
char pullUrl[160] = {};

bool commandObserved = false;
uint32_t lastQueuedCommandSeq = 0;
bool activityObserved = false;
uint32_t lastActivitySeq = 0;

bool enqueueUpdate(const RelayUpdate& update) {
    if (xQueueSend(updateQueue, &update, 0) == pdTRUE) {
        return true;
    }
    RelayUpdate discarded{};
    xQueueReceive(updateQueue, &discarded, 0);
    return xQueueSend(updateQueue, &update, 0) == pdTRUE;
}

void resetWireBaselines() {
    commandObserved = false;
    lastQueuedCommandSeq = 0;
    activityObserved = false;
    lastActivitySeq = 0;
}

bool joinHotspot(uint8_t& backoffIndex) {
    WiFi.disconnect(false, false);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    const uint32_t startedMs = millis();
    while (WiFi.status() != WL_CONNECTED &&
           static_cast<uint32_t>(millis() - startedMs) < JOIN_WINDOW_MS) {
        vTaskDelay(pdMS_TO_TICKS(250));
    }
    if (WiFi.status() != WL_CONNECTED) {
        Serial.printf("RELAY wifi=disconnected retry_ms=%lu\n",
                      static_cast<unsigned long>(BACKOFF_MS[backoffIndex]));
        vTaskDelay(pdMS_TO_TICKS(BACKOFF_MS[backoffIndex]));
        if (backoffIndex + 1 < sizeof(BACKOFF_MS) / sizeof(BACKOFF_MS[0])) {
            ++backoffIndex;
        }
        return false;
    }

    backoffIndex = 0;
    Serial.printf("RELAY wifi=connected ip=%s rssi=%ld\n",
                  WiFi.localIP().toString().c_str(),
                  static_cast<long>(WiFi.RSSI()));
    return true;
}

size_t buildTelemetryPayload(char* payload, size_t capacity,
                             const RelayTelemetry& telemetry) {
    JsonDocument document;
    document["bandRms"] = telemetry.bandRms;
    document["peakHz"] = telemetry.peakHz;
    document["modIdx"] = telemetry.modIdx;
    document["trend"] = telemetry.trendRising ? "rising" : "flat";
    document["playing"] = telemetry.playing;
    document["tofMm"] = telemetry.tofMm;
    document["upMs"] = millis();
    document["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
    return serializeJson(document, payload, capacity);
}

bool parseResponse(RelayUpdate& update) {
    const int contentLength = httpClient.getSize();
    if (contentLength > static_cast<int>(MAX_RESPONSE_BYTES)) {
        Serial.printf("RELAY rejected=response_oversized bytes=%d\n", contentLength);
        return false;
    }

    // Vercel commonly returns this route with Transfer-Encoding: chunked and no
    // Content-Length. HTTPClient::getStream() exposes the raw chunk framing,
    // which ArduinoJson quite correctly rejects as non-JSON. getString() goes
    // through HTTPClient's bounded de-chunking path before we parse it.
    const String responseBody = httpClient.getString();
    if (responseBody.isEmpty()) {
        Serial.println(F("RELAY rejected=empty_response"));
        return false;
    }
    if (responseBody.length() > MAX_RESPONSE_BYTES) {
        Serial.printf("RELAY rejected=response_oversized bytes=%u\n",
                      static_cast<unsigned>(responseBody.length()));
        return false;
    }

    responseDocument.clear();
    const DeserializationError error =
        deserializeJson(responseDocument, responseBody);
    if (error) {
        Serial.printf("RELAY rejected=json error=%s\n", error.c_str());
        return false;
    }

    if (!responseDocument["seq"].is<uint32_t>() ||
        !responseDocument["pattern"].is<const char*>()) {
        Serial.println(F("RELAY rejected=missing_command_fields"));
        return false;
    }

    const uint32_t seq = responseDocument["seq"].as<uint32_t>();
    if (!commandObserved || seq != lastQueuedCommandSeq) {
        update.hasCommand = true;
        update.command.seq = seq;
        update.command.pattern =
            parseCloudCommand(responseDocument["pattern"].as<const char*>());
        copyRelayRoute(update.command.route,
                       responseDocument["route"] | "");
        update.command.confidence =
            parseRelayConfidence(responseDocument["conf"] | "");
        update.command.arrivalId = responseDocument["arrivalId"] | 0U;
        update.command.serverTs = responseDocument["ts"] | 0LL;
        commandObserved = true;
        lastQueuedCommandSeq = seq;
    }

    if (responseDocument["activity"].is<const char*>() &&
        responseDocument["activitySeq"].is<uint32_t>()) {
        const UserActivity activity =
            parseUserActivity(responseDocument["activity"].as<const char*>());
        const uint32_t activitySeq = responseDocument["activitySeq"].as<uint32_t>();
        if (activity != UserActivity::UNKNOWN) {
            if (!activityObserved) {
                activityObserved = true;
                lastActivitySeq = activitySeq;
                Serial.printf("RELAY activity=baseline seq=%lu value=%s\n",
                              static_cast<unsigned long>(activitySeq),
                              userActivityName(activity));
            } else if (activitySeq > lastActivitySeq) {
                update.hasActivity = true;
                update.activity = activity;
                update.activitySeq = activitySeq;
                lastActivitySeq = activitySeq;
            }
        }
    }
    return true;
}

bool pollRelay(RelayUpdate& update, const RelayTelemetry& telemetry) {
    char payload[384] = {};
    const size_t payloadLength = buildTelemetryPayload(payload, sizeof(payload), telemetry);
    if (payloadLength == 0 || payloadLength >= sizeof(payload) - 1) {
        Serial.println(F("RELAY rejected=telemetry_oversized"));
        return false;
    }

    httpClient.setReuse(true);
    httpClient.setConnectTimeout(4000);
    httpClient.setTimeout(4000);
    if (!httpClient.begin(tlsClient, pullUrl)) {
        return false;
    }
    httpClient.addHeader("Content-Type", "application/json");
    const int code = httpClient.POST(
        reinterpret_cast<uint8_t*>(payload), payloadLength);
    if (code != HTTP_CODE_OK) {
        Serial.printf("RELAY http=%d\n", code);
        httpClient.end();
        return false;
    }
    const bool parsed = parseResponse(update);
    httpClient.end();
    return parsed;
}

void networkTask(void*) {
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    tlsClient.setInsecure();
    snprintf(pullUrl, sizeof(pullUrl), "https://%s/api/pull", VERCEL_HOST);

    RelayTelemetry telemetry{};
    uint8_t backoffIndex = 0;
    uint8_t relayFailureIndex = 0;
    uint32_t outageStartedMs = millis();
    bool outageActive = true;

    while (true) {
        if (WiFi.status() != WL_CONNECTED) {
            if (!joinHotspot(backoffIndex)) {
                continue;
            }
        }

        RelayTelemetry latest{};
        while (xQueueReceive(telemetryQueue, &latest, 0) == pdTRUE) {
            telemetry = latest;
        }

        RelayUpdate update{};
        const uint32_t pollStartedMs = millis();
        if (pollRelay(update, telemetry)) {
            if (outageActive &&
                static_cast<uint32_t>(pollStartedMs - outageStartedMs) > LONG_OUTAGE_MS) {
                resetWireBaselines();
                update = RelayUpdate{};
                update.resetCommandBaseline = true;
                if (!pollRelay(update, telemetry)) {
                    tlsClient.stop();
                    continue;
                }
            }
            outageActive = false;
            relayFailureIndex = 0;
            if (update.resetCommandBaseline || update.hasActivity || update.hasCommand) {
                if (!enqueueUpdate(update)) {
                    Serial.println(F("RELAY dropped=queue_full"));
                }
            }
            const uint32_t elapsedMs = millis() - pollStartedMs;
            if (elapsedMs < HEALTHY_POLL_MS) {
                vTaskDelay(pdMS_TO_TICKS(HEALTHY_POLL_MS - elapsedMs));
            }
            continue;
        }

        if (!outageActive) {
            outageActive = true;
            outageStartedMs = pollStartedMs;
        }
        tlsClient.stop();
        const uint32_t retryMs = BACKOFF_MS[relayFailureIndex];
        Serial.printf("RELAY poll=failed retry_ms=%lu\n",
                      static_cast<unsigned long>(retryMs));
        vTaskDelay(pdMS_TO_TICKS(retryMs));
        if (relayFailureIndex + 1 < sizeof(BACKOFF_MS) / sizeof(BACKOFF_MS[0])) {
            ++relayFailureIndex;
        }
    }
}

} // namespace

bool relayStart() {
    if (updateQueue == nullptr) {
        updateQueue = xQueueCreate(UPDATE_QUEUE_LENGTH, sizeof(RelayUpdate));
    }
    if (telemetryQueue == nullptr) {
        telemetryQueue = xQueueCreate(1, sizeof(RelayTelemetry));
    }
    if (updateQueue == nullptr || telemetryQueue == nullptr) {
        Serial.println(F("RELAY start=failed reason=queue_allocation"));
        return false;
    }
    if (!RELAY_NETWORK_CONFIGURED) {
        Serial.println(F("RELAY configured=0 transport=offline_local_only"));
        return true;
    }
    if (networkTaskHandle != nullptr) {
        return true;
    }
    const BaseType_t result = xTaskCreatePinnedToCore(
        networkTask, "netTask", NETWORK_TASK_STACK_BYTES, nullptr, 1,
        &networkTaskHandle, 0);
    if (result != pdPASS) {
        networkTaskHandle = nullptr;
        Serial.println(F("RELAY start=failed reason=task_allocation"));
        return false;
    }
    Serial.printf("RELAY configured=1 host=%s cadence_ms=%lu\n", VERCEL_HOST,
                  static_cast<unsigned long>(HEALTHY_POLL_MS));
    return true;
}

bool relayPollUpdate(RelayUpdate& update) {
    return updateQueue != nullptr && xQueueReceive(updateQueue, &update, 0) == pdTRUE;
}

void relayPublishTelemetry(const RelayTelemetry& telemetry) {
    if (telemetryQueue != nullptr) {
        xQueueOverwrite(telemetryQueue, &telemetry);
    }
}

bool relayNetworkConfigured() {
    return RELAY_NETWORK_CONFIGURED;
}
