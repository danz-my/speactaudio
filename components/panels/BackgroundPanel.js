"use client";

import { useRef } from "react";
import { Section, Segmented, ColorField, SliderField } from "../ui/Field";
import panelStyles from "./Panel.module.css";

const MODES = [
  { id: "solid", label: "Polos" },
  { id: "gradient", label: "Gradien" },
  { id: "image", label: "Gambar" }
];

export default function BackgroundPanel({ state, setState, bgImageEl, onBgImageFile, onClearBgImage }) {
  const fileRef = useRef(null);
  const bg = state.bg;
  const update = (patch) => setState((s) => ({ ...s, bg: { ...s.bg, ...patch } }));

  return (
    <Section stage="03" title="Latar" meta="Background">
      <Segmented label="Mode Latar" value={bg.mode} options={MODES} onChange={(v) => update({ mode: v })} />

      {bg.mode === "image" ? (
        <div className={panelStyles.dropzone}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onBgImageFile(file);
              e.target.value = "";
            }}
          />
          {!bgImageEl ? (
            <button
              type="button"
              className={panelStyles.dropzoneBtn}
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined">image</span>
              <span>Unggah gambar latar</span>
              <span className={panelStyles.dropzoneHint}>JPG, PNG, WEBP</span>
            </button>
          ) : (
            <div className={panelStyles.imageActive}>
              <span className="material-symbols-outlined">image</span>
              <span>Gambar latar terpasang</span>
              <button
                type="button"
                className={panelStyles.smallBtn}
                onClick={() => fileRef.current?.click()}
              >
                Ganti
              </button>
              <button type="button" className={panelStyles.smallBtnGhost} onClick={onClearBgImage}>
                Hapus
              </button>
            </div>
          )}
          {bgImageEl ? (
            <div style={{ padding: "0 12px 12px" }}>
              <SliderField
                label="Blur"
                value={bg.imageBlur}
                min={0}
                max={30}
                unit="px"
                onChange={(v) => update({ imageBlur: v })}
              />
              <SliderField
                label="Redupkan"
                value={bg.imageDim}
                min={0}
                max={90}
                unit="%"
                onChange={(v) => update({ imageDim: v })}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className={panelStyles.twoCol}>
          <ColorField label="Warna 1" value={bg.color1} onChange={(v) => update({ color1: v })} />
          {bg.mode === "gradient" ? (
            <ColorField label="Warna 2" value={bg.color2} onChange={(v) => update({ color2: v })} />
          ) : null}
        </div>
      )}
    </Section>
  );
}
