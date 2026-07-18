#pragma once

#include <stdint.h>

bool hapticBegin();
void hapticWrite(uint16_t p1Hz, uint16_t p3Hz);
void hapticStop();
