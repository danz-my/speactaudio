// Thin wrapper around the Web Audio API.
//
// The visualizer reads live frequency/waveform data from an AnalyserNode
// while the audio plays back in the browser. This is what keeps the
// animation locked to the actual beat of the track: every animation frame
// asks the analyser "what does the sound look like right now", so bars,
// pulses, and particles are always reacting to the real audio, not a
// pre-baked guess.

export function createAudioElement(url) {
  const audio = new Audio();
  audio.src = url;
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";
  return audio;
}

// Must be called from a user gesture (e.g. a click handler) because
// AudioContext creation is gated by browser autoplay policies.
export function createAudioGraph(audioEl, { fftSize = 1024, smoothing = 0.75 } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const source = ctx.createMediaElementSource(audioEl);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothing;

  // A MediaStreamDestination lets us capture the exact audio being played
  // so it can be muxed into the recorded video alongside the canvas frames.
  const streamDest = ctx.createMediaStreamDestination();

  source.connect(analyser);
  analyser.connect(ctx.destination); // so the user can hear it while previewing
  analyser.connect(streamDest); // so we can record it

  const freqData = new Uint8Array(analyser.frequencyBinCount);
  const waveData = new Uint8Array(analyser.frequencyBinCount);

  return { ctx, source, analyser, streamDest, freqData, waveData };
}

export function readAnalyser(graph) {
  graph.analyser.getByteFrequencyData(graph.freqData);
  graph.analyser.getByteTimeDomainData(graph.waveData);
  return graph;
}

// Rough low-frequency ("bass") energy, 0..1 — the part of the spectrum most
// tightly linked to the beat of most music.
export function bassEnergy(freqData) {
  const bins = Math.max(1, Math.floor(freqData.length * 0.08));
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += freqData[i];
  return sum / bins / 255;
}

// Simple rolling-average energy-based beat detector. Not a music-theory
// beat tracker, but reacts convincingly to kicks/snares in most tracks,
// which is what a reactive visualizer needs.
export class BeatDetector {
  constructor({ historySize = 40, threshold = 1.32, minGapMs = 140 } = {}) {
    this.history = [];
    this.historySize = historySize;
    this.threshold = threshold;
    this.minGapMs = minGapMs;
    this.lastBeatAt = 0;
  }

  update(energy, nowMs) {
    const avg =
      this.history.length > 0
        ? this.history.reduce((a, b) => a + b, 0) / this.history.length
        : energy;

    let isBeat = false;
    if (
      energy > avg * this.threshold &&
      energy > 0.06 &&
      nowMs - this.lastBeatAt > this.minGapMs
    ) {
      isBeat = true;
      this.lastBeatAt = nowMs;
    }

    this.history.push(energy);
    if (this.history.length > this.historySize) this.history.shift();

    return { isBeat, avg };
  }
}
