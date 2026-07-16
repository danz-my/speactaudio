// Combines the canvas's video frames with the audio graph's captured audio
// track into a single recording. Because both come from the same live
// playback, the exported file stays in sync with the beat automatically —
// there's no separate "render" pass to go out of sync.
//
// MP4 output: a handful of browsers (mainly recent Chrome/Edge on Windows,
// and Safari) can record straight to MP4/H.264 via MediaRecorder. Where
// that isn't available we record WebM and the caller (see mp4Convert.js)
// transcodes it to MP4 client-side with ffmpeg.wasm after the recording
// finishes, so the final downloaded file is always .mp4.

const MP4_CANDIDATES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4"
];

const WEBM_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm"
];

function supported(type) {
  return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type);
}

export function isNativeMp4Supported() {
  return MP4_CANDIDATES.some(supported);
}

export function pickMimeType() {
  for (const type of MP4_CANDIDATES) {
    if (supported(type)) return type;
  }
  for (const type of WEBM_CANDIDATES) {
    if (supported(type)) return type;
  }
  return "video/webm";
}

export function startRecording({ canvas, audioStream, fps = 30, onStop, onError }) {
  try {
    const canvasStream = canvas.captureStream(fps);
    const videoTracks = canvasStream.getVideoTracks();
    const audioTracks = audioStream ? audioStream.getAudioTracks() : [];
    const combined = new MediaStream([...videoTracks, ...audioTracks]);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: 8_000_000
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      onStop?.(blob, mimeType);
    };
    recorder.onerror = (e) => {
      onError?.(e.error || e);
    };

    recorder.start(250);
    return recorder;
  } catch (err) {
    onError?.(err);
    return null;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
