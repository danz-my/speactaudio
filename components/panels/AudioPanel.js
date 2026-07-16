"use client";

import { useRef } from "react";
import { Section, SliderField } from "../ui/Field";
import panelStyles from "./Panel.module.css";

export default function AudioPanel({
  state,
  setState,
  hasAudio,
  fileName,
  duration,
  onAudioFile,
  onClearAudio
}) {
  const fileRef = useRef(null);
  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const durText = Number.isFinite(duration)
    ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, "0")}`
    : "--:--";

  return (
    <Section stage="01" title="Audio" meta="Sumber Suara" defaultOpen>
      <div className={panelStyles.dropzone}>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAudioFile(file);
            e.target.value = "";
          }}
        />
        {!hasAudio ? (
          <button
            type="button"
            className={panelStyles.dropzoneBtn}
            onClick={() => fileRef.current?.click()}
          >
            <span className="material-symbols-outlined">library_music</span>
            <span>Unggah file audio</span>
            <span className={panelStyles.dropzoneHint}>MP3, WAV, OGG, M4A</span>
          </button>
        ) : (
          <div className={panelStyles.imageActive}>
            <span className="material-symbols-outlined">graphic_eq</span>
            <span>
              {fileName} · {durText}
            </span>
            <button
              type="button"
              className={panelStyles.smallBtn}
              onClick={() => fileRef.current?.click()}
            >
              Ganti
            </button>
            <button type="button" className={panelStyles.smallBtnGhost} onClick={onClearAudio}>
              Hapus
            </button>
          </div>
        )}
      </div>

      <SliderField
        label="Sensitivitas"
        value={state.sensitivity}
        min={40}
        max={220}
        unit="%"
        onChange={(v) => update({ sensitivity: v })}
      />
      <SliderField
        label="Kehalusan Gerakan"
        value={state.smoothing}
        min={0}
        max={95}
        unit="%"
        onChange={(v) => update({ smoothing: v })}
      />
      <SliderField
        label="Jumlah Bar"
        value={state.barCount}
        min={16}
        max={128}
        step={4}
        onChange={(v) => update({ barCount: v })}
      />
      <p className={panelStyles.helperText}>
        Sensitivitas mengatur seberapa besar reaksi visual terhadap volume. Kehalusan
        meredam gerakan supaya tidak terlalu &quot;gugup&quot; mengikuti setiap ketukan kecil.
      </p>
    </Section>
  );
}
