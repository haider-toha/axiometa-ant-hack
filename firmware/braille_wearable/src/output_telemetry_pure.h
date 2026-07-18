#pragma once

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

constexpr uint32_t OUTPUT_TELEMETRY_HEARTBEAT_MS = 1000;

inline bool outputTelemetryDue(bool changed, uint32_t nowMs, uint32_t lastTelemetryMs) {
    return changed ||
           static_cast<uint32_t>(nowMs - lastTelemetryMs) >= OUTPUT_TELEMETRY_HEARTBEAT_MS;
}

inline int formatOutputTelemetry(
    char *buffer,
    size_t size,
    uint16_t leftHz,
    uint16_t rightHz,
    uint32_t upMs) {
    if (buffer == nullptr || size == 0) {
        return -1;
    }

    const int length = snprintf(
        buffer,
        size,
        "TACTA_OUTPUT {\"v\":1,\"leftHz\":%u,\"rightHz\":%u,\"upMs\":%lu}\n",
        static_cast<unsigned>(leftHz),
        static_cast<unsigned>(rightHz),
        static_cast<unsigned long>(upMs));

    if (length < 0 || static_cast<size_t>(length) >= size) {
        return -1;
    }
    return length;
}
