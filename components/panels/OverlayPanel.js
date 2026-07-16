"use client";

import { Section, SelectField, SliderField } from "../ui/Field";
import { OVERLAYS } from "../../lib/defaults";

export default function OverlayPanel({ state, setState }) {
  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  return (
    <Section stage="06" title="Overlay" meta="Tekstur">
      <SelectField
        label="Overlay"
        value={state.overlay}
        options={OVERLAYS}
        onChange={(v) => update({ overlay: v })}
      />
      {state.overlay !== "none" ? (
        <SliderField
          label="Opasitas"
          value={state.overlayOpacity}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => update({ overlayOpacity: v })}
        />
      ) : null}
    </Section>
  );
}
