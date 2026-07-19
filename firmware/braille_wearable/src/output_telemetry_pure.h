#pragma once

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "haptic_pure.h"
#include "relay_pure.h"

constexpr uint32_t OUTPUT_TELEMETRY_HEARTBEAT_MS = 1000;

enum class OutputTelemetryState : uint8_t {
    ACTIVE,
    SUPPRESSED,
    MUTED,
    STOPPED,
    IDLE,
};

enum class OutputTelemetrySource : uint8_t {
    LOCAL_SIREN,
    LOCAL_TOF,
    RELAY,
    SERVICE,
    SYSTEM,
    NONE,
};

enum class OutputTelemetryReason : uint8_t {
    PLAYING,
    STILL_GATE,
    NIGHT_MODE,
    OUTPUT_STOPPED,
    NO_OUTPUT,
};

struct OutputSemanticInputs {
    bool outputEnabled;
    bool sirenActive;
    const char* sirenPattern;
    bool proximityActive;
    bool proximityCanRender;
    bool playerActive;
    OutputTelemetrySource playerSource;
    const char* playerPattern;
    UserActivity activity;
    int32_t tofMm;
    OutputMode outputMode;
};

struct OutputSemanticSnapshot {
    OutputTelemetryState state;
    OutputTelemetrySource source;
    const char* pattern;
    UserActivity activity;
    OutputTelemetryReason reason;
    int32_t tofMm;
    OutputMode outputMode;
};

inline const char* outputTelemetryStateName(OutputTelemetryState state) {
    switch (state) {
        case OutputTelemetryState::ACTIVE: return "ACTIVE";
        case OutputTelemetryState::SUPPRESSED: return "SUPPRESSED";
        case OutputTelemetryState::MUTED: return "MUTED";
        case OutputTelemetryState::STOPPED: return "STOPPED";
        case OutputTelemetryState::IDLE: return "IDLE";
    }
    return "IDLE";
}

inline const char* outputTelemetrySourceName(OutputTelemetrySource source) {
    switch (source) {
        case OutputTelemetrySource::LOCAL_SIREN: return "LOCAL_SIREN";
        case OutputTelemetrySource::LOCAL_TOF: return "LOCAL_TOF";
        case OutputTelemetrySource::RELAY: return "RELAY";
        case OutputTelemetrySource::SERVICE: return "SERVICE";
        case OutputTelemetrySource::SYSTEM: return "SYSTEM";
        case OutputTelemetrySource::NONE: return "NONE";
    }
    return "NONE";
}

inline const char* outputTelemetryReasonName(OutputTelemetryReason reason) {
    switch (reason) {
        case OutputTelemetryReason::PLAYING: return "PLAYING";
        case OutputTelemetryReason::STILL_GATE: return "STILL_GATE";
        case OutputTelemetryReason::NIGHT_MODE: return "NIGHT_MODE";
        case OutputTelemetryReason::OUTPUT_STOPPED: return "OUTPUT_STOPPED";
        case OutputTelemetryReason::NO_OUTPUT: return "NO_OUTPUT";
    }
    return "NO_OUTPUT";
}

inline const char* outputTelemetryModeName(OutputMode mode) {
    return mode == OutputMode::NIGHT ? "NIGHT" : "AUDIBLE";
}

inline const char* outputTelemetryPattern(const char* pattern) {
    return pattern == nullptr || pattern[0] == '\0' ? "NONE" : pattern;
}

inline OutputSemanticSnapshot selectOutputSemantics(
    const OutputSemanticInputs& inputs) {
    OutputSemanticSnapshot snapshot{
        OutputTelemetryState::IDLE,
        OutputTelemetrySource::NONE,
        "NONE",
        inputs.activity,
        OutputTelemetryReason::NO_OUTPUT,
        inputs.tofMm,
        inputs.outputMode,
    };

    if (!inputs.outputEnabled) {
        snapshot.state = OutputTelemetryState::STOPPED;
        snapshot.reason = OutputTelemetryReason::OUTPUT_STOPPED;
    } else if (inputs.sirenActive) {
        snapshot.state = OutputTelemetryState::ACTIVE;
        snapshot.source = OutputTelemetrySource::LOCAL_SIREN;
        snapshot.pattern = outputTelemetryPattern(inputs.sirenPattern);
        snapshot.reason = OutputTelemetryReason::PLAYING;
    } else if (inputs.proximityCanRender) {
        snapshot.state = OutputTelemetryState::ACTIVE;
        snapshot.source = OutputTelemetrySource::LOCAL_TOF;
        snapshot.pattern = "PROXIMITY";
        snapshot.reason = OutputTelemetryReason::PLAYING;
    } else if (inputs.playerActive) {
        snapshot.state = OutputTelemetryState::ACTIVE;
        snapshot.source = inputs.playerSource;
        snapshot.pattern = outputTelemetryPattern(inputs.playerPattern);
        snapshot.reason = OutputTelemetryReason::PLAYING;
    } else if (inputs.proximityActive && inputs.activity == UserActivity::STILL) {
        snapshot.state = OutputTelemetryState::SUPPRESSED;
        snapshot.source = OutputTelemetrySource::LOCAL_TOF;
        snapshot.pattern = "PROXIMITY";
        snapshot.reason = OutputTelemetryReason::STILL_GATE;
    }

    if (snapshot.state == OutputTelemetryState::ACTIVE &&
        inputs.outputMode == OutputMode::NIGHT) {
        snapshot.state = OutputTelemetryState::MUTED;
        snapshot.reason = OutputTelemetryReason::NIGHT_MODE;
    }
    return snapshot;
}

inline bool sameOutputSnapshot(const OutputSemanticSnapshot& left,
                               const OutputSemanticSnapshot& right) {
    return left.state == right.state &&
           left.source == right.source &&
           strcmp(outputTelemetryPattern(left.pattern),
                  outputTelemetryPattern(right.pattern)) == 0 &&
           left.activity == right.activity &&
           left.reason == right.reason &&
           left.tofMm == right.tofMm &&
           left.outputMode == right.outputMode;
}

inline bool outputTelemetryDue(bool changed, uint32_t nowMs,
                               uint32_t lastTelemetryMs) {
    return changed ||
           static_cast<uint32_t>(nowMs - lastTelemetryMs) >=
               OUTPUT_TELEMETRY_HEARTBEAT_MS;
}

inline int formatOutputTelemetry(
    char* buffer,
    size_t size,
    HapticDrive drive,
    uint32_t upMs,
    const OutputSemanticSnapshot& snapshot) {
    if (buffer == nullptr || size == 0) {
        return -1;
    }

    int length = -1;
    if (snapshot.tofMm < 0) {
        length = snprintf(
            buffer,
            size,
            "TACTA_OUTPUT {\"v\":2,\"leftHz\":%u,\"rightHz\":%u,\"upMs\":%lu,"
            "\"state\":\"%s\",\"source\":\"%s\",\"pattern\":\"%s\","
            "\"activity\":\"%s\",\"reason\":\"%s\",\"tofMm\":null,"
            "\"outputMode\":\"%s\"}\n",
            static_cast<unsigned>(drive.p1Hz),
            static_cast<unsigned>(drive.p3Hz),
            static_cast<unsigned long>(upMs),
            outputTelemetryStateName(snapshot.state),
            outputTelemetrySourceName(snapshot.source),
            outputTelemetryPattern(snapshot.pattern),
            userActivityName(snapshot.activity),
            outputTelemetryReasonName(snapshot.reason),
            outputTelemetryModeName(snapshot.outputMode));
    } else {
        length = snprintf(
            buffer,
            size,
            "TACTA_OUTPUT {\"v\":2,\"leftHz\":%u,\"rightHz\":%u,\"upMs\":%lu,"
            "\"state\":\"%s\",\"source\":\"%s\",\"pattern\":\"%s\","
            "\"activity\":\"%s\",\"reason\":\"%s\",\"tofMm\":%ld,"
            "\"outputMode\":\"%s\"}\n",
            static_cast<unsigned>(drive.p1Hz),
            static_cast<unsigned>(drive.p3Hz),
            static_cast<unsigned long>(upMs),
            outputTelemetryStateName(snapshot.state),
            outputTelemetrySourceName(snapshot.source),
            outputTelemetryPattern(snapshot.pattern),
            userActivityName(snapshot.activity),
            outputTelemetryReasonName(snapshot.reason),
            static_cast<long>(snapshot.tofMm),
            outputTelemetryModeName(snapshot.outputMode));
    }

    if (length < 0 || static_cast<size_t>(length) >= size) {
        return -1;
    }
    return length;
}
