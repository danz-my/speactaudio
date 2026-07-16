const STATE_KEY = "audiospeact:project:v1";

function hasStorage() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

export function saveSettings(state) {
  if (!hasStorage()) return;
  try {
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Audio's Speact: gagal menyimpan pengaturan", err);
  }
}

export function loadSettings() {
  if (!hasStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function clearSettings() {
  if (!hasStorage()) return;
  try {
    window.sessionStorage.removeItem(STATE_KEY);
  } catch (err) {
    /* ignore */
  }
}

export function mergeWithDefaults(defaults, saved) {
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    bg: { ...defaults.bg, ...(saved.bg || {}) },
    sway: { ...defaults.sway, ...(saved.sway || {}) },
    centerImage: { ...defaults.centerImage, ...(saved.centerImage || {}) },
    text: { ...defaults.text, ...(saved.text || {}) },
    watermark: { ...defaults.watermark, ...(saved.watermark || {}) }
  };
}
