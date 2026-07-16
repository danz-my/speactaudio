"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import VisualizerStage from "../components/VisualizerStage";
import AudioPanel from "../components/panels/AudioPanel";
import TemplatePanel from "../components/panels/TemplatePanel";
import BackgroundPanel from "../components/panels/BackgroundPanel";
import ImagePanel from "../components/panels/ImagePanel";
import TextPanel from "../components/panels/TextPanel";
import OverlayPanel from "../components/panels/OverlayPanel";
import OutputPanel from "../components/panels/OutputPanel";
import { defaultState, ASPECTS } from "../lib/defaults";
import { preloadFonts } from "../lib/fonts";
import { renderFrame, makeNoiseTile } from "../lib/visualizer";
import {
  createAudioElement,
  createAudioGraph,
  readAnalyser,
  bassEnergy,
  BeatDetector
} from "../lib/audioEngine";
import { startRecording, downloadBlob } from "../lib/recorder";
import { convertWebmToMp4 } from "../lib/mp4Convert";
import { saveSettings, loadSettings, clearSettings, mergeWithDefaults } from "../lib/storage";
import s from "./page.module.css";

export default function Page() {
  const [state, setState] = useState(defaultState);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [hasAudio, setHasAudio] = useState(false);
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [bgImageEl, setBgImageEl] = useState(null);
  const [centerImageEl, setCenterImageEl] = useState(null);

  const [recording, setRecording] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const [lastRecording, setLastRecording] = useState(null);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const audioRef = useRef(null);
  const graphRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingRef = useRef(false);

  const stateRef = useRef(state);
  const bgImageRef = useRef(null);
  const centerImageRef = useRef(null);
  const noiseTileRef = useRef(null);
  const beatDetectorRef = useRef(new BeatDetector());
  const beatPulseRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const rafRef = useRef(null);
  const fontsReadyRef = useRef(false);
  const hydrated = useRef(false);

  const aspect = ASPECTS.find((a) => a.id === state.aspect) || ASPECTS[0];

  // ---------- hydrate / persist visual settings (not audio/images) ----------
  useEffect(() => {
    const saved = loadSettings();
    if (saved) setState((s0) => mergeWithDefaults(s0, saved));
    hydrated.current = true;
    preloadFonts().then(() => {
      fontsReadyRef.current = true;
    });
    noiseTileRef.current = makeNoiseTile();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      teardownGraph();
      if (audioRef.current) {
        try {
          URL.revokeObjectURL(audioRef.current.src);
        } catch (err) {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveSettings(state);
  }, [state]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    bgImageRef.current = bgImageEl;
  }, [bgImageEl]);

  useEffect(() => {
    centerImageRef.current = centerImageEl;
  }, [centerImageEl]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.analyser.smoothingTimeConstant = Math.min(0.95, state.smoothing / 100);
    }
  }, [state.smoothing]);

  // ---------- live draw loop while audio is loaded ----------
  useEffect(() => {
    if (!hasAudio) return undefined;
    let active = true;
    lastFrameTimeRef.current = performance.now();

    function loop() {
      if (!active) return;
      const canvas = canvasRef.current;
      const graph = graphRef.current;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;

      if (canvas && graph && fontsReadyRef.current) {
        readAnalyser(graph);
        const bass = bassEnergy(graph.freqData);
        const { isBeat, ratio } = beatDetectorRef.current.update(bass, now);

        // Attack: on a detected beat, snap up proportionally to how strong the
        // transient was (louder hits punch harder). Release: smooth,
        // frame-rate-independent exponential decay so playback speed or
        // occasional dropped frames don't make the pulse look jerky.
        if (isBeat) {
          const target = Math.min(1.6, Math.max(0.55, (ratio - 1) * 1.1));
          beatPulseRef.current = Math.max(beatPulseRef.current, target);
        }
        const releaseSeconds = 0.22;
        beatPulseRef.current *= Math.exp(-dt / releaseSeconds);

        const st = stateRef.current;
        const a = ASPECTS.find((x) => x.id === st.aspect) || ASPECTS[0];
        if (canvas.width !== a.w || canvas.height !== a.h) {
          canvas.width = a.w;
          canvas.height = a.h;
          ctxRef.current = canvas.getContext("2d");
        }
        if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
        renderFrame(ctxRef.current, a.w, a.h, st, {
          freqData: graph.freqData,
          waveData: graph.waveData,
          bass,
          beatPulse: beatPulseRef.current,
          elapsedSec: audioRef.current ? audioRef.current.currentTime : 0,
          bgImageEl: bgImageRef.current,
          centerImageEl: centerImageRef.current,
          noiseTile: noiseTileRef.current
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasAudio]);

  // ---------- static preview redraw while idle (no audio yet) ----------
  useEffect(() => {
    if (hasAudio) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    preloadFonts().then(() => {
      if (cancelled) return;
      fontsReadyRef.current = true;
      const a = ASPECTS.find((x) => x.id === state.aspect) || ASPECTS[0];
      if (canvas.width !== a.w || canvas.height !== a.h) {
        canvas.width = a.w;
        canvas.height = a.h;
      }
      const ctx = canvas.getContext("2d");
      ctxRef.current = ctx;
      const dummyFreq = new Uint8Array(512).fill(0);
      const dummyWave = new Uint8Array(512).fill(128);
      renderFrame(ctx, a.w, a.h, state, {
        freqData: dummyFreq,
        waveData: dummyWave,
        bass: 0,
        beatPulse: 0,
        elapsedSec: performance.now() / 1000,
        bgImageEl,
        centerImageEl,
        noiseTile: noiseTileRef.current,
        idle: true
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hasAudio, state, bgImageEl, centerImageEl]);

  function teardownGraph() {
    if (graphRef.current) {
      try {
        graphRef.current.ctx.close();
      } catch (err) {
        /* ignore */
      }
      graphRef.current = null;
    }
  }

  // ---------- audio file handling ----------
  function handleAudioFile(file) {
    if (audioRef.current) {
      try {
        URL.revokeObjectURL(audioRef.current.src);
      } catch (err) {
        /* ignore */
      }
    }
    teardownGraph();
    beatDetectorRef.current = new BeatDetector();
    beatPulseRef.current = 0;

    const url = URL.createObjectURL(file);
    const audio = createAudioElement(url);
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration || 0));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime || 0));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      if (recordingRef.current) finishRecording();
    });

    audioRef.current = audio;
    setFileName(file.name);
    setHasAudio(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  function handleClearAudio() {
    finishRecording();
    audioRef.current?.pause();
    teardownGraph();
    if (audioRef.current) {
      try {
        URL.revokeObjectURL(audioRef.current.src);
      } catch (err) {
        /* ignore */
      }
    }
    audioRef.current = null;
    setHasAudio(false);
    setFileName("");
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
  }

  async function ensureGraph() {
    if (!audioRef.current) return null;
    if (!graphRef.current) {
      graphRef.current = createAudioGraph(audioRef.current, {
        smoothing: Math.min(0.95, state.smoothing / 100)
      });
    }
    if (graphRef.current.ctx.state === "suspended") {
      await graphRef.current.ctx.resume();
    }
    return graphRef.current;
  }

  async function handleTogglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    await ensureGraph();
    if (isPlaying) {
      audio.pause();
    } else {
      await audio.play();
    }
  }

  function handleSeek(t) {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }

  // ---------- background / center images ----------
  function loadImage(file, onLoad) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => onLoad(img);
    img.src = url;
  }

  function handleBgImageFile(file) {
    loadImage(file, (img) => setBgImageEl(img));
  }
  function handleClearBgImage() {
    setBgImageEl(null);
  }
  function handleCenterImageFile(file) {
    loadImage(file, (img) => setCenterImageEl(img));
  }
  function handleClearCenterImage() {
    setCenterImageEl(null);
  }

  // ---------- recording ----------
  async function handleToggleRecord() {
    if (recording) {
      finishRecording();
      return;
    }
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    const graph = await ensureGraph();
    if (!graph) return;

    audio.currentTime = 0;
    setCurrentTime(0);

    const recorder = startRecording({
      canvas,
      audioStream: graph.streamDest.stream,
      fps: state.fps,
      onStop: async (blob, mimeType) => {
        setRecording(false);
        const base = (state.text.title || "audio-speact").trim() || "audio-speact";

        if (mimeType && mimeType.startsWith("video/mp4")) {
          setLastRecording(blob);
          downloadBlob(blob, `${base}.mp4`);
          return;
        }

        // Browser couldn't record MP4 natively — transcode the WebM
        // recording to MP4 in-browser before handing it to the user.
        setConverting(true);
        setConvertProgress(0);
        try {
          const mp4Blob = await convertWebmToMp4(blob, (p) => setConvertProgress(p));
          setLastRecording(mp4Blob);
          downloadBlob(mp4Blob, `${base}.mp4`);
        } catch (err) {
          console.error(err);
          alert(
            "Rekaman berhasil tapi konversi ke MP4 gagal. Video sudah diunduh dalam format WebM sebagai gantinya."
          );
          setLastRecording(blob);
          downloadBlob(blob, `${base}.webm`);
        } finally {
          setConverting(false);
        }
      },
      onError: (err) => {
        console.error(err);
        alert(
          "Gagal merekam video di browser ini. Coba pakai Chrome versi terbaru untuk hasil terbaik."
        );
        setRecording(false);
      }
    });
    if (!recorder) return;

    recorderRef.current = recorder;
    setRecording(true);
    await audio.play();
  }

  function finishRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    audioRef.current?.pause();
  }

  function handleDownloadLast() {
    if (!lastRecording) return;
    const base = (state.text.title || "audio-speact").trim() || "audio-speact";
    const ext = lastRecording.type && lastRecording.type.includes("mp4") ? "mp4" : "webm";
    downloadBlob(lastRecording, `${base}.${ext}`);
  }

  function handleReset() {
    setState(defaultState());
    setBgImageEl(null);
    setCenterImageEl(null);
    clearSettings();
  }

  return (
    <div className={s.shell}>
      <TopBar
        w={aspect.w}
        h={aspect.h}
        recording={recording}
        converting={converting}
        recordDisabled={!hasAudio}
        onRecord={handleToggleRecord}
        onReset={handleReset}
        onToggleMenu={() => setSidebarOpen((o) => !o)}
      />

      <div className={s.main}>
        <div
          className={s.overlayBackdrop}
          style={{ display: sidebarOpen ? "block" : "none" }}
          onClick={() => setSidebarOpen(false)}
        />
        <aside className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ""}`}>
          <AudioPanel
            state={state}
            setState={setState}
            hasAudio={hasAudio}
            fileName={fileName}
            duration={duration}
            onAudioFile={handleAudioFile}
            onClearAudio={handleClearAudio}
          />
          <TemplatePanel state={state} setState={setState} />
          <BackgroundPanel
            state={state}
            setState={setState}
            bgImageEl={bgImageEl}
            onBgImageFile={handleBgImageFile}
            onClearBgImage={handleClearBgImage}
          />
          <ImagePanel
            state={state}
            setState={setState}
            centerImageEl={centerImageEl}
            onCenterImageFile={handleCenterImageFile}
            onClearCenterImage={handleClearCenterImage}
          />
          <TextPanel state={state} setState={setState} />
          <OverlayPanel state={state} setState={setState} />
          <OutputPanel
            state={state}
            setState={setState}
            recording={recording}
            recordElapsed={currentTime}
            recordDuration={duration}
            converting={converting}
            convertProgress={convertProgress}
            lastRecording={lastRecording}
            onDownloadLast={handleDownloadLast}
          />

          <div className={s.sidebarFooter}>
            <span className={s.autosaveNote}>Pengaturan tampilan tersimpan otomatis selama sesi ini</span>
          </div>
        </aside>

        <div className={s.stageColumn}>
          <VisualizerStage
            canvasRef={canvasRef}
            targetW={aspect.w}
            targetH={aspect.h}
            hasAudio={hasAudio}
            onAudioFile={handleAudioFile}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            fileInputRef={audioFileInputRef}
            watermarkOn={state.watermark.on}
            onRemoveWatermark={() =>
              setState((st) => ({ ...st, watermark: { ...st.watermark, on: false } }))
            }
          />
        </div>
      </div>
    </div>
  );
}
