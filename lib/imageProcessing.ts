// Image processing recipes for 3 vintage film strip styles.
// Each function takes a loaded HTMLImageElement and returns a canvas with effects applied.

export type FilmStyle = "classic-bw" | "warm-vintage" | "film-camera";

// ========== UTILITIES ==========

/** Clamp a value to 0-255 */
const clamp = (v: number) => Math.max(0, Math.min(255, v));

/** Create a canvas at given dimensions */
function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Simple seeded pseudo-random (for consistent grain per style) */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ========== GRAIN / NOISE ==========

function applyGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed = 1
) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const rand = seededRandom(seed);
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * intensity;
    data[i] = clamp(data[i] + n);
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

// ========== VIGNETTE ==========

function applyVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
) {
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.3,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ========== LIGHT LEAK ==========

function applyLightLeak(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  strength: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // 2-3 random warm streaks
  const numLeaks = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < numLeaks; i++) {
    const angle = rand() * Math.PI * 2;
    const cx = rand() * w;
    const cy = rand() * h;
    const r = (rand() * 0.4 + 0.2) * Math.max(w, h);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, color.replace("ALPHA", String(strength)));
    grad.addColorStop(1, color.replace("ALPHA", "0"));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// ========== DUST & SCRATCHES ==========

function applyDustScratches(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  ctx.save();

  // Dust particles
  for (let i = 0; i < 40; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = rand() * 2 + 0.5;
    const alpha = rand() * 0.4 + 0.1;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratches
  for (let i = 0; i < 4; i++) {
    const x1 = rand() * w;
    const y1 = rand() * h;
    const len = rand() * h * 0.3 + 20;
    const angle = (rand() - 0.5) * 0.3 + Math.PI / 2;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    ctx.strokeStyle = `rgba(255,255,255,${rand() * 0.2 + 0.05})`;
    ctx.lineWidth = rand() * 0.8 + 0.3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

// ========== BLUR (simple box blur for softness) ==========

function applyBlur(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.filter = `blur(${radius}px)`;
  const tmp = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(ctx.canvas, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = "none";
}

// ========== RECIPE 1: CLASSIC BLACK & WHITE ==========

function recipeClassicBW(img: HTMLImageElement, w: number, h: number) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  // Draw image
  ctx.drawImage(img, 0, 0, w, h);

  // Slight blur for softness
  applyBlur(ctx, 0.4);

  // Grayscale + increased contrast
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Luminosity grayscale
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Contrast boost (1.3x around midpoint)
    const contrasted = clamp((gray - 128) * 1.3 + 128);
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }
  ctx.putImageData(imgData, 0, 0);

  // Grain
  applyGrain(ctx, w, h, 35, 11);

  // Vignette
  applyVignette(ctx, w, h, 0.45);

  return canvas;
}

// ========== RECIPE 2: WARM VINTAGE ==========

function recipeWarmVintage(img: HTMLImageElement, w: number, h: number) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, w, h);

  // Very light blur
  applyBlur(ctx, 0.25);

  // Warm shift + reduced contrast + faded blacks
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Reduced contrast (0.85x) around midpoint
    r = (r - 128) * 0.85 + 128;
    g = (g - 128) * 0.85 + 128;
    b = (b - 128) * 0.85 + 128;

    // Lift blacks (faded shadows)
    r = r * 0.92 + 22;
    g = g * 0.92 + 18;
    b = b * 0.92 + 10;

    // Warm tint: boost red/yellow, pull blue down
    r = r * 1.08;
    g = g * 1.02;
    b = b * 0.88;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
  ctx.putImageData(imgData, 0, 0);

  // Soft grain
  applyGrain(ctx, w, h, 20, 23);

  // Light warm leak
  applyLightLeak(ctx, w, h, "rgba(255,180,100,ALPHA)", 0.35, 7);

  // Subtle vignette
  applyVignette(ctx, w, h, 0.25);

  return canvas;
}

// ========== RECIPE 3: FILM CAMERA AESTHETIC ==========

function recipeFilmCamera(img: HTMLImageElement, w: number, h: number) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, w, h);

  // Color imbalance + HDR feel
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Light HDR: stretch tonal range
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const boost = lum < 128 ? 0.95 : 1.08;
    r = (r - 128) * boost + 128;
    g = (g - 128) * boost + 128;
    b = (b - 128) * boost + 128;

    // Green-red cast (film tint — pull green up slightly in shadows, red in highlights)
    if (lum < 100) {
      g = g * 1.05;
      r = r * 0.98;
    } else {
      r = r * 1.05;
      b = b * 0.94;
    }

    // Slight crushed blacks
    if (lum < 40) {
      r *= 0.85;
      g *= 0.85;
      b *= 0.85;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
  ctx.putImageData(imgData, 0, 0);

  // Visible grain
  applyGrain(ctx, w, h, 40, 31);

  // Dust & scratches
  applyDustScratches(ctx, w, h, 13);

  // Stronger, more random light leaks
  applyLightLeak(ctx, w, h, "rgba(255,120,80,ALPHA)", 0.5, 17);
  applyLightLeak(ctx, w, h, "rgba(255,200,100,ALPHA)", 0.35, 29);

  // Vignette
  applyVignette(ctx, w, h, 0.35);

  return canvas;
}

// ========== PUBLIC API ==========

export function applyStyle(
  img: HTMLImageElement,
  style: FilmStyle,
  width: number,
  height: number
): HTMLCanvasElement {
  switch (style) {
    case "classic-bw":
      return recipeClassicBW(img, width, height);
    case "warm-vintage":
      return recipeWarmVintage(img, width, height);
    case "film-camera":
      return recipeFilmCamera(img, width, height);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
