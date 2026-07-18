#pragma once

#include <stdint.h>

#include "tof_proximity_pure.h"

struct TofUpdate {
    bool updated = false;
    bool timedOut = false;
    uint16_t distanceMm = 0;
    uint8_t status = 0;
    ProximityUpdate proximity{};
};

bool tofBegin();
TofUpdate tofService(uint32_t nowMs);
