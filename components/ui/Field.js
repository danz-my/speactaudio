"use client";

import { useState } from "react";
import s from "./Field.module.css";

export function Section({ stage, title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={s.section}>
      <button
        type="button"
        className={s.sectionHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={s.stageTag}>{stage}</span>
        <span className={s.sectionTitle}>{title}</span>
        {meta ? <span className={s.sectionMeta}>{meta}</span> : null}
        <span
          className={`material-symbols-outlined ${s.chevron} ${open ? s.chevronOpen : ""}`}
        >
          expand_more
        </span>
      </button>
      {open ? <div className={s.sectionBody}>{children}</div> : null}
    </div>
  );
}

export function Row({ children }) {
  return <div className={s.row}>{children}</div>;
}

export function SliderField({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <div className={s.row}>
      <div className={s.rowHead}>
        <span className={s.label}>{label}</span>
        <span className={s.value}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className={s.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function SelectField({ label, value, options, onChange }) {
  return (
    <div className={s.row}>
      {label ? (
        <div className={s.rowHead}>
          <span className={s.label}>{label}</span>
        </div>
      ) : null}
      <select
        className={s.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({ label, value, placeholder, onChange, mono = false }) {
  return (
    <div className={s.row}>
      {label ? (
        <div className={s.rowHead}>
          <span className={s.label}>{label}</span>
        </div>
      ) : null}
      <input
        className={s.text}
        style={mono ? { fontFamily: "var(--font-mono)" } : undefined}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ColorField({ label, value, onChange }) {
  return (
    <div className={s.row}>
      {label ? (
        <div className={s.rowHead}>
          <span className={s.label}>{label}</span>
          <span className={s.value}>{value.toUpperCase()}</span>
        </div>
      ) : null}
      <div className={s.colorRow}>
        <input
          type="color"
          className={s.swatch}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          className={s.text}
          style={{ fontFamily: "var(--font-mono)" }}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function ToggleField({ label, checked, onChange, children }) {
  return (
    <div className={s.row}>
      <div className={s.toggleRow}>
        <span className={s.label}>{label}</span>
        <label className={s.switch}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className={s.switchTrack} />
        </label>
      </div>
      {checked && children ? children : null}
    </div>
  );
}

export function Segmented({ label, value, options, onChange }) {
  return (
    <div className={s.row}>
      {label ? (
        <div className={s.rowHead}>
          <span className={s.label}>{label}</span>
        </div>
      ) : null}
      <div className={s.segmented}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`${s.segmentedBtn} ${value === opt.id ? s.segmentedBtnActive : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.icon ? (
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                {opt.icon}
              </span>
            ) : null}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SwatchGrid({ label, value, options, onChange }) {
  return (
    <div className={s.row}>
      {label ? (
        <div className={s.rowHead}>
          <span className={s.label}>{label}</span>
        </div>
      ) : null}
      <div className={s.swatchGrid}>
        {options.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            className={`${s.swatchGridItem} ${value === hex ? s.swatchGridItemActive : ""}`}
            style={{ background: hex }}
            onClick={() => onChange(hex)}
          />
        ))}
      </div>
    </div>
  );
}
