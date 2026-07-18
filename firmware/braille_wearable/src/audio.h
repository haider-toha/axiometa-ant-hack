#pragma once

#include <stdint.h>

#include "audio_pure.h"
#include "siren_pure.h"

struct AudioTelemetry {
    uint32_t fullFrames = 0;
    uint32_t partialReads = 0;
    uint32_t readErrors = 0;
    uint32_t droppedDecisions = 0;
    AudioFrameStats frame{};
    SirenFeatures features{};
    AudioFrameHealth health = AudioFrameHealth::EMPTY;
    SirenDecision decision = SirenDecision::NONE;
};

bool audioBegin();
bool audioPollDecision(SirenDecision& decision);
bool audioPollCurrentDecision(SirenDecision& decision);
bool audioPollTelemetry(AudioTelemetry& telemetry);
const char* sirenDecisionName(SirenDecision decision);
