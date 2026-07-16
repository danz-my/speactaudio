"use client";

import s from "./VisualizerStage.module.css";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s2 = Math.floor(sec % 60);
  return `${m}:${s2.toString().padStart(2, "0")}`;
}

export default function VisualizerStage({
  canvasRef,
  targetW,
  targetH,
  hasAudio,
  onAudioFile,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  fileInputRef,
  watermarkOn,
  onRemoveWatermark
}) {
  return (
    <div className={s.stage}>
      <div className={s.frame}>
        <span className={`${s.mark} ${s.markTl}`} />
        <span className={`${s.mark} ${s.markTr}`} />
        <span className={`${s.mark} ${s.markBl}`} />
        <span className={`${s.mark} ${s.markBr}`} />
        <div className={s.canvasWrap}>
          <canvas ref={canvasRef} width={targetW} height={targetH} className={s.canvas} />
          {watermarkOn ? (
            <button
              type="button"
              className={s.watermarkChip}
              onClick={onRemoveWatermark}
              title="Hapus watermark"
            >
              ×
            </button>
          ) : null}
          {!hasAudio ? (
            <div className={s.dropzone}>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAudioFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className={s.dropzoneBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined">library_music</span>
                <span>Unggah file audio</span>
                <span className={s.dropzoneHint}>MP3, WAV, OGG, M4A</span>
              </button>
            </div>
          ) : null}
        </div>

        {hasAudio ? (
          <div className={s.transport}>
            <button
              type="button"
              className={s.playBtn}
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Jeda" : "Putar"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>
            <input
              className={s.seek}
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={Math.min(currentTime || 0, duration || 0)}
              onChange={(e) => onSeek(Number(e.target.value))}
            />
            <span className={s.timeTag}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        ) : null}

        <div className={s.caption}>
          <span>SPEACT / LIVE</span>
          <span>{targetW}×{targetH}PX</span>
        </div>
      </div>
    </div>
  );
}
