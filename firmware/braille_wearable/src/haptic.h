#pragma once

#include <stdint.h>

#include "haptic_pure.h"

bool hapticBegin();
void hapticWrite(uint16_t p1Hz, uint16_t p3Hz);
void hapticStop();
void hapticSetOutputMode(OutputMode mode);
OutputMode hapticOutputMode();
HapticDrive hapticHardwareDrive();
