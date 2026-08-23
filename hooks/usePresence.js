"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const getVisitorId = () => {
  if (typeof window === "undefined") return "server";
  const key = "promptvault_visitor_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto?.randomUUID?.() || `pv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
};

export function usePresence() {
  const [online, setOnline] = useState(0);
  const visitorId = useMemo(() => (typeof window !== "undefined" ? getVisitorId() : "server"), []);

  useEffect(() => {
    if (!visitorId || visitorId === "server") return;

    const channel = supabase.channel("promptvault-online", {
      config: { presence: { key: visitorId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString(), page: window.location.pathname });
        }
      });

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      setOnline(0);
    };
  }, [visitorId]);

  return { online, visitorId };
}
