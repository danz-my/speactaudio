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
  const [lastRecording, setLastRecording] = useState(null);

  const canvasRef = useRef(null);
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

    function loop() {
      if (!active) return;
      const canvas = canvasRef.current;
      const graph = graphRef.current;
      if (canvas && graph && fontsReadyRef.current) {
        readAnalyser(graph);
        const bass = bassEnergy(graph.freqData);
        const { isBeat } = beatDetectorRef.current.update(bass, performance.now());
        beatPulseRef.current = isBeat ? 1 : beatPulseRef.current * 0.88;

        const st = stateRef.current;
        const a = ASPECTS.find((x) => x.id === st.aspect) || ASPECTS[0];
        if (canvas.width !== a.w) canvas.width = a.w;
        if (canvas.height !== a.h) canvas.height = a.h;
        const ctx = canvas.getContext("2d");
        renderFrame(ctx, a.w, a.h, st, {
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
      if (canvas.width !== a.w) canvas.width = a.w;
      if (canvas.height !== a.h) canvas.height = a.h;
      const ctx = canvas.getContext("2d");
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
        noiseTile: noiseTileRef.current
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
      onStop: (blob) => {
        setLastRecording(blob);
        const base = (state.text.title || "audio-speact").trim() || "audio-speact";
        downloadBlob(blob, `${base}.webm`);
        setRecording(false);
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
    downloadBlob(lastRecording, `${base}.webm`);
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
          />
          {state.watermark.on ? (
            <button
              type="button"
              className={s.watermarkChip}
              title="Hapus watermark"
              onClick={() => setState((st) => ({ ...st, watermark: { ...st.watermark, on: false } }))}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
