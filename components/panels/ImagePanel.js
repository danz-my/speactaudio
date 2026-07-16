"use client";

import { useRef } from "react";
import { Section, Segmented, SliderField, ColorField, ToggleField } from "../ui/Field";
import panelStyles from "./Panel.module.css";

const SHAPES = [
  { id: "circle", label: "Lingkaran", icon: "circle" },
  { id: "square", label: "Kotak", icon: "square" }
];

export default function ImagePanel({ state, setState, centerImageEl, onCenterImageFile, onClearCenterImage }) {
  const fileRef = useRef(null);
  const ci = state.centerImage;
  const update = (patch) => setState((s) => ({ ...s, centerImage: { ...s.centerImage, ...patch } }));

  return (
    <Section stage="04" title="Gambar Tengah" meta="Logo / Cover">
      <ToggleField label="Tampilkan Gambar Tengah" checked={ci.on} onChange={(v) => update({ on: v })}>
        <div className={panelStyles.dropzone}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onCenterImageFile(file);
              e.target.value = "";
            }}
          />
          {!centerImageEl ? (
            <button
              type="button"
              className={panelStyles.dropzoneBtn}
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined">add_photo_alternate</span>
              <span>Unggah logo / cover</span>
              <span className={panelStyles.dropzoneHint}>JPG, PNG, WEBP</span>
            </button>
          ) : (
            <div className={panelStyles.imageActive}>
              <span className="material-symbols-outlined">image</span>
              <span>Gambar tengah terpasang</span>
              <button
                type="button"
                className={panelStyles.smallBtn}
                onClick={() => fileRef.current?.click()}
              >
                Ganti
              </button>
              <button type="button" className={panelStyles.smallBtnGhost} onClick={onClearCenterImage}>
                Hapus
              </button>
            </div>
          )}
        </div>

        <Segmented label="Bentuk" value={ci.shape} options={SHAPES} onChange={(v) => update({ shape: v })} />
        <SliderField
          label="Ukuran"
          value={ci.size}
          min={10}
          max={55}
          unit="%"
          onChange={(v) => update({ size: v })}
        />

        <ToggleField label="Cincin Tepi" checked={ci.ring} onChange={(v) => update({ ring: v })}>
          <ColorField label="Warna Cincin" value={ci.ringColor} onChange={(v) => update({ ringColor: v })} />
        </ToggleField>

        <ToggleField label="Ikut Berdenyut" checked={ci.pulseOn} onChange={(v) => update({ pulseOn: v })}>
          <SliderField
            label="Kekuatan Denyut"
            value={ci.pulseAmount}
            min={0}
            max={40}
            unit="%"
            onChange={(v) => update({ pulseAmount: v })}
          />
        </ToggleField>
      </ToggleField>
    </Section>
  );
}
