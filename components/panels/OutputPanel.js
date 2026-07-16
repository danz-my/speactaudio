"use client";

import { Section, Segmented, SelectField, ToggleField } from "../ui/Field";
import { ASPECTS } from "../../lib/defaults";
import panelStyles from "./Panel.module.css";

const FPS_OPTIONS = [
  { id: "24", label: "24 FPS" },
  { id: "30", label: "30 FPS" },
  { id: "60", label: "60 FPS" }
];

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s2 = Math.floor(sec % 60);
  return `${m}:${s2.toString().padStart(2, "0")}`;
}

export default function OutputPanel({
  state,
  setState,
  recording,
  recordElapsed,
  recordDuration,
  converting,
  convertProgress,
  lastRecording,
  onDownloadLast
}) {
  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const wm = state.watermark;
  const updateWatermark = (patch) => setState((s) => ({ ...s, watermark: { ...s.watermark, ...patch } }));

  return (
    <Section stage="07" title="Output" meta="Ukuran & Ekspor">
      <SelectField
        label="Rasio / Ukuran"
        value={state.aspect}
        options={ASPECTS}
        onChange={(v) => update({ aspect: v })}
      />
      <Segmented
        label="Frame Rate"
        value={String(state.fps)}
        options={FPS_OPTIONS}
        onChange={(v) => update({ fps: Number(v) })}
      />
      <p className={panelStyles.helperText}>Video diekspor sebagai file .mp4.</p>

      <ToggleField label="Tampilkan Watermark" checked={wm.on} onChange={(v) => updateWatermark({ on: v })} />
      <p className={panelStyles.helperText}>
        Watermark &quot;{wm.text}&quot; bisa dihapus kapan saja lewat tombol × di pojok
        pratinjau. Fitur ini gratis untuk sekarang — nanti akan jadi bagian dari paket premium.
      </p>

      {recording ? (
        <div className={panelStyles.row}>
          <span className={panelStyles.miniLabel}>Merekam video…</span>
          <div
            style={{
              height: 4,
              background: "var(--line-strong)",
              borderRadius: 4,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${recordDuration ? Math.min(100, (recordElapsed / recordDuration) * 100) : 0}%`,
                background: "var(--accent)"
              }}
            />
          </div>
          <span className={panelStyles.helperText}>
            {formatTime(recordElapsed)} / {formatTime(recordDuration)} — rekaman berjalan
            realtime mengikuti durasi lagu, tunggu sampai selesai.
          </span>
        </div>
      ) : null}

      {converting ? (
        <div className={panelStyles.row}>
          <span className={panelStyles.miniLabel}>Mengonversi ke MP4…</span>
          <div
            style={{
              height: 4,
              background: "var(--line-strong)",
              borderRadius: 4,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, convertProgress * 100)}%`,
                background: "var(--teal)"
              }}
            />
          </div>
          <span className={panelStyles.helperText}>
            Proses pertama kali agak lama karena mengunduh modul konversi. Jangan tutup halaman ini.
          </span>
        </div>
      ) : null}

      {!recording && !converting && lastRecording ? (
        <div className={panelStyles.imageActive}>
          <span className="material-symbols-outlined">movie</span>
          <span>Video terakhir siap diunduh</span>
          <button type="button" className={panelStyles.smallBtn} onClick={onDownloadLast}>
            Unduh
          </button>
        </div>
      ) : null}
    </Section>
  );
}
