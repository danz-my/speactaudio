"use client";

import { Section, TextField, ColorField, Segmented, ToggleField } from "../ui/Field";

const POSITIONS = [
  { id: "top", label: "Atas" },
  { id: "center", label: "Tengah" },
  { id: "bottom", label: "Bawah" }
];

export default function TextPanel({ state, setState }) {
  const text = state.text;
  const update = (patch) => setState((s) => ({ ...s, text: { ...s.text, ...patch } }));

  return (
    <Section stage="05" title="Teks" meta="Judul & Artis">
      <ToggleField label="Tampilkan Teks" checked={text.show} onChange={(v) => update({ show: v })}>
        <TextField
          label="Judul Lagu"
          value={text.title}
          onChange={(v) => update({ title: v })}
          placeholder="MIDNIGHT ECHO"
        />
        <TextField
          label="Nama Artis"
          value={text.artist}
          onChange={(v) => update({ artist: v })}
          placeholder="ZERUSOFT"
        />
        <ColorField label="Warna Teks" value={text.color} onChange={(v) => update({ color: v })} />
        <Segmented
          label="Posisi"
          value={text.position}
          options={POSITIONS}
          onChange={(v) => update({ position: v })}
        />
      </ToggleField>
    </Section>
  );
}
