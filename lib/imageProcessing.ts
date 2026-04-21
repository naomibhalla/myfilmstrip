// Image processing recipes for 3 vintage film strip styles.

export type FilmStyle = "classic-bw" | "warm-vintage" | "film-camera";

// ========== UTILITIES ==========

const clamp = (v: number) => Math.max(0, Math.min(255, v));

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

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

// ========== LIGHT LEAK (used by film-camera recipe) ==========

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

  const numLeaks = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < numLeaks; i++) {
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

// ========== SUBTLE DUST (for warm-vintage — light, not heavy) ==========

function applySubtleDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  ctx.save();

  // Small scattered dust specks
  for (let i = 0; i < 22; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = rand() * 1.4 + 0.3;
    const alpha = rand() * 0.18 + 0.05;
    const isLight = rand() > 0.5;
    ctx.fillStyle = isLight
      ? `rgba(255, 245, 230, ${alpha})`
      : `rgba(50, 30, 15, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ========== HEAVIER DUST & SCRATCHES (film-camera) ==========

function applyDustScratches(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  ctx.save();

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

// ========== BLUR ==========

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

  ctx.drawImage(img, 0, 0, w, h);
  applyBlur(ctx, 0.4);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrasted = clamp((gray - 128) * 1.3 + 128);
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }
  ctx.putImageData(imgData, 0, 0);

  applyGrain(ctx, w, h, 35, 11);
  applyVignette(ctx, w, h, 0.45);

  return canvas;
}

// ========== RECIPE 2: WARM VINTAGE ==========
// Clean photobooth-style brown tones: B&W base + warm sepia-brown tint
// Contrasty and crisp (not faded or hazy). Light grain + subtle dust.

function recipeWarmVintage(img: HTMLImageElement, w: number, h: number) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, w, h);

  // Step 1: Convert to B&W with a bit of contrast boost (like a real photobooth print)
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Luminosity grayscale
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Slight contrast boost — crisp but not harsh
    const contrasted = clamp((gray - 128) * 1.15 + 128);

    // Step 2: Apply warm sepia-brown tint via per-channel multipliers
    // Classic sepia: red boosted, green mid, blue cut
    const r = clamp(contrasted * 1.02 + 18); // warm shadows
    const g = clamp(contrasted * 0.92 + 8);
    const b = clamp(contrasted * 0.7); // cool tones muted

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  ctx.putImageData(imgData, 0, 0);

  // Step 3: Light grain — noticeable but not heavy
  applyGrain(ctx, w, h, 18, 47);

  // Step 4: Subtle dust specks (no scratches)
  applySubtleDust(ctx, w, h, 53);

  // Step 5: Very subtle vignette for print feel
  applyVignette(ctx, w, h, 0.18);

  return canvas;
}

// ========== RECIPE 3: FILM CAMERA AESTHETIC ==========

function recipeFilmCamera(img: HTMLImageElement, w: number, h: number) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const boost = lum < 128 ? 0.95 : 1.08;
    r = (r - 128) * boost + 128;
    g = (g - 128) * boost + 128;
    b = (b - 128) * boost + 128;

    if (lum < 100) {
      g = g * 1.05;
      r = r * 0.98;
    } else {
      r = r * 1.05;
      b = b * 0.94;
    }

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

  applyGrain(ctx, w, h, 40, 31);
  applyDustScratches(ctx, w, h, 13);
  applyLightLeak(ctx, w, h, "rgba(255,120,80,ALPHA)", 0.5, 17);
  applyLightLeak(ctx, w, h, "rgba(255,200,100,ALPHA)", 0.35, 29);
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
