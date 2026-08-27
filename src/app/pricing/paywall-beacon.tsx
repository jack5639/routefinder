"use client";

import { useEffect } from "react";

export function PaywallBeacon({ campaign }: { campaign?: string }) {
  useEffect(() => {
    void fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "paywall_viewed", properties: campaign ? { campaign } : {} }),
      keepalive: true,
    });
  }, [campaign]);
  return null;
}
