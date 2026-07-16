export const TEMPLATES = [
  { id: "radial", label: "Radial Bar (Lingkaran)" },
  { id: "bars", label: "Spectrum Bar" },
  { id: "wave", label: "Gelombang" },
  { id: "particles", label: "Partikel Ketukan" },
  { id: "pulse", label: "Pulse Minimal" }
];

export const ASPECTS = [
  { id: "square", label: "1:1 Square (Post)", w: 1080, h: 1080 },
  { id: "portrait", label: "9:16 Reels / Shorts", w: 1080, h: 1920 },
  { id: "landscape", label: "16:9 YouTube", w: 1920, h: 1080 }
];

export const OVERLAYS = [
  { id: "none", label: "Tanpa Overlay" },
  { id: "noise", label: "Noise / Grain" },
  { id: "scanlines", label: "Scanlines" },
  { id: "vignette", label: "Vignette" },
  { id: "grid", label: "Grid Halus" },
  { id: "glow", label: "Glow Tepi" }
];

export const COLOR_PRESETS = [
  { id: "violet-teal", label: "Violet / Teal", c1: "#7C5CFC", c2: "#28D9C5" },
  { id: "sunset", label: "Sunset", c1: "#F4C95D", c2: "#C1272D" },
  { id: "mono", label: "Monokrom", c1: "#EFE9DC", c2: "#8A8474" },
  { id: "acid", label: "Acid Green", c1: "#B8F23C", c2: "#0E1A2B" },
  { id: "royal", label: "Royal", c1: "#5B8CFF", c2: "#F4C95D" },
  { id: "rose", label: "Rose", c1: "#FF6B9D", c2: "#C1272D" }
];

export function defaultState() {
  return {
    template: "radial",
    aspect: "square",
    fps: 30,

    bg: {
      mode: "gradient",
      color1: "#0B0B10",
      color2: "#171227",
      imageDim: 55,
      imageBlur: 6
    },

    barColor1: "#7C5CFC",
    barColor2: "#28D9C5",
    barCount: 64,
    sensitivity: 130,
    smoothing: 65,
    mirror: true,

    centerImage: {
      on: true,
      shape: "circle",
      size: 32,
      ring: true,
      ringColor: "#EFE9DC",
      pulseOn: true,
      pulseAmount: 14
    },

    text: {
      show: true,
      title: "MIDNIGHT ECHO",
      artist: "ZERUSOFT",
      color: "#EFE9DC",
      position: "bottom",
      fontFamily: "Space Grotesk"
    },

    overlay: "noise",
    overlayOpacity: 18,

    watermark: {
      on: true,
      text: "AUDIO'S SPEACT"
    }
  };
}
