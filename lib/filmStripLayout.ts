// Composites processed images into a realistic film strip layout.
// Vertical orientation with sprocket holes on both sides, frame borders, gaps.

import { applyStyle, FilmStyle, loadImage } from "./imageProcessing";

export interface StripOptions {
  imageSrcs: string[];
  style: FilmStyle;
  frameWidth?: number;
  frameHeight?: number;
}

export async function generateFilmStrip(
  opts: StripOptions
): Promise<HTMLCanvasElement> {
  const frameWidth = opts.frameWidth ?? 600;
  const frameHeight = opts.frameHeight ?? 450;

  const sideMargin = 80; // space for perforations
  const topBottomMargin = 50;
  const gap = 14;
  const cornerRadius = 4;

  const stripWidth = frameWidth + sideMargin * 2;
  const stripHeight =
    opts.imageSrcs.length * frameHeight +
    (opts.imageSrcs.length - 1) * gap +
    topBottomMargin * 2;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  const ctx = canvas.getContext("2d")!;

  // Film base color (slightly warm black)
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // Subtle film base texture — barely-there noise
  const noiseImg = ctx.getImageData(0, 0, stripWidth, stripHeight);
  const nd = noiseImg.data;
  for (let i = 0; i < nd.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    nd[i] = Math.max(0, Math.min(255, nd[i] + n));
    nd[i + 1] = Math.max(0, Math.min(255, nd[i + 1] + n));
    nd[i + 2] = Math.max(0, Math.min(255, nd[i + 2] + n));
  }
  ctx.putImageData(noiseImg, 0, 0);

  // Load + process all images
  const loaded = await Promise.all(opts.imageSrcs.map((s) => loadImage(s)));

  // Draw each frame
  for (let i = 0; i < loaded.length; i++) {
    const img = loaded[i];
    const y = topBottomMargin + i * (frameHeight + gap);
    const x = sideMargin;

    // Process this image at frame size (cover-fit crop)
    const processed = await applyStyleCoverFit(
      img,
      opts.style,
      frameWidth,
      frameHeight
    );

    // Inner frame border (subtle lighter edge)
    ctx.fillStyle = "#2a2420";
    ctx.fillRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4);

    // Rounded frame clip
    ctx.save();
    roundedRectPath(ctx, x, y, frameWidth, frameHeight, cornerRadius);
    ctx.clip();
    ctx.drawImage(processed, x, y);
    ctx.restore();
  }

  // Draw sprocket holes (film perforations)
  drawPerforations(ctx, stripWidth, stripHeight, sideMargin);

  // Film edge numbers/labels (tiny, offset)
  drawFilmLabels(ctx, stripWidth, stripHeight, opts.style);

  return canvas;
}

async function applyStyleCoverFit(
  img: HTMLImageElement,
  style: FilmStyle,
  w: number,
  h: number
): Promise<HTMLCanvasElement> {
  // Cover-fit crop: fill the frame, crop overflow
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = w;
  cropCanvas.height = h;
  const cctx = cropCanvas.getContext("2d")!;

  const imgRatio = img.width / img.height;
  const frameRatio = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (imgRatio > frameRatio) {
    // image is wider — crop sides
    sw = img.height * frameRatio;
    sx = (img.width - sw) / 2;
  } else {
    // image is taller — crop top/bottom
    sh = img.width / frameRatio;
    sy = (img.height - sh) / 2;
  }

  cctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  // Wrap cropped into a new Image to feed into applyStyle
  const dataUrl = cropCanvas.toDataURL("image/png");
  const wrapped = await loadImage(dataUrl);
  return applyStyle(wrapped, style, w, h);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPerforations(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  sideMargin: number
) {
  const holeW = 28;
  const holeH = 18;
  const holeSpacing = 32;
  const leftCenterX = sideMargin / 2;
  const rightCenterX = stripW - sideMargin / 2;

  const totalHoles = Math.floor(stripH / holeSpacing);
  const offsetY = (stripH - (totalHoles - 1) * holeSpacing) / 2;

  ctx.fillStyle = "#f5f1e8";
  for (let i = 0; i < totalHoles; i++) {
    const cy = offsetY + i * holeSpacing;
    // Left hole
    roundedRectPath(
      ctx,
      leftCenterX - holeW / 2,
      cy - holeH / 2,
      holeW,
      holeH,
      3
    );
    ctx.fill();
    // Right hole
    roundedRectPath(
      ctx,
      rightCenterX - holeW / 2,
      cy - holeH / 2,
      holeW,
      holeH,
      3
    );
    ctx.fill();
  }
}

function drawFilmLabels(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  style: FilmStyle
) {
  ctx.save();
  ctx.fillStyle = "rgba(245, 241, 232, 0.4)";
  ctx.font = "bold 10px 'Courier New', monospace";

  const labels: Record<FilmStyle, string> = {
    "classic-bw": "ILFORD HP5 400",
    "warm-vintage": "KODAK GOLD 200",
    "film-camera": "CINESTILL 800T",
  };

  // Label at top-left edge (rotated)
  ctx.save();
  ctx.translate(12, 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(labels[style], -30, 0);
  ctx.restore();

  // Date/code at bottom right
  ctx.save();
  ctx.translate(stripW - 12, stripH - 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("• MYFILMSTRIP •", -80, 0);
  ctx.restore();

  ctx.restore();
}
