import type { Metadata } from "next";

import { OutputMonitor } from "./output-monitor";

export const metadata: Metadata = {
  title: "Tacta",
  description: "Live LEFT/P1 and RIGHT/P3 output state from the TACTA ESP32 device.",
};

export default function OutputPage() {
  return <OutputMonitor />;
}
