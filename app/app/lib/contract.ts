// Shared HTTP + relay contract — the single source of truth for the web app and
// the ESP32 firmware (whose PullResult mirrors PullResponse field-for-field).
export type Mode = "idle" | "forward" | "reply";

export interface PullResponse {
  seq: number;
  mode: Mode;
  msg: string;
  replies: string[];
}

export interface Choice {
  index: number;
  text: string;
}

// Hard cap on the buzzed keyword length, enforced on both sides of the relay.
export const KEYWORD_MAX = 15;
