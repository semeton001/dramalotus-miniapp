"use client";

import { useEffect, useRef, useState } from "react";
import { loadGptScript } from "@/lib/gam/gpt";
import { PLAYER_GATE_PORTRAIT_SLOT } from "@/lib/gam/slots";

export default function GamGateSlot() {
  const initializedRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  useEffect(() => {
    let isMounted = true;

    const initGamSlot = async () => {
      try {
        setStatus("loading");

        await loadGptScript();

        if (!isMounted || typeof window === "undefined") return;

        window.googletag = window.googletag || { cmd: [] };

        window.googletag.cmd.push(() => {
          if (initializedRef.current) return;

          const googletag = window.googletag;

          if (
            !googletag?.defineSlot ||
            !googletag.pubads ||
            !googletag.enableServices ||
            !googletag.display
          ) {
            if (isMounted) {
              setStatus("error");
            }
            return;
          }

          const pubads = googletag.pubads();

          const slot = googletag.defineSlot(
            PLAYER_GATE_PORTRAIT_SLOT.adUnitPath,
            PLAYER_GATE_PORTRAIT_SLOT.sizes,
            PLAYER_GATE_PORTRAIT_SLOT.divId,
          );

          if (!slot) {
            if (isMounted) {
              setStatus("error");
            }
            return;
          }

          slot.addService(pubads);

          pubads.addEventListener("slotRenderEnded", (event) => {
            if (
              event.slot.getSlotElementId() !== PLAYER_GATE_PORTRAIT_SLOT.divId
            ) {
              return;
            }

            if (!isMounted) return;

            if (event.isEmpty) {
              console.log("GAM slot empty");
              setStatus("error");
              return;
            }

            console.log("GAM slot filled");
            setStatus("ready");
          });

          pubads.enableSingleRequest();
          pubads.collapseEmptyDivs();
          googletag.enableServices();
          googletag.display(PLAYER_GATE_PORTRAIT_SLOT.divId);

          initializedRef.current = true;
        });
      } catch (error) {
        console.error("Gagal inisialisasi GAM slot:", error);
        if (isMounted) {
          setStatus("error");
        }
      }
    };

    initGamSlot();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="text-sm text-neutral-400">GAM status: {status}</div>
      <div
        id={PLAYER_GATE_PORTRAIT_SLOT.divId}
        style={{ width: 300, height: 250 }}
        className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
      />
    </div>
  );
}
