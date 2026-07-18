// Upstash Redis relay — the shared state between the phone (web app) and the
// ESP32 wearable. See audit/…/25-phase1b-api-grounding.md §4 for the verified
// @upstash/redis API (auto-(de)serialization, incr/mset/mget/getdel).
import { Redis } from "@upstash/redis";
import type { PullResponse, Choice, Mode } from "./contract";

// Reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN from the environment.
export const redis = Redis.fromEnv();

// Rolling memory of the user's recent chosen replies, used to bias future
// suggestions. Capped so it never grows unbounded.
const MEMORY_KEY = "memory";
const MEMORY_MAX = 10;

/**
 * Forward path (someone speaks → keyword buzzed on the wearable).
 * MSET the payload FIRST, then INCR the sequence. The seq advance is the signal
 * the ESP32 polls on, so msg/verbatim/mode must already be written before seq
 * bumps — otherwise a poll landing between the two writes would see the new seq
 * with a stale msg, and the real keyword (written under that same seq) would
 * never re-trigger. Mirrors setSuggestions; verified by the Phase 3B review.
 */
export async function pushForward(
  keyword: string,
  verbatim: string,
): Promise<number> {
  await redis.mset({ msg: keyword, verbatim, mode: "forward" }); // payload first
  const seq = await redis.incr("seq"); // signal last — new value after increment
  return seq;
}

/** Snapshot the relay for the ESP32 poll (`/api/pull`). */
export async function pullState(): Promise<PullResponse> {
  const [seq, mode, msg, replies] = await redis.mget<
    [number, Mode, string, string[]]
  >("seq", "mode", "msg", "replies"); // auto-deserialized; missing keys → null
  return {
    seq: seq ?? 0,
    mode: mode ?? "idle",
    msg: msg ?? "",
    replies: replies ?? [],
  };
}

/**
 * Reply path, step 1 — publish the 3 candidate replies for the ESP32 to scroll.
 * MSET the payload first so a poller never sees the new seq with stale replies,
 * THEN bump seq to signal "reply mode ready".
 */
export async function setSuggestions(replies: string[]): Promise<number> {
  await redis.mset({ replies, mode: "reply" });
  const seq = await redis.incr("seq");
  return seq;
}

/** Read the rolling memory of recent chosen replies (most-recent last). */
export async function getMemory(): Promise<string[]> {
  const mem = await redis.get<string[]>(MEMORY_KEY);
  return mem ?? [];
}

/**
 * Reply path, step 2 — the ESP32 picked a suggestion. Store it as the pending
 * choice for the phone to collect, and fold the chosen text into memory.
 */
export async function setChoice(choice: Choice): Promise<void> {
  await redis.set("choice", choice); // pending choice (auto-serialized)
  const mem = await getMemory();
  mem.push(choice.text);
  await redis.set(MEMORY_KEY, mem.slice(-MEMORY_MAX)); // keep only the last N
}

/**
 * Reply path, step 3 — the phone collects the choice exactly once.
 * GETDEL is atomic: it returns the value and clears the key in one round trip,
 * so a subsequent poll returns null until the next choice is made.
 */
export async function takeChoice(): Promise<Choice | null> {
  const choice = await redis.getdel<Choice>("choice");
  return choice ?? null;
}
