#pragma once

#if __has_include("secrets.h")
#include "secrets.h"
inline constexpr bool RELAY_NETWORK_CONFIGURED = WIFI_SSID[0] != '\0';
#else
#define WIFI_SSID ""
#define WIFI_PASS ""
#define VERCEL_HOST "bus-stop-awareness.vercel.app"
inline constexpr bool RELAY_NETWORK_CONFIGURED = false;
#endif
