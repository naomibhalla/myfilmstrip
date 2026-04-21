"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";

import SortablePhoto from "@/components/SortablePhoto";
import StylePicker from "@/components/StylePicker";
import DevelopingLoader from "@/components/DevelopingLoader";
import CameraCapture from "@/components/CameraCapture";
import { FilmStyle } from "@/lib/imageProcessing";
import { generateFilmStrip } from "@/lib/filmStripLayout";

type Photo = { id: string; src: string };
type Screen = "home" | "editor" | "camera" | "result";

const ROTATIONS = [-2, 1.5, -1, 2.5];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [style, setStyle] = useState<FilmStyle>("warm-vintage");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const remaining = 4 - photos.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(
      toAdd.map(
        (file) =>
          new Promise<Photo>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({
                id: `${Date.now()}-${Math.random()}`,
                src: e.target!.result as string,
              });
            reader.readAsDataURL(file);
          })
      )
    ).then((newPhotos) => {
      setPhotos((prev) => [...prev, ...newPhotos]);
      if (screen === "home") setScreen("editor");
    });
    if (event.target) event.target.value = "";
  }

  function handleRemove(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  function handleShuffle() {
    setPhotos((p) => {
      const copy = [...p];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleCameraCapture(dataUrls: string[]) {
    const newPhotos = dataUrls.map((src, i) => ({
      id: `cam-${Date.now()}-${i}`,
      src,
    }));
    setPhotos(newPhotos);
    setScreen("editor");
  }

  async function handleGenerate() {
    if (photos.length === 0) return;
    setIsGenerating(true);
    try {
      const [canvas] = await Promise.all([
        generateFilmStrip({
          imageSrcs: photos.map((p) => p.src),
          style,
        }),
        new Promise((r) => setTimeout(r, 1800)),
      ]);
      const url = canvas.toDataURL("image/png");
      setResultUrl(url);
      setScreen("result");
    } catch (e) {
      console.error(e);
      alert("something went wrong. try again?");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownload() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `myfilmstrip-${style}-${Date.now()}.png`;
    a.click();
  }

  function handleStartOver() {
    setPhotos([]);
    setResultUrl(null);
    setScreen("home");
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  return (
    <main className="min-h-screen w-full">
      {fileInput}

      <AnimatePresence mode="wait">
        {screen === "home" && (
          <HomeScreen
            key="home"
            onUpload={() => fileInputRef.current?.click()}
            onCamera={() => setScreen("camera")}
          />
        )}
        {screen === "editor" && (
          <EditorScreen
            key="editor"
            photos={photos}
            style={style}
            onStyleChange={setStyle}
            onAddMore={() => fileInputRef.current?.click()}
            onRemove={handleRemove}
            onShuffle={handleShuffle}
            onDragEnd={handleDragEnd}
            onGenerate={handleGenerate}
            onBack={() => setScreen("home")}
            sensors={sensors}
          />
        )}
        {screen === "camera" && (
          <CameraCapture
            key="camera"
            onCapture={handleCameraCapture}
            onCancel={() => setScreen("home")}
          />
        )}
        {screen === "result" && resultUrl && (
          <ResultScreen
            key="result"
            resultUrl={resultUrl}
            onDownload={handleDownload}
            onStartOver={handleStartOver}
            onBack={() => setScreen("editor")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{isGenerating && <DevelopingLoader />}</AnimatePresence>
    </main>
  );
}

// ========== HOME SCREEN ==========

function HomeScreen({
  onUpload,
  onCamera,
}: {
  onUpload: () => void;
  onCamera: () => void;
}) {
  // Mouse-tracking tilt for the film strip
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) / rect.width;
    const deltaY = (e.clientY - centerY) / rect.height;
    setTilt({ x: deltaY * -8, y: deltaX * 10 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="text-center max-w-lg relative z-10 flex flex-col items-center"
      >
        {/* Tiny stamp */}
        <div className="font-mono font-light text-[10px] tracking-[4px] uppercase text-sepia mb-8">
          · est. 2026 · toronto ·
        </div>

        {/* Hero title */}
        <h1 className="font-display text-6xl md:text-7xl leading-[0.95] mb-3">
          myfilmstrip
        </h1>

        {/* Subheading */}
        <div className="flex items-center justify-center gap-3 my-5">
          <div className="w-10 h-px bg-sand" />
          <span className="font-italic italic text-sepia text-lg">
            tiny memories, made with love!
          </span>
          <div className="w-10 h-px bg-sand" />
        </div>

        {/* Interactive film strip element — centered & tilting */}
        <div
          className="my-8 perspective-[1000px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ perspective: "1000px" }}
        >
          <motion.div
            animate={{ rotateX: tilt.x, rotateY: tilt.y }}
            transition={{ type: "spring", stiffness: 150, damping: 18 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative"
          >
            <HeroFilmStrip />
          </motion.div>
        </div>

        {/* Headline copy */}
        <p className="font-italic italic text-sepia text-base mb-8 max-w-sm mx-auto leading-relaxed">
          turn your favourite photos into vintage film strips. free. instantly.
        </p>

        {/* CTAs — icons on the right */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={onUpload} className="btn-ink group">
            <span>upload photos</span>
            <span className="ml-2 transition-transform group-hover:translate-x-0.5">↑</span>
          </button>
          <button onClick={onCamera} className="btn-outline group">
            <span>use camera</span>
            <span className="ml-2 transition-transform group-hover:translate-x-0.5">◉</span>
          </button>
        </div>

        <div className="font-mono font-light text-[10px] tracking-[3px] uppercase text-faded mt-10">
          — up to 4 photos —
        </div>
      </motion.div>
    </motion.section>
  );
}

// Hero film strip — 3 tiny sample frames in a mini vertical strip
function HeroFilmStrip() {
  // Placeholder sample "photos" — gradients representing vintage imagery
  const samples = [
    "linear-gradient(135deg, #d4a574 0%, #8b6f47 50%, #5a4a3a 100%)",
    "linear-gradient(135deg, #f4d4a1 0%, #c48850 60%, #8b5a2b 100%)",
    "linear-gradient(135deg, #e89b5a 0%, #a86a4a 50%, #6a4230 100%)",
  ];

  return (
    <div
      className="relative mx-auto"
      style={{
        width: "180px",
        background: "#1a1612",
        padding: "16px 28px",
        borderRadius: "3px",
        boxShadow: "0 12px 40px rgba(58,47,37,0.25)",
      }}
    >
      {/* Perforations left */}
      <div className="absolute left-2 top-0 h-full flex flex-col justify-around py-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-sm bg-cream"
            style={{ width: "10px", height: "6px" }}
          />
        ))}
      </div>
      {/* Perforations right */}
      <div className="absolute right-2 top-0 h-full flex flex-col justify-around py-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-sm bg-cream"
            style={{ width: "10px", height: "6px" }}
          />
        ))}
      </div>

      {/* Frames */}
      <div className="flex flex-col gap-1.5">
        {samples.map((bg, i) => (
          <div
            key={i}
            className="rounded-sm relative overflow-hidden"
            style={{ background: bg, aspectRatio: "4/3" }}
          >
            {/* Subtle grain overlay */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")",
              }}
            />
          </div>
        ))}
      </div>

      {/* Film label */}
      <div
        className="absolute -left-1 top-4 font-mono font-light text-[7px] tracking-widest text-cream/50"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        KODAK GOLD 200
      </div>
    </div>
  );
}

// ========== EDITOR SCREEN ==========

function EditorScreen({
  photos,
  style,
  onStyleChange,
  onAddMore,
  onRemove,
  onShuffle,
  onDragEnd,
  onGenerate,
  onBack,
  sensors,
}: {
  photos: Photo[];
  style: FilmStyle;
  onStyleChange: (s: FilmStyle) => void;
  onAddMore: () => void;
  onRemove: (id: string) => void;
  onShuffle: () => void;
  onDragEnd: (e: DragEndEvent) => void;
  onGenerate: () => void;
  onBack: () => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen w-full px-5 py-8 md:py-12 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <button
          onClick={onBack}
          className="font-mono font-light text-xs tracking-widest text-sepia hover:text-ink transition-colors"
        >
          ← back
        </button>
        <div className="text-right">
          <div className="font-mono font-light text-[10px] tracking-[3px] uppercase text-sepia">
            step 02
          </div>
          <div className="font-italic italic text-sm text-faded">
            arrange & style
          </div>
        </div>
      </div>

      {/* Photos section */}
      <div className="tape paper-card rounded-sm p-5 md:p-6 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="font-italic italic text-sepia text-sm">
              your photos
            </div>
            <div className="font-display text-2xl">
              drag to reorder ({photos.length}/4)
            </div>
          </div>
          {photos.length > 1 && (
            <button
              onClick={onShuffle}
              className="font-mono font-light text-[10px] tracking-widest uppercase bg-sunset/20 text-ink px-3 py-2 rounded-sm hover:bg-sunset/40 transition-colors border border-sunset/40 inline-flex items-center gap-1.5"
            >
              <span>shuffle</span>
              <span>↻</span>
            </button>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((p, i) => (
                <SortablePhoto
                  key={p.id}
                  id={p.id}
                  src={p.src}
                  index={i}
                  onRemove={() => onRemove(p.id)}
                  rotation={ROTATIONS[i] ?? 0}
                />
              ))}
              {photos.length < 4 && (
                <button
                  onClick={onAddMore}
                  className="aspect-[3/4] border-2 border-dashed border-sand/70 bg-ecru/40 hover:bg-ecru hover:border-sepia rounded-sm flex flex-col items-center justify-center gap-2 transition-all group"
                >
                  <div className="text-3xl text-sand group-hover:text-sepia transition-colors">
                    +
                  </div>
                  <div className="font-mono font-light text-[9px] tracking-widest uppercase text-sepia">
                    add photo
                  </div>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Style picker */}
      <div className="paper-card rounded-sm p-5 md:p-6 mb-6 relative">
        <div
          className="absolute -top-2 left-6 w-20 h-5 bg-rose/60 border border-rose/30"
          style={{ transform: "rotate(-2deg)" }}
        />
        <div className="mb-4">
          <div className="font-italic italic text-sepia text-sm">
            film strip finish
          </div>
          <div className="font-display text-2xl">pick your vibe</div>
        </div>
        <StylePicker value={style} onChange={onStyleChange} />
      </div>

      {/* Generate button — icon on right */}
      <motion.button
        onClick={onGenerate}
        disabled={photos.length === 0}
        whileHover={{ scale: photos.length > 0 ? 1.02 : 1 }}
        whileTap={{ scale: photos.length > 0 ? 0.98 : 1 }}
        className={`w-full py-5 rounded-sm font-mono font-light text-sm tracking-[4px] uppercase transition-all inline-flex items-center justify-center gap-2 ${
          photos.length === 0
            ? "bg-sand/40 text-faded cursor-not-allowed"
            : "bg-ink text-cream hover:bg-tomato sticker-shadow"
        }`}
      >
        <span>
          {photos.length === 0 ? "add photos to continue" : "develop my strip"}
        </span>
        {photos.length > 0 && <span>✿</span>}
      </motion.button>

      <div className="text-center font-italic italic text-faded text-xs mt-4">
        made with love, one strip at a time
      </div>
    </motion.section>
  );
}

// ========== RESULT SCREEN ==========

function ResultScreen({
  resultUrl,
  onDownload,
  onStartOver,
  onBack,
}: {
  resultUrl: string;
  onDownload: () => void;
  onStartOver: () => void;
  onBack: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full px-5 py-8 md:py-12 max-w-lg mx-auto"
    >
      <div className="flex justify-between items-start mb-8">
        <button
          onClick={onBack}
          className="font-mono font-light text-xs tracking-widest text-sepia hover:text-ink"
        >
          ← edit
        </button>
        <div className="font-mono font-light text-[10px] tracking-[3px] uppercase text-sepia">
          complete ✓
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="font-italic italic text-sepia text-lg mb-1">
          your film strip
        </div>
        <h2 className="font-display text-4xl">fresh out of the darkroom</h2>
      </div>

      {/* Result image — clean, no tape */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
        className="relative mx-auto mb-10 max-w-[340px]"
      >
        <img
          src={resultUrl}
          alt="your film strip"
          className="w-full rounded-sm"
          style={{ boxShadow: "0 20px 60px rgba(58,47,37,0.35)" }}
        />
      </motion.div>

      {/* CTAs — icons on the right */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onDownload}
          className="btn-ink w-full inline-flex items-center justify-center gap-2"
        >
          <span>download png</span>
          <span>↓</span>
        </button>
        <button
          onClick={onStartOver}
          className="btn-outline w-full inline-flex items-center justify-center gap-2"
        >
          <span>start over</span>
          <span>↻</span>
        </button>
      </div>

      <div className="text-center font-italic italic text-faded text-xs mt-6">
        developed with love · myfilmstrip.com
      </div>
    </motion.section>
  );
}
