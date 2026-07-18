#pragma once

#include <stdint.h>

struct TofBenchStats {
    uint16_t expectedMm = 0;
    uint32_t sampleCount = 0;
    uint32_t validCount = 0;
    uint32_t signalFailCount = 0;
    uint32_t outOfRangeCount = 0;
    uint32_t otherInvalidCount = 0;
    uint16_t minMm = 0;
    uint16_t maxMm = 0;
    uint64_t distanceSumMm = 0;
    uint64_t absoluteErrorSumMm = 0;
};

struct TofBenchSession {
    bool active = false;
    uint32_t startedMs = 0;
    TofBenchStats stats;
};

inline constexpr TofBenchStats makeTofBenchStats(uint16_t expectedMm) {
    TofBenchStats stats;
    stats.expectedMm = expectedMm;
    return stats;
}

inline void addTofBenchSample(TofBenchStats& stats,
                              uint16_t distanceMm,
                              uint8_t status) {
    ++stats.sampleCount;
    const bool valid = status == 0 && distanceMm > 0;
    if (!valid) {
        if (status == 2) {
            ++stats.signalFailCount;
        } else if (status == 4) {
            ++stats.outOfRangeCount;
        } else {
            ++stats.otherInvalidCount;
        }
        return;
    }

    if (stats.validCount == 0 || distanceMm < stats.minMm) {
        stats.minMm = distanceMm;
    }
    if (stats.validCount == 0 || distanceMm > stats.maxMm) {
        stats.maxMm = distanceMm;
    }
    ++stats.validCount;
    stats.distanceSumMm += distanceMm;
    stats.absoluteErrorSumMm += distanceMm >= stats.expectedMm
                                    ? distanceMm - stats.expectedMm
                                    : stats.expectedMm - distanceMm;
}

inline uint16_t tofBenchMeanMm(const TofBenchStats& stats) {
    return stats.validCount == 0
               ? 0
               : static_cast<uint16_t>(stats.distanceSumMm / stats.validCount);
}

inline uint16_t tofBenchMeanAbsoluteErrorMm(const TofBenchStats& stats) {
    return stats.validCount == 0
               ? 0
               : static_cast<uint16_t>(stats.absoluteErrorSumMm / stats.validCount);
}

inline uint8_t tofBenchValidPercent(const TofBenchStats& stats) {
    return stats.sampleCount == 0
               ? 0
               : static_cast<uint8_t>((stats.validCount * 100U) / stats.sampleCount);
}

inline bool startTofBenchSession(TofBenchSession& session,
                                 uint16_t expectedMm,
                                 uint32_t nowMs) {
    if (session.active) {
        return false;
    }
    session.active = true;
    session.startedMs = nowMs;
    session.stats = makeTofBenchStats(expectedMm);
    return true;
}

inline void abortTofBenchSession(TofBenchSession& session) {
    session.active = false;
}

inline bool tofBenchSessionElapsed(const TofBenchSession& session,
                                   uint32_t nowMs,
                                   uint32_t durationMs) {
    return session.active &&
           static_cast<uint32_t>(nowMs - session.startedMs) >= durationMs;
}
