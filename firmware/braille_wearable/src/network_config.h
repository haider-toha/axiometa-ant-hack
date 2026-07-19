#pragma once

#if __has_include("secrets.h")
#include "secrets.h"
inline constexpr bool RELAY_NETWORK_CONFIGURED = WIFI_SSID[0] != '\0';
#else
#define WIFI_SSID ""
#define WIFI_PASS ""
inline constexpr bool RELAY_NETWORK_CONFIGURED = false;
#endif

// The production relay is deployment configuration, not a secret. Keep it
// tracked so an existing ignored secrets.h cannot silently retain an old host.
#ifdef VERCEL_HOST
#undef VERCEL_HOST
#endif
#define VERCEL_HOST "tacta.space"
