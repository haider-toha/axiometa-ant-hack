#include <unity.h>

#include "haptic_pure.h"
#include "tof_proximity_pure.h"

namespace {

void test_active_proximity_drives_both_channels(void) {
    const HapticDrive active = proximityDrive(true);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, active.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, active.p3Hz);

    const HapticDrive inactive = proximityDrive(false);
    TEST_ASSERT_EQUAL_UINT16(0, inactive.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, inactive.p3Hz);
}

void test_proximity_distance_cadence_remains_unchanged(void) {
    TEST_ASSERT_EQUAL_UINT16(120, proximityPulseGapMs(300));
    TEST_ASSERT_TRUE(proximityPulseGapMs(600) > proximityPulseGapMs(300));
    TEST_ASSERT_TRUE(proximityPulseGapMs(900) > proximityPulseGapMs(600));
    TEST_ASSERT_EQUAL_UINT16(900, proximityPulseGapMs(1200));
}

}  // namespace

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_active_proximity_drives_both_channels);
    RUN_TEST(test_proximity_distance_cadence_remains_unchanged);
    return UNITY_END();
}
