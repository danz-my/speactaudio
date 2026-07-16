// All drawing is plain 2D canvas so a frame can be captured 1:1 by
// canvas.captureStream() during recording — nothing here depends on DOM
// layout, only on the numbers coming from the analyser each frame.

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

export function drawRadialTemplate(ctx, W, H, state, bands, elapsedSec, beatPulse) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.04 : 0.12);
  const maxLen = M * 0.28;
  const rotation = elapsedSec * 0.08;
  const count = bands.length;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.lineCap = "round";

  for (let i = 0; i < count; i++) {
    const v = bands[i];
    const angle = (i / count) * Math.PI * 2;
    const len = innerR + v * maxLen * (state.sensitivity / 100) + beatPulse * M * 0.02;
    const x1 = Math.cos(angle) * innerR;
    const y1 = Math.sin(angle) * innerR;
    const x2 = Math.cos(angle) * len;
    const y2 = Math.sin(angle) * len;
    ctx.strokeStyle = mixHex(state.barColor1, state.barColor2, i / count);
    ctx.lineWidth = Math.max(1.5, (M / count) * 0.7);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBarsTemplate(ctx, W, H, state, bands, beatPulse) {
  const count = bands.length;
  const gap = W * 0.004;
  const barW = W / count - gap;
  const baseY = H * 0.72;
  const maxH = H * 0.42;

  for (let i = 0; i < count; i++) {
    const v = bands[i] * (state.sensitivity / 100) + beatPulse * 0.05;
    const h = Math.min(maxH, v * maxH);
    const x = i * (barW + gap);
    const grd = ctx.createLinearGradient(0, baseY, 0, baseY - h);
    grd.addColorStop(0, state.barColor1);
    grd.addColorStop(1, state.barColor2);
    ctx.fillStyle = grd;
    ctx.fillRect(x, baseY - h, barW, h);
    if (state.mirror) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x, baseY, barW, h * 0.5);
      ctx.restore();
    }
  }
}

export function drawWaveTemplate(ctx, W, H, state, waveData, beatPulse) {
  const midY = H * 0.55;
  const amp = H * 0.18 * (state.sensitivity / 100) + beatPulse * H * 0.03;
  const step = W / (waveData.length - 1);

  ctx.save();
  ctx.lineWidth = Math.max(2, H * 0.006);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const grd = ctx.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, state.barColor1);
  grd.addColorStop(1, state.barColor2);
  ctx.strokeStyle = grd;
  ctx.shadowColor = state.barColor2;
  ctx.shadowBlur = H * 0.02;

  ctx.beginPath();
  for (let i = 0; i < waveData.length; i++) {
    const norm = (waveData[i] - 128) / 128;
    const x = i * step;
    const y = midY + norm * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.25;
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

export function drawParticlesTemplate(ctx, W, H, state, bands, elapsedSec, beatPulse) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const count = Math.min(bands.length, 40);
  const innerR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.05 : 0.1);

  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < count; i++) {
    const v = bands[i];
    const angle = (i / count) * Math.PI * 2 + elapsedSec * 0.15 * (i % 2 === 0 ? 1 : -1);
    const drift = Math.sin(elapsedSec * 1.4 + i) * M * 0.015;
    const dist = innerR + M * 0.06 + v * M * 0.22 * (state.sensitivity / 100) + drift;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const size = M * (0.004 + v * 0.014) + beatPulse * M * 0.008;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const grd = ctx.createLinearGradient(-size, 0, size, 0);
    grd.addColorStop(0, state.barColor1);
    grd.addColorStop(1, state.barColor2);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(size * 1.6, 0);
    ctx.lineTo(-size * 0.8, size * 0.7);
    ctx.lineTo(-size * 0.8, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (beatPulse > 0.5) {
    ctx.globalAlpha = (beatPulse - 0.5) * 0.6;
    ctx.strokeStyle = state.barColor2;
    ctx.lineWidth = M * 0.004;
    ctx.beginPath();
    ctx.arc(0, 0, innerR + M * 0.1 + beatPulse * M * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPulseTemplate(ctx, W, H, state, bands, bass, beatPulse) {
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const baseR = M * (state.centerImage.on ? state.centerImage.size / 200 + 0.06 : 0.14);
  const glowR = baseR + M * 0.12 * (0.4 + bass) + beatPulse * M * 0.05;

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
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < dots; i++) {
    const v = bands[i];
    const angle = (i / dots) * Math.PI * 2;
    const r = baseR + M * 0.03 + v * M * 0.1 * (state.sensitivity / 100);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    ctx.fillStyle = mixHex(state.barColor1, state.barColor2, i / dots);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, M * 0.0035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCenterImage(ctx, W, H, centerImage, imgEl, bass, beatPulse) {
  if (!centerImage.on || !imgEl) return;
  const cx = W / 2;
  const cy = H / 2;
  const M = Math.min(W, H);
  const baseR = (M * centerImage.size) / 200;
  const pulseScale = centerImage.pulseOn
    ? 1 + (bass * (centerImage.pulseAmount / 100)) + beatPulse * 0.06
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
      if (noiseTile) {
        const pattern = ctx.createPattern(noiseTile, "repeat");
        ctx.save();
        ctx.translate(Math.random() * noiseTile.width, Math.random() * noiseTile.height);
        ctx.fillStyle = pattern;
        ctx.fillRect(-noiseTile.width, -noiseTile.height, W + noiseTile.width * 2, H + noiseTile.height * 2);
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
  const { freqData, waveData, bass, beatPulse, elapsedSec, bgImageEl, centerImageEl, noiseTile } = frame;

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, state.bg, bgImageEl);

  const bands = sampleBands(freqData, state.barCount);

  switch (state.template) {
    case "bars":
      drawBarsTemplate(ctx, W, H, state, bands, beatPulse);
      break;
    case "wave":
      drawWaveTemplate(ctx, W, H, state, waveData, beatPulse);
      break;
    case "particles":
      drawParticlesTemplate(ctx, W, H, state, bands, elapsedSec, beatPulse);
      break;
    case "pulse":
      drawPulseTemplate(ctx, W, H, state, bands, bass, beatPulse);
      break;
    case "radial":
    default:
      drawRadialTemplate(ctx, W, H, state, bands, elapsedSec, beatPulse);
      break;
  }

  drawCenterImage(ctx, W, H, state.centerImage, centerImageEl, bass, beatPulse);
  drawText(ctx, W, H, state.text);
  drawOverlay(ctx, W, H, state.overlay, state.overlayOpacity, noiseTile);
  drawWatermark(ctx, W, H, state.watermark);
}
