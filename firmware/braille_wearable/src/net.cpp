#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>          // v7: use JsonDocument (NOT StaticJsonDocument)
#include "secrets.h"
#include "net.h"

// One reused TLS client (insecure for the demo: skip cert validation) and the
// seq gate. setInsecure() is called once in wifiJoin(), after the link is up.
static WiFiClientSecure s_tls;
static long             s_lastSeq = 0;

bool wifiJoin() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
        delay(250);
        Serial.print('.');
    }
    Serial.println();
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println(F("WiFi join FAILED"));
        return false;
    }
    s_tls.setInsecure();                       // demo: accept any server cert
    Serial.print(F("WiFi connected, IP="));
    Serial.println(WiFi.localIP().toString());
    return true;
}

String deviceIp() {
    if (WiFi.status() != WL_CONNECTED) return String("0.0.0.0");
    return WiFi.localIP().toString();
}

bool pollPull(PullResult& out) {
    if (WiFi.status() != WL_CONNECTED) return false;

    HTTPClient http;
    String url = String("https://") + VERCEL_HOST + "/api/pull";
    if (!http.begin(s_tls, url)) return false;

    int code = http.GET();
    if (code != 200) { http.end(); return false; }
    String body = http.getString();
    http.end();

    JsonDocument d;                            // v7 elastic document
    DeserializationError err = deserializeJson(d, body);
    if (err) return false;

    long seq = d["seq"] | 0L;
    if (seq <= s_lastSeq) return false;        // nothing new
    s_lastSeq = seq;

    out.seq  = seq;
    out.mode = d["mode"].as<String>();
    out.msg  = d["msg"].as<String>();
    out.replies.clear();
    JsonArray arr = d["replies"].as<JsonArray>();
    for (JsonVariant v : arr) out.replies.push_back(v.as<String>());
    return true;
}

bool postReply(int index, const char* text) {
    if (WiFi.status() != WL_CONNECTED) return false;

    HTTPClient http;
    String url = String("https://") + VERCEL_HOST + "/api/reply";
    if (!http.begin(s_tls, url)) return false;
    http.addHeader("Content-Type", "application/json");

    JsonDocument d;
    d["index"] = index;
    d["text"]  = text;
    String payload;
    serializeJson(d, payload);

    int code = http.POST(payload);
    http.end();
    return code == 200;
}
