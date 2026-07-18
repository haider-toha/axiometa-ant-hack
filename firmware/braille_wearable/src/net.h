#pragma once
#include <Arduino.h>
#include <vector>

// ==========================================================================
//  net.h — WiFi join + TLS poll of the Vercel relay.
//  PullResult mirrors the web contract's PullResponse
//  ({ seq, mode, msg, replies }) from app/lib/contract.ts.
// ==========================================================================
struct PullResult {
    long seq = 0;
    String mode = "idle";                // "idle" | "forward" | "reply"
    String msg = "";                     // the condensed keyword to buzz
    std::vector<String> replies;         // Rung-4 reply suggestions (mode=="reply")
};

// Join the hotspot (STA). Blocks up to ~20 s. Returns true on WL_CONNECTED.
bool wifiJoin();

// Current station IP as a dotted string ("0.0.0.0" if not connected).
String deviceIp();

// GET https://VERCEL_HOST/api/pull. Returns true only when seq advances past
// the last handled seq (seq-gated against an internal static), filling `out`.
bool pollPull(PullResult& out);

// POST https://VERCEL_HOST/api/reply  {index, text}. Returns true on HTTP 200.
bool postReply(int index, const char* text);
