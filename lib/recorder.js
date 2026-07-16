// Combines the canvas's video frames with the audio graph's captured audio
// track into a single recording. Because both come from the same live
// playback, the exported file stays in sync with the beat automatically —
// there's no separate "render" pass to go out of sync.

export function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
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
      onStop?.(blob);
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
