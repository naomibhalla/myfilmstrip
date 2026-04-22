"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  MouseSensor,
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
import UploadOnboarding from "@/components/UploadOnboarding";
import HowItWorks from "@/components/HowItWorks";
import { FilmStyle } from "@/lib/imageProcessing";
import {
  generateFilmStrip,
  Orientation,
  BorderColor,
} from "@/lib/filmStripLayout";

type Photo = { id: string; src: string };
type Screen = "home" | "upload" | "editor" | "camera" | "result";

const ROTATIONS = [-2, 1.5, -1, 2.5];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [style, setStyle] = useState<FilmStyle>("warm-vintage");
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [borderColor, setBorderColor] = useState<BorderColor>("white");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Sensors tuned for press-hold-drag on mobile
  // - MouseSensor for desktop (distance threshold)
  // - TouchSensor with 350ms delay + small tolerance = press-and-hold activation
  //   (users won't accidentally drag when trying to scroll)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 350, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function filesToPhotos(files: File[]): Promise<Photo[]> {
    return Promise.all(
      files.map(
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
    );
  }

  async function handleOnboardingFiles(files: File[]) {
    const newPhotos = await filesToPhotos(files);
    setPhotos(newPhotos);
    setScreen("editor");
  }

  async function handleEditorAddMore(files: File[]) {
    const remaining = 4 - photos.length;
    const newPhotos = await filesToPhotos(files.slice(0, remaining));
    setPhotos((prev) => [...prev, ...newPhotos]);
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
          orientation,
          borderColor,
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

  return (
    <main className="min-h-screen w-full">
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <HomeScreen
            key="home"
            onUpload={() => setScreen("upload")}
            onCamera={() => setScreen("camera")}
          />
        )}
        {screen === "upload" && (
          <UploadOnboarding
            key="upload"
            onFilesSelected={handleOnboardingFiles}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "editor" && (
          <EditorScreen
            key="editor"
            photos={photos}
            style={style}
            orientation={orientation}
            borderColor={borderColor}
            onStyleChange={setStyle}
            onOrientationChange={setOrientation}
            onBorderColorChange={setBorderColor}
            onAddMoreFiles={handleEditorAddMore}
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
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center px-6 py-12 relative"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="text-center relative z-10 flex flex-col items-center w-full max-w-md pt-12"
      >
        <div className="font-mono font-light text-[11px] tracking-[4px] uppercase text-ink/70 mb-3">
          · made in toronto ·
        </div>

        <h1 className="font-display text-7xl md:text-[88px] leading-[0.95] mb-2 text-ink">
          myfilmstrip
        </h1>

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-px bg-sand" />
          <span className="font-italic italic text-sepia text-base">
            tiny memories, made with love!
          </span>
          <div className="w-10 h-px bg-sand" />
        </div>

        <div className="mb-10">
          <HeroComposition />
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[360px] mb-4">
          <button onClick={onUpload} className="btn-ink">
            upload photos
          </button>
          <button onClick={onCamera} className="btn-outline">
            use camera
          </button>
        </div>

        <p className="font-italic italic text-sepia text-sm mb-6">
          turn your favourite photos into film strips. free. instantly.
        </p>

        <div className="font-mono font-light text-[11px] tracking-[4px] uppercase text-faded">
          — up to 4 photos —
        </div>
      </motion.div>

      <HowItWorks />
    </motion.section>
  );
}

function HeroComposition() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      style={{
        width: "360px",
        height: "300px",
        perspective: "1400px",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateX: isHovered ? -10 : 0,
          rotateY: isHovered ? 6 : 0,
          y: isHovered ? -10 : 0,
          scale: isHovered ? 1.03 : 1,
        }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
      >
        <motion.div
          className="absolute bg-white p-2 pb-6 rounded-sm"
          style={{
            top: "30px",
            left: "40px",
            width: "135px",
            boxShadow: "0 6px 18px rgba(58,47,37,0.2)",
          }}
          animate={{
            rotate: isHovered ? -10 : -6,
            x: isHovered ? -8 : 0,
            y: isHovered ? -4 : 0,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
        >
          <div
            className="w-full bg-ecru overflow-hidden"
            style={{ aspectRatio: "3/4" }}
          >
            <img
              src="/hero1.jpeg"
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "saturate(0.95) contrast(1.02)" }}
            />
          </div>
        </motion.div>

        <motion.div
          className="absolute rounded-sm"
          style={{
            top: "0",
            right: "20px",
            width: "140px",
            background: "#1a1612",
            padding: "10px 8px",
            boxShadow: "0 8px 22px rgba(58,47,37,0.25)",
          }}
          animate={{
            rotate: isHovered ? 10 : 5,
            x: isHovered ? 10 : 0,
            y: isHovered ? -2 : 0,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
        >
          <div className="flex flex-col gap-1.5">
            {["/hero2.jpeg", "/hero3.jpeg", "/hero4.jpeg"].map((src, i) => (
              <div
                key={i}
                className="w-full bg-ink overflow-hidden rounded-[2px]"
                style={{ aspectRatio: "4/3" }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: "grayscale(1) contrast(1.1) brightness(0.95)" }}
                />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="absolute p-4 rounded-sm"
          style={{
            bottom: "0",
            left: "75px",
            width: "200px",
            background: "#fdf6e5",
            boxShadow: "0 8px 22px rgba(58,47,37,0.22)",
          }}
          animate={{
            rotate: isHovered ? -3 : -1,
            y: isHovered ? -6 : 0,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
        >
          <p
            className="text-ink/85 leading-[1.3] mb-2 text-left"
            style={{
              fontFamily: "'Cedarville Cursive', cursive",
              fontSize: "15px",
              fontWeight: 400,
            }}
          >
            welcome to my little film strip. this is my first digital project to
            make photos more fun :) let&apos;s make some mems together!
          </p>
          <div
            className="text-right text-sepia"
            style={{
              fontFamily: "'Cedarville Cursive', cursive",
              fontSize: "13px",
            }}
          >
            love, naomi
          </div>
        </motion.div>

        <motion.div
          className="absolute pointer-events-none"
          style={{
            bottom: "152px",
            left: "140px",
            width: "44px",
            height: "18px",
            background: "rgba(240, 220, 150, 0.6)",
            border: "1px dashed rgba(180, 150, 80, 0.3)",
            zIndex: 10,
          }}
          animate={{
            rotate: isHovered ? -14 : -10,
            y: isHovered ? -8 : 0,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
        />
      </motion.div>
    </div>
  );
}

// ========== EDITOR SCREEN ==========

function EditorScreen({
  photos,
  style,
  orientation,
  borderColor,
  onStyleChange,
  onOrientationChange,
  onBorderColorChange,
  onAddMoreFiles,
  onRemove,
  onShuffle,
  onDragEnd,
  onGenerate,
  onBack,
  sensors,
}: {
  photos: Photo[];
  style: FilmStyle;
  orientation: Orientation;
  borderColor: BorderColor;
  onStyleChange: (s: FilmStyle) => void;
  onOrientationChange: (o: Orientation) => void;
  onBorderColorChange: (b: BorderColor) => void;
  onAddMoreFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onShuffle: () => void;
  onDragEnd: (e: DragEndEvent) => void;
  onGenerate: () => void;
  onBack: () => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAddMoreFiles(files);
    if (e.target) e.target.value = "";
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen w-full px-5 py-8 md:py-12 max-w-2xl mx-auto"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex justify-between items-start mb-8">
        <button
          onClick={onBack}
          className="font-mono font-light text-xs tracking-widest text-sepia hover:text-ink transition-colors"
        >
          back
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

      <div className="tape paper-card rounded-sm p-5 md:p-6 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="font-italic italic text-sepia text-sm">
              your photos
            </div>
            <div className="font-display text-2xl">
              press & hold to reorder ({photos.length}/4)
            </div>
          </div>
          {photos.length > 1 && (
            <button
              onClick={onShuffle}
              className="font-mono font-light text-[10px] tracking-widest uppercase bg-sunset/20 text-ink px-3 py-2 rounded-sm hover:bg-sunset/40 transition-colors border border-sunset/40"
            >
              shuffle
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
                  onClick={() => fileInputRef.current?.click()}
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

      <div className="paper-card rounded-sm p-5 md:p-6 mb-6 grid grid-cols-2 gap-5">
        <div>
          <div className="font-italic italic text-sepia text-xs mb-1">
            orientation
          </div>
          <div className="font-display text-lg mb-3">strip layout</div>
          <div className="flex gap-2">
            <button
              onClick={() => onOrientationChange("vertical")}
              className={`flex-1 py-2 rounded-sm font-mono font-light text-[10px] tracking-[2px] uppercase transition-all border ${
                orientation === "vertical"
                  ? "bg-ink text-cream border-ink"
                  : "bg-transparent text-ink border-sand hover:border-ink"
              }`}
            >
              vertical
            </button>
            <button
              onClick={() => onOrientationChange("horizontal")}
              className={`flex-1 py-2 rounded-sm font-mono font-light text-[10px] tracking-[2px] uppercase transition-all border ${
                orientation === "horizontal"
                  ? "bg-ink text-cream border-ink"
                  : "bg-transparent text-ink border-sand hover:border-ink"
              }`}
            >
              horizontal
            </button>
          </div>
        </div>

        <div>
          <div className="font-italic italic text-sepia text-xs mb-1">
            border
          </div>
          <div className="font-display text-lg mb-3">frame color</div>
          <div className="flex gap-2">
            <button
              onClick={() => onBorderColorChange("white")}
              className={`flex-1 py-2 rounded-sm font-mono font-light text-[10px] tracking-[2px] uppercase transition-all border-2 ${
                borderColor === "white"
                  ? "bg-cream text-ink border-ink"
                  : "bg-transparent text-ink border-sand hover:border-ink"
              }`}
            >
              white
            </button>
            <button
              onClick={() => onBorderColorChange("black")}
              className={`flex-1 py-2 rounded-sm font-mono font-light text-[10px] tracking-[2px] uppercase transition-all border-2 ${
                borderColor === "black"
                  ? "bg-ink text-cream border-ink"
                  : "bg-transparent text-ink border-sand hover:border-ink"
              }`}
            >
              black
            </button>
          </div>
        </div>
      </div>

      <motion.button
        onClick={onGenerate}
        disabled={photos.length === 0}
        whileHover={{ scale: photos.length > 0 ? 1.02 : 1 }}
        whileTap={{ scale: photos.length > 0 ? 0.98 : 1 }}
        className={`w-full py-5 rounded-sm font-mono font-light text-sm tracking-[4px] uppercase transition-all ${
          photos.length === 0
            ? "bg-sand/40 text-faded cursor-not-allowed"
            : "bg-ink text-cream hover:bg-tomato sticker-shadow"
        }`}
      >
        {photos.length === 0 ? "add photos to continue" : "develop my strip"}
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
          edit
        </button>
        <div className="font-mono font-light text-[10px] tracking-[3px] uppercase text-sepia">
          complete
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="font-italic italic text-sepia text-lg mb-1">
          your film strip
        </div>
        <h2 className="font-display text-4xl">fresh out of the darkroom</h2>
      </div>

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
        className="relative mx-auto mb-10 max-w-[420px]"
      >
        <img
          src={resultUrl}
          alt="your film strip"
          className="w-full rounded-sm"
          style={{ boxShadow: "0 20px 60px rgba(58,47,37,0.35)" }}
        />
      </motion.div>

      <div className="flex flex-col gap-3">
        <button onClick={onDownload} className="btn-ink w-full">
          download png
        </button>
        <button onClick={onStartOver} className="btn-outline w-full">
          start over
        </button>
      </div>

      <div className="text-center font-italic italic text-faded text-xs mt-6">
        developed with love · myfilmstrip.com
      </div>
    </motion.section>
  );
}
