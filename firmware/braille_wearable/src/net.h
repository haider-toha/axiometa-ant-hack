#pragma once

#include <stdint.h>

#include "relay_pure.h"

struct RelayUpdate {
    bool resetCommandBaseline = false;
    bool hasActivity = false;
    UserActivity activity = UserActivity::UNKNOWN;
    uint32_t activitySeq = 0;
    int64_t activityTs = 0;
    bool hasCommand = false;
    RelayCommand command{};
};

struct RelayTelemetry {
    float bandRms = 0.0f;
    uint16_t peakHz = 0;
    float modIdx = 0.0f;
    bool trendRising = false;
    char playing[20] = "NONE";
    uint16_t tofMm = 0;
};

// Creates fixed-size queues and, when secrets.h is configured, starts the
// outbound-only Wi-Fi/TLS worker on Core 0. Never blocks local sensor startup.
bool relayStart();

// Non-blocking Core-1 side of the network boundary.
bool relayPollUpdate(RelayUpdate& update);
void relayPublishTelemetry(const RelayTelemetry& telemetry);

bool relayNetworkConfigured();
