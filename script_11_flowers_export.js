(function attachStemWarpFlowerSystem11(globalScope) {
  'use strict';

  const OFFSCREEN_POINTER = -10000;
  const MAX_DT_SEC = 0.05;
  const ALWAYS_SWAY_SIM_HZ = 24;
  const ALWAYS_SWAY_SIM_DT_SEC = 1 / ALWAYS_SWAY_SIM_HZ;
  const ALWAYS_SWAY_MAX_STEPS_PER_FRAME = 4;
  const DEFAULT_LILY_SPRITE_PATH = './lily_sprite.webp';
  const DEFAULT_LILY_CLOSED_SPRITE_PATH = './closed_lily.webp';
  const DEFAULT_LILY_CLOSED_SPRITE_COLS = 8;
  const DEFAULT_LILY_CLOSED_SPRITE_ROWS = 1;
  const DEFAULT_LILY_CLOSED_SPRITE_SCALE = 4.1590909091;
  const DEFAULT_BLUE_SPRITE_PATH = './blue_sprite_2_upscaled.webp';

  function shouldDeferViewportHeavyResize() {
    return (
      typeof globalScope.__zeinaShouldDeferViewportHeavyResize === 'function'
      && globalScope.__zeinaShouldDeferViewportHeavyResize() === true
    );
  }

  function viewportDebugLog(...parts) {
    if (typeof globalScope.__zeinaViewportDebugLog === 'function') {
      globalScope.__zeinaViewportDebugLog(...parts);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeHostedAssetPath(path) {
    if (typeof path !== 'string') {
      return path;
    }
    const trimmed = path.trim();
    if (trimmed.length === 0) {
      return trimmed;
    }
    if (/^(?:[a-z]+:)?\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (/^(?:data:|blob:|about:|javascript:)/i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return `.${trimmed}`;
    }
    return trimmed;
  }

  function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function moveToward(current, target, maxStep) {
    if (current < target) {
      return Math.min(current + maxStep, target);
    }
    return Math.max(current - maxStep, target);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutPower(t, power) {
    const safeT = clamp(Number.isFinite(t) ? t : 0, 0, 1);
    const safePower = Number.isFinite(power) ? Math.max(0.01, power) : 2;
    return 1 - Math.pow(1 - safeT, safePower);
  }

  function evaluatePetalToggleAmount(
    startAmount,
    targetAmount,
    progress,
    easePower,
    openBounceAmount = 0,
    openBounceOscillations = 2,
  ) {
    const safeStart = clamp(Number.isFinite(startAmount) ? startAmount : 0, 0, 1);
    const safeTarget = clamp(Number.isFinite(targetAmount) ? targetAmount : 1, 0, 1);
    const safeProgress = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
    const safeEasePower = Number.isFinite(easePower) ? Math.max(0.01, easePower) : 1;
    const safeBounceAmount = Number.isFinite(openBounceAmount) ? Math.max(0, openBounceAmount) : 0;
    const safeBounceOscillations = Number.isFinite(openBounceOscillations)
      ? Math.max(0.25, openBounceOscillations)
      : 2;

    const easedProgress = easeOutPower(safeProgress, safeEasePower);
    let amount = safeStart + (safeTarget - safeStart) * easedProgress;
    const isOpening = safeTarget > safeStart;

    if (isOpening && safeBounceAmount > 0) {
      const bounceStart = 0.55;
      if (safeProgress > bounceStart) {
        const bounceT = (safeProgress - bounceStart) / (1 - bounceStart);
        const wave = Math.sin(bounceT * Math.PI * safeBounceOscillations);
        const envelope = Math.pow(bounceT, 0.9) * Math.pow(1 - bounceT, 0.2);
        amount += safeBounceAmount * wave * envelope;
      }
      return clamp(amount, 0, Math.max(safeStart, safeTarget) + safeBounceAmount);
    }

    return clamp(amount, 0, 1);
  }

  function normalizeAngleRad(angle) {
    if (!Number.isFinite(angle)) {
      return 0;
    }
    let normalized = angle;
    while (normalized > Math.PI) {
      normalized -= Math.PI * 2;
    }
    while (normalized < -Math.PI) {
      normalized += Math.PI * 2;
    }
    return normalized;
  }

  function signedAngleDeltaRad(fromAngle, toAngle) {
    return normalizeAngleRad(toAngle - fromAngle);
  }

  function resolvePetalScreenOffsetsInto(petal, displacementSpace, cosCenter, sinCenter, out) {
    const localOffsetY = petal.screenOffsetY || 0;
    const localOffsetX = petal.screenOffsetX || 0;
    if (displacementSpace === 'flower') {
      out.x = localOffsetX * cosCenter - localOffsetY * sinCenter;
      out.y = localOffsetX * sinCenter + localOffsetY * cosCenter;
      return out;
    }
    out.x = localOffsetX;
    out.y = localOffsetY;
    return out;
  }

  function resolvePetalJumpOffsetRad(petal) {
    return petal.jumpAngleOffsetRad || 0;
  }

  function resolvePetalSwayOffsetRad(flower, petal) {
    let angleOffset = 0;
    const renderHoverInfluence = Number.isFinite(flower.renderHoverInfluence)
      ? flower.renderHoverInfluence
      : (Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0);
    const renderMotionTime = Number.isFinite(flower.renderMotionTime)
      ? flower.renderMotionTime
      : (Number.isFinite(flower.motionTime) ? flower.motionTime : 0);
    const exporterLoopMode = (flower && typeof flower.exporterLoopLockMode === 'string')
      ? flower.exporterLoopLockMode
      : '';
    const exporterLoopPhaseRad = Number.isFinite(flower && flower.exporterLoopPhaseRad)
      ? flower.exporterLoopPhaseRad
      : null;
    if (renderHoverInfluence > 0 && petal.hoverAmplitudeRad) {
      let wave = 0;
      if (exporterLoopMode === 'singleCycle' && exporterLoopPhaseRad !== null) {
        // Use the same per-petal sway equation as live canvas mode so petals are naturally
        // out of phase due to different hoverSpeed values.
        wave = petal.hoverSpeed ? Math.sin(renderMotionTime * petal.hoverSpeed) : 0;
      } else if (exporterLoopMode === 'continuousCycle' && exporterLoopPhaseRad !== null) {
        // Continuous periodic mode: no global settle pause; petals stay in motion
        // using per-petal phase offsets + harmonic mix while remaining perfectly loopable.
        const phaseOffset = Number.isFinite(petal.exporterLoopPhaseWarpRad)
          ? (petal.exporterLoopPhaseWarpRad * 1.65)
          : 0;
        const harmonicMix = Number.isFinite(petal.exporterLoopHarmonicMix)
          ? clamp(petal.exporterLoopHarmonicMix, -0.95, 0.95)
          : 0;
        const baseWave = Math.sin(exporterLoopPhaseRad + phaseOffset);
        const harmonicWave = Math.sin((exporterLoopPhaseRad * 2) + (phaseOffset * 0.6));
        wave = (baseWave + (harmonicWave * harmonicMix)) / (1 + Math.abs(harmonicMix));
      } else if (petal.hoverSpeed) {
        wave = Math.sin(renderMotionTime * petal.hoverSpeed);
      }
      angleOffset += wave * petal.hoverAmplitudeRad * renderHoverInfluence;
    }
    return angleOffset;
  }

  function resolvePetalMotionOffsetRad(flower, petal) {
    return resolvePetalJumpOffsetRad(petal) + resolvePetalSwayOffsetRad(flower, petal);
  }

  function resolvePetalRenderedAngleRad(flower, petal) {
    return (petal.baseAngleRad || 0) + resolvePetalMotionOffsetRad(flower, petal);
  }

  function resolveOverlayHiddenBandBoundsAtY(hiddenBand, y) {
    if (!hiddenBand || !Number.isFinite(hiddenBand.centerX)) {
      return null;
    }
    const topHalfWidthPx = Number.isFinite(hiddenBand.topHalfWidthPx)
      ? Math.max(0, hiddenBand.topHalfWidthPx)
      : (
        Number.isFinite(hiddenBand.halfWidthPx)
          ? Math.max(0, hiddenBand.halfWidthPx)
          : 0
      );
    const bottomHalfWidthPx = Number.isFinite(hiddenBand.bottomHalfWidthPx)
      ? Math.max(0, hiddenBand.bottomHalfWidthPx)
      : topHalfWidthPx;
    const switchY = Number.isFinite(hiddenBand.switchY)
      ? hiddenBand.switchY
      : Number.POSITIVE_INFINITY;
    const useBottom = Number.isFinite(y) && y >= switchY;
    const halfWidthPx = useBottom ? bottomHalfWidthPx : topHalfWidthPx;
    return {
      leftX: hiddenBand.centerX - halfWidthPx,
      rightX: hiddenBand.centerX + halfWidthPx,
    };
  }

  function resolveOverlayHiddenBandInnerBoundsForYRange(hiddenBand, minY, maxY, paddingPx = 0) {
    if (!hiddenBand || !Number.isFinite(hiddenBand.centerX)) {
      return null;
    }
    const safePaddingPx = Number.isFinite(paddingPx) ? Math.max(0, paddingPx) : 0;
    const safeMinY = Number.isFinite(minY) ? minY : 0;
    const safeMaxY = Number.isFinite(maxY) ? maxY : safeMinY;
    const y0 = Math.min(safeMinY, safeMaxY);
    const y1 = Math.max(safeMinY, safeMaxY);
    const topBounds = resolveOverlayHiddenBandBoundsAtY(hiddenBand, y0);
    const bottomBounds = resolveOverlayHiddenBandBoundsAtY(hiddenBand, y1);
    if (!topBounds || !bottomBounds) {
      return null;
    }
    const leftX = Math.max(topBounds.leftX, bottomBounds.leftX) + safePaddingPx;
    const rightX = Math.min(topBounds.rightX, bottomBounds.rightX) - safePaddingPx;
    if (!(leftX < rightX)) {
      return null;
    }
    return { leftX, rightX };
  }

  function isSpriteCircleFullyHiddenInBand(centerX, centerY, radius, hiddenBand, paddingPx = 0) {
    if (
      !Number.isFinite(centerX)
      || !Number.isFinite(centerY)
      || !Number.isFinite(radius)
      || !hiddenBand
      || !Number.isFinite(hiddenBand.centerX)
    ) {
      return false;
    }
    const safeRadius = Math.max(0, radius);
    const innerBounds = resolveOverlayHiddenBandInnerBoundsForYRange(
      hiddenBand,
      centerY - safeRadius,
      centerY + safeRadius,
      paddingPx,
    );
    if (!innerBounds) {
      return false;
    }
    return (
      (centerX - safeRadius) >= innerBounds.leftX
      && (centerX + safeRadius) <= innerBounds.rightX
    );
  }

  function isSpriteCircleFullyInsideAnyHiddenBand(centerX, centerY, radius, hiddenBands, paddingPx = 0) {
    if (!Array.isArray(hiddenBands)) {
      return false;
    }
    for (let _i = 0; _i < hiddenBands.length; _i += 1) {
      if (isSpriteCircleFullyHiddenInBand(centerX, centerY, radius, hiddenBands[_i], paddingPx)) {
        return true;
      }
    }
    return false;
  }

  function resolveSpriteCircleCenterFromDrawTransformInto(
    anchorX,
    anchorY,
    rotationRad,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    out,
  ) {
    const target = out || { x: 0, y: 0 };
    const localCenterX = (Number.isFinite(drawX) ? drawX : 0) + ((Number.isFinite(drawWidth) ? drawWidth : 0) * 0.5);
    const localCenterY = (Number.isFinite(drawY) ? drawY : 0) + ((Number.isFinite(drawHeight) ? drawHeight : 0) * 0.5);
    const angle = Number.isFinite(rotationRad) ? rotationRad : 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    target.x = anchorX + (localCenterX * cosA) - (localCenterY * sinA);
    target.y = anchorY + (localCenterX * sinA) + (localCenterY * cosA);
    return target;
  }

  function sanitizeHiddenSpriteCullRadiusScale(value, fallback = 1) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return clamp(Number.isFinite(fallback) ? fallback : 1, 0.05, 1);
    }
    return clamp(numeric, 0.05, 1);
  }

  function resolveSpriteCircleRadius(drawWidth, drawHeight, radiusScale = 1) {
    const safeWidth = Number.isFinite(drawWidth) ? Math.max(0, drawWidth) : 0;
    const safeHeight = Number.isFinite(drawHeight) ? Math.max(0, drawHeight) : 0;
    return Math.hypot(safeWidth * 0.5, safeHeight * 0.5) * sanitizeHiddenSpriteCullRadiusScale(radiusScale, 1);
  }

  function sanitizeHiddenSpriteCullDebugMode(value) {
    return value === 'all' ? 'all' : 'culled';
  }

  function drawCanvasHiddenSpriteCullDebugCircle(
    ctx,
    hiddenSpriteCullContext,
    centerX,
    centerY,
    radius,
    isCulled,
  ) {
    if (!ctx || !hiddenSpriteCullContext || hiddenSpriteCullContext.debugEnabled !== true) {
      return false;
    }
    if (sanitizeHiddenSpriteCullDebugMode(hiddenSpriteCullContext.debugMode) !== 'all' && isCulled !== true) {
      return false;
    }
    const maxPerFrame = Number.isFinite(hiddenSpriteCullContext.debugMaxPerFrame)
      ? Math.max(1, Math.floor(hiddenSpriteCullContext.debugMaxPerFrame))
      : 400;
    const drawnSoFar = Number.isFinite(hiddenSpriteCullContext.debugDrawnCount)
      ? hiddenSpriteCullContext.debugDrawnCount
      : 0;
    if (drawnSoFar >= maxPerFrame) {
      return false;
    }
    hiddenSpriteCullContext.debugDrawnCount = drawnSoFar + 1;
    const strokeStyle = isCulled
      ? (hiddenSpriteCullContext.debugStrokeCulled || 'rgba(255, 80, 80, 0.65)')
      : (hiddenSpriteCullContext.debugStrokeVisible || 'rgba(90, 220, 120, 0.55)');
    const lineWidth = Number.isFinite(hiddenSpriteCullContext.debugLineWidth)
      ? Math.max(0.25, hiddenSpriteCullContext.debugLineWidth)
      : 1;
    const safeRadius = Number.isFinite(radius) ? Math.max(0.5, radius) : 0.5;
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, safeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  // Viewport sprite culling utilities (per-petal culling outside viewport)
  function resolveFlowerSpriteViewportCullBounds(ctxOrCanvas, paddingPx = 0) {
    const canvas = ctxOrCanvas && ctxOrCanvas.canvas ? ctxOrCanvas.canvas : ctxOrCanvas;
    if (!canvas) {
      return null;
    }
    // Use CSS viewport dimensions (clientWidth/Height), not buffer dimensions (width/height)
    const cssWidth = Number.isFinite(canvas.clientWidth) ? canvas.clientWidth : canvas.width;
    const cssHeight = Number.isFinite(canvas.clientHeight) ? canvas.clientHeight : canvas.height;
    if (!Number.isFinite(cssWidth) || !Number.isFinite(cssHeight)) {
      return null;
    }
    const width = Math.max(0, cssWidth);
    const height = Math.max(0, cssHeight);
    const safePadding = Number.isFinite(paddingPx) ? paddingPx : 0;
    return {
      minX: -safePadding,
      minY: -safePadding,
      maxX: width + safePadding,
      maxY: height + safePadding,
    };
  }

  function isSpriteCircleOutsideViewport(centerX, centerY, radius, bounds) {
    if (!bounds) return false;
    return (
      (centerX + radius) < bounds.minX ||
      (centerY + radius) < bounds.minY ||
      (centerX - radius) > bounds.maxX ||
      (centerY - radius) > bounds.maxY
    );
  }

  function resolveColorToRgbaObject(colorValue, fallback) {
    const fallbackColor = fallback && typeof fallback === 'object'
      ? fallback
      : { r: 255, g: 80, b: 80, a: 0.65 };
    if (typeof colorValue !== 'string') {
      return fallbackColor;
    }
    const raw = colorValue.trim();
    if (raw.length <= 0) {
      return fallbackColor;
    }
    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(`${hex[0]}${hex[0]}`, 16);
        const g = parseInt(`${hex[1]}${hex[1]}`, 16);
        const b = parseInt(`${hex[2]}${hex[2]}`, 16);
        const a = hex.length === 4 ? (parseInt(`${hex[3]}${hex[3]}`, 16) / 255) : 1;
        return { r, g, b, a };
      }
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? (parseInt(hex.slice(6, 8), 16) / 255) : 1;
      return { r, g, b, a };
    }
    const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map((part) => part.trim());
      if (parts.length >= 3) {
        const r = clamp(Math.round(Number(parts[0]) || 0), 0, 255);
        const g = clamp(Math.round(Number(parts[1]) || 0), 0, 255);
        const b = clamp(Math.round(Number(parts[2]) || 0), 0, 255);
        const a = parts.length >= 4 ? clamp(Number(parts[3]) || 0, 0, 1) : 1;
        return { r, g, b, a };
      }
    }
    return fallbackColor;
  }

  function hashSeed(value) {
    const text = String(value);
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function random() {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeRangeInput(value, fallbackMin, fallbackMax) {
    if (Array.isArray(value) && value.length >= 2) {
      const a = Number(value[0]);
      const b = Number(value[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return [Math.min(a, b), Math.max(a, b)];
      }
    }
    if (Number.isFinite(value)) {
      return [value, value];
    }
    return [fallbackMin, fallbackMax];
  }

  function sampleRange(range, rng) {
    const min = Number(range[0]);
    const max = Number(range[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return 0;
    }
    if (max <= min) {
      return min;
    }
    return min + (max - min) * rng();
  }

  function normalizeOneBasedRow(value, maxRows, fallbackOneBased = 1) {
    const safeMax = Number.isFinite(maxRows) ? Math.max(1, Math.floor(maxRows)) : 1;
    const fallback = Number.isFinite(fallbackOneBased)
      ? clamp(Math.floor(fallbackOneBased), 1, safeMax)
      : 1;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return clamp(Math.floor(numeric), 1, safeMax);
  }

  function normalizeOneBasedRowList(values, maxRows) {
    if (!Array.isArray(values)) {
      return [];
    }
    const safeMax = Number.isFinite(maxRows) ? Math.max(1, Math.floor(maxRows)) : 1;
    const out = [];
    for (let i = 0; i < values.length; i += 1) {
      const numeric = Number(values[i]);
      if (!Number.isFinite(numeric)) {
        continue;
      }
      out.push(clamp(Math.floor(numeric), 1, safeMax));
    }
    return out;
  }

  function sanitizeSpritePathPool(values, fallbackPath) {
    const out = [];
    if (Array.isArray(values)) {
      for (let i = 0; i < values.length; i += 1) {
        const raw = values[i];
        if (typeof raw !== 'string') {
          continue;
        }
        const trimmed = raw.trim();
        if (trimmed.length === 0) {
          continue;
        }
        out.push(trimmed);
      }
    }
    const fallback = (typeof fallbackPath === 'string' && fallbackPath.trim().length > 0)
      ? fallbackPath.trim()
      : DEFAULT_BLUE_SPRITE_PATH;
    if (out.length === 0) {
      out.push(fallback);
    }
    return Array.from(new Set(out));
  }

  function loadImage(path) {
    return new Promise((resolve, reject) => {
      const resolvedPath = normalizeHostedAssetPath(path);
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image: ' + resolvedPath));
      image.src = resolvedPath;
    });
  }

  function createCanvasElement(width, height) {
    const safeWidth = Math.max(1, Math.ceil(Number(width) || 1));
    const safeHeight = Math.max(1, Math.ceil(Number(height) || 1));
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = safeWidth;
      canvas.height = safeHeight;
      return canvas;
    }
    if (typeof OffscreenCanvas === 'function') {
      return new OffscreenCanvas(safeWidth, safeHeight);
    }
    throw new Error('Canvas is unavailable in this environment.');
  }

  function getStableToken(endpoint, index) {
    if (endpoint && typeof endpoint.stableKey === 'string' && endpoint.stableKey.length > 0) {
      return endpoint.stableKey;
    }
    return `endpoint:${index}`;
  }

  function sanitizeAssignmentMode(mode) {
    return mode === 'mixed' ? 'mixed' : 'single';
  }

  function sanitizeSwayMode(mode) {
    if (mode === 'influence' || mode === 'wind') {
      return mode;
    }
    return 'always';
  }

  function sanitizeFlowerRendererMode(mode) {
    return mode === 'pixi' ? 'pixi' : 'canvas';
  }

  function sanitizePathKey(value) {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .toLowerCase();
  }

  function normalizeManifestRelativePath(basePath, fileName) {
    const safeFileName = typeof fileName === 'string' ? fileName.trim() : '';
    if (safeFileName.length === 0) {
      return '';
    }
    if (/^(?:https?:)?\/\//i.test(safeFileName) || safeFileName.startsWith('data:')) {
      return safeFileName;
    }
    if (safeFileName.startsWith('/')) {
      return normalizeHostedAssetPath(safeFileName);
    }
    const safeBasePath = typeof basePath === 'string' ? basePath : '';
    const slashIndex = safeBasePath.lastIndexOf('/');
    const baseDir = slashIndex >= 0 ? safeBasePath.slice(0, slashIndex + 1) : '';
    return normalizeHostedAssetPath(`${baseDir}${safeFileName}`);
  }

  function buildFallbackAtlasFileNameCandidates(fileName) {
    if (typeof fileName !== 'string' || fileName.trim().length === 0) {
      return [];
    }
    const trimmed = fileName.trim();
    const out = [trimmed];
    let matchedPattern = false;
    const dePaged = trimmed.replace(/_p\d+(?=\.png$)/i, '');
    const lilyMatch = trimmed.match(/^(flowers_atlas_lily_row_\d+)(?:_p\d+)?\.png$/i);
    if (lilyMatch) {
      out.push(`${lilyMatch[1]}.png`);
      matchedPattern = true;
    }

    const blueMatch = trimmed.match(/^(flowers_atlas_blue_(\d+))(?:_[^.]*)?(?:_p\d+)?\.png$/i);
    if (blueMatch) {
      out.push(`${blueMatch[1]}.png`);
      matchedPattern = true;
    }

    if (!matchedPattern && dePaged !== trimmed) {
      out.push(dePaged);
    }

    return Array.from(new Set(out));
  }

  function sanitizeSingleType(typeName, registry, fallback = 'lily') {
    if (typeof typeName === 'string' && registry[typeName]) {
      return typeName;
    }
    return fallback;
  }

  function sanitizeMixRatios(rawRatios, registry, fallback = 'lily') {
    const out = {};
    if (isPlainObject(rawRatios)) {
      const keys = Object.keys(rawRatios).sort();
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (!registry[key]) {
          continue;
        }
        const weight = Number(rawRatios[key]);
        if (Number.isFinite(weight) && weight > 0) {
          out[key] = weight;
        }
      }
    }
    if (Object.keys(out).length === 0) {
      out[fallback] = 1;
    }
    return out;
  }

  function getSpriteSourceRect(typeConfig, col, row) {
    const spriteCellWidth = Number.isFinite(typeConfig.spriteCellWidth)
      ? Math.max(1, typeConfig.spriteCellWidth)
      : 44;
    const spriteCellHeight = Number.isFinite(typeConfig.spriteCellHeight)
      ? Math.max(1, typeConfig.spriteCellHeight)
      : 45.819;
    const spriteScale = Number.isFinite(typeConfig.spriteScale)
      ? Math.max(0.01, typeConfig.spriteScale)
      : 8.3333333;

    return {
      sx: col * spriteCellWidth * spriteScale,
      sy: row * spriteCellHeight * spriteScale,
      sw: spriteCellWidth * spriteScale,
      sh: spriteCellHeight * spriteScale,
    };
  }

  function resolveCommonFlowerConfig(flowersConfig) {
    const safeConfig = isPlainObject(flowersConfig) ? flowersConfig : {};
    const performanceConfig = isPlainObject(safeConfig.performance) ? safeConfig.performance : {};
    const bakedConfig = isPlainObject(safeConfig.baked) ? safeConfig.baked : {};
    const legacySwayRadius = Number(safeConfig.interactionRadiusFactor);
    const legacySwayRiseSpeed = Number(safeConfig.influenceRiseSpeed);
    const legacySwayFallSpeed = Number(safeConfig.influenceFallSpeed);
    const legacySwayEpsilon = Number(safeConfig.influenceEpsilon);
    const legacyBlueOriginRotate = safeConfig.swayJumpRotateAroundPetalOrigin === true;
    const bakedFlowersEnabled = bakedConfig.enabled === true;
    const bakedManifestPath = (
      typeof bakedConfig.manifestPath === 'string'
      && bakedConfig.manifestPath.trim().length > 0
    )
      ? bakedConfig.manifestPath.trim()
      : './flowers/flowers_atlas_manifest.json';
    const bakedPlaybackFpsRaw = Number(bakedConfig.playbackFps);
    const bakedPlaybackFps = (
      Number.isFinite(bakedPlaybackFpsRaw) && bakedPlaybackFpsRaw > 0
    )
      ? bakedPlaybackFpsRaw
      : 0;
    const bakedPlaybackSpeedMultiplier = Number.isFinite(Number(bakedConfig.playbackSpeedMultiplier))
      ? Math.max(0.01, Number(bakedConfig.playbackSpeedMultiplier))
      : 1;
    const bakedNeutralFrameIndex = Number.isFinite(Number(bakedConfig.neutralFrameIndex))
      ? Math.max(0, Math.floor(Number(bakedConfig.neutralFrameIndex)))
      : null;
    const bakedFrameInterpolationEnabled = bakedConfig.frameInterpolationEnabled === true;
    const bakedAllowFilenameFallback = bakedConfig.allowFilenameFallback !== false;
    const bakedFallbackToLive = bakedConfig.fallbackToLive !== false;
    const bakedForceCanvasRenderer = bakedConfig.forceCanvasRenderer !== false;
    const bakedLogEnabled = bakedConfig.logEnabled === true;
    return {
      drawSize: Number.isFinite(safeConfig.drawSize) ? Math.max(1, safeConfig.drawSize) : 80,
      swayInteractionRadiusFactor: Number.isFinite(safeConfig.swayInteractionRadiusFactor)
        ? Math.max(0, safeConfig.swayInteractionRadiusFactor)
        : (Number.isFinite(legacySwayRadius) ? Math.max(0, legacySwayRadius) : 2.1),
      swayRiseSpeed: Number.isFinite(safeConfig.swayRiseSpeed)
        ? Math.max(0, safeConfig.swayRiseSpeed)
        : (Number.isFinite(legacySwayRiseSpeed) ? Math.max(0, legacySwayRiseSpeed) : 5.5),
      swayFallSpeed: Number.isFinite(safeConfig.swayFallSpeed)
        ? Math.max(0, safeConfig.swayFallSpeed)
        : (Number.isFinite(legacySwayFallSpeed) ? Math.max(0, legacySwayFallSpeed) : 0.5),
      swayEpsilon: Number.isFinite(safeConfig.swayEpsilon)
        ? Math.max(0, safeConfig.swayEpsilon)
        : (Number.isFinite(legacySwayEpsilon) ? Math.max(0, legacySwayEpsilon) : 0.0008),
      mouseSpeedSwayAffect: Number.isFinite(safeConfig.mouseSpeedSwayAffect)
        ? Math.max(0, safeConfig.mouseSpeedSwayAffect)
        : 0.5,
      influenceDynamicCapEnabled: safeConfig.influenceDynamicCapEnabled !== false,
      influenceDynamicCap: Number.isFinite(safeConfig.influenceDynamicCap)
        ? Math.max(0, Math.floor(safeConfig.influenceDynamicCap))
        : 28,
      influenceNoPointerFallBoost: Number.isFinite(safeConfig.influenceNoPointerFallBoost)
        ? Math.max(1, safeConfig.influenceNoPointerFallBoost)
        : 2.5,
      influenceJumpCountsTowardCap: safeConfig.influenceJumpCountsTowardCap !== false,
      blueSwayRotateAroundPetalOrigin: safeConfig.blueSwayRotateAroundPetalOrigin === undefined
        ? legacyBlueOriginRotate
        : safeConfig.blueSwayRotateAroundPetalOrigin === true,
      blueJumpRotateAroundPetalOrigin: safeConfig.blueJumpRotateAroundPetalOrigin === undefined
        ? legacyBlueOriginRotate
        : safeConfig.blueJumpRotateAroundPetalOrigin === true,
      swayJumpRotateAroundPetalOrigin: safeConfig.swayJumpRotateAroundPetalOrigin === true,
      swayMode: sanitizeSwayMode(safeConfig.swayMode),
      jumpEnabled: safeConfig.jumpEnabled !== false,
      jumpInteractionRadiusFactor: Number.isFinite(safeConfig.jumpInteractionRadiusFactor)
        ? Math.max(0, safeConfig.jumpInteractionRadiusFactor)
        : 2.1,
      jumpStrengthDeg: Number.isFinite(safeConfig.jumpStrengthDeg)
        ? Math.max(0, safeConfig.jumpStrengthDeg)
        : 42,
      jumpAttackSpeedDegPerSec: Number.isFinite(safeConfig.jumpAttackSpeedDegPerSec)
        ? Math.max(0, safeConfig.jumpAttackSpeedDegPerSec)
        : 520,
      jumpReturnSpeedDegPerSec: Number.isFinite(safeConfig.jumpReturnSpeedDegPerSec)
        ? Math.max(0, safeConfig.jumpReturnSpeedDegPerSec)
        : 58,
      jumpDistanceExponent: Number.isFinite(safeConfig.jumpDistanceExponent)
        ? Math.max(0.01, safeConfig.jumpDistanceExponent)
        : 1,
      jumpJitterDeg: Number.isFinite(safeConfig.jumpJitterDeg)
        ? Math.max(0, safeConfig.jumpJitterDeg)
        : 6,
      jumpEpsilonDeg: Number.isFinite(safeConfig.jumpEpsilonDeg)
        ? Math.max(0, safeConfig.jumpEpsilonDeg)
        : 0.05,
      backfacing: safeConfig.backfacing === true,
      petalToggleAnimationDurationSec: Number.isFinite(safeConfig.petalToggleAnimationDurationSec)
        ? Math.max(0, safeConfig.petalToggleAnimationDurationSec)
        : 0.42,
      petalToggleAnimationEasePower: Number.isFinite(safeConfig.petalToggleAnimationEasePower)
        ? Math.max(0.01, safeConfig.petalToggleAnimationEasePower)
        : 2.2,
      petalToggleOpenBounceAmount: Number.isFinite(safeConfig.petalToggleOpenBounceAmount)
        ? Math.max(0, safeConfig.petalToggleOpenBounceAmount)
        : 0,
      petalToggleOpenBounceOscillations: Number.isFinite(safeConfig.petalToggleOpenBounceOscillations)
        ? Math.max(0.25, safeConfig.petalToggleOpenBounceOscillations)
        : 2,
      petalToggleSpriteSwapProgress: Number.isFinite(safeConfig.petalToggleSpriteSwapProgress)
        ? clamp(safeConfig.petalToggleSpriteSwapProgress, 0, 1)
        : 0.14,
      petalToggleEdgePairFlipEnabled: safeConfig.petalToggleEdgePairFlipEnabled === true,
      petalToggleEdgePairFlipBackProgress: Number.isFinite(safeConfig.petalToggleEdgePairFlipBackProgress)
        ? clamp(safeConfig.petalToggleEdgePairFlipBackProgress, 0, 1)
        : 0.5,
      petalToggleEdgePairUseInnerSpritesEnabled: safeConfig.petalToggleEdgePairUseInnerSpritesEnabled === true,
      petalTogglePairSpeedDisparityEnabled: safeConfig.petalTogglePairSpeedDisparityEnabled === true,
      petalTogglePairSpeedStep: Number.isFinite(safeConfig.petalTogglePairSpeedStep)
        ? Math.max(0, safeConfig.petalTogglePairSpeedStep)
        : 0.2,
      petalTogglePairSpeedCurve: Number.isFinite(safeConfig.petalTogglePairSpeedCurve)
        ? clamp(safeConfig.petalTogglePairSpeedCurve, 0, 1)
        : 0,
      activeLayerCacheEnabled: performanceConfig.activeLayerCacheEnabled !== false,
      viewportCullingEnabled: safeConfig.viewportCullingEnabled !== false,
      swayFastPathEnabled: safeConfig.swayFastPathEnabled !== false,
      renderer: (
        bakedFlowersEnabled && bakedForceCanvasRenderer
          ? 'canvas'
          : sanitizeFlowerRendererMode(safeConfig.renderer || 'pixi')
      ),
      pixiEnabled: safeConfig.pixiEnabled !== false,
      alwaysAnimatedCacheEnabled: safeConfig.alwaysAnimatedCacheEnabled !== false,
      alwaysAnimatedCacheFps: Number.isFinite(safeConfig.alwaysAnimatedCacheFps)
        ? Math.max(1, safeConfig.alwaysAnimatedCacheFps)
        : 12,
      swaySpriteDebugEnabled: safeConfig.swaySpriteDebugEnabled === true,
      swaySpriteDebugFrameStep: Number.isFinite(safeConfig.swaySpriteDebugFrameStep)
        ? Math.max(1, Math.floor(safeConfig.swaySpriteDebugFrameStep))
        : 1,
      assignmentMode: sanitizeAssignmentMode(safeConfig.assignmentMode),
      singleType: typeof safeConfig.singleType === 'string' ? safeConfig.singleType : 'lily',
      mixRatios: isPlainObject(safeConfig.mixRatios) ? safeConfig.mixRatios : { lily: 1 },
      bakedFlowersEnabled,
      bakedManifestPath,
      bakedPlaybackFps,
      bakedPlaybackSpeedMultiplier,
      bakedNeutralFrameIndex,
      bakedFrameInterpolationEnabled,
      bakedAllowFilenameFallback,
      bakedFallbackToLive,
      bakedForceCanvasRenderer,
      bakedLogEnabled,
    };
  }

  function getTypeConfigs(flowersConfig) {
    if (!isPlainObject(flowersConfig) || !isPlainObject(flowersConfig.types)) {
      return {};
    }
    return flowersConfig.types;
  }

  function createDefaultLilyPairRotationDegByRowPair() {
    const out = {};
    for (let row = 1; row <= 8; row += 1) {
      out[row] = { 1: 0, 2: 0, 3: 0 };
    }
    return out;
  }

  function createDefaultLilyPairDisplacementYByRowPair() {
    const out = {};
    for (let row = 1; row <= 8; row += 1) {
      out[row] = {
        1: { right: 0, left: 0 },
        2: { right: 0, left: 0 },
        3: { right: 0, left: 0 },
      };
    }
    return out;
  }

  function createDefaultLilyPairDisplacementXByRowPair() {
    const out = {};
    for (let row = 1; row <= 8; row += 1) {
      out[row] = {
        1: { right: 0, left: 0 },
        2: { right: 0, left: 0 },
        3: { right: 0, left: 0 },
      };
    }
    return out;
  }

  function getLilyPairRotationOffsetDeg(typeConfig, rowOneBased, pairOneBased) {
    if (!isPlainObject(typeConfig) || !isPlainObject(typeConfig.pairRotationDegByRowPair)) {
      return 0;
    }
    const byRow = typeConfig.pairRotationDegByRowPair;
    const rowEntry = byRow[rowOneBased] !== undefined
      ? byRow[rowOneBased]
      : byRow[String(rowOneBased)];
    if (!isPlainObject(rowEntry)) {
      return 0;
    }

    const rawValue = rowEntry[pairOneBased] !== undefined
      ? rowEntry[pairOneBased]
      : rowEntry[String(pairOneBased)];
    const numericValue = Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  function getLilyPairDisplacementOffsets(typeConfig, mapKey, rowOneBased, pairOneBased) {
    if (!isPlainObject(typeConfig) || !isPlainObject(typeConfig[mapKey])) {
      return { right: 0, left: 0 };
    }
    const byRow = typeConfig[mapKey];
    const rowEntry = byRow[rowOneBased] !== undefined
      ? byRow[rowOneBased]
      : byRow[String(rowOneBased)];
    if (!isPlainObject(rowEntry)) {
      return { right: 0, left: 0 };
    }

    const pairEntry = rowEntry[pairOneBased] !== undefined
      ? rowEntry[pairOneBased]
      : rowEntry[String(pairOneBased)];

    if (isPlainObject(pairEntry)) {
      const right = Number(pairEntry.right);
      const left = Number(pairEntry.left);
      return {
        right: Number.isFinite(right) ? right : 0,
        left: Number.isFinite(left) ? left : 0,
      };
    }

    // Supports scalar inputs too (applies equally to both sides).
    const scalar = Number(pairEntry);
    if (!Number.isFinite(scalar)) {
      return { right: 0, left: 0 };
    }
    return { right: scalar, left: scalar };
  }

  function getLilyPairDisplacementYOffsets(typeConfig, rowOneBased, pairOneBased) {
    return getLilyPairDisplacementOffsets(
      typeConfig,
      'pairDisplacementYByRowPair',
      rowOneBased,
      pairOneBased,
    );
  }

  function getLilyPairDisplacementXOffsets(typeConfig, rowOneBased, pairOneBased) {
    return getLilyPairDisplacementOffsets(
      typeConfig,
      'pairDisplacementXByRowPair',
      rowOneBased,
      pairOneBased,
    );
  }

  function resolveLilyTypeConfig(flowersConfig) {
    const safeConfig = isPlainObject(flowersConfig) ? flowersConfig : {};
    const typeConfigs = getTypeConfigs(safeConfig);
    const lilyTypeConfig = isPlainObject(typeConfigs.lily) ? typeConfigs.lily : {};

    const legacyTopLevel = {
      method: safeConfig.method,
      spritePath: safeConfig.spritePath,
      spriteCellWidth: safeConfig.spriteCellWidth,
      spriteCellHeight: safeConfig.spriteCellHeight,
      spriteScale: safeConfig.spriteScale,
      spriteCols: safeConfig.spriteCols,
      spriteRows: safeConfig.spriteRows,
      spriteRow: safeConfig.spriteRow,
      petalCountRange: safeConfig.petalCountRange,
      alignToBranchDirection: safeConfig.alignToBranchDirection,
      alignmentDamping: safeConfig.alignmentDamping,
      petalBaseCenterDeg: safeConfig.petalBaseCenterDeg,
      petalSpreadDeg: safeConfig.petalSpreadDeg,
      pairRotationDegByRowPair: safeConfig.pairRotationDegByRowPair,
      pairDisplacementYByRowPair: safeConfig.pairDisplacementYByRowPair,
      pairDisplacementXByRowPair: safeConfig.pairDisplacementXByRowPair,
      displacementSpace: safeConfig.displacementSpace,
      stamenRowMode: safeConfig.stamenRowMode,
      stamenFixedRow: safeConfig.stamenFixedRow,
      stamenCount: safeConfig.stamenCount,
      stamenAdditionalMode: safeConfig.stamenAdditionalMode,
      stamenRowList: safeConfig.stamenRowList,
      closedUseMiddlePetalSprite: safeConfig.closedUseMiddlePetalSprite,
      closedSpritePath: safeConfig.closedSpritePath,
      closedSpriteCols: safeConfig.closedSpriteCols,
      closedSpriteRows: safeConfig.closedSpriteRows,
      closedSpriteScale: safeConfig.closedSpriteScale,
      hoverAmplitudeDegRange: safeConfig.hoverAmplitudeDegRange,
      hoverSpeedRange: safeConfig.hoverSpeedRange,
    };

    const defaults = {
      method: 'sweep',
      spritePath: DEFAULT_LILY_SPRITE_PATH,
      spriteCellWidth: 44,
      spriteCellHeight: 44,
      spriteScale: 8.3333333,
      spriteCols: 8,
      spriteRows: 8,
      spriteRow: 1,
      petalCountRange: [5, 6],
      alignToBranchDirection: true,
      alignmentDamping: 0,
      petalBaseCenterDeg: 0,
      petalSpreadDeg: 45,
      pairRotationDegByRowPair: createDefaultLilyPairRotationDegByRowPair(),
      pairDisplacementYByRowPair: createDefaultLilyPairDisplacementYByRowPair(),
      pairDisplacementXByRowPair: createDefaultLilyPairDisplacementXByRowPair(),
      displacementSpace: 'flower',
      stamenRowMode: 'petalRow', // petalRow | fixedRow
      stamenFixedRow: 1, // 1-based row
      stamenCount: 1, // total stamens per flower
      stamenAdditionalMode: 'randomRows', // randomRows | rowList
      stamenRowList: [1], // 1-based rows used when stamenAdditionalMode='rowList'
      closedUseMiddlePetalSprite: false, // if true, closed lilies use closed sprite sheet variants
      closedSpritePath: DEFAULT_LILY_CLOSED_SPRITE_PATH,
      closedSpriteCols: DEFAULT_LILY_CLOSED_SPRITE_COLS,
      closedSpriteRows: DEFAULT_LILY_CLOSED_SPRITE_ROWS,
      closedSpriteScale: DEFAULT_LILY_CLOSED_SPRITE_SCALE,
      hoverAmplitudeDegRange: [2, 6],
      hoverSpeedRange: [2.2, 4.2],
    };

    return {
      ...defaults,
      ...legacyTopLevel,
      ...lilyTypeConfig,
    };
  }

  function resolveBlueTypeConfig(flowersConfig) {
    const safeConfig = isPlainObject(flowersConfig) ? flowersConfig : {};
    const typeConfigs = getTypeConfigs(safeConfig);
    const blueTypeConfig = isPlainObject(typeConfigs.blue) ? typeConfigs.blue : {};

    const defaults = {
      spritePath: DEFAULT_BLUE_SPRITE_PATH,
      spritePathPool: [DEFAULT_BLUE_SPRITE_PATH],
      spriteCellWidth: 44,
      spriteCellHeight: 44,
      spriteScale: 8.3333333,
      spriteCols: 10,
      spriteRows: 10,
      baseSize: 60,
      density: 80,
      centerBiasExponent: 1.6,
      pointDrawSize: 18,
      drawOrder: 'outerFirst', // outerFirst | random
      hoverAmplitudeDegRange: [2, 6],
      hoverSpeedRange: [2.2, 4.2],
    };

    const resolved = {
      ...defaults,
      ...blueTypeConfig,
    };
    const rawSpritePathPool = blueTypeConfig.spritePathPool !== undefined
      ? blueTypeConfig.spritePathPool
      : (
        typeof blueTypeConfig.spritePath === 'string' && blueTypeConfig.spritePath.length > 0
          ? [blueTypeConfig.spritePath]
          : defaults.spritePathPool
      );
    resolved.spritePathPool = sanitizeSpritePathPool(rawSpritePathPool, resolved.spritePath);
    resolved.spritePath = resolved.spritePathPool[0] || DEFAULT_BLUE_SPRITE_PATH;
    return resolved;
  }

  function resolveLilyCenterDeg(endpoint, typeConfig) {
    const alignToBranchDirection = typeConfig.alignToBranchDirection !== false;
    const alignmentDamping = Number.isFinite(typeConfig.alignmentDamping)
      ? clamp(typeConfig.alignmentDamping, 0, 1)
      : 0;
    const alignmentInfluence = 1 - alignmentDamping;
    const branchDirectionDeg = endpoint && Number.isFinite(endpoint.tangentDeg)
      ? endpoint.tangentDeg
      : 0;
    const petalBaseCenterDeg = Number.isFinite(typeConfig.petalBaseCenterDeg)
      ? typeConfig.petalBaseCenterDeg
      : 0;

    if (!alignToBranchDirection) {
      return petalBaseCenterDeg;
    }
    return petalBaseCenterDeg + branchDirectionDeg * alignmentInfluence;
  }

  function resolveLilyAssetPath(typeConfig) {
    return (typeof typeConfig.spritePath === 'string' && typeConfig.spritePath.length > 0)
      ? typeConfig.spritePath
      : DEFAULT_LILY_SPRITE_PATH;
  }

  function resolveLilyClosedAssetPath(typeConfig) {
    return (typeof typeConfig.closedSpritePath === 'string' && typeConfig.closedSpritePath.length > 0)
      ? typeConfig.closedSpritePath
      : DEFAULT_LILY_CLOSED_SPRITE_PATH;
  }

  function resolveLilyClosedSpriteCols(typeConfig) {
    return Number.isFinite(typeConfig.closedSpriteCols)
      ? Math.max(1, Math.floor(typeConfig.closedSpriteCols))
      : DEFAULT_LILY_CLOSED_SPRITE_COLS;
  }

  function resolveLilyClosedSpriteRows(typeConfig) {
    return Number.isFinite(typeConfig.closedSpriteRows)
      ? Math.max(1, Math.floor(typeConfig.closedSpriteRows))
      : DEFAULT_LILY_CLOSED_SPRITE_ROWS;
  }

  function resolveLilyClosedSpriteScale(typeConfig) {
    return Number.isFinite(typeConfig.closedSpriteScale)
      ? Math.max(0.01, typeConfig.closedSpriteScale)
      : DEFAULT_LILY_CLOSED_SPRITE_SCALE;
  }

  function getLilyClosedSpriteSourceRect(typeConfig, col, row) {
    return getSpriteSourceRect(
      {
        ...typeConfig,
        spriteScale: resolveLilyClosedSpriteScale(typeConfig),
      },
      col,
      row,
    );
  }

  function sampleLilyClosedSpriteCell(typeConfig, rng) {
    const cols = resolveLilyClosedSpriteCols(typeConfig);
    const rows = resolveLilyClosedSpriteRows(typeConfig);
    const safeRandom = typeof rng === 'function' ? rng : Math.random;
    return {
      col: clamp(Math.floor(safeRandom() * cols), 0, Math.max(0, cols - 1)),
      row: clamp(Math.floor(safeRandom() * rows), 0, Math.max(0, rows - 1)),
    };
  }

  function resolveBlueAssetPaths(typeConfig) {
    const fallbackPath = (typeof typeConfig.spritePath === 'string' && typeConfig.spritePath.length > 0)
      ? typeConfig.spritePath
      : DEFAULT_BLUE_SPRITE_PATH;
    return sanitizeSpritePathPool(typeConfig.spritePathPool, fallbackPath);
  }

  function resolveBlueAssetPath(typeConfig, rng = null) {
    const assetPaths = resolveBlueAssetPaths(typeConfig);
    if (assetPaths.length === 0) {
      return DEFAULT_BLUE_SPRITE_PATH;
    }
    if (typeof rng === 'function' && assetPaths.length > 1) {
      const index = clamp(Math.floor(rng() * assetPaths.length), 0, assetPaths.length - 1);
      return assetPaths[index];
    }
    return assetPaths[0];
  }

  function resolveLilyMiddlePetalColumn(typeConfig) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 8;
    const sweepColumnCount = Math.max(1, Math.min(7, spriteCols));
    return Math.floor((sweepColumnCount - 1) * 0.5);
  }

  function resolveLilyPairDistanceFromCenter(typeConfig, col) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 8;
    const sweepColumnCount = Math.max(1, Math.min(7, spriteCols));
    const centerCol = Math.floor((sweepColumnCount - 1) * 0.5);
    const safeCol = clamp(Math.floor(col), 0, Math.max(0, sweepColumnCount - 1));
    return Math.abs(safeCol - centerCol);
  }

  function resolveLilyMaxPairDistance(typeConfig) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 8;
    const sweepColumnCount = Math.max(1, Math.min(7, spriteCols));
    return Math.max(1, Math.floor((sweepColumnCount - 1) * 0.5));
  }

  function buildLilyLegacyFlower(endpoint, typeConfig, commonConfig, rng) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 20;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 8;
    const exporterRowOverrideIndex = resolveExporterRowOverrideIndex(typeConfig, spriteRows);
    const spriteRow = Number.isFinite(typeConfig.spriteRow)
      ? Math.max(0, Math.floor(typeConfig.spriteRow))
      : 1;
    const resolvedSpriteRow = exporterRowOverrideIndex !== null
      ? exporterRowOverrideIndex
      : spriteRow;
    const petalCountRange = normalizeRangeInput(typeConfig.petalCountRange, 5, 6);
    const minPetalCount = Math.max(1, Math.floor(petalCountRange[0]));
    const maxPetalCount = Math.max(minPetalCount, Math.floor(petalCountRange[1]));
    const petalSpreadDeg = Number.isFinite(typeConfig.petalSpreadDeg)
      ? Math.max(0, typeConfig.petalSpreadDeg)
      : 75;
    const hoverAmplitudeDegRange = normalizeRangeInput(typeConfig.hoverAmplitudeDegRange, 2, 6);
    const hoverSpeedRange = normalizeRangeInput(typeConfig.hoverSpeedRange, 2.2, 4.2);

    const petalCount = maxPetalCount <= minPetalCount
      ? minPetalCount
      : (minPetalCount + Math.floor(rng() * (maxPetalCount - minPetalCount + 1)));

    const centerDeg = resolveLilyCenterDeg(endpoint, typeConfig);
    const petals = [];

    for (let i = 0; i < petalCount; i += 1) {
      const col = Math.min(spriteCols - 1, Math.floor(rng() * spriteCols));
      const divisor = Math.max(1, petalCount / 4);
      const centeredIndex = i - (petalCount - 1) * 0.5;
      const wave = Math.sin(centeredIndex / divisor);
      const petalAngleDeg = centerDeg + wave * petalSpreadDeg;

      petals.push({
        col,
        row: resolvedSpriteRow,
        baseAngleRad: degToRad(petalAngleDeg),
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    return {
      petals,
      assetPath: resolveLilyAssetPath(typeConfig),
      centerAngleRad: degToRad(centerDeg),
      interactionRadius: commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
    };
  }

  function buildLilySweepFlower(endpoint, typeConfig, commonConfig, rng) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 8;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 8;
    const petalSpreadDeg = Number.isFinite(typeConfig.petalSpreadDeg)
      ? Math.max(0, typeConfig.petalSpreadDeg)
      : 75;
    const hoverAmplitudeDegRange = normalizeRangeInput(typeConfig.hoverAmplitudeDegRange, 2, 6);
    const hoverSpeedRange = normalizeRangeInput(typeConfig.hoverSpeedRange, 2.2, 4.2);
    const exporterRowOverrideIndex = resolveExporterRowOverrideIndex(typeConfig, spriteRows);

    const centerDeg = resolveLilyCenterDeg(endpoint, typeConfig);
    const sweepColumnCount = Math.max(1, Math.min(7, spriteCols));
    const centerColumnIndex = spriteCols >= 8 ? 7 : -1;
    const randomRowCount = Math.max(1, Math.min(7, spriteRows));

    function sampleRowIndex() {
      if (exporterRowOverrideIndex !== null) {
        return exporterRowOverrideIndex;
      }
      return Math.floor(rng() * randomRowCount);
    }

    const petals = [];
    let centerPetalInserted = false;
    const middleColumnIndex = Math.floor((sweepColumnCount - 1) * 0.5);

    for (let col = 0; col < sweepColumnCount; col += 1) {
      const t = sweepColumnCount <= 1 ? 0.5 : (col / (sweepColumnCount - 1));
      const wave = Math.cos((1 - t) * Math.PI);

      if (!centerPetalInserted && centerColumnIndex >= 0 && col === middleColumnIndex) {
        petals.push({
          col: centerColumnIndex,
          row: sampleRowIndex(),
          baseAngleRad: degToRad(centerDeg),
          hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
          hoverSpeed: sampleRange(hoverSpeedRange, rng),
        });
        centerPetalInserted = true;
      }

      const petalAngleDeg = centerDeg + wave * petalSpreadDeg;
      petals.push({
        col,
        row: sampleRowIndex(),
        baseAngleRad: degToRad(petalAngleDeg),
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    if (!centerPetalInserted && centerColumnIndex >= 0) {
      petals.push({
        col: centerColumnIndex,
        row: sampleRowIndex(),
        baseAngleRad: degToRad(centerDeg),
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    return {
      petals,
      assetPath: resolveLilyAssetPath(typeConfig),
      centerAngleRad: degToRad(centerDeg),
      interactionRadius: commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
    };
  }

  function buildLilySweep2Flower(endpoint, typeConfig, commonConfig, rng) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 8;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 8;
    const petalSpreadDeg = Number.isFinite(typeConfig.petalSpreadDeg)
      ? Math.max(0, typeConfig.petalSpreadDeg)
      : 75;
    const hoverAmplitudeDegRange = normalizeRangeInput(typeConfig.hoverAmplitudeDegRange, 2, 6);
    const hoverSpeedRange = normalizeRangeInput(typeConfig.hoverSpeedRange, 2.2, 4.2);
    const exporterRowOverrideIndex = resolveExporterRowOverrideIndex(typeConfig, spriteRows);

    const centerDeg = resolveLilyCenterDeg(endpoint, typeConfig);
    const sweepColumnCount = Math.max(1, Math.min(7, spriteCols));
    const centerColumnIndex = spriteCols >= 8 ? 7 : -1;
    const randomRowCount = Math.max(1, Math.min(7, spriteRows));
    const selectedRow = exporterRowOverrideIndex !== null
      ? exporterRowOverrideIndex
      : Math.floor(rng() * randomRowCount);

    const petals = [];
    let centerPetalInserted = false;
    const middleColumnIndex = Math.floor((sweepColumnCount - 1) * 0.5);

    for (let col = 0; col < sweepColumnCount; col += 1) {
      const t = sweepColumnCount <= 1 ? 0.5 : (col / (sweepColumnCount - 1));
      const wave = Math.cos((1 - t) * Math.PI);

      if (!centerPetalInserted && centerColumnIndex >= 0 && col === middleColumnIndex) {
        petals.push({
          col: centerColumnIndex,
          row: selectedRow,
          baseAngleRad: degToRad(centerDeg),
          hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
          hoverSpeed: sampleRange(hoverSpeedRange, rng),
        });
        centerPetalInserted = true;
      }

      const petalAngleDeg = centerDeg + wave * petalSpreadDeg;
      petals.push({
        col,
        row: selectedRow,
        baseAngleRad: degToRad(petalAngleDeg),
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    if (!centerPetalInserted && centerColumnIndex >= 0) {
      petals.push({
        col: centerColumnIndex,
        row: selectedRow,
        baseAngleRad: degToRad(centerDeg),
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    return {
      petals,
      assetPath: resolveLilyAssetPath(typeConfig),
      centerAngleRad: degToRad(centerDeg),
      interactionRadius: commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
    };
  }

  function buildLilySweep3Flower(endpoint, typeConfig, commonConfig, rng) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 8;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 8;
    if (spriteCols < 8) {
      return buildLilySweep2Flower(endpoint, typeConfig, commonConfig, rng);
    }

    const petalSpreadDeg = Number.isFinite(typeConfig.petalSpreadDeg)
      ? Math.max(0, typeConfig.petalSpreadDeg)
      : 75;
    const hoverAmplitudeDegRange = normalizeRangeInput(typeConfig.hoverAmplitudeDegRange, 2, 6);
    const hoverSpeedRange = normalizeRangeInput(typeConfig.hoverSpeedRange, 2.2, 4.2);
    const exporterRowOverrideIndex = resolveExporterRowOverrideIndex(typeConfig, spriteRows);

    const centerDeg = resolveLilyCenterDeg(endpoint, typeConfig);
    const randomRowCount = Math.max(1, Math.min(7, spriteRows));
    const selectedRow = exporterRowOverrideIndex !== null
      ? exporterRowOverrideIndex
      : Math.floor(rng() * randomRowCount);

    const centerCol = 3; // Column 4 in 1-based indexing.
    const rightCols = [4, 5, 6]; // Columns 5, 6, 7.
    const leftCols = [2, 1, 0]; // Columns 3, 2, 1.
    const stamenCol = Math.max(0, spriteCols - 1); // Last column, dynamic.
    const stamenRowMode = typeConfig.stamenRowMode === 'fixedRow' ? 'fixedRow' : 'petalRow';
    const stamenAdditionalMode = typeConfig.stamenAdditionalMode === 'rowList'
      ? 'rowList'
      : 'randomRows';
    const stamenCount = Number.isFinite(typeConfig.stamenCount)
      ? Math.max(1, Math.floor(typeConfig.stamenCount))
      : 1;
    const fixedStamenRowIndex = normalizeOneBasedRow(typeConfig.stamenFixedRow, spriteRows, 1) - 1;
    const stamenRowListOneBased = normalizeOneBasedRowList(typeConfig.stamenRowList, spriteRows);

    function pushPetal(col, angleDeg, screenOffsetY = 0, screenOffsetX = 0, rowOverride = selectedRow) {
      const safeCol = clamp(Math.floor(col), 0, Math.max(0, spriteCols - 1));
      const safeRow = clamp(Math.floor(rowOverride), 0, Math.max(0, spriteRows - 1));
      petals.push({
        col: safeCol,
        row: safeRow,
        baseAngleRad: degToRad(angleDeg),
        screenOffsetY,
        screenOffsetX,
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    // Map cosine (-1..1) to (0..1) over center + 3 outward steps.
    function getSpreadFactor(stepIndex) {
      const totalSteps = 4;
      const t = totalSteps <= 1 ? 0 : (stepIndex / (totalSteps - 1));
      const cosineValue = Math.cos((1 - t) * Math.PI);
      return (cosineValue + 1) * 0.5;
    }

    const petals = [];
    const stamenRows = [];
    const primaryStamenRow = stamenRowMode === 'fixedRow' ? fixedStamenRowIndex : selectedRow;
    stamenRows.push(primaryStamenRow);
    for (let i = 1; i < stamenCount; i += 1) {
      if (stamenAdditionalMode === 'rowList' && stamenRowListOneBased.length > 0) {
        const oneBasedRow = stamenRowListOneBased[(i - 1) % stamenRowListOneBased.length];
        stamenRows.push(oneBasedRow - 1);
      } else {
        stamenRows.push(Math.floor(rng() * Math.max(1, spriteRows)));
      }
    }

    // Start from center (column 4).
    pushPetal(centerCol, centerDeg);

    // Then draw symmetric pairs outward: 5/3, 6/2, 7/1.
    for (let pairIndex = 0; pairIndex < 3; pairIndex += 1) {
      const pairNumber = pairIndex + 1;
      const spreadFactor = getSpreadFactor(pairIndex + 1);
      const spread = petalSpreadDeg * spreadFactor;
      const pairRotationOffsetDeg = getLilyPairRotationOffsetDeg(
        typeConfig,
        selectedRow + 1,
        pairNumber,
      );
      const pairDisplacementYOffsets = getLilyPairDisplacementYOffsets(
        typeConfig,
        selectedRow + 1,
        pairNumber,
      );
      const pairDisplacementXOffsets = getLilyPairDisplacementXOffsets(
        typeConfig,
        selectedRow + 1,
        pairNumber,
      );

      // Draw stamen(s) from the dynamic last column before the final pair (7/1).
      if (pairIndex === 2) {
        for (let s = 0; s < stamenRows.length; s += 1) {
          pushPetal(stamenCol, centerDeg, 0, 0, stamenRows[s]);
        }
      }

      pushPetal(
        rightCols[pairIndex],
        centerDeg + spread + pairRotationOffsetDeg,
        -pairDisplacementYOffsets.right,
        pairDisplacementXOffsets.right,
      );
      pushPetal(
        leftCols[pairIndex],
        centerDeg - spread - pairRotationOffsetDeg,
        -pairDisplacementYOffsets.left,
        -pairDisplacementXOffsets.left,
      );
    }

    return {
      petals,
      assetPath: resolveLilyAssetPath(typeConfig),
      centerAngleRad: degToRad(centerDeg),
      interactionRadius: commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
    };
  }

  function buildLilyFlower(endpoint, typeConfig, commonConfig, rng) {
    const method = typeConfig.method === 'legacy'
      ? 'legacy'
      : (typeConfig.method === 'sweep2'
        ? 'sweep2'
        : (typeConfig.method === 'sweep3' ? 'sweep3' : 'sweep'));
    if (method === 'legacy') {
      return buildLilyLegacyFlower(endpoint, typeConfig, commonConfig, rng);
    }
    if (method === 'sweep2') {
      return buildLilySweep2Flower(endpoint, typeConfig, commonConfig, rng);
    }
    if (method === 'sweep3') {
      return buildLilySweep3Flower(endpoint, typeConfig, commonConfig, rng);
    }
    return buildLilySweepFlower(endpoint, typeConfig, commonConfig, rng);
  }

  function resolveFlowerGrowthScaleFactor(flower) {
    const value = Number(flower && flower.growthScale);
    if (!Number.isFinite(value)) {
      return 1;
    }
    return Math.max(0.0001, value);
  }

  function resolveFlowerGrowthPositionScaleFactor(flower) {
    const value = Number(flower && flower.growthPositionScale);
    if (!Number.isFinite(value)) {
      return 1;
    }
    return Math.max(0.0001, value);
  }

  function resolveLilyRuntimePetalOpenAmount(runtimeState, flower) {
    if (
      runtimeState
      && typeof runtimeState.getPetalOpenAmountForBranchId === 'function'
      && flower
      && Number.isFinite(flower.branchId)
    ) {
      return clamp(runtimeState.getPetalOpenAmountForBranchId(flower.branchId), 0, 1);
    }
    if (runtimeState && typeof runtimeState.getPetalOpenAmount === 'function') {
      return clamp(runtimeState.getPetalOpenAmount(), 0, 1);
    }
    return 1;
  }

  function resolveLilyRuntimeUseClosedPetalSprites(runtimeState, flower, petalOpenAmount, commonConfig = null) {
    const branchId = flower && Number.isFinite(flower.branchId) ? flower.branchId : null;
    const hasBranchOverride = (
      runtimeState
      && typeof runtimeState.hasPetalOpenAmountOverrideForBranchId === 'function'
      && Number.isFinite(branchId)
      && runtimeState.hasPetalOpenAmountOverrideForBranchId(branchId) === true
    );
    if (hasBranchOverride) {
      const spriteSwapProgress = clamp(
        Number(commonConfig && commonConfig.petalToggleSpriteSwapProgress),
        0,
        1,
      );
      const openingSpriteSwapProgress = 1 - spriteSwapProgress;
      return clamp(Number(petalOpenAmount), 0, 1) < openingSpriteSwapProgress;
    }
    if (
      runtimeState
      && typeof runtimeState.getUseClosedPetalSpritesForBranchId === 'function'
      && Number.isFinite(branchId)
    ) {
      return runtimeState.getUseClosedPetalSpritesForBranchId(branchId) === true;
    }
    if (runtimeState && typeof runtimeState.getUseClosedPetalSprites === 'function') {
      return runtimeState.getUseClosedPetalSprites() === true;
    }
    return clamp(Number(petalOpenAmount), 0, 1) <= 0.001;
  }

  function drawLilyFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext = null) {
    if (!Array.isArray(flower.petals) || flower.petals.length === 0) {
      return false;
    }

    const drawSize = commonConfig.drawSize * resolveFlowerGrowthScaleFactor(flower);
    const spriteCellHeight = Number.isFinite(typeConfig.spriteCellHeight)
      ? Math.max(1, typeConfig.spriteCellHeight)
      : 45.819;
    const displacementSpace = typeConfig.displacementSpace === 'screen' ? 'screen' : 'flower';
    const centerAngleRad = Number.isFinite(flower.centerAngleRad) ? flower.centerAngleRad : 0;
    const cosCenter = Math.cos(centerAngleRad);
    const sinCenter = Math.sin(centerAngleRad);
    const basePetalOpenAmount = resolveLilyRuntimePetalOpenAmount(runtimeState, flower);
    const useClosedPetalSprites = resolveLilyRuntimeUseClosedPetalSprites(
      runtimeState,
      flower,
      basePetalOpenAmount,
      commonConfig,
    );
    const petalToggleIsActive = (
      runtimeState
      && typeof runtimeState.getPetalToggleIsActive === 'function'
      && runtimeState.getPetalToggleIsActive() === true
    );
    const petalToggleIsClosing = (
      runtimeState
      && typeof runtimeState.getPetalToggleIsClosing === 'function'
      && runtimeState.getPetalToggleIsClosing() === true
    );
    const petalToggleProgress = (
      runtimeState
      && typeof runtimeState.getPetalToggleProgress === 'function'
    )
      ? clamp(runtimeState.getPetalToggleProgress(), 0, 1)
      : 1;
    const petalToggleStartAmount = (
      runtimeState
      && typeof runtimeState.getPetalToggleStartAmount === 'function'
    )
      ? clamp(runtimeState.getPetalToggleStartAmount(), 0, 1)
      : basePetalOpenAmount;
    const petalToggleTargetAmount = (
      runtimeState
      && typeof runtimeState.getPetalToggleTargetAmount === 'function'
    )
      ? clamp(runtimeState.getPetalToggleTargetAmount(), 0, 1)
      : basePetalOpenAmount;
    const petalToggleEasePower = (
      runtimeState
      && typeof runtimeState.getPetalToggleEasePower === 'function'
    )
      ? Math.max(0.01, runtimeState.getPetalToggleEasePower())
      : 1;
    const petalToggleOpenBounceAmount = (
      runtimeState
      && typeof runtimeState.getPetalToggleOpenBounceAmount === 'function'
    )
      ? Math.max(0, runtimeState.getPetalToggleOpenBounceAmount())
      : 0;
    const petalToggleOpenBounceOscillations = (
      runtimeState
      && typeof runtimeState.getPetalToggleOpenBounceOscillations === 'function'
    )
      ? Math.max(0.25, runtimeState.getPetalToggleOpenBounceOscillations())
      : 2;
    const edgePairFlipEnabled = commonConfig.petalToggleEdgePairFlipEnabled === true;
    const edgePairFlipBackProgress = clamp(commonConfig.petalToggleEdgePairFlipBackProgress, 0, 1);
    const closingEdgePairFlipBackProgress = 1 - edgePairFlipBackProgress;
    const openingEdgePairFlipBackProgress = 1 - edgePairFlipBackProgress;
    const edgePairUseInnerSpritesEnabled = commonConfig.petalToggleEdgePairUseInnerSpritesEnabled === true;
    const pairSpeedDisparityEnabled = commonConfig.petalTogglePairSpeedDisparityEnabled === true;
    const pairSpeedStep = Math.max(0, Number(commonConfig.petalTogglePairSpeedStep) || 0);
    const pairSpeedCurve = clamp(Number(commonConfig.petalTogglePairSpeedCurve) || 0, 0, 1);
    const maxPairDistance = resolveLilyMaxPairDistance(typeConfig);
    const drawBackfacing = commonConfig.backfacing === true;
    const useClosedLilySpriteSheet = (
      typeConfig.closedUseMiddlePetalSprite === true
      && useClosedPetalSprites
    );
    const image = useClosedLilySpriteSheet
      ? (
        runtimeState.getImage(flower.closedAssetPath || resolveLilyClosedAssetPath(typeConfig))
        || runtimeState.getImage(flower.assetPath)
      )
      : runtimeState.getImage(flower.assetPath);
    if (!image) {
      return false;
    }
    const useFastPath = commonConfig.swayFastPathEnabled === true;
    const useSpriteDebugSway = commonConfig.swaySpriteDebugEnabled === true;
    const debugFrameIndex = Number.isFinite(runtimeState.debugFrameIndex) ? runtimeState.debugFrameIndex : 0;
    const debugFrameStep = Math.max(1, Number(commonConfig.swaySpriteDebugFrameStep) || 1);
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 1;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 1;
    const drawX = -drawSize * 0.5;
    const drawY = -drawSize + ((2.2 / spriteCellHeight) * drawSize);
    const hiddenSpriteCullContext = (
      drawContext
      && drawContext.hiddenSpriteCullEnabled === true
      && drawContext.hiddenBand
      && Number.isFinite(drawContext.hiddenBand.centerX)
    )
      ? drawContext
      : null;
    const hiddenBands = Array.isArray(drawContext && drawContext.hiddenBands) ? drawContext.hiddenBands : [];
    const hiddenRadiusScale = hiddenSpriteCullContext
      ? sanitizeHiddenSpriteCullRadiusScale(hiddenSpriteCullContext.hiddenRadiusScale, 1)
      : 1;
    const spriteRadius = resolveSpriteCircleRadius(drawSize, drawSize, hiddenRadiusScale);
    const centerScratch = { x: 0, y: 0 };
    const canUseFastPath = (
      useFastPath
      && !useSpriteDebugSway
      && !petalToggleIsActive
      && drawBackfacing === false
      && useClosedLilySpriteSheet === false
      && basePetalOpenAmount >= 0.999999
    );
    if (canUseFastPath) {
      for (let i = 0; i < flower.petals.length; i += 1) {
        const petal = flower.petals[i];
        const sourceRect = petal.sourceRect || getSpriteSourceRect(typeConfig, petal.col, petal.row);
        const openAngle = (petal.baseAngleRad || 0) + resolvePetalMotionOffsetRad(flower, petal);
        let x = flower.x;
        let y = flower.y;
        const localOffsetX = petal.screenOffsetX || 0;
        const localOffsetY = petal.screenOffsetY || 0;
        if (displacementSpace === 'flower') {
          x += localOffsetX * cosCenter - localOffsetY * sinCenter;
          y += localOffsetX * sinCenter + localOffsetY * cosCenter;
        } else {
          x += localOffsetX;
          y += localOffsetY;
        }
        if (hiddenSpriteCullContext) {
          resolveSpriteCircleCenterFromDrawTransformInto(
            x,
            y,
            openAngle,
            drawX,
            drawY,
            drawSize,
            drawSize,
            centerScratch,
          );
          const petalHiddenByBand = isSpriteCircleFullyHiddenInBand(
            centerScratch.x,
            centerScratch.y,
            spriteRadius,
            hiddenSpriteCullContext.hiddenBand,
            hiddenSpriteCullContext.hiddenPaddingPx,
          );
          drawCanvasHiddenSpriteCullDebugCircle(
            ctx,
            hiddenSpriteCullContext,
            centerScratch.x,
            centerScratch.y,
            spriteRadius,
            petalHiddenByBand,
          );
          if (petalHiddenByBand) {
            if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
              runtimeState.hiddenSpriteCulledCount += 1;
            }
            continue;
          }
        }
        if (hiddenBands.length > 0) {
          resolveSpriteCircleCenterFromDrawTransformInto(
            x,
            y,
            openAngle,
            drawX,
            drawY,
            drawSize,
            drawSize,
            centerScratch,
          );
          if (isSpriteCircleFullyInsideAnyHiddenBand(centerScratch.x, centerScratch.y, spriteRadius, hiddenBands, 0)) {
            continue;
          }
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(openAngle);
        ctx.drawImage(
          image,
          sourceRect.sx,
          sourceRect.sy,
          sourceRect.sw,
          sourceRect.sh,
          drawX,
          drawY,
          drawSize,
          drawSize,
        );
        ctx.restore();
      }
      return true;
    }
    const offsetScratch = { x: 0, y: 0 };

    const petalCount = flower.petals.length;
    const startIndex = drawBackfacing ? petalCount - 1 : 0;
    const endIndexExclusive = drawBackfacing ? -1 : petalCount;
    const indexStep = drawBackfacing ? -1 : 1;

    for (let i = startIndex; i !== endIndexExclusive; i += indexStep) {
      const petal = flower.petals[i];
      const isLastOuterPairPetal = petal.col === 0 || petal.col === 6;
      let petalOpenAmount = basePetalOpenAmount;
      if (pairSpeedDisparityEnabled && petalToggleIsActive && pairSpeedStep > 0) {
        const pairDistance = resolveLilyPairDistanceFromCenter(typeConfig, petal.col);
        const normalizedDistance = maxPairDistance > 0 ? clamp(pairDistance / maxPairDistance, 0, 1) : 0;
        const expPower = 1 + pairSpeedCurve * 4;
        const exponentialDistance = Math.pow(normalizedDistance, expPower) * maxPairDistance;
        const shapedPairDistance = (
          pairDistance * (1 - pairSpeedCurve)
          + exponentialDistance * pairSpeedCurve
        );
        const speedMultiplier = 1 + pairSpeedStep * shapedPairDistance;
        const adjustedProgress = clamp(petalToggleProgress * speedMultiplier, 0, 1);
        petalOpenAmount = evaluatePetalToggleAmount(
          petalToggleStartAmount,
          petalToggleTargetAmount,
          adjustedProgress,
          petalToggleEasePower,
          petalToggleOpenBounceAmount,
          petalToggleOpenBounceOscillations,
        );
      }

      // Use distance-from-closed (0..1) instead of animation-time progress.
      const closedDistance = clamp(petalOpenAmount, 0, 1);
      const isInsideEdgePairToggleWindow = (
        petalToggleIsActive
        && !useClosedPetalSprites
        && isLastOuterPairPetal
        && (
          petalToggleIsClosing
            ? (closedDistance <= closingEdgePairFlipBackProgress)
            : (closedDistance < openingEdgePairFlipBackProgress)
        )
      );
      const shouldFlipEdgePair = edgePairFlipEnabled && isInsideEdgePairToggleWindow;
      let sourceCol = useClosedLilySpriteSheet
        ? (
          Number.isFinite(flower.closedSpriteCol)
            ? flower.closedSpriteCol
            : resolveLilyMiddlePetalColumn(typeConfig)
        )
        : petal.col;
      if (
        edgePairUseInnerSpritesEnabled
        && isInsideEdgePairToggleWindow
        && !useClosedLilySpriteSheet
      ) {
        if (sourceCol === 0) {
          sourceCol = 1;
        } else if (sourceCol === 6) {
          sourceCol = 5;
        }
      }
      let sourceRect = petal.sourceRect;
      if (useClosedLilySpriteSheet) {
        sourceRect = petal.closedLilySourceRect || petal.closedMiddleSourceRect || sourceRect;
      } else if (
        edgePairUseInnerSpritesEnabled
        && isInsideEdgePairToggleWindow
        && !useClosedPetalSprites
      ) {
        sourceRect = petal.innerSourceRect || sourceRect;
      }
      if (!sourceRect) {
        const fallbackRow = useClosedLilySpriteSheet
          ? (
            Number.isFinite(flower.closedSpriteRow)
              ? flower.closedSpriteRow
              : 0
          )
          : petal.row;
        sourceRect = useClosedLilySpriteSheet
          ? getLilyClosedSpriteSourceRect(typeConfig, sourceCol, fallbackRow)
          : getSpriteSourceRect(typeConfig, sourceCol, fallbackRow);
      }
      if (useSpriteDebugSway && !useClosedLilySpriteSheet) {
        const baseCol = Number.isFinite(sourceCol) ? sourceCol : petal.col;
        const animatedCol = ((baseCol + (debugFrameIndex * debugFrameStep)) % spriteCols + spriteCols) % spriteCols;
        const animatedRow = clamp(
          Number.isFinite(petal.row) ? petal.row : 0,
          0,
          Math.max(0, spriteRows - 1),
        );
        sourceRect = getSpriteSourceRect(typeConfig, animatedCol, animatedRow);
      }

      const motionOffsetRad = useSpriteDebugSway ? 0 : resolvePetalMotionOffsetRad(flower, petal);
      const baseOpenAngle = petal.baseAngleRad || 0;
      const openAngle = baseOpenAngle + motionOffsetRad;
      const angle = centerAngleRad + (openAngle - centerAngleRad) * petalOpenAmount;
      resolvePetalScreenOffsetsInto(petal, displacementSpace, cosCenter, sinCenter, offsetScratch);
      const blendedOffsetX = offsetScratch.x * petalOpenAmount;
      const blendedOffsetY = offsetScratch.y * petalOpenAmount;
      const anchorX = flower.x + blendedOffsetX;
      const anchorY = flower.y + blendedOffsetY;
      if (hiddenSpriteCullContext) {
        resolveSpriteCircleCenterFromDrawTransformInto(
          anchorX,
          anchorY,
          angle,
          drawX,
          drawY,
          drawSize,
          drawSize,
          centerScratch,
        );
        const petalHiddenByBand = isSpriteCircleFullyHiddenInBand(
          centerScratch.x,
          centerScratch.y,
          spriteRadius,
          hiddenSpriteCullContext.hiddenBand,
          hiddenSpriteCullContext.hiddenPaddingPx,
        );
        drawCanvasHiddenSpriteCullDebugCircle(
          ctx,
          hiddenSpriteCullContext,
          centerScratch.x,
          centerScratch.y,
          spriteRadius,
          petalHiddenByBand,
        );
        if (petalHiddenByBand) {
          if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
            runtimeState.hiddenSpriteCulledCount += 1;
          }
          continue;
        }
      }
      if (hiddenBands.length > 0) {
        resolveSpriteCircleCenterFromDrawTransformInto(
          anchorX,
          anchorY,
          angle,
          drawX,
          drawY,
          drawSize,
          drawSize,
          centerScratch,
        );
        if (isSpriteCircleFullyInsideAnyHiddenBand(centerScratch.x, centerScratch.y, spriteRadius, hiddenBands, 0)) {
          continue;
        }
      }
      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.rotate(angle);
      if (shouldFlipEdgePair) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(
        image,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sw,
        sourceRect.sh,
        drawX,
        drawY,
        drawSize,
        drawSize,
      );
      ctx.restore();
    }

    return true;
  }

  function buildBlueFlower(endpoint, typeConfig, commonConfig, rng) {
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 10;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 10;
    const baseSize = Number.isFinite(typeConfig.baseSize)
      ? Math.max(0.01, typeConfig.baseSize)
      : 60;
    const density = Number.isFinite(typeConfig.density)
      ? Math.max(1, Math.floor(typeConfig.density))
      : 80;
    const centerBiasExponent = Number.isFinite(typeConfig.centerBiasExponent)
      ? Math.max(0.01, typeConfig.centerBiasExponent)
      : 1.6;
    const hoverAmplitudeDegRange = normalizeRangeInput(typeConfig.hoverAmplitudeDegRange, 2, 6);
    const hoverSpeedRange = normalizeRangeInput(typeConfig.hoverSpeedRange, 2.2, 4.2);
    const drawOrder = typeConfig.drawOrder === 'random' ? 'random' : 'outerFirst';

    const points = [];
    const radiusSq = baseSize * baseSize;
    for (let i = 0; i < density; i += 1) {
      const theta = rng() * Math.PI * 2;
      const u = rng();
      const rNorm = Math.pow(Math.sqrt(u), centerBiasExponent);
      const radialDistance = baseSize * rNorm;
      const offsetX = Math.cos(theta) * radialDistance;
      const offsetY = Math.sin(theta) * radialDistance;

      const halfChordX = Math.sqrt(Math.max(0, radiusSq - offsetY * offsetY));
      const halfChordY = Math.sqrt(Math.max(0, radiusSq - offsetX * offsetX));
      const xProgress = halfChordX > 1e-6 ? (offsetX + halfChordX) / (2 * halfChordX) : 0.5;
      const yProgress = halfChordY > 1e-6 ? (offsetY + halfChordY) / (2 * halfChordY) : 0.5;
      const col = clamp(
        Math.round(xProgress * Math.max(0, spriteCols - 1)),
        0,
        Math.max(0, spriteCols - 1),
      );
      const row = clamp(
        Math.round(yProgress * Math.max(0, spriteRows - 1)),
        0,
        Math.max(0, spriteRows - 1),
      );

      points.push({
        offsetX,
        offsetY,
        radialDistance,
        distanceSq: offsetX * offsetX + offsetY * offsetY,
        col,
        row,
        baseAngleRad: Math.atan2(offsetY, offsetX),
        hoverAmplitudeRad: degToRad(sampleRange(hoverAmplitudeDegRange, rng)),
        hoverSpeed: sampleRange(hoverSpeedRange, rng),
      });
    }

    if (drawOrder === 'outerFirst') {
      points.sort((a, b) => b.distanceSq - a.distanceSq);
    }

    return {
      petals: points,
      assetPath: resolveBlueAssetPath(typeConfig, rng),
      centerAngleRad: 0,
      interactionRadius: commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
    };
  }

  function drawBlueFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext = null) {
    const image = runtimeState.getImage(flower.assetPath);
    if (!image || !Array.isArray(flower.petals) || flower.petals.length === 0) {
      return false;
    }

    const pointDrawSizeBase = Number.isFinite(typeConfig.pointDrawSize)
      ? Math.max(1, typeConfig.pointDrawSize)
      : 18;
    const pointDrawSize = pointDrawSizeBase * resolveFlowerGrowthScaleFactor(flower);
    const halfPointSize = pointDrawSize * 0.5;
    const hiddenSpriteCullContext = (
      drawContext
      && drawContext.hiddenSpriteCullEnabled === true
      && drawContext.hiddenBand
      && Number.isFinite(drawContext.hiddenBand.centerX)
    )
      ? drawContext
      : null;
    const hiddenBands = Array.isArray(drawContext && drawContext.hiddenBands) ? drawContext.hiddenBands : [];
    const hiddenRadiusScale = hiddenSpriteCullContext
      ? sanitizeHiddenSpriteCullRadiusScale(hiddenSpriteCullContext.hiddenRadiusScale, 1)
      : 1;
    const spriteRadius = resolveSpriteCircleRadius(pointDrawSize, pointDrawSize, hiddenRadiusScale);
    const growthPositionScale = resolveFlowerGrowthPositionScaleFactor(flower);
    const swayAroundPersonalOrigin = commonConfig.blueSwayRotateAroundPetalOrigin === true;
    const jumpAroundPersonalOrigin = commonConfig.blueJumpRotateAroundPetalOrigin === true;
    const useFastPath = commonConfig.swayFastPathEnabled === true;
    const useSpriteDebugSway = commonConfig.swaySpriteDebugEnabled === true;
    const debugFrameIndex = Number.isFinite(runtimeState.debugFrameIndex) ? runtimeState.debugFrameIndex : 0;
    const debugFrameStep = Math.max(1, Number(commonConfig.swaySpriteDebugFrameStep) || 1);
    const spriteCols = Number.isFinite(typeConfig.spriteCols)
      ? Math.max(1, Math.floor(typeConfig.spriteCols))
      : 1;
    const spriteRows = Number.isFinite(typeConfig.spriteRows)
      ? Math.max(1, Math.floor(typeConfig.spriteRows))
      : 1;
    const orbitIsStatic = swayAroundPersonalOrigin && jumpAroundPersonalOrigin;
    const orbitUsesCombinedRotation = !swayAroundPersonalOrigin && !jumpAroundPersonalOrigin;

    for (let i = 0; i < flower.petals.length; i += 1) {
      const point = flower.petals[i];
      let sourceRect = point.sourceRect || getSpriteSourceRect(typeConfig, point.col, point.row);
      const radialDistanceBase = Number.isFinite(point.radialDistance) ? point.radialDistance : 0;
      const radialDistance = radialDistanceBase * growthPositionScale;
      const baseAngle = point.baseAngleRad || 0;
      const swayOffset = useSpriteDebugSway ? 0 : resolvePetalSwayOffsetRad(flower, point);
      const jumpOffset = useSpriteDebugSway ? 0 : resolvePetalJumpOffsetRad(point);
      if (useSpriteDebugSway) {
        const baseCol = Number.isFinite(point.col) ? point.col : 0;
        const baseRow = Number.isFinite(point.row) ? point.row : 0;
        const animatedCol = ((baseCol + (debugFrameIndex * debugFrameStep)) % spriteCols + spriteCols) % spriteCols;
        const animatedRow = clamp(baseRow, 0, Math.max(0, spriteRows - 1));
        sourceRect = getSpriteSourceRect(typeConfig, animatedCol, animatedRow);
      }

      let x;
      let y;
      if (useSpriteDebugSway) {
        x = flower.x + (Number.isFinite(point.offsetX) ? point.offsetX : 0);
        y = flower.y + (Number.isFinite(point.offsetY) ? point.offsetY : 0);
      } else if (orbitIsStatic && useFastPath) {
        x = flower.x + (Number.isFinite(point.offsetX) ? point.offsetX : 0);
        y = flower.y + (Number.isFinite(point.offsetY) ? point.offsetY : 0);
      } else if (orbitUsesCombinedRotation && useFastPath) {
        const totalOffset = swayOffset + jumpOffset;
        const c = Math.cos(totalOffset);
        const s = Math.sin(totalOffset);
        const baseCos = Number.isFinite(point.baseCos) ? point.baseCos : Math.cos(baseAngle);
        const baseSin = Number.isFinite(point.baseSin) ? point.baseSin : Math.sin(baseAngle);
        x = flower.x + ((baseCos * c - baseSin * s) * radialDistance);
        y = flower.y + ((baseSin * c + baseCos * s) * radialDistance);
      } else {
        let orbitalAngle = baseAngle;
        if (!swayAroundPersonalOrigin) {
          orbitalAngle += swayOffset;
        }
        if (!jumpAroundPersonalOrigin) {
          orbitalAngle += jumpOffset;
        }
        x = flower.x + Math.cos(orbitalAngle) * radialDistance;
        y = flower.y + Math.sin(orbitalAngle) * radialDistance;
      }

      let spriteAngle = 0;
      if (swayAroundPersonalOrigin) {
        spriteAngle += swayOffset;
      }
      if (jumpAroundPersonalOrigin) {
        spriteAngle += jumpOffset;
      }

      if (hiddenSpriteCullContext) {
        const petalHiddenByBand = isSpriteCircleFullyHiddenInBand(
          x,
          y,
          spriteRadius,
          hiddenSpriteCullContext.hiddenBand,
          hiddenSpriteCullContext.hiddenPaddingPx,
        );
        drawCanvasHiddenSpriteCullDebugCircle(
          ctx,
          hiddenSpriteCullContext,
          x,
          y,
          spriteRadius,
          petalHiddenByBand,
        );
        if (petalHiddenByBand) {
          if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
            runtimeState.hiddenSpriteCulledCount += 1;
          }
          continue;
        }
      }
      if (hiddenBands.length > 0 && isSpriteCircleFullyInsideAnyHiddenBand(x, y, spriteRadius, hiddenBands, 0)) {
        continue;
      }

      if (Math.abs(spriteAngle) > 1e-8) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spriteAngle);
        ctx.drawImage(
          image,
          sourceRect.sx,
          sourceRect.sy,
          sourceRect.sw,
          sourceRect.sh,
          -halfPointSize,
          -halfPointSize,
          pointDrawSize,
          pointDrawSize,
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          image,
          sourceRect.sx,
          sourceRect.sy,
          sourceRect.sw,
          sourceRect.sh,
          x - halfPointSize,
          y - halfPointSize,
          pointDrawSize,
          pointDrawSize,
        );
      }
    }

    return true;
  }

  const FLOWER_TYPE_REGISTRY = {
    lily: {
      resolveTypeConfig(flowersConfig) {
        return resolveLilyTypeConfig(flowersConfig);
      },

      getAssetPaths(typeConfig) {
        const out = [resolveLilyAssetPath(typeConfig)];
        if (typeConfig.closedUseMiddlePetalSprite === true) {
          const closedPath = resolveLilyClosedAssetPath(typeConfig);
          if (typeof closedPath === 'string' && closedPath.length > 0) {
            out.push(closedPath);
          }
        }
        return Array.from(new Set(out));
      },

      buildFlower(endpoint, typeConfig, commonConfig, rng) {
        return buildLilyFlower(endpoint, typeConfig, commonConfig, rng);
      },

      drawFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext = null) {
        return drawLilyFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext);
      },
    },
    blue: {
      resolveTypeConfig(flowersConfig) {
        return resolveBlueTypeConfig(flowersConfig);
      },

      getAssetPaths(typeConfig) {
        return resolveBlueAssetPaths(typeConfig);
      },

      buildFlower(endpoint, typeConfig, commonConfig, rng) {
        return buildBlueFlower(endpoint, typeConfig, commonConfig, rng);
      },

      drawFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext = null) {
        return drawBlueFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext);
      },
    },
  };

  function resolveTypeConfig(typeName, flowersConfig) {
    const entry = FLOWER_TYPE_REGISTRY[typeName] || FLOWER_TYPE_REGISTRY.lily;
    return entry.resolveTypeConfig(flowersConfig);
  }

  function resolveTypeNameForEndpoint(endpoint, index, commonConfig) {
    const fallbackType = 'lily';
    const mode = sanitizeAssignmentMode(commonConfig.assignmentMode);

    if (mode === 'single') {
      return sanitizeSingleType(commonConfig.singleType, FLOWER_TYPE_REGISTRY, fallbackType);
    }

    const ratios = sanitizeMixRatios(commonConfig.mixRatios, FLOWER_TYPE_REGISTRY, fallbackType);
    const entries = Object.entries(ratios);
    if (entries.length <= 1) {
      return entries[0] ? entries[0][0] : fallbackType;
    }

    let total = 0;
    for (let i = 0; i < entries.length; i += 1) {
      total += entries[i][1];
    }
    if (total <= 0) {
      return fallbackType;
    }

    const stableToken = getStableToken(endpoint, index);
    const rng = mulberry32(hashSeed(`${stableToken}|flower-type`));
    const target = rng() * total;

    let cumulative = 0;
    for (let i = 0; i < entries.length; i += 1) {
      cumulative += entries[i][1];
      if (target <= cumulative) {
        return entries[i][0];
      }
    }

    return entries[entries.length - 1][0];
  }

  function createFlowerSystem() {
    const state = {
      flowers: [],
      activeFlowerIndices: [],
      debugFrameIndex: 0,
      staticLayerActiveSnapshot: [],
      petalOpenAmount: 1,
      useClosedPetalSprites: false,
      petalToggleTransition: {
        active: false,
        startAmount: 1,
        targetAmount: 1,
        startTimeMs: 0,
        durationMs: 0,
        easePower: 2.2,
        openBounceAmount: 0,
        openBounceOscillations: 2,
        spriteSwapProgress: 0.14,
        isClosing: false,
        progress: 1,
      },
      mouseX: OFFSCREEN_POINTER,
      mouseY: OFFSCREEN_POINTER,
      mouseSpeedPxPerSec: 0,
      mouseLastSampleX: OFFSCREEN_POINTER,
      mouseLastSampleY: OFFSCREEN_POINTER,
      mouseLastSampleMs: 0,
      windPositions: null,
      backLayerHiddenSpriteCullContext: {
        enabled: false,
        hiddenBand: null,
        hiddenPaddingPx: 0,
        hiddenRadiusScale: 1,
        branchFilter: null,
      },
      lastUpdateMs: 0,
      alwaysSimLastMs: 0,
      alwaysSimAccumulatorSec: 0,
      alwaysRenderAlpha: 0,
      staticLayerCanvas: null,
      staticLayerCtx: null,
      staticLayerDirty: true,
      staticLayerScaleX: 1,
      staticLayerScaleY: 1,
      flowerOpenAmountOverrideByBranchId: new Map(),
      pendingStaticLayerResize: false,
      pendingStaticLayerWidth: 0,
      pendingStaticLayerHeight: 0,
      pendingStaticLayerScaleX: 1,
      pendingStaticLayerScaleY: 1,
      imageCache: new Map(),
      imageLoadPromises: new Map(),
      baked: {
        enabled: false,
        prepared: false,
        preparing: false,
        failedReason: '',
        manifestPath: '',
        manifest: null,
        exportSettings: null,
        variantByKey: new Map(),
        variantsByType: {
          lilyByRowOneBased: new Map(),
          blueByAssetPath: new Map(),
          blueFallback: null,
        },
        pageImageByFileName: new Map(),
        pageLoadPromisesByFileName: new Map(),
        pageLoadFailedFileNames: new Set(),
      },
      performance: {
        updateTotalMs: 0,
        updateSamples: 0,
        drawTotalMs: 0,
        drawSamples: 0,
        staticLayerRebuildCount: 0,
        staticLayerRebuildTotalMs: 0,
        staticLayerRebuildLastMs: 0,
        activeFlowerCount: 0,
        simStepTotalMs: 0,
        simStepSamples: 0,
        totalSimSteps: 0,
        interpolatedFrames: 0,
        perfStartMs: performance.now(),
      },
      pixi: {
        surfaces: {
          backCanvas: null,
          frontCanvas: null,
        },
        mode: 'canvas',
        initAttempted: false,
        enabled: false,
        disabledReason: '',
        backApp: null,
        frontApp: null,
        backStage: null,
        frontStage: null,
        backInitPromise: null,
        frontInitPromise: null,
        backInitReady: false,
        frontInitReady: false,
        textureCache: new Map(),
        baseTextureCache: new Map(),
        backSpritePool: [],
        frontSpritePool: [],
        backPoolCursor: 0,
        frontPoolCursor: 0,
        backHiddenCullDebugGraphics: null,
        frontHiddenCullDebugGraphics: null,
        lastSizeKeyBack: '',
        lastSizeKeyFront: '',
        pendingResizeBack: false,
        pendingResizeFront: false,
        layerMetrics: {
          back: {
            scaleX: 1,
            scaleY: 1,
            maxXCss: 1,
            maxYCss: 1,
            cssWidth: 1,
            cssHeight: 1,
            width: 1,
            height: 1,
            key: '',
          },
          front: {
            scaleX: 1,
            scaleY: 1,
            maxXCss: 1,
            maxYCss: 1,
            cssWidth: 1,
            cssHeight: 1,
            width: 1,
            height: 1,
            key: '',
          },
        },
      },
    };

    function sanitizeHiddenSpriteCullPaddingPx(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 0;
      }
      return Math.max(0, numeric);
    }

    function resolveHiddenSpriteCullDebugConfig(rawConfig) {
      const safe = isPlainObject(rawConfig) ? rawConfig : {};
      const mode = sanitizeHiddenSpriteCullDebugMode(safe.mode);
      const maxPerFrame = Number.isFinite(Number(safe.maxPerFrame))
        ? clamp(Math.floor(Number(safe.maxPerFrame)), 1, 10000)
        : 400;
      const lineWidth = Number.isFinite(Number(safe.lineWidth))
        ? clamp(Number(safe.lineWidth), 0.25, 8)
        : 1;
      return {
        enabled: safe.enabled === true,
        mode,
        maxPerFrame,
        lineWidth,
        strokeVisible: (typeof safe.strokeVisible === 'string' && safe.strokeVisible.trim().length > 0)
          ? safe.strokeVisible.trim()
          : 'rgba(90, 220, 120, 0.55)',
        strokeCulled: (typeof safe.strokeCulled === 'string' && safe.strokeCulled.trim().length > 0)
          ? safe.strokeCulled.trim()
          : 'rgba(255, 80, 80, 0.65)',
      };
    }

    function resolvePixiDebugStroke(colorValue, fallbackRgba) {
      const rgba = resolveColorToRgbaObject(colorValue, fallbackRgba);
      return {
        color: ((rgba.r << 16) | (rgba.g << 8) | rgba.b) >>> 0,
        alpha: clamp(rgba.a, 0, 1),
      };
    }

    function ensurePixiHiddenCullDebugGraphics(layerName, appInstance = null) {
      const app = appInstance || ensurePixiAppForLayer(layerName);
      if (!app) {
        return null;
      }
      const key = layerName === 'front' ? 'frontHiddenCullDebugGraphics' : 'backHiddenCullDebugGraphics';
      let graphics = state.pixi[key];
      if (!graphics) {
        const PIXI = getPixiLibrary();
        if (!PIXI || typeof PIXI.Graphics !== 'function') {
          return null;
        }
        graphics = new PIXI.Graphics();
        graphics.eventMode = 'none';
        graphics.interactiveChildren = false;
        state.pixi[key] = graphics;
        app.stage.addChild(graphics);
      } else if (graphics.parent !== app.stage) {
        app.stage.addChild(graphics);
      }
      graphics.visible = true;
      return graphics;
    }

    function clearPixiHiddenCullDebugGraphics(layerName) {
      const key = layerName === 'front' ? 'frontHiddenCullDebugGraphics' : 'backHiddenCullDebugGraphics';
      const graphics = state.pixi[key];
      if (graphics && typeof graphics.clear === 'function') {
        graphics.clear();
        graphics.visible = false;
      }
    }

    function drawPixiHiddenSpriteCullDebugCircle(
      hiddenSpriteCullContext,
      centerX,
      centerY,
      radius,
      isCulled,
      scaleX,
      scaleY,
    ) {
      if (!hiddenSpriteCullContext || hiddenSpriteCullContext.debugEnabled !== true) {
        return false;
      }
      const debugMode = sanitizeHiddenSpriteCullDebugMode(hiddenSpriteCullContext.debugMode);
      if (debugMode !== 'all' && isCulled !== true) {
        return false;
      }
      const maxPerFrame = Number.isFinite(hiddenSpriteCullContext.debugMaxPerFrame)
        ? Math.max(1, Math.floor(hiddenSpriteCullContext.debugMaxPerFrame))
        : 400;
      const drawnSoFar = Number.isFinite(hiddenSpriteCullContext.debugDrawnCount)
        ? hiddenSpriteCullContext.debugDrawnCount
        : 0;
      if (drawnSoFar >= maxPerFrame) {
        return false;
      }
      const graphics = hiddenSpriteCullContext.pixiDebugGraphics;
      if (!graphics || typeof graphics.drawCircle !== 'function') {
        return false;
      }
      hiddenSpriteCullContext.debugDrawnCount = drawnSoFar + 1;
      const avgScale = Math.max(1e-8, (Math.abs(scaleX) + Math.abs(scaleY)) * 0.5);
      const stroke = isCulled
        ? hiddenSpriteCullContext.pixiDebugStrokeCulled
        : hiddenSpriteCullContext.pixiDebugStrokeVisible;
      const lineWidthPx = Math.max(0.25, (Number(hiddenSpriteCullContext.debugLineWidth) || 1) * avgScale);
      graphics.lineStyle(lineWidthPx, stroke.color, stroke.alpha);
      graphics.drawCircle(centerX * scaleX, centerY * scaleY, Math.max(0.5 * avgScale, radius * avgScale));
      return true;
    }

    function updateBackLayerHiddenSpriteCullContext(renderOptions) {
      const safeOptions = isPlainObject(renderOptions) ? renderOptions : null;
      const layerName = safeOptions && safeOptions.layerName === 'front' ? 'front' : 'back';
      if (layerName !== 'back') {
        return;
      }
      const hiddenBand = safeOptions && safeOptions.hiddenBand && typeof safeOptions.hiddenBand === 'object'
        ? safeOptions.hiddenBand
        : null;
      const enabled = (
        safeOptions
        && safeOptions.skipHiddenBackDrawEnabled === true
        && hiddenBand
        && Number.isFinite(hiddenBand.centerX)
      );
      const context = state.backLayerHiddenSpriteCullContext;
      context.enabled = enabled === true;
      context.hiddenBand = context.enabled ? hiddenBand : null;
      context.hiddenPaddingPx = context.enabled
        ? sanitizeHiddenSpriteCullPaddingPx(safeOptions.hiddenSpriteCullInnerPaddingPx)
        : 0;
      context.hiddenRadiusScale = context.enabled
        ? sanitizeHiddenSpriteCullRadiusScale(safeOptions.hiddenSpriteCullRadiusScale, 1)
        : 1;
      context.branchFilter = (
        context.enabled
        && typeof safeOptions.branchFilter === 'function'
      )
        ? safeOptions.branchFilter
        : null;
    }

    function resolveBackLayerHiddenSpriteCullContextForFlower(flower) {
      const context = state.backLayerHiddenSpriteCullContext;
      if (!context || context.enabled !== true || !flower) {
        return null;
      }
      if (typeof context.branchFilter === 'function') {
        if (context.branchFilter(flower.branchId, flower) !== true) {
          return null;
        }
      }
      return context;
    }

    function resolveFlowerPetalOpenAmountForInteraction(flower) {
      if (flower && Number.isFinite(flower.branchId)) {
        return clamp(getPetalOpenAmountForBranchId(flower.branchId), 0, 1);
      }
      return clamp(getPetalOpenAmount(), 0, 1);
    }

    function isFlowerPetalCircleHiddenByContext(
      flower,
      petal,
      commonConfig,
      hiddenContext,
      offsetScratch,
      centerScratch,
    ) {
      if (!flower || !petal || !commonConfig || !hiddenContext || hiddenContext.enabled !== true) {
        return false;
      }
      const hiddenBand = hiddenContext.hiddenBand;
      if (!hiddenBand || !Number.isFinite(hiddenBand.centerX)) {
        return false;
      }
      if (flower.type === 'blue') {
        const typeConfig = flower.typeConfig || {};
        const pointDrawSizeBase = Number.isFinite(typeConfig.pointDrawSize)
          ? Math.max(1, typeConfig.pointDrawSize)
          : 18;
        const growthScale = resolveFlowerGrowthScaleFactor(flower);
        const growthPositionScale = resolveFlowerGrowthPositionScaleFactor(flower);
        const pointDrawSize = pointDrawSizeBase * growthScale;
        const hiddenRadiusScale = sanitizeHiddenSpriteCullRadiusScale(hiddenContext.hiddenRadiusScale, 1);
        const spriteRadius = resolveSpriteCircleRadius(pointDrawSize, pointDrawSize, hiddenRadiusScale);
        const swayAroundPersonalOrigin = commonConfig.blueSwayRotateAroundPetalOrigin === true;
        const jumpAroundPersonalOrigin = commonConfig.blueJumpRotateAroundPetalOrigin === true;
        const baseAngle = petal.baseAngleRad || 0;
        const swayOffset = resolvePetalSwayOffsetRad(flower, petal);
        const jumpOffset = resolvePetalJumpOffsetRad(petal);
        let orbitalAngle = baseAngle;
        if (!swayAroundPersonalOrigin) {
          orbitalAngle += swayOffset;
        }
        if (!jumpAroundPersonalOrigin) {
          orbitalAngle += jumpOffset;
        }
        const radialDistance = (Number.isFinite(petal.radialDistance) ? petal.radialDistance : 0) * growthPositionScale;
        const centerX = flower.x + Math.cos(orbitalAngle) * radialDistance;
        const centerY = flower.y + Math.sin(orbitalAngle) * radialDistance;
        return isSpriteCircleFullyHiddenInBand(
          centerX,
          centerY,
          spriteRadius,
          hiddenBand,
          hiddenContext.hiddenPaddingPx,
        );
      }

      const typeConfig = flower.typeConfig || {};
      const spriteCellHeight = Number.isFinite(typeConfig.spriteCellHeight)
        ? Math.max(1, typeConfig.spriteCellHeight)
        : 45.819;
      const drawSize = commonConfig.drawSize * resolveFlowerGrowthScaleFactor(flower);
      const drawX = -drawSize * 0.5;
      const drawY = -drawSize + ((2.2 / spriteCellHeight) * drawSize);
      const hiddenRadiusScale = sanitizeHiddenSpriteCullRadiusScale(hiddenContext.hiddenRadiusScale, 1);
      const spriteRadius = resolveSpriteCircleRadius(drawSize, drawSize, hiddenRadiusScale);
      const displacementSpace = typeConfig.displacementSpace === 'screen' ? 'screen' : 'flower';
      const centerAngleRad = Number.isFinite(flower.centerAngleRad) ? flower.centerAngleRad : 0;
      const cosCenter = Math.cos(centerAngleRad);
      const sinCenter = Math.sin(centerAngleRad);
      const petalOpenAmount = resolveFlowerPetalOpenAmountForInteraction(flower);
      const motionOffsetRad = resolvePetalMotionOffsetRad(flower, petal);
      const baseOpenAngle = petal.baseAngleRad || 0;
      const openAngle = baseOpenAngle + motionOffsetRad;
      const angle = centerAngleRad + (openAngle - centerAngleRad) * petalOpenAmount;
      resolvePetalScreenOffsetsInto(petal, displacementSpace, cosCenter, sinCenter, offsetScratch);
      const blendedOffsetX = offsetScratch.x * petalOpenAmount;
      const blendedOffsetY = offsetScratch.y * petalOpenAmount;
      resolveSpriteCircleCenterFromDrawTransformInto(
        flower.x + blendedOffsetX,
        flower.y + blendedOffsetY,
        angle,
        drawX,
        drawY,
        drawSize,
        drawSize,
        centerScratch,
      );
      return isSpriteCircleFullyHiddenInBand(
        centerScratch.x,
        centerScratch.y,
        spriteRadius,
        hiddenBand,
        hiddenContext.hiddenPaddingPx,
      );
    }

    function setPixiSurfaces(surfaces) {
      const safe = isPlainObject(surfaces) ? surfaces : {};
      state.pixi.surfaces.backCanvas = safe.backCanvas || null;
      state.pixi.surfaces.frontCanvas = safe.frontCanvas || null;
      state.pixi.lastSizeKeyBack = '';
      state.pixi.lastSizeKeyFront = '';
      state.pixi.pendingResizeBack = false;
      state.pixi.pendingResizeFront = false;
      state.pixi.layerMetrics.back.key = '';
      state.pixi.layerMetrics.front.key = '';
      viewportDebugLog('flowers.setPixiSurfaces', `back=${Boolean(state.pixi.surfaces.backCanvas)}`, `front=${Boolean(state.pixi.surfaces.frontCanvas)}`);
      if (state.pixi.backApp) {
        state.pixi.backInitReady = Boolean(
          state.pixi.backApp.renderer && typeof state.pixi.backApp.renderer.render === 'function',
        );
      }
      if (state.pixi.frontApp) {
        state.pixi.frontInitReady = Boolean(
          state.pixi.frontApp.renderer && typeof state.pixi.frontApp.renderer.render === 'function',
        );
      }
    }

    function resolvePixiSurfaceCanvas(layerName) {
      const isFront = layerName === 'front';
      const configured = isFront ? state.pixi.surfaces.frontCanvas : state.pixi.surfaces.backCanvas;
      if (configured) {
        return configured;
      }
      const id = isFront ? 'myCanvasFlowersFront' : 'myCanvasFlowersBack';
      const fallback = typeof document !== 'undefined' ? document.getElementById(id) : null;
      if (isFront) {
        state.pixi.surfaces.frontCanvas = fallback || null;
        state.pixi.layerMetrics.front.key = '';
      } else {
        state.pixi.surfaces.backCanvas = fallback || null;
        state.pixi.layerMetrics.back.key = '';
      }
      return fallback || null;
    }

    function getPixiLibrary() {
      if (!globalScope || !globalScope.PIXI) {
        return null;
      }
      return globalScope.PIXI;
    }

    function configurePixiStageForPerf(stage) {
      if (!stage) {
        return;
      }
      stage.sortableChildren = false;
      stage.interactiveChildren = false;
      stage.eventMode = 'none';
    }

    function resolvePixiLayerMetrics(layerName, canvasEl) {
      if (!canvasEl) {
        return null;
      }
      const metrics = layerName === 'front'
        ? state.pixi.layerMetrics.front
        : state.pixi.layerMetrics.back;
      const width = Math.max(1, Math.floor(Number(canvasEl.width) || 1));
      const height = Math.max(1, Math.floor(Number(canvasEl.height) || 1));
      const cssWidthRaw = Number(canvasEl.clientWidth);
      const cssHeightRaw = Number(canvasEl.clientHeight);
      const cssWidth = Number.isFinite(cssWidthRaw) && cssWidthRaw > 0 ? cssWidthRaw : width;
      const cssHeight = Number.isFinite(cssHeightRaw) && cssHeightRaw > 0 ? cssHeightRaw : height;
      const nextKey = `${width}x${height}|${cssWidth.toFixed(2)}x${cssHeight.toFixed(2)}`;
      if (metrics.key === nextKey) {
        return metrics;
      }
      metrics.width = width;
      metrics.height = height;
      metrics.cssWidth = cssWidth;
      metrics.cssHeight = cssHeight;
      metrics.scaleX = Math.max(1e-8, width / cssWidth);
      metrics.scaleY = Math.max(1e-8, height / cssHeight);
      metrics.maxXCss = width / metrics.scaleX;
      metrics.maxYCss = height / metrics.scaleY;
      metrics.key = nextKey;
      return metrics;
    }

    function clearPixiLayerApp(layerName) {
      const appKey = layerName === 'front' ? 'frontApp' : 'backApp';
      const poolKey = layerName === 'front' ? 'frontSpritePool' : 'backSpritePool';
      const app = state.pixi[appKey];
      if (!app || !app.renderer || typeof app.renderer.render !== 'function') {
        return;
      }
      const pool = state.pixi[poolKey];
      for (let i = 0; i < pool.length; i += 1) {
        pool[i].visible = false;
      }
      app.renderer.render(app.stage);
    }

    function clearPixiSurfaces() {
      clearPixiLayerApp('back');
      clearPixiLayerApp('front');
    }

    function disablePixiMode(reason = '') {
      const wasEnabled = state.pixi.enabled === true;
      state.pixi.enabled = false;
      state.pixi.mode = 'canvas';
      state.pixi.disabledReason = reason;
      if (wasEnabled) {
        clearPixiSurfaces();
      }
    }

    function ensurePixiAppForLayer(layerName) {
      const PIXI = getPixiLibrary();
      if (!PIXI || typeof PIXI.Application !== 'function') {
        disablePixiMode('PIXI unavailable');
        return null;
      }
      const canvasEl = resolvePixiSurfaceCanvas(layerName);
      if (!canvasEl) {
        disablePixiMode('PIXI layer canvas missing');
        return null;
      }

      const appKey = layerName === 'front' ? 'frontApp' : 'backApp';
      const stageKey = layerName === 'front' ? 'frontStage' : 'backStage';
      const initPromiseKey = layerName === 'front' ? 'frontInitPromise' : 'backInitPromise';
      const initReadyKey = layerName === 'front' ? 'frontInitReady' : 'backInitReady';
      let app = state.pixi[appKey];

      const targetWidth = Math.max(1, Math.floor(canvasEl.width || 1));
      const targetHeight = Math.max(1, Math.floor(canvasEl.height || 1));
      const baseOptions = {
        view: canvasEl,
        width: targetWidth,
        height: targetHeight,
        autoStart: false,
        sharedTicker: false,
        antialias: false,
        autoDensity: false,
        backgroundAlpha: 0,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,
        resolution: 1,
        eventMode: 'none',
        eventFeatures: {
          move: false,
          globalMove: false,
          click: false,
          wheel: false,
        },
      };

      if (!app) {
        app = new PIXI.Application(baseOptions);
        if (typeof app.stop === 'function') {
          app.stop();
        }
        state.pixi[appKey] = app;
        state.pixi[stageKey] = app.stage || new PIXI.Container();
        configurePixiStageForPerf(state.pixi[stageKey]);
        state.pixi[initPromiseKey] = null;
        state.pixi[initReadyKey] = Boolean(
          app.renderer && typeof app.renderer.render === 'function',
        );
      }

      const hasRenderer = Boolean(app && app.renderer && typeof app.renderer.render === 'function');
      if (!hasRenderer) {
        if (typeof app.init === 'function') {
          const existingPromise = state.pixi[initPromiseKey];
          if (!existingPromise) {
            state.pixi[initPromiseKey] = app.init(baseOptions)
              .then(() => {
                if (typeof app.stop === 'function') {
                  app.stop();
                }
                state.pixi[stageKey] = app.stage || new PIXI.Container();
                configurePixiStageForPerf(state.pixi[stageKey]);
                state.pixi[initReadyKey] = Boolean(
                  app.renderer && typeof app.renderer.render === 'function',
                );
                const sizeKeyStateAsync = layerName === 'front' ? 'lastSizeKeyFront' : 'lastSizeKeyBack';
                state.pixi[sizeKeyStateAsync] = '';
                const layerMetrics = layerName === 'front'
                  ? state.pixi.layerMetrics.front
                  : state.pixi.layerMetrics.back;
                layerMetrics.key = '';
              })
              .catch((error) => {
                const message = error && error.message ? error.message : 'PIXI init failed';
                disablePixiMode(message);
                console.warn('[FlowersPixi] init failed, falling back to canvas renderer:', message);
              });
          }
          return null;
        }
        disablePixiMode('PIXI renderer unavailable');
        return null;
      }

      state.pixi[initReadyKey] = true;
      const sizeKeyState = layerName === 'front' ? 'lastSizeKeyFront' : 'lastSizeKeyBack';
      const pendingResizeState = layerName === 'front' ? 'pendingResizeFront' : 'pendingResizeBack';
      const sizeKey = `${targetWidth}x${targetHeight}`;
      const sizeChanged = state.pixi[sizeKeyState] !== sizeKey;
      const shouldDeferResize = shouldDeferViewportHeavyResize();
      if (sizeChanged && shouldDeferResize) {
        state.pixi[pendingResizeState] = true;
        viewportDebugLog(
          'flowers.pixi.resize.defer',
          `layer=${layerName}`,
          `target=${sizeKey}`,
        );
        return app;
      }
      if (sizeChanged || state.pixi[pendingResizeState] === true) {
        const resizeStartMs = performance.now();
        if (app.renderer && typeof app.renderer.resize === 'function') {
          app.renderer.resize(targetWidth, targetHeight);
        }
        state.pixi[sizeKeyState] = sizeKey;
        state.pixi[pendingResizeState] = false;
        const layerMetrics = layerName === 'front'
          ? state.pixi.layerMetrics.front
          : state.pixi.layerMetrics.back;
        layerMetrics.key = '';
        viewportDebugLog(
          'flowers.pixi.resize.apply',
          `layer=${layerName}`,
          `target=${sizeKey}`,
          `duration=${(performance.now() - resizeStartMs).toFixed(2)}ms`,
        );
      }

      return app;
    }

    function getPixiTextureForSourceRect(assetPath, sourceRect) {
      const PIXI = getPixiLibrary();
      if (!PIXI || !assetPath || !sourceRect) {
        return null;
      }
      const image = getImage(assetPath);
      if (!image) {
        return null;
      }
      const imageWidth = Number.isFinite(Number(image.naturalWidth)) && Number(image.naturalWidth) > 0
        ? Number(image.naturalWidth)
        : Number(image.width);
      const imageHeight = Number.isFinite(Number(image.naturalHeight)) && Number(image.naturalHeight) > 0
        ? Number(image.naturalHeight)
        : Number(image.height);
      if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
        return null;
      }
      const sxRaw = Number(sourceRect.sx);
      const syRaw = Number(sourceRect.sy);
      const swRaw = Number(sourceRect.sw);
      const shRaw = Number(sourceRect.sh);
      if (!Number.isFinite(sxRaw) || !Number.isFinite(syRaw) || !Number.isFinite(swRaw) || !Number.isFinite(shRaw)) {
        return null;
      }

      const sx = clamp(sxRaw, 0, Math.max(0, imageWidth - 1e-6));
      const sy = clamp(syRaw, 0, Math.max(0, imageHeight - 1e-6));
      const maxWidth = imageWidth - sx;
      const maxHeight = imageHeight - sy;
      if (maxWidth <= 1e-6 || maxHeight <= 1e-6) {
        return null;
      }
      const sw = clamp(swRaw, 1e-6, maxWidth);
      const sh = clamp(shRaw, 1e-6, maxHeight);

      const key = `${assetPath}|${sx.toFixed(4)}|${sy.toFixed(4)}|${sw.toFixed(4)}|${sh.toFixed(4)}`;
      const cached = state.pixi.textureCache.get(key);
      if (cached) {
        return cached;
      }
      let baseTexture = state.pixi.baseTextureCache.get(assetPath) || null;
      if (!baseTexture || baseTexture.valid === false) {
        baseTexture = PIXI.BaseTexture.from(image);
        state.pixi.baseTextureCache.set(assetPath, baseTexture);
      }
      const rect = new PIXI.Rectangle(sx, sy, sw, sh);
      let texture = null;
      try {
        texture = new PIXI.Texture(baseTexture, rect);
      } catch (error) {
        if (state.pixi.enabled) {
          console.warn('[FlowersPixi] Invalid texture frame; using canvas fallback for this draw.', error);
        }
        return null;
      }
      state.pixi.textureCache.set(key, texture);
      return texture;
    }

    function beginPixiLayerFrame(layerName) {
      if (layerName === 'front') {
        state.pixi.frontPoolCursor = 0;
      } else {
        state.pixi.backPoolCursor = 0;
      }
    }

    function acquirePixiSprite(layerName, texture, appInstance = null) {
      const app = appInstance || ensurePixiAppForLayer(layerName);
      if (!app || !texture) {
        return null;
      }
      const poolKey = layerName === 'front' ? 'frontSpritePool' : 'backSpritePool';
      const cursorKey = layerName === 'front' ? 'frontPoolCursor' : 'backPoolCursor';
      const stageKey = layerName === 'front' ? 'frontStage' : 'backStage';
      const pool = state.pixi[poolKey];
      const cursor = state.pixi[cursorKey];
      let sprite = pool[cursor];
      if (!sprite) {
        const PIXI = getPixiLibrary();
        sprite = new PIXI.Sprite(texture);
        sprite.eventMode = 'none';
        sprite.interactiveChildren = false;
        sprite.cullable = false;
        pool.push(sprite);
        const stage = state.pixi[stageKey] || app.stage;
        stage.addChild(sprite);
      } else if (sprite.texture !== texture) {
        sprite.texture = texture;
      }
      state.pixi[cursorKey] = cursor + 1;
      sprite.visible = true;
      return sprite;
    }

    function endPixiLayerFrame(layerName) {
      const poolKey = layerName === 'front' ? 'frontSpritePool' : 'backSpritePool';
      const cursorKey = layerName === 'front' ? 'frontPoolCursor' : 'backPoolCursor';
      const appKey = layerName === 'front' ? 'frontApp' : 'backApp';
      const pool = state.pixi[poolKey];
      const used = state.pixi[cursorKey];
      for (let i = used; i < pool.length; i += 1) {
        pool[i].visible = false;
      }
      const app = state.pixi[appKey];
      if (app && app.renderer && typeof app.renderer.render === 'function') {
        app.renderer.render(app.stage);
      }
    }

    function markStaticLayerDirty() {
      state.staticLayerDirty = true;
    }

    function invalidateAllFlowerRenderCaches() {
      let invalidatedCount = 0;
      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        if (flower && flower.renderCache) {
          flower.renderCache.valid = false;
          invalidatedCount += 1;
        }
      }
      viewportDebugLog('flowers.invalidateAllFlowerRenderCaches', `count=${invalidatedCount}`);
    }

    function resetStaticLayerActiveSnapshot() {
      state.staticLayerActiveSnapshot = [];
    }

    function ensureStaticLayerCanvas(width, height, scaleX = 1, scaleY = 1) {
      const safeWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : 1;
      const safeHeight = Number.isFinite(height) ? Math.max(1, Math.floor(height)) : 1;
      const safeScaleX = Number.isFinite(scaleX) && Math.abs(scaleX) > 1e-8 ? Math.abs(scaleX) : 1;
      const safeScaleY = Number.isFinite(scaleY) && Math.abs(scaleY) > 1e-8 ? Math.abs(scaleY) : 1;
      if (!state.staticLayerCanvas) {
        state.staticLayerCanvas = document.createElement('canvas');
        state.staticLayerCtx = state.staticLayerCanvas.getContext('2d');
        markStaticLayerDirty();
      }
      if (
        state.staticLayerCanvas.width !== safeWidth
        || state.staticLayerCanvas.height !== safeHeight
      ) {
        if (shouldDeferViewportHeavyResize()) {
          state.pendingStaticLayerResize = true;
          state.pendingStaticLayerWidth = safeWidth;
          state.pendingStaticLayerHeight = safeHeight;
          state.pendingStaticLayerScaleX = safeScaleX;
          state.pendingStaticLayerScaleY = safeScaleY;
          viewportDebugLog(
            'flowers.staticLayer.resize.defer',
            `size=${safeWidth}x${safeHeight}`,
          );
          return state.staticLayerCtx;
        }
        state.staticLayerCanvas.width = safeWidth;
        state.staticLayerCanvas.height = safeHeight;
        markStaticLayerDirty();
        viewportDebugLog(
          'flowers.staticLayer.resize.apply',
          `size=${safeWidth}x${safeHeight}`,
        );
      }
      if (
        Math.abs(state.staticLayerScaleX - safeScaleX) > 1e-8
        || Math.abs(state.staticLayerScaleY - safeScaleY) > 1e-8
      ) {
        if (shouldDeferViewportHeavyResize()) {
          state.pendingStaticLayerResize = true;
          state.pendingStaticLayerWidth = safeWidth;
          state.pendingStaticLayerHeight = safeHeight;
          state.pendingStaticLayerScaleX = safeScaleX;
          state.pendingStaticLayerScaleY = safeScaleY;
          viewportDebugLog(
            'flowers.staticLayer.scale.defer',
            `scale=${safeScaleX.toFixed(4)}x${safeScaleY.toFixed(4)}`,
          );
          return state.staticLayerCtx;
        }
        state.staticLayerScaleX = safeScaleX;
        state.staticLayerScaleY = safeScaleY;
        markStaticLayerDirty();
      }
      if (
        state.pendingStaticLayerResize
        && !shouldDeferViewportHeavyResize()
      ) {
        state.staticLayerCanvas.width = Math.max(1, Math.floor(state.pendingStaticLayerWidth || safeWidth));
        state.staticLayerCanvas.height = Math.max(1, Math.floor(state.pendingStaticLayerHeight || safeHeight));
        state.staticLayerScaleX = Number.isFinite(state.pendingStaticLayerScaleX) ? Math.max(1e-8, Math.abs(state.pendingStaticLayerScaleX)) : safeScaleX;
        state.staticLayerScaleY = Number.isFinite(state.pendingStaticLayerScaleY) ? Math.max(1e-8, Math.abs(state.pendingStaticLayerScaleY)) : safeScaleY;
        state.pendingStaticLayerResize = false;
        markStaticLayerDirty();
        viewportDebugLog(
          'flowers.staticLayer.resize.flush',
          `size=${state.staticLayerCanvas.width}x${state.staticLayerCanvas.height}`,
          `scale=${state.staticLayerScaleX.toFixed(4)}x${state.staticLayerScaleY.toFixed(4)}`,
        );
      }
      if (state.staticLayerCtx) {
        state.staticLayerCtx.setTransform(state.staticLayerScaleX, 0, 0, state.staticLayerScaleY, 0, 0);
        state.staticLayerCtx.imageSmoothingEnabled = true;
      }
      return state.staticLayerCtx;
    }

    function hasActiveMembershipChanged() {
      const previous = state.staticLayerActiveSnapshot;
      const current = state.activeFlowerIndices;
      if (previous.length !== current.length) {
        return true;
      }
      for (let i = 0; i < current.length; i += 1) {
        if (previous[i] !== current[i]) {
          return true;
        }
      }
      return false;
    }

    function syncActiveMembershipSnapshot() {
      if (!hasActiveMembershipChanged()) {
        return false;
      }
      state.staticLayerActiveSnapshot = state.activeFlowerIndices.slice();
      markStaticLayerDirty();
      return true;
    }

    function getImage(path) {
      if (typeof path !== 'string' || path.length === 0) {
        return null;
      }
      return state.imageCache.get(path) || null;
    }

    async function loadBakedAtlasImageWithFallbacks(manifestPath, fileName, allowFallback = true) {
      const candidateNames = allowFallback
        ? buildFallbackAtlasFileNameCandidates(fileName)
        : [fileName];
      let lastError = null;
      for (let i = 0; i < candidateNames.length; i += 1) {
        const candidateName = candidateNames[i];
        const url = normalizeManifestRelativePath(manifestPath, candidateName);
        if (typeof url !== 'string' || url.length === 0) {
          continue;
        }
        try {
          const image = await loadImage(url);
          return {
            image,
            resolvedUrl: url,
            resolvedFileName: candidateName,
          };
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) {
        throw lastError;
      }
      throw new Error(`Failed to load baked atlas page: ${fileName}`);
    }

    function resetBakedState() {
      state.baked.enabled = false;
      state.baked.prepared = false;
      state.baked.preparing = false;
      state.baked.failedReason = '';
      state.baked.manifestPath = '';
      state.baked.manifest = null;
      state.baked.exportSettings = null;
      state.baked.variantByKey = new Map();
      state.baked.variantsByType = {
        lilyByRowOneBased: new Map(),
        blueByAssetPath: new Map(),
        blueFallback: null,
      };
      state.baked.pageImageByFileName = new Map();
      state.baked.pageLoadPromisesByFileName = new Map();
      state.baked.pageLoadFailedFileNames = new Set();
      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        if (!flower) {
          continue;
        }
        flower.bakedVariant = null;
      }
    }

    function indexBakedVariants(manifest) {
      const variants = isPlainObject(manifest && manifest.variants) ? manifest.variants : {};
      const variantKeys = Object.keys(variants);
      const indexedByKey = new Map();
      const lilyByRowOneBased = new Map();
      const blueByAssetPath = new Map();

      for (let i = 0; i < variantKeys.length; i += 1) {
        const variantKey = variantKeys[i];
        const variant = variants[variantKey];
        if (!isPlainObject(variant) || !Array.isArray(variant.frames) || variant.frames.length === 0) {
          continue;
        }
        indexedByKey.set(variantKey, variant);
        if (variant.type === 'lily') {
          const match = variantKey.match(/^lily_row_(\d+)$/i);
          if (match) {
            const rowOneBased = Math.max(1, Math.floor(Number(match[1]) || 1));
            lilyByRowOneBased.set(rowOneBased, variant);
          }
          continue;
        }
        if (variant.type === 'blue') {
          const assetPathKey = sanitizePathKey(variant.assetPath);
          if (assetPathKey.length > 0 && !blueByAssetPath.has(assetPathKey)) {
            blueByAssetPath.set(assetPathKey, variant);
          }
        }
      }

      return {
        indexedByKey,
        lilyByRowOneBased,
        blueByAssetPath,
        blueFallback: null,
      };
    }

    function resolveBakedLilyRowOneBased(flower) {
      if (!flower || !Array.isArray(flower.petals) || flower.petals.length === 0) {
        return 1;
      }
      const typeConfig = flower.typeConfig || {};
      const spriteCols = Number.isFinite(typeConfig.spriteCols)
        ? Math.max(1, Math.floor(typeConfig.spriteCols))
        : 8;
      const stamenCol = Math.max(0, spriteCols - 1);
      const counts = new Map();
      for (let i = 0; i < flower.petals.length; i += 1) {
        const petal = flower.petals[i];
        if (!petal) {
          continue;
        }
        if (petal.col === stamenCol) {
          continue;
        }
        const rowZeroBased = Number.isFinite(petal.row) ? Math.floor(petal.row) : 0;
        const rowOneBased = Math.max(1, rowZeroBased + 1);
        counts.set(rowOneBased, (counts.get(rowOneBased) || 0) + 1);
      }
      if (counts.size === 0) {
        const fallbackRow = Number.isFinite(flower.petals[0] && flower.petals[0].row)
          ? Math.floor(flower.petals[0].row) + 1
          : 1;
        return Math.max(1, fallbackRow);
      }
      let bestRow = 1;
      let bestCount = -1;
      for (const [rowOneBased, count] of counts.entries()) {
        if (count > bestCount) {
          bestCount = count;
          bestRow = rowOneBased;
        }
      }
      return bestRow;
    }

    function resolveBakedVariantForFlower(flower) {
      if (!flower || !state.baked.prepared) {
        return null;
      }
      if (flower.type === 'lily') {
        const rowOneBased = resolveBakedLilyRowOneBased(flower);
        return state.baked.variantsByType.lilyByRowOneBased.get(rowOneBased) || null;
      }
      if (flower.type === 'blue') {
        const key = sanitizePathKey(flower.assetPath);
        if (key.length > 0) {
          const byPath = state.baked.variantsByType.blueByAssetPath.get(key);
          if (byPath) {
            return byPath;
          }
        }
        return state.baked.variantsByType.blueFallback || null;
      }
      return null;
    }

    function bindBakedVariantsToFlowers() {
      if (!state.baked.prepared) {
        return;
      }
      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        if (!flower) {
          continue;
        }
        flower.bakedVariant = resolveBakedVariantForFlower(flower);
      }
    }

    function getBakedVariantPageFileNames(variant) {
      if (!variant || !Array.isArray(variant.frames) || variant.frames.length === 0) {
        return [];
      }
      const out = new Set();
      if (Array.isArray(variant.pages) && variant.pages.length > 0) {
        for (let i = 0; i < variant.pages.length; i += 1) {
          const page = variant.pages[i];
          const fileName = page && typeof page.fileName === 'string' ? page.fileName.trim() : '';
          if (fileName.length > 0) {
            out.add(fileName);
          }
        }
      }
      if (out.size === 0) {
        for (let i = 0; i < variant.frames.length; i += 1) {
          const frame = variant.frames[i];
          const fileName = frame && typeof frame.fileName === 'string' ? frame.fileName.trim() : '';
          if (fileName.length > 0) {
            out.add(fileName);
          }
        }
      }
      return Array.from(out);
    }

    async function ensureBakedPageImageLoaded(fileName, commonConfig = null) {
      if (!state.baked.prepared || typeof fileName !== 'string' || fileName.trim().length === 0) {
        return null;
      }
      const normalizedFileName = fileName.trim();
      const cached = state.baked.pageImageByFileName.get(normalizedFileName);
      if (cached) {
        return cached;
      }
      if (state.baked.pageLoadFailedFileNames.has(normalizedFileName)) {
        return null;
      }
      const inFlight = state.baked.pageLoadPromisesByFileName.get(normalizedFileName);
      if (inFlight) {
        return inFlight;
      }
      const safeCommonConfig = commonConfig || resolveCommonFlowerConfig({});
      const loadPromise = loadBakedAtlasImageWithFallbacks(
        state.baked.manifestPath,
        normalizedFileName,
        safeCommonConfig.bakedAllowFilenameFallback,
      )
        .then((loaded) => {
          if (!loaded || !loaded.image) {
            throw new Error(`Invalid baked page payload: ${normalizedFileName}`);
          }
          state.baked.pageImageByFileName.set(normalizedFileName, loaded.image);
          if (
            typeof loaded.resolvedFileName === 'string'
            && loaded.resolvedFileName.length > 0
          ) {
            state.baked.pageImageByFileName.set(loaded.resolvedFileName, loaded.image);
          }
          if (
            typeof loaded.resolvedUrl === 'string'
            && loaded.resolvedUrl.length > 0
          ) {
            state.imageCache.set(loaded.resolvedUrl, loaded.image);
          }
          return loaded.image;
        })
        .catch((error) => {
          state.baked.pageLoadFailedFileNames.add(normalizedFileName);
          if (safeCommonConfig.bakedLogEnabled) {
            const message = error && error.message ? error.message : String(error);
            console.warn('[FlowersBaked] Failed page load:', normalizedFileName, message);
          }
          return null;
        })
        .finally(() => {
          state.baked.pageLoadPromisesByFileName.delete(normalizedFileName);
        });
      state.baked.pageLoadPromisesByFileName.set(normalizedFileName, loadPromise);
      return loadPromise;
    }

    function prefetchBakedPagesForCurrentFlowers(commonConfig = null) {
      if (!state.baked.prepared || state.flowers.length === 0) {
        return;
      }
      const safeCommonConfig = commonConfig || resolveCommonFlowerConfig({});
      const needed = new Set();
      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        const variant = flower && flower.bakedVariant ? flower.bakedVariant : null;
        if (!variant) {
          continue;
        }
        const pageNames = getBakedVariantPageFileNames(variant);
        for (let p = 0; p < pageNames.length; p += 1) {
          needed.add(pageNames[p]);
        }
      }
      for (const fileName of needed) {
        ensureBakedPageImageLoaded(fileName, safeCommonConfig).catch(() => {});
      }
    }

    async function prepareBakedAssets(flowersConfig, commonConfig = null) {
      const safeCommonConfig = commonConfig || resolveCommonFlowerConfig(flowersConfig || {});
      if (safeCommonConfig.bakedFlowersEnabled !== true) {
        resetBakedState();
        return {
          enabled: false,
          prepared: false,
        };
      }

      const manifestPath = normalizeHostedAssetPath(safeCommonConfig.bakedManifestPath);
      if (
        state.baked.prepared
        && state.baked.enabled
        && state.baked.manifestPath === manifestPath
      ) {
        bindBakedVariantsToFlowers();
        return {
          enabled: true,
          prepared: true,
        };
      }

      resetBakedState();
      state.baked.enabled = true;
      state.baked.preparing = true;
      state.baked.manifestPath = manifestPath;

      try {
        const response = await fetch(manifestPath, { cache: 'no-store' });
        if (!response || response.ok !== true) {
          throw new Error(`Failed to load baked flower manifest: ${manifestPath}`);
        }
        const manifest = await response.json();
        if (!isPlainObject(manifest) || !isPlainObject(manifest.variants)) {
          throw new Error('Invalid baked flower manifest format.');
        }
        state.baked.manifest = manifest;
        state.baked.exportSettings = isPlainObject(manifest.exportSettings) ? manifest.exportSettings : {};

        const variantIndex = indexBakedVariants(manifest);
        state.baked.variantByKey = variantIndex.indexedByKey;
        state.baked.variantsByType = {
          lilyByRowOneBased: variantIndex.lilyByRowOneBased,
          blueByAssetPath: variantIndex.blueByAssetPath,
          blueFallback: variantIndex.blueFallback,
        };

        if (state.baked.variantByKey.size <= 0) {
          throw new Error('No usable baked variants found in manifest.');
        }

        state.baked.prepared = true;
        state.baked.failedReason = '';
        bindBakedVariantsToFlowers();
        prefetchBakedPagesForCurrentFlowers(safeCommonConfig);
        if (safeCommonConfig.bakedLogEnabled) {
          console.log(
            '[FlowersBaked]',
            `manifest=${manifestPath}`,
            `variants=${state.baked.variantByKey.size}`,
            `pagesLoaded=${state.baked.pageImageByFileName.size}`,
          );
        }
        return {
          enabled: true,
          prepared: true,
          variants: state.baked.variantByKey.size,
          pages: 0,
        };
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        state.baked.prepared = false;
        state.baked.failedReason = message;
        state.baked.enabled = false;
        if (safeCommonConfig.bakedLogEnabled) {
          console.warn('[FlowersBaked] Failed to prepare baked assets:', message);
        }
        throw error;
      } finally {
        state.baked.preparing = false;
      }
    }

    function loadSprite(spritePath) {
      const nextSpritePath = (typeof spritePath === 'string' && spritePath.length > 0)
        ? spritePath
        : DEFAULT_LILY_SPRITE_PATH;

      const cachedImage = state.imageCache.get(nextSpritePath);
      if (cachedImage) {
        return Promise.resolve(cachedImage);
      }

      const inFlight = state.imageLoadPromises.get(nextSpritePath);
      if (inFlight) {
        return inFlight;
      }

      const promise = loadImage(nextSpritePath)
        .then((image) => {
          // Invalidate Pixi texture slices for this asset path so rect textures are rebuilt
          // against the latest source image dimensions/content.
          const texturePrefix = `${nextSpritePath}|`;
          for (const [textureKey, texture] of state.pixi.textureCache.entries()) {
            if (!textureKey.startsWith(texturePrefix)) {
              continue;
            }
            state.pixi.textureCache.delete(textureKey);
            if (texture && typeof texture.destroy === 'function') {
              texture.destroy(false);
            }
          }
          const previousBaseTexture = state.pixi.baseTextureCache.get(nextSpritePath) || null;
          if (previousBaseTexture && typeof previousBaseTexture.destroy === 'function') {
            previousBaseTexture.destroy();
          }
          state.pixi.baseTextureCache.delete(nextSpritePath);
          state.imageCache.set(nextSpritePath, image);
          markStaticLayerDirty();
          invalidateAllFlowerRenderCaches();
          return image;
        })
        .finally(() => {
          state.imageLoadPromises.delete(nextSpritePath);
        });

      state.imageLoadPromises.set(nextSpritePath, promise);
      return promise;
    }

    async function loadAssets(flowersConfig) {
      const commonConfig = resolveCommonFlowerConfig(flowersConfig || {});
      const useBaked = commonConfig.bakedFlowersEnabled === true;
      let bakedResult = null;
      if (useBaked) {
        try {
          bakedResult = await prepareBakedAssets(flowersConfig, commonConfig);
          if (commonConfig.bakedFallbackToLive !== true) {
            return {
              requested: Number(bakedResult && bakedResult.pages) || 0,
              loaded: Number(bakedResult && bakedResult.pages) || 0,
              baked: true,
            };
          }
        } catch (_error) {
          if (commonConfig.bakedFallbackToLive !== true) {
            throw _error;
          }
        }
      } else {
        resetBakedState();
      }

      const assignmentMode = sanitizeAssignmentMode(commonConfig.assignmentMode);
      const typeNames = [];

      if (assignmentMode === 'mixed') {
        const sanitizedRatios = sanitizeMixRatios(commonConfig.mixRatios, FLOWER_TYPE_REGISTRY, 'lily');
        const ratioTypeNames = Object.keys(sanitizedRatios);
        for (let i = 0; i < ratioTypeNames.length; i += 1) {
          typeNames.push(ratioTypeNames[i]);
        }
      } else {
        typeNames.push(sanitizeSingleType(commonConfig.singleType, FLOWER_TYPE_REGISTRY, 'lily'));
      }

      if (typeNames.length === 0) {
        typeNames.push('lily');
      }

      const uniqueTypeNames = Array.from(new Set(typeNames));
      const pathsToLoad = [];
      for (let i = 0; i < uniqueTypeNames.length; i += 1) {
        const typeName = uniqueTypeNames[i];
        const entry = FLOWER_TYPE_REGISTRY[typeName] || FLOWER_TYPE_REGISTRY.lily;
        const typeConfig = resolveTypeConfig(typeName, flowersConfig || {});
        const assetPaths = entry.getAssetPaths(typeConfig);
        for (let p = 0; p < assetPaths.length; p += 1) {
          const path = assetPaths[p];
          if (typeof path === 'string' && path.length > 0) {
            pathsToLoad.push(path);
          }
        }
      }

      const uniquePaths = Array.from(new Set(pathsToLoad));
      const results = await Promise.allSettled(uniquePaths.map((path) => loadSprite(path)));

      let loadedCount = 0;
      for (let i = 0; i < results.length; i += 1) {
        if (results[i].status === 'fulfilled') {
          loadedCount += 1;
        }
      }

      if (uniquePaths.length > 0 && loadedCount === 0) {
        const firstFailure = results.find((result) => result.status === 'rejected');
        if (firstFailure && firstFailure.reason instanceof Error) {
          throw firstFailure.reason;
        }
        throw new Error('Failed to load any flower assets.');
      }

      return {
        requested: uniquePaths.length,
        loaded: loadedCount,
        baked: Boolean(bakedResult && bakedResult.prepared),
      };
    }

    function setEndpoints(endpoints, flowersConfig) {
      const setEndpointsStartMs = performance.now();
      const source = Array.isArray(endpoints) ? endpoints : [];
      const safeFlowersConfig = isPlainObject(flowersConfig) ? flowersConfig : {};
      const commonConfig = resolveCommonFlowerConfig(safeFlowersConfig);

      state.flowers = [];
      state.alwaysSimAccumulatorSec = 0;
      state.alwaysSimLastMs = 0;
      state.alwaysRenderAlpha = 0;
      for (let i = 0; i < source.length; i += 1) {
        const endpoint = source[i];
        const typeName = resolveTypeNameForEndpoint(endpoint, i, commonConfig);
        const entry = FLOWER_TYPE_REGISTRY[typeName] || FLOWER_TYPE_REGISTRY.lily;
        const typeConfig = resolveTypeConfig(typeName, safeFlowersConfig);

        const stableToken = getStableToken(endpoint, i);
        const rng = mulberry32(hashSeed(`${stableToken}|flower`));
        const built = entry.buildFlower(endpoint, typeConfig, commonConfig, rng);
        if (!built || !Array.isArray(built.petals) || built.petals.length === 0) {
          continue;
        }
        const petals = [];
        const spriteCols = Number.isFinite(typeConfig.spriteCols)
          ? Math.max(1, Math.floor(typeConfig.spriteCols))
          : 1;
        const spriteRows = Number.isFinite(typeConfig.spriteRows)
          ? Math.max(1, Math.floor(typeConfig.spriteRows))
          : 1;
        const closedMiddlePetalCol = resolveLilyMiddlePetalColumn(typeConfig);
        const useClosedLilySpriteSheet = (
          typeName === 'lily'
          && typeConfig.closedUseMiddlePetalSprite === true
        );
        const closedLilySpriteCell = useClosedLilySpriteSheet
          ? sampleLilyClosedSpriteCell(typeConfig, rng)
          : null;
        const closedLilySpriteCol = closedLilySpriteCell ? closedLilySpriteCell.col : null;
        const closedLilySpriteRow = closedLilySpriteCell ? closedLilySpriteCell.row : null;

        for (let p = 0; p < built.petals.length; p += 1) {
          const rawPetal = built.petals[p] || {};
          const col = clamp(
            Number.isFinite(rawPetal.col) ? Math.floor(rawPetal.col) : 0,
            0,
            Math.max(0, spriteCols - 1),
          );
          const row = clamp(
            Number.isFinite(rawPetal.row) ? Math.floor(rawPetal.row) : 0,
            0,
            Math.max(0, spriteRows - 1),
          );
          const offsetX = Number.isFinite(rawPetal.offsetX) ? rawPetal.offsetX : 0;
          const offsetY = Number.isFinite(rawPetal.offsetY) ? rawPetal.offsetY : 0;
          const sourceRect = getSpriteSourceRect(typeConfig, col, row);
          const normalizedPetal = {
            col,
            row,
            sourceRect,
            baseAngleRad: Number.isFinite(rawPetal.baseAngleRad) ? rawPetal.baseAngleRad : 0,
            baseCos: 0,
            baseSin: 0,
            screenOffsetY: Number.isFinite(rawPetal.screenOffsetY) ? rawPetal.screenOffsetY : 0,
            screenOffsetX: Number.isFinite(rawPetal.screenOffsetX) ? rawPetal.screenOffsetX : 0,
            offsetX,
            offsetY,
            radialDistance: Number.isFinite(rawPetal.radialDistance)
              ? Math.max(0, rawPetal.radialDistance)
              : Math.hypot(offsetX, offsetY),
            distanceSq: Number.isFinite(rawPetal.distanceSq)
              ? rawPetal.distanceSq
              : (offsetX * offsetX + offsetY * offsetY),
            hoverAmplitudeRad: Number.isFinite(rawPetal.hoverAmplitudeRad)
              ? rawPetal.hoverAmplitudeRad
              : 0,
            hoverSpeed: Number.isFinite(rawPetal.hoverSpeed) ? rawPetal.hoverSpeed : 0,
            jumpAngleOffsetRad: 0,
            jumpTargetAngleOffsetRad: 0,
          };
          normalizedPetal.baseCos = Math.cos(normalizedPetal.baseAngleRad);
          normalizedPetal.baseSin = Math.sin(normalizedPetal.baseAngleRad);

          if (typeName === 'lily') {
            let innerCol = col;
            if (col === 0) {
              innerCol = Math.min(Math.max(0, spriteCols - 1), 1);
            } else if (col === 6) {
              innerCol = Math.max(0, Math.min(spriteCols - 1, 5));
            }
            normalizedPetal.innerSourceRect = getSpriteSourceRect(typeConfig, innerCol, row);
            normalizedPetal.closedMiddleSourceRect = getSpriteSourceRect(
              typeConfig,
              closedMiddlePetalCol,
              row,
            );
            if (closedLilySpriteCell) {
              normalizedPetal.closedLilySourceRect = getLilyClosedSpriteSourceRect(
                typeConfig,
                closedLilySpriteCell.col,
                closedLilySpriteCell.row,
              );
            }
          }

          petals.push(normalizedPetal);
        }

        const drawSize = commonConfig.drawSize;
        const interactionRadius = Number.isFinite(built.interactionRadius)
          ? Math.max(0, built.interactionRadius)
          : drawSize * commonConfig.swayInteractionRadiusFactor;

        state.flowers.push({
          type: typeName,
          typeConfig,
          assetPath: typeof built.assetPath === 'string' ? built.assetPath : '',
          closedAssetPath: useClosedLilySpriteSheet ? resolveLilyClosedAssetPath(typeConfig) : '',
          closedSpriteCol: closedLilySpriteCol,
          closedSpriteRow: closedLilySpriteRow,
          centerAngleRad: Number.isFinite(built.centerAngleRad) ? built.centerAngleRad : 0,
          branchId: endpoint && Number.isFinite(endpoint.branchId) ? endpoint.branchId : null,
          x: endpoint && Number.isFinite(endpoint.x) ? endpoint.x : 0,
          y: endpoint && Number.isFinite(endpoint.y) ? endpoint.y : 0,
          growthScale: endpoint && Number.isFinite(endpoint.growthScale)
            ? Math.max(0.0001, endpoint.growthScale)
            : 1,
          growthPositionScale: endpoint && Number.isFinite(endpoint.growthPositionScale)
            ? Math.max(0.0001, endpoint.growthPositionScale)
            : 1,
          petals,
          interactionRadius,
          hoverInfluence: 0,
          prevHoverInfluence: 0,
          renderHoverInfluence: 0,
          targetInfluence: 0,
          motionTime: 0,
          prevMotionTime: 0,
          renderMotionTime: 0,
          wasInsideRange: false,
          isSwayActive: false,
          hasJumpMotion: false,
          isActive: false,
          renderCache: {
            canvas: null,
            ctx: null,
            valid: false,
            widthCss: 0,
            heightCss: 0,
            widthPx: 0,
            heightPx: 0,
            originXCss: 0,
            originYCss: 0,
            scaleX: 1,
            scaleY: 1,
            petalOpenAmount: 1,
            useClosedPetalSprites: false,
            alwaysPoseKey: '',
          },
          bakedVariant: null,
        });
      }

      bindBakedVariantsToFlowers();
      if (commonConfig.bakedFlowersEnabled === true) {
        prefetchBakedPagesForCurrentFlowers(commonConfig);
      }
      state.activeFlowerIndices = [];
      resetStaticLayerActiveSnapshot();
      markStaticLayerDirty();
      state.lastUpdateMs = 0;
      viewportDebugLog(
        'flowers.setEndpoints',
        `endpointCount=${source.length}`,
        `flowerCount=${state.flowers.length}`,
        `duration=${(performance.now() - setEndpointsStartMs).toFixed(2)}ms`,
      );
    }

    function setMousePosition(x, y) {
      const nextX = Number.isFinite(x) ? x : OFFSCREEN_POINTER;
      const nextY = Number.isFinite(y) ? y : OFFSCREEN_POINTER;
      const nowMs = performance.now();
      if (
        nextX !== OFFSCREEN_POINTER
        && nextY !== OFFSCREEN_POINTER
        && state.mouseLastSampleX !== OFFSCREEN_POINTER
        && state.mouseLastSampleY !== OFFSCREEN_POINTER
        && state.mouseLastSampleMs > 0
      ) {
        const dtSec = Math.max(1e-4, (nowMs - state.mouseLastSampleMs) / 1000);
        const dx = nextX - state.mouseLastSampleX;
        const dy = nextY - state.mouseLastSampleY;
        state.mouseSpeedPxPerSec = Math.hypot(dx, dy) / dtSec;
      }
      state.mouseLastSampleX = nextX;
      state.mouseLastSampleY = nextY;
      state.mouseLastSampleMs = nowMs;
      state.mouseX = nextX;
      state.mouseY = nextY;
    }

    function clearMousePosition() {
      state.mouseX = OFFSCREEN_POINTER;
      state.mouseY = OFFSCREEN_POINTER;
      state.mouseSpeedPxPerSec = 0;
      state.mouseLastSampleX = OFFSCREEN_POINTER;
      state.mouseLastSampleY = OFFSCREEN_POINTER;
      state.mouseLastSampleMs = 0;
    }

    function setWindPositions(positions) {
      if (!Array.isArray(positions) || positions.length === 0) {
        state.windPositions = null;
      } else {
        state.windPositions = positions;
      }
    }

    function setPetalOpenAmount(nextAmount) {
      const numeric = Number(nextAmount);
      if (!Number.isFinite(numeric)) {
        return state.petalOpenAmount;
      }
      if (state.flowerOpenAmountOverrideByBranchId.size > 0) {
        state.flowerOpenAmountOverrideByBranchId.clear();
      }
      state.petalOpenAmount = clamp(numeric, 0, 1);
      state.useClosedPetalSprites = state.petalOpenAmount <= 0.001;
      state.petalToggleTransition.active = false;
      state.petalToggleTransition.isClosing = false;
      state.petalToggleTransition.progress = 1;
      markStaticLayerDirty();
      invalidateAllFlowerRenderCaches();
      return state.petalOpenAmount;
    }

    function togglePetalOpenState() {
      if (state.flowerOpenAmountOverrideByBranchId.size > 0) {
        state.flowerOpenAmountOverrideByBranchId.clear();
      }
      state.petalOpenAmount = state.petalOpenAmount >= 0.5 ? 0 : 1;
      state.useClosedPetalSprites = state.petalOpenAmount <= 0.001;
      state.petalToggleTransition.active = false;
      state.petalToggleTransition.isClosing = false;
      state.petalToggleTransition.progress = 1;
      markStaticLayerDirty();
      invalidateAllFlowerRenderCaches();
      return state.petalOpenAmount;
    }

    function animateTogglePetalOpenState(flowersConfig, nowMs) {
      const commonConfig = resolveCommonFlowerConfig(flowersConfig || {});
      const startAmount = clamp(state.petalOpenAmount, 0, 1);
      const targetAmount = startAmount >= 0.5 ? 0 : 1;
      if (state.flowerOpenAmountOverrideByBranchId.size > 0) {
        state.flowerOpenAmountOverrideByBranchId.clear();
      }
      const durationMs = Math.max(0, commonConfig.petalToggleAnimationDurationSec * 1000);
      const startTimeMs = Number.isFinite(nowMs) ? nowMs : performance.now();

      state.petalToggleTransition = {
        active: durationMs > 0,
        startAmount,
        targetAmount,
        startTimeMs,
        durationMs,
        easePower: commonConfig.petalToggleAnimationEasePower,
        openBounceAmount: commonConfig.petalToggleOpenBounceAmount,
        openBounceOscillations: commonConfig.petalToggleOpenBounceOscillations,
        spriteSwapProgress: commonConfig.petalToggleSpriteSwapProgress,
        isClosing: targetAmount < startAmount,
        progress: 0,
      };

      if (durationMs <= 0) {
        state.petalOpenAmount = targetAmount;
        state.useClosedPetalSprites = targetAmount <= 0.001;
        state.petalToggleTransition.progress = 1;
      }
      markStaticLayerDirty();
      invalidateAllFlowerRenderCaches();

      return state.petalOpenAmount;
    }

    function getPetalOpenAmount() {
      return state.petalOpenAmount;
    }

    function getPetalOpenAmountForBranchId(branchId) {
      if (
        Number.isFinite(branchId)
        && state.flowerOpenAmountOverrideByBranchId
        && state.flowerOpenAmountOverrideByBranchId.has(branchId)
      ) {
        const overrideAmount = Number(state.flowerOpenAmountOverrideByBranchId.get(branchId));
        if (Number.isFinite(overrideAmount)) {
          return clamp(overrideAmount, 0, 1);
        }
      }
      return state.petalOpenAmount;
    }

    function hasPetalOpenAmountOverrideForBranchId(branchId) {
      return (
        Number.isFinite(branchId)
        && state.flowerOpenAmountOverrideByBranchId
        && state.flowerOpenAmountOverrideByBranchId.has(branchId)
      );
    }

    function getUseClosedPetalSpritesForBranchId(branchId) {
      if (
        Number.isFinite(branchId)
        && state.flowerOpenAmountOverrideByBranchId
        && state.flowerOpenAmountOverrideByBranchId.has(branchId)
      ) {
        const overrideAmount = Number(state.flowerOpenAmountOverrideByBranchId.get(branchId));
        if (Number.isFinite(overrideAmount)) {
          return clamp(overrideAmount, 0, 1) <= 0.001;
        }
      }
      return state.useClosedPetalSprites === true;
    }

    function setFlowerOpenAmountOverridesByBranchId(nextMap) {
      state.flowerOpenAmountOverrideByBranchId.clear();
      if (nextMap instanceof Map) {
        nextMap.forEach((value, key) => {
          if (!Number.isFinite(key)) {
            return;
          }
          const amount = Number(value);
          if (!Number.isFinite(amount)) {
            return;
          }
          state.flowerOpenAmountOverrideByBranchId.set(key, clamp(amount, 0, 1));
        });
      } else if (nextMap && typeof nextMap === 'object') {
        const keys = Object.keys(nextMap);
        for (let i = 0; i < keys.length; i += 1) {
          const keyNum = Number(keys[i]);
          if (!Number.isFinite(keyNum)) {
            continue;
          }
          const amount = Number(nextMap[keys[i]]);
          if (!Number.isFinite(amount)) {
            continue;
          }
          state.flowerOpenAmountOverrideByBranchId.set(keyNum, clamp(amount, 0, 1));
        }
      }
      markStaticLayerDirty();
      invalidateAllFlowerRenderCaches();
      return state.flowerOpenAmountOverrideByBranchId.size;
    }

    function clearFlowerOpenAmountOverridesByBranchId() {
      if (state.flowerOpenAmountOverrideByBranchId.size <= 0) {
        return 0;
      }
      const cleared = state.flowerOpenAmountOverrideByBranchId.size;
      state.flowerOpenAmountOverrideByBranchId.clear();
      markStaticLayerDirty();
      invalidateAllFlowerRenderCaches();
      return cleared;
    }

    function getUseClosedPetalSprites() {
      return state.useClosedPetalSprites === true;
    }

    function getPetalToggleIsActive() {
      return Boolean(state.petalToggleTransition && state.petalToggleTransition.active);
    }

    function getPetalToggleIsClosing() {
      return Boolean(state.petalToggleTransition && state.petalToggleTransition.isClosing);
    }

    function getPetalToggleProgress() {
      return state.petalToggleTransition && Number.isFinite(state.petalToggleTransition.progress)
        ? state.petalToggleTransition.progress
        : 1;
    }

    function getPetalToggleStartAmount() {
      return state.petalToggleTransition && Number.isFinite(state.petalToggleTransition.startAmount)
        ? clamp(state.petalToggleTransition.startAmount, 0, 1)
        : clamp(state.petalOpenAmount, 0, 1);
    }

    function getPetalToggleTargetAmount() {
      return state.petalToggleTransition && Number.isFinite(state.petalToggleTransition.targetAmount)
        ? clamp(state.petalToggleTransition.targetAmount, 0, 1)
        : clamp(state.petalOpenAmount, 0, 1);
    }

    function getPetalToggleEasePower() {
      return state.petalToggleTransition && Number.isFinite(state.petalToggleTransition.easePower)
        ? Math.max(0.01, state.petalToggleTransition.easePower)
        : 1;
    }

    function getPetalToggleOpenBounceAmount() {
      return state.petalToggleTransition && Number.isFinite(state.petalToggleTransition.openBounceAmount)
        ? Math.max(0, state.petalToggleTransition.openBounceAmount)
        : 0;
    }

    function getPetalToggleOpenBounceOscillations() {
      return state.petalToggleTransition && Number.isFinite(state.petalToggleTransition.openBounceOscillations)
        ? Math.max(0.25, state.petalToggleTransition.openBounceOscillations)
        : 2;
    }

    function applyJumpAt(x, y, flowersConfig) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || state.flowers.length === 0) {
        return 0;
      }

      const commonConfig = resolveCommonFlowerConfig(flowersConfig || {});
      if (!commonConfig.jumpEnabled) {
        return 0;
      }

      const jumpRadius = commonConfig.drawSize * commonConfig.jumpInteractionRadiusFactor;
      if (!(jumpRadius > 0)) {
        return 0;
      }
      const jumpRadiusSq = jumpRadius * jumpRadius;
      const maxJumpRad = degToRad(commonConfig.jumpStrengthDeg);
      const jumpJitterRad = degToRad(commonConfig.jumpJitterDeg);
      const distanceExponent = commonConfig.jumpDistanceExponent;
      const offsetScratch = { x: 0, y: 0 };
      const centerScratch = { x: 0, y: 0 };
      let affectedFlowers = 0;

      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        if (!Array.isArray(flower.petals) || flower.petals.length === 0) {
          continue;
        }

        const dx = flower.x - x;
        const dy = flower.y - y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > jumpRadiusSq) {
          continue;
        }

        const distance = Math.sqrt(distanceSq);
        const proximity = 1 - distance / jumpRadius;
        const influence = Math.pow(clamp(proximity, 0, 1), distanceExponent);
        if (influence <= 0) {
          continue;
        }
        const hiddenCullContext = resolveBackLayerHiddenSpriteCullContextForFlower(flower);

        const typeConfig = flower.typeConfig || {};
        const displacementSpace = typeConfig.displacementSpace === 'screen' ? 'screen' : 'flower';
        const centerAngleRad = Number.isFinite(flower.centerAngleRad) ? flower.centerAngleRad : 0;
        const cosCenter = Math.cos(centerAngleRad);
        const sinCenter = Math.sin(centerAngleRad);
        const spriteCellHeight = Number.isFinite(typeConfig.spriteCellHeight)
          ? Math.max(1, typeConfig.spriteCellHeight)
          : 45.819;
        const drawSize = commonConfig.drawSize;
        const petalCenterLocalY = (
          -drawSize
          + ((2.2 / spriteCellHeight) * drawSize)
          + (drawSize * 0.5)
        );
        let affectedPetalsForFlower = 0;

        for (let p = 0; p < flower.petals.length; p += 1) {
          const petal = flower.petals[p];
          if (
            hiddenCullContext
            && isFlowerPetalCircleHiddenByContext(
              flower,
              petal,
              commonConfig,
              hiddenCullContext,
              offsetScratch,
              centerScratch,
            )
          ) {
            continue;
          }
          let renderedAngle = resolvePetalRenderedAngleRad(flower, petal);
          let petalWorldX = flower.x;
          let petalWorldY = flower.y;
          if (flower.type === 'blue') {
            const swayAroundPersonalOrigin = commonConfig.blueSwayRotateAroundPetalOrigin === true;
            const jumpAroundPersonalOrigin = commonConfig.blueJumpRotateAroundPetalOrigin === true;
            const baseAngle = petal.baseAngleRad || 0;
            const swayOffset = resolvePetalSwayOffsetRad(flower, petal);
            const jumpOffset = resolvePetalJumpOffsetRad(petal);

            let orbitalAngle = baseAngle;
            if (!swayAroundPersonalOrigin) {
              orbitalAngle += swayOffset;
            }
            if (!jumpAroundPersonalOrigin) {
              orbitalAngle += jumpOffset;
            }

            const radialDistance = Number.isFinite(petal.radialDistance) ? petal.radialDistance : 0;
            petalWorldX += Math.cos(orbitalAngle) * radialDistance;
            petalWorldY += Math.sin(orbitalAngle) * radialDistance;

            if (swayAroundPersonalOrigin || jumpAroundPersonalOrigin) {
              renderedAngle = 0;
              if (swayAroundPersonalOrigin) {
                renderedAngle += swayOffset;
              }
              if (jumpAroundPersonalOrigin) {
                renderedAngle += jumpOffset;
              }
            } else {
              renderedAngle = orbitalAngle;
            }
          } else {
            resolvePetalScreenOffsetsInto(
              petal,
              displacementSpace,
              cosCenter,
              sinCenter,
              offsetScratch,
            );
            const cosAngle = Math.cos(renderedAngle);
            const sinAngle = Math.sin(renderedAngle);
            petalWorldX = flower.x + offsetScratch.x - (sinAngle * petalCenterLocalY);
            petalWorldY = flower.y + offsetScratch.y + (cosAngle * petalCenterLocalY);
          }
          const awayAngleRad = Math.atan2(petalWorldY - y, petalWorldX - x);
          const deltaAwayRad = signedAngleDeltaRad(renderedAngle, awayAngleRad);
          const directionalKickRad = clamp(deltaAwayRad, -maxJumpRad, maxJumpRad) * influence;
          const jitterKickRad = (Math.random() * 2 - 1) * jumpJitterRad * influence;
          const nextOffsetRad = (Number.isFinite(petal.jumpTargetAngleOffsetRad) ? petal.jumpTargetAngleOffsetRad : 0)
            + directionalKickRad
            + jitterKickRad;
          petal.jumpTargetAngleOffsetRad = clamp(nextOffsetRad, -maxJumpRad, maxJumpRad);
          affectedPetalsForFlower += 1;
        }
        if (affectedPetalsForFlower > 0) {
          flower.hasJumpMotion = true;
          affectedFlowers += 1;
        }
      }

      return affectedFlowers;
    }

    function stepFlowersAlwaysSway(commonConfig, dtSec, mouseSwayScale) {
      state.activeFlowerIndices = [];
      const swayInteractionRadius = commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor;
      const jumpAttackSpeedRadPerSec = degToRad(commonConfig.jumpAttackSpeedDegPerSec);
      const jumpReturnSpeedRadPerSec = degToRad(commonConfig.jumpReturnSpeedDegPerSec);
      const jumpEpsilonRad = degToRad(commonConfig.jumpEpsilonDeg);
      const hiddenOffsetScratch = { x: 0, y: 0 };
      const hiddenCenterScratch = { x: 0, y: 0 };

      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        flower.interactionRadius = swayInteractionRadius;
        flower.targetInfluence = 1;

        const influenceSpeed = flower.targetInfluence > flower.hoverInfluence
          ? commonConfig.swayRiseSpeed
          : commonConfig.swayFallSpeed;

        flower.hoverInfluence = moveToward(
          flower.hoverInfluence,
          flower.targetInfluence,
          influenceSpeed * mouseSwayScale * dtSec,
        );

        flower.isSwayActive = flower.hoverInfluence > 0 || flower.targetInfluence > 0;
        let hasJumpMotion = flower.hasJumpMotion === true;
        const hiddenCullContext = resolveBackLayerHiddenSpriteCullContextForFlower(flower);
        if (hasJumpMotion && Array.isArray(flower.petals) && flower.petals.length > 0) {
          hasJumpMotion = false;
          for (let p = 0; p < flower.petals.length; p += 1) {
            const petal = flower.petals[p];
            if (
              hiddenCullContext
              && isFlowerPetalCircleHiddenByContext(
                flower,
                petal,
                commonConfig,
                hiddenCullContext,
                hiddenOffsetScratch,
                hiddenCenterScratch,
              )
            ) {
              continue;
            }
            const currentJumpOffset = petal.jumpAngleOffsetRad || 0;
            const currentJumpTarget = petal.jumpTargetAngleOffsetRad || 0;
            const nextJumpTarget = moveToward(currentJumpTarget, 0, jumpReturnSpeedRadPerSec * dtSec);
            petal.jumpTargetAngleOffsetRad = Math.abs(nextJumpTarget) <= jumpEpsilonRad ? 0 : nextJumpTarget;
            const nextJumpOffset = moveToward(
              currentJumpOffset,
              petal.jumpTargetAngleOffsetRad,
              jumpAttackSpeedRadPerSec * dtSec,
            );
            petal.jumpAngleOffsetRad = Math.abs(nextJumpOffset) <= jumpEpsilonRad ? 0 : nextJumpOffset;
            if (petal.jumpAngleOffsetRad !== 0 || petal.jumpTargetAngleOffsetRad !== 0) {
              hasJumpMotion = true;
            }
          }
        }
        flower.hasJumpMotion = hasJumpMotion;

        if (flower.isSwayActive || hasJumpMotion) {
          flower.motionTime += dtSec * mouseSwayScale;
          state.activeFlowerIndices.push(i);
          flower.isActive = true;
        } else {
          flower.isActive = false;
        }

        flower.wasInsideRange = false;
      }

      state.performance.activeFlowerCount = state.activeFlowerIndices.length;
      return state.activeFlowerIndices.length;
    }

    function updateAlwaysSwayTemporal(commonConfig, nowMs) {
      const updateTimeMs = Number.isFinite(nowMs) ? nowMs : performance.now();
      if (!Number.isFinite(state.alwaysSimLastMs) || state.alwaysSimLastMs <= 0) {
        state.alwaysSimLastMs = updateTimeMs;
      }
      const elapsedSec = clamp((updateTimeMs - state.alwaysSimLastMs) / 1000, 0, MAX_DT_SEC);
      state.alwaysSimLastMs = updateTimeMs;
      state.alwaysSimAccumulatorSec = Math.max(0, (state.alwaysSimAccumulatorSec || 0) + elapsedSec);

      const mouseSpeedDecayPxPerSec = 2600;
      state.mouseSpeedPxPerSec = moveToward(
        state.mouseSpeedPxPerSec || 0,
        0,
        mouseSpeedDecayPxPerSec * elapsedSec,
      );
      const mouseSpeedNorm = clamp((state.mouseSpeedPxPerSec || 0) / 1600, 0, 1);
      const mouseSpeedSwayAffect = Math.max(0, Number(commonConfig.mouseSpeedSwayAffect) || 0);
      const mouseSwayScale = clamp(1 + (mouseSpeedNorm * mouseSpeedSwayAffect), 1, 8);

      let steps = 0;
      while (
        state.alwaysSimAccumulatorSec >= ALWAYS_SWAY_SIM_DT_SEC
        && steps < ALWAYS_SWAY_MAX_STEPS_PER_FRAME
      ) {
        const stepStartMs = performance.now();
        for (let i = 0; i < state.flowers.length; i += 1) {
          const flower = state.flowers[i];
          flower.prevHoverInfluence = Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0;
          flower.prevMotionTime = Number.isFinite(flower.motionTime) ? flower.motionTime : 0;
        }
        stepFlowersAlwaysSway(commonConfig, ALWAYS_SWAY_SIM_DT_SEC, mouseSwayScale);
        const stepElapsedMs = Math.max(0, performance.now() - stepStartMs);
        state.performance.simStepTotalMs += stepElapsedMs;
        state.performance.simStepSamples += 1;
        state.performance.totalSimSteps += 1;
        state.alwaysSimAccumulatorSec -= ALWAYS_SWAY_SIM_DT_SEC;
        steps += 1;
      }
      if (steps === 0) {
        for (let i = 0; i < state.flowers.length; i += 1) {
          const flower = state.flowers[i];
          if (!Number.isFinite(flower.prevHoverInfluence)) {
            flower.prevHoverInfluence = Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0;
          }
          if (!Number.isFinite(flower.prevMotionTime)) {
            flower.prevMotionTime = Number.isFinite(flower.motionTime) ? flower.motionTime : 0;
          }
        }
      }
      state.alwaysRenderAlpha = clamp(
        state.alwaysSimAccumulatorSec / ALWAYS_SWAY_SIM_DT_SEC,
        0,
        1,
      );
      state.performance.interpolatedFrames += 1;
      return state.activeFlowerIndices.length;
    }

    function update(flowersConfig, nowMs, commonConfigOverride = null) {
      if (state.flowers.length === 0) {
        state.activeFlowerIndices = [];
        resetStaticLayerActiveSnapshot();
        markStaticLayerDirty();
        state.performance.activeFlowerCount = 0;
        state.lastUpdateMs = Number.isFinite(nowMs) ? nowMs : performance.now();
        return 0;
      }

      const commonConfig = commonConfigOverride || resolveCommonFlowerConfig(flowersConfig || {});
      const updateTimeMs = Number.isFinite(nowMs) ? nowMs : performance.now();
      if (!Number.isFinite(state.lastUpdateMs) || state.lastUpdateMs <= 0) {
        state.lastUpdateMs = updateTimeMs;
      }
      const dtSec = clamp((updateTimeMs - state.lastUpdateMs) / 1000, 0, MAX_DT_SEC);
      state.lastUpdateMs = updateTimeMs;

      if (state.petalToggleTransition && state.petalToggleTransition.active) {
        const transition = state.petalToggleTransition;
        const durationMs = Math.max(0, Number(transition.durationMs) || 0);
        const elapsedMs = Math.max(0, updateTimeMs - (Number(transition.startTimeMs) || 0));
        const progress = durationMs > 1e-6 ? clamp(elapsedMs / durationMs, 0, 1) : 1;
        transition.progress = progress;
        state.petalOpenAmount = evaluatePetalToggleAmount(
          transition.startAmount,
          transition.targetAmount,
          progress,
          transition.easePower,
          transition.openBounceAmount,
          transition.openBounceOscillations,
        );

        const spriteSwapProgress = clamp(transition.spriteSwapProgress, 0, 1);
        if (transition.targetAmount < transition.startAmount) {
          // Closing: switch to closed sprites near the start of the animation.
          state.useClosedPetalSprites = progress >= spriteSwapProgress;
        } else if (transition.targetAmount > transition.startAmount) {
          // Opening: use the inverted threshold of the configured swap progress.
          const openingSpriteSwapProgress = 1 - spriteSwapProgress;
          state.useClosedPetalSprites = progress < openingSpriteSwapProgress;
        } else {
          state.useClosedPetalSprites = state.petalOpenAmount <= 0.001;
        }

        if (progress >= 1) {
          state.petalOpenAmount = clamp(transition.targetAmount, 0, 1);
          state.useClosedPetalSprites = state.petalOpenAmount <= 0.001;
          transition.progress = 1;
          state.petalToggleTransition.active = false;
        }
      } else {
        state.useClosedPetalSprites = state.petalOpenAmount <= 0.001;
        if (state.petalToggleTransition) {
          state.petalToggleTransition.progress = 1;
        }
      }

      if (commonConfig.swayMode === 'always') {
        return updateAlwaysSwayTemporal(commonConfig, updateTimeMs);
      }

      state.activeFlowerIndices = [];
      const swayInteractionRadius = commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor;
      const jumpAttackSpeedRadPerSec = degToRad(commonConfig.jumpAttackSpeedDegPerSec);
      const jumpReturnSpeedRadPerSec = degToRad(commonConfig.jumpReturnSpeedDegPerSec);
      const jumpEpsilonRad = degToRad(commonConfig.jumpEpsilonDeg);
      const mouseSpeedDecayPxPerSec = 2600;
      state.mouseSpeedPxPerSec = moveToward(
        state.mouseSpeedPxPerSec || 0,
        0,
        mouseSpeedDecayPxPerSec * dtSec,
      );
      const mouseSpeedNorm = clamp((state.mouseSpeedPxPerSec || 0) / 1600, 0, 1);
      const mouseSpeedSwayAffect = Math.max(0, Number(commonConfig.mouseSpeedSwayAffect) || 0);
      const mouseSwayAdd = mouseSpeedNorm * mouseSpeedSwayAffect;
      const mouseSwayScale = clamp(
        1 + mouseSwayAdd,
        1,
        8,
      );
      const swayMode = commonConfig.swayMode;
      const windPositions = (swayMode === 'wind' && Array.isArray(state.windPositions) && state.windPositions.length > 0)
        ? state.windPositions
        : null;
      const pointerPresent = windPositions
        ? true
        : (Number.isFinite(state.mouseX) && Number.isFinite(state.mouseY)
          && state.mouseX !== OFFSCREEN_POINTER && state.mouseY !== OFFSCREEN_POINTER);
      const dynamicCapEnabled = (swayMode === 'influence' || swayMode === 'wind')
        && commonConfig.influenceDynamicCapEnabled === true
        && commonConfig.influenceDynamicCap > 0;
      const dynamicCap = dynamicCapEnabled ? commonConfig.influenceDynamicCap : 0;
      const dynamicCandidates = [];
      const hiddenOffsetScratch = { x: 0, y: 0 };
      const hiddenCenterScratch = { x: 0, y: 0 };

      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        flower.interactionRadius = swayInteractionRadius;

        let influenceX = state.mouseX;
        let influenceY = state.mouseY;
        if (windPositions) {
          if (windPositions.length === 1) {
            influenceX = windPositions[0].x;
            influenceY = windPositions[0].y;
          } else {
            let bestDist = Infinity;
            for (let w = 0; w < windPositions.length; w += 1) {
              const wp = windPositions[w];
              const wdx = wp.x - flower.x;
              const wdy = wp.y - flower.y;
              const wd = wdx * wdx + wdy * wdy;
              if (wd < bestDist) {
                bestDist = wd;
                influenceX = wp.x;
                influenceY = wp.y;
              }
            }
          }
        }

        const dx = influenceX - flower.x;
        const dy = influenceY - flower.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isInsideRange = distance <= flower.interactionRadius;

        if (swayMode === 'always') {
          flower.targetInfluence = 1;
        } else if (isInsideRange) {
          flower.targetInfluence = (1 - distance / flower.interactionRadius) * mouseSwayScale;
        } else {
          flower.targetInfluence = 0;
        }

        if (
          (swayMode === 'influence' || swayMode === 'wind')
          && isInsideRange
          && !flower.wasInsideRange
          && flower.hoverInfluence <= commonConfig.swayEpsilon
        ) {
          flower.motionTime = 0;
        }

        const influenceSpeed = flower.targetInfluence > flower.hoverInfluence
          ? commonConfig.swayRiseSpeed
          : commonConfig.swayFallSpeed;
        const influenceSpeedScaled = (
          !pointerPresent && flower.targetInfluence === 0
        )
          ? (influenceSpeed * commonConfig.influenceNoPointerFallBoost)
          : influenceSpeed;

        flower.hoverInfluence = moveToward(
          flower.hoverInfluence,
          flower.targetInfluence,
          influenceSpeedScaled * mouseSwayScale * dtSec,
        );

        if (
          flower.targetInfluence === 0
          && flower.hoverInfluence <= commonConfig.swayEpsilon
        ) {
          flower.hoverInfluence = 0;
        }

        flower.isSwayActive = flower.hoverInfluence > 0 || flower.targetInfluence > 0;
        let hasJumpMotion = flower.hasJumpMotion === true;
        const hiddenCullContext = resolveBackLayerHiddenSpriteCullContextForFlower(flower);
        if (hasJumpMotion && Array.isArray(flower.petals) && flower.petals.length > 0) {
          hasJumpMotion = false;
          for (let p = 0; p < flower.petals.length; p += 1) {
            const petal = flower.petals[p];
            if (
              hiddenCullContext
              && isFlowerPetalCircleHiddenByContext(
                flower,
                petal,
                commonConfig,
                hiddenCullContext,
                hiddenOffsetScratch,
                hiddenCenterScratch,
              )
            ) {
              continue;
            }
            const currentJumpOffset = petal.jumpAngleOffsetRad || 0;
            const currentJumpTarget = petal.jumpTargetAngleOffsetRad || 0;

            // Slow settle: target decays to neutral.
            const nextJumpTarget = moveToward(currentJumpTarget, 0, jumpReturnSpeedRadPerSec * dtSec);
            petal.jumpTargetAngleOffsetRad = Math.abs(nextJumpTarget) <= jumpEpsilonRad ? 0 : nextJumpTarget;

            // Fast attack: displayed offset chases target.
            const nextJumpOffset = moveToward(
              currentJumpOffset,
              petal.jumpTargetAngleOffsetRad,
              jumpAttackSpeedRadPerSec * dtSec,
            );
            petal.jumpAngleOffsetRad = Math.abs(nextJumpOffset) <= jumpEpsilonRad ? 0 : nextJumpOffset;

            if (petal.jumpAngleOffsetRad !== 0 || petal.jumpTargetAngleOffsetRad !== 0) {
              hasJumpMotion = true;
            }
          }
        }
        flower.hasJumpMotion = hasJumpMotion;

        if (flower.isSwayActive || hasJumpMotion) {
          flower.motionTime += dtSec * mouseSwayScale;
        }
        flower._candidateActive = Boolean(flower.isSwayActive || hasJumpMotion);
        flower._forceActive = hasJumpMotion && commonConfig.influenceJumpCountsTowardCap !== true;
        flower._dynamicPriority = (
          (Number(flower.hoverInfluence) || 0)
          + (Number(flower.targetInfluence) || 0) * 0.5
          + (isInsideRange ? 0.25 : 0)
          + (hasJumpMotion ? 0.2 : 0)
        );
        if (flower._candidateActive && !flower._forceActive) {
          dynamicCandidates.push(i);
        }

        flower.wasInsideRange = isInsideRange;
      }

      let allowedDynamic = null;
      if (dynamicCapEnabled && dynamicCandidates.length > dynamicCap) {
        dynamicCandidates.sort((a, b) => {
          const aFlower = state.flowers[a];
          const bFlower = state.flowers[b];
          return (Number(bFlower._dynamicPriority) || 0) - (Number(aFlower._dynamicPriority) || 0);
        });
        allowedDynamic = new Set(dynamicCandidates.slice(0, dynamicCap));
      }

      state.activeFlowerIndices = [];
      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        if (!flower._candidateActive) {
          flower.isActive = false;
          continue;
        }
        if (flower._forceActive) {
          flower.isActive = true;
          state.activeFlowerIndices.push(i);
          continue;
        }
        if (!allowedDynamic || allowedDynamic.has(i)) {
          flower.isActive = true;
          state.activeFlowerIndices.push(i);
        } else {
          flower.isActive = false;
        }
      }

      state.performance.activeFlowerCount = state.activeFlowerIndices.length;

      return state.activeFlowerIndices.length;
    }

    function drawFlowerRecord(ctx, flower, flowersConfig, commonConfig, runtimeState, drawContext = null) {
      if (!ctx || !flower) {
        return false;
      }
      if (commonConfig && commonConfig.bakedFlowersEnabled === true) {
        const variant = flower.bakedVariant || resolveBakedVariantForFlower(flower);
        if (variant && drawBakedFlower(ctx, flower, variant, commonConfig)) {
          return true;
        }
        if (commonConfig.bakedFallbackToLive !== true) {
          return false;
        }
      }
      const typeName = FLOWER_TYPE_REGISTRY[flower.type] ? flower.type : 'lily';
      const entry = FLOWER_TYPE_REGISTRY[typeName] || FLOWER_TYPE_REGISTRY.lily;
      const typeConfig = flower.typeConfig || resolveTypeConfig(typeName, flowersConfig || {});
      return entry.drawFlower(ctx, flower, typeConfig, commonConfig, runtimeState, drawContext) === true;
    }

    function drawBakedFlower(ctx, flower, variant, commonConfig) {
      if (!ctx || !flower || !variant || !Array.isArray(variant.frames) || variant.frames.length === 0) {
        return false;
      }
      const exportSettings = state.baked.exportSettings || {};
      const captureScale = (
        Number.isFinite(Number(exportSettings.captureScale)) && Number(exportSettings.captureScale) > 0
      )
        ? Number(exportSettings.captureScale)
        : 1;
      const packScaleX = (
        variant
        && isPlainObject(variant.packScale)
        && Number.isFinite(Number(variant.packScale.x))
        && Number(variant.packScale.x) > 0
      )
        ? Number(variant.packScale.x)
        : 1;
      const packScaleY = (
        variant
        && isPlainObject(variant.packScale)
        && Number.isFinite(Number(variant.packScale.y))
        && Number(variant.packScale.y) > 0
      )
        ? Number(variant.packScale.y)
        : 1;
      const fps = (
        Number.isFinite(commonConfig && commonConfig.bakedPlaybackFps) && commonConfig.bakedPlaybackFps > 0
      )
        ? Number(commonConfig.bakedPlaybackFps)
        : (
          Number.isFinite(Number(exportSettings.fps)) && Number(exportSettings.fps) > 0
            ? Number(exportSettings.fps)
            : 30
        );
      const neutralFrameIndex = (
        Number.isFinite(commonConfig && commonConfig.bakedNeutralFrameIndex)
      )
        ? Math.max(0, Math.floor(commonConfig.bakedNeutralFrameIndex))
        : (
          Number.isFinite(Number(exportSettings.neutralFrameIndex))
            ? Math.max(0, Math.floor(Number(exportSettings.neutralFrameIndex)))
            : 0
        );
      const frameCount = Math.max(1, variant.frames.length);
      const loopFrames = Math.max(1, frameCount - (neutralFrameIndex + 1));
      const renderInfluence = clamp(
        Number.isFinite(flower.renderHoverInfluence)
          ? flower.renderHoverInfluence
          : (Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0),
        0,
        1,
      );
      const renderMotionTime = Number.isFinite(flower.renderMotionTime)
        ? flower.renderMotionTime
        : (Number.isFinite(flower.motionTime) ? flower.motionTime : 0);
      const playbackSpeedMultiplier = Number.isFinite(commonConfig.bakedPlaybackSpeedMultiplier)
        ? Math.max(0.01, commonConfig.bakedPlaybackSpeedMultiplier)
        : 1;
      const loopFramePositionRaw = Math.max(0, renderMotionTime * fps * playbackSpeedMultiplier);
      const loopFramePosition = loopFrames > 0
        ? (loopFramePositionRaw % loopFrames)
        : 0;
      const loopFrameOffset = Math.floor(loopFramePosition) % loopFrames;
      const loopFrameFrac = loopFramePosition - Math.floor(loopFramePosition);
      const animatedFrameIndex = clamp(neutralFrameIndex + 1 + loopFrameOffset, 0, frameCount - 1);
      const animatedNextFrameIndex = clamp(
        neutralFrameIndex + 1 + ((loopFrameOffset + 1) % loopFrames),
        0,
        frameCount - 1,
      );
      const neutralFrame = variant.frames[clamp(neutralFrameIndex, 0, frameCount - 1)];
      const animatedFrame = variant.frames[animatedFrameIndex] || neutralFrame;
      const animatedNextFrame = variant.frames[animatedNextFrameIndex] || animatedFrame || neutralFrame;

      const neutralImage = neutralFrame
        ? state.baked.pageImageByFileName.get(neutralFrame.fileName) || null
        : null;
      const animatedImage = animatedFrame
        ? state.baked.pageImageByFileName.get(animatedFrame.fileName) || null
        : null;
      const animatedNextImage = animatedNextFrame
        ? state.baked.pageImageByFileName.get(animatedNextFrame.fileName) || null
        : null;
      if (!neutralImage && neutralFrame && typeof neutralFrame.fileName === 'string') {
        ensureBakedPageImageLoaded(neutralFrame.fileName, commonConfig).catch(() => {});
      }
      if (!animatedImage && animatedFrame && typeof animatedFrame.fileName === 'string') {
        ensureBakedPageImageLoaded(animatedFrame.fileName, commonConfig).catch(() => {});
      }
      if (!animatedNextImage && animatedNextFrame && typeof animatedNextFrame.fileName === 'string') {
        ensureBakedPageImageLoaded(animatedNextFrame.fileName, commonConfig).catch(() => {});
      }
      if (!neutralImage && !animatedImage) {
        return false;
      }

      function drawFrame(frame, image, alpha = 1) {
        if (!frame || !image || alpha <= 1e-4) {
          return;
        }
        const framePackScaleX = (
          Number.isFinite(Number(frame.packScaleX)) && Number(frame.packScaleX) > 0
        )
          ? Number(frame.packScaleX)
          : packScaleX;
        const framePackScaleY = (
          Number.isFinite(Number(frame.packScaleY)) && Number(frame.packScaleY) > 0
        )
          ? Number(frame.packScaleY)
          : packScaleY;
        const atlasToWorldScaleX = Math.max(1e-8, framePackScaleX * captureScale);
        const atlasToWorldScaleY = Math.max(1e-8, framePackScaleY * captureScale);
        const sx = Number(frame.x) || 0;
        const sy = Number(frame.y) || 0;
        const swAtlas = Math.max(1, Number(frame.width) || 1);
        const shAtlas = Math.max(1, Number(frame.height) || 1);
        const swWorld = Math.max(1e-8, swAtlas / atlasToWorldScaleX);
        const shWorld = Math.max(1e-8, shAtlas / atlasToWorldScaleY);
        const originX = Number.isFinite(frame.originX)
          ? (frame.originX / atlasToWorldScaleX)
          : (swWorld * 0.5);
        const originY = Number.isFinite(frame.originY)
          ? (frame.originY / atlasToWorldScaleY)
          : (shWorld * 0.5);
        const dx = flower.x - originX;
        const dy = flower.y - originY;
        if (alpha >= 0.9999) {
          ctx.drawImage(image, sx, sy, swAtlas, shAtlas, dx, dy, swWorld, shWorld);
          return;
        }
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.drawImage(image, sx, sy, swAtlas, shAtlas, dx, dy, swWorld, shWorld);
        ctx.restore();
      }

      if (renderInfluence <= commonConfig.swayEpsilon) {
        drawFrame(neutralFrame, neutralImage || animatedImage, 1);
        return true;
      }
      if (
        commonConfig.bakedFrameInterpolationEnabled === true
        && animatedFrame
        && animatedNextFrame
      ) {
        // Opaque frame stepping avoids the translucent "double exposure" artifact
        // that appears when alpha-blending two baked frames with different silhouettes.
        const useNext = loopFrameFrac >= 0.5;
        const selectedFrame = useNext ? animatedNextFrame : animatedFrame;
        const selectedImage = useNext
          ? (animatedNextImage || animatedImage || neutralImage)
          : (animatedImage || animatedNextImage || neutralImage);
        drawFrame(selectedFrame, selectedImage, 1);
        return true;
      }
      drawFrame(animatedFrame, animatedImage || neutralImage, 1);
      return true;
    }

    function drawFlowerByIndex(ctx, index, flowersConfig, commonConfig, runtimeState, drawContext = null) {
      if (!ctx || index < 0 || index >= state.flowers.length) {
        return false;
      }
      return drawFlowerRecord(
        ctx,
        state.flowers[index],
        flowersConfig,
        commonConfig,
        runtimeState,
        drawContext,
      );
    }

    function getOutputScale(ctx) {
      const transform = ctx && ctx.getTransform ? ctx.getTransform() : null;
      const scaleX = transform ? Math.abs(transform.a) : 1;
      const scaleY = transform ? Math.abs(transform.d) : 1;
      return {
        x: scaleX > 1e-8 ? scaleX : 1,
        y: scaleY > 1e-8 ? scaleY : 1,
      };
    }

    function estimateFlowerCacheRadiusCss(flower, commonConfig) {
      if (!flower) {
        return 16;
      }
      const cachedRadius = flower._swCachedRadius;
      if (cachedRadius && typeof cachedRadius === 'object') {
        if (flower.type === 'blue') {
          const typeConfig = flower.typeConfig || {};
          const pointDrawSizeCached = Number.isFinite(typeConfig.pointDrawSize)
            ? Math.max(1, typeConfig.pointDrawSize)
            : 18;
          const growthScaleCached = resolveFlowerGrowthScaleFactor(flower);
          const growthPositionScaleCached = resolveFlowerGrowthPositionScaleFactor(flower);
          if (
            cachedRadius.type === 'blue'
            && Math.abs((cachedRadius.pointDrawSize || 0) - (pointDrawSizeCached * growthScaleCached)) <= 1e-8
            && Math.abs((cachedRadius.growthScale || 1) - growthScaleCached) <= 1e-8
            && Math.abs((cachedRadius.growthPositionScale || 1) - growthPositionScaleCached) <= 1e-8
          ) {
            return cachedRadius.value;
          }
        } else {
          const drawSizeCached = Number.isFinite(commonConfig && commonConfig.drawSize)
            ? Math.max(1, commonConfig.drawSize)
            : 80;
          const growthScaleCached = resolveFlowerGrowthScaleFactor(flower);
          if (
            cachedRadius.type === 'lily'
            && Math.abs((cachedRadius.drawSize || 0) - (drawSizeCached * growthScaleCached)) <= 1e-8
          ) {
            return cachedRadius.value;
          }
        }
      }
      const petals = Array.isArray(flower.petals) ? flower.petals : [];
      if (flower.type === 'blue') {
        const typeConfig = flower.typeConfig || {};
        const pointDrawSizeBase = Number.isFinite(typeConfig.pointDrawSize)
          ? Math.max(1, typeConfig.pointDrawSize)
          : 18;
        const growthScale = resolveFlowerGrowthScaleFactor(flower);
        const growthPositionScale = resolveFlowerGrowthPositionScaleFactor(flower);
        const pointDrawSize = pointDrawSizeBase * growthScale;
        let maxDistance = 0;
        for (let i = 0; i < petals.length; i += 1) {
          const petal = petals[i];
          const radialDistance = (
            Number.isFinite(petal.radialDistance) ? petal.radialDistance : 0
          ) * growthPositionScale;
          if (radialDistance > maxDistance) {
            maxDistance = radialDistance;
          }
        }
        const value = Math.max(8, maxDistance + pointDrawSize + 8);
        flower._swCachedRadius = {
          type: 'blue',
          pointDrawSize,
          growthScale,
          growthPositionScale,
          value,
        };
        return value;
      }

      const drawSize = (
        Number.isFinite(commonConfig.drawSize) ? Math.max(1, commonConfig.drawSize) : 80
      ) * resolveFlowerGrowthScaleFactor(flower);
      let maxOffset = 0;
      for (let i = 0; i < petals.length; i += 1) {
        const petal = petals[i];
        const ox = petal.screenOffsetX || 0;
        const oy = petal.screenOffsetY || 0;
        const distance = Math.hypot(ox, oy);
        if (distance > maxOffset) {
          maxOffset = distance;
        }
      }
      const value = Math.max(8, drawSize * 1.25 + maxOffset + 10);
      flower._swCachedRadius = {
        type: 'lily',
        drawSize,
        value,
      };
      return value;
    }

    function ensureFlowerRenderCache(ctx, flower, flowersConfig, commonConfig, runtimeState, options = null) {
      if (!ctx || !flower) {
        return null;
      }

      const cache = flower.renderCache || (flower.renderCache = {
        canvas: null,
        ctx: null,
        valid: false,
        widthCss: 0,
        heightCss: 0,
        widthPx: 0,
        heightPx: 0,
        originXCss: 0,
        originYCss: 0,
        scaleX: 1,
        scaleY: 1,
        petalOpenAmount: 1,
        useClosedPetalSprites: false,
        alwaysPoseKey: '',
      });

      const outputScale = getOutputScale(ctx);
      const radiusCss = estimateFlowerCacheRadiusCss(flower, commonConfig);
      const widthCss = Math.max(2, Math.ceil(radiusCss * 2));
      const heightCss = widthCss;
      const widthPx = Math.max(1, Math.ceil(widthCss * outputScale.x));
      const heightPx = Math.max(1, Math.ceil(heightCss * outputScale.y));
      const originXCss = widthCss * 0.5;
      const originYCss = heightCss * 0.5;
      const usesPetalToggleState = flower.type === 'lily';
      const petalOpenAmount = usesPetalToggleState
        ? resolveLilyRuntimePetalOpenAmount(runtimeState, flower)
        : runtimeState.getPetalOpenAmount();
      const useClosedPetalSprites = usesPetalToggleState
        ? resolveLilyRuntimeUseClosedPetalSprites(runtimeState, flower, petalOpenAmount, commonConfig)
        : (runtimeState.getUseClosedPetalSprites() === true);
      const dynamicPose = options && options.dynamicPose === true;
      const poseKey = dynamicPose && typeof options.poseKey === 'string' ? options.poseKey : '';

      if (!cache.canvas) {
        cache.canvas = document.createElement('canvas');
        cache.ctx = cache.canvas.getContext('2d');
        cache.valid = false;
      }

      let shouldRebuild = cache.valid !== true;
      if (cache.widthPx !== widthPx || cache.heightPx !== heightPx) {
        cache.canvas.width = widthPx;
        cache.canvas.height = heightPx;
        cache.widthPx = widthPx;
        cache.heightPx = heightPx;
        shouldRebuild = true;
      }
      if (
        Math.abs(cache.scaleX - outputScale.x) > 1e-8
        || Math.abs(cache.scaleY - outputScale.y) > 1e-8
      ) {
        cache.scaleX = outputScale.x;
        cache.scaleY = outputScale.y;
        shouldRebuild = true;
      }
      if (cache.widthCss !== widthCss || cache.heightCss !== heightCss) {
        cache.widthCss = widthCss;
        cache.heightCss = heightCss;
        shouldRebuild = true;
      }
      if (
        usesPetalToggleState
        && (
          Math.abs((cache.petalOpenAmount || 0) - petalOpenAmount) > 1e-6
          || cache.useClosedPetalSprites !== useClosedPetalSprites
        )
      ) {
        shouldRebuild = true;
      }
      if (dynamicPose && cache.alwaysPoseKey !== poseKey) {
        shouldRebuild = true;
      }
      if (cache.originXCss !== originXCss || cache.originYCss !== originYCss) {
        cache.originXCss = originXCss;
        cache.originYCss = originYCss;
        shouldRebuild = true;
      }

      if (!shouldRebuild || !cache.ctx) {
        return cache;
      }

      const rebuildStartMs = performance.now();
      cache.ctx.imageSmoothingEnabled = true;
      cache.ctx.setTransform(1, 0, 0, 1, 0, 0);
      cache.ctx.clearRect(0, 0, cache.canvas.width, cache.canvas.height);
      cache.ctx.setTransform(cache.scaleX, 0, 0, cache.scaleY, 0, 0);
      const staticFlower = {
        ...flower,
        x: cache.originXCss,
        y: cache.originYCss,
        hoverInfluence: dynamicPose
          ? (Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0)
          : 0,
        renderHoverInfluence: dynamicPose
          ? (Number.isFinite(flower.renderHoverInfluence) ? flower.renderHoverInfluence : 0)
          : 0,
        targetInfluence: dynamicPose
          ? (Number.isFinite(flower.targetInfluence) ? flower.targetInfluence : 0)
          : 0,
        motionTime: dynamicPose
          ? (Number.isFinite(flower.motionTime) ? flower.motionTime : 0)
          : 0,
        renderMotionTime: dynamicPose
          ? (Number.isFinite(flower.renderMotionTime) ? flower.renderMotionTime : 0)
          : 0,
      };
      drawFlowerRecord(cache.ctx, staticFlower, flowersConfig, commonConfig, runtimeState);
      cache.petalOpenAmount = usesPetalToggleState ? petalOpenAmount : (cache.petalOpenAmount || 1);
      cache.useClosedPetalSprites = usesPetalToggleState ? useClosedPetalSprites : (cache.useClosedPetalSprites === true);
      cache.alwaysPoseKey = dynamicPose ? poseKey : '';
      cache.valid = true;

      const rebuildElapsedMs = performance.now() - rebuildStartMs;
      state.performance.staticLayerRebuildCount += 1;
      state.performance.staticLayerRebuildTotalMs += rebuildElapsedMs;
      state.performance.staticLayerRebuildLastMs = rebuildElapsedMs;
      viewportDebugLog(
        'flowers.cache.rebuild',
        `flowerType=${flower.type || 'unknown'}`,
        `size=${cache.widthPx}x${cache.heightPx}`,
        `duration=${rebuildElapsedMs.toFixed(2)}ms`,
      );
      return cache;
    }

    function drawFlowerFromCache(ctx, flower, flowersConfig, commonConfig, runtimeState) {
      const cache = ensureFlowerRenderCache(ctx, flower, flowersConfig, commonConfig, runtimeState);
      if (!cache || !cache.canvas || cache.valid !== true) {
        return false;
      }
      ctx.drawImage(
        cache.canvas,
        flower.x - cache.originXCss,
        flower.y - cache.originYCss,
        cache.widthCss,
        cache.heightCss,
      );
      return true;
    }

    function drawFlowerFromAnimatedAlwaysCache(
      ctx,
      flower,
      flowersConfig,
      commonConfig,
      runtimeState,
    ) {
      const alwaysCacheFps = Math.max(1, Number(commonConfig.alwaysAnimatedCacheFps) || 12);
      const poseFrame = Math.floor((Number(flower.renderMotionTime) || 0) * alwaysCacheFps);
      const poseInfluence = Math.floor((Number(flower.renderHoverInfluence) || 0) * 32);
      const poseKey = `${poseFrame}:${poseInfluence}`;
      const cache = ensureFlowerRenderCache(
        ctx,
        flower,
        flowersConfig,
        commonConfig,
        runtimeState,
        { dynamicPose: true, poseKey },
      );
      if (!cache || !cache.canvas || cache.valid !== true) {
        return false;
      }
      ctx.drawImage(
        cache.canvas,
        flower.x - cache.originXCss,
        flower.y - cache.originYCss,
        cache.widthCss,
        cache.heightCss,
      );
      return true;
    }

    function drawPixiFlowerRecord(
      layerName,
      flower,
      commonConfig,
      runtimeState,
      layerMetrics,
      app,
      hiddenSpriteCullContext = null,
      viewportCullContext = null,
      hiddenBands = [],
    ) {
      if (!flower) {
        return false;
      }
      if (!layerMetrics) {
        return false;
      }
      const scaleX = Math.max(1e-8, Number(layerMetrics.scaleX) || 1);
      const scaleY = Math.max(1e-8, Number(layerMetrics.scaleY) || 1);
      const useSpriteDebugSway = commonConfig.swaySpriteDebugEnabled === true;
      const debugFrameIndex = Number.isFinite(runtimeState.debugFrameIndex) ? runtimeState.debugFrameIndex : 0;
      const debugFrameStep = Math.max(1, Number(commonConfig.swaySpriteDebugFrameStep) || 1);

      if (flower.type === 'blue') {
        const typeConfig = flower.typeConfig || {};
        const spriteCols = Number.isFinite(typeConfig.spriteCols)
          ? Math.max(1, Math.floor(typeConfig.spriteCols))
          : 1;
        const spriteRows = Number.isFinite(typeConfig.spriteRows)
          ? Math.max(1, Math.floor(typeConfig.spriteRows))
          : 1;
        const pointDrawSizeBase = Number.isFinite(typeConfig.pointDrawSize)
          ? Math.max(1, typeConfig.pointDrawSize)
          : 18;
        const growthScale = resolveFlowerGrowthScaleFactor(flower);
        const growthPositionScale = resolveFlowerGrowthPositionScaleFactor(flower);
        const pointDrawSize = pointDrawSizeBase * growthScale;
        const hiddenRadiusScale = hiddenSpriteCullContext
          ? sanitizeHiddenSpriteCullRadiusScale(hiddenSpriteCullContext.hiddenRadiusScale, 1)
          : 1;
        const spriteRadius = resolveSpriteCircleRadius(pointDrawSize, pointDrawSize, hiddenRadiusScale);
        const swayAroundPersonalOrigin = commonConfig.blueSwayRotateAroundPetalOrigin === true;
        const jumpAroundPersonalOrigin = commonConfig.blueJumpRotateAroundPetalOrigin === true;
        const orbitIsStatic = swayAroundPersonalOrigin && jumpAroundPersonalOrigin;
        const orbitUsesCombinedRotation = !swayAroundPersonalOrigin && !jumpAroundPersonalOrigin;
        const useFastPath = commonConfig.swayFastPathEnabled === true;
        for (let i = 0; i < flower.petals.length; i += 1) {
          const point = flower.petals[i];
          let sourceRect = point.sourceRect || getSpriteSourceRect(typeConfig, point.col, point.row);
          const radialDistanceBase = Number.isFinite(point.radialDistance) ? point.radialDistance : 0;
          const radialDistance = radialDistanceBase * growthPositionScale;
          const baseAngle = point.baseAngleRad || 0;
          const swayOffset = useSpriteDebugSway ? 0 : resolvePetalSwayOffsetRad(flower, point);
          const jumpOffset = useSpriteDebugSway ? 0 : resolvePetalJumpOffsetRad(point);
          if (useSpriteDebugSway) {
            const baseCol = Number.isFinite(point.col) ? point.col : 0;
            const baseRow = Number.isFinite(point.row) ? point.row : 0;
            const animatedCol = ((baseCol + (debugFrameIndex * debugFrameStep)) % spriteCols + spriteCols) % spriteCols;
            const animatedRow = clamp(baseRow, 0, Math.max(0, spriteRows - 1));
            sourceRect = getSpriteSourceRect(typeConfig, animatedCol, animatedRow);
          }
          const texture = getPixiTextureForSourceRect(flower.assetPath, sourceRect);
          if (!texture) {
            continue;
          }
          let x;
          let y;
          if (useSpriteDebugSway) {
            x = flower.x + (Number.isFinite(point.offsetX) ? point.offsetX : 0);
            y = flower.y + (Number.isFinite(point.offsetY) ? point.offsetY : 0);
          } else if (orbitIsStatic && useFastPath) {
            x = flower.x + (Number.isFinite(point.offsetX) ? point.offsetX : 0);
            y = flower.y + (Number.isFinite(point.offsetY) ? point.offsetY : 0);
          } else if (orbitUsesCombinedRotation && useFastPath) {
            const totalOffset = swayOffset + jumpOffset;
            const c = Math.cos(totalOffset);
            const s = Math.sin(totalOffset);
            const baseCos = Number.isFinite(point.baseCos) ? point.baseCos : Math.cos(baseAngle);
            const baseSin = Number.isFinite(point.baseSin) ? point.baseSin : Math.sin(baseAngle);
            x = flower.x + ((baseCos * c - baseSin * s) * radialDistance);
            y = flower.y + ((baseSin * c + baseCos * s) * radialDistance);
          } else {
            let orbitalAngle = baseAngle;
            if (!swayAroundPersonalOrigin) {
              orbitalAngle += swayOffset;
            }
            if (!jumpAroundPersonalOrigin) {
              orbitalAngle += jumpOffset;
            }
            x = flower.x + Math.cos(orbitalAngle) * radialDistance;
            y = flower.y + Math.sin(orbitalAngle) * radialDistance;
          }
          let spriteAngle = 0;
          if (swayAroundPersonalOrigin) {
            spriteAngle += swayOffset;
          }
          if (jumpAroundPersonalOrigin) {
            spriteAngle += jumpOffset;
          }
          if (hiddenSpriteCullContext) {
            const petalHiddenByBand = isSpriteCircleFullyHiddenInBand(
              x,
              y,
              spriteRadius,
              hiddenSpriteCullContext.hiddenBand,
              hiddenSpriteCullContext.hiddenPaddingPx,
            );
            drawPixiHiddenSpriteCullDebugCircle(
              hiddenSpriteCullContext,
              x,
              y,
              spriteRadius,
              petalHiddenByBand,
              scaleX,
              scaleY,
            );
            if (petalHiddenByBand) {
              if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
                runtimeState.hiddenSpriteCulledCount += 1;
              }
              continue;
            }
          }
          if (hiddenBands.length > 0 && isSpriteCircleFullyInsideAnyHiddenBand(x, y, spriteRadius, hiddenBands, 0)) {
            continue;
          }
          const sprite = acquirePixiSprite(layerName, texture, app);
          if (!sprite) {
            continue;
          }
          sprite.rotation = spriteAngle;
          if (sprite._swAnchorKey !== 'c0.5:0.5') {
            sprite.anchor.set(0.5, 0.5);
            sprite._swAnchorKey = 'c0.5:0.5';
          }
          sprite.position.set(x * scaleX, y * scaleY);
          const textureFrame = texture && texture.frame ? texture.frame : null;
          const textureWidth = Number.isFinite(textureFrame && textureFrame.width)
            ? Math.max(1e-8, textureFrame.width)
            : Math.max(1e-8, sourceRect.sw);
          const textureHeight = Number.isFinite(textureFrame && textureFrame.height)
            ? Math.max(1e-8, textureFrame.height)
            : Math.max(1e-8, sourceRect.sh);
          sprite.scale.set(
            (pointDrawSize * scaleX) / textureWidth,
            (pointDrawSize * scaleY) / textureHeight,
          );
          if (sprite._swPivotSet !== true) {
            sprite.pivot.set(0, 0);
            sprite._swPivotSet = true;
          }
        }
        return true;
      }

      const typeConfig = flower.typeConfig || {};
      const drawSize = commonConfig.drawSize * resolveFlowerGrowthScaleFactor(flower);
      const spriteCellHeight = Number.isFinite(typeConfig.spriteCellHeight)
        ? Math.max(1, typeConfig.spriteCellHeight)
        : 45.819;
      const drawX = -drawSize * 0.5;
      const drawY = -drawSize + ((2.2 / spriteCellHeight) * drawSize);
      const hiddenRadiusScale = hiddenSpriteCullContext
        ? sanitizeHiddenSpriteCullRadiusScale(hiddenSpriteCullContext.hiddenRadiusScale, 1)
        : 1;
      const spriteRadius = resolveSpriteCircleRadius(drawSize, drawSize, hiddenRadiusScale);
      const displacementSpace = typeConfig.displacementSpace === 'screen' ? 'screen' : 'flower';
      const centerAngleRad = Number.isFinite(flower.centerAngleRad) ? flower.centerAngleRad : 0;
      const cosCenter = Math.cos(centerAngleRad);
      const sinCenter = Math.sin(centerAngleRad);
      const basePetalOpenAmount = resolveLilyRuntimePetalOpenAmount(runtimeState, flower);
      const useClosedPetalSprites = resolveLilyRuntimeUseClosedPetalSprites(
        runtimeState,
        flower,
        basePetalOpenAmount,
        commonConfig,
      );
      const petalToggleIsActive = (
        runtimeState
        && typeof runtimeState.getPetalToggleIsActive === 'function'
        && runtimeState.getPetalToggleIsActive() === true
      );
      const useClosedLilySpriteSheet = (
        typeConfig.closedUseMiddlePetalSprite === true
        && useClosedPetalSprites
      );
      const drawBackfacing = commonConfig.backfacing === true;
      const offsetScratch = { x: 0, y: 0 };
      const petalCount = flower.petals.length;
      const startIndex = drawBackfacing ? petalCount - 1 : 0;
      const endIndexExclusive = drawBackfacing ? -1 : petalCount;
      const indexStep = drawBackfacing ? -1 : 1;
      const petalToggleProgress = (
        runtimeState && typeof runtimeState.getPetalToggleProgress === 'function'
      ) ? clamp(runtimeState.getPetalToggleProgress(), 0, 1) : 1;
      const petalToggleStartAmount = (
        runtimeState && typeof runtimeState.getPetalToggleStartAmount === 'function'
      ) ? clamp(runtimeState.getPetalToggleStartAmount(), 0, 1) : basePetalOpenAmount;
      const petalToggleTargetAmount = (
        runtimeState && typeof runtimeState.getPetalToggleTargetAmount === 'function'
      ) ? clamp(runtimeState.getPetalToggleTargetAmount(), 0, 1) : basePetalOpenAmount;
      const petalToggleEasePower = (
        runtimeState && typeof runtimeState.getPetalToggleEasePower === 'function'
      ) ? Math.max(0.01, runtimeState.getPetalToggleEasePower()) : 1;
      const petalToggleOpenBounceAmount = (
        runtimeState && typeof runtimeState.getPetalToggleOpenBounceAmount === 'function'
      ) ? Math.max(0, runtimeState.getPetalToggleOpenBounceAmount()) : 0;
      const petalToggleOpenBounceOscillations = (
        runtimeState && typeof runtimeState.getPetalToggleOpenBounceOscillations === 'function'
      ) ? Math.max(0.25, runtimeState.getPetalToggleOpenBounceOscillations()) : 2;
      const edgePairFlipEnabled = commonConfig.petalToggleEdgePairFlipEnabled === true;
      const edgePairFlipBackProgress = clamp(commonConfig.petalToggleEdgePairFlipBackProgress, 0, 1);
      const closingEdgePairFlipBackProgress = 1 - edgePairFlipBackProgress;
      const openingEdgePairFlipBackProgress = 1 - edgePairFlipBackProgress;
      const edgePairUseInnerSpritesEnabled = commonConfig.petalToggleEdgePairUseInnerSpritesEnabled === true;
      const pairSpeedDisparityEnabled = commonConfig.petalTogglePairSpeedDisparityEnabled === true;
      const pairSpeedStep = Math.max(0, Number(commonConfig.petalTogglePairSpeedStep) || 0);
      const pairSpeedCurve = clamp(Number(commonConfig.petalTogglePairSpeedCurve) || 0, 0, 1);
      const maxPairDistance = resolveLilyMaxPairDistance(typeConfig);
      const spriteCols = Number.isFinite(typeConfig.spriteCols)
        ? Math.max(1, Math.floor(typeConfig.spriteCols))
        : 1;
      const spriteRows = Number.isFinite(typeConfig.spriteRows)
        ? Math.max(1, Math.floor(typeConfig.spriteRows))
        : 1;
      const centerScratch = { x: 0, y: 0 };

      for (let i = startIndex; i !== endIndexExclusive; i += indexStep) {
        const petal = flower.petals[i];
        const isLastOuterPairPetal = petal.col === 0 || petal.col === 6;
        let petalOpenAmount = basePetalOpenAmount;
        if (pairSpeedDisparityEnabled && petalToggleIsActive && pairSpeedStep > 0) {
          const pairDistance = resolveLilyPairDistanceFromCenter(typeConfig, petal.col);
          const normalizedDistance = maxPairDistance > 0 ? clamp(pairDistance / maxPairDistance, 0, 1) : 0;
          const expPower = 1 + pairSpeedCurve * 4;
          const exponentialDistance = Math.pow(normalizedDistance, expPower) * maxPairDistance;
          const shapedPairDistance = (
            pairDistance * (1 - pairSpeedCurve)
            + exponentialDistance * pairSpeedCurve
          );
          const speedMultiplier = 1 + pairSpeedStep * shapedPairDistance;
          const adjustedProgress = clamp(petalToggleProgress * speedMultiplier, 0, 1);
          petalOpenAmount = evaluatePetalToggleAmount(
            petalToggleStartAmount,
            petalToggleTargetAmount,
            adjustedProgress,
            petalToggleEasePower,
            petalToggleOpenBounceAmount,
            petalToggleOpenBounceOscillations,
          );
        }
        const closedDistance = clamp(petalOpenAmount, 0, 1);
        const isInsideEdgePairToggleWindow = (
          petalToggleIsActive
          && !useClosedPetalSprites
          && isLastOuterPairPetal
          && (
            (runtimeState && runtimeState.getPetalToggleIsClosing && runtimeState.getPetalToggleIsClosing())
              ? (closedDistance <= closingEdgePairFlipBackProgress)
              : (closedDistance < openingEdgePairFlipBackProgress)
          )
        );
        const shouldFlipEdgePair = edgePairFlipEnabled && isInsideEdgePairToggleWindow;
        let sourceCol = useClosedLilySpriteSheet
          ? (
            Number.isFinite(flower.closedSpriteCol)
              ? flower.closedSpriteCol
              : resolveLilyMiddlePetalColumn(typeConfig)
          )
          : petal.col;
        if (
          edgePairUseInnerSpritesEnabled
          && isInsideEdgePairToggleWindow
          && !useClosedLilySpriteSheet
        ) {
          if (sourceCol === 0) {
            sourceCol = 1;
          } else if (sourceCol === 6) {
            sourceCol = 5;
          }
        }
        let sourceRect = petal.sourceRect;
        if (useClosedLilySpriteSheet) {
          sourceRect = petal.closedLilySourceRect || petal.closedMiddleSourceRect || sourceRect;
        } else if (
          edgePairUseInnerSpritesEnabled
          && isInsideEdgePairToggleWindow
          && !useClosedPetalSprites
        ) {
          sourceRect = petal.innerSourceRect || sourceRect;
        }
        if (!sourceRect) {
          const fallbackRow = useClosedLilySpriteSheet
            ? (
              Number.isFinite(flower.closedSpriteRow)
                ? flower.closedSpriteRow
                : 0
            )
            : petal.row;
          sourceRect = useClosedLilySpriteSheet
            ? getLilyClosedSpriteSourceRect(typeConfig, sourceCol, fallbackRow)
            : getSpriteSourceRect(typeConfig, sourceCol, fallbackRow);
        }
        if (useSpriteDebugSway && !useClosedLilySpriteSheet) {
          const baseCol = Number.isFinite(sourceCol) ? sourceCol : petal.col;
          const animatedCol = ((baseCol + (debugFrameIndex * debugFrameStep)) % spriteCols + spriteCols) % spriteCols;
          const animatedRow = clamp(
            Number.isFinite(petal.row) ? petal.row : 0,
            0,
            Math.max(0, spriteRows - 1),
          );
          sourceRect = getSpriteSourceRect(typeConfig, animatedCol, animatedRow);
        }
        const textureAssetPath = useClosedLilySpriteSheet
          ? (flower.closedAssetPath || resolveLilyClosedAssetPath(typeConfig))
          : flower.assetPath;
        const texture = getPixiTextureForSourceRect(textureAssetPath, sourceRect);
        if (!texture) {
          continue;
        }
        const motionOffsetRad = useSpriteDebugSway ? 0 : resolvePetalMotionOffsetRad(flower, petal);
        const baseOpenAngle = petal.baseAngleRad || 0;
        const openAngle = baseOpenAngle + motionOffsetRad;
        const angle = centerAngleRad + (openAngle - centerAngleRad) * petalOpenAmount;
        resolvePetalScreenOffsetsInto(petal, displacementSpace, cosCenter, sinCenter, offsetScratch);
        const blendedOffsetX = offsetScratch.x * petalOpenAmount;
        const blendedOffsetY = offsetScratch.y * petalOpenAmount;
        const anchorWorldX = flower.x + blendedOffsetX;
        const anchorWorldY = flower.y + blendedOffsetY;
        if (hiddenSpriteCullContext) {
          resolveSpriteCircleCenterFromDrawTransformInto(
            anchorWorldX,
            anchorWorldY,
            angle,
            drawX,
            drawY,
            drawSize,
            drawSize,
            centerScratch,
          );
          const petalHiddenByBand = isSpriteCircleFullyHiddenInBand(
            centerScratch.x,
            centerScratch.y,
            spriteRadius,
            hiddenSpriteCullContext.hiddenBand,
            hiddenSpriteCullContext.hiddenPaddingPx,
          );
          drawPixiHiddenSpriteCullDebugCircle(
            hiddenSpriteCullContext,
            centerScratch.x,
            centerScratch.y,
            spriteRadius,
            petalHiddenByBand,
            scaleX,
            scaleY,
          );
          if (petalHiddenByBand) {
            if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
              runtimeState.hiddenSpriteCulledCount += 1;
            }
            continue;
          }
        }
        if (hiddenBands.length > 0) {
          resolveSpriteCircleCenterFromDrawTransformInto(
            anchorWorldX,
            anchorWorldY,
            angle,
            drawX,
            drawY,
            drawSize,
            drawSize,
            centerScratch,
          );
          if (isSpriteCircleFullyInsideAnyHiddenBand(centerScratch.x, centerScratch.y, spriteRadius, hiddenBands, 0)) {
            continue;
          }
        }

        const sprite = acquirePixiSprite(layerName, texture, app);
        if (!sprite) {
          continue;
        }
        const scaledDrawWidth = drawSize * scaleX;
        const scaledDrawHeight = drawSize * scaleY;
        const anchorX = 0.5;
        const anchorY = clamp(1 - (2.2 / spriteCellHeight), 0, 1);
        const anchorKey = `l:${anchorX.toFixed(4)}:${anchorY.toFixed(4)}`;
        if (sprite._swAnchorKey !== anchorKey) {
          sprite.anchor.set(anchorX, anchorY);
          sprite._swAnchorKey = anchorKey;
        }
        sprite.position.set(
          anchorWorldX * scaleX,
          anchorWorldY * scaleY,
        );
        sprite.rotation = angle;
        const textureW = Math.max(1e-8, sourceRect.sw);
        const textureH = Math.max(1e-8, sourceRect.sh);
        const textureFrame = texture && texture.frame ? texture.frame : null;
        const resolvedTextureW = Number.isFinite(textureFrame && textureFrame.width)
          ? Math.max(1e-8, textureFrame.width)
          : textureW;
        const resolvedTextureH = Number.isFinite(textureFrame && textureFrame.height)
          ? Math.max(1e-8, textureFrame.height)
          : textureH;
        sprite.scale.set(scaledDrawWidth / resolvedTextureW, scaledDrawHeight / resolvedTextureH);
        if (sprite._swPivotSet !== true) {
          sprite.pivot.set(0, 0);
          sprite._swPivotSet = true;
        }
        if (shouldFlipEdgePair) {
          sprite.scale.x *= -1;
        }
      }
      return true;
    }

    function drawWithPixi(commonConfig, safeDrawOptions = null, runtimeState = null) {
      if (commonConfig.renderer !== 'pixi' || commonConfig.pixiEnabled !== true) {
        disablePixiMode('PIXI renderer disabled by config');
        return null;
      }
      const layerName = safeDrawOptions && safeDrawOptions.layerName === 'front'
        ? 'front'
        : 'back';
      const app = ensurePixiAppForLayer(layerName);
      if (!app) {
        return null;
      }
      const layerCanvas = resolvePixiSurfaceCanvas(layerName);
      const layerMetrics = resolvePixiLayerMetrics(layerName, layerCanvas);
      if (!layerMetrics) {
        return null;
      }
      state.pixi.enabled = true;
      state.pixi.mode = 'pixi';
      state.pixi.disabledReason = '';

      const branchFilter = safeDrawOptions && typeof safeDrawOptions.branchFilter === 'function'
        ? safeDrawOptions.branchFilter
        : null;
      const hiddenBand = safeDrawOptions && safeDrawOptions.hiddenBand && typeof safeDrawOptions.hiddenBand === 'object'
        ? safeDrawOptions.hiddenBand
        : null;
      const hiddenSpriteCullInnerPaddingPx = safeDrawOptions
        && Number.isFinite(Number(safeDrawOptions.hiddenSpriteCullInnerPaddingPx))
        ? Math.max(0, Number(safeDrawOptions.hiddenSpriteCullInnerPaddingPx))
        : 0;
      const hiddenSpriteCullRadiusScale = safeDrawOptions
        ? sanitizeHiddenSpriteCullRadiusScale(safeDrawOptions.hiddenSpriteCullRadiusScale, 1)
        : 1;
      const hiddenBands = Array.isArray(safeDrawOptions && safeDrawOptions.hiddenBands)
        ? safeDrawOptions.hiddenBands
        : (hiddenBand ? [hiddenBand] : []);
      const skipHiddenInBand = safeDrawOptions
        && safeDrawOptions.skipHiddenBackDrawEnabled === true
        && hiddenBands.length > 0;
      const hiddenSpriteCullDebugConfig = resolveHiddenSpriteCullDebugConfig(
        safeDrawOptions ? safeDrawOptions.hiddenSpriteCullDebug : null,
      );
      const hiddenSpriteCullContext = skipHiddenInBand
        ? {
          hiddenBand,
          hiddenPaddingPx: hiddenSpriteCullInnerPaddingPx,
          hiddenRadiusScale: hiddenSpriteCullRadiusScale,
          debugEnabled: false,
          debugMode: 'culled',
          debugMaxPerFrame: 0,
          debugLineWidth: 1,
          debugDrawnCount: 0,
          debugStrokeVisible: '',
          debugStrokeCulled: '',
          pixiDebugGraphics: null,
          pixiDebugStrokeVisible: { color: 0x5adc78, alpha: 0.55 },
          pixiDebugStrokeCulled: { color: 0xff5050, alpha: 0.65 },
        }
        : null;

      const viewportCullContext = null;

      if (hiddenSpriteCullContext && hiddenSpriteCullDebugConfig.enabled) {
        const debugGraphics = ensurePixiHiddenCullDebugGraphics(layerName, app);
        if (debugGraphics && typeof debugGraphics.clear === 'function') {
          debugGraphics.clear();
          hiddenSpriteCullContext.debugEnabled = true;
          hiddenSpriteCullContext.debugMode = hiddenSpriteCullDebugConfig.mode;
          hiddenSpriteCullContext.debugMaxPerFrame = hiddenSpriteCullDebugConfig.maxPerFrame;
          hiddenSpriteCullContext.debugLineWidth = hiddenSpriteCullDebugConfig.lineWidth;
          hiddenSpriteCullContext.debugStrokeVisible = hiddenSpriteCullDebugConfig.strokeVisible;
          hiddenSpriteCullContext.debugStrokeCulled = hiddenSpriteCullDebugConfig.strokeCulled;
          hiddenSpriteCullContext.pixiDebugGraphics = debugGraphics;
          hiddenSpriteCullContext.pixiDebugStrokeVisible = resolvePixiDebugStroke(
            hiddenSpriteCullDebugConfig.strokeVisible,
            { r: 90, g: 220, b: 120, a: 0.55 },
          );
          hiddenSpriteCullContext.pixiDebugStrokeCulled = resolvePixiDebugStroke(
            hiddenSpriteCullDebugConfig.strokeCulled,
            { r: 255, g: 80, b: 80, a: 0.65 },
          );
        }
      } else {
        clearPixiHiddenCullDebugGraphics(layerName);
      }
      if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
        runtimeState.hiddenSpriteCulledCount = 0;
      }

      beginPixiLayerFrame(layerName);

      const useAlwaysInterpolation = commonConfig.swayMode === 'always';
      const alpha = useAlwaysInterpolation ? clamp(state.alwaysRenderAlpha, 0, 1) : 1;
      let drawnCount = 0;
      let culledCount = 0;
      let skippedHiddenCount = 0;

      for (let layerPass = 0; layerPass < 2; layerPass += 1) {
        const renderLilies = layerPass === 1;
        for (let i = 0; i < state.flowers.length; i += 1) {
          const flower = state.flowers[i];
          const isLily = flower && flower.type === 'lily';
          if (isLily !== renderLilies) {
            continue;
          }
          if (branchFilter && branchFilter(flower.branchId, flower) !== true) {
            continue;
          }
          if (useAlwaysInterpolation) {
            const prevInfluence = Number.isFinite(flower.prevHoverInfluence)
              ? flower.prevHoverInfluence
              : (Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0);
            const prevMotionTime = Number.isFinite(flower.prevMotionTime)
              ? flower.prevMotionTime
              : (Number.isFinite(flower.motionTime) ? flower.motionTime : 0);
            flower.renderHoverInfluence = lerp(prevInfluence, Number(flower.hoverInfluence) || 0, alpha);
            flower.renderMotionTime = lerp(prevMotionTime, Number(flower.motionTime) || 0, alpha);
          } else {
            flower.renderHoverInfluence = Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0;
            flower.renderMotionTime = Number.isFinite(flower.motionTime) ? flower.motionTime : 0;
          }
          if (isFlowerOutsideViewportOnCanvas(layerCanvas, flower, commonConfig, layerMetrics)) {
            culledCount += 1;
            continue;
          }
          if (
            skipHiddenInBand
            && isFlowerFullyHiddenInOverlayBand(
              flower,
              commonConfig,
              hiddenBand,
              hiddenSpriteCullInnerPaddingPx,
            )
          ) {
            skippedHiddenCount += 1;
            continue;
          }
          if (
            drawPixiFlowerRecord(
              layerName,
              flower,
              commonConfig,
              runtimeState,
              layerMetrics,
              app,
              hiddenSpriteCullContext,
              viewportCullContext,
              hiddenBands,
            )
          ) {
            drawnCount += 1;
          }
        }
      }
      if (runtimeState && Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
        skippedHiddenCount += runtimeState.hiddenSpriteCulledCount;
      }
      endPixiLayerFrame(layerName);
      if (layerName === 'back' && (!safeDrawOptions || safeDrawOptions.clearFront !== false)) {
        beginPixiLayerFrame('front');
        endPixiLayerFrame('front');
      }
      return { drawnCount, culledCount, skippedHiddenCount };
    }

    function isFlowerOutsideViewport(ctx, flower, commonConfig) {
      if (!commonConfig || commonConfig.viewportCullingEnabled !== true || !ctx || !flower) {
        return false;
      }
      const width = Number.isFinite(ctx.canvas && ctx.canvas.width) ? ctx.canvas.width : 0;
      const height = Number.isFinite(ctx.canvas && ctx.canvas.height) ? ctx.canvas.height : 0;
      if (width <= 0 || height <= 0) {
        return false;
      }
      const scale = getOutputScale(ctx);
      const maxXCss = width / Math.max(1e-8, scale.x);
      const maxYCss = height / Math.max(1e-8, scale.y);
      const radiusCss = estimateFlowerCacheRadiusCss(flower, commonConfig);
      return (
        (flower.x + radiusCss) < 0
        || (flower.y + radiusCss) < 0
        || (flower.x - radiusCss) > maxXCss
        || (flower.y - radiusCss) > maxYCss
      );
    }

    function isFlowerOutsideViewportOnCanvas(canvasEl, flower, commonConfig, layerMetrics = null) {
      if (!commonConfig || commonConfig.viewportCullingEnabled !== true || !canvasEl || !flower) {
        return false;
      }
      const metrics = layerMetrics || resolvePixiLayerMetrics(
        canvasEl === state.pixi.surfaces.frontCanvas ? 'front' : 'back',
        canvasEl,
      );
      if (!metrics) {
        return false;
      }
      const radiusCss = estimateFlowerCacheRadiusCss(flower, commonConfig);
      const maxXCss = Number.isFinite(metrics.maxXCss) ? metrics.maxXCss : 1;
      const maxYCss = Number.isFinite(metrics.maxYCss) ? metrics.maxYCss : 1;
      return (
        (flower.x + radiusCss) < 0
        || (flower.y + radiusCss) < 0
        || (flower.x - radiusCss) > maxXCss
        || (flower.y - radiusCss) > maxYCss
      );
    }

    function isFlowerFullyHiddenInOverlayBand(flower, commonConfig, hiddenBand, paddingPx = 0) {
      if (!flower || !hiddenBand || !Number.isFinite(hiddenBand.centerX)) {
        return false;
      }
      const radiusCss = estimateFlowerCacheRadiusCss(flower, commonConfig);
      if (!Number.isFinite(radiusCss) || radiusCss <= 0) {
        return false;
      }
      const innerBounds = resolveOverlayHiddenBandInnerBoundsForYRange(
        hiddenBand,
        flower.y - radiusCss,
        flower.y + radiusCss,
        paddingPx,
      );
      if (!innerBounds) {
        return false;
      }
      return (
        (flower.x - radiusCss) >= innerBounds.leftX
        && (flower.x + radiusCss) <= innerBounds.rightX
      );
    }

    function draw(ctx, flowersConfig, commonConfig, drawOptions = null) {
      if (state.flowers.length === 0) {
        clearPixiSurfaces();
        state.pixi.enabled = false;
        state.pixi.mode = 'canvas';
        return { drawnCount: 0, culledCount: 0, skippedHiddenCount: 0 };
      }
      if (!ctx) {
        return { drawnCount: 0, culledCount: 0, skippedHiddenCount: 0 };
      }
      const safeDrawOptions = drawOptions && typeof drawOptions === 'object' ? drawOptions : null;
      const branchFilter = safeDrawOptions && typeof safeDrawOptions.branchFilter === 'function'
        ? safeDrawOptions.branchFilter
        : null;
      const hiddenBand = safeDrawOptions && safeDrawOptions.hiddenBand && typeof safeDrawOptions.hiddenBand === 'object'
        ? safeDrawOptions.hiddenBand
        : null;
      const hiddenBands = Array.isArray(safeDrawOptions && safeDrawOptions.hiddenBands)
        ? safeDrawOptions.hiddenBands
        : (hiddenBand ? [hiddenBand] : []);
      const hiddenSpriteCullInnerPaddingPx = safeDrawOptions
        && Number.isFinite(Number(safeDrawOptions.hiddenSpriteCullInnerPaddingPx))
        ? Math.max(0, Number(safeDrawOptions.hiddenSpriteCullInnerPaddingPx))
        : 0;
      const hiddenSpriteCullRadiusScale = safeDrawOptions
        ? sanitizeHiddenSpriteCullRadiusScale(safeDrawOptions.hiddenSpriteCullRadiusScale, 1)
        : 1;
      const skipHiddenInBand = safeDrawOptions
        && safeDrawOptions.skipHiddenBackDrawEnabled === true
        && hiddenBands.length > 0;
      const hiddenSpriteCullDebugConfig = resolveHiddenSpriteCullDebugConfig(
        safeDrawOptions ? safeDrawOptions.hiddenSpriteCullDebug : null,
      );
      const hiddenSpriteCullDrawContext = skipHiddenInBand
        ? {
          hiddenSpriteCullEnabled: true,
          hiddenBand,
          hiddenPaddingPx: hiddenSpriteCullInnerPaddingPx,
          hiddenRadiusScale: hiddenSpriteCullRadiusScale,
          debugEnabled: hiddenSpriteCullDebugConfig.enabled,
          debugMode: hiddenSpriteCullDebugConfig.mode,
          debugMaxPerFrame: hiddenSpriteCullDebugConfig.maxPerFrame,
          debugLineWidth: hiddenSpriteCullDebugConfig.lineWidth,
          debugStrokeVisible: hiddenSpriteCullDebugConfig.strokeVisible,
          debugStrokeCulled: hiddenSpriteCullDebugConfig.strokeCulled,
          debugDrawnCount: 0,
        }
        : null;

      const drawContext = (hiddenSpriteCullDrawContext || hiddenBands.length > 0)
        ? {
          ...hiddenSpriteCullDrawContext,
          hiddenBands,
        }
        : null;

      const runtimeState = {
        getImage,
        getPetalOpenAmount,
        getPetalOpenAmountForBranchId,
        hasPetalOpenAmountOverrideForBranchId,
        getUseClosedPetalSprites,
        getUseClosedPetalSpritesForBranchId,
        getPetalToggleIsActive,
        getPetalToggleIsClosing,
        getPetalToggleProgress,
        getPetalToggleStartAmount,
        getPetalToggleTargetAmount,
        getPetalToggleEasePower,
        getPetalToggleOpenBounceAmount,
        getPetalToggleOpenBounceOscillations,
        debugFrameIndex: Number.isFinite(state.debugFrameIndex) ? state.debugFrameIndex : 0,
        hiddenSpriteCulledCount: 0,
      };
      state.debugFrameIndex = ((Number.isFinite(state.debugFrameIndex) ? state.debugFrameIndex : 0) + 1) % 1000000;

      const pixiStats = drawWithPixi(commonConfig, safeDrawOptions, runtimeState);
      if (pixiStats) {
        return pixiStats;
      }

      const petalToggleActive = getPetalToggleIsActive();
      const useSpriteDebugSway = commonConfig.swaySpriteDebugEnabled === true;
      const usePerFlowerCache = (
        commonConfig.activeLayerCacheEnabled
        && !useSpriteDebugSway
        && commonConfig.bakedFlowersEnabled !== true
      );
      const useAlwaysInterpolation = commonConfig.swayMode === 'always';
      const useAlwaysAnimatedCache = (
        useAlwaysInterpolation
        && usePerFlowerCache
        && commonConfig.swayFastPathEnabled === true
        && commonConfig.alwaysAnimatedCacheEnabled === true
        && useSpriteDebugSway !== true
        && !petalToggleActive
      );
      const alpha = useAlwaysInterpolation ? clamp(state.alwaysRenderAlpha, 0, 1) : 1;
      let drawnCount = 0;
      let culledCount = 0;
      let skippedHiddenCount = 0;

      // Render in two passes so lilies always sit on top of non-lily flowers.
      for (let layerPass = 0; layerPass < 2; layerPass += 1) {
        const renderLilies = layerPass === 1;
        for (let i = 0; i < state.flowers.length; i += 1) {
          const flower = state.flowers[i];
          const isLily = flower && flower.type === 'lily';
          if (isLily !== renderLilies) {
            continue;
          }
          if (branchFilter && branchFilter(flower.branchId, flower) !== true) {
            continue;
          }
          if (useAlwaysInterpolation) {
            const prevInfluence = Number.isFinite(flower.prevHoverInfluence)
              ? flower.prevHoverInfluence
              : (Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0);
            const prevMotionTime = Number.isFinite(flower.prevMotionTime)
              ? flower.prevMotionTime
              : (Number.isFinite(flower.motionTime) ? flower.motionTime : 0);
            flower.renderHoverInfluence = lerp(prevInfluence, Number(flower.hoverInfluence) || 0, alpha);
            flower.renderMotionTime = lerp(prevMotionTime, Number(flower.motionTime) || 0, alpha);
          } else {
            flower.renderHoverInfluence = Number.isFinite(flower.hoverInfluence) ? flower.hoverInfluence : 0;
            flower.renderMotionTime = Number.isFinite(flower.motionTime) ? flower.motionTime : 0;
          }
          if (hiddenBands.length > 0) {
            let culledByBand = false;
            for (let b = 0; b < hiddenBands.length; b += 1) {
              const paddingPx = (skipHiddenInBand && b === 0 && hiddenBand) ? hiddenSpriteCullInnerPaddingPx : 0;
              if (isFlowerFullyHiddenInOverlayBand(flower, commonConfig, hiddenBands[b], paddingPx)) {
                if (skipHiddenInBand && b === 0 && hiddenBand) {
                  skippedHiddenCount += 1;
                } else {
                  culledCount += 1;
                }
                culledByBand = true;
                break;
              }
            }
            if (culledByBand) {
              continue;
            }
          }

          const shouldBypassCacheForFlower = petalToggleActive && isLily;
          if (useAlwaysAnimatedCache) {
            const drewAnimatedCache = drawFlowerFromAnimatedAlwaysCache(
              ctx,
              flower,
              flowersConfig,
              commonConfig,
              runtimeState,
            );
            if (drewAnimatedCache) {
              drawnCount += 1;
              continue;
            }
          }
          if (usePerFlowerCache && !flower.isActive && !shouldBypassCacheForFlower) {
            const drewFromCache = drawFlowerFromCache(
              ctx,
              flower,
              flowersConfig,
              commonConfig,
              runtimeState,
            );
            if (drewFromCache) {
              drawnCount += 1;
              continue;
            }
          }
          drawFlowerByIndex(
            ctx,
            i,
            flowersConfig,
            commonConfig,
            runtimeState,
            drawContext,
          );
          drawnCount += 1;
        }
      }
      if (Number.isFinite(runtimeState.hiddenSpriteCulledCount)) {
        skippedHiddenCount += runtimeState.hiddenSpriteCulledCount;
      }
      return { drawnCount, culledCount, skippedHiddenCount };
    }

    function render(ctx, flowersConfig, nowMs, renderOptions = null) {
      const safeFlowersConfig = flowersConfig || {};
      const commonConfig = resolveCommonFlowerConfig(safeFlowersConfig);
      const safeRenderOptions = renderOptions && typeof renderOptions === 'object'
        ? renderOptions
        : null;
      updateBackLayerHiddenSpriteCullContext(safeRenderOptions);
      const skipUpdate = safeRenderOptions && safeRenderOptions.skipUpdate === true;

      let activeCount = state.activeFlowerIndices.length;
      let updateElapsedMs = 0;
      if (!skipUpdate) {
        const updateStartMs = performance.now();
        activeCount = update(safeFlowersConfig, nowMs, commonConfig);
        updateElapsedMs = performance.now() - updateStartMs;
        state.performance.updateTotalMs += updateElapsedMs;
        state.performance.updateSamples += 1;
      }

      const drawStartMs = performance.now();
      const drawStats = draw(ctx, safeFlowersConfig, commonConfig, safeRenderOptions)
        || { drawnCount: 0, culledCount: 0, skippedHiddenCount: 0 };
      const drawElapsedMs = performance.now() - drawStartMs;
      state.performance.drawTotalMs += drawElapsedMs;
      state.performance.drawSamples += 1;

      return {
        activeCount,
        flowerCount: state.flowers.length,
        updateMs: updateElapsedMs,
        drawMs: drawElapsedMs,
        drawnCount: Number.isFinite(drawStats.drawnCount) ? drawStats.drawnCount : 0,
        culledCount: Number.isFinite(drawStats.culledCount) ? drawStats.culledCount : 0,
        skippedHiddenCount: Number.isFinite(drawStats.skippedHiddenCount)
          ? drawStats.skippedHiddenCount
          : 0,
      };
    }

    function hasRenderableFlowers() {
      if (state.flowers.length === 0) {
        return false;
      }
      if (state.baked.prepared && state.baked.pageImageByFileName.size > 0) {
        return true;
      }
      for (let i = 0; i < state.flowers.length; i += 1) {
        const flower = state.flowers[i];
        if (flower.assetPath && state.imageCache.has(flower.assetPath)) {
          return true;
        }
      }
      return false;
    }

    function getPerformanceSnapshot() {
      const perf = state.performance;
      const updateSamples = Math.max(0, perf.updateSamples);
      const drawSamples = Math.max(0, perf.drawSamples);
      const rebuildCount = Math.max(0, perf.staticLayerRebuildCount);
      const simStepSamples = Math.max(0, perf.simStepSamples);
      const perfElapsedSec = Math.max(
        1e-6,
        (performance.now() - (Number.isFinite(perf.perfStartMs) ? perf.perfStartMs : performance.now())) / 1000,
      );
      return {
        avgUpdateMs: updateSamples > 0 ? perf.updateTotalMs / updateSamples : 0,
        avgDrawMs: drawSamples > 0 ? perf.drawTotalMs / drawSamples : 0,
        activeFlowerCount: perf.activeFlowerCount,
        flowerCount: state.flowers.length,
        simStepsPerSecond: (Number(perf.totalSimSteps) || 0) / perfElapsedSec,
        simStepMsAvg: simStepSamples > 0 ? perf.simStepTotalMs / simStepSamples : 0,
        interpolatedFrames: Number(perf.interpolatedFrames) || 0,
        staticLayerRebuildCount: rebuildCount,
        avgStaticLayerRebuildMs: rebuildCount > 0
          ? perf.staticLayerRebuildTotalMs / rebuildCount
          : 0,
        lastStaticLayerRebuildMs: perf.staticLayerRebuildLastMs,
        staticLayerDirty: state.staticLayerDirty === true,
      };
    }

    function needsContinuousFrames() {
      return state.activeFlowerIndices.length > 0
        || Boolean(state.petalToggleTransition && state.petalToggleTransition.active);
    }

    return {
      setPixiSurfaces,
      setEndpoints,
      setMousePosition,
      clearMousePosition,
      setWindPositions,
      setPetalOpenAmount,
      togglePetalOpenState,
      animateTogglePetalOpenState,
      getPetalOpenAmount,
      getPetalOpenAmountForBranchId,
      hasPetalOpenAmountOverrideForBranchId,
      setFlowerOpenAmountOverridesByBranchId,
      clearFlowerOpenAmountOverridesByBranchId,
      applyJumpAt,
      loadAssets,
      loadSprite,
      render,
      getPerformanceSnapshot,
      hasRenderableFlowers,
      needsContinuousFrames,
    };
  }

  function getCanvas2dContext(canvas, options = null) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      return null;
    }
    const preferred = options && typeof options === 'object' ? options : { willReadFrequently: true };
    return canvas.getContext('2d', preferred) || canvas.getContext('2d');
  }

  function stableStringify(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    const valueType = typeof value;
    if (valueType === 'number') {
      return Number.isFinite(value) ? String(value) : 'null';
    }
    if (valueType === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (valueType === 'string') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      const parts = [];
      for (let i = 0; i < value.length; i += 1) {
        parts.push(stableStringify(value[i]));
      }
      return `[${parts.join(',')}]`;
    }
    if (valueType === 'object') {
      const keys = Object.keys(value).sort();
      const parts = [];
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        parts.push(`${JSON.stringify(key)}:${stableStringify(value[key])}`);
      }
      return `{${parts.join(',')}}`;
    }
    return 'null';
  }

  function sanitizeExporterOptions(options = null) {
    const safe = isPlainObject(options) ? options : {};
    const fps = Number.isFinite(Number(safe.fps)) ? Math.max(1, Math.floor(Number(safe.fps))) : 30;
    const loopFrames = Number.isFinite(Number(safe.loopFrames))
      ? Math.max(1, Math.floor(Number(safe.loopFrames)))
      : 60;
    const neutralFrameIndex = Number.isFinite(Number(safe.neutralFrameIndex))
      ? Math.max(0, Math.floor(Number(safe.neutralFrameIndex)))
      : 0;
    const supersample = Number.isFinite(Number(safe.supersample))
      ? Math.max(1, Math.floor(Number(safe.supersample)))
      : 2;
    const captureScale = Number.isFinite(Number(safe.captureScale))
      ? Math.max(1, Math.floor(Number(safe.captureScale)))
      : 1;
    const maxAtlasSize = Number.isFinite(Number(safe.maxAtlasSize))
      ? Math.max(128, Math.floor(Number(safe.maxAtlasSize)))
      : 4096;
    const paddingPx = Number.isFinite(Number(safe.paddingPx))
      ? Math.max(0, Math.floor(Number(safe.paddingPx)))
      : 2;
    const animatedFramesPerSheet = Number.isFinite(Number(safe.animatedFramesPerSheet))
      ? Math.max(0, Math.floor(Number(safe.animatedFramesPerSheet)))
      : 0;
    const allowMultiPage = safe.allowMultiPage !== false;
    const forceSinglePageByDownscaling = safe.forceSinglePageByDownscaling === true;
    const rawLoopLockMode = typeof safe.loopLockMode === 'string' ? safe.loopLockMode.trim() : '';
    let loopLockMode = 'singleCycle';
    if (rawLoopLockMode === 'none') {
      loopLockMode = 'none';
    } else if (rawLoopLockMode === 'continuousCycle') {
      loopLockMode = 'continuousCycle';
    } else if (rawLoopLockMode === 'singleCycle' || rawLoopLockMode === 'singleCycleSettle') {
      loopLockMode = 'singleCycle';
    }
    return {
      fps,
      loopFrames,
      neutralFrameIndex,
      supersample,
      captureScale,
      effectiveSupersample: supersample * captureScale,
      maxAtlasSize,
      paddingPx,
      animatedFramesPerSheet,
      allowMultiPage,
      forceSinglePageByDownscaling,
      loopLockMode,
      totalFrames: neutralFrameIndex + loopFrames + 1,
    };
  }

  function sanitizeVariantIdFragment(value, fallback = 'variant') {
    const base = (typeof value === 'string' ? value : '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (base.length > 0) {
      return base;
    }
    return fallback;
  }

  function resolveExporterRowOverrideIndex(typeConfig, spriteRows) {
    const safeRows = Number.isFinite(spriteRows) ? Math.max(1, Math.floor(spriteRows)) : 1;
    const raw = Number(typeConfig && typeConfig.exporterRowOverrideOneBased);
    if (!Number.isFinite(raw)) {
      return null;
    }
    return clamp(Math.floor(raw) - 1, 0, Math.max(0, safeRows - 1));
  }

  function scanCanvasAlphaBounds(canvas, ctx = null) {
    const context = ctx || getCanvas2dContext(canvas, { willReadFrequently: true });
    if (!context || !canvas) {
      return null;
    }
    const width = Number.isFinite(canvas.width) ? Math.max(1, Math.floor(canvas.width)) : 1;
    const height = Number.isFinite(canvas.height) ? Math.max(1, Math.floor(canvas.height)) : 1;
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x += 1) {
        const alpha = data[rowOffset + (x * 4) + 3];
        if (alpha === 0) {
          continue;
        }
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  function applyDuplicateEdgePadding(canvas, paddingPx, innerWidth, innerHeight) {
    const pad = Math.max(0, Math.floor(paddingPx));
    if (pad <= 0) {
      return;
    }
    const ctx = getCanvas2dContext(canvas);
    if (!ctx) {
      return;
    }
    const x = pad;
    const y = pad;
    const w = Math.max(1, Math.floor(innerWidth));
    const h = Math.max(1, Math.floor(innerHeight));

    for (let i = 1; i <= pad; i += 1) {
      ctx.drawImage(canvas, x, y, w, 1, x, y - i, w, 1);
      ctx.drawImage(canvas, x, y + h - 1, w, 1, x, y + h - 1 + i, w, 1);
      ctx.drawImage(canvas, x, y, 1, h, x - i, y, 1, h);
      ctx.drawImage(canvas, x + w - 1, y, 1, h, x + w - 1 + i, y, 1, h);
    }

    for (let py = 1; py <= pad; py += 1) {
      for (let px = 1; px <= pad; px += 1) {
        ctx.drawImage(canvas, x, y, 1, 1, x - px, y - py, 1, 1);
        ctx.drawImage(canvas, x + w - 1, y, 1, 1, x + w - 1 + px, y - py, 1, 1);
        ctx.drawImage(canvas, x, y + h - 1, 1, 1, x - px, y + h - 1 + py, 1, 1);
        ctx.drawImage(canvas, x + w - 1, y + h - 1, 1, 1, x + w - 1 + px, y + h - 1 + py, 1, 1);
      }
    }
  }

  function canvasToPngBlob(canvas) {
    if (!canvas) {
      return Promise.reject(new Error('Canvas is required for PNG encoding.'));
    }
    if (typeof canvas.convertToBlob === 'function') {
      return canvas.convertToBlob({ type: 'image/png' });
    }
    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob !== 'function') {
        reject(new Error('Canvas PNG encoding is unavailable.'));
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to encode PNG blob.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  }

  function createFlowerAtlasExporter() {
    const exporterState = {
      flowersConfig: {},
      commonConfig: null,
      settings: sanitizeExporterOptions(null),
      configFingerprint: '',
      images: new Map(),
      variants: [],
      variantByKey: new Map(),
      previewLayoutsByVariantKey: new Map(),
      prepared: false,
    };

    function normalizeFlowersConfig(rawConfig) {
      if (!isPlainObject(rawConfig)) {
        return {};
      }
      if (isPlainObject(rawConfig.flowers)) {
        return rawConfig.flowers;
      }
      return rawConfig;
    }

    function reportProgress(hooks, phase, message, completed = 0, total = 0) {
      if (!hooks || typeof hooks.onProgress !== 'function') {
        return;
      }
      hooks.onProgress({
        phase,
        message,
        completed,
        total,
      });
    }

    function applyFramePose(flower, frameIndex, settings) {
      const frameNumber = Number.isFinite(frameIndex) ? Math.max(0, Math.floor(frameIndex)) : 0;
      if (frameNumber <= settings.neutralFrameIndex) {
        flower.hoverInfluence = 0;
        flower.renderHoverInfluence = 0;
        flower.targetInfluence = 0;
        flower.motionTime = 0;
        flower.renderMotionTime = 0;
        flower.exporterLoopPhaseRad = null;
        flower.exporterLoopLockMode = '';
      } else {
        flower.hoverInfluence = 1;
        flower.renderHoverInfluence = 1;
        flower.targetInfluence = 1;
        if (settings.loopLockMode === 'singleCycle') {
          const loopFrameIndexZeroBased = Math.max(0, frameNumber - settings.neutralFrameIndex - 1);
          const loopFrames = Math.max(1, settings.loopFrames);
          // Sample at half-step inside [0,1) to avoid duplicate endpoint frames
          // while still giving enough time to settle near neutral.
          const loopProgress = (loopFrameIndexZeroBased + 0.5) / loopFrames;
          const loopDurationSec = Math.max(1e-6, settings.loopFrames / settings.fps);
          flower.motionTime = loopProgress * loopDurationSec;
          // Periodic settle envelope with continuity at wrap boundaries.
          const envelope = 0.5 - (0.5 * Math.cos(loopProgress * Math.PI * 2));
          const loopInfluence = Math.pow(Math.max(0, envelope), 1.1);
          flower.hoverInfluence = loopInfluence;
          flower.renderHoverInfluence = loopInfluence;
          flower.targetInfluence = loopInfluence;
          flower.exporterLoopPhaseRad = loopProgress * Math.PI * 2;
          flower.exporterLoopLockMode = 'singleCycle';
        } else if (settings.loopLockMode === 'continuousCycle') {
          const loopFrameIndexZeroBased = Math.max(0, frameNumber - settings.neutralFrameIndex - 1);
          const loopFrames = Math.max(1, settings.loopFrames);
          const loopProgress = (loopFrameIndexZeroBased + 0.5) / loopFrames;
          const loopDurationSec = Math.max(1e-6, settings.loopFrames / settings.fps);
          flower.motionTime = loopProgress * loopDurationSec;
          flower.hoverInfluence = 1;
          flower.renderHoverInfluence = 1;
          flower.targetInfluence = 1;
          flower.exporterLoopPhaseRad = loopProgress * Math.PI * 2;
          flower.exporterLoopLockMode = 'continuousCycle';
        } else {
          flower.motionTime = (frameNumber - settings.neutralFrameIndex - 1) / settings.fps;
          flower.exporterLoopPhaseRad = null;
          flower.exporterLoopLockMode = '';
        }
        flower.renderMotionTime = flower.motionTime;
      }
      if (Array.isArray(flower.petals)) {
        for (let i = 0; i < flower.petals.length; i += 1) {
          const petal = flower.petals[i];
          petal.jumpAngleOffsetRad = 0;
          petal.jumpTargetAngleOffsetRad = 0;
        }
      }
    }

    function createRuntimeState() {
      return {
        getImage(path) {
          return exporterState.images.get(path) || null;
        },
        getPetalOpenAmount() {
          return 1;
        },
        getUseClosedPetalSprites() {
          return false;
        },
        getPetalToggleIsActive() {
          return false;
        },
        getPetalToggleIsClosing() {
          return false;
        },
        getPetalToggleProgress() {
          return 1;
        },
        getPetalToggleStartAmount() {
          return 1;
        },
        getPetalToggleTargetAmount() {
          return 1;
        },
        getPetalToggleEasePower() {
          return 1;
        },
        getPetalToggleOpenBounceAmount() {
          return 0;
        },
        getPetalToggleOpenBounceOscillations() {
          return 2;
        },
        debugFrameIndex: 0,
      };
    }

    function normalizePetalRecord(typeName, rawPetal, typeConfig, options = null) {
      const spriteCols = Number.isFinite(typeConfig.spriteCols) ? Math.max(1, Math.floor(typeConfig.spriteCols)) : 1;
      const spriteRows = Number.isFinite(typeConfig.spriteRows) ? Math.max(1, Math.floor(typeConfig.spriteRows)) : 1;
      const col = clamp(
        Number.isFinite(rawPetal && rawPetal.col) ? Math.floor(rawPetal.col) : 0,
        0,
        Math.max(0, spriteCols - 1),
      );
      const row = clamp(
        Number.isFinite(rawPetal && rawPetal.row) ? Math.floor(rawPetal.row) : 0,
        0,
        Math.max(0, spriteRows - 1),
      );
      const offsetX = Number.isFinite(rawPetal && rawPetal.offsetX) ? rawPetal.offsetX : 0;
      const offsetY = Number.isFinite(rawPetal && rawPetal.offsetY) ? rawPetal.offsetY : 0;
      const normalized = {
        col,
        row,
        sourceRect: getSpriteSourceRect(typeConfig, col, row),
        baseAngleRad: Number.isFinite(rawPetal && rawPetal.baseAngleRad) ? rawPetal.baseAngleRad : 0,
        baseCos: 0,
        baseSin: 0,
        screenOffsetY: Number.isFinite(rawPetal && rawPetal.screenOffsetY) ? rawPetal.screenOffsetY : 0,
        screenOffsetX: Number.isFinite(rawPetal && rawPetal.screenOffsetX) ? rawPetal.screenOffsetX : 0,
        offsetX,
        offsetY,
        radialDistance: Number.isFinite(rawPetal && rawPetal.radialDistance)
          ? Math.max(0, rawPetal.radialDistance)
          : Math.hypot(offsetX, offsetY),
        distanceSq: Number.isFinite(rawPetal && rawPetal.distanceSq)
          ? rawPetal.distanceSq
          : (offsetX * offsetX + offsetY * offsetY),
        hoverAmplitudeRad: Number.isFinite(rawPetal && rawPetal.hoverAmplitudeRad)
          ? rawPetal.hoverAmplitudeRad
          : 0,
        hoverSpeed: Number.isFinite(rawPetal && rawPetal.hoverSpeed) ? rawPetal.hoverSpeed : 0,
        exporterLoopPhaseWarpRad: 0,
        exporterLoopHarmonicMix: 0,
        jumpAngleOffsetRad: 0,
        jumpTargetAngleOffsetRad: 0,
      };
      normalized.baseCos = Math.cos(normalized.baseAngleRad);
      normalized.baseSin = Math.sin(normalized.baseAngleRad);
      if (typeName === 'lily') {
        const closedSpriteCols = resolveLilyClosedSpriteCols(typeConfig);
        const closedSpriteRows = resolveLilyClosedSpriteRows(typeConfig);
        const requestedClosedSpriteCol = Number(options && options.closedSpriteCol);
        const requestedClosedSpriteRow = Number(options && options.closedSpriteRow);
        const hasClosedSpriteCell = Number.isFinite(requestedClosedSpriteCol) && Number.isFinite(requestedClosedSpriteRow);
        const closedSpriteCol = hasClosedSpriteCell
          ? clamp(Math.floor(requestedClosedSpriteCol), 0, Math.max(0, closedSpriteCols - 1))
          : 0;
        const closedSpriteRow = hasClosedSpriteCell
          ? clamp(Math.floor(requestedClosedSpriteRow), 0, Math.max(0, closedSpriteRows - 1))
          : 0;
        const closedMiddlePetalCol = resolveLilyMiddlePetalColumn(typeConfig);
        let innerCol = col;
        if (col === 0) {
          innerCol = Math.min(Math.max(0, spriteCols - 1), 1);
        } else if (col === 6) {
          innerCol = Math.max(0, Math.min(spriteCols - 1, 5));
        }
        normalized.innerSourceRect = getSpriteSourceRect(typeConfig, innerCol, row);
        normalized.closedMiddleSourceRect = getSpriteSourceRect(typeConfig, closedMiddlePetalCol, row);
        if (hasClosedSpriteCell) {
          normalized.closedLilySourceRect = getLilyClosedSpriteSourceRect(
            typeConfig,
            closedSpriteCol,
            closedSpriteRow,
          );
        }
      }
      return normalized;
    }

    function assignExporterLoopStyleToPetal(petal, index, typeName) {
      if (!petal || typeof petal !== 'object') {
        return;
      }
      const baseAngle = Number.isFinite(petal.baseAngleRad) ? petal.baseAngleRad : 0;
      const hoverSpeed = Number.isFinite(petal.hoverSpeed) ? petal.hoverSpeed : 0;
      const speedNorm = clamp((hoverSpeed - 3.2) / 2.2, -1, 1);
      const typePhase = typeName === 'blue' ? 1.27 : 0.19;
      const angleSignal = Math.sin((baseAngle * 1.913) + (index * 0.37) + typePhase);
      const harmonicSignal = Math.cos((baseAngle * 1.31) + (index * 0.19) + (typePhase * 0.5));
      petal.exporterLoopPhaseWarpRad = clamp((speedNorm * 0.45) + (angleSignal * 0.35), -0.85, 0.85);
      petal.exporterLoopHarmonicMix = clamp((speedNorm * 0.22) + (harmonicSignal * 0.16), -0.45, 0.45);
    }

    function buildCanonicalVariants() {
      const flowersConfig = exporterState.flowersConfig;
      const commonConfig = exporterState.commonConfig;
      const variants = [];

      const lilyTypeConfigBase = resolveLilyTypeConfig(flowersConfig);
      const lilyRows = Number.isFinite(lilyTypeConfigBase.spriteRows)
        ? Math.max(1, Math.floor(lilyTypeConfigBase.spriteRows))
        : 1;
      const lilyMethod = lilyTypeConfigBase.method === 'legacy'
        ? 'legacy'
        : (lilyTypeConfigBase.method === 'sweep2'
          ? 'sweep2'
          : (lilyTypeConfigBase.method === 'sweep3' ? 'sweep3' : 'sweep'));
      const lilyStamenCol = Number.isFinite(lilyTypeConfigBase.spriteCols)
        ? Math.max(0, Math.floor(lilyTypeConfigBase.spriteCols) - 1)
        : 7;

      for (let rowOneBased = 1; rowOneBased <= lilyRows; rowOneBased += 1) {
        const variantKey = `lily_row_${rowOneBased}`;
        const endpoint = {
          x: 0,
          y: 0,
          tangentDeg: 0,
          stableKey: `export-${variantKey}`,
        };
        const typeConfig = {
          ...lilyTypeConfigBase,
          exporterRowOverrideOneBased: rowOneBased,
        };
        const rng = mulberry32(hashSeed(`flower-export|${variantKey}`));
        const built = buildLilyFlower(endpoint, typeConfig, commonConfig, rng);
        const closedLilySpriteCell = sampleLilyClosedSpriteCell(typeConfig, rng);
        const petals = [];
        const targetRowZeroBased = clamp(rowOneBased - 1, 0, Math.max(0, lilyRows - 1));
        for (let p = 0; p < built.petals.length; p += 1) {
          const normalized = normalizePetalRecord(
            'lily',
            built.petals[p],
            typeConfig,
            {
              closedSpriteCol: closedLilySpriteCell.col,
              closedSpriteRow: closedLilySpriteCell.row,
            },
          );
          assignExporterLoopStyleToPetal(normalized, p, 'lily');
          const isStamenPetal = lilyMethod === 'sweep3' && normalized.col === lilyStamenCol;
          if (!isStamenPetal) {
            normalized.row = targetRowZeroBased;
            normalized.sourceRect = getSpriteSourceRect(typeConfig, normalized.col, normalized.row);
            if (normalized.innerSourceRect) {
              let innerCol = normalized.col;
              if (innerCol === 0) innerCol = 1;
              if (innerCol === 6) innerCol = 5;
              normalized.innerSourceRect = getSpriteSourceRect(typeConfig, innerCol, normalized.row);
            }
            if (normalized.closedMiddleSourceRect) {
              const closedMiddlePetalCol = resolveLilyMiddlePetalColumn(typeConfig);
              normalized.closedMiddleSourceRect = getSpriteSourceRect(
                typeConfig,
                closedMiddlePetalCol,
                normalized.row,
              );
            }
          }
          petals.push(normalized);
        }
        variants.push({
          key: variantKey,
          type: 'lily',
          typeConfig,
          assetPath: typeof built.assetPath === 'string' ? built.assetPath : resolveLilyAssetPath(typeConfig),
          flower: {
            type: 'lily',
            typeConfig,
            assetPath: typeof built.assetPath === 'string' ? built.assetPath : resolveLilyAssetPath(typeConfig),
            closedAssetPath: resolveLilyClosedAssetPath(typeConfig),
            closedSpriteCol: closedLilySpriteCell.col,
            closedSpriteRow: closedLilySpriteCell.row,
            centerAngleRad: Number.isFinite(built.centerAngleRad) ? built.centerAngleRad : 0,
            x: 0,
            y: 0,
            petals,
            interactionRadius: Number.isFinite(built.interactionRadius)
              ? built.interactionRadius
              : commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
            hoverInfluence: 0,
            renderHoverInfluence: 0,
            targetInfluence: 0,
            motionTime: 0,
            renderMotionTime: 0,
            exporterLoopPhaseRad: null,
            exporterLoopLockMode: '',
            branchId: null,
          },
        });
      }

      const blueTypeConfigBase = resolveBlueTypeConfig(flowersConfig);
      const bluePaths = resolveBlueAssetPaths(blueTypeConfigBase);
      for (let i = 0; i < bluePaths.length; i += 1) {
        const spritePath = bluePaths[i];
        const spritePathKey = sanitizeVariantIdFragment(
          `${i + 1}_${spritePath.split('/').pop() || 'sprite'}`,
          `blue_${i + 1}`,
        );
        const variantKey = `blue_${spritePathKey}`;
        const endpoint = {
          x: 0,
          y: 0,
          tangentDeg: 0,
          stableKey: `export-${variantKey}`,
        };
        const typeConfig = {
          ...blueTypeConfigBase,
          spritePath,
          spritePathPool: [spritePath],
        };
        const rng = mulberry32(hashSeed(`flower-export|${variantKey}`));
        const built = buildBlueFlower(endpoint, typeConfig, commonConfig, rng);
        const petals = [];
        for (let p = 0; p < built.petals.length; p += 1) {
          const normalized = normalizePetalRecord('blue', built.petals[p], typeConfig);
          assignExporterLoopStyleToPetal(normalized, p, 'blue');
          petals.push(normalized);
        }
        variants.push({
          key: variantKey,
          type: 'blue',
          typeConfig,
          assetPath: spritePath,
          flower: {
            type: 'blue',
            typeConfig,
            assetPath: spritePath,
            centerAngleRad: Number.isFinite(built.centerAngleRad) ? built.centerAngleRad : 0,
            x: 0,
            y: 0,
            petals,
            interactionRadius: Number.isFinite(built.interactionRadius)
              ? built.interactionRadius
              : commonConfig.drawSize * commonConfig.swayInteractionRadiusFactor,
            hoverInfluence: 0,
            renderHoverInfluence: 0,
            targetInfluence: 0,
            motionTime: 0,
            renderMotionTime: 0,
            exporterLoopPhaseRad: null,
            exporterLoopLockMode: '',
            branchId: null,
          },
        });
      }
      return variants;
    }

    async function ensureAssetsLoaded(variants, hooks = null) {
      const uniquePaths = Array.from(new Set(
        variants
          .map((variant) => variant.assetPath)
          .filter((path) => typeof path === 'string' && path.length > 0),
      ));
      let completed = 0;
      for (let i = 0; i < uniquePaths.length; i += 1) {
        const path = uniquePaths[i];
        if (!exporterState.images.has(path)) {
          const image = await loadImage(path);
          exporterState.images.set(path, image);
        }
        completed += 1;
        reportProgress(hooks, 'loadAssets', `Loaded ${path}`, completed, uniquePaths.length);
      }
    }

    function estimateVariantRadiusCss(variant) {
      if (!variant || !variant.flower) {
        return 64;
      }
      const flower = variant.flower;
      const petals = Array.isArray(flower.petals) ? flower.petals : [];
      if (variant.type === 'blue') {
        const typeConfig = variant.typeConfig || {};
        const pointDrawSize = Number.isFinite(typeConfig.pointDrawSize) ? Math.max(1, typeConfig.pointDrawSize) : 18;
        let maxRadius = 0;
        for (let i = 0; i < petals.length; i += 1) {
          const p = petals[i];
          const radialDistance = Number.isFinite(p.radialDistance) ? p.radialDistance : 0;
          if (radialDistance > maxRadius) {
            maxRadius = radialDistance;
          }
        }
        return Math.max(24, maxRadius + pointDrawSize + 12);
      }
      let maxOffset = 0;
      for (let i = 0; i < petals.length; i += 1) {
        const p = petals[i];
        const ox = Number.isFinite(p.screenOffsetX) ? p.screenOffsetX : 0;
        const oy = Number.isFinite(p.screenOffsetY) ? p.screenOffsetY : 0;
        const dist = Math.hypot(ox, oy);
        if (dist > maxOffset) {
          maxOffset = dist;
        }
      }
      return Math.max(24, exporterState.commonConfig.drawSize * 1.35 + maxOffset + 12);
    }

    function buildPreviewLayoutForVariant(variant, settings) {
      const supersample = Math.max(1, settings.effectiveSupersample || settings.supersample);
      const radiusCss = estimateVariantRadiusCss(variant);
      const scratchSizeCss = Math.max(64, Math.ceil((radiusCss + 6) * 2));
      const scratchWidthPx = Math.max(1, Math.ceil(scratchSizeCss * supersample));
      const scratchHeightPx = Math.max(1, Math.ceil(scratchSizeCss * supersample));
      const scratchCanvas = createCanvasElement(scratchWidthPx, scratchHeightPx);
      const scratchCtx = getCanvas2dContext(scratchCanvas, { willReadFrequently: true });
      if (!scratchCtx) {
        throw new Error(`Unable to create preview scratch context for ${variant.key}`);
      }
      const runtimeState = createRuntimeState();
      let union = null;
      for (let frameIndex = 0; frameIndex < settings.totalFrames; frameIndex += 1) {
        drawVariantFrameIntoScratch(scratchCtx, scratchCanvas, runtimeState, variant, frameIndex, settings);
        const bounds = scanCanvasAlphaBounds(scratchCanvas, scratchCtx);
        if (!bounds) {
          continue;
        }
        if (!union) {
          union = { ...bounds };
          continue;
        }
        union.minX = Math.min(union.minX, bounds.minX);
        union.minY = Math.min(union.minY, bounds.minY);
        union.maxX = Math.max(union.maxX, bounds.maxX);
        union.maxY = Math.max(union.maxY, bounds.maxY);
        union.width = union.maxX - union.minX + 1;
        union.height = union.maxY - union.minY + 1;
      }
      if (!union) {
        const centerX = scratchWidthPx * 0.5;
        const centerY = scratchHeightPx * 0.5;
        const fallbackHalf = Math.max(
          2,
          Math.ceil(exporterState.commonConfig.drawSize * supersample * 0.25),
        );
        union = {
          minX: clamp(Math.floor(centerX - fallbackHalf), 0, scratchWidthPx - 1),
          minY: clamp(Math.floor(centerY - fallbackHalf), 0, scratchHeightPx - 1),
          maxX: clamp(Math.floor(centerX + fallbackHalf), 0, scratchWidthPx - 1),
          maxY: clamp(Math.floor(centerY + fallbackHalf), 0, scratchHeightPx - 1),
        };
        union.width = union.maxX - union.minX + 1;
        union.height = union.maxY - union.minY + 1;
      }
      return {
        scratchCanvas,
        scratchCtx,
        runtimeState,
        union,
      };
    }

    function getPreviewLayoutForVariant(variant, settings) {
      if (!variant || !variant.key) {
        return null;
      }
      const cached = exporterState.previewLayoutsByVariantKey.get(variant.key);
      if (cached) {
        return cached;
      }
      const built = buildPreviewLayoutForVariant(variant, settings);
      exporterState.previewLayoutsByVariantKey.set(variant.key, built);
      return built;
    }

    function drawVariantFrameIntoScratch(ctx, scratchCanvas, runtimeState, variant, frameIndex, settings) {
      if (!ctx || !scratchCanvas || !variant || !variant.flower) {
        return false;
      }
      const widthPx = Number.isFinite(scratchCanvas.width) ? Math.max(1, Math.floor(scratchCanvas.width)) : 1;
      const heightPx = Number.isFinite(scratchCanvas.height) ? Math.max(1, Math.floor(scratchCanvas.height)) : 1;
      const supersample = Math.max(1, settings.effectiveSupersample || settings.supersample);
      const centerX = widthPx * 0.5;
      const centerY = heightPx * 0.5;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, widthPx, heightPx);
      ctx.setTransform(supersample, 0, 0, supersample, centerX, centerY);
      ctx.imageSmoothingEnabled = true;

      const flower = variant.flower;
      applyFramePose(flower, frameIndex, settings);

      runtimeState.debugFrameIndex = frameIndex;
      const typeConfig = variant.typeConfig || {};
      if (variant.type === 'lily') {
        return drawLilyFlower(ctx, flower, typeConfig, exporterState.commonConfig, runtimeState) === true;
      }
      if (variant.type === 'blue') {
        return drawBlueFlower(ctx, flower, typeConfig, exporterState.commonConfig, runtimeState) === true;
      }
      return false;
    }

    function buildVariantFrames(variant, settings, hooks = null) {
      const baseSupersample = Math.max(1, settings.supersample);
      const captureSupersample = Math.max(
        baseSupersample,
        settings.effectiveSupersample || baseSupersample,
      );
      const totalFrames = settings.totalFrames;
      const radiusCss = estimateVariantRadiusCss(variant);
      const scratchSizeCss = Math.max(64, Math.ceil((radiusCss + 6) * 2));
      const scratchWidthPx = Math.max(1, Math.ceil(scratchSizeCss * captureSupersample));
      const scratchHeightPx = Math.max(1, Math.ceil(scratchSizeCss * captureSupersample));
      const scratchCanvas = createCanvasElement(scratchWidthPx, scratchHeightPx);
      const scratchCtx = getCanvas2dContext(scratchCanvas, { willReadFrequently: true });
      if (!scratchCtx) {
        throw new Error(`Unable to get 2D context for variant ${variant.key}`);
      }
      const runtimeState = createRuntimeState();

      let union = null;
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        drawVariantFrameIntoScratch(scratchCtx, scratchCanvas, runtimeState, variant, frameIndex, settings);
        const bounds = scanCanvasAlphaBounds(scratchCanvas, scratchCtx);
        if (!bounds) {
          continue;
        }
        if (!union) {
          union = { ...bounds };
        } else {
          union.minX = Math.min(union.minX, bounds.minX);
          union.minY = Math.min(union.minY, bounds.minY);
          union.maxX = Math.max(union.maxX, bounds.maxX);
          union.maxY = Math.max(union.maxY, bounds.maxY);
          union.width = union.maxX - union.minX + 1;
          union.height = union.maxY - union.minY + 1;
        }
      }

      if (!union) {
        const centerX = scratchWidthPx * 0.5;
        const centerY = scratchHeightPx * 0.5;
        const fallbackHalf = Math.max(
          2,
          Math.ceil(exporterState.commonConfig.drawSize * captureSupersample * 0.25),
        );
        union = {
          minX: clamp(Math.floor(centerX - fallbackHalf), 0, scratchWidthPx - 1),
          minY: clamp(Math.floor(centerY - fallbackHalf), 0, scratchHeightPx - 1),
          maxX: clamp(Math.floor(centerX + fallbackHalf), 0, scratchWidthPx - 1),
          maxY: clamp(Math.floor(centerY + fallbackHalf), 0, scratchHeightPx - 1),
        };
        union.width = union.maxX - union.minX + 1;
        union.height = union.maxY - union.minY + 1;
      }

      const cropWidthPx = Math.max(1, union.maxX - union.minX + 1);
      const cropHeightPx = Math.max(1, union.maxY - union.minY + 1);
      const innerWidth = Math.max(1, Math.ceil(cropWidthPx / baseSupersample));
      const innerHeight = Math.max(1, Math.ceil(cropHeightPx / baseSupersample));
      const originXInner = ((scratchWidthPx * 0.5) - union.minX) / baseSupersample;
      const originYInner = ((scratchHeightPx * 0.5) - union.minY) / baseSupersample;
      const paddingPx = Math.max(0, Math.floor(settings.paddingPx));
      const frameWidth = innerWidth + paddingPx * 2;
      const frameHeight = innerHeight + paddingPx * 2;

      const frames = [];
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        drawVariantFrameIntoScratch(scratchCtx, scratchCanvas, runtimeState, variant, frameIndex, settings);
        const innerCanvas = createCanvasElement(innerWidth, innerHeight);
        const innerCtx = getCanvas2dContext(innerCanvas);
        if (!innerCtx) {
          throw new Error(`Unable to create inner frame canvas for ${variant.key}`);
        }
        innerCtx.imageSmoothingEnabled = true;
        innerCtx.setTransform(1, 0, 0, 1, 0, 0);
        innerCtx.clearRect(0, 0, innerWidth, innerHeight);
        innerCtx.drawImage(
          scratchCanvas,
          union.minX,
          union.minY,
          cropWidthPx,
          cropHeightPx,
          0,
          0,
          innerWidth,
          innerHeight,
        );

        const frameCanvas = createCanvasElement(frameWidth, frameHeight);
        const frameCtx = getCanvas2dContext(frameCanvas);
        if (!frameCtx) {
          throw new Error(`Unable to create padded frame canvas for ${variant.key}`);
        }
        frameCtx.imageSmoothingEnabled = true;
        frameCtx.setTransform(1, 0, 0, 1, 0, 0);
        frameCtx.clearRect(0, 0, frameWidth, frameHeight);
        frameCtx.drawImage(innerCanvas, paddingPx, paddingPx, innerWidth, innerHeight);
        applyDuplicateEdgePadding(frameCanvas, paddingPx, innerWidth, innerHeight);

        frames.push({
          index: frameIndex,
          canvas: frameCanvas,
          width: frameWidth,
          height: frameHeight,
          originX: originXInner + paddingPx,
          originY: originYInner + paddingPx,
          innerWidth,
          innerHeight,
        });
      }

      reportProgress(hooks, 'renderFrames', `Rendered ${variant.key}`, 1, 1);

      return {
        variantKey: variant.key,
        frames,
        frameWidth,
        frameHeight,
        originX: originXInner + paddingPx,
        originY: originYInner + paddingPx,
        innerWidth,
        innerHeight,
      };
    }

    function resolveSquarePackingPlan(frameRecords, maxAtlasSize) {
      if (!Array.isArray(frameRecords) || frameRecords.length === 0) {
        return null;
      }
      const first = frameRecords[0];
      const baseWidth = Math.max(1, Math.floor(first.width));
      const baseHeight = Math.max(1, Math.floor(first.height));
      for (let i = 1; i < frameRecords.length; i += 1) {
        const record = frameRecords[i];
        if (
          Math.max(1, Math.floor(record.width)) !== baseWidth
          || Math.max(1, Math.floor(record.height)) !== baseHeight
        ) {
          return null;
        }
      }

      const totalFrames = frameRecords.length;
      let bestPlan = null;
      for (let cols = 1; cols <= totalFrames; cols += 1) {
        const rows = Math.ceil(totalFrames / cols);
        const maxScaleX = maxAtlasSize / (cols * baseWidth);
        const maxScaleY = maxAtlasSize / (rows * baseHeight);
        const scale = Math.min(maxScaleX, maxScaleY);
        if (!Number.isFinite(scale) || scale <= 0) {
          continue;
        }
        const scaledWidth = Math.max(1, Math.floor(baseWidth * scale));
        const scaledHeight = Math.max(1, Math.floor(baseHeight * scale));
        const usedWidth = cols * scaledWidth;
        const usedHeight = rows * scaledHeight;
        if (usedWidth > maxAtlasSize || usedHeight > maxAtlasSize) {
          continue;
        }
        const usageScore = (usedWidth * usedHeight) / (maxAtlasSize * maxAtlasSize);
        const plan = {
          cols,
          rows,
          scaleX: scaledWidth / baseWidth,
          scaleY: scaledHeight / baseHeight,
          scaledWidth,
          scaledHeight,
          usedWidth,
          usedHeight,
          usageScore,
        };
        if (!bestPlan) {
          bestPlan = plan;
          continue;
        }
        if (plan.usageScore > bestPlan.usageScore + 1e-9) {
          bestPlan = plan;
          continue;
        }
        if (
          Math.abs(plan.usageScore - bestPlan.usageScore) <= 1e-9
          && (plan.scaleX + plan.scaleY) > (bestPlan.scaleX + bestPlan.scaleY)
        ) {
          bestPlan = plan;
        }
      }
      return bestPlan;
    }

    function packFramesIntoPages(frameRecords, maxAtlasSize, options = null) {
      const safeOptions = isPlainObject(options) ? options : {};
      const preferSquareUsage = safeOptions.preferSquareUsage !== false;
      const allowMultiPage = safeOptions.allowMultiPage !== false;
      const forceSinglePageByDownscaling = safeOptions.forceSinglePageByDownscaling === true;
      const squarePlan = preferSquareUsage
        ? resolveSquarePackingPlan(frameRecords, maxAtlasSize)
        : null;
      const canUseSquarePlan = Boolean(
        squarePlan
        && Number.isFinite(squarePlan.scaleX)
        && Number.isFinite(squarePlan.scaleY)
        && squarePlan.scaleX > 0
        && squarePlan.scaleY > 0,
      );
      const shouldUseSquareSinglePage = canUseSquarePlan && (
        (squarePlan.scaleX > 1.0001 && squarePlan.scaleY > 1.0001)
        || forceSinglePageByDownscaling
      );

      if (shouldUseSquareSinglePage) {
        const pageCanvas = createCanvasElement(maxAtlasSize, maxAtlasSize);
        const pageCtx = getCanvas2dContext(pageCanvas);
        if (!pageCtx) {
          throw new Error('Unable to create atlas page canvas.');
        }
        pageCtx.clearRect(0, 0, maxAtlasSize, maxAtlasSize);
        pageCtx.imageSmoothingEnabled = true;

        const placements = [];
        for (let i = 0; i < frameRecords.length; i += 1) {
          const record = frameRecords[i];
          const row = Math.floor(i / squarePlan.cols);
          const col = i % squarePlan.cols;
          const x = col * squarePlan.scaledWidth;
          const y = row * squarePlan.scaledHeight;
          pageCtx.drawImage(
            record.canvas,
            0,
            0,
            Math.max(1, Math.floor(record.width)),
            Math.max(1, Math.floor(record.height)),
            x,
            y,
            squarePlan.scaledWidth,
            squarePlan.scaledHeight,
          );
          placements.push({
            frameIndex: record.index,
            x,
            y,
            width: squarePlan.scaledWidth,
            height: squarePlan.scaledHeight,
            originX: (Number(record.originX) || 0) * squarePlan.scaleX,
            originY: (Number(record.originY) || 0) * squarePlan.scaleY,
            innerWidth: (Number(record.innerWidth) || 0) * squarePlan.scaleX,
            innerHeight: (Number(record.innerHeight) || 0) * squarePlan.scaleY,
          });
        }

        return {
          pages: [{
            canvas: pageCanvas,
            ctx: pageCtx,
            usedWidth: squarePlan.usedWidth,
            usedHeight: squarePlan.usedHeight,
            placements,
          }],
          packScaleX: squarePlan.scaleX,
          packScaleY: squarePlan.scaleY,
          usedSquarePacking: true,
          forcedDownscaleApplied: Boolean(
            forceSinglePageByDownscaling
            && (squarePlan.scaleX < 0.9999 || squarePlan.scaleY < 0.9999),
          ),
          overflowMultiPage: false,
        };
      }

      const pages = [];
      let currentPage = null;
      let cursorX = 0;
      let cursorY = 0;
      let rowHeight = 0;

      function startPage() {
        const pageCanvas = createCanvasElement(maxAtlasSize, maxAtlasSize);
        const pageCtx = getCanvas2dContext(pageCanvas);
        if (!pageCtx) {
          throw new Error('Unable to create atlas page canvas.');
        }
        pageCtx.clearRect(0, 0, maxAtlasSize, maxAtlasSize);
        currentPage = {
          canvas: pageCanvas,
          ctx: pageCtx,
          usedWidth: 0,
          usedHeight: 0,
          placements: [],
        };
        pages.push(currentPage);
        cursorX = 0;
        cursorY = 0;
        rowHeight = 0;
      }

      startPage();

      for (let i = 0; i < frameRecords.length; i += 1) {
        const record = frameRecords[i];
        const width = Math.max(1, Math.floor(record.width));
        const height = Math.max(1, Math.floor(record.height));
        if (width > maxAtlasSize || height > maxAtlasSize) {
          throw new Error(`Frame ${record.index} exceeds max atlas size ${maxAtlasSize}.`);
        }

        if ((cursorX + width) > maxAtlasSize) {
          cursorX = 0;
          cursorY += rowHeight;
          rowHeight = 0;
        }
        if ((cursorY + height) > maxAtlasSize) {
          startPage();
        }

        currentPage.ctx.drawImage(record.canvas, cursorX, cursorY);
        currentPage.placements.push({
          frameIndex: record.index,
          x: cursorX,
          y: cursorY,
          width,
          height,
          originX: record.originX,
          originY: record.originY,
          innerWidth: record.innerWidth,
          innerHeight: record.innerHeight,
        });
        currentPage.usedWidth = Math.max(currentPage.usedWidth, cursorX + width);
        currentPage.usedHeight = Math.max(currentPage.usedHeight, cursorY + height);

        cursorX += width;
        rowHeight = Math.max(rowHeight, height);
      }

      if (!allowMultiPage && pages.length > 1) {
        throw new Error(
          `Packing overflow: ${pages.length} atlas pages required at maxAtlasSize=${maxAtlasSize}. Enable allowMultiPage or forceSinglePageByDownscaling.`,
        );
      }

      return {
        pages,
        packScaleX: 1,
        packScaleY: 1,
        usedSquarePacking: false,
        forcedDownscaleApplied: false,
        overflowMultiPage: pages.length > 1,
      };
    }

    function splitVariantFramesIntoSheetChunks(frameRecords, settings) {
      if (!Array.isArray(frameRecords) || frameRecords.length === 0) {
        return [];
      }
      const animatedFramesPerSheet = Number.isFinite(Number(settings && settings.animatedFramesPerSheet))
        ? Math.max(0, Math.floor(Number(settings.animatedFramesPerSheet)))
        : 0;
      if (animatedFramesPerSheet <= 0) {
        return [frameRecords];
      }
      const total = frameRecords.length;
      const neutralIndex = clamp(
        Number.isFinite(Number(settings && settings.neutralFrameIndex))
          ? Math.floor(Number(settings.neutralFrameIndex))
          : 0,
        0,
        Math.max(0, total - 1),
      );
      const chunks = [];
      const prefixFrames = frameRecords.slice(0, neutralIndex + 1);
      const animatedStart = neutralIndex + 1;
      const firstAnimatedChunk = frameRecords.slice(
        animatedStart,
        Math.min(total, animatedStart + animatedFramesPerSheet),
      );
      const firstChunk = prefixFrames.concat(firstAnimatedChunk);
      if (firstChunk.length > 0) {
        chunks.push(firstChunk);
      }
      let cursor = animatedStart + firstAnimatedChunk.length;
      while (cursor < total) {
        const next = frameRecords.slice(cursor, Math.min(total, cursor + animatedFramesPerSheet));
        if (next.length > 0) {
          chunks.push(next);
        }
        cursor += animatedFramesPerSheet;
      }
      return chunks.length > 0 ? chunks : [frameRecords];
    }

    async function prepare(rawConfig, options = null, hooks = null) {
      exporterState.flowersConfig = normalizeFlowersConfig(rawConfig);
      exporterState.settings = sanitizeExporterOptions(options);
      exporterState.commonConfig = resolveCommonFlowerConfig(exporterState.flowersConfig);
      exporterState.variants = buildCanonicalVariants();
      exporterState.variantByKey = new Map();
      exporterState.previewLayoutsByVariantKey = new Map();
      for (let i = 0; i < exporterState.variants.length; i += 1) {
        const variant = exporterState.variants[i];
        exporterState.variantByKey.set(variant.key, variant);
      }
      const fingerprintInput = {
        flowers: exporterState.flowersConfig,
        settings: exporterState.settings,
      };
      exporterState.configFingerprint = String(hashSeed(stableStringify(fingerprintInput)));

      reportProgress(hooks, 'prepare', 'Building canonical variants', 1, 3);
      await ensureAssetsLoaded(exporterState.variants, hooks);
      reportProgress(hooks, 'prepare', 'Assets loaded', 2, 3);
      exporterState.prepared = true;
      reportProgress(hooks, 'prepare', 'Exporter prepared', 3, 3);
      return {
        variantCount: exporterState.variants.length,
        configFingerprint: exporterState.configFingerprint,
      };
    }

    function listVariants() {
      return exporterState.variants.map((variant) => ({
        key: variant.key,
        type: variant.type,
        assetPath: variant.assetPath,
      }));
    }

    function renderVariantFrame(variantKey, frameIndex, outputCanvas = null) {
      if (!exporterState.prepared) {
        throw new Error('Exporter is not prepared. Call prepare(...) first.');
      }
      const variant = exporterState.variantByKey.get(variantKey);
      if (!variant) {
        throw new Error(`Unknown variant key: ${variantKey}`);
      }
      const settings = exporterState.settings;
      const layout = getPreviewLayoutForVariant(variant, settings);
      if (!layout || !layout.scratchCtx || !layout.scratchCanvas || !layout.union) {
        throw new Error(`Unable to render preview frame for ${variantKey}`);
      }
      drawVariantFrameIntoScratch(
        layout.scratchCtx,
        layout.scratchCanvas,
        layout.runtimeState,
        variant,
        frameIndex,
        settings,
      );
      const bounds = layout.union;
      const frameCanvas = outputCanvas || createCanvasElement(256, 256);
      const frameCtx = getCanvas2dContext(frameCanvas);
      if (!frameCtx) {
        throw new Error('Unable to draw preview frame.');
      }
      frameCtx.setTransform(1, 0, 0, 1, 0, 0);
      frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
      const srcW = Math.max(1, bounds.width);
      const srcH = Math.max(1, bounds.height);
      const dstScale = Math.min(frameCanvas.width / srcW, frameCanvas.height / srcH);
      const dstW = Math.max(1, srcW * dstScale);
      const dstH = Math.max(1, srcH * dstScale);
      const dstX = (frameCanvas.width - dstW) * 0.5;
      const dstY = (frameCanvas.height - dstH) * 0.5;
      frameCtx.drawImage(
        layout.scratchCanvas,
        bounds.minX,
        bounds.minY,
        srcW,
        srcH,
        dstX,
        dstY,
        dstW,
        dstH,
      );
      return {
        canvas: frameCanvas,
        bounds,
      };
    }

    async function bakeAtlasesFiltered(rawConfig, options = null, hooks = null, variantKeys = null) {
      await prepare(rawConfig, options, hooks);
      const settings = exporterState.settings;
      let variants = exporterState.variants;
      if (Array.isArray(variantKeys) && variantKeys.length > 0) {
        const requested = new Set(
          variantKeys
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value) => value.length > 0),
        );
        variants = variants.filter((variant) => requested.has(variant.key));
      }
      if (!Array.isArray(variants) || variants.length === 0) {
        throw new Error('No exporter variants matched the requested selection.');
      }
      const manifest = {
        version: 1,
        exportSettings: {
          fps: settings.fps,
          loopFrames: settings.loopFrames,
          neutralFrameIndex: settings.neutralFrameIndex,
          supersample: settings.supersample,
          captureScale: settings.captureScale,
          effectiveSupersample: settings.effectiveSupersample,
          maxAtlasSize: settings.maxAtlasSize,
          paddingPx: settings.paddingPx,
          animatedFramesPerSheet: settings.animatedFramesPerSheet,
          allowMultiPage: settings.allowMultiPage,
          forceSinglePageByDownscaling: settings.forceSinglePageByDownscaling,
          loopLockMode: settings.loopLockMode,
        },
        configFingerprint: exporterState.configFingerprint,
        pageFiles: [],
        variants: {},
      };
      const files = [];

      for (let i = 0; i < variants.length; i += 1) {
        const variant = variants[i];
        reportProgress(hooks, 'renderFrames', `Rendering ${variant.key}`, i, variants.length);
        const frameBundle = buildVariantFrames(variant, settings, hooks);
        const frameChunks = splitVariantFramesIntoSheetChunks(frameBundle.frames, settings);
        const variantEntry = {
          type: variant.type,
          assetPath: variant.assetPath,
          frameCount: frameBundle.frames.length,
          frameSize: {
            width: frameBundle.frameWidth,
            height: frameBundle.frameHeight,
            innerWidth: frameBundle.innerWidth,
            innerHeight: frameBundle.innerHeight,
          },
          origin: {
            x: frameBundle.originX,
            y: frameBundle.originY,
          },
          packScale: {
            x: 1,
            y: 1,
            squarePackingUsed: false,
          },
          pages: [],
          frames: [],
        };

        const placementByFrameIndex = new Map();
        let variantDefaultPackScaleX = 1;
        let variantDefaultPackScaleY = 1;
        let variantPackScaleSet = false;
        let anySquarePackingUsed = false;
        let globalVariantPageIndex = 0;
        for (let chunkIndex = 0; chunkIndex < frameChunks.length; chunkIndex += 1) {
          const chunkFrames = frameChunks[chunkIndex];
          const packResult = packFramesIntoPages(
            chunkFrames,
            settings.maxAtlasSize,
            {
              preferSquareUsage: true,
              allowMultiPage: settings.allowMultiPage,
              forceSinglePageByDownscaling: settings.forceSinglePageByDownscaling,
            },
          );
          const pages = Array.isArray(packResult && packResult.pages) ? packResult.pages : [];
          const chunkPackScaleX = Number(packResult && packResult.packScaleX) || 1;
          const chunkPackScaleY = Number(packResult && packResult.packScaleY) || 1;
          if (packResult && packResult.overflowMultiPage) {
            reportProgress(
              hooks,
              'warn',
              `${variant.key} overflowed into ${pages.length} pages (chunk ${chunkIndex + 1}/${frameChunks.length}) at ${settings.maxAtlasSize}px`,
              chunkIndex + 1,
              frameChunks.length,
            );
          }
          if (packResult && packResult.forcedDownscaleApplied) {
            reportProgress(
              hooks,
              'warn',
              `${variant.key} forced single-page downscale applied (scale ${chunkPackScaleX.toFixed(3)} x ${chunkPackScaleY.toFixed(3)})`,
              chunkIndex + 1,
              frameChunks.length,
            );
          }
          if (!variantPackScaleSet) {
            variantDefaultPackScaleX = chunkPackScaleX;
            variantDefaultPackScaleY = chunkPackScaleY;
            variantPackScaleSet = true;
          }
          if (packResult && packResult.usedSquarePacking) {
            anySquarePackingUsed = true;
          }
          for (let localPageIndex = 0; localPageIndex < pages.length; localPageIndex += 1) {
            const page = pages[localPageIndex];
            const pageIndex = globalVariantPageIndex + localPageIndex;
            const fileName = `flowers_atlas_${variant.key}_p${pageIndex}.png`;
            const usedWidth = Math.max(1, page.usedWidth);
            const usedHeight = Math.max(1, page.usedHeight);
            const trimmedCanvas = createCanvasElement(usedWidth, usedHeight);
            const trimmedCtx = getCanvas2dContext(trimmedCanvas);
            trimmedCtx.drawImage(page.canvas, 0, 0, usedWidth, usedHeight, 0, 0, usedWidth, usedHeight);
            const blob = await canvasToPngBlob(trimmedCanvas);
            files.push({
              type: 'image/png',
              fileName,
              blob,
            });
            manifest.pageFiles.push({
              fileName,
              width: usedWidth,
              height: usedHeight,
              variantKey: variant.key,
              pageIndex,
            });
            variantEntry.pages.push({
              fileName,
              width: usedWidth,
              height: usedHeight,
              pageIndex,
            });
            for (let p = 0; p < page.placements.length; p += 1) {
              const placement = page.placements[p];
              placementByFrameIndex.set(placement.frameIndex, {
                pageIndex,
                fileName,
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height,
                originX: placement.originX,
                originY: placement.originY,
                innerWidth: placement.innerWidth,
                innerHeight: placement.innerHeight,
                packScaleX: chunkPackScaleX,
                packScaleY: chunkPackScaleY,
              });
            }
          }
          globalVariantPageIndex += pages.length;
        }
        variantEntry.packScale.x = variantDefaultPackScaleX;
        variantEntry.packScale.y = variantDefaultPackScaleY;
        variantEntry.packScale.squarePackingUsed = anySquarePackingUsed;

        for (let frameIndex = 0; frameIndex < frameBundle.frames.length; frameIndex += 1) {
          const placement = placementByFrameIndex.get(frameIndex);
          if (!placement) {
            throw new Error(`Missing packed frame metadata for ${variant.key} frame ${frameIndex}`);
          }
          variantEntry.frames.push({
            frameIndex,
            pageIndex: placement.pageIndex,
            fileName: placement.fileName,
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            originX: placement.originX,
            originY: placement.originY,
            innerWidth: placement.innerWidth,
            innerHeight: placement.innerHeight,
            packScaleX: placement.packScaleX,
            packScaleY: placement.packScaleY,
          });
        }

        if (variantEntry.frames.length > 0) {
          const firstFrame = variantEntry.frames[0];
          variantEntry.frameSize.width = firstFrame.width;
          variantEntry.frameSize.height = firstFrame.height;
          variantEntry.frameSize.innerWidth = firstFrame.innerWidth;
          variantEntry.frameSize.innerHeight = firstFrame.innerHeight;
          variantEntry.origin.x = firstFrame.originX;
          variantEntry.origin.y = firstFrame.originY;
        }

        manifest.variants[variant.key] = variantEntry;
        reportProgress(hooks, 'pack', `Packed ${variant.key}`, i + 1, variants.length);
      }

      const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      files.unshift({
        type: 'application/json',
        fileName: 'flowers_atlas_manifest.json',
        blob: manifestBlob,
      });
      reportProgress(hooks, 'done', 'Export complete', variants.length, variants.length);
      return {
        manifest,
        files,
      };
    }

    async function bakeAtlases(rawConfig, options = null, hooks = null) {
      return bakeAtlasesFiltered(rawConfig, options, hooks, null);
    }

    async function bakeVariantAtlas(rawConfig, options = null, variantKey = '', hooks = null) {
      const normalizedVariantKey = typeof variantKey === 'string' ? variantKey.trim() : '';
      if (normalizedVariantKey.length === 0) {
        throw new Error('A variant key is required for single-variant export.');
      }
      return bakeAtlasesFiltered(rawConfig, options, hooks, [normalizedVariantKey]);
    }

    return {
      prepare,
      listVariants,
      renderVariantFrame,
      bakeAtlases,
      bakeVariantAtlas,
    };
  }

  globalScope.StemWarpFlowerSystem11 = {
    createFlowerSystem,
    createFlowerAtlasExporter,
  };
})(window);
