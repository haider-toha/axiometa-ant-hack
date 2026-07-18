#pragma once

// ==========================================================================
//  encoder.h — Port-4 quadrature encoder (scroll) + push button (select).
//  Rung-4 (reply loop) input. Included even though Rung 4 is a stretch.
// ==========================================================================

// Configure encoder pins + attach the tick ISR, and the button pin. setup().
void encoderInit();

// Detents moved since the last call: +N clockwise, -N counter-clockwise, 0 none.
int encoderDelta();

// True exactly once per physical press (debounced falling edge on ENC_BT).
bool encoderPressed();
