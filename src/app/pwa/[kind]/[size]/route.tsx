import { ImageResponse } from "next/og";
import { BRAND, ICON_SIZES, SPLASH } from "@/lib/pwa";

export const dynamic = "force-static";

// Paper plane glyph (same as the favicon), white on brand blue. Icons are fully opaque: iOS paints transparency black.
const Plane = ({ px }: { px: number }) => (
  <svg width={px} height={px} viewBox="0 0 32 32">
    <path d="M5 18l22-9-7 16-4-6-5 4z" fill="#fff" />
  </svg>
);

export function generateStaticParams() {
  return [
    ...ICON_SIZES.map((s) => ({ kind: "icon", size: String(s) })),
    { kind: "icon", size: "512m" }, // maskable: art kept inside the 80% safe zone
    ...SPLASH.map(([w, h]) => ({ kind: "splash", size: `${w}x${h}` })),
  ];
}

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; size: string }> }) {
  const { kind, size } = await ctx.params;
  const headers = { "Cache-Control": "public, max-age=31536000, immutable" };

  if (kind === "icon") {
    const maskable = size.endsWith("m");
    const px = Number(size.replace("m", ""));
    if (!ICON_SIZES.includes(px)) return new Response("Not found", { status: 404 });
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND }}>
          <Plane px={Math.round(px * (maskable ? 0.5 : 0.62))} />
        </div>
      ),
      { width: px, height: px, headers },
    );
  }

  const hit = kind === "splash" && SPLASH.find(([w, h]) => `${w}x${h}` === size);
  if (!hit) return new Response("Not found", { status: 404 });
  const [w, h] = hit;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BRAND, color: "#fff" }}>
        <Plane px={Math.round(Math.min(w, h) * 0.22)} />
        <div style={{ marginTop: Math.round(w * 0.03), fontSize: Math.round(w * 0.06), fontWeight: 700 }}>Flight Finder</div>
      </div>
    ),
    { width: w, height: h, headers },
  );
}
