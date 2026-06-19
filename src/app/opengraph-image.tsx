import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} - ${site.tagline}`;

// Image affichée quand on partage le site (réseaux, messageries).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>
          BonVoleur
          <span style={{ color: "#fde68a" }}>.com</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, opacity: 0.95 }}>
          {site.tagline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 30,
            background: "#ea580c",
            color: "white",
            padding: "14px 28px",
            borderRadius: 12,
            alignSelf: "flex-start",
            fontWeight: 700,
          }}
        >
          On déniche, tu réserves.
        </div>
      </div>
    ),
    { ...size }
  );
}
