// All drawing is plain 2D canvas so a frame can be captured 1:1 by
// canvas.captureStream() during recording — nothing here depends on DOM
// layout, only on the numbers coming from the analyser each frame.
//
// Performance note: this file is on the hot path (called every animation
// frame, live, while also being captured by MediaRecorder). Per-frame
// allocation and expensive canvas ops (shadowBlur, string color math,
// re-creating gradients/patterns) are the #1 cause of choppy recordings, so
// the color/gradient/pattern helpers below are cached and reused instead of
// rebuilt every frame.

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bch = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bch})`;
}

// A palette of `count` colors between two hex values is expensive to build
// (string parsing per stop) so it's cached by (color1, color2, count) and
// only rebuilt when one of those actually changes.
const paletteCache = new Map();
function getPalette(c1, c2, count) {
  const key = `${c1}|${c2}|${count}`;
  let arr = paletteCache.get(key);
  if (!arr) {
    arr = new Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = mixHex(c1, c2, count > 1 ? i / (count - 1) : 0);
    }
    if (paletteCache.size > 60) paletteCache.clear();
    paletteCache.set(key, arr);
  }
  return arr;
}

// CanvasPattern objects are reusable across frames as long as the source
// tile doesn't change, so build it once instead of on every draw call.
const patternCache = new WeakMap();
function getNoisePattern(ctx, noiseTile) {
  if (!noiseTile) return null;
  let pattern = patternCache.get(ctx);
  if (!pattern || pattern.__tile !== noiseTile) {
    pattern = ctx.createPattern(noiseTile, "repeat");
    if (pattern) pattern.__tile = noiseTile;
    patternCache.set(ctx, pattern);
  }
  return pattern;
}

// Down-samples the raw FFT bins into `count` bands using a logarithmic
// spread, which is what makes a spectrum look musically balanced (bass gets
// its own wide bars instead of being squeezed into the first couple of
// linear bins).
export function sampleBands(freqData, count) {
  const bins = freqData.length;
  const out = new Array(count);
  const logMax = Math.log2(bins);
  let prevIndex = 0;
  for (let i = 0; i < count; i++) {
    const p = (i + 1) / count;
    const idx = Math.min(bins - 1, Math.round(Math.pow(2, p * logMax)));
    let sum = 0;
    let n = 0;
    for (let j = prevIndex; j <= idx; j++) {
      sum += freqData[j];
      n++;
    }
    out[i] = n > 0 ? sum / n / 255 : 0;
    prevIndex = idx + 1;
  }
  return out;
}

export function drawBackground(ctx, W, H, bg, bgImageEl) {
  if (bg.mode === "image" && bgImageEl) {
    const canvasRatio = W / H;
    const imgRatio = bgImageEl.width / bgImageEl.height;
    let dw, dh;
    if (imgRatio > canvasRatio) {
      dh = H;
      dw = dh * imgRatio;
    } else {
      dw = W;
      dh = dw / imgRatio;
    }
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.save();
    const blur = Math.max(0, bg.imageBlur || 0);
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(bgImageEl, dx, dy, dw, dh);
    ctx.restore();
    const dim = Math.min(100, Math.max(0, bg.imageDim || 0)) / 100;
    if (dim > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dim})`;
      ctx.fillRect(0, 0, W, H);
    }
    return;
  }

  if (bg.mode === "solid") {
    ctx.fillStyle = bg.color1;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, bg.color1);
  grd.addColorStop(1, bg.color2);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

export function drawRadialTemplate(ctx, W, H, state, bands, elapsedSec, beat) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.04 : 0.12);
  const maxLen = M * 0.28;
  const rotation = elapsedSec * 0.08;
  const count = bands.length;
  const palette = getPalette(state.barColor1, state.barColor2, count);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, (M / count) * 0.7);

  for (let i = 0; i < count; i++) {
    const v = bands[i];
    const angle = (i / count) * Math.PI * 2;
    const len = innerR + v * maxLen * (state.sensitivity / 100) + beat * M * 0.025;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.strokeStyle = palette[i];
    ctx.beginPath();
    ctx.moveTo(cos * innerR, sin * innerR);
    ctx.lineTo(cos * len, sin * len);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawStarburstTemplate(ctx, W, H, state, bands, elapsedSec, beat) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.05 : 0.1);
  const maxLen = M * 0.34;
  const count = Math.min(bands.length, 48);
  const rotation = elapsedSec * -0.05;
  const palette = getPalette(state.barColor1, state.barColor2, count);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  for (let i = 0; i < count; i++) {
    const v = bands[i];
    const angle = (i / count) * Math.PI * 2;
    const len = innerR + v * maxLen * (state.sensitivity / 100) + beat * M * 0.05;
    const width = M * 0.006 + v * M * 0.01;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = palette[i];
    ctx.beginPath();
    ctx.moveTo(innerR, -width);
    ctx.lineTo(len, 0);
    ctx.lineTo(innerR, width);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function drawBarsTemplate(ctx, W, H, state, bands, beat) {
  const count = bands.length;
  const gap = W * 0.004;
  const barW = W / count - gap;
  const baseY = H * 0.72;
  const maxH = H * 0.42;

  const grd = ctx.createLinearGradient(0, baseY, 0, baseY - maxH);
  grd.addColorStop(0, state.barColor1);
  grd.addColorStop(1, state.barColor2);
  ctx.fillStyle = grd;

  for (let i = 0; i < count; i++) {
    const v = bands[i] * (state.sensitivity / 100) + beat * 0.06;
    const h = Math.min(maxH, v * maxH);
    const x = i * (barW + gap);
    ctx.fillRect(x, baseY - h, barW, h);
    if (state.mirror) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x, baseY, barW, h * 0.5);
      ctx.restore();
    }
  }
}

export function drawMirrorBarsTemplate(ctx, W, H, state, bands, beat) {
  const count = bands.length;
  const gap = W * 0.003;
  const barW = W / count - gap;
  const midY = H * 0.5;
  const maxH = H * 0.24;

  const grd = ctx.createLinearGradient(0, midY - maxH, 0, midY + maxH);
  grd.addColorStop(0, state.barColor2);
  grd.addColorStop(0.5, state.barColor1);
  grd.addColorStop(1, state.barColor2);
  ctx.fillStyle = grd;

  for (let i = 0; i < count; i++) {
    const v = bands[i] * (state.sensitivity / 100) + beat * 0.06;
    const h = Math.min(maxH, v * maxH);
    const x = i * (barW + gap);
    ctx.fillRect(x, midY - h, barW, h * 2);
  }
}

export function drawBlocksTemplate(ctx, W, H, state, bands, beat) {
  const count = Math.min(bands.length, 32);
  const rows = 12;
  const gap = W * 0.006;
  const colW = W / count - gap;
  const rowH = (H * 0.5) / rows - gap;
  const baseY = H * 0.78;
  const palette = getPalette(state.barColor2, state.barColor1, rows);

  for (let i = 0; i < count; i++) {
    const v = bands[i] * (state.sensitivity / 100) + beat * 0.08;
    const litRows = Math.min(rows, Math.round(v * rows));
    const x = i * (colW + gap);
    for (let r = 0; r < litRows; r++) {
      ctx.fillStyle = palette[r];
      const y = baseY - r * (rowH + gap) - rowH;
      ctx.fillRect(x, y, colW, rowH);
    }
  }
}

export function drawWaveTemplate(ctx, W, H, state, waveData, beat) {
  const midY = H * 0.55;
  const amp = H * 0.18 * (state.sensitivity / 100) + beat * H * 0.035;
  const step = W / (waveData.length - 1);

  ctx.save();
  ctx.lineWidth = Math.max(2, H * 0.006);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const grd = ctx.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, state.barColor1);
  grd.addColorStop(1, state.barColor2);
  ctx.strokeStyle = grd;

  ctx.beginPath();
  for (let i = 0; i < waveData.length; i++) {
    const norm = (waveData[i] - 128) / 128;
    const x = i * step;
    const y = midY + norm * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.22;
  ctx.lineWidth = Math.max(1.5, H * 0.003);
  ctx.beginPath();
  for (let i = 0; i < waveData.length; i++) {
    const norm = (waveData[i] - 128) / 128;
    const x = i * step;
    const y = midY - norm * amp * 0.6 + H * 0.22;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawParticlesTemplate(ctx, W, H, state, bands, elapsedSec, beat) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const count = Math.min(bands.length, 40);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.05 : 0.1);
  const palette = getPalette(state.barColor1, state.barColor2, count);

  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < count; i++) {
    const v = bands[i];
    const angle = (i / count) * Math.PI * 2 + elapsedSec * 0.15 * (i % 2 === 0 ? 1 : -1);
    const drift = Math.sin(elapsedSec * 1.4 + i) * M * 0.015;
    const dist = innerR + M * 0.06 + v * M * 0.22 * (state.sensitivity / 100) + drift;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const size = M * (0.004 + v * 0.014) + beat * M * 0.01;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = palette[i];
    ctx.beginPath();
    ctx.moveTo(size * 1.6, 0);
    ctx.lineTo(-size * 0.8, size * 0.7);
    ctx.lineTo(-size * 0.8, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (beat > 0.4) {
    ctx.globalAlpha = (beat - 0.4) * 0.7;
    ctx.strokeStyle = state.barColor2;
    ctx.lineWidth = M * 0.004;
    ctx.beginPath();
    ctx.arc(0, 0, innerR + M * 0.1 + beat * M * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawOrbitTemplate(ctx, W, H, state, bands, elapsedSec, beat) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const rings = 4;
  const perRing = Math.max(4, Math.floor(bands.length / rings));
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.08 : 0.14);

  ctx.save();
  ctx.translate(cx, cy);

  for (let r = 0; r < rings; r++) {
    const ringR = innerR + (r + 1) * M * 0.09;
    const spin = elapsedSec * (0.12 + r * 0.05) * (r % 2 === 0 ? 1 : -1);
    const t = rings > 1 ? r / (rings - 1) : 0;
    const color = mixHex(state.barColor1, state.barColor2, t);

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = Math.max(1, M * 0.0015);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (let i = 0; i < perRing; i++) {
      const idx = r * perRing + i;
      const v = bands[idx % bands.length];
      const angle = (i / perRing) * Math.PI * 2 + spin;
      const dotR = ringR + v * M * 0.05 * (state.sensitivity / 100) + beat * M * 0.015;
      const x = Math.cos(angle) * dotR;
      const y = Math.sin(angle) * dotR;
      const size = Math.max(1.5, M * 0.004 + v * M * 0.006);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawRippleTemplate(ctx, W, H, state, bands, bass, beat) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.06 : 0.12);
  const rings = 5;
  const palette = getPalette(state.barColor1, state.barColor2, rings);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(1.5, M * 0.003);

  for (let i = 0; i < rings; i++) {
    const spread = (i / rings + beat * 0.15) % 1;
    const r = innerR + spread * M * 0.4 * (0.5 + bass * (state.sensitivity / 100));
    const alpha = Math.max(0, 1 - spread) * 0.55;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = palette[i];
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const dots = Math.min(bands.length, 40);
  for (let i = 0; i < dots; i++) {
    const v = bands[i];
    const angle = (i / dots) * Math.PI * 2;
    const r = innerR + M * 0.02 + v * M * 0.08 * (state.sensitivity / 100);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    ctx.fillStyle = palette[i % rings];
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, M * 0.003), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawPulseTemplate(ctx, W, H, state, bands, bass, beat) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const baseR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.06 : 0.14);
  const glowR = baseR + M * 0.12 * (0.4 + bass) + beat * M * 0.06;

  const grd = ctx.createRadialGradient(cx, cy, baseR * 0.6, cx, cy, glowR);
  grd.addColorStop(0, mixHex(state.barColor1, state.barColor2, 0.5));
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const dots = Math.min(bands.length, 48);
  const palette = getPalette(state.barColor1, state.barColor2, dots);
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < dots; i++) {
    const v = bands[i];
    const angle = (i / dots) * Math.PI * 2;
    const r = baseR + M * 0.03 + v * M * 0.1 * (state.sensitivity / 100);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    ctx.fillStyle = palette[i];
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, M * 0.0035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A single soft, static ring shown before any audio is loaded — replaces
// the old behaviour of running the chosen template on all-zero data, which
// looked like a stray dashed circle sitting behind the upload prompt.
export function drawIdleHint(ctx, W, H, state) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.1 : 0.16);

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = state.barColor1;
  ctx.lineWidth = Math.max(1, M * 0.0025);
  ctx.setLineDash([M * 0.006, M * 0.01]);
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawCenterImage(ctx, W, H, centerImage, imgEl, bass, beat) {
  if (!centerImage.on || !imgEl) return;
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const baseR = (M * centerImage.size) / 200;
  const pulseScale = centerImage.pulseOn
    ? 1 + bass * (centerImage.pulseAmount / 100) + beat * 0.07
    : 1;
  const r = baseR * pulseScale;

  ctx.save();
  ctx.beginPath();
  if (centerImage.shape === "square") {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.clip();

  const imgRatio = imgEl.width / imgEl.height;
  let dw, dh;
  if (imgRatio > 1) {
    dh = r * 2;
    dw = dh * imgRatio;
  } else {
    dw = r * 2;
    dh = dw / imgRatio;
  }
  ctx.drawImage(imgEl, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();

  if (centerImage.ring) {
    ctx.save();
    ctx.strokeStyle = centerImage.ringColor || "#ffffff";
    ctx.lineWidth = Math.max(1.5, M * 0.004);
    ctx.beginPath();
    if (centerImage.shape === "square") {
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export function drawText(ctx, W, H, text) {
  if (!text.show) return;
  const title = text.title || "";
  const artist = text.artist || "";
  if (!title && !artist) return;

  const M = Math.min(W, H);
  const font = text.fontFamily || "Space Grotesk";
  const col = text.color || "#ffffff";
  let y;
  if (text.position === "top") y = H * 0.12;
  else if (text.position === "center") y = H * 0.5;
  else y = H * 0.88;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = col;

  if (title) {
    ctx.font = `700 ${M * 0.045}px "${font}"`;
    ctx.fillText(title.toUpperCase(), W / 2, y);
  }
  if (artist) {
    ctx.globalAlpha = 0.7;
    ctx.font = `500 ${M * 0.022}px "${font}"`;
    ctx.fillText(artist.toUpperCase(), W / 2, y + M * 0.04);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function makeNoiseTile(size = 220) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const tctx = c.getContext("2d");
  const imgData = tctx.createImageData(size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 60;
  }
  tctx.putImageData(imgData, 0, 0);
  return c;
}

export function drawOverlay(ctx, W, H, type, opacity, noiseTile) {
  if (!type || type === "none" || opacity <= 0) return;
  const alpha = opacity / 100;
  const M = Math.min(W, H);

  ctx.save();
  ctx.globalAlpha = alpha;

  switch (type) {
    case "noise": {
      const pattern = getNoisePattern(ctx, noiseTile);
      if (pattern) {
        ctx.save();
        ctx.translate(
          -((performance.now() * 0.02) % noiseTile.width),
          -((performance.now() * 0.013) % noiseTile.height)
        );
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, W + noiseTile.width, H + noiseTile.height);
        ctx.restore();
      }
      break;
    }
    case "scanlines": {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      const step = M * 0.006;
      for (let y = 0; y < H; y += step) {
        ctx.fillRect(0, y, W, step * 0.45);
      }
      break;
    }
    case "vignette": {
      const vgrd = ctx.createRadialGradient(W / 2, H / 2, M * 0.25, W / 2, H / 2, M * 0.85);
      vgrd.addColorStop(0, "rgba(0,0,0,0)");
      vgrd.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = vgrd;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case "grid": {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      const step = M * 0.05;
      for (let x = 0; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      break;
    }
    case "glow": {
      const ggrd = ctx.createRadialGradient(W / 2, H / 2, M * 0.4, W / 2, H / 2, M * 0.75);
      ggrd.addColorStop(0, "rgba(255,255,255,0)");
      ggrd.addColorStop(1, "rgba(255,255,255,0.35)");
      ctx.fillStyle = ggrd;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

export function drawWatermark(ctx, W, H, watermark) {
  if (!watermark || !watermark.on) return;
  const M = Math.min(W, H);
  const text = watermark.text || "AUDIO'S SPEACT";
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${M * 0.02}px "JetBrains Mono", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, W - M * 0.03, H - M * 0.03);
  ctx.restore();
}

export function renderFrame(ctx, W, H, state, frame) {
  const {
    freqData,
    waveData,
    bass = 0,
    beatPulse = 0,
    elapsedSec = 0,
    bgImageEl,
    centerImageEl,
    noiseTile,
    idle = false
  } = frame;

  const beat = Math.min(1.6, beatPulse * ((state.beatStrength || 100) / 100));

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, state.bg, bgImageEl);

  const sway = state.sway || { on: false, amount: 0 };
  const swaying = sway.on && !idle;
  if (swaying) {
    const amt = (sway.amount || 0) / 100;
    const angle = Math.sin(elapsedSec * 0.6) * 0.05 * amt + beat * 0.02 * amt;
    const dx = Math.sin(elapsedSec * 0.45) * W * 0.012 * amt;
    const dy = Math.cos(elapsedSec * 0.37) * H * 0.01 * amt;
    ctx.save();
    ctx.translate(W / 2 + dx, H / 2 + dy);
    ctx.rotate(angle);
    ctx.translate(-W / 2, -H / 2);
  }

  if (idle) {
    drawIdleHint(ctx, W, H, state);
  } else {
    const bands = sampleBands(freqData, state.barCount);
    switch (state.template) {
      case "bars":
        drawBarsTemplate(ctx, W, H, state, bands, beat);
        break;
      case "mirrorbars":
        drawMirrorBarsTemplate(ctx, W, H, state, bands, beat);
        break;
      case "blocks":
        drawBlocksTemplate(ctx, W, H, state, bands, beat);
        break;
      case "wave":
        drawWaveTemplate(ctx, W, H, state, waveData, beat);
        break;
      case "particles":
        drawParticlesTemplate(ctx, W, H, state, bands, elapsedSec, beat);
        break;
      case "orbit":
        drawOrbitTemplate(ctx, W, H, state, bands, elapsedSec, beat);
        break;
      case "ripple":
        drawRippleTemplate(ctx, W, H, state, bands, bass, beat);
        break;
      case "starburst":
        drawStarburstTemplate(ctx, W, H, state, bands, elapsedSec, beat);
        break;
      case "pulse":
        drawPulseTemplate(ctx, W, H, state, bands, bass, beat);
        break;
      case "radial":
      default:
        drawRadialTemplate(ctx, W, H, state, bands, elapsedSec, beat);
        break;
    }
  }

  drawCenterImage(ctx, W, H, state.centerImage, centerImageEl, bass, beat);
  drawText(ctx, W, H, state.text);

  if (swaying) ctx.restore();

  drawOverlay(ctx, W, H, state.overlay, state.overlayOpacity, noiseTile);
  drawWatermark(ctx, W, H, state.watermark);
}
