// Runs entirely in the browser (no server upload) using ffmpeg.wasm. Loaded
// lazily and only when actually needed, since it pulls in a ~25MB wasm core
// the first time — browsers that can record MP4 natively never touch this
// file at all.

let ffmpegPromise = null;

async function getFFmpeg(onLog) {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      if (onLog) {
        ffmpeg.on("log", ({ message }) => onLog(message));
      }

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
      });

      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export async function convertWebmToMp4(webmBlob, onProgress) {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await getFFmpeg();

  const handleProgress = ({ progress }) => {
    if (onProgress) onProgress(Math.min(1, Math.max(0, progress || 0)));
  };
  ffmpeg.on("progress", handleProgress);

  try {
    await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));
    await ffmpeg.exec([
      "-i",
      "input.webm",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "output.mp4"
    ]);
    const data = await ffmpeg.readFile("output.mp4");
    return new Blob([data.buffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handleProgress);
    try {
      await ffmpeg.deleteFile("input.webm");
      await ffmpeg.deleteFile("output.mp4");
    } catch (err) {
      /* ignore cleanup errors */
    }
  }
}
