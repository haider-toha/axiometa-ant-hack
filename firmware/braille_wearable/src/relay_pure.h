#pragma once

#include <stdint.h>
#include <string.h>

inline constexpr uint32_t CLOUD_ACTIVITY_LEASE_MS = 120000;

enum class CloudCommand : uint8_t {
    NONE = 0,
    BUS,
    NUMBER,
    WAIT,
    UNKNOWN,
    ERROR,
    INVALID,
};

enum class UserActivity : uint8_t {
    UNKNOWN = 0,
    MOVING,
    STILL,
};

enum class RelayConfidence : uint8_t {
    NO_CONFIDENCE = 0,
    LOW_CONFIDENCE,
    HIGH_CONFIDENCE,
    INVALID,
};

enum class RelayDisposition : uint8_t {
    UNCHANGED = 0,
    BASELINE,
    ACCEPT,
    SUPPRESS,
    NO_OUTPUT,
    ROUTE_MISMATCH,
    LOW_CONFIDENCE,
    REJECT,
};

struct RelayCommand {
    uint32_t seq = 0;
    CloudCommand pattern = CloudCommand::INVALID;
    char route[8] = {};
    RelayConfidence confidence = RelayConfidence::INVALID;
    uint32_t arrivalId = 0;
    int64_t serverTs = 0;
};

struct RelaySequenceState {
    bool initialized = false;
    uint32_t lastSeq = 0;
};

struct RelayDecision {
    RelayDisposition disposition = RelayDisposition::UNCHANGED;
    bool sequenceGap = false;
    uint32_t missedCount = 0;
};

struct ActivityControlState {
    UserActivity cloudActivity = UserActivity::UNKNOWN;
    uint32_t cloudUpdatedMs = 0;
    bool serviceOverride = false;
    UserActivity serviceActivity = UserActivity::MOVING;
};

enum class ActivityWireDisposition : uint8_t {
    NO_CHANGE = 0,
    BASELINE,
    APPLY,
    INVALIDATE,
};

struct ActivityWireState {
    bool observed = false;
    bool authorized = false;
    UserActivity activity = UserActivity::UNKNOWN;
    uint32_t seq = 0;
    int64_t serverTs = 0;
};

struct ActivityWireDecision {
    ActivityWireDisposition disposition = ActivityWireDisposition::NO_CHANGE;
    UserActivity activity = UserActivity::UNKNOWN;
};

inline CloudCommand parseCloudCommand(const char* value) {
    if (value == nullptr) return CloudCommand::INVALID;
    if (strcmp(value, "NONE") == 0) return CloudCommand::NONE;
    if (strcmp(value, "BUS") == 0) return CloudCommand::BUS;
    if (strcmp(value, "NUMBER") == 0) return CloudCommand::NUMBER;
    if (strcmp(value, "WAIT") == 0) return CloudCommand::WAIT;
    if (strcmp(value, "UNKNOWN") == 0) return CloudCommand::UNKNOWN;
    if (strcmp(value, "ERROR") == 0) return CloudCommand::ERROR;
    return CloudCommand::INVALID;
}

inline UserActivity parseUserActivity(const char* value) {
    if (value == nullptr) return UserActivity::UNKNOWN;
    if (strcmp(value, "MOVING") == 0) return UserActivity::MOVING;
    if (strcmp(value, "STILL") == 0) return UserActivity::STILL;
    return UserActivity::UNKNOWN;
}

inline RelayConfidence parseRelayConfidence(const char* value) {
    if (value == nullptr) return RelayConfidence::INVALID;
    if (strcmp(value, "") == 0) return RelayConfidence::NO_CONFIDENCE;
    if (strcmp(value, "low") == 0) return RelayConfidence::LOW_CONFIDENCE;
    if (strcmp(value, "high") == 0) return RelayConfidence::HIGH_CONFIDENCE;
    return RelayConfidence::INVALID;
}

template <size_t N>
inline void copyRelayRoute(char (&destination)[N], const char* source) {
    static_assert(N > 0, "Relay route buffer must include a terminator.");
    if (source == nullptr) {
        destination[0] = '\0';
        return;
    }
    size_t index = 0;
    while (index + 1 < N && source[index] != '\0') {
        destination[index] = source[index];
        ++index;
    }
    destination[index] = '\0';
}

inline bool isExpectedRoute(const char* route) {
    return route != nullptr && strcmp(route, "88") == 0;
}

inline bool acceptsRelayCommand(UserActivity activity, CloudCommand command) {
    if (command == CloudCommand::NONE || command == CloudCommand::ERROR) {
        return true;
    }
    if (activity != UserActivity::STILL) {
        return false;
    }
    return command == CloudCommand::BUS || command == CloudCommand::NUMBER ||
           command == CloudCommand::WAIT || command == CloudCommand::UNKNOWN;
}

inline bool allowsProximityOutput(UserActivity activity) {
    return activity == UserActivity::MOVING;
}

inline bool activityTransitionClearsProximity(UserActivity previous,
                                              UserActivity current) {
    return allowsProximityOutput(previous) && !allowsProximityOutput(current);
}

inline bool shouldRenderProximity(UserActivity activity,
                                  bool sensorActive,
                                  bool sensorOutputAllowed) {
    return allowsProximityOutput(activity) && sensorActive && sensorOutputAllowed;
}

inline void resetRelaySequence(RelaySequenceState& state) {
    state = RelaySequenceState{};
}

inline RelayDecision consumeRelayCommand(RelaySequenceState& state,
                                         const RelayCommand& command,
                                         UserActivity activity) {
    if (!state.initialized) {
        state.initialized = true;
        state.lastSeq = command.seq;
        return {RelayDisposition::BASELINE, false, 0};
    }
    if (command.seq <= state.lastSeq) {
        return {RelayDisposition::UNCHANGED, false, 0};
    }

    const uint32_t delta = command.seq - state.lastSeq;
    state.lastSeq = command.seq;
    RelayDecision decision{};
    decision.sequenceGap = delta > 1;
    decision.missedCount = decision.sequenceGap ? delta - 1 : 0;

    if (command.pattern == CloudCommand::INVALID) {
        decision.disposition = RelayDisposition::REJECT;
    } else if (command.pattern == CloudCommand::NONE) {
        decision.disposition = RelayDisposition::NO_OUTPUT;
    } else if (command.pattern == CloudCommand::NUMBER &&
               !isExpectedRoute(command.route)) {
        decision.disposition = RelayDisposition::ROUTE_MISMATCH;
    } else if (command.pattern == CloudCommand::NUMBER &&
               command.confidence != RelayConfidence::HIGH_CONFIDENCE) {
        decision.disposition = RelayDisposition::LOW_CONFIDENCE;
    } else if (acceptsRelayCommand(activity, command.pattern)) {
        decision.disposition = RelayDisposition::ACCEPT;
    } else {
        decision.disposition = RelayDisposition::SUPPRESS;
    }
    return decision;
}

inline ActivityWireDecision observeActivitySnapshot(
    ActivityWireState& state,
    bool fieldsComplete,
    UserActivity activity,
    uint32_t seq,
    int64_t serverTs) {
    const bool valid = fieldsComplete && activity != UserActivity::UNKNOWN &&
                       serverTs > 0;
    if (!valid) {
        const bool mustInvalidate = state.observed;
        state = ActivityWireState{};
        return {mustInvalidate ? ActivityWireDisposition::INVALIDATE
                               : ActivityWireDisposition::NO_CHANGE,
                UserActivity::UNKNOWN};
    }

    if (!state.observed) {
        state = {true, false, activity, seq, serverTs};
        return {ActivityWireDisposition::BASELINE, UserActivity::UNKNOWN};
    }

    const bool regressed = seq < state.seq || serverTs < state.serverTs;
    const bool changedWithoutSequence = seq == state.seq &&
                                        activity != state.activity;
    if (regressed || changedWithoutSequence) {
        state = ActivityWireState{};
        return {ActivityWireDisposition::INVALIDATE, UserActivity::UNKNOWN};
    }

    if (seq == state.seq && serverTs == state.serverTs) {
        return {ActivityWireDisposition::NO_CHANGE, UserActivity::UNKNOWN};
    }

    if (seq == state.seq) {
        state.serverTs = serverTs;
        return {state.authorized ? ActivityWireDisposition::APPLY
                                 : ActivityWireDisposition::NO_CHANGE,
                state.authorized ? activity : UserActivity::UNKNOWN};
    }

    state = {true, true, activity, seq, serverTs};
    return {ActivityWireDisposition::APPLY, activity};
}

inline void applyCloudActivity(ActivityControlState& state,
                               UserActivity activity,
                               uint32_t nowMs) {
    if (activity == UserActivity::UNKNOWN) return;
    state.cloudActivity = activity;
    state.cloudUpdatedMs = nowMs;
}

inline void invalidateCloudActivity(ActivityControlState& state) {
    state.cloudActivity = UserActivity::UNKNOWN;
    state.cloudUpdatedMs = 0;
}

inline void resetRelayControlAfterOutage(RelaySequenceState& sequence,
                                         ActivityControlState& activity) {
    resetRelaySequence(sequence);
    invalidateCloudActivity(activity);
}

inline void setServiceActivity(ActivityControlState& state,
                               UserActivity activity) {
    if (activity == UserActivity::UNKNOWN) return;
    state.serviceOverride = true;
    state.serviceActivity = activity;
}

inline void clearServiceActivity(ActivityControlState& state) {
    state.serviceOverride = false;
}

inline UserActivity effectiveActivity(
    const ActivityControlState& state,
    uint32_t nowMs,
    uint32_t leaseMs = CLOUD_ACTIVITY_LEASE_MS) {
    if (state.serviceOverride) {
        return state.serviceActivity;
    }
    if (state.cloudActivity != UserActivity::UNKNOWN &&
        static_cast<uint32_t>(nowMs - state.cloudUpdatedMs) <= leaseMs) {
        return state.cloudActivity;
    }
    return UserActivity::MOVING;
}

inline const char* cloudCommandName(CloudCommand command) {
    switch (command) {
        case CloudCommand::NONE: return "NONE";
        case CloudCommand::BUS: return "BUS";
        case CloudCommand::NUMBER: return "NUMBER";
        case CloudCommand::WAIT: return "WAIT";
        case CloudCommand::UNKNOWN: return "UNKNOWN";
        case CloudCommand::ERROR: return "ERROR";
        case CloudCommand::INVALID: return "INVALID";
    }
    return "INVALID";
}

inline const char* userActivityName(UserActivity activity) {
    switch (activity) {
        case UserActivity::MOVING: return "MOVING";
        case UserActivity::STILL: return "STILL";
        case UserActivity::UNKNOWN: return "UNKNOWN";
    }
    return "UNKNOWN";
}

inline const char* relayDispositionName(RelayDisposition disposition) {
    switch (disposition) {
        case RelayDisposition::UNCHANGED: return "unchanged";
        case RelayDisposition::BASELINE: return "baseline";
        case RelayDisposition::ACCEPT: return "accepted";
        case RelayDisposition::SUPPRESS: return "suppressed";
        case RelayDisposition::NO_OUTPUT: return "no_output";
        case RelayDisposition::ROUTE_MISMATCH: return "route_mismatch";
        case RelayDisposition::LOW_CONFIDENCE: return "low_confidence";
        case RelayDisposition::REJECT: return "rejected";
    }
    return "rejected";
}
