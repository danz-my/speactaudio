"use client";

import s from "./TopBar.module.css";

export default function TopBar({
  w,
  h,
  recording,
  converting,
  recordDisabled,
  onRecord,
  onReset,
  onToggleMenu
}) {
  return (
    <header className={s.bar}>
      <button className={s.menuBtn} onClick={onToggleMenu} type="button" aria-label="Buka panel kontrol">
        <span className="material-symbols-outlined">tune</span>
      </button>
      <div className={s.brand}>
        <span className={s.mark}>
          <svg width="15" height="11" viewBox="0 0 40 30">
            <rect x="1" y="14" width="4" height="15" fill="#efe9dc" />
            <rect x="9" y="6" width="4" height="23" fill="#c1272d" />
            <rect x="17" y="0" width="4" height="29" fill="#efe9dc" />
            <rect x="25" y="9" width="4" height="20" fill="#c1272d" />
            <rect x="33" y="17" width="4" height="12" fill="#efe9dc" />
          </svg>
        </span>
        <div>
          <div className={s.title}>AUDIO&apos;S SPEACT</div>
          <div className={s.subtitle}>AUDIO SPECTRUM VIDEO GENERATOR</div>
        </div>
      </div>
      <div className={s.spacer} />
      <span className={s.sizeTag}>{w}×{h}</span>
      {recording || converting ? (
        <span className={s.recPill}>
          <span className={s.recDot} />
          {recording ? "Merekam" : "Konversi MP4"}
        </span>
      ) : null}
      <button className={s.resetBtn} type="button" onClick={onReset}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          restart_alt
        </span>
        Reset
      </button>
      <button
        className={s.downloadBtn}
        type="button"
        onClick={onRecord}
        disabled={recordDisabled || converting}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {recording ? "stop_circle" : "videocam"}
        </span>
        {recording ? "Stop" : "Rekam Video"}
      </button>
    </header>
  );
}
