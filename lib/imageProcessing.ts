// Image processing recipes for 3 vintage film strip styles.
// Each function takes a loaded HTMLImageElement and returns a canvas with effects applied.

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

// Organic grain that varies across the image (not a flat overlay)
// Higher intensity in shadows & highlights, less in midtones (like real film)
function applyOrganicGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseIntensity: number,
  seed = 1
) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const rand = seededRandom(seed);

  // Precompute a low-frequency noise field for grain density variation
  const fieldSize = 64;
  const field = new Float32Array(fieldSize * fieldSize);
  for (let i = 0; i < field.length; i++) {
    field[i] = rand();
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      // Grain amount peaks in shadows & highlights
      const midDistance = Math.abs(lum - 128) / 128; // 0 at mid, 1 at extremes
      const tonalMultiplier = 0.5 + midDistance * 0.8; // 0.5x to 1.3x

      // Low-freq density variation
      const fx = Math.floor((x / w) * fieldSize);
      const fy = Math.floor((y / h) * fieldSize);
      const densityMultiplier = 0.7 + field[fy * fieldSize + fx] * 0.6; // 0.7x to 1.3x

      const amount = baseIntensity * tonalMultiplier * densityMultiplier;
      // Fine grain (finer than flat noise)
      const n = (rand() - 0.5) * amount;

      data[idx] = clamp(data[idx] + n);
      data[idx + 1] = clamp(data[idx + 1] + n * 0.95);
      data[idx + 2] = clamp(data[idx + 2] + n * 0.9);
    }
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

// Subtle warm, asymmetric light leak — not symmetrical, not centered
function applyWarmVintageLeak(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // 1-2 soft leaks in random corners
  const cornerSeeds = [
    { x: w * (0.85 + rand() * 0.2), y: h * (rand() * 0.2) }, // top-right-ish
    { x: w * (rand() * 0.2), y: h * (0.8 + rand() * 0.2) }, // bottom-left-ish
  ];

  cornerSeeds.forEach((corner, i) => {
    const r = Math.max(w, h) * (0.35 + rand() * 0.25);
    const grad = ctx.createRadialGradient(corner.x, corner.y, 0, corner.x, corner.y, r);
    // Soft warm amber — different for each leak
    if (i === 0) {
      grad.addColorStop(0, "rgba(255, 190, 120, 0.28)");
      grad.addColorStop(0.5, "rgba(255, 180, 110, 0.10)");
      grad.addColorStop(1, "rgba(255, 180, 110, 0)");
    } else {
      grad.addColorStop(0, "rgba(240, 160, 90, 0.18)");
      grad.addColorStop(0.6, "rgba(240, 160, 90, 0.06)");
      grad.addColorStop(1, "rgba(240, 160, 90, 0)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });

  ctx.restore();
}

// Uneven exposure — a very subtle low-frequency brightness variation
function applyUnevenExposure(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  // 1-2 very soft bright/dark patches
  ctx.save();

  // Slight brighter patch
  const bx = rand() * w;
  const by = rand() * h;
  const br = Math.max(w, h) * 0.6;
  const brightGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
  brightGrad.addColorStop(0, "rgba(255, 240, 220, 0.08)");
  brightGrad.addColorStop(1, "rgba(255, 240, 220, 0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = brightGrad;
  ctx.fillRect(0, 0, w, h);

  // Slight darker patch
  const dx = rand() * w;
  const dy = rand() * h;
  const dr = Math.max(w, h) * 0.5;
  const darkGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr);
  darkGrad.addColorStop(0, "rgba(60, 45, 30, 0.08)");
  darkGrad.addColorStop(1, "rgba(60, 45, 30, 0)");
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = darkGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
}

// Highlight bloom — brighten already-bright pixels slightly
function applyBloom(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum > 180) {
      const boost = ((lum - 180) / 75) * strength;
      data[i] = clamp(data[i] + boost * 8);
      data[i + 1] = clamp(data[i + 1] + boost * 7);
      data[i + 2] = clamp(data[i + 2] + boost * 5);
    }
  }
  ctx.putImageData(img, 0, 0);
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

// Subtle dust only — no big scratches (for warm vintage, not heavy)
function applySubtleDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 1
) {
  const rand = seededRandom(seed);
  ctx.save();

  // Small, scattered dust specks (fewer, subtler)
  for (let i = 0; i < 25; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = rand() * 1.5 + 0.3;
    const alpha = rand() * 0.2 + 0.05;
    // Mix of light and dark specks for realism
    const isLight = rand() > 0.5;
    ctx.fillStyle = isLight
      ? `rgba(255, 245, 230, ${alpha})`
      : `rgba(60, 40, 20, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Very few, short, faint scratches (not dramatic)
  for (let i = 0; i < 2; i++) {
    const x1 = rand() * w;
    const y1 = rand() * h;
    const len = rand() * h * 0.15 + 10;
    const angle = (rand() - 0.5) * 0.2 + Math.PI / 2;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    ctx.strokeStyle = `rgba(255, 240, 220, ${rand() * 0.1 + 0.03})`;
    ctx.lineWidth = rand() * 0.5 + 0.2;
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

// ========== RECIPE 2: WARM VINTAGE (NEW — scanned photobooth print feel) ==========

function recipeWarmVintage(img: HTMLImageElement, w: number, h: number) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, w, h);

  // Step 1: Very subtle blur — remove digital sharpness
  applyBlur(ctx, 0.35);

  // Step 2: Color & tone — warm brown/yellow shift, lifted blacks, desaturated
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Desaturate slightly (muted, aged look)
    // Convert toward luminosity, but only partially (keep some color)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const desatAmount = 0.25;
    r = r * (1 - desatAmount) + lum * desatAmount;
    g = g * (1 - desatAmount) + lum * desatAmount;
    b = b * (1 - desatAmount) + lum * desatAmount;

    // Reduced contrast (softer)
    r = (r - 128) * 0.82 + 128;
    g = (g - 128) * 0.82 + 128;
    b = (b - 128) * 0.82 + 128;

    // Lift blacks (faded shadows) — nothing sits at pure black
    r = r * 0.9 + 24;
    g = g * 0.9 + 20;
    b = b * 0.9 + 14;

    // Warm brown/yellow shift (gentle sepia, not orange)
    // Boost red and green a bit, drop blue — brown/yellow
    r = r * 1.06 + 4;
    g = g * 1.02 + 2;
    b = b * 0.82;

    // Clamp
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
  ctx.putImageData(imgData, 0, 0);

  // Step 3: Highlight bloom — subtle glow on brights
  applyBloom(ctx, w, h, 1.0);

  // Step 4: Organic, realistic grain (varies across image)
  applyOrganicGrain(ctx, w, h, 22, 47);

  // Step 5: Subtle dust + very faint short scratches
  applySubtleDust(ctx, w, h, 53);

  // Step 6: Uneven exposure (very subtle brightness variation)
  applyUnevenExposure(ctx, w, h, 59);

  // Step 7: Soft warm light leaks (asymmetric)
  applyWarmVintageLeak(ctx, w, h, 61);

  // Step 8: Very soft vignette to darken edges
  applyVignette(ctx, w, h, 0.2);

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
