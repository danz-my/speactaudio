"use client";

import { Section, SelectField, ColorField, ToggleField } from "../ui/Field";
import { TEMPLATES, COLOR_PRESETS } from "../../lib/defaults";
import panelStyles from "./Panel.module.css";

export default function TemplatePanel({ state, setState }) {
  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  return (
    <Section stage="02" title="Template" meta="Gaya Visual" defaultOpen>
      <SelectField
        label="Gaya Visualizer"
        value={state.template}
        options={TEMPLATES}
        onChange={(v) => update({ template: v })}
      />

      <div className={panelStyles.row}>
        <span className={panelStyles.miniLabel}>Palet warna cepat</span>
        <div className={panelStyles.paletteRow}>
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
              className={panelStyles.paletteSwatch}
              style={{
                background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`
              }}
              onClick={() => update({ barColor1: p.c1, barColor2: p.c2 })}
            />
          ))}
        </div>
      </div>

      <div className={panelStyles.twoCol}>
        <ColorField
          label="Warna 1"
          value={state.barColor1}
          onChange={(v) => update({ barColor1: v })}
        />
        <ColorField
          label="Warna 2"
          value={state.barColor2}
          onChange={(v) => update({ barColor2: v })}
        />
      </div>

      {state.template === "bars" ? (
        <ToggleField
          label="Efek Cermin"
          checked={state.mirror}
          onChange={(v) => update({ mirror: v })}
        />
      ) : null}
    </Section>
  );
}
