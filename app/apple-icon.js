import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1b1a17",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <svg width="112" height="84" viewBox="0 0 40 30">
          <rect x="1" y="14" width="4" height="15" fill="#efe9dc" />
          <rect x="9" y="6" width="4" height="23" fill="#c1272d" />
          <rect x="17" y="0" width="4" height="29" fill="#efe9dc" />
          <rect x="25" y="9" width="4" height="20" fill="#c1272d" />
          <rect x="33" y="17" width="4" height="12" fill="#efe9dc" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
