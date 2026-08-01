"use client";

import { useEffect } from "react";
import { AD_CLIENT } from "@/lib/ads";

// Déclaré globalement par le script AdSense charge dans le <head> (layout.tsx).
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdUnit({
  slot,
  format,
  layoutKey,
  layout,
  fullWidthResponsive,
  className,
}: {
  slot: string;
  format?: string;
  layoutKey?: string;
  layout?: "in-article";
  fullWidthResponsive?: boolean;
  className?: string;
}) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignoré : peut echouer en dev (bloqueur de pub, pas de reseau, etc.).
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block", ...(layout === "in-article" ? { textAlign: "center" } : {}) }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout-key={layoutKey}
      data-ad-layout={layout}
      data-full-width-responsive={fullWidthResponsive ? "true" : undefined}
    />
  );
}
