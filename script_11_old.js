/*
  script_11.js
  -----------------------------------------------------------------------------
  Multi-branch architecture
  -----------------------------------------------------------------------------
  Key change from the previous setup:
  - We no longer keep a single active path in global state.
  - Each branch is its own object with its own seed, points, and path data.
  - A BranchGarden object owns many Branch instances and renders all of them.

  This makes setSeeds()/plantSeeds() naturally support many branches without
  branches overwriting each other.
*/

// =========================
// 1) Canvas
// =========================
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
let frontCanvas = document.getElementById('myCanvasFront');
if (!frontCanvas) {
  frontCanvas = document.createElement('canvas');
  frontCanvas.id = 'myCanvasFront';
}
let flowersBackCanvas = document.getElementById('myCanvasFlowersBack');
if (!flowersBackCanvas) {
  flowersBackCanvas = document.createElement('canvas');
  flowersBackCanvas.id = 'myCanvasFlowersBack';
}
let flowersFrontCanvas = document.getElementById('myCanvasFlowersFront');
if (!flowersFrontCanvas) {
  flowersFrontCanvas = document.createElement('canvas');
  flowersFrontCanvas.id = 'myCanvasFlowersFront';
}
const video = document.createElement('video');
const centerOverlayImageLayer = document.createElement('img');

// =========================
// 2) Config
// =========================
let valScaling = 0.01;
const defaultCountPerSide = 9;
const FILTER_CACHE_HUE_STEP_DEG = 2;
const FILTER_CACHE_BRIGHTNESS_STEP = 0.02;

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

video.src = normalizeHostedAssetPath('./hero_vid_7.webm');
video.controls = false; // Displays play/pause and volume controls
video.preload = 'auto';
video.muted = true;
video.playsInline = true;
video.setAttribute('playsinline', '');
centerOverlayImageLayer.id = 'centerOverlayImage';
centerOverlayImageLayer.alt = '';
centerOverlayImageLayer.draggable = false;
// video.height = window.innerHeight;   // Set height in pixels

document.body.appendChild(flowersBackCanvas);
document.body.appendChild(video);  // Adds it to the page
document.body.appendChild(centerOverlayImageLayer);
// Keep front overlay canvas in root stacking context so it can render above the video.
document.body.appendChild(frontCanvas);
document.body.appendChild(flowersFrontCanvas);
const frontCtx = frontCanvas.getContext('2d');


// // Define your color values
// let h = 205; // Blue hue
// let s = 33;  // 50% saturation
// let l = 59;  // 60% lightness
// let color1 = `hsl(${h}, ${s}%, ${l}%)`;

// h = 208;
// s = 34;
// l = 49; 
// let color2 = `hsl(${h}, ${s}%, ${l}%)`;

// h = 202;
// s = 30;
// l = 42; 
// let color3 = `hsl(${h}, ${s}%, ${l}%)`;


// Define your color values
// let h = 10; // Blue hue
// let s = 10;  // 50% saturation
// let l = 80;  // 60% lightness
// let color1 = `hsl(${h}, ${s}%, ${l}%)`;

// h = 40;
// s = 10;
// l = 80; 
// let color2 = `hsl(${h}, ${s}%, ${l}%)`;

// h = 40;
// s = 10;
// l = 70; 
// let color3 = `hsl(${h}, ${s}%, ${l}%)`;
// let basehue = 40;

// let h = basehue; // Blue hue
// let s = 10;  // 50% saturation
// let l = 90;  // 60% lightness
// let color1 = `hsl(${h}, ${s}%, ${l}%)`;

// h = basehue;
// s = 10;
// l = 80; 
// let color2 = `hsl(${h}, ${s}%, ${l}%)`;

// h = basehue;
// s = 10;
// l = 70; 
// let color3 = `hsl(${h}, ${s}%, ${l}%)`;

// let base_hue = 200;
// let base_sat = 20;
// let base_lit = 60;

// let base_hue = 210;
// let base_sat = 10;
// let base_lit = 60;

// let h = base_hue + 5; // Blue hue
// let s = base_sat + 5;  // 50% saturation
// let l = base_lit + 10;  // 60% lightness
// let color1 = `hsl(${h}, ${s}%, ${l}%)`;

// h = base_hue + 8;
// s = base_sat + 15;
// l = base_lit - 1; 
// let color2 = `hsl(${h}, ${s}%, ${l}%)`;

// h = base_hue + 8;
// s = base_sat + 20;
// l = base_lit - 8; 
// let color3 = `hsl(${h}, ${s}%, ${l}%)`;

let base_hue = 200;
let base_sat = 10;
let base_lit = 90;

let h = base_hue + 5; // Blue hue
let s = base_sat + 5;  // 50% saturation
let l = base_lit + 10;  // 60% lightness

let color1 = `hsl(${h}, ${s}%, ${l}%)`;

h = base_hue + 8;
s = base_sat + 5;
l = base_lit - 1; 
let color2 = `hsl(${h}, ${s}%, ${l}%)`;

h = base_hue + 8;
s = base_sat + 10;
l = base_lit - 8; 
let color3 = `hsl(${h}, ${s}%, ${l}%)`;


// Define your color values
// let h = 220; // Blue hue
// let s = 100;  // 50% saturation
// let l = 50;  // 60% lightness
// let color1 = `hsl(${h}, ${s}%, ${l}%)`;



let gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight );
gradient.addColorStop(0, color1);
gradient.addColorStop(0.5, color2);
gradient.addColorStop(1, color3);


// Apply as a string to the backgroundColor property

const CONFIG = {
  backgroundColor: gradient,
  globalFoliageScale: 0.85, // global foliage multiplier (branches + stems + leaves + flowers)

  noise: {
    // stepSize: 2,
    // scale: 2.2,
    // timeStep: 1 / 300,
    // checkpointCount: 20,
    // checkpointSpacingSteps: 2,

    stepSize: 0.1,
    scale: 20,
    timeStep: 1 / 300,
    checkpointCount: 20,
    checkpointSpacingSteps: 2,
  },

  path: {
    smoothingSubdivisionsPerSpan: 10,
  },
 
  pathGeneration: {
    
    mode: 'manualTemplate', // random | manualTemplate
    useAbsoluteNoiseX: false, // if true, X/lateral noise uses abs()
    useAbsoluteNoiseY: false, // if true, Y/forward noise uses abs()
    absoluteNoiseXRatio: 0.4, // when useAbsoluteNoiseX=false, blend signed->absolute by this ratio (0..1)
    absoluteNoiseYRatio: 0.9, // when useAbsoluteNoiseY=false, blend signed->absolute by this ratio (0..1)
    // templateScale: 0.5,
    templateScaleRangeMin: 0.2,
    templateScaleRangeMax: 0.5,
    baseRotationDeg: 5, // rotates generated base path around its seed before rendering
    templateNoiseAmount: 40 * valScaling,
    templateNoiseStep: 1 / 7.5,
    templateNoiseAmount2: 25 * valScaling,
    templateNoiseStep2: 1 / 0.5,
    templateNoiseAmount3: 40 * valScaling,
    templateNoiseStep3: 1 / 3,
    templateNoiseHighpassWindow3: 23,
    templateNoiseDirectionalBias: 0.8,
    templateInheritCheckpointSpacingSteps: true,
    alignTemplateToGrowth: true,
    templatePickMode: 'random', // random | fixed
    templatePickDeterministic: true,
    fixedTemplateIndex: 2,
    // Additional base templates (arrays of {x,y}) besides generate_manual_points().
    manualTemplates: [],
  },

  brush: {
    stripWidth: 0.3,
    scale: 0.18,
    sclale: undefined, // typo compatibility
    thicknessTaperEnabled: true,
    thicknessMinScale: 0.48,
    thicknessTaperExponent: 0.2,
    thicknessMinWidth: 0, // absolute minimum rendered width in px (applied when taper is enabled)
    globalHueDeg: 5,
    globalBrightness: 0.89,
    randomizeBranchFilter: true,
    randomHueMinDeg: 15,
    randomHueMaxDeg: 0,
    randomBrightnessMin: 1.05,
    randomBrightnessMax: 0.9,
    randomFilterVariantCount: 15,
    randomFilterAssignmentMode: 'inheritParent', // perBranch | inheritParent
    pathOffset: 0,
    repeatGap: 0,
    repeatOverlap: 0.13, //usually 0.2
    startOffset: 0,
    cropPartialRepeat: true,
  },

  seeds: {
    countPerSide: defaultCountPerSide,
    sidePad: -0.85 * window.innerWidth,
    sideMargin: 2,
    mode: 'explicitYRatios', // autoSpacing | explicitYRatios
    explicitYRatioBasis: 'video', // video | viewport
    explicitYRatios: [0.05, 0.1, 0.3, 0.5, 0.4 , 0.45, 0.89, 0.85, 0.9], // shared ratios for both sides (0..1 or 0..100)
    explicitYRatiosBySide: null, // optional { left: [...], right: [...] }
    explicitYRatiosLeft: null, // optional side override list
    explicitYRatiosRight: null, // optional side override list
    startY: window.innerHeight * 0.05, // explicit first-seed Y; null randomizes first seed per side
    randomizeSpacing: true, // if true, per-seed spacing is sampled in [minSpacing, maxSpacing]
    minSpacing: window.innerHeight/ defaultCountPerSide, // minimum vertical distance between seeds on the same side
    // minSpacing: 300,
    maxSpacing: null, // when null + randomizeSpacing=true, an automatic max is derived from minSpacing
  },

  // offshoot: {
  //   enabled: true,
  //   deterministic: true,
  //   maxDepth: 1,
  //   countRange: [0, 5],
  //   spawnTMin: 0.01,
  //   spawnTMax: 0.96,
  //   biasExponent: 1.6,
  //   angleDegRange: [0,1],
  //   sideMode: 'alternate', // random | left | right | alternate
  //   depthScale: 0.7,
  //   minSpawnSpacingT: 0,
  //   maxSpawnAttemptsPerChild: 80,
  //   maxTotalBranches: 500,
  // },

  offshoot: {
    enabled: true,
    deterministic: true,
    maxDepth: 1,
    countRange: [0, 10],
    spawnTMin: 0.01,
    spawnTMax: 0.96,
    biasExponent: 1.6,
    angleDegRange: [45,45],
    sideMode: 'alternate', // random | left | right | alternate
    depthScale: 0.6,
    minSpawnSpacingT: 0.02,
    maxSpawnAttemptsPerChild: 800,
    maxTotalBranches: 200,
    pathGenerationMode: 'inherit', // inherit | random | manualTemplate
    templateIndexPool: [2], // e.g. [1, 4, 7] => randomly pick one for each offshoot
    centerBlockEnabled: true, // clip offshoot branches when they enter the center block area
     centerBlockHalfWidthPxVideoHeightRatio: 0.182, // X half-width as ratio of sampled video height
    centerBlockHalfHeightAbovePxVideoHeightRatio: 0.8, // Y extent above center as ratio of sampled video height
    centerBlockHalfHeightBelowPxVideoHeightRatio: 0.8,  // Y extent below center as ratio of sampled video height
  },

  branchGrowth: {
    enabled: true,
    mode: 'linearBySeedY', // simultaneous | linearBySeedY
    linearSweepDirection: 'up', // down (top->bottom) | up (bottom->top)
    linearSweepDurationSec: 3.25, // sweep time across root seed Y range
    speedMode: 'rate', // duration | rate
    totalDurationSec: 1.5,
    pixelsPerSecond: 160,
    growthEase: 'easeOut', // linear | easeIn | easeOut | easeInOut
    growthEasePower: 1,
    autoStart: true,
    requireFoliageLoadedBeforeStart: true,
    useOffscreenLayerCache: true,
  },

  frameJumpHotkeys: {
    enabled: true,
    timelineFps: 30,
    bindings: {
      1: 0,
      2: 130,
      3: 261,
      4: null,
      5: null,
      6: null,
    },
  },

  heroPlaybackGate: {
    enabled: true,
    frameRate: 30,
    introPauseFrame: 125,
    postButtonPauseFrame: 261,
    growthStartFrame: 253,
    pauseGuardFrames: 2,
    monitorUseVideoFrameCallback: true,
    videoWiggle: {
      enabled: true,
      maxAngleDeg: 5.4,
      durationMs: 760,
      speedHz: 5.8,
      dampingStrength: 3.2,
      anchorOffsetXRatio: 0,
      anchorOffsetYRatio: 0,
      delayAfterIntroPauseMs: 0,
    },
    openButton: {
      centerXRatio: 0.498, // 49.8% of rendered video width
      centerYRatio: 0.7897135, // 78.97135% of rendered video height
      diameterRatio: 0.062, // 6.2% of rendered video size (min(width,height))
      hitMarginPercentOfButtonSize: 150, // 0..100 extra size percentage
    },
    openButtonDebug: {
      enabled: true,
      drawOnFrontLayer: true,
      showBaseButtonCircle: true,
      showPaddedHitCircle: true,
      baseStrokeStyle: 'rgba(35, 208, 140, 0.95)',
      baseFillStyle: 'rgba(35, 208, 140, 0.10)',
      hitStrokeStyle: 'rgba(255, 170, 80, 0.98)',
      hitFillStyle: 'rgba(255, 170, 80, 0.12)',
      lineWidthPx: 2,
    },
    openButtonArrow: {
      enabled: true,
      spritePath: './arrow_2.webp',
      centerXRatio: 0.498,
      centerYRatio: 0.42,
      sizeRatio: 0.19, // width ratio against rendered video min(width,height)
      appearAfterFrame: 90,
      maxOpacity: 1,
      fadeOutAfterOpenButtonClick: true,
      fadeOutDurationSec: 0.45,
    },
  },

  centerOverlayImage: {
    enabled: true,
    spritePath: './test_page2.webp',
    scale: 0.25,
    offsetXPx: 0,
    offsetYPx: -80,
    displayAfterFrame: 255,
    maxOpacity: 1,
    fadeInEnabled: true,
    fadeInDurationSec: 0.45,
  },

  floralResponsiveScale: {
    enabled: true,
    // [viewportWidthCssPx, scaleFactor]
    points: [
      [390, 0.62],
      [768, 0.78],
      [1024, 0.9],
      [1366, 1.0],
    ],
    globalMultiplier: 1.5, // global floral size multiplier (applies to leaves + flowers)
    pointerModifierEnabled: true,
    pointerCoarseMultiplier: 0.95, // touch-first devices
    pointerFineMultiplier: 1.0, // mouse/trackpad devices
    pointerNoneMultiplier: 1.0,
    pointerUnknownMultiplier: 1.0,
    dprModifierEnabled: false,
    dprBaseline: 2,
    dprStrength: 0.14, // mild; > baseline shrinks slightly, < baseline grows slightly
    dprMultiplierClamp: [0.92, 1.08],
    landscapeModifierEnabled: true,
    landscapeMultiplier: 3.0, // applied only when viewportWidth > viewportHeight
    finalScaleClamp: [0.25, 10],
  },

  overlayWrap: {
    enabled: true,
    animationOnly: false,
    centerHalfWidthPxFromVideoEnabled: true,
    centerHalfWidthPxVideoHeightRatio: 0.187760416667, // 16.2760416667% of rendered hero video height
    centerHalfWidthPxVideoHeightRatioBottom: 0.21, // second width ratio used below the switch Y
    centerHalfWidthSwitchYVideoHeightRatio: 0.78, // switch Y as % of initially sampled video height (0..1 or 0..100)
    centerHalfWidthPx: 50, // fallback when video size is unavailable
    skipHiddenBackDrawEnabled: false,
    showCenterBandOverlay: false,
    centerBandOverlayFill: 'rgba(255, 95, 95, 0.16)',
    centerBandOverlayStroke: 'rgba(255, 95, 95, 0.85)',
    centerBandOverlayLineWidth: 1.5,
  },

  motion: {
    swayMode: 'influence', // always | influence
    maxSwayFps: 24, // <=0 disables cap for interaction-only render loop
    leafViewportCullingEnabled: true,
    flowerViewportCullingEnabled: true,
    swayFastPathEnabled: true,
    swayPerfLogEnabled: false,
  },

  flowers: {
    enabled: true,
    renderer: 'pixi', // pixi | canvas
    pixiEnabled: true,
    baked: {
      enabled: false,
      manifestPath: './flowers/flowers_atlas_manifest_master.json',
      fallbackToLive: false,
      allowFilenameFallback: true,
      forceCanvasRenderer: true,
      playbackFps: 0, // 0 = use FPS from manifest
      playbackSpeedMultiplier: 1.6, // >1 speeds up baked motion cycle playback
      neutralFrameIndex: null, // null = use neutral index from manifest
      frameInterpolationEnabled: false, // when true: nearest-frame interpolation (no alpha cross-fade)
      logEnabled: false,
    },
    performanceProfile: 'auto', // auto | desktop | mobile
    autoProfile: {
      mobileMaxHardwareConcurrency: 6,
      mobileMinDevicePixelRatio: 2,
      mobileMaxViewportWidth: 1024,
      influenceDynamicCapRange: [14, 20], // [min, max] chosen by device budget
      influenceNoPointerFallBoostRange: [3.0, 4.0], // [min, max]
      mouseSpeedSwayAffectRange: [0.1, 0.2], // [min, max]
      interactionRadiusScaleRange: [0.82, 1.0], // [min, max] multiplier on swayInteractionRadiusFactor
      minSwayFallSpeed: 1.5,
    },
    assignmentMode: 'mixed', // single | mixed
    singleType: 'lily',
    mixRatios: {

      lily: 1,
      blue: 1,
    },
    endpointDirectionTailLengthPx: 26,
    endpointDirectionSampleCount: 5,
    drawSize: 67,
    swayInteractionRadiusFactor: 3.1,
    swayRiseSpeed: 5.5,
    swayFallSpeed: 0.5,
    swayEpsilon: 0.0008,
    mouseSpeedSwayAffect: 0.7,
    influenceDynamicCapEnabled: true,
    influenceDynamicCap: 28,
    influenceNoPointerFallBoost: 1.2,
    influenceJumpCountsTowardCap: true,
    alwaysAnimatedCacheEnabled: true,
    alwaysAnimatedCacheFps: 12,
    swaySpriteDebugEnabled: false,
    swaySpriteDebugFrameStep: 1,
    blueSwayRotateAroundPetalOrigin: false,
    blueJumpRotateAroundPetalOrigin: true,
    swayJumpRotateAroundPetalOrigin: true,
    jumpEnabled: true,
    jumpInteractionRadiusFactor: 1.4,
    jumpStrengthDeg: 15,
    jumpAttackSpeedDegPerSec: 60,
    jumpReturnSpeedDegPerSec: 55,
    jumpDistanceExponent: 1,
    jumpJitterDeg: 30,
    jumpEpsilonDeg: 0.5,
    backfacing: false,
    petalToggleAnimationDurationSec: 0.4,
    petalToggleAnimationEasePower: 1,
    petalToggleOpenBounceAmount: 0.6,
    petalToggleOpenBounceOscillations: 1,
    petalToggleSpriteSwapProgress: 0.97,
    petalToggleEdgePairFlipEnabled: false,
    petalToggleEdgePairFlipBackProgress: 0.67,
    petalToggleEdgePairUseInnerSpritesEnabled: true,
    petalTogglePairSpeedDisparityEnabled: true,
    petalTogglePairSpeedStep: 0.1,
    petalTogglePairSpeedCurve: 0,
    performance: {
      activeLayerCacheEnabled: true,
      logEnabled: false,
      logIntervalMs: 1000,
    },
    types: {
      lily: {
        method: 'sweep3', // legacy | sweep | sweep2 | sweep3
        spritePath: './lily_sprite.webp',
        spriteCellWidth: 44,
        spriteCellHeight: 44,
        spriteScale: 8.3333333,
        spriteCols: 8,
        spriteRows: 6,
        spriteRow: 1,
        petalCountRange: [8, 8],
        alignToBranchDirection: true,
        alignmentDamping: 0.3,
        petalBaseCenterDeg: 50,
        petalSpreadDeg: 70,
        displacementSpace: 'flower', // flower | screen
        stamenRowMode: 'fixedRow', // petalRow | fixedRow
        stamenFixedRow: 1, // 1-based row
        stamenCount: 2, // total stamens per flower
        stamenAdditionalMode: 'rowList', // randomRows | rowList
        stamenRowList: [2,3,4,5,6,7,8], // 1-based rows used when stamenAdditionalMode='rowList'
        closedUseMiddlePetalSprite: true, // if true, closed lilies use the closed-lily sheet (random variant per flower)
        closedSpritePath: './closed_lily.webp',
        closedSpriteCols: 8,
        closedSpriteRows: 1,
        closedSpriteScale: 4.1590909091,
        pairRotationDegByRowPair: {
          1: { 1: 20, 2: 13, 3: 30},
          2: { 1: 15, 2: 10, 3: 48 },
          3: { 1: 15, 2: 20, 3: 60 },
          4: { 1: 10, 2: 10, 3: 45 },
          5: { 1: 10, 2: 15, 3: 30 },
          6: { 1: 20, 2: 10, 3: 70 },
          7: { 1: 0, 2: 0, 3: 0 },
          8: { 1: 0, 2: 0, 3: 0 },
        },
        pairDisplacementYByRowPair: {
          1: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 5, left: 5 } },
          2: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 10, left: 12 } },
          3: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 2, left: 5 } },
          4: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 4, left: 0 } },
          5: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
          6: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 13, left: 10 } },
          7: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
          8: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
        },
        pairDisplacementXByRowPair: {
          1: { 1: { right: 0, left: -5 }, 2: { right: 0, left: 0 }, 3: { right: -5, left: -5 } },
          2: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 5, left: 3 } },
          3: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 6, left: 9 } },
          4: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
          5: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
          6: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 5, left: 7 } },
          7: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
          8: { 1: { right: 0, left: 0 }, 2: { right: 0, left: 0 }, 3: { right: 0, left: 0 } },
        },
        hoverAmplitudeDegRange: [2, 12],
        hoverSpeedRange: [2.2, 4.2],
      },
      blue: {
        spritePath: './blue_sprite_2_upscaled.webp',
        spritePathPool: [
          './blue_sprite_2.webp','./blue_sprite_1.webp','./blue_sprite_3.webp', './blue_sprite.webp',
          './blue_sprite_2.webp'

          // './blue_sprite_4.2.webp', './blue_sprite_5.webp'
        ], // one full sprite sheet is picked per blue flower
        spriteCellWidth: 44,
        spriteCellHeight: 44,
        spriteScale: 8.3333333,
        spriteCols: 10,
        spriteRows: 10,
        baseSize: 50, // circle radius in px for point cloud generation
        density: 130, // fixed number of points per flower
        centerBiasExponent: 1, // larger = stronger center clustering
        pointDrawSize: 40,
        drawOrder: 'random', // outerFirst | random
        hoverAmplitudeDegRange: [2, 6],
        hoverSpeedRange: [2.2, 4.2],
      },
    },
  },

  leaves: {
    enabled: true,
    deterministic: true,
    spritePath: './leaves_new.webp',
    spriteCellWidth: 44,
    spriteCellHeight: 45.819,
    spriteScale: 8.3333333,
    spriteCols: 10,
    spriteRows: 8,
    spriteRowRange: [0, 2], // 1-based inclusive [min, max]
    drawSize: 30,
    drawSizeRange: [30,70], // [min, max]; overrides fixed drawSize when provided
    drawSizeBaseMultiplier: 0.1, // 1 at branch base, linearly blends to this value at branch tip
    drawSizeBaseMultiplierEaseIn: 0.1, // 0 = linear; closer to 1 delays size change until near the tip
    growthEnabled: true,
    growthMinScale: 0.05, // 0..1 fraction of final leaf drawSize
    growthDurationSec: 1, // time from minScale to full size
    growthEase: 'easeOut', // linear | easeIn | easeOut | easeInOut
    growthEasePower: 2, // easing curve strength
    swayEnabled: true,
    swayInteractionRadiusFactor: 2.1,
    swayRiseSpeed: 5.5,
    swayFallSpeed: 0.5,
    swayEpsilon: 0.0008,
    mouseSpeedSwayAffect: 0.7,
    swayAmplitudeDegRange: [0.8, 12.6],
    swaySpeedRange: [1.9, 2.8],
    countRange: [2, 10],
    spawnTMin: 0.01,
    spawnTMax: 0.5,
    spawnBiasMode: 'towardBase', // uniform | towardBase | towardTip
    spawnBiasExponent: 4, // >1 strengthens bias
    minSpawnSpacingT: 0.001,
    maxSpawnAttemptsPerLeaf: 1,
    sideMode: 'alternate', // random | left | right | alternate
    rotationAwayFromNormalDegRange: [0,80],
  },

  performance: {
    enabled: false,
    logIntervalMs: 1000,
  },

  debug: {
    // enabled: true,
    showStripBounds: false,
    showStripCenters: true,
    showPathOutline: true,
    showTangents: false,
    showNormals: false,
    showControlPoints: true,
    showControlCurve: true,
    pathSampleStep: 8,
    vectorSampleSpacing: 120,
  },
};

// Backward compatibility: `animation` now maps to `branchGrowth`.
CONFIG.animation = CONFIG.branchGrowth;
// Backward compatibility alias.
CONFIG.offshoots = CONFIG.offshoot;

// =========================
// 3) Runtime State
// =========================
const STATE = {
  dpr: window.devicePixelRatio || 1,
  viewportWidth: 0,
  viewportHeight: 0,
  pointerX: Number.NEGATIVE_INFINITY,
  pointerY: Number.NEGATIVE_INFINITY,
  pointerSpeedPxPerSec: 0,
  pointerLastSampleX: Number.NEGATIVE_INFINITY,
  pointerLastSampleY: Number.NEGATIVE_INFINITY,
  pointerLastSampleMs: 0,

  noiseInstance: null,
  stemImage: null,
  stemImageFlippedX: null,
  leafImage: null,
  openButtonArrowImage: null,
  openButtonArrowImagePath: '',
  openButtonArrowImagePendingPath: '',
  openButtonArrowImageLoadPromise: null,
  centerOverlayImagePath: '',
  centerOverlayImagePendingPath: '',
  centerOverlayImageLoadPromise: null,
  centerOverlayImageIsLoaded: false,
  centerOverlayImageFailedPath: '',
  centerOverlayImageVisibleSinceMs: 0,
  centerOverlayImageLastShouldBeVisible: false,
  flowerSystem: null,
  flowerInteractionRafId: null,
  flowerPerfLastLogMs: 0,

  branchGarden: null,
  branchEndpoints: [],
  lastSeedPacket: null,
  hasBootstrapped: false,
  foliageLoad: {
    videoReady: false,
    stemReady: false,
    leafReady: false,
    flowerReady: false,
    ready: false,
  },

  manualTemplateRegistryLoaded: false,
  manualTemplateRegistryTemplates: [],
  manualTemplateRegistryWarnings: [],

  branchGrowth: {
    rafId: null,
    running: false,
    startTimeMs: 0,
    elapsedSec: 0,
    globalRatePxPerSec: 0,
    criticalPathDistance: 0,
    maxCompletionSec: 0,
  },
  lastInteractionRenderMs: 0,
  nextInteractionFrameDueMs: 0,

  performance: {
    intervalStartMs: 0,
    lastLogMs: 0,
    intervalFrames: 0,
    intervalFrameMs: 0,
    intervalSamples: 0,
    intervalActiveBranches: 0,
    intervalCacheBuilds: 0,
    intervalCacheBuildMs: 0,
    intervalCacheReuses: 0,
    intervalLeafDrawMs: 0,
    intervalStemDrawMs: 0,
    intervalFlowerDrawMs: 0,
    intervalFlowerUpdateMs: 0,
    intervalLeavesDrawn: 0,
    intervalLeavesCulled: 0,
    intervalFlowersDrawn: 0,
    intervalFlowersCulled: 0,
    intervalBackSkippedStems: 0,
    intervalBackSkippedLeaves: 0,
    intervalBackSkippedFlowers: 0,
    intervalCacheMissReasons: {
      invalid: 0,
      pathData: 0,
      image: 0,
      brush: 0,
    },
    lastSummary: null,
  },

  filteredStemTextureCache: new WeakMap(),

  completedLayer: {
    canvas: null,
    ctx: null,
    committedBranchIds: new Set(),
    committedStemEndByBranchId: new Map(),
    leavesConfigKey: '',
  },
  completedLayerBack: {
    canvas: null,
    ctx: null,
    committedBranchIds: new Set(),
    committedStemEndByBranchId: new Map(),
    leavesConfigKey: '',
  },
  completedLayerFront: {
    canvas: null,
    ctx: null,
    committedBranchIds: new Set(),
    committedStemEndByBranchId: new Map(),
    leavesConfigKey: '',
  },
  leafOverlayCache: {
    valid: false,
    layoutKey: '',
    branchCount: 0,
    branchPathRefs: [],
    leaves: [],
  },
  overlayWrapPromotion: new Map(),
  lastFloralResponsiveScaleFactor: null,
  lastAppliedGlobalFoliageScale: null,
  heroVideoReferenceRect: null,
  heroVideoReferenceRectLocked: false,
  heroPlaybackGate: {
    monitorRafId: null,
    monitorVideoFrameCallbackId: null,
    stage: 'idle', // idle | introPlaying | waitingForOpenButton | postOpenButtonPlaying | postOpenButtonPaused
    growthFrameReached: false,
    growthStarted: false,
    growthAnimationEnabledByConfig: false,
    openButtonClickedAtMs: null,
    openButtonArrowRenderedPresence: false,
    openButtonArrowLastRenderMs: 0,
    videoWiggleRafId: null,
    videoWiggleDelayTimerId: null,
    videoWiggleActive: false,
  },
};

// Backward compatibility: `animation` now maps to `branchGrowth`.
STATE.animation = STATE.branchGrowth;

// =========================
// 4) Small Utilities
// =========================
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveGlobalFoliageScale() {
  const numeric = Number(CONFIG.globalFoliageScale);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(0.01, numeric);
}

function syncGlobalFoliageScaleIfNeeded() {
  const nextScale = resolveGlobalFoliageScale();
  if (!Number.isFinite(STATE.lastAppliedGlobalFoliageScale)) {
    STATE.lastAppliedGlobalFoliageScale = nextScale;
    return false;
  }
  if (Math.abs(nextScale - STATE.lastAppliedGlobalFoliageScale) <= 1e-8) {
    return false;
  }
  STATE.lastAppliedGlobalFoliageScale = nextScale;
  if (!STATE.branchGarden) {
    return false;
  }
  STATE.branchGarden.rebuildBranches({ regenerateRoots: true, resetRootTimeCursor: true });
  return true;
}

function positiveModulo(value, mod) {
  if (mod === 0) {
    return 0;
  }
  return ((value % mod) + mod) % mod;
}

function getModifierStepMultiplier(event) {
  if (!event || typeof event !== 'object') {
    return 1;
  }
  const hasShift = event.shiftKey === true;
  const hasCmdOrCtrl = event.metaKey === true || event.ctrlKey === true;
  if (hasShift && hasCmdOrCtrl) {
    return 100;
  }
  if (hasShift) {
    return 10;
  }
  return 1;
}

function normalizeTemplateNoiseHighpassWindow(value, fallback = 7) {
  const fallbackNumeric = Number.isFinite(fallback) ? fallback : 7;
  const numericValue = Number.isFinite(value) ? value : fallbackNumeric;
  let windowSize = Math.round(numericValue);
  windowSize = clamp(windowSize, 3, 51);
  if (windowSize % 2 === 0) {
    windowSize = windowSize + 1 <= 51 ? windowSize + 1 : windowSize - 1;
  }
  return windowSize;
}

function normalizeTemplateNoiseDirectionalBias(value, fallback = 0) {
  const fallbackNumeric = Number.isFinite(fallback) ? fallback : 0;
  const numericValue = Number.isFinite(value) ? value : fallbackNumeric;
  return clamp(numericValue, 0, 1);
}

function resolvePathNoiseAxisAbsFlags(pathGenerationConfig = CONFIG.pathGeneration || {}) {
  const useAbsoluteNoiseX = pathGenerationConfig.useAbsoluteNoiseX !== false;
  const useAbsoluteNoiseY = pathGenerationConfig.useAbsoluteNoiseY !== false;
  const absoluteNoiseXRatio = clamp(
    Number.isFinite(Number(pathGenerationConfig.absoluteNoiseXRatio))
      ? Number(pathGenerationConfig.absoluteNoiseXRatio)
      : 0,
    0,
    1,
  );
  const absoluteNoiseYRatio = clamp(
    Number.isFinite(Number(pathGenerationConfig.absoluteNoiseYRatio))
      ? Number(pathGenerationConfig.absoluteNoiseYRatio)
      : 0,
    0,
    1,
  );
  return {
    useAbsoluteNoiseX,
    useAbsoluteNoiseY,
    absoluteNoiseXRatio,
    absoluteNoiseYRatio,
    xAbsBlend: useAbsoluteNoiseX ? 1 : absoluteNoiseXRatio,
    yAbsBlend: useAbsoluteNoiseY ? 1 : absoluteNoiseYRatio,
  };
}

function blendSignedNoiseWithAbsolute(sample, absoluteBlend = 0) {
  const signed = Number.isFinite(sample) ? sample : 0;
  const blend = clamp(Number.isFinite(absoluteBlend) ? absoluteBlend : 0, 0, 1);
  if (blend <= 0) {
    return signed;
  }
  if (blend >= 1) {
    return Math.abs(signed);
  }
  return signed * (1 - blend) + Math.abs(signed) * blend;
}

function normalize(vec) {
  const len = Math.hypot(vec.x, vec.y);
  if (len < 1e-8) {
    return { x: 1, y: 0 };
  }
  return { x: vec.x / len, y: vec.y / len };
}

function fallbackNoise2(x, y) {
  return Math.sin(x * 12.9898 + y * 78.233);
}

function getNoiseInstance() {
  if (typeof Noise !== 'function') {
    return null;
  }
  if (!STATE.noiseInstance) {
    STATE.noiseInstance = new Noise(Math.random());
  }
  return STATE.noiseInstance;
}

function sampleNoise2(x, y) {
  const instance = getNoiseInstance();
  if (instance) {
    return instance.perlin2(x, y);
  }
  return fallbackNoise2(x, y);
}

function rotateVector(vec, angleRadians) {
  const c = Math.cos(angleRadians);
  const s = Math.sin(angleRadians);
  return {
    x: vec.x * c - vec.y * s,
    y: vec.x * s + vec.y * c,
  };
}

function rotatePointsAroundAnchor(points, anchorX, anchorY, angleRadians) {
  if (!Array.isArray(points) || points.length <= 1 || !Number.isFinite(angleRadians)) {
    return points;
  }
  if (Math.abs(angleRadians) <= 1e-10) {
    return points;
  }
  const rotated = points.slice();
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    const local = rotateVector(
      {
        x: point.x - anchorX,
        y: point.y - anchorY,
      },
      angleRadians,
    );
    rotated[i] = {
      x: anchorX + local.x,
      y: anchorY + local.y,
    };
  }
  return rotated;
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

function sampleFloatRange(range, rng = Math.random) {
  const min = range[0];
  const max = range[1];
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  if (max <= min) {
    return min;
  }
  return min + (max - min) * rng();
}

function sampleIntRange(range, rng = Math.random) {
  const min = Math.ceil(range[0]);
  const max = Math.floor(range[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  if (max <= min) {
    return min;
  }
  return Math.floor(rng() * (max - min + 1)) + min;
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

function resolveRangeValue(rangeCandidate, fixedCandidate, fallbackValue, fallbackMin, fallbackMax) {
  if (rangeCandidate !== undefined) {
    return normalizeRangeInput(rangeCandidate, fallbackMin, fallbackMax);
  }
  if (Number.isFinite(fixedCandidate)) {
    return [fixedCandidate, fixedCandidate];
  }
  return normalizeRangeInput(fallbackValue, fallbackMin, fallbackMax);
}

function normalizeOffshootInput(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return { ...value };
}

function normalizeAddBranchOptions(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const hasStructuredOptions = (
    value.offshoot !== undefined ||
    value.manualTemplateIndex !== undefined ||
    value.stableKey !== undefined
  );

  if (hasStructuredOptions) {
    return {
      ...value,
      offshoot: normalizeOffshootInput(value.offshoot),
    };
  }
  return {
    offshoot: normalizeOffshootInput(value),
  };
}

function createBranchDefDedupeKey(def) {
  if (!def || !Number.isFinite(def.x) || !Number.isFinite(def.y)) {
    return '';
  }
  const direction = Number.isFinite(def.direction) && def.direction >= 0 ? 1 : -1;
  const x = def.x.toFixed(4);
  const y = def.y.toFixed(4);
  return `${x}|${y}|${direction}`;
}

function getSideSign(mode, index, rng) {
  if (mode === 'left') {
    return -1;
  }
  if (mode === 'right') {
    return 1;
  }
  if (mode === 'alternate') {
    return index % 2 === 0 ? 1 : -1;
  }
  return rng() < 0.5 ? -1 : 1;
}

function sanitizeSideMode(value) {
  if (value === 'left' || value === 'right' || value === 'alternate' || value === 'random') {
    return value;
  }
  return 'random';
}

function sanitizeLeafSpawnBiasMode(value) {
  if (value === 'uniform' || value === 'towardBase' || value === 'towardTip') {
    return value;
  }
  return 'uniform';
}

function sanitizeLeafGrowthEaseMode(value) {
  if (value === 'linear' || value === 'easeIn' || value === 'easeOut' || value === 'easeInOut') {
    return value;
  }
  return 'easeOut';
}

function sanitizeSwayMode(value) {
  if (value === 'always' || value === 'influence') {
    return value;
  }
  return 'always';
}

function resolveGlobalSwayMode() {
  const motionConfig = isPlainObjectLiteral(CONFIG.motion) ? CONFIG.motion : {};
  return sanitizeSwayMode(motionConfig.swayMode);
}

function resolveGlobalMaxSwayFps() {
  const motionConfig = isPlainObjectLiteral(CONFIG.motion) ? CONFIG.motion : {};
  const fps = Number(motionConfig.maxSwayFps);
  if (!Number.isFinite(fps) || fps <= 0) {
    return 0;
  }
  return Math.max(1, fps);
}

function isLeafViewportCullingEnabled() {
  const motionConfig = isPlainObjectLiteral(CONFIG.motion) ? CONFIG.motion : {};
  return motionConfig.leafViewportCullingEnabled !== false;
}

function isFlowerViewportCullingEnabled() {
  const motionConfig = isPlainObjectLiteral(CONFIG.motion) ? CONFIG.motion : {};
  return motionConfig.flowerViewportCullingEnabled !== false;
}

function isSwayFastPathEnabled() {
  const motionConfig = isPlainObjectLiteral(CONFIG.motion) ? CONFIG.motion : {};
  return motionConfig.swayFastPathEnabled !== false;
}

function isSwayPerfLogEnabled() {
  const motionConfig = isPlainObjectLiteral(CONFIG.motion) ? CONFIG.motion : {};
  return motionConfig.swayPerfLogEnabled === true;
}

function buildHeroVideoReferenceRectSnapshot() {
  const viewportWidth = Number.isFinite(STATE.viewportWidth) && STATE.viewportWidth > 0
    ? STATE.viewportWidth
    : (Number.isFinite(window.innerWidth) && window.innerWidth > 0 ? window.innerWidth : 0);
  const viewportHeight = Number.isFinite(STATE.viewportHeight) && STATE.viewportHeight > 0
    ? STATE.viewportHeight
    : (Number.isFinite(window.innerHeight) && window.innerHeight > 0 ? window.innerHeight : 0);
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  let width = 0;
  let height = 0;
  const intrinsicWidth = Number(video && video.videoWidth);
  const intrinsicHeight = Number(video && video.videoHeight);
  if (Number.isFinite(intrinsicWidth) && intrinsicWidth > 0 && Number.isFinite(intrinsicHeight) && intrinsicHeight > 0) {
    // Matches CSS sizing: height fills viewport, width follows intrinsic aspect ratio.
    height = viewportHeight;
    width = height * (intrinsicWidth / intrinsicHeight);
  } else if (
    video
    && Number.isFinite(video.clientWidth)
    && video.clientWidth > 0
    && Number.isFinite(video.clientHeight)
    && video.clientHeight > 0
  ) {
    width = Number(video.clientWidth);
    height = Number(video.clientHeight);
  } else if (video && typeof video.getBoundingClientRect === 'function') {
    const rect = video.getBoundingClientRect();
    if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
      width = Math.max(0, rect.width);
      height = Math.max(0, rect.height);
    }
  }

  if (width <= 0 || height <= 0) {
    return null;
  }

  const centerX = viewportWidth * 0.5;
  const centerY = viewportHeight * 0.5;
  const left = centerX - (width * 0.5);
  const top = centerY - (height * 0.5);
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function refreshHeroVideoReferenceRect(options = null) {
  const safeOptions = isPlainObjectLiteral(options) ? options : {};
  const force = safeOptions.force === true;
  if (STATE.heroVideoReferenceRectLocked === true && !force) {
    return STATE.heroVideoReferenceRect;
  }
  const snapshot = buildHeroVideoReferenceRectSnapshot();
  STATE.heroVideoReferenceRect = snapshot
    ? { ...snapshot }
    : null;
  if (STATE.heroVideoReferenceRect && STATE.heroVideoReferenceRect.width > 0 && STATE.heroVideoReferenceRect.height > 0) {
    STATE.heroVideoReferenceRectLocked = true;
  } else if (force) {
    STATE.heroVideoReferenceRectLocked = false;
  }
  return STATE.heroVideoReferenceRect;
}

function resolveHeroVideoRenderedHeightPx() {
  const rect = getHeroVideoRenderedRect();
  if (rect && Number.isFinite(rect.height) && rect.height > 0) {
    return rect.height;
  }
  if (Number.isFinite(STATE.viewportHeight) && STATE.viewportHeight > 0) {
    return STATE.viewportHeight;
  }
  if (Number.isFinite(window.innerHeight) && window.innerHeight > 0) {
    return window.innerHeight;
  }
  return 0;
}

function normalizeRatioOrPercentValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Math.max(0, fallback);
  }
  const normalized = numeric > 1 ? (numeric / 100) : numeric;
  return Math.max(0, normalized);
}

function resolveOffshootCenterBlockArea(configCandidate = CONFIG.offshoot) {
  const safeConfig = isPlainObjectLiteral(configCandidate) ? configCandidate : {};
  const enabled = safeConfig.centerBlockEnabled === true;
  const videoRect = getHeroVideoRenderedRect();
  const videoHeightPx = (
    videoRect
    && Number.isFinite(videoRect.height)
    && videoRect.height > 0
  )
    ? videoRect.height
    : resolveHeroVideoRenderedHeightPx();
  const centerX = (
    videoRect
    && Number.isFinite(videoRect.left)
    && Number.isFinite(videoRect.width)
    && videoRect.width > 0
  )
    ? (videoRect.left + videoRect.width * 0.5)
    : (STATE.viewportWidth * 0.5);
  const centerY = (
    videoRect
    && Number.isFinite(videoRect.top)
    && Number.isFinite(videoRect.height)
    && videoRect.height > 0
  )
    ? (videoRect.top + videoRect.height * 0.5)
    : (STATE.viewportHeight * 0.5);

  const halfWidthRatioSource = (
    safeConfig.centerBlockHalfWidthPxVideoHeightRatio !== undefined
      ? safeConfig.centerBlockHalfWidthPxVideoHeightRatio
      : (
        safeConfig.centerHalfWidthPxHeightRatio !== undefined
          ? safeConfig.centerHalfWidthPxHeightRatio
          : safeConfig.centerHaldWidthPxHeightRatio
      )
  );
  const halfWidthRatio = normalizeRatioOrPercentValue(halfWidthRatioSource, 0);
  const halfHeightAboveRatioSource = (
    safeConfig.centerBlockHalfHeightAbovePxVideoHeightRatio !== undefined
      ? safeConfig.centerBlockHalfHeightAbovePxVideoHeightRatio
      : safeConfig.centerHalfHeightAbovePxHeightRatio
  );
  const halfHeightBelowRatioSource = (
    safeConfig.centerBlockHalfHeightBelowPxVideoHeightRatio !== undefined
      ? safeConfig.centerBlockHalfHeightBelowPxVideoHeightRatio
      : safeConfig.centerHalfHeightBelowPxHeightRatio
  );
  const halfHeightAboveRatio = normalizeRatioOrPercentValue(halfHeightAboveRatioSource, 0);
  const halfHeightBelowRatio = normalizeRatioOrPercentValue(
    halfHeightBelowRatioSource,
    halfHeightAboveRatio,
  );

  const safeVideoHeight = Number.isFinite(videoHeightPx) && videoHeightPx > 0 ? videoHeightPx : 0;
  const halfWidthPx = safeVideoHeight * halfWidthRatio;
  const halfHeightAbovePx = safeVideoHeight * halfHeightAboveRatio;
  const halfHeightBelowPx = safeVideoHeight * halfHeightBelowRatio;

  return {
    enabled,
    centerX,
    centerY,
    halfWidthPx,
    halfHeightAbovePx,
    halfHeightBelowPx,
    leftX: centerX - halfWidthPx,
    rightX: centerX + halfWidthPx,
    topY: centerY - halfHeightAbovePx,
    bottomY: centerY + halfHeightBelowPx,
  };
}

function isPointInsideOffshootCenterBlock(point, area) {
  if (
    !point
    || !area
    || area.enabled !== true
    || !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
    || !Number.isFinite(area.leftX)
    || !Number.isFinite(area.rightX)
    || !Number.isFinite(area.topY)
    || !Number.isFinite(area.bottomY)
  ) {
    return false;
  }
  return (
    point.x >= area.leftX
    && point.x <= area.rightX
    && point.y >= area.topY
    && point.y <= area.bottomY
  );
}

function resolveHeroPlaybackGateConfig(configCandidate = CONFIG.heroPlaybackGate) {
  const safeConfig = isPlainObjectLiteral(configCandidate) ? configCandidate : {};
  const safeLegacyButtonConfig = isPlainObjectLiteral(safeConfig.button) ? safeConfig.button : {};
  const safeOpenButtonConfig = isPlainObjectLiteral(safeConfig.openButton)
    ? safeConfig.openButton
    : safeLegacyButtonConfig;
  const safeOpenButtonDebugConfig = isPlainObjectLiteral(safeConfig.openButtonDebug)
    ? safeConfig.openButtonDebug
    : {};
  const safeOpenButtonArrowConfig = isPlainObjectLiteral(safeConfig.openButtonArrow)
    ? safeConfig.openButtonArrow
    : {};
  const safeVideoWiggleConfig = isPlainObjectLiteral(safeConfig.videoWiggle)
    ? safeConfig.videoWiggle
    : {};
  const frameRate = Number.isFinite(Number(safeConfig.frameRate))
    ? Math.max(1, Number(safeConfig.frameRate))
    : 30;
  const introPauseFrame = Number.isFinite(Number(safeConfig.introPauseFrame))
    ? Math.max(0, Math.floor(Number(safeConfig.introPauseFrame)))
    : 150;
  const postButtonPauseFrameRaw = Number.isFinite(Number(safeConfig.postButtonPauseFrame))
    ? Math.max(0, Math.floor(Number(safeConfig.postButtonPauseFrame)))
    : 285;
  const growthStartFrameRaw = Number.isFinite(Number(safeConfig.growthStartFrame))
    ? Math.max(0, Math.floor(Number(safeConfig.growthStartFrame)))
    : 151;
  const pauseGuardFrames = Number.isFinite(Number(safeConfig.pauseGuardFrames))
    ? clamp(Number(safeConfig.pauseGuardFrames), 0, 12)
    : 2;
  const monitorUseVideoFrameCallback = safeConfig.monitorUseVideoFrameCallback !== false;
  const postButtonPauseFrame = Math.max(introPauseFrame, postButtonPauseFrameRaw);
  const growthStartFrame = Math.min(growthStartFrameRaw, postButtonPauseFrame);
  const openButton = {
    centerXRatio: clamp(
      Number.isFinite(Number(safeOpenButtonConfig.centerXRatio)) ? Number(safeOpenButtonConfig.centerXRatio) : 0.498,
      0,
      1,
    ),
    centerYRatio: clamp(
      Number.isFinite(Number(safeOpenButtonConfig.centerYRatio)) ? Number(safeOpenButtonConfig.centerYRatio) : 0.7897135,
      0,
      1,
    ),
    diameterRatio: Math.max(
      0,
      Number.isFinite(Number(safeOpenButtonConfig.diameterRatio)) ? Number(safeOpenButtonConfig.diameterRatio) : 0.062,
    ),
    hitMarginPercentOfButtonSize: clamp(
      Number.isFinite(Number(safeOpenButtonConfig.hitMarginPercentOfButtonSize))
        ? Number(safeOpenButtonConfig.hitMarginPercentOfButtonSize)
        : 0,
      0,
      100,
    ),
  };
  const openButtonDebug = {
    enabled: safeOpenButtonDebugConfig.enabled === true,
    drawOnFrontLayer: safeOpenButtonDebugConfig.drawOnFrontLayer !== false,
    showBaseButtonCircle: safeOpenButtonDebugConfig.showBaseButtonCircle !== false,
    showPaddedHitCircle: safeOpenButtonDebugConfig.showPaddedHitCircle !== false,
    baseStrokeStyle: (
      typeof safeOpenButtonDebugConfig.baseStrokeStyle === 'string'
      && safeOpenButtonDebugConfig.baseStrokeStyle.length > 0
    )
      ? safeOpenButtonDebugConfig.baseStrokeStyle
      : 'rgba(35, 208, 140, 0.95)',
    baseFillStyle: (
      typeof safeOpenButtonDebugConfig.baseFillStyle === 'string'
      && safeOpenButtonDebugConfig.baseFillStyle.length > 0
    )
      ? safeOpenButtonDebugConfig.baseFillStyle
      : 'rgba(35, 208, 140, 0.10)',
    hitStrokeStyle: (
      typeof safeOpenButtonDebugConfig.hitStrokeStyle === 'string'
      && safeOpenButtonDebugConfig.hitStrokeStyle.length > 0
    )
      ? safeOpenButtonDebugConfig.hitStrokeStyle
      : 'rgba(255, 170, 80, 0.98)',
    hitFillStyle: (
      typeof safeOpenButtonDebugConfig.hitFillStyle === 'string'
      && safeOpenButtonDebugConfig.hitFillStyle.length > 0
    )
      ? safeOpenButtonDebugConfig.hitFillStyle
      : 'rgba(255, 170, 80, 0.12)',
    lineWidthPx: Number.isFinite(Number(safeOpenButtonDebugConfig.lineWidthPx))
      ? Math.max(0.25, Number(safeOpenButtonDebugConfig.lineWidthPx))
      : 2,
  };
  const openButtonArrow = {
    enabled: safeOpenButtonArrowConfig.enabled !== false,
    spritePath: (
      typeof safeOpenButtonArrowConfig.spritePath === 'string'
      && safeOpenButtonArrowConfig.spritePath.trim().length > 0
    )
      ? safeOpenButtonArrowConfig.spritePath.trim()
      : './arrow_1.webp',
    centerXRatio: clamp(
      Number.isFinite(Number(safeOpenButtonArrowConfig.centerXRatio))
        ? Number(safeOpenButtonArrowConfig.centerXRatio)
        : openButton.centerXRatio,
      0,
      1,
    ),
    centerYRatio: clamp(
      Number.isFinite(Number(safeOpenButtonArrowConfig.centerYRatio))
        ? Number(safeOpenButtonArrowConfig.centerYRatio)
        : openButton.centerYRatio,
      0,
      1,
    ),
    sizeRatio: Math.max(
      0,
      Number.isFinite(Number(safeOpenButtonArrowConfig.sizeRatio))
        ? Number(safeOpenButtonArrowConfig.sizeRatio)
        : 0.11,
    ),
    appearAfterFrame: Number.isFinite(Number(safeOpenButtonArrowConfig.appearAfterFrame))
      ? Math.max(0, Math.floor(Number(safeOpenButtonArrowConfig.appearAfterFrame)))
      : 0,
    maxOpacity: clamp(
      Number.isFinite(Number(safeOpenButtonArrowConfig.maxOpacity))
        ? Number(safeOpenButtonArrowConfig.maxOpacity)
        : 1,
      0,
      1,
    ),
    fadeOutAfterOpenButtonClick: safeOpenButtonArrowConfig.fadeOutAfterOpenButtonClick !== false,
    fadeOutDurationSec: Number.isFinite(Number(safeOpenButtonArrowConfig.fadeOutDurationSec))
      ? Math.max(0, Number(safeOpenButtonArrowConfig.fadeOutDurationSec))
      : 0.45,
  };
  const videoWiggle = {
    enabled: safeVideoWiggleConfig.enabled !== false,
    maxAngleDeg: Number.isFinite(Number(safeVideoWiggleConfig.maxAngleDeg))
      ? Math.max(0, Number(safeVideoWiggleConfig.maxAngleDeg))
      : 2.4,
    durationMs: Number.isFinite(Number(safeVideoWiggleConfig.durationMs))
      ? Math.max(0, Number(safeVideoWiggleConfig.durationMs))
      : 760,
    speedHz: Number.isFinite(Number(safeVideoWiggleConfig.speedHz))
      ? Math.max(0, Number(safeVideoWiggleConfig.speedHz))
      : 5.8,
    dampingStrength: Number.isFinite(Number(safeVideoWiggleConfig.dampingStrength))
      ? Math.max(0, Number(safeVideoWiggleConfig.dampingStrength))
      : 3.2,
    anchorOffsetXRatio: Number.isFinite(Number(safeVideoWiggleConfig.anchorOffsetXRatio))
      ? Number(safeVideoWiggleConfig.anchorOffsetXRatio)
      : 0,
    anchorOffsetYRatio: Number.isFinite(Number(safeVideoWiggleConfig.anchorOffsetYRatio))
      ? Number(safeVideoWiggleConfig.anchorOffsetYRatio)
      : 0,
    delayAfterIntroPauseMs: Number.isFinite(Number(safeVideoWiggleConfig.delayAfterIntroPauseMs))
      ? Number(safeVideoWiggleConfig.delayAfterIntroPauseMs)
      : 120,
  };

  return {
    enabled: safeConfig.enabled !== false,
    frameRate,
    introPauseFrame,
    postButtonPauseFrame,
    growthStartFrame,
    pauseGuardFrames,
    monitorUseVideoFrameCallback,
    videoWiggle,
    openButton,
    openButtonDebug,
    // Backward-compatible alias for any external callers still using gateConfig.button.
    button: openButton,
    openButtonArrow,
  };
}

function isFoliageReadyForGrowth() {
  if (CONFIG.branchGrowth.requireFoliageLoadedBeforeStart === false) {
    return true;
  }
  return Boolean(STATE.foliageLoad && STATE.foliageLoad.ready === true);
}

function setFoliageLoadReadyFlag(flagName, isReady) {
  const loadState = STATE.foliageLoad;
  if (!loadState || typeof flagName !== 'string' || !(flagName in loadState)) {
    return;
  }
  loadState[flagName] = Boolean(isReady);
  const nextReady = Boolean(loadState.stemReady && loadState.leafReady && loadState.flowerReady);
  const justBecameReady = nextReady && loadState.ready !== true;
  loadState.ready = nextReady;
  if (!justBecameReady) {
    return;
  }
  const gateConfig = resolveHeroPlaybackGateConfig();
  const currentFrame = getCurrentHeroVideoFrame(gateConfig);
  maybeStartGrowthAnimationFromHeroVideoFrame(currentFrame, gateConfig);
  if (STATE.branchGarden) {
    renderScene();
  }
}

function isInitialHeroVideoReadyForStartup() {
  if (!video) {
    return false;
  }
  const minReadyState = (
    typeof HTMLMediaElement !== 'undefined'
    && Number.isFinite(HTMLMediaElement.HAVE_CURRENT_DATA)
  )
    ? HTMLMediaElement.HAVE_CURRENT_DATA
    : 2;
  return Number.isFinite(video.readyState) && video.readyState >= minReadyState;
}

function waitForInitialHeroVideoReadyForStartup() {
  if (isInitialHeroVideoReadyForStartup()) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onReady = () => {
      if (!isInitialHeroVideoReadyForStartup()) {
        return;
      }
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to load initial hero video data.'));
    };
    const cleanup = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', onError);
    try {
      video.load();
    } catch (_error) {
      // Ignore load() errors and rely on normal media events.
    }
  });
}

function isHeroPlaybackGrowthStartBlocked(gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!isFoliageReadyForGrowth()) {
    return true;
  }
  const gateState = STATE.heroPlaybackGate;
  if (!gateConfig || gateConfig.enabled !== true || !gateState) {
    return false;
  }
  if (gateState.growthAnimationEnabledByConfig !== true) {
    return false;
  }
  return gateState.growthStarted !== true;
}

function getHeroVideoRenderedRect() {
  const cachedRect = STATE.heroVideoReferenceRect;
  if (
    cachedRect
    && Number.isFinite(cachedRect.width)
    && Number.isFinite(cachedRect.height)
    && cachedRect.width > 0
    && cachedRect.height > 0
  ) {
    return cachedRect;
  }
  const rect = refreshHeroVideoReferenceRect();
  if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
    return null;
  }
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return rect;
}

function getCurrentHeroVideoFrame(gateConfig = resolveHeroPlaybackGateConfig()) {
  const frameRate = gateConfig && Number.isFinite(Number(gateConfig.frameRate))
    ? Math.max(1, Number(gateConfig.frameRate))
    : 30;
  return Number.isFinite(video.currentTime)
    ? Math.max(0, video.currentTime * frameRate)
    : 0;
}

function getHeroGatePauseTargetFrame(stage, gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!gateConfig) {
    return null;
  }
  if (stage === 'introPlaying') {
    return gateConfig.introPauseFrame;
  }
  if (stage === 'postOpenButtonPlaying') {
    return gateConfig.postButtonPauseFrame;
  }
  return null;
}

function lockHeroVideoToFrame(targetFrame, gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!Number.isFinite(targetFrame) || targetFrame < 0 || !gateConfig) {
    return;
  }
  const frameRate = Number.isFinite(Number(gateConfig.frameRate))
    ? Math.max(1, Number(gateConfig.frameRate))
    : 30;
  const frameEpsilonSec = 0.5 / frameRate;
  let targetSec = Math.max(0, targetFrame / frameRate);
  if (Number.isFinite(video.duration) && video.duration > 0) {
    targetSec = clamp(targetSec, 0, video.duration);
  }
  const currentSec = Number(video.currentTime);
  if (Number.isFinite(currentSec) && Math.abs(currentSec - targetSec) <= frameEpsilonSec) {
    return;
  }
  try {
    video.currentTime = targetSec;
  } catch (_error) {
    // Ignore seek exceptions in constrained autoplay/mobile states.
  }
}

function requestOpenButtonArrowImageLoad(options = {}) {
  const safeOptions = isPlainObjectLiteral(options) ? options : {};
  const force = safeOptions.force === true;
  const gateConfig = resolveHeroPlaybackGateConfig();
  const arrowConfig = gateConfig && gateConfig.openButtonArrow ? gateConfig.openButtonArrow : null;
  const spritePath = (
    arrowConfig
    && arrowConfig.enabled === true
    && typeof arrowConfig.spritePath === 'string'
    && arrowConfig.spritePath.trim().length > 0
  )
    ? arrowConfig.spritePath.trim()
    : '';

  if (spritePath.length === 0) {
    STATE.openButtonArrowImage = null;
    STATE.openButtonArrowImagePath = '';
    STATE.openButtonArrowImagePendingPath = '';
    STATE.openButtonArrowImageLoadPromise = null;
    return Promise.resolve(null);
  }

  if (
    !force
    && STATE.openButtonArrowImage
    && STATE.openButtonArrowImagePath === spritePath
  ) {
    return Promise.resolve(STATE.openButtonArrowImage);
  }
  if (
    !force
    && STATE.openButtonArrowImageLoadPromise
    && STATE.openButtonArrowImagePendingPath === spritePath
  ) {
    return STATE.openButtonArrowImageLoadPromise;
  }

  STATE.openButtonArrowImagePendingPath = spritePath;
  const loadPromise = loadImage(spritePath)
    .then((image) => {
      if (STATE.openButtonArrowImagePendingPath !== spritePath) {
        return image;
      }
      STATE.openButtonArrowImage = image;
      STATE.openButtonArrowImagePath = spritePath;
      STATE.openButtonArrowImagePendingPath = '';
      STATE.openButtonArrowImageLoadPromise = null;
      renderScene({ skipAutoStart: true });
      return image;
    })
    .catch((error) => {
      if (STATE.openButtonArrowImagePendingPath === spritePath) {
        STATE.openButtonArrowImagePendingPath = '';
      }
      STATE.openButtonArrowImageLoadPromise = null;
      console.warn(error.message + ' | Open button arrow image disabled until path is fixed.');
      return null;
    });
  STATE.openButtonArrowImageLoadPromise = loadPromise;
  return loadPromise;
}

function resolveCenterOverlayImageConfig(configCandidate = CONFIG.centerOverlayImage) {
  const safeConfig = isPlainObjectLiteral(configCandidate) ? configCandidate : {};
  return {
    enabled: safeConfig.enabled !== false,
    spritePath: (
      typeof safeConfig.spritePath === 'string'
      && safeConfig.spritePath.trim().length > 0
    )
      ? safeConfig.spritePath.trim()
      : './test_page.webp',
    scale: Number.isFinite(Number(safeConfig.scale))
      ? Math.max(0, Number(safeConfig.scale))
      : 1,
    offsetXPx: Number.isFinite(Number(safeConfig.offsetXPx))
      ? Number(safeConfig.offsetXPx)
      : 0,
    offsetYPx: Number.isFinite(Number(safeConfig.offsetYPx))
      ? Number(safeConfig.offsetYPx)
      : 0,
    displayAfterFrame: Number.isFinite(Number(safeConfig.displayAfterFrame))
      ? Math.max(0, Math.floor(Number(safeConfig.displayAfterFrame)))
      : 0,
    maxOpacity: clamp(
      Number.isFinite(Number(safeConfig.maxOpacity))
        ? Number(safeConfig.maxOpacity)
        : 1,
      0,
      1,
    ),
    fadeInEnabled: safeConfig.fadeInEnabled !== false,
    fadeInDurationSec: Number.isFinite(Number(safeConfig.fadeInDurationSec))
      ? Math.max(0, Number(safeConfig.fadeInDurationSec))
      : 0.45,
  };
}

function requestCenterOverlayImageLoad(options = {}) {
  const safeOptions = isPlainObjectLiteral(options) ? options : {};
  const force = safeOptions.force === true;
  const overlayConfig = resolveCenterOverlayImageConfig();
  const spritePath = overlayConfig.enabled ? overlayConfig.spritePath : '';

  if (spritePath.length === 0) {
    centerOverlayImageLayer.removeAttribute('src');
    STATE.centerOverlayImagePath = '';
    STATE.centerOverlayImagePendingPath = '';
    STATE.centerOverlayImageLoadPromise = null;
    STATE.centerOverlayImageIsLoaded = false;
    STATE.centerOverlayImageFailedPath = '';
    return Promise.resolve(null);
  }

  if (
    !force
    && STATE.centerOverlayImageFailedPath === spritePath
  ) {
    return Promise.resolve(null);
  }

  if (
    !force
    && STATE.centerOverlayImageIsLoaded
    && STATE.centerOverlayImagePath === spritePath
  ) {
    return Promise.resolve(centerOverlayImageLayer);
  }

  if (
    !force
    && STATE.centerOverlayImageLoadPromise
    && STATE.centerOverlayImagePendingPath === spritePath
  ) {
    return STATE.centerOverlayImageLoadPromise;
  }

  STATE.centerOverlayImagePendingPath = spritePath;
  const loadPromise = loadImage(spritePath)
    .then((image) => {
      if (STATE.centerOverlayImagePendingPath !== spritePath) {
        return image;
      }
      centerOverlayImageLayer.src = image.src;
      STATE.centerOverlayImagePath = spritePath;
      STATE.centerOverlayImagePendingPath = '';
      STATE.centerOverlayImageLoadPromise = null;
      STATE.centerOverlayImageIsLoaded = true;
      STATE.centerOverlayImageFailedPath = '';
      renderScene({ skipAutoStart: true });
      return image;
    })
    .catch((error) => {
      if (STATE.centerOverlayImagePendingPath === spritePath) {
        STATE.centerOverlayImagePendingPath = '';
      }
      STATE.centerOverlayImageLoadPromise = null;
      STATE.centerOverlayImageIsLoaded = false;
      STATE.centerOverlayImageFailedPath = spritePath;
      console.warn(error.message + ' | Center overlay image disabled until path is fixed.');
      return null;
    });

  STATE.centerOverlayImageLoadPromise = loadPromise;
  return loadPromise;
}

function syncCenterOverlayImageLayer(nowMs = performance.now(), currentFrame = null) {
  const overlayConfig = resolveCenterOverlayImageConfig();
  centerOverlayImageLayer.style.left = `calc(50% + ${overlayConfig.offsetXPx}px)`;
  centerOverlayImageLayer.style.top = `calc(50% + ${overlayConfig.offsetYPx}px)`;
  centerOverlayImageLayer.style.transform = `translate(-50%, -50%) scale(${overlayConfig.scale})`;

  if (overlayConfig.enabled !== true) {
    centerOverlayImageLayer.style.display = 'none';
    centerOverlayImageLayer.style.opacity = '0';
    centerOverlayImageLayer.style.visibility = 'hidden';
    STATE.centerOverlayImageVisibleSinceMs = 0;
    STATE.centerOverlayImageLastShouldBeVisible = false;
    return;
  }

  requestCenterOverlayImageLoad().catch(() => {});

  if (STATE.centerOverlayImageIsLoaded !== true) {
    centerOverlayImageLayer.style.display = 'none';
    centerOverlayImageLayer.style.opacity = '0';
    centerOverlayImageLayer.style.visibility = 'hidden';
    STATE.centerOverlayImageVisibleSinceMs = 0;
    STATE.centerOverlayImageLastShouldBeVisible = false;
    return;
  }

  centerOverlayImageLayer.style.display = 'block';
  const frameToUse = Number.isFinite(currentFrame)
    ? currentFrame
    : getCurrentHeroVideoFrame(resolveHeroPlaybackGateConfig());
  const shouldBeVisible = frameToUse >= overlayConfig.displayAfterFrame;

  if (!shouldBeVisible) {
    centerOverlayImageLayer.style.opacity = '0';
    centerOverlayImageLayer.style.visibility = 'hidden';
    STATE.centerOverlayImageVisibleSinceMs = 0;
    STATE.centerOverlayImageLastShouldBeVisible = false;
    return;
  }

  if (STATE.centerOverlayImageLastShouldBeVisible !== true || STATE.centerOverlayImageVisibleSinceMs <= 0) {
    STATE.centerOverlayImageVisibleSinceMs = Number.isFinite(nowMs) ? nowMs : performance.now();
  }
  STATE.centerOverlayImageLastShouldBeVisible = true;

  let opacity = overlayConfig.maxOpacity;
  if (overlayConfig.fadeInEnabled && overlayConfig.fadeInDurationSec > 1e-6) {
    const fadeElapsedSec = Math.max(0, (nowMs - STATE.centerOverlayImageVisibleSinceMs) / 1000);
    opacity = overlayConfig.maxOpacity * clamp(fadeElapsedSec / overlayConfig.fadeInDurationSec, 0, 1);
  }
  centerOverlayImageLayer.style.opacity = String(opacity);
  centerOverlayImageLayer.style.visibility = 'visible';
}

function shouldRenderOpenButtonArrowLive(gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!gateConfig || gateConfig.enabled !== true) {
    return false;
  }
  const arrowConfig = gateConfig.openButtonArrow;
  if (!arrowConfig || arrowConfig.enabled !== true) {
    return false;
  }
  const stage = STATE.heroPlaybackGate ? STATE.heroPlaybackGate.stage : 'idle';
  return (
    stage === 'introPlaying'
    || stage === 'waitingForOpenButton'
    || stage === 'postOpenButtonPlaying'
  );
}

function shouldArrowBeVisibleAtFrame(currentFrame, gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!shouldRenderOpenButtonArrowLive(gateConfig)) {
    return false;
  }
  const arrowConfig = gateConfig && gateConfig.openButtonArrow ? gateConfig.openButtonArrow : null;
  if (!arrowConfig || arrowConfig.enabled !== true) {
    return false;
  }
  if (!Number.isFinite(currentFrame)) {
    return false;
  }
  return currentFrame >= arrowConfig.appearAfterFrame;
}

function shouldArrowBeDrawnAtTime(
  currentFrame,
  nowMs = performance.now(),
  gateConfig = resolveHeroPlaybackGateConfig(),
) {
  if (!shouldArrowBeVisibleAtFrame(currentFrame, gateConfig)) {
    return false;
  }
  const gateState = STATE.heroPlaybackGate;
  const arrowConfig = gateConfig && gateConfig.openButtonArrow ? gateConfig.openButtonArrow : null;
  if (!gateState || !arrowConfig) {
    return false;
  }
  if (
    arrowConfig.fadeOutAfterOpenButtonClick === true
    && Number.isFinite(gateState.openButtonClickedAtMs)
  ) {
    const fadeDurationSec = Number.isFinite(Number(arrowConfig.fadeOutDurationSec))
      ? Math.max(0, Number(arrowConfig.fadeOutDurationSec))
      : 0.45;
    if (fadeDurationSec <= 1e-6) {
      return false;
    }
    const elapsedSec = Math.max(0, (nowMs - gateState.openButtonClickedAtMs) / 1000);
    if (elapsedSec >= fadeDurationSec) {
      return false;
    }
  }
  return true;
}

function maybeRenderHeroPlaybackGateVisuals(
  currentFrame,
  gateConfig = resolveHeroPlaybackGateConfig(),
  nowMs = performance.now(),
) {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState || !gateConfig || gateConfig.enabled !== true) {
    return;
  }
  if (STATE.branchGrowth.running) {
    // Branch-growth loop already drives frequent renders; avoid duplicate render requests.
    return;
  }
  const stage = gateState.stage;
  const stageIsVideoPlaying = (
    stage === 'introPlaying'
    || stage === 'postOpenButtonPlaying'
  );
  if (stageIsVideoPlaying) {
    renderScene({ skipAutoStart: true, timestampMs: nowMs });
    gateState.openButtonArrowRenderedPresence = shouldArrowBeDrawnAtTime(currentFrame, nowMs, gateConfig);
    gateState.openButtonArrowLastRenderMs = nowMs;
    return;
  }
  const drawnNow = shouldArrowBeDrawnAtTime(currentFrame, nowMs, gateConfig);
  const wasDrawn = gateState.openButtonArrowRenderedPresence === true;
  if (!drawnNow && !wasDrawn) {
    return;
  }
  renderScene({ skipAutoStart: true, timestampMs: nowMs });
  gateState.openButtonArrowRenderedPresence = drawnNow;
  gateState.openButtonArrowLastRenderMs = nowMs;
}

function resolveHeroPlaybackOpenButtonHitCircle(gateConfig = resolveHeroPlaybackGateConfig()) {
  const rect = getHeroVideoRenderedRect();
  if (!rect || !gateConfig || !gateConfig.openButton) {
    return null;
  }
  const buttonConfig = gateConfig.openButton;
  const videoSizePx = Math.min(rect.width, rect.height);
  if (!Number.isFinite(videoSizePx) || videoSizePx <= 0) {
    return null;
  }
  const baseDiameterPx = videoSizePx * buttonConfig.diameterRatio;
  const expandedDiameterPx = baseDiameterPx * (1 + buttonConfig.hitMarginPercentOfButtonSize / 100);
  const baseRadiusPx = Math.max(0, baseDiameterPx * 0.5);
  const radiusPx = Math.max(0, expandedDiameterPx * 0.5);
  const centerX = rect.left + (rect.width * buttonConfig.centerXRatio);
  const centerY = rect.top + (rect.height * buttonConfig.centerYRatio);
  return {
    centerX,
    centerY,
    baseRadiusPx,
    radiusPx,
    videoSizePx,
  };
}

function isPointInsideHeroPlaybackOpenButton(clientX, clientY, gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return false;
  }
  const hitCircle = resolveHeroPlaybackOpenButtonHitCircle(gateConfig);
  if (!hitCircle || hitCircle.radiusPx <= 0) {
    return false;
  }
  const dx = clientX - hitCircle.centerX;
  const dy = clientY - hitCircle.centerY;
  return (dx * dx + dy * dy) <= (hitCircle.radiusPx * hitCircle.radiusPx);
}

function setHeroVideoWiggleRotationDeg(angleDeg = 0) {
  if (!video || !video.style) {
    return;
  }
  const safeAngle = Number.isFinite(angleDeg) ? angleDeg : 0;
  video.style.setProperty('--hero-video-rotate', `${safeAngle}deg`);
}

function resolveHeroVideoWiggleAnchorRatios(gateConfig = resolveHeroPlaybackGateConfig()) {
  const openButton = gateConfig && gateConfig.openButton ? gateConfig.openButton : null;
  const wiggleConfig = gateConfig && gateConfig.videoWiggle ? gateConfig.videoWiggle : null;
  const baseX = openButton && Number.isFinite(Number(openButton.centerXRatio))
    ? Number(openButton.centerXRatio)
    : 0.5;
  const baseY = openButton && Number.isFinite(Number(openButton.centerYRatio))
    ? Number(openButton.centerYRatio)
    : 0.5;
  const offsetX = wiggleConfig && Number.isFinite(Number(wiggleConfig.anchorOffsetXRatio))
    ? Number(wiggleConfig.anchorOffsetXRatio)
    : 0;
  const offsetY = wiggleConfig && Number.isFinite(Number(wiggleConfig.anchorOffsetYRatio))
    ? Number(wiggleConfig.anchorOffsetYRatio)
    : 0;
  return {
    xRatio: baseX + offsetX,
    yRatio: baseY + offsetY,
  };
}

function applyHeroVideoWiggleAnchor(gateConfig = resolveHeroPlaybackGateConfig()) {
  if (!video || !video.style) {
    return;
  }
  const anchor = resolveHeroVideoWiggleAnchorRatios(gateConfig);
  video.style.transformOrigin = `${anchor.xRatio * 100}% ${anchor.yRatio * 100}%`;
}

function stopHeroVideoWiggle(options = null) {
  const safeOptions = isPlainObjectLiteral(options) ? options : {};
  const resetRotation = safeOptions.resetRotation !== false;
  const gateState = STATE.heroPlaybackGate;
  if (!gateState) {
    return;
  }
  if (Number.isFinite(gateState.videoWiggleRafId) && gateState.videoWiggleRafId !== null) {
    cancelAnimationFrame(gateState.videoWiggleRafId);
    gateState.videoWiggleRafId = null;
  }
  if (Number.isFinite(gateState.videoWiggleDelayTimerId) && gateState.videoWiggleDelayTimerId !== null) {
    clearTimeout(gateState.videoWiggleDelayTimerId);
    gateState.videoWiggleDelayTimerId = null;
  }
  gateState.videoWiggleActive = false;
  if (resetRotation) {
    setHeroVideoWiggleRotationDeg(0);
  }
}

function startHeroVideoWiggleAfterIntroPause(gateConfig = resolveHeroPlaybackGateConfig()) {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState || !gateConfig || gateConfig.enabled !== true) {
    return;
  }
  const wiggleConfig = gateConfig.videoWiggle;
  stopHeroVideoWiggle({ resetRotation: true });
  applyHeroVideoWiggleAnchor(gateConfig);
  if (!wiggleConfig || wiggleConfig.enabled !== true) {
    return;
  }
  const maxAngleDeg = Number.isFinite(Number(wiggleConfig.maxAngleDeg))
    ? Math.max(0, Number(wiggleConfig.maxAngleDeg))
    : 0;
  const durationMs = Number.isFinite(Number(wiggleConfig.durationMs))
    ? Math.max(0, Number(wiggleConfig.durationMs))
    : 0;
  const speedHz = Number.isFinite(Number(wiggleConfig.speedHz))
    ? Math.max(0, Number(wiggleConfig.speedHz))
    : 0;
  const dampingStrength = Number.isFinite(Number(wiggleConfig.dampingStrength))
    ? Math.max(0, Number(wiggleConfig.dampingStrength))
    : 0;
  const delayMsRaw = Number.isFinite(Number(wiggleConfig.delayAfterIntroPauseMs))
    ? Number(wiggleConfig.delayAfterIntroPauseMs)
    : 0;
  const delayMs = Math.max(0, delayMsRaw);
  const initialElapsedMs = delayMsRaw < 0 ? Math.abs(delayMsRaw) : 0;
  if (maxAngleDeg <= 1e-6 || durationMs <= 1e-6 || speedHz <= 1e-6) {
    return;
  }

  const durationSec = Math.max(1e-6, durationMs / 1000);
  const beginWiggle = () => {
    gateState.videoWiggleDelayTimerId = null;
    if (gateState.stage !== 'waitingForOpenButton') {
      // User may have clicked the open button before delayed wiggle start.
      stopHeroVideoWiggle({ resetRotation: true });
      return;
    }
    gateState.videoWiggleActive = true;
    let startedAtMs = null;

    const step = (nowMs) => {
      gateState.videoWiggleRafId = null;
      if (!gateState.videoWiggleActive) {
        return;
      }
      if (gateState.stage !== 'waitingForOpenButton') {
        stopHeroVideoWiggle({ resetRotation: true });
        return;
      }
      if (!Number.isFinite(startedAtMs)) {
        startedAtMs = nowMs - initialElapsedMs;
      }
      const elapsedMs = Math.max(0, nowMs - startedAtMs);
      const elapsedSec = elapsedMs / 1000;
      const progress = clamp(elapsedSec / durationSec, 0, 1);
      const envelope = Math.exp(-dampingStrength * elapsedSec) * (1 - progress);
      const phase = elapsedSec * speedHz * Math.PI * 2;
      const angleDeg = maxAngleDeg * envelope * Math.sin(phase);
      setHeroVideoWiggleRotationDeg(angleDeg);

      if (progress >= 1) {
        stopHeroVideoWiggle({ resetRotation: true });
        return;
      }
      gateState.videoWiggleRafId = requestAnimationFrame(step);
    };

    gateState.videoWiggleRafId = requestAnimationFrame(step);
  };

  if (delayMs <= 1e-6) {
    beginWiggle();
    return;
  }
  gateState.videoWiggleDelayTimerId = window.setTimeout(beginWiggle, delayMs);
}

// Backward-compat wrappers for any existing internal/external references.
function resolveHeroPlaybackButtonHitCircle(gateConfig = resolveHeroPlaybackGateConfig()) {
  return resolveHeroPlaybackOpenButtonHitCircle(gateConfig);
}

function isPointInsideHeroPlaybackButton(clientX, clientY, gateConfig = resolveHeroPlaybackGateConfig()) {
  return isPointInsideHeroPlaybackOpenButton(clientX, clientY, gateConfig);
}

function cancelHeroPlaybackGateMonitor() {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState) {
    return;
  }
  if (Number.isFinite(gateState.monitorRafId) && gateState.monitorRafId !== null) {
    cancelAnimationFrame(gateState.monitorRafId);
    gateState.monitorRafId = null;
  }
  if (
    Number.isFinite(gateState.monitorVideoFrameCallbackId)
    && gateState.monitorVideoFrameCallbackId !== null
    && video
    && typeof video.cancelVideoFrameCallback === 'function'
  ) {
    try {
      video.cancelVideoFrameCallback(gateState.monitorVideoFrameCallbackId);
    } catch (_error) {
      // Ignore callback-cancel exceptions on browser-specific implementations.
    }
    gateState.monitorVideoFrameCallbackId = null;
  }
}

function maybeStartGrowthAnimationFromHeroVideoFrame(currentFrame, gateConfig = resolveHeroPlaybackGateConfig()) {
  const gateState = STATE.heroPlaybackGate;
  if (!gateConfig || gateConfig.enabled !== true || !gateState || gateState.growthStarted === true) {
    return;
  }
  if (gateState.growthAnimationEnabledByConfig !== true) {
    return;
  }
  if (Number.isFinite(currentFrame) && currentFrame >= gateConfig.growthStartFrame) {
    gateState.growthFrameReached = true;
  }
  if (gateState.growthFrameReached !== true) {
    return;
  }
  if (!isFoliageReadyForGrowth()) {
    return;
  }
  gateState.growthStarted = true;
  if (CONFIG.branchGrowth.enabled !== true) {
    return;
  }
  startBranchAnimation({ restart: true });
}

function enforceHeroPlaybackGatePauseFrames(
  currentFrame = getCurrentHeroVideoFrame(resolveHeroPlaybackGateConfig()),
  gateConfig = resolveHeroPlaybackGateConfig(),
  options = null,
) {
  const safeOptions = isPlainObjectLiteral(options) ? options : {};
  const rerenderOnPause = safeOptions.rerenderOnPause !== false;
  const gateState = STATE.heroPlaybackGate;
  if (!gateState || !gateConfig || gateConfig.enabled !== true) {
    return false;
  }
  if (!Number.isFinite(currentFrame)) {
    return false;
  }

  const pauseGuardFrames = Number.isFinite(Number(gateConfig.pauseGuardFrames))
    ? Math.max(0, Number(gateConfig.pauseGuardFrames))
    : 0;
  const pauseTargetFrame = getHeroGatePauseTargetFrame(gateState.stage, gateConfig);
  if (!Number.isFinite(pauseTargetFrame)) {
    return false;
  }
  const pauseThresholdFrame = pauseTargetFrame - pauseGuardFrames;
  if (currentFrame < pauseThresholdFrame) {
    return false;
  }

  if (gateState.stage === 'introPlaying') {
    video.pause();
    lockHeroVideoToFrame(pauseTargetFrame, gateConfig);
    gateState.stage = 'waitingForOpenButton';
    startHeroVideoWiggleAfterIntroPause(gateConfig);
    if (rerenderOnPause) {
      renderScene({ skipAutoStart: true });
    }
    return true;
  }

  if (gateState.stage === 'postOpenButtonPlaying') {
    video.pause();
    lockHeroVideoToFrame(pauseTargetFrame, gateConfig);
    gateState.stage = 'postOpenButtonPaused';
    stopHeroVideoWiggle({ resetRotation: true });
    if (rerenderOnPause) {
      renderScene({ skipAutoStart: true });
    }
    return true;
  }

  return false;
}

function shouldUseVideoFrameCallbackForHeroGate(gateConfig = resolveHeroPlaybackGateConfig()) {
  return Boolean(
    gateConfig
    && gateConfig.monitorUseVideoFrameCallback === true
    && video
    && typeof video.requestVideoFrameCallback === 'function'
    && typeof video.cancelVideoFrameCallback === 'function',
  );
}

function runHeroPlaybackGateMonitorStep(
  currentFrame = getCurrentHeroVideoFrame(resolveHeroPlaybackGateConfig()),
  nowMs = performance.now(),
) {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState) {
    return;
  }

  const gateConfig = resolveHeroPlaybackGateConfig();
  if (gateConfig.enabled !== true) {
    return;
  }

  maybeStartGrowthAnimationFromHeroVideoFrame(currentFrame, gateConfig);
  if (enforceHeroPlaybackGatePauseFrames(currentFrame, gateConfig)) {
    return;
  }
  maybeRenderHeroPlaybackGateVisuals(currentFrame, gateConfig, nowMs);

  if (video && video.paused !== true) {
    ensureHeroPlaybackGateMonitorRunning();
  }
}

function stepHeroPlaybackGateMonitorRaf() {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState) {
    return;
  }
  gateState.monitorRafId = null;
  const gateConfig = resolveHeroPlaybackGateConfig();
  const currentFrame = getCurrentHeroVideoFrame(gateConfig);
  runHeroPlaybackGateMonitorStep(currentFrame, performance.now());
}

function stepHeroPlaybackGateMonitorVideoFrame(_nowMs, metadata) {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState) {
    return;
  }
  gateState.monitorVideoFrameCallbackId = null;
  const gateConfig = resolveHeroPlaybackGateConfig();
  const frameRate = Number.isFinite(Number(gateConfig.frameRate))
    ? Math.max(1, Number(gateConfig.frameRate))
    : 30;
  const metadataTimeSec = metadata && Number.isFinite(Number(metadata.mediaTime))
    ? Math.max(0, Number(metadata.mediaTime))
    : null;
  const currentFrame = metadataTimeSec !== null
    ? metadataTimeSec * frameRate
    : getCurrentHeroVideoFrame(gateConfig);
  runHeroPlaybackGateMonitorStep(currentFrame, performance.now());
}

function onHeroVideoTimeUpdate() {
  const gateConfig = resolveHeroPlaybackGateConfig();
  if (!gateConfig || gateConfig.enabled !== true) {
    return;
  }
  const currentFrame = getCurrentHeroVideoFrame(gateConfig);
  maybeStartGrowthAnimationFromHeroVideoFrame(currentFrame, gateConfig);
  enforceHeroPlaybackGatePauseFrames(currentFrame, gateConfig);
  maybeRenderHeroPlaybackGateVisuals(currentFrame, gateConfig, performance.now());
  if (video && video.paused !== true) {
    ensureHeroPlaybackGateMonitorRunning();
  }
}

function ensureHeroPlaybackGateMonitorRunning() {
  const gateState = STATE.heroPlaybackGate;
  if (!gateState || !video || video.paused === true) {
    return;
  }
  if (
    gateState.monitorRafId !== null
    || gateState.monitorVideoFrameCallbackId !== null
  ) {
    return;
  }
  const gateConfig = resolveHeroPlaybackGateConfig();
  if (shouldUseVideoFrameCallbackForHeroGate(gateConfig)) {
    gateState.monitorVideoFrameCallbackId = video.requestVideoFrameCallback(stepHeroPlaybackGateMonitorVideoFrame);
    return;
  }
  gateState.monitorRafId = requestAnimationFrame(stepHeroPlaybackGateMonitorRaf);
}

function tryHandleHeroPlaybackOpenButtonClick(event) {
  const gateConfig = resolveHeroPlaybackGateConfig();
  if (gateConfig.enabled !== true) {
    return false;
  }
  const gateState = STATE.heroPlaybackGate;
  const stageAllowsOpen = gateState && (
    gateState.stage === 'waitingForOpenButton'
    || gateState.stage === 'introPlaying'
  );
  if (!stageAllowsOpen) {
    return false;
  }
  if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return false;
  }
  if (!isPointInsideHeroPlaybackOpenButton(event.clientX, event.clientY, gateConfig)) {
    return false;
  }

  gateState.stage = 'postOpenButtonPlaying';
  gateState.openButtonClickedAtMs = performance.now();
  // Cancel pending or active wiggle immediately when user opens.
  stopHeroVideoWiggle({ resetRotation: true });
  const playbackPromise = video.play();
  if (playbackPromise && typeof playbackPromise.catch === 'function') {
    playbackPromise.catch(() => {});
  }
  ensureHeroPlaybackGateMonitorRunning();
  renderScene({ skipAutoStart: true });
  event.preventDefault();
  return true;
}

// Backward-compatible alias.
function tryHandleHeroPlaybackGateClick(event) {
  return tryHandleHeroPlaybackOpenButtonClick(event);
}

function startHeroPlaybackGateFlow() {
  const gateConfig = resolveHeroPlaybackGateConfig();
  const gateState = STATE.heroPlaybackGate;
  if (!gateState) {
    return;
  }
  cancelHeroPlaybackGateMonitor();
  stopHeroVideoWiggle({ resetRotation: true });
  refreshHeroVideoReferenceRect();
  gateState.growthFrameReached = false;
  gateState.growthStarted = false;
  gateState.growthAnimationEnabledByConfig = CONFIG.branchGrowth.enabled === true;
  gateState.openButtonClickedAtMs = null;
  gateState.openButtonArrowRenderedPresence = false;
  gateState.openButtonArrowLastRenderMs = 0;
  applyHeroVideoWiggleAnchor(gateConfig);
  requestOpenButtonArrowImageLoad().catch(() => {});

  if (gateConfig.enabled !== true) {
    gateState.stage = 'idle';
    return;
  }

  if (
    gateState.growthAnimationEnabledByConfig === true
    && (STATE.branchGrowth.running || STATE.branchGrowth.rafId !== null || STATE.branchGrowth.elapsedSec > 0)
  ) {
    stopBranchAnimation({ keepElapsed: false });
  }

  gateState.stage = 'introPlaying';
  try {
    video.currentTime = 0;
  } catch (_error) {
    // Ignore seek errors here; monitor and play controls remain safe.
  }
  const playbackPromise = video.play();
  if (playbackPromise && typeof playbackPromise.catch === 'function') {
    playbackPromise.catch(() => {
      gateState.stage = 'waitingForOpenButton';
      renderScene({ skipAutoStart: true });
    });
  }
  ensureHeroPlaybackGateMonitorRunning();
}

function resolveOverlayWrapConfig() {
  const safeConfig = isPlainObjectLiteral(CONFIG.overlayWrap) ? CONFIG.overlayWrap : {};
  const centerHalfWidthPxFallback = Number.isFinite(Number(safeConfig.centerHalfWidthPx))
    ? Math.max(0, Number(safeConfig.centerHalfWidthPx))
    : 50;
  const centerHalfWidthPxFromVideoEnabled = safeConfig.centerHalfWidthPxFromVideoEnabled !== false;
  const centerHalfWidthPxVideoHeightRatio = Number.isFinite(Number(safeConfig.centerHalfWidthPxVideoHeightRatio))
    ? Math.max(0, Number(safeConfig.centerHalfWidthPxVideoHeightRatio))
    : 0.162760416667;
  const centerHalfWidthPxVideoHeightRatioBottom = Number.isFinite(Number(safeConfig.centerHalfWidthPxVideoHeightRatioBottom))
    ? Math.max(0, Number(safeConfig.centerHalfWidthPxVideoHeightRatioBottom))
    : centerHalfWidthPxVideoHeightRatio;
  const centerHalfWidthSwitchYVideoHeightRatioRaw = Number(safeConfig.centerHalfWidthSwitchYVideoHeightRatio);
  const centerHalfWidthSwitchYVideoHeightRatioNormalized = Number.isFinite(centerHalfWidthSwitchYVideoHeightRatioRaw)
    ? (
      centerHalfWidthSwitchYVideoHeightRatioRaw > 1
        ? (centerHalfWidthSwitchYVideoHeightRatioRaw / 100)
        : centerHalfWidthSwitchYVideoHeightRatioRaw
    )
    : 1;
  const centerHalfWidthSwitchYVideoHeightRatio = Number.isFinite(Number(safeConfig.centerHalfWidthSwitchYVideoHeightRatio))
    ? clamp(centerHalfWidthSwitchYVideoHeightRatioNormalized, 0, 1)
    : 1;
  const heroVideoRect = getHeroVideoRenderedRect();
  const heroVideoHeightPx = (
    heroVideoRect
    && Number.isFinite(heroVideoRect.height)
    && heroVideoRect.height > 0
  )
    ? heroVideoRect.height
    : resolveHeroVideoRenderedHeightPx();
  const heroVideoTopPx = (
    heroVideoRect
    && Number.isFinite(heroVideoRect.top)
  )
    ? heroVideoRect.top
    : 0;
  const centerHalfWidthTopPx = (
    centerHalfWidthPxFromVideoEnabled
    && Number.isFinite(heroVideoHeightPx)
    && heroVideoHeightPx > 0
  )
    ? heroVideoHeightPx * centerHalfWidthPxVideoHeightRatio
    : centerHalfWidthPxFallback;
  const centerHalfWidthBottomPx = (
    centerHalfWidthPxFromVideoEnabled
    && Number.isFinite(heroVideoHeightPx)
    && heroVideoHeightPx > 0
  )
    ? heroVideoHeightPx * centerHalfWidthPxVideoHeightRatioBottom
    : centerHalfWidthPxFallback;
  const centerHalfWidthSwitchYPx = (
    Number.isFinite(heroVideoHeightPx)
    && heroVideoHeightPx > 0
  )
    ? (heroVideoTopPx + heroVideoHeightPx * centerHalfWidthSwitchYVideoHeightRatio)
    : (STATE.viewportHeight * centerHalfWidthSwitchYVideoHeightRatio);
  const centerBandOverlayLineWidth = Number.isFinite(Number(safeConfig.centerBandOverlayLineWidth))
    ? Math.max(0.1, Number(safeConfig.centerBandOverlayLineWidth))
    : 1.5;
  return {
    enabled: safeConfig.enabled !== false,
    animationOnly: safeConfig.animationOnly !== false,
    centerHalfWidthPx: centerHalfWidthTopPx,
    centerHalfWidthTopPx,
    centerHalfWidthBottomPx,
    centerHalfWidthSwitchYPx,
    centerHalfWidthPxFromVideoEnabled,
    centerHalfWidthPxVideoHeightRatio,
    centerHalfWidthPxVideoHeightRatioBottom,
    centerHalfWidthSwitchYVideoHeightRatio,
    skipHiddenBackDrawEnabled: safeConfig.skipHiddenBackDrawEnabled !== false,
    showCenterBandOverlay: safeConfig.showCenterBandOverlay === true,
    centerBandOverlayFill: (typeof safeConfig.centerBandOverlayFill === 'string' && safeConfig.centerBandOverlayFill.length > 0)
      ? safeConfig.centerBandOverlayFill
      : 'rgba(255, 95, 95, 0.16)',
    centerBandOverlayStroke: (typeof safeConfig.centerBandOverlayStroke === 'string' && safeConfig.centerBandOverlayStroke.length > 0)
      ? safeConfig.centerBandOverlayStroke
      : 'rgba(255, 95, 95, 0.85)',
    centerBandOverlayLineWidth,
  };
}

function isOverlayWrapActive(overlayWrapConfig, useAnimation) {
  if (!overlayWrapConfig || overlayWrapConfig.enabled !== true) {
    return false;
  }
  if (overlayWrapConfig.animationOnly !== true) {
    return true;
  }
  return useAnimation === true;
}

function resolveOverlayHiddenBandBoundsAtY(hiddenBand, y) {
  if (!hiddenBand || !Number.isFinite(hiddenBand.centerX)) {
    return null;
  }
  const topHalfWidthPx = Number.isFinite(hiddenBand.topHalfWidthPx)
    ? Math.max(0, hiddenBand.topHalfWidthPx)
    : 50;
  const bottomHalfWidthPx = Number.isFinite(hiddenBand.bottomHalfWidthPx)
    ? Math.max(0, hiddenBand.bottomHalfWidthPx)
    : topHalfWidthPx;
  const switchY = Number.isFinite(hiddenBand.switchY)
    ? clamp(hiddenBand.switchY, 0, STATE.viewportHeight)
    : STATE.viewportHeight;
  const ySample = Number.isFinite(y) ? y : 0;
  const useBottom = ySample >= switchY;
  const halfWidthPx = useBottom ? bottomHalfWidthPx : topHalfWidthPx;
  return {
    centerX: hiddenBand.centerX,
    leftX: hiddenBand.centerX - halfWidthPx,
    rightX: hiddenBand.centerX + halfWidthPx,
    halfWidthPx,
  };
}

function getOverlayHiddenBand(overlayWrapConfig) {
  const topHalfWidthPx = overlayWrapConfig && Number.isFinite(overlayWrapConfig.centerHalfWidthTopPx)
    ? Math.max(0, overlayWrapConfig.centerHalfWidthTopPx)
    : (
      overlayWrapConfig && Number.isFinite(overlayWrapConfig.centerHalfWidthPx)
        ? Math.max(0, overlayWrapConfig.centerHalfWidthPx)
        : 50
    );
  const bottomHalfWidthPx = overlayWrapConfig && Number.isFinite(overlayWrapConfig.centerHalfWidthBottomPx)
    ? Math.max(0, overlayWrapConfig.centerHalfWidthBottomPx)
    : topHalfWidthPx;
  const switchY = overlayWrapConfig && Number.isFinite(overlayWrapConfig.centerHalfWidthSwitchYPx)
    ? clamp(overlayWrapConfig.centerHalfWidthSwitchYPx, 0, STATE.viewportHeight)
    : STATE.viewportHeight;
  const centerX = STATE.viewportWidth * 0.5;
  const topBounds = resolveOverlayHiddenBandBoundsAtY({
    centerX,
    topHalfWidthPx,
    bottomHalfWidthPx,
    switchY,
  }, Math.max(0, switchY - 1));
  return {
    centerX,
    leftX: topBounds ? topBounds.leftX : (centerX - topHalfWidthPx),
    rightX: topBounds ? topBounds.rightX : (centerX + topHalfWidthPx),
    halfWidthPx: topHalfWidthPx,
    topHalfWidthPx,
    bottomHalfWidthPx,
    switchY,
  };
}

function resolveHiddenBandEffectiveHalfWidthForYRange(hiddenBand, minY, maxY) {
  if (!hiddenBand) {
    return null;
  }
  const topHalfWidthPx = Number.isFinite(hiddenBand.topHalfWidthPx)
    ? Math.max(0, hiddenBand.topHalfWidthPx)
    : 50;
  const bottomHalfWidthPx = Number.isFinite(hiddenBand.bottomHalfWidthPx)
    ? Math.max(0, hiddenBand.bottomHalfWidthPx)
    : topHalfWidthPx;
  const switchY = Number.isFinite(hiddenBand.switchY)
    ? clamp(hiddenBand.switchY, 0, STATE.viewportHeight)
    : STATE.viewportHeight;

  const safeMinY = Number.isFinite(minY) ? minY : 0;
  const safeMaxY = Number.isFinite(maxY) ? maxY : safeMinY;
  const y0 = Math.min(safeMinY, safeMaxY);
  const y1 = Math.max(safeMinY, safeMaxY);

  if (y1 < switchY) {
    return topHalfWidthPx;
  }
  if (y0 >= switchY) {
    return bottomHalfWidthPx;
  }
  return Math.min(topHalfWidthPx, bottomHalfWidthPx);
}

function isAabbFullyInsideHiddenBand(minX, maxX, hiddenBand, minY = null, maxY = null) {
  if (!hiddenBand || !Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(hiddenBand.centerX)) {
    return false;
  }
  const effectiveHalfWidthPx = resolveHiddenBandEffectiveHalfWidthForYRange(hiddenBand, minY, maxY);
  if (!Number.isFinite(effectiveHalfWidthPx)) {
    return false;
  }
  const leftX = hiddenBand.centerX - effectiveHalfWidthPx;
  const rightX = hiddenBand.centerX + effectiveHalfWidthPx;
  return minX >= leftX && maxX <= rightX;
}

function drawOverlayCenterBand(targetCtx, hiddenBand, overlayWrapConfig) {
  if (!targetCtx || !hiddenBand || !overlayWrapConfig || overlayWrapConfig.showCenterBandOverlay !== true) {
    return;
  }
  const viewportHeight = Math.max(0, STATE.viewportHeight);
  const switchY = Number.isFinite(hiddenBand.switchY)
    ? clamp(hiddenBand.switchY, 0, viewportHeight)
    : viewportHeight;
  const topBounds = resolveOverlayHiddenBandBoundsAtY(hiddenBand, Math.max(0, switchY - 1));
  const bottomBounds = resolveOverlayHiddenBandBoundsAtY(hiddenBand, Math.min(viewportHeight, switchY + 1));
  if (!topBounds || !bottomBounds) {
    return;
  }
  const topWidth = Math.max(0, topBounds.rightX - topBounds.leftX);
  const bottomWidth = Math.max(0, bottomBounds.rightX - bottomBounds.leftX);
  if (topWidth <= 1e-6 && bottomWidth <= 1e-6) {
    return;
  }
  targetCtx.save();
  targetCtx.fillStyle = overlayWrapConfig.centerBandOverlayFill;
  if (switchY > 1e-6 && topWidth > 1e-6) {
    targetCtx.fillRect(topBounds.leftX, 0, topWidth, switchY);
  }
  const bottomHeight = Math.max(0, viewportHeight - switchY);
  if (bottomHeight > 1e-6 && bottomWidth > 1e-6) {
    targetCtx.fillRect(bottomBounds.leftX, switchY, bottomWidth, bottomHeight);
  }
  targetCtx.strokeStyle = overlayWrapConfig.centerBandOverlayStroke;
  targetCtx.lineWidth = overlayWrapConfig.centerBandOverlayLineWidth;
  targetCtx.beginPath();
  if (switchY > 1e-6) {
    targetCtx.moveTo(topBounds.leftX, 0);
    targetCtx.lineTo(topBounds.leftX, switchY);
    targetCtx.moveTo(topBounds.rightX, 0);
    targetCtx.lineTo(topBounds.rightX, switchY);
  }
  if (bottomHeight > 1e-6) {
    targetCtx.moveTo(bottomBounds.leftX, switchY);
    targetCtx.lineTo(bottomBounds.leftX, viewportHeight);
    targetCtx.moveTo(bottomBounds.rightX, switchY);
    targetCtx.lineTo(bottomBounds.rightX, viewportHeight);
  }
  if (Math.abs(topBounds.leftX - bottomBounds.leftX) > 1e-6) {
    targetCtx.moveTo(topBounds.leftX, switchY);
    targetCtx.lineTo(bottomBounds.leftX, switchY);
  }
  if (Math.abs(topBounds.rightX - bottomBounds.rightX) > 1e-6) {
    targetCtx.moveTo(topBounds.rightX, switchY);
    targetCtx.lineTo(bottomBounds.rightX, switchY);
  }
  targetCtx.stroke();
  targetCtx.restore();
}

function resetOverlayWrapPromotionState() {
  STATE.overlayWrapPromotion.clear();
}

function sanitizeFlowerPerformanceProfile(value) {
  if (value === 'desktop' || value === 'mobile' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function resolveFlowerAdaptiveProfileDeviceInfo(autoProfileConfig = {}) {
  const viewportWidth = Number.isFinite(window.innerWidth) ? window.innerWidth : 0;
  const viewportHeight = Number.isFinite(window.innerHeight) ? window.innerHeight : 0;
  const shortEdge = Math.max(0, Math.min(viewportWidth || 0, viewportHeight || 0));
  const dpr = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
  const hardwareConcurrencyRaw = Number(navigator.hardwareConcurrency);
  const hardwareConcurrency = Number.isFinite(hardwareConcurrencyRaw)
    ? Math.max(1, Math.floor(hardwareConcurrencyRaw))
    : 8;
  const userAgentDataMobile = Boolean(navigator.userAgentData && navigator.userAgentData.mobile === true);
  const uaText = typeof navigator.userAgent === 'string' ? navigator.userAgent.toLowerCase() : '';
  const uaMobile = /android|iphone|ipad|ipod|mobile/.test(uaText);

  const maxHw = Number.isFinite(Number(autoProfileConfig.mobileMaxHardwareConcurrency))
    ? Math.max(1, Math.floor(Number(autoProfileConfig.mobileMaxHardwareConcurrency)))
    : 6;
  const minDpr = Number.isFinite(Number(autoProfileConfig.mobileMinDevicePixelRatio))
    ? Math.max(1, Number(autoProfileConfig.mobileMinDevicePixelRatio))
    : 2;
  const maxViewportWidth = Number.isFinite(Number(autoProfileConfig.mobileMaxViewportWidth))
    ? Math.max(320, Number(autoProfileConfig.mobileMaxViewportWidth))
    : 1024;

  const likelyMobile = (
    userAgentDataMobile
    || uaMobile
    || (shortEdge > 0 && shortEdge <= maxViewportWidth && dpr >= minDpr)
    || hardwareConcurrency <= maxHw
  );

  return {
    likelyMobile,
    shortEdge,
    dpr,
    hardwareConcurrency,
  };
}

function sampleRangeByNormalizedWeight(rangeInput, fallbackMin, fallbackMax, weight) {
  const raw = Array.isArray(rangeInput) ? rangeInput : [fallbackMin, fallbackMax];
  const a = Number(raw[0]);
  const b = Number(raw[1]);
  const min = Number.isFinite(a) ? a : fallbackMin;
  const max = Number.isFinite(b) ? b : fallbackMax;
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const t = Math.max(0, Math.min(1, Number.isFinite(weight) ? weight : 0));
  return low + ((high - low) * t);
}

function resolveFloralResponsiveScaleFactor() {
  const safeConfig = isPlainObjectLiteral(CONFIG.floralResponsiveScale) ? CONFIG.floralResponsiveScale : {};
  if (safeConfig.enabled === false) {
    STATE.lastFloralResponsiveScaleFactor = 1;
    return 1;
  }
  const rawPoints = Array.isArray(safeConfig.points) ? safeConfig.points : [];
  if (rawPoints.length === 0) {
    STATE.lastFloralResponsiveScaleFactor = 1;
    return 1;
  }

  const points = [];
  for (let i = 0; i < rawPoints.length; i += 1) {
    const point = rawPoints[i];
    if (!Array.isArray(point) || point.length < 2) {
      continue;
    }
    const width = Number(point[0]);
    const scale = Number(point[1]);
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(scale) || scale <= 0) {
      continue;
    }
    points.push([width, scale]);
  }
  if (points.length === 0) {
    STATE.lastFloralResponsiveScaleFactor = 1;
    return 1;
  }
  points.sort((a, b) => a[0] - b[0]);

  const viewportWidth = Number.isFinite(STATE.viewportWidth) && STATE.viewportWidth > 0
    ? STATE.viewportWidth
    : (Number.isFinite(window.innerWidth) ? window.innerWidth : 0);
  let scale = points[0][1];
  if (viewportWidth > points[0][0]) {
    scale = points[points.length - 1][1];
    for (let i = 1; i < points.length; i += 1) {
      const left = points[i - 1];
      const right = points[i];
      if (viewportWidth > right[0]) {
        continue;
      }
      const widthSpan = right[0] - left[0];
      if (widthSpan <= 1e-6) {
        scale = right[1];
      } else {
        const t = clamp((viewportWidth - left[0]) / widthSpan, 0, 1);
        scale = left[1] + ((right[1] - left[1]) * t);
      }
      break;
    }
  }

  const viewportHeight = Number.isFinite(STATE.viewportHeight) && STATE.viewportHeight > 0
    ? STATE.viewportHeight
    : (Number.isFinite(window.innerHeight) ? window.innerHeight : 0);

  if (safeConfig.pointerModifierEnabled !== false && typeof window.matchMedia === 'function') {
    let pointerKey = 'unknown';
    if (window.matchMedia('(pointer: coarse)').matches) {
      pointerKey = 'coarse';
    } else if (window.matchMedia('(pointer: fine)').matches) {
      pointerKey = 'fine';
    } else if (window.matchMedia('(pointer: none)').matches) {
      pointerKey = 'none';
    }
    const pointerMultiplierRaw = (
      pointerKey === 'coarse'
        ? safeConfig.pointerCoarseMultiplier
        : (pointerKey === 'fine'
          ? safeConfig.pointerFineMultiplier
          : (pointerKey === 'none'
            ? safeConfig.pointerNoneMultiplier
            : safeConfig.pointerUnknownMultiplier))
    );
    const pointerMultiplier = Number.isFinite(Number(pointerMultiplierRaw))
      ? Math.max(0.01, Number(pointerMultiplierRaw))
      : 1;
    scale *= pointerMultiplier;
  }

  if (
    safeConfig.landscapeModifierEnabled === true
    && viewportWidth > 0
    && viewportHeight > 0
    && viewportWidth > viewportHeight
  ) {
    const landscapeMultiplier = Number.isFinite(Number(safeConfig.landscapeMultiplier))
      ? Math.max(0.01, Number(safeConfig.landscapeMultiplier))
      : 1;
    scale *= landscapeMultiplier;
  }

  const globalMultiplier = Number.isFinite(Number(safeConfig.globalMultiplier))
    ? Math.max(0.01, Number(safeConfig.globalMultiplier))
    : 1;
  scale *= globalMultiplier;

  if (safeConfig.dprModifierEnabled === true) {
    const dpr = Number.isFinite(window.devicePixelRatio) ? Math.max(0.1, window.devicePixelRatio) : 1;
    const dprBaseline = Number.isFinite(Number(safeConfig.dprBaseline))
      ? Math.max(0.1, Number(safeConfig.dprBaseline))
      : 2;
    const dprStrength = Number.isFinite(Number(safeConfig.dprStrength))
      ? Math.max(0, Number(safeConfig.dprStrength))
      : 0.14;
    const dprNormalizedDelta = (dpr - dprBaseline) / dprBaseline;
    let dprMultiplier = 1 - (dprNormalizedDelta * dprStrength);
    const dprMultiplierClamp = normalizeRangeInput(safeConfig.dprMultiplierClamp, 0.92, 1.08);
    dprMultiplier = clamp(dprMultiplier, dprMultiplierClamp[0], dprMultiplierClamp[1]);
    scale *= Math.max(0.01, dprMultiplier);
  }

  const finalScaleClamp = normalizeRangeInput(safeConfig.finalScaleClamp, 0.25, 2.5);
  const resolvedScale = clamp(Math.max(0.01, scale), finalScaleClamp[0], finalScaleClamp[1]);
  STATE.lastFloralResponsiveScaleFactor = resolvedScale;
  return resolvedScale;
}

function getFlowersAdaptiveRuntimePatch(flowersConfig, swayMode) {
  if (!isPlainObjectLiteral(flowersConfig) || swayMode !== 'influence') {
    return null;
  }
  const profile = sanitizeFlowerPerformanceProfile(flowersConfig.performanceProfile);
  const autoProfile = isPlainObjectLiteral(flowersConfig.autoProfile) ? flowersConfig.autoProfile : {};
  const deviceInfo = resolveFlowerAdaptiveProfileDeviceInfo(autoProfile);
  const useMobileProfile = profile === 'mobile' || (profile === 'auto' && deviceInfo.likelyMobile);
  if (!useMobileProfile) {
    return null;
  }

  const shortEdgeNorm = Math.max(0, Math.min(1, (deviceInfo.shortEdge - 320) / (1024 - 320)));
  const dprNorm = Math.max(0, Math.min(1, (deviceInfo.dpr - 1) / (3 - 1)));
  const cpuNorm = Math.max(0, Math.min(1, (deviceInfo.hardwareConcurrency - 2) / (8 - 2)));
  const budgetWeight = Math.max(
    0,
    Math.min(1, (shortEdgeNorm * 0.35) + (cpuNorm * 0.45) - (dprNorm * 0.2)),
  );

  const influenceDynamicCap = Math.floor(sampleRangeByNormalizedWeight(
    autoProfile.influenceDynamicCapRange,
    14,
    20,
    budgetWeight,
  ));
  const influenceNoPointerFallBoost = sampleRangeByNormalizedWeight(
    autoProfile.influenceNoPointerFallBoostRange,
    3.0,
    4.0,
    1 - budgetWeight,
  );
  const mouseSpeedSwayAffect = sampleRangeByNormalizedWeight(
    autoProfile.mouseSpeedSwayAffectRange,
    0.1,
    0.2,
    budgetWeight,
  );
  const interactionRadiusScale = sampleRangeByNormalizedWeight(
    autoProfile.interactionRadiusScaleRange,
    0.82,
    1.0,
    budgetWeight,
  );
  const minSwayFallSpeed = Number.isFinite(Number(autoProfile.minSwayFallSpeed))
    ? Math.max(0, Number(autoProfile.minSwayFallSpeed))
    : 1.5;
  const baseRadius = Number.isFinite(Number(flowersConfig.swayInteractionRadiusFactor))
    ? Math.max(0, Number(flowersConfig.swayInteractionRadiusFactor))
    : 2.1;

  return {
    influenceDynamicCapEnabled: true,
    influenceDynamicCap: Math.max(1, influenceDynamicCap),
    influenceNoPointerFallBoost: Math.max(1, influenceNoPointerFallBoost),
    mouseSpeedSwayAffect: Math.max(0, mouseSpeedSwayAffect),
    swayInteractionRadiusFactor: Math.max(0, baseRadius * interactionRadiusScale),
    swayFallSpeed: Math.max(minSwayFallSpeed, Number(flowersConfig.swayFallSpeed) || 0),
  };
}

function getFlowersRuntimeConfig() {
  const flowersConfig = isPlainObjectLiteral(CONFIG.flowers) ? CONFIG.flowers : {};
  const swayMode = resolveGlobalSwayMode();
  const adaptivePatch = getFlowersAdaptiveRuntimePatch(flowersConfig, swayMode);
  const floralScale = resolveFloralResponsiveScaleFactor() * resolveGlobalFoliageScale();
  const runtimeConfig = {
    ...flowersConfig,
    ...(adaptivePatch || {}),
    swayMode,
    viewportCullingEnabled: isFlowerViewportCullingEnabled(),
    floralResponsiveScaleFactor: floralScale,
  };
  if (Math.abs(floralScale - 1) > 1e-6) {
    const drawSizeRaw = Number(runtimeConfig.drawSize);
    runtimeConfig.drawSize = Number.isFinite(drawSizeRaw)
      ? Math.max(1, drawSizeRaw * floralScale)
      : Math.max(1, 80 * floralScale);

    const typeConfigs = isPlainObjectLiteral(runtimeConfig.types) ? runtimeConfig.types : null;
    if (typeConfigs && isPlainObjectLiteral(typeConfigs.blue)) {
      const blueType = typeConfigs.blue;
      const scaledBlueType = { ...blueType };
      const baseSizeRaw = Number(blueType.baseSize);
      if (Number.isFinite(baseSizeRaw)) {
        scaledBlueType.baseSize = Math.max(0.01, baseSizeRaw * floralScale);
      }
      const pointDrawSizeRaw = Number(blueType.pointDrawSize);
      if (Number.isFinite(pointDrawSizeRaw)) {
        scaledBlueType.pointDrawSize = Math.max(1, pointDrawSizeRaw * floralScale);
      }
      runtimeConfig.types = {
        ...typeConfigs,
        blue: scaledBlueType,
      };
    }
  }
  return runtimeConfig;
}

function sanitizeOffshootPathGenerationMode(value) {
  if (value === 'random' || value === 'manualTemplate' || value === 'inherit') {
    return value;
  }
  return 'inherit';
}

function normalizeTemplateIndexPool(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (let i = 0; i < value.length; i += 1) {
    const numeric = Number(value[i]);
    if (!Number.isFinite(numeric) || numeric < 0) {
      continue;
    }
    const index = Math.floor(numeric);
    if (seen.has(index)) {
      continue;
    }
    seen.add(index);
    out.push(index);
  }
  return out;
}

function getDirectionalBasis(growthDir, direction) {
  if (!growthDir || !Number.isFinite(growthDir.x) || !Number.isFinite(growthDir.y)) {
    return null;
  }
  const forward = normalize(growthDir);
  const normal = { x: -forward.y, y: forward.x };
  const side = direction >= 0 ? 1 : -1;
  return {
    forward,
    lateral: {
      x: normal.x * side,
      y: normal.y * side,
    },
  };
}

function getPathGenerationMode() {
  return CONFIG.pathGeneration && CONFIG.pathGeneration.mode === 'manualTemplate'
    ? 'manualTemplate'
    : 'random';
}

function sanitizeManualTemplatePoints(template) {
  if (!Array.isArray(template)) {
    return null;
  }

  const points = [];
  for (let i = 0; i < template.length; i += 1) {
    const point = template[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue;
    }
    points.push({ x: point.x, y: point.y });
  }

  return points.length >= 2 ? points : null;
}

function countSvgPathAnchorPoints(pathData) {
  if (typeof pathData !== 'string' || pathData.trim().length === 0) {
    return 0;
  }
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
  if (!tokens || tokens.length === 0) {
    return 0;
  }

  function isCommandToken(token) {
    return typeof token === 'string' && token.length === 1 && /[a-zA-Z]/.test(token);
  }

  let command = '';
  let index = 0;
  let count = 0;

  function consumeSegments(valuesPerSegment) {
    let consumedAny = false;
    while (index < tokens.length && !isCommandToken(tokens[index])) {
      if (index + valuesPerSegment > tokens.length) {
        break;
      }
      let isValidSegment = true;
      for (let i = 0; i < valuesPerSegment; i += 1) {
        if (!Number.isFinite(Number(tokens[index + i]))) {
          isValidSegment = false;
          break;
        }
      }
      if (!isValidSegment) {
        break;
      }
      index += valuesPerSegment;
      count += 1;
      consumedAny = true;
    }
    return consumedAny;
  }

  while (index < tokens.length) {
    if (isCommandToken(tokens[index])) {
      command = tokens[index];
      index += 1;
      if (command === 'Z' || command === 'z') {
        continue;
      }
    } else if (!command) {
      break;
    }

    if (command === 'M' || command === 'm') {
      // MoveTo counts its first endpoint; additional pairs are implicit LineTo endpoints.
      consumeSegments(2);
      continue;
    }
    if (command === 'L' || command === 'l' || command === 'T' || command === 't') {
      consumeSegments(2);
      continue;
    }
    if (command === 'H' || command === 'h' || command === 'V' || command === 'v') {
      consumeSegments(1);
      continue;
    }
    if (command === 'Q' || command === 'q' || command === 'S' || command === 's') {
      consumeSegments(4);
      continue;
    }
    if (command === 'C' || command === 'c') {
      consumeSegments(6);
      continue;
    }
    if (command === 'A' || command === 'a') {
      consumeSegments(7);
      continue;
    }

    // Unknown command; stop parsing conservatively.
    break;
  }

  return Math.max(0, count);
}

function hasSvgCloseCommand(pathData) {
  if (typeof pathData !== 'string' || pathData.trim().length === 0) {
    return false;
  }
  const commandTokens = pathData.match(/[a-zA-Z]/g);
  if (!commandTokens) {
    return false;
  }
  for (let i = 0; i < commandTokens.length; i += 1) {
    const command = commandTokens[i];
    if (command === 'Z' || command === 'z') {
      return true;
    }
  }
  return false;
}

function computeTemplateClosedThreshold(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  const diagonal = Math.hypot(maxX - minX, maxY - minY);
  return Math.max(1e-3, diagonal * 0.02);
}

function trimPolylineByArcFraction(points, fraction = 0.5) {
  if (!Array.isArray(points) || points.length < 2) {
    return points;
  }
  const tFraction = clamp(Number(fraction), 0, 1);
  if (tFraction <= 0) {
    return [points[0], points[0]];
  }
  if (tFraction >= 1) {
    return points;
  }

  const segmentLengths = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segmentLength = Math.hypot(dx, dy);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }
  if (totalLength < 1e-8) {
    return points;
  }

  const targetLength = totalLength * tFraction;
  const out = [{ x: points[0].x, y: points[0].y }];
  let traversed = 0;

  for (let i = 0; i < segmentLengths.length; i += 1) {
    const segmentLength = segmentLengths[i];
    if (segmentLength < 1e-8) {
      continue;
    }
    const nextTraversed = traversed + segmentLength;
    const p0 = points[i];
    const p1 = points[i + 1];

    if (nextTraversed < targetLength - 1e-8) {
      out.push({ x: p1.x, y: p1.y });
      traversed = nextTraversed;
      continue;
    }

    const localDistance = clamp(targetLength - traversed, 0, segmentLength);
    const localT = segmentLength < 1e-8 ? 0 : localDistance / segmentLength;
    const cutPoint = {
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
    };

    const previous = out[out.length - 1];
    if (Math.hypot(previous.x - cutPoint.x, previous.y - cutPoint.y) > 1e-8) {
      out.push(cutPoint);
    }

    if (out.length < 2) {
      out.push({ x: p1.x, y: p1.y });
    }
    return out;
  }

  return out.length >= 2 ? out : points;
}

function maybeOpenClosedSvgTemplate(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const closeThreshold = computeTemplateClosedThreshold(points);
  const isClosed = Math.hypot(last.x - first.x, last.y - first.y) <= closeThreshold;
  if (!isClosed) {
    return points;
  }

  // Remove duplicated closing endpoint if present.
  let openPoints = points;
  if (points.length > 3) {
    openPoints = points.slice(0, -1);
  }

  // Closed contour paths can look doubled when used as branch centerlines.
  // Keep only the first half by traveled arc-length.
  const trimmed = trimPolylineByArcFraction(openPoints, 0.5);
  return Array.isArray(trimmed) && trimmed.length >= 2 ? trimmed : openPoints;
}

function getTemplateHeadingVector(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return { x: 1, y: 0 };
  }

  const first = points[0];
  const last = points[points.length - 1];
  let dx = last.x - first.x;
  let dy = last.y - first.y;
  if (Math.hypot(dx, dy) > 1e-6) {
    return { x: dx, y: dy };
  }

  let bestIndex = 1;
  let bestDistanceSq = -1;
  for (let i = 1; i < points.length; i += 1) {
    const cx = points[i].x - first.x;
    const cy = points[i].y - first.y;
    const distSq = cx * cx + cy * cy;
    if (distSq > bestDistanceSq) {
      bestDistanceSq = distSq;
      bestIndex = i;
    }
  }
  dx = points[bestIndex].x - first.x;
  dy = points[bestIndex].y - first.y;
  if (Math.hypot(dx, dy) > 1e-6) {
    return { x: dx, y: dy };
  }

  for (let i = 1; i < points.length; i += 1) {
    dx = points[i].x - points[i - 1].x;
    dy = points[i].y - points[i - 1].y;
    if (Math.hypot(dx, dy) > 1e-6) {
      return { x: dx, y: dy };
    }
  }

  return { x: 1, y: 0 };
}

function normalizeTemplateRotationDeg(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Number.isFinite(fallback) ? fallback : 0;
  }
  return numeric;
}

function createManualTemplateEntry(points, meta = {}) {
  const sanitizedPoints = sanitizeManualTemplatePoints(points);
  if (!sanitizedPoints) {
    return null;
  }

  const id = typeof meta.id === 'string' && meta.id.trim().length > 0
    ? meta.id.trim()
    : `template-${Number.isFinite(meta.index) ? meta.index : 0}`;
  const label = typeof meta.label === 'string' && meta.label.trim().length > 0
    ? meta.label.trim()
    : id;
  const sourceType = typeof meta.sourceType === 'string' && meta.sourceType.trim().length > 0
    ? meta.sourceType.trim()
    : 'points';
  const rotationDeg = normalizeTemplateRotationDeg(meta.rotationDeg, 0);
  const autoOpenClosedPath = meta.autoOpenClosedPath !== false;
  const processedPoints = (
    autoOpenClosedPath &&
    (sourceType === 'svgFile' || sourceType === 'svgPathD')
  )
    ? maybeOpenClosedSvgTemplate(sanitizedPoints)
    : sanitizedPoints;
  const rawTargetPointCount = Number(meta.targetPointCount);
  const targetPointCount = Number.isFinite(rawTargetPointCount) && rawTargetPointCount >= 2
    ? Math.round(rawTargetPointCount)
    : null;
  const targetPointCountIsExplicit = meta.targetPointCountIsExplicit === true;
  const trimRatio = (
    Array.isArray(sanitizedPoints) &&
    sanitizedPoints.length >= 2 &&
    Array.isArray(processedPoints) &&
    processedPoints.length >= 2
  )
    ? processedPoints.length / sanitizedPoints.length
    : 1;
  const effectiveTargetPointCount = (
    targetPointCount &&
    !targetPointCountIsExplicit &&
    trimRatio < 0.95
  )
    ? Math.max(2, Math.round(targetPointCount * trimRatio))
    : targetPointCount;
  const finalPoints = effectiveTargetPointCount
    ? resampleTemplateToPointCount(processedPoints, effectiveTargetPointCount)
    : processedPoints;

  return {
    id,
    label,
    sourceType,
    rotationDeg,
    points: finalPoints,
  };
}

function normalizeManualTemplateConfigEntry(candidate, index = 0) {
  if (Array.isArray(candidate)) {
    return createManualTemplateEntry(candidate, {
      id: `config-template-${index}`,
      label: `Config Template ${index}`,
      sourceType: 'points',
      index,
    });
  }

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  if (candidate.enabled === false) {
    return null;
  }

  return createManualTemplateEntry(candidate.points, {
    id: candidate.id || `config-template-${index}`,
    label: candidate.label || `Config Template ${index}`,
    sourceType: candidate.sourceType || 'points',
    rotationDeg: candidate.rotationDeg,
    targetPointCount: candidate.targetPointCount,
    targetPointCountIsExplicit: candidate.targetPointCount !== undefined,
    autoOpenClosedPath: candidate.autoOpenClosedPath,
    index,
  });
}

function distancePointToSegment(point, segmentStart, segmentEnd) {
  const vx = segmentEnd.x - segmentStart.x;
  const vy = segmentEnd.y - segmentStart.y;
  const wx = point.x - segmentStart.x;
  const wy = point.y - segmentStart.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }
  const c2 = vx * vx + vy * vy;
  if (c2 <= 1e-8) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }
  if (c2 <= c1) {
    return Math.hypot(point.x - segmentEnd.x, point.y - segmentEnd.y);
  }
  const b = c1 / c2;
  const proj = {
    x: segmentStart.x + b * vx,
    y: segmentStart.y + b * vy,
  };
  return Math.hypot(point.x - proj.x, point.y - proj.y);
}

function sampleSvgPathElementAdaptive(pathElement, options = {}) {
  const tolerance = Number.isFinite(options.tolerance) ? Math.max(0.05, options.tolerance) : 1.2;
  const maxDepth = Number.isFinite(options.maxDepth) ? clamp(Math.floor(options.maxDepth), 1, 20) : 12;
  const maxPoints = Number.isFinite(options.maxPoints) ? clamp(Math.floor(options.maxPoints), 8, 10000) : 2000;
  const minSegmentLength = Number.isFinite(options.minSegmentLength)
    ? Math.max(0.01, options.minSegmentLength)
    : 0.3;

  let totalLength = 0;
  try {
    totalLength = pathElement.getTotalLength();
  } catch (error) {
    return null;
  }
  if (!Number.isFinite(totalLength) || totalLength < 1e-6) {
    return null;
  }

  function pointAtLength(length) {
    const point = pathElement.getPointAtLength(clamp(length, 0, totalLength));
    return { x: point.x, y: point.y };
  }

  const startPoint = pointAtLength(0);
  const endPoint = pointAtLength(totalLength);
  const out = [startPoint];
  let aborted = false;

  function recurse(l0, p0, l1, p1, depth) {
    if (aborted) {
      return;
    }
    if (out.length >= maxPoints) {
      out.push(p1);
      aborted = true;
      return;
    }

    const span = l1 - l0;
    const midLength = l0 + span * 0.5;
    const midPoint = pointAtLength(midLength);
    const flatness = distancePointToSegment(midPoint, p0, p1);
    const shouldSplit = (
      depth < maxDepth &&
      span > minSegmentLength &&
      flatness > tolerance
    );

    if (shouldSplit) {
      recurse(l0, p0, midLength, midPoint, depth + 1);
      recurse(midLength, midPoint, l1, p1, depth + 1);
      return;
    }

    out.push(p1);
  }

  recurse(0, startPoint, totalLength, endPoint, 0);

  const cleaned = [];
  for (let i = 0; i < out.length; i += 1) {
    const point = out[i];
    if (cleaned.length === 0) {
      cleaned.push(point);
      continue;
    }
    const previous = cleaned[cleaned.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) > 1e-6) {
      cleaned.push(point);
    }
  }

  return cleaned.length >= 2 ? cleaned : null;
}

function convertSvgPathDToTemplatePoints(pathData, options = {}) {
  if (typeof pathData !== 'string' || pathData.trim().length === 0) {
    return null;
  }
  if (typeof document === 'undefined' || !document.createElementNS || !document.body) {
    return null;
  }

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', pathData);
  if (typeof options.transform === 'string' && options.transform.trim().length > 0) {
    path.setAttribute('transform', options.transform);
  }
  svg.appendChild(path);
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.opacity = '0';
  svg.style.pointerEvents = 'none';

  document.body.appendChild(svg);
  let sampled = null;
  try {
    sampled = sampleSvgPathElementAdaptive(path, options);
  } catch (error) {
    sampled = null;
  }
  svg.remove();

  return sanitizeManualTemplatePoints(sampled);
}

function extractFirstPathDataFromSvgText(svgText) {
  if (typeof svgText !== 'string' || svgText.trim().length === 0) {
    return null;
  }
  if (typeof DOMParser !== 'function') {
    return null;
  }
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgText, 'image/svg+xml');
  if (documentNode.querySelector('parsererror')) {
    return null;
  }

  const firstPath = documentNode.querySelector('path[d]');
  if (!firstPath) {
    return null;
  }

  const d = firstPath.getAttribute('d');
  if (typeof d !== 'string' || d.trim().length === 0) {
    return null;
  }

  return {
    d,
    transform: firstPath.getAttribute('transform') || '',
    anchorPointCount: countSvgPathAnchorPoints(d),
  };
}

async function resolveManualTemplateSource(source, index = 0) {
  const sourceType = typeof source.sourceType === 'string' ? source.sourceType : '';
  if (sourceType === 'points') {
    return {
      points: sanitizeManualTemplatePoints(source.points),
      inferredPointCount: null,
    };
  }

  if (sourceType === 'svgPathD') {
    const d = typeof source.d === 'string' ? source.d : '';
    return {
      points: convertSvgPathDToTemplatePoints(d),
      inferredPointCount: countSvgPathAnchorPoints(d),
      isClosed: hasSvgCloseCommand(d),
    };
  }

  if (sourceType === 'svgFile') {
    if (typeof fetch !== 'function') {
      throw new Error('fetch is unavailable for svgFile sources.');
    }
    const src = typeof source.src === 'string' ? source.src : '';
    if (src.trim().length === 0) {
      throw new Error('svgFile source is missing src.');
    }
    const response = await fetch(normalizeHostedAssetPath(src));
    if (!response.ok) {
      throw new Error(`failed to fetch "${src}" (${response.status}).`);
    }
    const svgText = await response.text();
    const pathData = extractFirstPathDataFromSvgText(svgText);
    if (!pathData) {
      throw new Error(`no valid <path d> found in "${src}".`);
    }
    return {
      points: convertSvgPathDToTemplatePoints(pathData.d, {
        transform: pathData.transform,
      }),
      inferredPointCount: pathData.anchorPointCount,
      isClosed: hasSvgCloseCommand(pathData.d),
    };
  }

  throw new Error(`unsupported sourceType "${sourceType || 'unknown'}" at index ${index}.`);
}

async function loadManualTemplateSources(options = {}) {
  const { force = false } = options;
  if (STATE.manualTemplateRegistryLoaded && !force) {
    return STATE.manualTemplateRegistryTemplates;
  }

  const sourceList = Array.isArray(window.STEM_MANUAL_TEMPLATE_SOURCES)
    ? window.STEM_MANUAL_TEMPLATE_SOURCES
    : [];
  const resolvedTemplates = [];
  const warnings = [];

  for (let i = 0; i < sourceList.length; i += 1) {
    const source = sourceList[i];
    if (!source || typeof source !== 'object') {
      continue;
    }
    if (source.enabled === false) {
      continue;
    }

    const sourceLabel = typeof source.id === 'string' && source.id.length > 0
      ? source.id
      : `template-source-${i}`;

    try {
      const resolved = await resolveManualTemplateSource(source, i);
      const templatePoints = resolved && typeof resolved === 'object'
        ? resolved.points
        : null;
      const inferredPointCount = resolved && typeof resolved === 'object'
        ? resolved.inferredPointCount
        : null;
      const hasExplicitTargetPointCount = Number.isFinite(Number(source.targetPointCount));
      const targetPointCount = hasExplicitTargetPointCount
        ? Number(source.targetPointCount)
        : inferredPointCount;
      const templateEntry = createManualTemplateEntry(templatePoints, {
        id: source.id || sourceLabel,
        label: source.label || sourceLabel,
        sourceType: source.sourceType || 'points',
        rotationDeg: source.rotationDeg,
        autoOpenClosedPath: source.autoOpenClosedPath,
        targetPointCount,
        targetPointCountIsExplicit: hasExplicitTargetPointCount,
        index: i,
      });
      if (templateEntry) {
        resolvedTemplates.push(templateEntry);
      } else {
        const message = `${sourceLabel}: source resolved to no template points.`;
        warnings.push(message);
        console.warn('[ManualTemplate]', message);
      }
    } catch (error) {
      const message = `${sourceLabel}: ${error.message}`;
      warnings.push(message);
      console.warn('[ManualTemplate]', message);
    }
  }

  STATE.manualTemplateRegistryTemplates = resolvedTemplates;
  STATE.manualTemplateRegistryWarnings = warnings;
  STATE.manualTemplateRegistryLoaded = true;
  return resolvedTemplates;
}

function getResolvedManualTemplateEntries() {
  const out = [];

  // Keep generate_manual_points() as fixed template index 0.
  const generated = createManualTemplateEntry(generate_manual_points(), {
    id: 'generate-manual-points',
    label: 'generate_manual_points()',
    sourceType: 'generated',
    rotationDeg: 0,
    index: 0,
  });
  if (generated) {
    out.push(generated);
  }

  const registryTemplates = Array.isArray(STATE.manualTemplateRegistryTemplates)
    ? STATE.manualTemplateRegistryTemplates
    : [];
  for (let i = 0; i < registryTemplates.length; i += 1) {
    const template = registryTemplates[i];
    if (Array.isArray(template)) {
      const legacy = createManualTemplateEntry(template, {
        id: `registry-template-${i}`,
        label: `Registry Template ${i}`,
        sourceType: 'points',
        index: i,
      });
      if (legacy) {
        out.push(legacy);
      }
      continue;
    }
    if (!template || typeof template !== 'object') {
      continue;
    }
    const entry = createManualTemplateEntry(template.points, {
      id: template.id || `registry-template-${i}`,
      label: template.label || `Registry Template ${i}`,
      sourceType: template.sourceType || 'points',
      rotationDeg: template.rotationDeg,
      index: i,
    });
    if (entry) {
      out.push(entry);
    }
  }

  const config = CONFIG.pathGeneration || {};
  const inputTemplates = Array.isArray(config.manualTemplates) ? config.manualTemplates : [];
  for (let i = 0; i < inputTemplates.length; i += 1) {
    const template = normalizeManualTemplateConfigEntry(inputTemplates[i], i);
    if (template) {
      out.push(template);
    }
  }

  return out;
}

function getSanitizedManualTemplates() {
  const entries = getResolvedManualTemplateEntries();
  const out = [];
  for (let i = 0; i < entries.length; i += 1) {
    out.push(entries[i].points);
  }
  return out;
}

function getManualTemplateDescriptors() {
  const entries = getResolvedManualTemplateEntries();
  const out = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    out.push({
      index: i,
      id: entry.id,
      label: entry.label,
      sourceType: entry.sourceType,
      rotationDeg: entry.rotationDeg,
      pointCount: entry.points.length,
    });
  }
  return out;
}

function resampleTemplateToPointCount(template, targetCount) {
  if (!Array.isArray(template) || template.length < 2) {
    return template;
  }

  const resolvedTarget = Math.max(2, Math.floor(Number(targetCount) || 0));
  if (resolvedTarget === template.length) {
    return template;
  }

  const segments = [];
  const cumulative = [0];
  let totalLength = 0;

  for (let i = 0; i < template.length - 1; i += 1) {
    const start = template[i];
    const end = template[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-8) {
      continue;
    }
    segments.push({ start, dx, dy, length });
    totalLength += length;
    cumulative.push(totalLength);
  }

  if (segments.length === 0 || totalLength < 1e-8) {
    const fallback = template[0];
    const out = [];
    for (let i = 0; i < resolvedTarget; i += 1) {
      out.push({ x: fallback.x, y: fallback.y });
    }
    return out;
  }

  const out = [];
  let segmentIndex = 0;
  for (let i = 0; i < resolvedTarget; i += 1) {
    const t = resolvedTarget <= 1 ? 0 : i / (resolvedTarget - 1);
    const distance = t * totalLength;

    while (
      segmentIndex < segments.length - 1 &&
      distance > cumulative[segmentIndex + 1]
    ) {
      segmentIndex += 1;
    }

    const segment = segments[segmentIndex];
    const segmentStartDistance = cumulative[segmentIndex];
    const localDistance = Math.max(0, distance - segmentStartDistance);
    const localT = segment.length < 1e-8 ? 0 : clamp(localDistance / segment.length, 0, 1);

    out.push({
      x: segment.start.x + segment.dx * localT,
      y: segment.start.y + segment.dy * localT,
    });
  }

  return out;
}

function ensureTemplateMinControlPoints(template, minCount) {
  if (!Array.isArray(template) || template.length < 2) {
    return template;
  }

  const targetCount = Math.max(2, Math.floor(Number(minCount) || 0));
  if (template.length >= targetCount) {
    return template;
  }
  return resampleTemplateToPointCount(template, targetCount);
}

function resolveTemplateScaleRange(templateConfig = CONFIG.pathGeneration || {}) {
  const fallbackScale = Number.isFinite(templateConfig.templateScale)
    ? Math.max(0, templateConfig.templateScale)
    : 1;

  let minScale = Number.isFinite(templateConfig.templateScaleRangeMin)
    ? Math.max(0, templateConfig.templateScaleRangeMin)
    : fallbackScale;
  let maxScale = Number.isFinite(templateConfig.templateScaleRangeMax)
    ? Math.max(0, templateConfig.templateScaleRangeMax)
    : fallbackScale;

  if (minScale > maxScale) {
    const tmp = minScale;
    minScale = maxScale;
    maxScale = tmp;
  }

  return { minScale, maxScale };
}

function resolvePerBranchTemplateScale(stableKey = '', templateConfig = CONFIG.pathGeneration || {}) {
  const foliageScale = resolveGlobalFoliageScale();
  const { minScale, maxScale } = resolveTemplateScaleRange(templateConfig);
  if (Math.abs(maxScale - minScale) < 1e-8) {
    return minScale * foliageScale;
  }
  const rng = mulberry32(hashSeed(`${stableKey}|template-scale`));
  return (minScale + (maxScale - minScale) * rng()) * foliageScale;
}

function resolvePathGenerationBaseRotationRad(templateConfig = CONFIG.pathGeneration || {}) {
  const numericDeg = Number(templateConfig.baseRotationDeg);
  if (!Number.isFinite(numericDeg)) {
    return 0;
  }
  const clampedDeg = clamp(numericDeg, -180, 180);
  return clampedDeg * Math.PI / 180;
}

function resolveSignedBaseRotationRadForBranch(
  direction = -1,
  branchProfile = {},
  templateConfig = CONFIG.pathGeneration || {},
) {
  const baseRotationRad = resolvePathGenerationBaseRotationRad(templateConfig);
  if (Math.abs(baseRotationRad) <= 1e-10) {
    return 0;
  }
  const sideSignSource = Number.isFinite(branchProfile.rootDirection)
    ? branchProfile.rootDirection
    : direction;
  const sideSign = sideSignSource >= 0 ? 1 : -1;
  return baseRotationRad * sideSign;
}

function resolveManualTemplateIndex(templateCount, stableKey = '', preferredIndex = null) {
  if (!Number.isFinite(templateCount) || templateCount < 1) {
    return -1;
  }

  if (Number.isFinite(preferredIndex)) {
    return clamp(Math.floor(preferredIndex), 0, templateCount - 1);
  }

  const config = CONFIG.pathGeneration || {};
  if (config.templatePickMode === 'fixed') {
    const fixed = Number.isFinite(config.fixedTemplateIndex) ? config.fixedTemplateIndex : 0;
    return clamp(Math.floor(fixed), 0, templateCount - 1);
  }

  if (config.templatePickDeterministic) {
    const rng = mulberry32(hashSeed(`${stableKey}|manual-template`));
    return clamp(Math.floor(rng() * templateCount), 0, templateCount - 1);
  }

  return clamp(Math.floor(Math.random() * templateCount), 0, templateCount - 1);
}

function getTemplateNoiseOffset(
  time,
  direction = -1,
  noiseConfig = CONFIG.noise,
  noisePhase = { x1: 0, y1: 0, x2: 0, y2: 0 },
  noiseScaleMultiplier = 1,
  directionalBasis = null,
  noiseAmount = 0,
  layerSeed = 0,
  directionalBias = 0,
  axisAbsFlags = null,
) {
  const layerOffsetA = layerSeed * 27183.331;
  const layerOffsetB = layerSeed * 93841.719;
  const x1 = time / noiseConfig.stepSize + noisePhase.x1 + layerOffsetA;
  const y1 = time / noiseConfig.stepSize + noisePhase.y1 + layerOffsetB;
  const x2 = x1 + 94827 + noisePhase.x2 + layerOffsetB * 0.37;
  const y2 = y1 + 53977 + noisePhase.y2 + layerOffsetA * 0.53;

  const n1 = sampleNoise2(x1, y1);
  const n2 = sampleNoise2(x2, y2);

  const bias = normalizeTemplateNoiseDirectionalBias(directionalBias, 0);
  const resolvedAxisAbsFlags = axisAbsFlags || resolvePathNoiseAxisAbsFlags();
  const lateralAbsOrSigned = blendSignedNoiseWithAbsolute(n1, resolvedAxisAbsFlags.xAbsBlend);
  const forwardAbsOrSigned = blendSignedNoiseWithAbsolute(n2, resolvedAxisAbsFlags.yAbsBlend);
  const lateralSample = n1 * (1 - bias) + lateralAbsOrSigned * bias;
  const forwardSample = n2 * (1 - bias) + forwardAbsOrSigned * bias;
  const lateralMagnitude = lateralSample * noiseAmount * noiseScaleMultiplier;
  const forwardMagnitude = forwardSample * noiseAmount * noiseScaleMultiplier;

  if (directionalBasis) {
    return {
      dx: directionalBasis.lateral.x * lateralMagnitude + directionalBasis.forward.x * forwardMagnitude,
      dy: directionalBasis.lateral.y * lateralMagnitude + directionalBasis.forward.y * forwardMagnitude,
    };
  }

  return {
    dx: lateralMagnitude * direction,
    dy: forwardMagnitude * -1,
  };
}

// =========================
// 5) Branch Generation
// =========================
function getNoiseDelta(
  time,
  direction = -1,
  noiseConfig = CONFIG.noise,
  noisePhase = { x1: 0, y1: 0, x2: 0, y2: 0 },
  noiseScaleMultiplier = 1,
  directionalBasis = null,
  axisAbsFlags = null,
) {
  const x1 = time / noiseConfig.stepSize + noisePhase.x1;
  const y1 = time / noiseConfig.stepSize + noisePhase.y1;
  const x2 = x1 + 4895943 + noisePhase.x2;
  const y2 = y1 + 4838485943 + noisePhase.y2;

  const n1 = sampleNoise2(x1, y1);
  const n2 = sampleNoise2(x2, y2);

  const resolvedAxisAbsFlags = axisAbsFlags || resolvePathNoiseAxisAbsFlags();
  const lateralMagnitude = blendSignedNoiseWithAbsolute(
    n1,
    resolvedAxisAbsFlags.xAbsBlend,
  ) * noiseConfig.scale * noiseScaleMultiplier;
  const forwardMagnitude = blendSignedNoiseWithAbsolute(
    n2,
    resolvedAxisAbsFlags.yAbsBlend,
  ) * noiseConfig.scale * noiseScaleMultiplier;

  if (directionalBasis) {
    return {
      dx: directionalBasis.lateral.x * lateralMagnitude + directionalBasis.forward.x * forwardMagnitude,
      dy: directionalBasis.lateral.y * lateralMagnitude + directionalBasis.forward.y * forwardMagnitude,
    };
  }

  return {
    dx: lateralMagnitude * direction,
    dy: forwardMagnitude * -1,
  };
}

/*
  Generates one random-noise branch control-point list.
  Returns both points and the updated time cursor so each branch can keep its
  own independent generation timeline.
*/

function generate_manual_points() {
  const generated = [];
  const x0 = 200;
  const y0 = 500;
  const d = 25;

  generated.push({ x: x0 + 8 * d, y: y0 + 2 * d });
  generated.push({ x: x0 + 6 * d, y: y0 + 4 * d });
  generated.push({ x: x0 + 5 * d, y: y0 + 4 * d });
  generated.push({ x: x0 + 4 * d, y: y0 + 4 * d });
  generated.push({ x: x0 + 3 * d, y: y0 + 5 * d });
  generated.push({ x: x0 + 1 * d, y: y0 + 4 * d });
  generated.push({ x: x0 - 3 * d, y: y0 - 4 * d });
  generated.push({ x: x0 - 4 * d, y: y0 - 5 * d });
  generated.push({ x: x0 - 6 * d, y: y0 - 5 * d });
  generated.push({ x: x0 - 6.5 * d, y: y0 - 6 * d });

  return generated;
}

function generateBranchControlPoints(
  startX,
  startY,
  direction,
  initialTime,
  noiseConfig = CONFIG.noise,
  branchProfile = {},
) {
  let simX = startX;
  let simY = startY;
  let timeCursor = initialTime;
  const points = [{ x: simX, y: simY }];

  const noisePhase = branchProfile.noisePhase || { x1: 0, y1: 0, x2: 0, y2: 0 };
  const noiseScaleMultiplier = Number.isFinite(branchProfile.noiseScaleMultiplier)
    ? branchProfile.noiseScaleMultiplier
    : 1;
  const directionalBasis = getDirectionalBasis(branchProfile.growthDir, direction);
  const axisAbsFlags = resolvePathNoiseAxisAbsFlags(CONFIG.pathGeneration || {});
  const baseRotationRad = resolveSignedBaseRotationRadForBranch(
    direction,
    branchProfile,
    CONFIG.pathGeneration || {},
  );

  for (let i = 0; i < noiseConfig.checkpointCount; i += 1) {
    for (let j = 0; j < noiseConfig.checkpointSpacingSteps; j += 1) {
      timeCursor += noiseConfig.timeStep;
      const delta = getNoiseDelta(
        timeCursor,
        direction,
        noiseConfig,
        noisePhase,
        noiseScaleMultiplier,
        directionalBasis,
        axisAbsFlags,
      );
      simX += delta.dx;
      simY += delta.dy;
    }
    points.push({ x: simX, y: simY });
  }

  const rotatedPoints = rotatePointsAroundAnchor(points, startX, startY, baseRotationRad);

  return {
    points: rotatedPoints,
    endTime: timeCursor,
  };
}

function generateTemplateControlPoints(
  startX,
  startY,
  direction,
  initialTime,
  noiseConfig = CONFIG.noise,
  branchProfile = {},
  stableKey = '',
  preferredTemplateIndex = null,
) {
  const templateEntries = getResolvedManualTemplateEntries();
  if (templateEntries.length === 0) {
    return generateBranchControlPoints(
      startX,
      startY,
      direction,
      initialTime,
      noiseConfig,
      branchProfile,
    );
  }

  const templateIndex = resolveManualTemplateIndex(
    templateEntries.length,
    stableKey,
    preferredTemplateIndex,
  );
  const templateEntry = templateEntries[templateIndex >= 0 ? templateIndex : 0];
  const templateBase = templateEntry.points;
  const templateRotationRad = normalizeTemplateRotationDeg(templateEntry.rotationDeg, 0) * Math.PI / 180;
  const templateConfig = CONFIG.pathGeneration || {};
  const axisAbsFlags = resolvePathNoiseAxisAbsFlags(templateConfig);
  const inheritCheckpointSpacing = templateConfig.templateInheritCheckpointSpacingSteps !== false;
  const requiredTemplatePoints = Math.max(
    2,
    Math.floor(
      Number.isFinite(noiseConfig.checkpointSpacingSteps)
        ? noiseConfig.checkpointSpacingSteps
        : templateBase.length,
    ),
  );
  const template = inheritCheckpointSpacing
    ? ensureTemplateMinControlPoints(templateBase, requiredTemplatePoints)
    : templateBase;

  const noisePhase = branchProfile.noisePhase || { x1: 0, y1: 0, x2: 0, y2: 0 };
  const noiseScaleMultiplier = Number.isFinite(branchProfile.noiseScaleMultiplier)
    ? branchProfile.noiseScaleMultiplier
    : 1;
  const directionalBasis = getDirectionalBasis(branchProfile.growthDir, direction);

  const baseNoiseStep = Number.isFinite(noiseConfig.timeStep) && noiseConfig.timeStep > 0
    ? noiseConfig.timeStep
    : 1 / 300;
  const noiseAmount1 = Math.max(0, Number(templateConfig.templateNoiseAmount) || 0);
  const noiseStep1 = Number.isFinite(templateConfig.templateNoiseStep) && templateConfig.templateNoiseStep > 0
    ? templateConfig.templateNoiseStep
    : baseNoiseStep;
  const noiseAmount2 = Math.max(0, Number(templateConfig.templateNoiseAmount2) || 0);
  const noiseStep2 = Number.isFinite(templateConfig.templateNoiseStep2) && templateConfig.templateNoiseStep2 > 0
    ? templateConfig.templateNoiseStep2
    : baseNoiseStep;
  const noiseAmount3 = Math.max(0, Number(templateConfig.templateNoiseAmount3) || 0);
  const noiseStep3 = Number.isFinite(templateConfig.templateNoiseStep3) && templateConfig.templateNoiseStep3 > 0
    ? templateConfig.templateNoiseStep3
    : baseNoiseStep;
  const noiseHighpassWindow3 = normalizeTemplateNoiseHighpassWindow(
    Number(templateConfig.templateNoiseHighpassWindow3),
    7,
  );
  const directionalBias = normalizeTemplateNoiseDirectionalBias(
    Number(templateConfig.templateNoiseDirectionalBias),
    0,
  );
  const templateNoiseLayers = [];
  if (noiseAmount1 > 0) {
    templateNoiseLayers.push({ amount: noiseAmount1, step: noiseStep1, layerSeed: 0 });
  }
  if (noiseAmount2 > 0) {
    templateNoiseLayers.push({ amount: noiseAmount2, step: noiseStep2, layerSeed: 1 });
  }
  const shouldAlign = templateConfig.alignTemplateToGrowth !== false;
  const globalTemplateScale = resolvePerBranchTemplateScale(stableKey, templateConfig);
  const branchTemplateScale = Number.isFinite(branchProfile.templateScaleMultiplier)
    ? Math.max(0, branchProfile.templateScaleMultiplier)
    : 1;
  const templateScale = globalTemplateScale * branchTemplateScale;
  // Positive direction branches (left side seeds) mirror horizontally.
  const mirrorX = direction >= 0 ? -1 : 1;

  const first = template[0];
  const headingSource = getTemplateHeadingVector(template);
  // Align uses the source heading before per-template rotation so rotationDeg
  // remains an explicit per-template orientation control.
  const unmirroredHeading = {
    x: headingSource.x * templateScale,
    y: headingSource.y * templateScale,
  };
  const templateHeading = normalize({
    x: unmirroredHeading.x * mirrorX,
    y: unmirroredHeading.y,
  });
  const targetHeading = normalize(
    branchProfile.growthDir && Number.isFinite(branchProfile.growthDir.x) && Number.isFinite(branchProfile.growthDir.y)
      ? branchProfile.growthDir
      : { x: direction, y: -1 },
  );

  let rotation = 0;
  if (shouldAlign) {
    const cross = templateHeading.x * targetHeading.y - templateHeading.y * targetHeading.x;
    const dot = templateHeading.x * targetHeading.x + templateHeading.y * targetHeading.y;
    rotation = Math.atan2(cross, dot);
  }

  const layerTimeCursors = new Array(templateNoiseLayers.length).fill(initialTime);
  const layer3RawOffsets = [];
  let layer3TimeCursor = initialTime;
  const points = [];
  for (let i = 0; i < template.length; i += 1) {
    const localUnrotated = {
      x: (template[i].x - first.x) * templateScale,
      y: (template[i].y - first.y) * templateScale,
    };
    // Per-template rotation is applied before side mirroring.
    const localRotated = rotateVector(localUnrotated, templateRotationRad);
    const local = {
      x: localRotated.x * mirrorX,
      y: localRotated.y,
    };

    const aligned = shouldAlign ? rotateVector(local, rotation) : local;
    let point = {
      x: startX + aligned.x,
      y: startY + aligned.y,
    };

    // Keep the first point pinned to the seed; noise only perturbs subsequent checkpoints.
    if (templateNoiseLayers.length > 0 && i > 0) {
      let totalDx = 0;
      let totalDy = 0;
      for (let layerIndex = 0; layerIndex < templateNoiseLayers.length; layerIndex += 1) {
        const layer = templateNoiseLayers[layerIndex];
        layerTimeCursors[layerIndex] += layer.step;
        const noiseOffset = getTemplateNoiseOffset(
          layerTimeCursors[layerIndex] + i * 0.1618,
          direction,
          noiseConfig,
          noisePhase,
          noiseScaleMultiplier,
          directionalBasis,
          layer.amount,
          layer.layerSeed,
          directionalBias,
          axisAbsFlags,
        );
        totalDx += noiseOffset.dx;
        totalDy += noiseOffset.dy;
      }
      point = {
        x: point.x + totalDx,
        y: point.y + totalDy,
      };
    }

    if (noiseAmount3 > 0 && i > 0) {
      layer3TimeCursor += noiseStep3;
      layer3RawOffsets[i] = getTemplateNoiseOffset(
        layer3TimeCursor + i * 0.1618,
        direction,
        noiseConfig,
        noisePhase,
        noiseScaleMultiplier,
        directionalBasis,
        noiseAmount3,
        2,
        directionalBias,
        axisAbsFlags,
      );
    } else {
      layer3RawOffsets[i] = { dx: 0, dy: 0 };
    }

    points.push(point);
  }

  if (noiseAmount3 > 0 && points.length > 1) {
    const radius = Math.floor(noiseHighpassWindow3 / 2);
    const last = points.length - 1;
    for (let i = 1; i <= last; i += 1) {
      const start = Math.max(1, i - radius);
      const end = Math.min(last, i + radius);
      let sumDx = 0;
      let sumDy = 0;
      let count = 0;
      for (let j = start; j <= end; j += 1) {
        sumDx += layer3RawOffsets[j].dx;
        sumDy += layer3RawOffsets[j].dy;
        count += 1;
      }
      const baselineDx = count > 0 ? sumDx / count : 0;
      const baselineDy = count > 0 ? sumDy / count : 0;
      const detailDx = layer3RawOffsets[i].dx - baselineDx;
      const detailDy = layer3RawOffsets[i].dy - baselineDy;
      points[i] = {
        x: points[i].x + detailDx,
        y: points[i].y + detailDy,
      };
    }
  }

  let endTime = initialTime;
  for (let i = 0; i < layerTimeCursors.length; i += 1) {
    if (layerTimeCursors[i] > endTime) {
      endTime = layerTimeCursors[i];
    }
  }
  if (noiseAmount3 > 0 && layer3TimeCursor > endTime) {
    endTime = layer3TimeCursor;
  }

  const baseRotationRad = resolveSignedBaseRotationRadForBranch(
    direction,
    branchProfile,
    templateConfig,
  );
  const rotatedPoints = rotatePointsAroundAnchor(points, startX, startY, baseRotationRad);

  return {
    points: rotatedPoints,
    endTime,
    templateIndex,
  };
}

// =========================
// 6) Curve Smoothing
// =========================
function sampleCubicBezier(p0, p1, p2, p3, subdivisions) {
  const samples = [];
  const count = Math.max(2, subdivisions);

  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const mt = 1 - t;

    samples.push({
      x:
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x,
      y:
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y,
    });
  }

  return samples;
}

function buildBSplinePolyline(controlPoints, subdivisionsPerSpan = 10) {
  if (!Array.isArray(controlPoints) || controlPoints.length < 2) {
    return [];
  }

  const extended = [
    controlPoints[0],
    controlPoints[0],
    ...controlPoints,
    controlPoints[controlPoints.length - 1],
    controlPoints[controlPoints.length - 1],
  ];

  const result = [];

  for (let i = 0; i <= extended.length - 4; i += 1) {
    const p0 = extended[i];
    const p1 = extended[i + 1];
    const p2 = extended[i + 2];
    const p3 = extended[i + 3];

    const start = {
      x: (p0.x + 4 * p1.x + p2.x) / 6,
      y: (p0.y + 4 * p1.y + p2.y) / 6,
    };
    const cp1 = {
      x: (4 * p1.x + 2 * p2.x) / 6,
      y: (4 * p1.y + 2 * p2.y) / 6,
    };
    const cp2 = {
      x: (2 * p1.x + 4 * p2.x) / 6,
      y: (2 * p1.y + 4 * p2.y) / 6,
    };
    const end = {
      x: (p1.x + 4 * p2.x + p3.x) / 6,
      y: (p1.y + 4 * p2.y + p3.y) / 6,
    };

    const sampled = sampleCubicBezier(start, cp1, cp2, end, subdivisionsPerSpan);

    for (let j = 0; j < sampled.length; j += 1) {
      if (result.length > 0 && j === 0) {
        continue;
      }
      result.push(sampled[j]);
    }
  }

  return result;
}

// =========================
// 7) Arc-Length Path Data
// =========================
function createPathData(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const segments = [];
  const cumulative = [0];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length < 1e-8) {
      continue;
    }

    segments.push({
      start,
      dx,
      dy,
      length,
      tangent: { x: dx / length, y: dy / length },
    });

    totalLength += length;
    cumulative.push(totalLength);
  }

  if (segments.length === 0) {
    return null;
  }

  return {
    points,
    segments,
    cumulative,
    totalLength,
  };
}

function findSegmentIndexForDistance(pathData, distance) {
  const d = clamp(distance, 0, pathData.totalLength);
  let low = 0;
  let high = pathData.segments.length - 1;
  let index = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const segStart = pathData.cumulative[mid];
    const segEnd = pathData.cumulative[mid + 1];

    if (d < segStart) {
      high = mid - 1;
    } else if (d > segEnd) {
      low = mid + 1;
    } else {
      index = mid;
      break;
    }
  }

  return index;
}

function getPathPointAtLength(pathData, distance) {
  const d = clamp(distance, 0, pathData.totalLength);
  const index = findSegmentIndexForDistance(pathData, d);
  const segment = pathData.segments[index];
  const segmentStart = pathData.cumulative[index];
  const t = segment.length < 1e-8 ? 0 : (d - segmentStart) / segment.length;

  return {
    x: segment.start.x + segment.dx * t,
    y: segment.start.y + segment.dy * t,
  };
}

function getPathTangentAtLength(pathData, distance) {
  const d = clamp(distance, 0, pathData.totalLength);
  const index = findSegmentIndexForDistance(pathData, d);
  const tangent = pathData.segments[index].tangent;
  return { x: tangent.x, y: tangent.y };
}

function getSegmentRectEntryT(start, end, rect) {
  if (
    !start
    || !end
    || !rect
    || !Number.isFinite(start.x)
    || !Number.isFinite(start.y)
    || !Number.isFinite(end.x)
    || !Number.isFinite(end.y)
    || !Number.isFinite(rect.leftX)
    || !Number.isFinite(rect.rightX)
    || !Number.isFinite(rect.topY)
    || !Number.isFinite(rect.bottomY)
  ) {
    return null;
  }
  if (rect.leftX >= rect.rightX || rect.topY >= rect.bottomY) {
    return null;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const p = [-dx, dx, -dy, dy];
  const q = [
    start.x - rect.leftX,
    rect.rightX - start.x,
    start.y - rect.topY,
    rect.bottomY - start.y,
  ];

  let tMin = 0;
  let tMax = 1;
  for (let i = 0; i < 4; i += 1) {
    const pi = p[i];
    const qi = q[i];
    if (Math.abs(pi) <= 1e-12) {
      if (qi < 0) {
        return null;
      }
      continue;
    }
    const r = qi / pi;
    if (pi < 0) {
      if (r > tMax) {
        return null;
      }
      if (r > tMin) {
        tMin = r;
      }
    } else {
      if (r < tMin) {
        return null;
      }
      if (r < tMax) {
        tMax = r;
      }
    }
  }

  if (tMin > tMax) {
    return null;
  }
  return clamp(tMin, 0, 1);
}

function findPathEntryDistanceIntoOffshootCenterBlock(pathData, area) {
  if (!pathData || !Array.isArray(pathData.segments) || pathData.segments.length === 0 || !area || area.enabled !== true) {
    return null;
  }
  if (isPointInsideOffshootCenterBlock(pathData.segments[0].start, area)) {
    return 0;
  }

  let distanceBefore = 0;
  for (let i = 0; i < pathData.segments.length; i += 1) {
    const segment = pathData.segments[i];
    const end = {
      x: segment.start.x + segment.dx,
      y: segment.start.y + segment.dy,
    };
    const entryT = getSegmentRectEntryT(segment.start, end, area);
    if (entryT !== null) {
      return clamp(distanceBefore + entryT * segment.length, 0, pathData.totalLength);
    }
    distanceBefore += segment.length;
  }
  return null;
}

function trimPathDataAtDistance(pathData, maxDistance) {
  if (!pathData || !Array.isArray(pathData.segments) || pathData.segments.length === 0) {
    return null;
  }
  const totalLength = Number.isFinite(pathData.totalLength) ? Math.max(0, pathData.totalLength) : 0;
  if (totalLength <= 1e-8) {
    return null;
  }
  const cutoff = clamp(Number(maxDistance), 0, totalLength);
  if (cutoff <= 1e-6) {
    return null;
  }
  if (cutoff >= totalLength - 1e-6) {
    return pathData;
  }

  const outPoints = [];
  outPoints.push({ x: pathData.segments[0].start.x, y: pathData.segments[0].start.y });
  let distanceBefore = 0;
  for (let i = 0; i < pathData.segments.length; i += 1) {
    const segment = pathData.segments[i];
    const segEndDistance = distanceBefore + segment.length;
    if (cutoff >= segEndDistance - 1e-8) {
      outPoints.push({
        x: segment.start.x + segment.dx,
        y: segment.start.y + segment.dy,
      });
      distanceBefore = segEndDistance;
      continue;
    }

    const t = segment.length <= 1e-8 ? 0 : clamp((cutoff - distanceBefore) / segment.length, 0, 1);
    outPoints.push({
      x: segment.start.x + segment.dx * t,
      y: segment.start.y + segment.dy * t,
    });
    break;
  }

  if (outPoints.length < 2) {
    return null;
  }
  return createPathData(outPoints);
}

function applyOffshootCenterBlockClipToPathData(branch, pathData) {
  if (!branch || !pathData || !Number.isFinite(branch.depth) || branch.depth <= 0) {
    return pathData;
  }

  const globalConfig = CONFIG.offshoot || {};
  const localConfig = normalizeOffshootInput(branch.offshootInput);
  const mergedConfig = {
    ...globalConfig,
    ...localConfig,
  };
  const area = resolveOffshootCenterBlockArea(mergedConfig);
  if (area.enabled !== true) {
    return pathData;
  }
  const entryDistance = findPathEntryDistanceIntoOffshootCenterBlock(pathData, area);
  if (!Number.isFinite(entryDistance)) {
    return pathData;
  }
  return trimPathDataAtDistance(pathData, entryDistance);
}

function samplePathPoints(pathData, spacing = 8) {
  const out = [];
  const step = Math.max(1, spacing);
  for (let d = 0; d <= pathData.totalLength; d += step) {
    out.push(getPathPointAtLength(pathData, d));
  }
  out.push(getPathPointAtLength(pathData, pathData.totalLength));
  return out;
}

// =========================
// 8) Branch and BranchGarden Classes
// =========================
class Branch {
  constructor(seedX, seedY, direction = -1, options = {}) {
    this.id = null;
    this.parentId = Number.isFinite(options.parentId) ? options.parentId : null;
    this.depth = Number.isFinite(options.depth) ? options.depth : 0;
    this.seed = { x: seedX, y: seedY };
    this.direction = direction >= 0 ? 1 : -1;
    this.rootDirection = Number.isFinite(options.rootDirection)
      ? (options.rootDirection >= 0 ? 1 : -1)
      : this.direction;
    this.growthDir = normalize(
      options.growthDir && Number.isFinite(options.growthDir.x) && Number.isFinite(options.growthDir.y)
        ? options.growthDir
        : { x: this.direction, y: -1 },
    );
    this.useDirectionalBasis = options.useDirectionalBasis === true;
    this.baseScale = Number.isFinite(options.baseScale) ? options.baseScale : 1;
    this.thicknessBaseScale = Number.isFinite(options.thicknessBaseScale)
      ? Math.max(0.01, options.thicknessBaseScale)
      : Math.max(0.01, this.baseScale);
    this.stableKey = typeof options.stableKey === 'string'
      ? options.stableKey
      : `branch:${seedX.toFixed(2)}:${seedY.toFixed(2)}:${this.direction}:${this.depth}`;
    this.manualTemplateIndex = Number.isFinite(options.manualTemplateIndex)
      ? Math.max(0, Math.floor(options.manualTemplateIndex))
      : null;
    this.pathGenerationModeOverride = (
      options.pathGenerationMode === 'random' || options.pathGenerationMode === 'manualTemplate'
    )
      ? options.pathGenerationMode
      : null;
    this.filterVariantIndex = Number.isFinite(options.filterVariantIndex)
      ? Math.max(-1, Math.floor(options.filterVariantIndex))
      : -1;
    this.filterHueDeg = Number.isFinite(options.filterHueDeg) ? options.filterHueDeg : 0;
    this.filterBrightness = Number.isFinite(options.filterBrightness)
      ? Math.max(0, options.filterBrightness)
      : 1;
    this.filteredStemImage = null;
    this.filteredStemImageFlipped = null;
    this.offshootInput = normalizeOffshootInput(options.offshoot);
    this.offshootResolved = null;
    this.spawnDistanceOnParent = Number.isFinite(options.spawnDistanceOnParent)
      ? Math.max(0, options.spawnDistanceOnParent)
      : 0;
    this.startDistanceMetric = 0;
    this.pathLength = 0;
    this.sweepStartDelaySec = 0;
    this.rootBranchId = null;

    const hasProfileSeed = options.profileSeed !== undefined && options.profileSeed !== null;
    const profileRng = hasProfileSeed ? mulberry32(hashSeed(options.profileSeed)) : null;

    // Per-branch random profile so branches are not translated copies.
    this.noisePhase = {
      x1: (profileRng ? profileRng() : Math.random()) * 5000,
      y1: (profileRng ? profileRng() : Math.random()) * 5000,
      x2: (profileRng ? profileRng() : Math.random()) * 5000,
      y2: (profileRng ? profileRng() : Math.random()) * 5000,
    };
    this.noiseScaleMultiplier = Math.max(0.05, this.baseScale);

    // Also offset starting time per branch to decorrelate trajectories.
    this.timeCursor = hasProfileSeed
      ? (profileRng ? profileRng() : 0) * 10000
      : Date.now() / 1000 + Math.random() * 1000;
    this.timeOrigin = this.timeCursor;

    this.controlPoints = [];
    this.smoothPoints = [];
    this.pathData = null;
    this.renderCache = {
      valid: false,
      samples: [],
      distances: [],
      centerX: [],
      centerY: [],
      cacheKey: '',
      pathDataRef: null,
      defaultImageRef: null,
      flippedImageRef: null,
    };
  }

  regenerate(options = {}) {
    const { resetTimeCursor = false } = options;
    if (resetTimeCursor && Number.isFinite(this.timeOrigin)) {
      this.timeCursor = this.timeOrigin;
    }

    const branchProfile = {
      noisePhase: this.noisePhase,
      noiseScaleMultiplier: this.noiseScaleMultiplier,
      templateScaleMultiplier: this.baseScale,
      growthDir: this.useDirectionalBasis ? this.growthDir : null,
      rootDirection: this.rootDirection,
    };

    const generationMode = this.pathGenerationModeOverride || getPathGenerationMode();

    let generated;
    if (generationMode === 'manualTemplate') {
      generated = generateTemplateControlPoints(
        this.seed.x,
        this.seed.y,
        this.direction,
        this.timeCursor,
        CONFIG.noise,
        branchProfile,
        this.stableKey,
        this.manualTemplateIndex,
      );
      if (Number.isFinite(generated.templateIndex) && generated.templateIndex >= 0) {
        this.manualTemplateIndex = generated.templateIndex;
      }
    } else {
      generated = generateBranchControlPoints(
        this.seed.x,
        this.seed.y,
        this.direction,
        this.timeCursor,
        CONFIG.noise,
        branchProfile,
      );
    }

    this.timeCursor = generated.endTime;
    this.controlPoints = generated.points;

    this.smoothPoints = buildBSplinePolyline(
      this.controlPoints,
      CONFIG.path.smoothingSubdivisionsPerSpan,
    );

    const pointsForPath = this.smoothPoints.length >= 2 ? this.smoothPoints : this.controlPoints;
    const generatedPathData = createPathData(pointsForPath);
    this.pathData = applyOffshootCenterBlockClipToPathData(this, generatedPathData);
    this.pathLength = this.pathData ? this.pathData.totalLength : 0;
    invalidateBranchStripCache(this);

    return this;
  }
}

class BranchGarden {
  constructor() {
    this.branches = [];
    this.rootBranches = [];
    this.nextBranchId = 1;
    this.rootStableCounter = 1;
  }

  clear() {
    this.branches.length = 0;
    this.rootBranches.length = 0;
    this.nextBranchId = 1;
    this.rootStableCounter = 1;
    onBranchStructureChanged();
  }

  createRootBranch(seedX, seedY, direction = -1, options = {}) {
    const stableKey = typeof options.stableKey === 'string' && options.stableKey.length > 0
      ? options.stableKey
      : `root-${this.rootStableCounter++}`;

    const rootGrowthDir = normalize({ x: direction, y: -1 });
    const root = new Branch(seedX, seedY, direction, {
      parentId: null,
      depth: 0,
      rootDirection: direction,
      growthDir: rootGrowthDir,
      useDirectionalBasis: false,
      baseScale: 1,
      thicknessBaseScale: Number.isFinite(options.thicknessBaseScale)
        ? Math.max(0.01, options.thicknessBaseScale)
        : 1,
      stableKey,
      manualTemplateIndex: Number.isFinite(options.manualTemplateIndex)
        ? options.manualTemplateIndex
        : null,
      offshoot: normalizeOffshootInput(options.offshoot),
    });
    root.regenerate();
    return root;
  }

  resolveOffshootForBranch(branch) {
    const globalConfig = CONFIG.offshoot || {};
    const local = normalizeOffshootInput(branch.offshootInput);

    const enabled = typeof local.enabled === 'boolean'
      ? local.enabled
      : Boolean(globalConfig.enabled);
    const deterministic = typeof local.deterministic === 'boolean'
      ? local.deterministic
      : Boolean(globalConfig.deterministic);

    const rng = deterministic
      ? mulberry32(hashSeed(`${branch.stableKey}|resolve`))
      : Math.random;

    const maxDepthRange = resolveRangeValue(
      local.maxDepthRange,
      local.maxDepth,
      globalConfig.maxDepth,
      0,
      0,
    );
    const countRangeRaw = resolveRangeValue(
      local.countRange,
      undefined,
      globalConfig.countRange,
      0,
      0,
    );
    const biasExponentRange = resolveRangeValue(
      local.biasExponentRange,
      local.biasExponent,
      globalConfig.biasExponent,
      1,
      1,
    );
    const angleDegRangeRaw = resolveRangeValue(
      local.angleDegRange,
      undefined,
      globalConfig.angleDegRange,
      0,
      0,
    );

    const maxDepth = clamp(Math.round(sampleFloatRange(maxDepthRange, rng)), 0, 20);
    const countRange = [
      Math.max(0, Math.floor(countRangeRaw[0])),
      Math.max(0, Math.floor(countRangeRaw[1])),
    ];
    countRange.sort((a, b) => a - b);

    const biasExponent = Math.max(0.01, sampleFloatRange(biasExponentRange, rng));
    const angleA = Number(angleDegRangeRaw[0]);
    const angleB = Number(angleDegRangeRaw[1]);
    const safeAngleA = Number.isFinite(angleA) ? angleA : 0;
    const safeAngleB = Number.isFinite(angleB) ? angleB : 0;
    const angleDegRangeUsesExplicitSign = safeAngleA < 0 || safeAngleB < 0;
    const angleDegRange = angleDegRangeUsesExplicitSign
      ? [
        clamp(Math.min(safeAngleA, safeAngleB), -179, 179),
        clamp(Math.max(safeAngleA, safeAngleB), -179, 179),
      ]
      : [
        clamp(Math.min(safeAngleA, safeAngleB), 0, 179),
        clamp(Math.max(safeAngleA, safeAngleB), 0, 179),
      ];

    const globalSpawnTMin = Number.isFinite(globalConfig.spawnTMin) ? globalConfig.spawnTMin : 0;
    const globalSpawnTMax = Number.isFinite(globalConfig.spawnTMax) ? globalConfig.spawnTMax : 1;
    const spawnTMinRaw = Number.isFinite(local.spawnTMin) ? local.spawnTMin : globalSpawnTMin;
    const spawnTMaxRaw = Number.isFinite(local.spawnTMax) ? local.spawnTMax : globalSpawnTMax;
    const spawnTMin = clamp(Math.min(spawnTMinRaw, spawnTMaxRaw), 0, 1);
    const spawnTMax = clamp(Math.max(spawnTMinRaw, spawnTMaxRaw), 0, 1);

    const sideMode = sanitizeSideMode(
      typeof local.sideMode === 'string' ? local.sideMode : globalConfig.sideMode,
    );
    const pathGenerationMode = sanitizeOffshootPathGenerationMode(
      typeof local.pathGenerationMode === 'string'
        ? local.pathGenerationMode
        : globalConfig.pathGenerationMode,
    );
    const templateIndexPoolSource = local.templateIndexPool !== undefined
      ? local.templateIndexPool
      : globalConfig.templateIndexPool;
    const templateIndexPool = normalizeTemplateIndexPool(templateIndexPoolSource);
    const globalDepthScale = Number.isFinite(globalConfig.depthScale) ? globalConfig.depthScale : 1;
    const depthScale = Math.max(
      0.05,
      Number.isFinite(local.depthScale) ? local.depthScale : globalDepthScale,
    );
    const minSpawnSpacingT = clamp(
      Number.isFinite(local.minSpawnSpacingT)
        ? local.minSpawnSpacingT
        : (Number.isFinite(globalConfig.minSpawnSpacingT) ? globalConfig.minSpawnSpacingT : 0),
      0,
      1,
    );
    const maxSpawnAttemptsPerChild = Math.max(
      1,
      Math.floor(
        Number.isFinite(local.maxSpawnAttemptsPerChild)
          ? local.maxSpawnAttemptsPerChild
          : (Number.isFinite(globalConfig.maxSpawnAttemptsPerChild) ? globalConfig.maxSpawnAttemptsPerChild : 8),
      ),
    );

    return {
      enabled,
      deterministic,
      maxDepth,
      countRange,
      childCount: sampleIntRange(countRange, rng),
      spawnTMin,
      spawnTMax,
      biasExponent,
      angleDegRange,
      sideMode,
      angleDegRangeUsesExplicitSign,
      pathGenerationMode,
      templateIndexPool,
      depthScale,
      minSpawnSpacingT,
      maxSpawnAttemptsPerChild,
    };
  }

  sampleSpawnTs(parent, resolved, targetCount, rng) {
    const out = [];
    const span = resolved.spawnTMax - resolved.spawnTMin;
    for (let i = 0; i < targetCount; i += 1) {
      let accepted = null;
      for (let attempt = 0; attempt < resolved.maxSpawnAttemptsPerChild; attempt += 1) {
        const u = clamp(rng(), 0, 1);
        const biased = 1 - Math.pow(1 - u, resolved.biasExponent);
        const t = span > 1e-8 ? resolved.spawnTMin + span * biased : resolved.spawnTMin;

        let isFarEnough = true;
        for (let k = 0; k < out.length; k += 1) {
          if (Math.abs(out[k] - t) < resolved.minSpawnSpacingT) {
            isFarEnough = false;
            break;
          }
        }

        if (isFarEnough) {
          accepted = t;
          break;
        }
      }
      if (accepted !== null) {
        out.push(accepted);
      }
    }

    out.sort((a, b) => a - b);
    return out;
  }

  createOffshootBranches(parent, remainingCapacity) {
    if (!parent.pathData || remainingCapacity <= 0) {
      return [];
    }

    const resolved = parent.offshootResolved || this.resolveOffshootForBranch(parent);
    if (!resolved.enabled || parent.depth >= resolved.maxDepth || resolved.childCount <= 0) {
      return [];
    }

    const targetCount = Math.min(resolved.childCount, remainingCapacity);
    const rng = resolved.deterministic
      ? mulberry32(hashSeed(`${parent.stableKey}|spawn`))
      : Math.random;
    const spawnTs = this.sampleSpawnTs(parent, resolved, targetCount, rng);
    const templateCount = getSanitizedManualTemplates().length;
    const selectableTemplatePool = [];
    for (let i = 0; i < resolved.templateIndexPool.length; i += 1) {
      const index = resolved.templateIndexPool[i];
      if (index >= 0 && index < templateCount) {
        selectableTemplatePool.push(index);
      }
    }

    const children = [];
    for (let i = 0; i < spawnTs.length; i += 1) {
      const t = spawnTs[i];
      const distance = t * parent.pathData.totalLength;
      const anchor = getPathPointAtLength(parent.pathData, distance);
      const tangent = normalize(getPathTangentAtLength(parent.pathData, distance));
      const sideSign = getSideSign(resolved.sideMode, i, rng);
      const sampledAngleDeg = sampleFloatRange(resolved.angleDegRange, rng);
      const angleDeg = resolved.angleDegRangeUsesExplicitSign
        ? sampledAngleDeg
        : (sampledAngleDeg * sideSign);
      const angleRad = angleDeg * Math.PI / 180;
      const growthDir = normalize(rotateVector(tangent, angleRad));

      const childStableKey = `${parent.stableKey}|child:${i}`;
      const childTemplateIndex = selectableTemplatePool.length > 0
        ? selectableTemplatePool[
            clamp(Math.floor(rng() * selectableTemplatePool.length), 0, selectableTemplatePool.length - 1)
          ]
        : null;
      const childPathGenerationMode = resolved.pathGenerationMode === 'inherit'
        ? null
        : resolved.pathGenerationMode;
      const parentThicknessBaseScale = getBranchThicknessBaseScale(parent);
      const inheritedThicknessBaseScale = Math.max(
        0.01,
        parentThicknessBaseScale
          * getThicknessTaperFactorAtDistance(distance, parent.pathData.totalLength, CONFIG.brush),
      );
      const child = new Branch(anchor.x, anchor.y, sideSign, {
        parentId: parent.id,
        depth: parent.depth + 1,
        rootDirection: parent.rootDirection,
        spawnDistanceOnParent: distance,
        growthDir,
        useDirectionalBasis: true,
        baseScale: Math.max(0.05, parent.baseScale * resolved.depthScale),
        thicknessBaseScale: inheritedThicknessBaseScale,
        stableKey: childStableKey,
        manualTemplateIndex: childTemplateIndex,
        pathGenerationMode: childPathGenerationMode,
        offshoot: parent.offshootInput,
        profileSeed: `${childStableKey}|profile`,
      }).regenerate();

      child.offshootResolved = this.resolveOffshootForBranch(child);
      children.push(child);
    }

    return children;
  }

  rebuildBranches(options = {}) {
    const { regenerateRoots = false, resetRootTimeCursor = false } = options;
    this.branches.length = 0;
    this.nextBranchId = 1;

    const maxTotal = Math.max(
      1,
      Math.floor(
        Number.isFinite(CONFIG.offshoot.maxTotalBranches)
          ? CONFIG.offshoot.maxTotalBranches
          : 500,
      ),
    );

    const queue = [];
    for (let i = 0; i < this.rootBranches.length && this.branches.length < maxTotal; i += 1) {
      const root = this.rootBranches[i];
      if (regenerateRoots) {
        root.regenerate({ resetTimeCursor: resetRootTimeCursor });
      }
      root.id = this.nextBranchId++;
      root.parentId = null;
      root.depth = 0;
      root.offshootResolved = this.resolveOffshootForBranch(root);
      this.branches.push(root);
      queue.push(root);
    }

    while (queue.length > 0 && this.branches.length < maxTotal) {
      const parent = queue.shift();
      const remainingCapacity = maxTotal - this.branches.length;
      if (remainingCapacity <= 0) {
        break;
      }

      const children = this.createOffshootBranches(parent, remainingCapacity);
      for (let i = 0; i < children.length && this.branches.length < maxTotal; i += 1) {
        const child = children[i];
        child.id = this.nextBranchId++;
        child.parentId = parent.id;
        this.branches.push(child);
        queue.push(child);
      }
    }

    onBranchStructureChanged();
    return this.branches;
  }

  addBranch(seedX, seedY, direction = -1, options = {}) {
    if (!Number.isFinite(seedX) || !Number.isFinite(seedY)) {
      return null;
    }

    const normalized = normalizeAddBranchOptions(options);
    const root = this.createRootBranch(seedX, seedY, direction, normalized);
    this.rootBranches.push(root);
    this.rebuildBranches();
    return root;
  }

  addBranches(branchDefs) {
    if (!Array.isArray(branchDefs)) {
      return [];
    }

    const added = [];
    const dedupe = new Set();
    for (let i = 0; i < this.rootBranches.length; i += 1) {
      const existing = this.rootBranches[i];
      dedupe.add(createBranchDefDedupeKey({
        x: existing.seed.x,
        y: existing.seed.y,
        direction: existing.direction,
      }));
    }

    for (let i = 0; i < branchDefs.length; i += 1) {
      const def = branchDefs[i];
      if (!def || !Number.isFinite(def.x) || !Number.isFinite(def.y)) {
        continue;
      }

      const direction = Number.isFinite(def.direction) ? def.direction : -1;
      const dedupeKey = createBranchDefDedupeKey({
        x: def.x,
        y: def.y,
        direction,
      });
      if (dedupe.has(dedupeKey)) {
        continue;
      }

      const root = this.createRootBranch(def.x, def.y, direction, {
        offshoot: normalizeOffshootInput(def.offshoot),
        stableKey: typeof def.stableKey === 'string' ? def.stableKey : undefined,
        manualTemplateIndex: Number.isFinite(def.manualTemplateIndex) ? def.manualTemplateIndex : null,
      });
      this.rootBranches.push(root);
      dedupe.add(dedupeKey);
      added.push(root);
    }

    if (added.length > 0) {
      this.rebuildBranches();
    }

    return added;
  }

  plantSeeds(seedPacket, options = {}) {
    const { clearFirst = true } = options;
    if (clearFirst) {
      this.clear();
    }

    const packet = seedPacket || setSeeds();
    const seedsLeft = Array.isArray(packet.seedsLeft) ? packet.seedsLeft : [];
    const seedsRight = Array.isArray(packet.seedsRight) ? packet.seedsRight : [];

    const branchDefs = [];
    for (let i = 0; i < seedsLeft.length; i += 1) {
      const def = seedsLeft[i];
      if (!def || !Number.isFinite(def.x) || !Number.isFinite(def.y)) {
        continue;
      }
      branchDefs.push({
        x: def.x,
        y: def.y,
        direction: Number.isFinite(def.direction) ? def.direction : 1,
        offshoot: normalizeOffshootInput(def.offshoot),
        stableKey: typeof def.stableKey === 'string' ? def.stableKey : undefined,
        manualTemplateIndex: Number.isFinite(def.manualTemplateIndex) ? def.manualTemplateIndex : null,
      });
    }

    for (let i = 0; i < seedsRight.length; i += 1) {
      const def = seedsRight[i];
      if (!def || !Number.isFinite(def.x) || !Number.isFinite(def.y)) {
        continue;
      }
      branchDefs.push({
        x: def.x,
        y: def.y,
        direction: Number.isFinite(def.direction) ? def.direction : -1,
        offshoot: normalizeOffshootInput(def.offshoot),
        stableKey: typeof def.stableKey === 'string' ? def.stableKey : undefined,
        manualTemplateIndex: Number.isFinite(def.manualTemplateIndex) ? def.manualTemplateIndex : null,
      });
    }

    return this.addBranches(branchDefs);
  }

  regenerateAll() {
    this.rebuildBranches({ regenerateRoots: true });
  }
}

// =========================
// 9) Seed Helpers
// =========================
function sanitizeSeedGenerationMode(mode, fallback = 'autoSpacing') {
  if (mode === 'autoSpacing' || mode === 'explicitYRatios') {
    return mode;
  }
  if (fallback === 'autoSpacing' || fallback === 'explicitYRatios') {
    return fallback;
  }
  return 'autoSpacing';
}

function sanitizeSeedYRatioBasis(value, fallback = 'video') {
  if (value === 'video' || value === 'viewport') {
    return value;
  }
  if (fallback === 'video' || fallback === 'viewport') {
    return fallback;
  }
  return 'video';
}

function normalizeSeedYRatioList(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  const out = [];
  for (let i = 0; i < rawValue.length; i += 1) {
    const normalized = clamp(normalizeRatioOrPercentValue(rawValue[i], 0), 0, 1);
    if (Number.isFinite(normalized)) {
      out.push(normalized);
    }
  }
  return out;
}

function resolveSeedYRatioReference(seedsConfig = CONFIG.seeds || {}) {
  const basis = sanitizeSeedYRatioBasis(seedsConfig.explicitYRatioBasis, 'video');
  if (basis === 'video') {
    const videoRect = getHeroVideoRenderedRect();
    if (
      videoRect
      && Number.isFinite(videoRect.top)
      && Number.isFinite(videoRect.height)
      && videoRect.height > 0
    ) {
      return {
        basis: 'video',
        topY: videoRect.top,
        height: videoRect.height,
      };
    }
  }
  const viewportHeight = Number.isFinite(STATE.viewportHeight) && STATE.viewportHeight > 0
    ? STATE.viewportHeight
    : (Number.isFinite(window.innerHeight) ? Math.max(0, window.innerHeight) : 0);
  return {
    basis: 'viewport',
    topY: 0,
    height: viewportHeight,
  };
}

function resolveSeedYValuesFromRatios(ratios, reference) {
  if (!Array.isArray(ratios) || ratios.length === 0) {
    return [];
  }
  if (!reference || !Number.isFinite(reference.topY) || !Number.isFinite(reference.height) || reference.height <= 0) {
    return [];
  }
  const out = [];
  for (let i = 0; i < ratios.length; i += 1) {
    const ratio = clamp(Number(ratios[i]), 0, 1);
    if (!Number.isFinite(ratio)) {
      continue;
    }
    out.push(reference.topY + ratio * reference.height);
  }
  return out;
}

function normalizeSeedSpacingConfig(seedsConfig = CONFIG.seeds || {}) {
  const rawMinSpacing = Number(seedsConfig.minSpacing);
  const rawMaxSpacing = Number(seedsConfig.maxSpacing);
  const minSpacing = Number.isFinite(rawMinSpacing) ? Math.max(0, rawMinSpacing) : 0;
  const randomizeSpacing = seedsConfig.randomizeSpacing === true;
  let maxSpacing;
  if (Number.isFinite(rawMaxSpacing)) {
    maxSpacing = Math.max(0, rawMaxSpacing);
  } else if (randomizeSpacing) {
    // Keep randomness available even when maxSpacing is omitted.
    maxSpacing = minSpacing > 1e-6 ? (minSpacing * 1.6) : 120;
  } else {
    maxSpacing = minSpacing;
  }
  if (maxSpacing < minSpacing) {
    maxSpacing = minSpacing;
  }
  return {
    minSpacing,
    maxSpacing,
    randomizeSpacing,
  };
}

function sampleSeedYValues(
  count,
  minY,
  maxY,
  minSpacing = 0,
  maxSpacing = 0,
  startY = null,
  randomizeSpacing = false,
) {
  const targetCount = Math.max(0, Math.floor(Number(count) || 0));
  if (targetCount <= 0) {
    return [];
  }

  const span = Math.max(0, maxY - minY);
  const initialY = Number.isFinite(Number(startY))
    ? Number(startY)
    : (minY + Math.random() * span);
  const out = [initialY];
  for (let i = 1; i < targetCount; i += 1) {
    let gap = Math.max(0, minSpacing);
    if (randomizeSpacing && Number.isFinite(maxSpacing) && maxSpacing > minSpacing + 1e-8) {
      gap = sampleFloatRange([minSpacing, maxSpacing]);
    }
    out.push(out[i - 1] + gap);
  }

  return out;
}

function setSeeds() {
  const seedsConfig = CONFIG.seeds || {};
  const countPerSide = Math.max(0, Math.floor(Number(seedsConfig.countPerSide) || 0));
  const seedGenerationMode = sanitizeSeedGenerationMode(
    seedsConfig.mode !== undefined ? seedsConfig.mode : seedsConfig.generationMode,
    'autoSpacing',
  );
  const sidePad = Number.isFinite(Number(seedsConfig.sidePad)) ? Number(seedsConfig.sidePad) : 0;
  const sideMargin = Number.isFinite(Number(seedsConfig.sideMargin)) ? Number(seedsConfig.sideMargin) : 0;
  const seedsLeft = [];
  const seedsRight = [];
  const yMin = 100;
  const yMax = STATE.viewportHeight + 100;
  const startY = Number.isFinite(Number(seedsConfig.startY)) ? Number(seedsConfig.startY) : null;
  const { minSpacing, maxSpacing, randomizeSpacing } = normalizeSeedSpacingConfig(seedsConfig);
  let leftYValues = [];
  let rightYValues = [];

  if (seedGenerationMode === 'explicitYRatios') {
    const ratioReference = resolveSeedYRatioReference(seedsConfig);
    const sharedRatios = normalizeSeedYRatioList(seedsConfig.explicitYRatios);
    const sideLists = isPlainObjectLiteral(seedsConfig.explicitYRatiosBySide)
      ? seedsConfig.explicitYRatiosBySide
      : null;
    const leftRatios = (
      Array.isArray(sideLists && sideLists.left)
        ? normalizeSeedYRatioList(sideLists.left)
        : (
          Array.isArray(seedsConfig.explicitYRatiosLeft)
            ? normalizeSeedYRatioList(seedsConfig.explicitYRatiosLeft)
            : []
        )
    );
    const rightRatios = (
      Array.isArray(sideLists && sideLists.right)
        ? normalizeSeedYRatioList(sideLists.right)
        : (
          Array.isArray(seedsConfig.explicitYRatiosRight)
            ? normalizeSeedYRatioList(seedsConfig.explicitYRatiosRight)
            : []
        )
    );

    leftYValues = resolveSeedYValuesFromRatios(
      leftRatios.length > 0 ? leftRatios : sharedRatios,
      ratioReference,
    );
    rightYValues = resolveSeedYValuesFromRatios(
      rightRatios.length > 0 ? rightRatios : sharedRatios,
      ratioReference,
    );
  }

  if (
    seedGenerationMode !== 'explicitYRatios'
    && leftYValues.length === 0
    && countPerSide > 0
  ) {
    leftYValues = sampleSeedYValues(
      countPerSide,
      yMin,
      yMax,
      minSpacing,
      maxSpacing,
      startY,
      randomizeSpacing,
    );
  }
  if (
    seedGenerationMode !== 'explicitYRatios'
    && rightYValues.length === 0
    && countPerSide > 0
  ) {
    rightYValues = sampleSeedYValues(
      countPerSide,
      yMin,
      yMax,
      minSpacing,
      maxSpacing,
      startY,
      randomizeSpacing,
    );
  }

  for (let i = 0; i < leftYValues.length; i += 1) {
    // Left side branches grow rightward (direction +1).
    seedsLeft.push({
      x: 0 - sidePad - Math.random() * sideMargin,
      y: leftYValues[i],
      direction: 1,
    });
  }

  for (let i = 0; i < rightYValues.length; i += 1) {
    // Right side branches grow leftward (direction -1).
    seedsRight.push({
      x: STATE.viewportWidth + sidePad + Math.random() * sideMargin,
      y: rightYValues[i],
      direction: -1,
    });
  }

  return { seedsLeft, seedsRight };
}

function plantSeeds(seedPacket, options = {}) {
  if (!STATE.branchGarden) {
    return [];
  }
  return STATE.branchGarden.plantSeeds(seedPacket, options);
}

// =========================
// 10) Asset Loading
// =========================
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const resolvedUrl = normalizeHostedAssetPath(url);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image: ' + resolvedUrl));
    image.src = resolvedUrl;
  });
}

function createFallbackStemTexture() {
  const texture = document.createElement('canvas');
  texture.width = 160;
  texture.height = 600;
  const tctx = texture.getContext('2d');

  const gradient = tctx.createLinearGradient(0, 0, 0, texture.height);
  gradient.addColorStop(0, '#8dd17d');
  gradient.addColorStop(0.4, '#5da460');
  gradient.addColorStop(1, '#3f7f4a');
  tctx.fillStyle = gradient;
  tctx.fillRect(0, 0, texture.width, texture.height);

  tctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 48; i += 1) {
    const x = (i / 47) * texture.width;
    tctx.fillStyle = i % 2 === 0 ? 'rgba(16, 45, 20, 0.09)' : 'rgba(8, 25, 14, 0.07)';
    tctx.fillRect(x, 0, 2, texture.height);
  }
  tctx.globalCompositeOperation = 'source-over';

  tctx.fillStyle = 'rgba(220, 255, 220, 0.22)';
  tctx.fillRect(texture.width * 0.44, 0, texture.width * 0.08, texture.height);

  return texture;
}

function createHorizontallyFlippedTexture(image) {
  if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0) {
    return image;
  }

  const texture = document.createElement('canvas');
  texture.width = image.width;
  texture.height = image.height;
  const tctx = texture.getContext('2d');
  tctx.setTransform(-1, 0, 0, 1, texture.width, 0);
  tctx.drawImage(image, 0, 0);
  return texture;
}

async function loadStemTexture() {
  try {
    return await loadImage('./stem_2.5.webp');
  } catch (error) {
    console.warn(error.message + ' | Falling back to generated stem texture.');
    return createFallbackStemTexture();
  }
}

async function loadLeafTexture(leavesConfig = CONFIG.leaves || {}) {
  const safeConfig = isPlainObjectLiteral(leavesConfig) ? leavesConfig : {};
  const spritePath = (typeof safeConfig.spritePath === 'string' && safeConfig.spritePath.length > 0)
    ? safeConfig.spritePath
    : './leaves_new.webp';
  try {
    return await loadImage(spritePath);
  } catch (error) {
    console.warn(error.message + ' | Leaves are disabled until the leaf sprite loads.');
    return null;
  }
}

// =========================
// 11) Branch Endpoints + Flower System Bridge
// =========================
function getBranchEndpointPoint(branch) {
  if (!branch || !branch.pathData || !Number.isFinite(branch.pathData.totalLength)) {
    return null;
  }
  const totalLength = Math.max(0, branch.pathData.totalLength);
  if (totalLength <= 1e-8) {
    return null;
  }
  return getPathPointAtLength(branch.pathData, totalLength);
}

function getBranchEndpointTangentDeg(branch) {
  if (!branch || !branch.pathData || !Number.isFinite(branch.pathData.totalLength)) {
    return null;
  }
  const totalLength = Math.max(0, branch.pathData.totalLength);
  if (totalLength <= 1e-8) {
    return null;
  }

  const flowersConfig = CONFIG.flowers || {};
  const tailLengthInput = Number(flowersConfig.endpointDirectionTailLengthPx);
  const sampleCountInput = Number(flowersConfig.endpointDirectionSampleCount);
  const tailLength = Number.isFinite(tailLengthInput)
    ? Math.max(0, tailLengthInput)
    : 26;
  const sampleCount = Number.isFinite(sampleCountInput)
    ? Math.max(1, Math.floor(sampleCountInput))
    : 5;

  const resolveSingleTangentDeg = () => {
    const tangent = getPathTangentAtLength(branch.pathData, totalLength);
    if (!tangent || !Number.isFinite(tangent.x) || !Number.isFinite(tangent.y)) {
      return null;
    }
    return Math.atan2(tangent.y, tangent.x) * 180 / Math.PI;
  };

  if (tailLength <= 1e-6 || sampleCount <= 1) {
    return resolveSingleTangentDeg();
  }

  const startDistance = Math.max(0, totalLength - tailLength);
  const span = totalLength - startDistance;
  if (span <= 1e-6) {
    return resolveSingleTangentDeg();
  }

  let sumX = 0;
  let sumY = 0;
  let validCount = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const t = sampleCount <= 1 ? 1 : (i / (sampleCount - 1));
    const distance = startDistance + span * t;
    const tangent = getPathTangentAtLength(branch.pathData, distance);
    if (!tangent || !Number.isFinite(tangent.x) || !Number.isFinite(tangent.y)) {
      continue;
    }
    const len = Math.hypot(tangent.x, tangent.y);
    if (len <= 1e-8) {
      continue;
    }
    sumX += tangent.x / len;
    sumY += tangent.y / len;
    validCount += 1;
  }

  if (validCount <= 0 || Math.hypot(sumX, sumY) <= 1e-8) {
    return resolveSingleTangentDeg();
  }

  return Math.atan2(sumY, sumX) * 180 / Math.PI;
}

function collectBranchEndpoints() {
  if (!STATE.branchGarden || !Array.isArray(STATE.branchGarden.branches)) {
    return [];
  }

  const endpoints = [];
  for (let i = 0; i < STATE.branchGarden.branches.length; i += 1) {
    const branch = STATE.branchGarden.branches[i];
    const endpoint = getBranchEndpointPoint(branch);
    const tangentDeg = getBranchEndpointTangentDeg(branch);
    if (!endpoint) {
      continue;
    }
    endpoints.push({
      branchId: Number.isFinite(branch.id) ? branch.id : null,
      parentId: Number.isFinite(branch.parentId) ? branch.parentId : null,
      depth: Number.isFinite(branch.depth) ? branch.depth : 0,
      stableKey: typeof branch.stableKey === 'string' ? branch.stableKey : `branch-index:${i}`,
      x: endpoint.x,
      y: endpoint.y,
      tangentDeg: Number.isFinite(tangentDeg) ? tangentDeg : null,
    });
  }
  return endpoints;
}

function getFlowerSystem() {
  if (STATE.flowerSystem && typeof STATE.flowerSystem.render === 'function') {
    return STATE.flowerSystem;
  }
  return null;
}

const LEGACY_LILY_FLOWER_KEYS = [
  'method',
  'spritePath',
  'spriteCellWidth',
  'spriteCellHeight',
  'spriteScale',
  'spriteCols',
  'spriteRows',
  'spriteRow',
  'petalCountRange',
  'alignToBranchDirection',
  'alignmentDamping',
  'petalBaseCenterDeg',
  'petalSpreadDeg',
  'displacementSpace',
  'stamenRowMode',
  'stamenFixedRow',
  'stamenCount',
  'stamenAdditionalMode',
  'stamenRowList',
  'closedUseMiddlePetalSprite',
  'closedSpritePath',
  'closedSpriteCols',
  'closedSpriteRows',
  'closedSpriteScale',
  'pairRotationDegByRowPair',
  'pairDisplacementYByRowPair',
  'pairDisplacementXByRowPair',
  'hoverAmplitudeDegRange',
  'hoverSpeedRange',
];

function isPlainObjectLiteral(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ensureFlowerConfigShapeInPlace(flowersConfig) {
  if (!isPlainObjectLiteral(flowersConfig)) {
    return;
  }

  if (!isPlainObjectLiteral(flowersConfig.types)) {
    flowersConfig.types = {};
  }
  if (!isPlainObjectLiteral(flowersConfig.types.lily)) {
    flowersConfig.types.lily = {};
  }

  const lilyTypeConfig = flowersConfig.types.lily;
  for (let i = 0; i < LEGACY_LILY_FLOWER_KEYS.length; i += 1) {
    const key = LEGACY_LILY_FLOWER_KEYS[i];
    if (flowersConfig[key] !== undefined && lilyTypeConfig[key] === undefined) {
      lilyTypeConfig[key] = flowersConfig[key];
    }
  }

  if (flowersConfig.assignmentMode !== 'mixed') {
    flowersConfig.assignmentMode = 'single';
  }
  if (typeof flowersConfig.singleType !== 'string' || flowersConfig.singleType.length === 0) {
    flowersConfig.singleType = 'lily';
  }
  if (!isPlainObjectLiteral(flowersConfig.mixRatios)) {
    flowersConfig.mixRatios = { lily: 1 };
  }
  if (!isPlainObjectLiteral(flowersConfig.performance)) {
    flowersConfig.performance = {};
  }
  if (flowersConfig.performance.activeLayerCacheEnabled === undefined) {
    flowersConfig.performance.activeLayerCacheEnabled = true;
  } else {
    flowersConfig.performance.activeLayerCacheEnabled = flowersConfig.performance.activeLayerCacheEnabled !== false;
  }
  flowersConfig.performance.logEnabled = flowersConfig.performance.logEnabled === true;
  {
    const logIntervalMs = Number(flowersConfig.performance.logIntervalMs);
    flowersConfig.performance.logIntervalMs = Number.isFinite(logIntervalMs)
      ? Math.max(100, logIntervalMs)
      : 1000;
  }
  if (!isPlainObjectLiteral(flowersConfig.baked)) {
    flowersConfig.baked = {};
  }
  if (typeof flowersConfig.baked.manifestPath !== 'string' || flowersConfig.baked.manifestPath.length === 0) {
    flowersConfig.baked.manifestPath = './flowers/flowers_atlas_manifest_master.json';
  }
  flowersConfig.baked.enabled = flowersConfig.baked.enabled === true;
  flowersConfig.baked.fallbackToLive = flowersConfig.baked.fallbackToLive === true;
  flowersConfig.baked.allowFilenameFallback = flowersConfig.baked.allowFilenameFallback !== false;
  flowersConfig.baked.forceCanvasRenderer = flowersConfig.baked.forceCanvasRenderer !== false;
  flowersConfig.baked.logEnabled = flowersConfig.baked.logEnabled === true;
  {
    const playbackFps = Number(flowersConfig.baked.playbackFps);
    flowersConfig.baked.playbackFps = Number.isFinite(playbackFps)
      ? Math.max(0, playbackFps)
      : 0;
  }
  {
    const playbackSpeedMultiplier = Number(flowersConfig.baked.playbackSpeedMultiplier);
    flowersConfig.baked.playbackSpeedMultiplier = Number.isFinite(playbackSpeedMultiplier)
      ? Math.max(0.01, playbackSpeedMultiplier)
      : 1;
  }
  {
    const neutralFrameIndex = Number(flowersConfig.baked.neutralFrameIndex);
    flowersConfig.baked.neutralFrameIndex = Number.isFinite(neutralFrameIndex)
      ? Math.max(0, Math.floor(neutralFrameIndex))
      : null;
  }
  flowersConfig.baked.frameInterpolationEnabled = flowersConfig.baked.frameInterpolationEnabled === true;
}

function normalizeFlowerOptionPatch(nextOptions) {
  if (!isPlainObjectLiteral(nextOptions)) {
    return {};
  }

  const patch = {};
  const legacyLilyPatch = {};

  const keys = Object.keys(nextOptions);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = nextOptions[key];

    if (LEGACY_LILY_FLOWER_KEYS.includes(key)) {
      legacyLilyPatch[key] = value;
      continue;
    }

    if (key === 'types' && isPlainObjectLiteral(value)) {
      const typesPatch = {};
      const typeKeys = Object.keys(value);
      for (let t = 0; t < typeKeys.length; t += 1) {
        const typeKey = typeKeys[t];
        const typeValue = value[typeKey];
        typesPatch[typeKey] = isPlainObjectLiteral(typeValue) ? { ...typeValue } : typeValue;
      }
      patch.types = typesPatch;
      continue;
    }

    if (key === 'mixRatios' && isPlainObjectLiteral(value)) {
      patch.mixRatios = { ...value };
      continue;
    }

    if (key === 'performance' && isPlainObjectLiteral(value)) {
      patch.performance = { ...value };
      continue;
    }

    patch[key] = value;
  }

  if (Object.keys(legacyLilyPatch).length > 0) {
    if (!isPlainObjectLiteral(patch.types)) {
      patch.types = {};
    }
    const lilyPatch = isPlainObjectLiteral(patch.types.lily)
      ? { ...patch.types.lily }
      : {};
    Object.assign(lilyPatch, legacyLilyPatch);
    patch.types.lily = lilyPatch;
  }

  return patch;
}

function mergeFlowerOptionsInPlace(target, patch) {
  if (!isPlainObjectLiteral(target) || !isPlainObjectLiteral(patch)) {
    return;
  }

  if (isPlainObjectLiteral(patch.types)) {
    if (!isPlainObjectLiteral(target.types)) {
      target.types = {};
    }
    const typeKeys = Object.keys(patch.types);
    for (let i = 0; i < typeKeys.length; i += 1) {
      const typeKey = typeKeys[i];
      const patchTypeValue = patch.types[typeKey];
      if (isPlainObjectLiteral(patchTypeValue)) {
        if (!isPlainObjectLiteral(target.types[typeKey])) {
          target.types[typeKey] = {};
        }
        Object.assign(target.types[typeKey], patchTypeValue);
      } else {
        target.types[typeKey] = patchTypeValue;
      }
    }
  }

  if (isPlainObjectLiteral(patch.mixRatios)) {
    target.mixRatios = { ...patch.mixRatios };
  }
  if (isPlainObjectLiteral(patch.performance)) {
    if (!isPlainObjectLiteral(target.performance)) {
      target.performance = {};
    }
    Object.assign(target.performance, patch.performance);
  }

  const keys = Object.keys(patch);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (
      key === 'types'
      || key === 'mixRatios'
      || key === 'performance'
      || LEGACY_LILY_FLOWER_KEYS.includes(key)
    ) {
      continue;
    }
    target[key] = patch[key];
  }
}

async function loadFlowerSpriteIntoSystem() {
  const flowerSystem = getFlowerSystem();
  if (!flowerSystem) {
    return;
  }

  ensureFlowerConfigShapeInPlace(CONFIG.flowers);

  try {
    if (typeof flowerSystem.loadAssets === 'function') {
      await flowerSystem.loadAssets(getFlowersRuntimeConfig());
      return;
    }

    const lilyConfig = CONFIG.flowers && CONFIG.flowers.types && CONFIG.flowers.types.lily
      ? CONFIG.flowers.types.lily
      : null;
    const spritePath = (
      lilyConfig && typeof lilyConfig.spritePath === 'string' && lilyConfig.spritePath.length > 0
    )
      ? lilyConfig.spritePath
      : './lily_sprite.webp';
    await flowerSystem.loadSprite(spritePath);
  } catch (error) {
    console.warn(error.message + ' | Flowers disabled because sprite failed to load.');
  }
}

function rebuildEndpointFlowers() {
  const flowerSystem = getFlowerSystem();
  if (!flowerSystem) {
    return;
  }
  ensureFlowerConfigShapeInPlace(CONFIG.flowers);
  flowerSystem.setEndpoints(STATE.branchEndpoints, getFlowersRuntimeConfig());
}

function refreshBranchEndpointsAndFlowerSystem() {
  STATE.branchEndpoints = collectBranchEndpoints();
  rebuildEndpointFlowers();
}

function shouldRenderEndpointFlowers() {
  if (!CONFIG.flowers || CONFIG.flowers.enabled !== true) {
    return false;
  }
  const flowerSystem = getFlowerSystem();
  if (!flowerSystem || !flowerSystem.hasRenderableFlowers()) {
    return false;
  }
  return true;
}

function maybeLogFlowerPerformance(nowMs) {
  ensureFlowerConfigShapeInPlace(CONFIG.flowers);
  const perfConfig = CONFIG.flowers && CONFIG.flowers.performance
    ? CONFIG.flowers.performance
    : null;
  if (!perfConfig || perfConfig.logEnabled !== true) {
    return;
  }

  const flowerSystem = getFlowerSystem();
  if (!flowerSystem || typeof flowerSystem.getPerformanceSnapshot !== 'function') {
    return;
  }

  const intervalMs = Number.isFinite(perfConfig.logIntervalMs)
    ? Math.max(100, perfConfig.logIntervalMs)
    : 1000;
  const now = Number.isFinite(nowMs) ? nowMs : performance.now();
  if (
    Number.isFinite(STATE.flowerPerfLastLogMs)
    && STATE.flowerPerfLastLogMs > 0
    && (now - STATE.flowerPerfLastLogMs) < intervalMs
  ) {
    return;
  }

  const snapshot = flowerSystem.getPerformanceSnapshot();
  if (!snapshot) {
    return;
  }
  STATE.flowerPerfLastLogMs = now;
  console.log(
    '[FlowersPerf]',
    `active=${snapshot.activeFlowerCount}/${snapshot.flowerCount}`,
    `avgUpdateMs=${snapshot.avgUpdateMs.toFixed(3)}`,
    `avgDrawMs=${snapshot.avgDrawMs.toFixed(3)}`,
    `simHz=${Number(snapshot.simStepsPerSecond || 0).toFixed(2)}`,
    `simStepMs=${Number(snapshot.simStepMsAvg || 0).toFixed(3)}`,
    `interpFrames=${Math.floor(Number(snapshot.interpolatedFrames) || 0)}`,
    `staticRebuilds=${snapshot.staticLayerRebuildCount}`,
    `avgStaticRebuildMs=${snapshot.avgStaticLayerRebuildMs.toFixed(3)}`,
  );
}

function drawEndpointFlowers(nowMs, targetCtx = ctx, renderOptions = null, skipPerfLog = false) {
  const flowerSystem = getFlowerSystem();
  if (!flowerSystem) {
    return null;
  }
  ensureFlowerConfigShapeInPlace(CONFIG.flowers);
  const result = flowerSystem.render(targetCtx, getFlowersRuntimeConfig(), nowMs, renderOptions);
  if (!skipPerfLog) {
    maybeLogFlowerPerformance(nowMs);
  }
  return result && typeof result === 'object' ? result : null;
}

function cancelFlowerInteractionFrame() {
  if (STATE.flowerInteractionRafId !== null) {
    cancelAnimationFrame(STATE.flowerInteractionRafId);
    STATE.flowerInteractionRafId = null;
  }
  STATE.nextInteractionFrameDueMs = 0;
}

function shouldKeepFlowerInteractionLoopAlive() {
  if (STATE.branchGrowth.running) {
    return false;
  }

  const leavesConfig = resolveLeavesConfig(CONFIG.leaves || {});
  if (isLeafSwayActive(leavesConfig)) {
    return true;
  }

  if (!shouldRenderEndpointFlowers()) {
    return false;
  }
  const flowerSystem = getFlowerSystem();
  return Boolean(flowerSystem && flowerSystem.needsContinuousFrames());
}

function scheduleFlowerInteractionFrame(force = false) {
  if (STATE.branchGrowth.running || STATE.flowerInteractionRafId !== null) {
    return;
  }
  if (!force && !shouldKeepFlowerInteractionLoopAlive()) {
    return;
  }
  STATE.flowerInteractionRafId = requestAnimationFrame(stepFlowerInteractionFrame);
}

function syncFlowerInteractionLoop() {
  if (shouldKeepFlowerInteractionLoopAlive()) {
    scheduleFlowerInteractionFrame(false);
    return;
  }
  cancelFlowerInteractionFrame();
}

function stepFlowerInteractionFrame(timestampMs) {
  STATE.flowerInteractionRafId = null;
  if (STATE.branchGrowth.running) {
    return;
  }
  const nowMs = Number.isFinite(timestampMs) ? timestampMs : performance.now();
  const maxSwayFps = resolveGlobalMaxSwayFps();
  if (maxSwayFps > 0 && isSwayFastPathEnabled()) {
    const minFrameMs = 1000 / maxSwayFps;
    const dueMs = Number.isFinite(STATE.nextInteractionFrameDueMs) ? STATE.nextInteractionFrameDueMs : 0;
    if (dueMs > 0 && nowMs < dueMs - 0.5) {
      scheduleFlowerInteractionFrame(false);
      return;
    }
    const nextDue = (dueMs > 0)
      ? (dueMs + minFrameMs)
      : (nowMs + minFrameMs);
    STATE.nextInteractionFrameDueMs = Math.max(nowMs, nextDue);
  } else {
    STATE.nextInteractionFrameDueMs = 0;
  }
  STATE.lastInteractionRenderMs = nowMs;
  renderScene({ skipAutoStart: true, timestampMs: nowMs });
}

// =========================
// 12) Draw Helpers
// =========================
function drawBackground() {
  ctx.fillStyle = CONFIG.backgroundColor;
  ctx.fillRect(0, 0, STATE.viewportWidth, STATE.viewportHeight);
}

function drawOpenButtonArrowHint(gateConfig = resolveHeroPlaybackGateConfig(), nowMs = performance.now()) {
  if (!gateConfig || !gateConfig.openButtonArrow || gateConfig.openButtonArrow.enabled !== true) {
    return;
  }
  const arrowConfig = gateConfig.openButtonArrow;
  const image = STATE.openButtonArrowImage;
  const spritePath = (
    typeof arrowConfig.spritePath === 'string' && arrowConfig.spritePath.trim().length > 0
  )
    ? arrowConfig.spritePath.trim()
    : '';
  if (
    !image
    || spritePath.length === 0
    || STATE.openButtonArrowImagePath !== spritePath
  ) {
    requestOpenButtonArrowImageLoad().catch(() => {});
    return;
  }
  const currentFrame = getCurrentHeroVideoFrame(gateConfig);
  if (!Number.isFinite(currentFrame) || currentFrame < arrowConfig.appearAfterFrame) {
    return;
  }
  const rect = getHeroVideoRenderedRect();
  if (!rect) {
    return;
  }
  const videoSizePx = Math.min(rect.width, rect.height);
  if (!Number.isFinite(videoSizePx) || videoSizePx <= 0) {
    return;
  }
  const baseWidthPx = videoSizePx * arrowConfig.sizeRatio;
  if (!Number.isFinite(baseWidthPx) || baseWidthPx <= 0) {
    return;
  }
  const imageWidth = Math.max(1, Number(image.width) || 1);
  const imageHeight = Math.max(1, Number(image.height) || 1);
  const drawWidthPx = baseWidthPx;
  const drawHeightPx = drawWidthPx * (imageHeight / imageWidth);

  let alpha = clamp(
    Number.isFinite(Number(arrowConfig.maxOpacity)) ? Number(arrowConfig.maxOpacity) : 1,
    0,
    1,
  );
  const gateState = STATE.heroPlaybackGate;
  if (
    gateState
    && arrowConfig.fadeOutAfterOpenButtonClick === true
    && Number.isFinite(gateState.openButtonClickedAtMs)
  ) {
    const fadeDurationSec = Number.isFinite(Number(arrowConfig.fadeOutDurationSec))
      ? Math.max(0, Number(arrowConfig.fadeOutDurationSec))
      : 0.45;
    if (fadeDurationSec <= 1e-6) {
      alpha = 0;
    } else {
      const elapsedSec = Math.max(0, (nowMs - gateState.openButtonClickedAtMs) / 1000);
      alpha *= clamp(1 - (elapsedSec / fadeDurationSec), 0, 1);
    }
  }
  if (alpha <= 1e-4) {
    return;
  }

  const centerX = rect.left + rect.width * arrowConfig.centerXRatio;
  const centerY = rect.top + rect.height * arrowConfig.centerYRatio;
  const drawX = centerX - drawWidthPx * 0.5;
  const drawY = centerY - drawHeightPx * 0.5;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(image, drawX, drawY, drawWidthPx, drawHeightPx);
  ctx.restore();
}

function drawHeroPlaybackOpenButtonDebugOverlay(
  gateConfig = resolveHeroPlaybackGateConfig(),
  targetCtx = ctx,
) {
  if (!gateConfig || gateConfig.enabled !== true || !targetCtx) {
    return;
  }
  const debugConfig = gateConfig.openButtonDebug;
  if (!debugConfig || debugConfig.enabled !== true) {
    return;
  }
  const hitCircle = resolveHeroPlaybackOpenButtonHitCircle(gateConfig);
  if (!hitCircle || !Number.isFinite(hitCircle.centerX) || !Number.isFinite(hitCircle.centerY)) {
    return;
  }
  const baseRadius = Number.isFinite(hitCircle.baseRadiusPx) ? Math.max(0, hitCircle.baseRadiusPx) : 0;
  const hitRadius = Number.isFinite(hitCircle.radiusPx) ? Math.max(0, hitCircle.radiusPx) : 0;
  const lineWidth = Number.isFinite(debugConfig.lineWidthPx) ? Math.max(0.25, debugConfig.lineWidthPx) : 2;

  targetCtx.save();
  targetCtx.lineWidth = lineWidth;
  if (debugConfig.showPaddedHitCircle !== false && hitRadius > 0) {
    targetCtx.beginPath();
    targetCtx.arc(hitCircle.centerX, hitCircle.centerY, hitRadius, 0, Math.PI * 2);
    targetCtx.fillStyle = debugConfig.hitFillStyle;
    targetCtx.strokeStyle = debugConfig.hitStrokeStyle;
    targetCtx.fill();
    targetCtx.stroke();
  }
  if (debugConfig.showBaseButtonCircle !== false && baseRadius > 0) {
    targetCtx.beginPath();
    targetCtx.arc(hitCircle.centerX, hitCircle.centerY, baseRadius, 0, Math.PI * 2);
    targetCtx.fillStyle = debugConfig.baseFillStyle;
    targetCtx.strokeStyle = debugConfig.baseStrokeStyle;
    targetCtx.fill();
    targetCtx.stroke();
  }
  targetCtx.restore();
}

function drawCircle(x, y, radius, fillColor) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
}

function drawControlPoints(points) {
  for (let i = 0; i < points.length; i += 1) {
    drawCircle(points[i].x, points[i].y, 2, 'rgba(124, 248, 186, 0.5)');
  }
}

function drawControlCurve(points, stroke = 'rgba(74, 222, 128, 0.6)', lineWidth = 1.6) {
  if (!Array.isArray(points) || points.length < 2) {
    return;
  }

  const extended = [points[0], points[0], ...points, points[points.length - 1], points[points.length - 1]];

  ctx.beginPath();
  for (let i = 0; i <= extended.length - 4; i += 1) {
    const p0 = extended[i];
    const p1 = extended[i + 1];
    const p2 = extended[i + 2];
    const p3 = extended[i + 3];

    const startX = (p0.x + 4 * p1.x + p2.x) / 6;
    const startY = (p0.y + 4 * p1.y + p2.y) / 6;
    const cp1X = (4 * p1.x + 2 * p2.x) / 6;
    const cp1Y = (4 * p1.y + 2 * p2.y) / 6;
    const cp2X = (2 * p1.x + 4 * p2.x) / 6;
    const cp2Y = (2 * p1.y + 4 * p2.y) / 6;
    const endX = (p1.x + 4 * p2.x + p3.x) / 6;
    const endY = (p1.y + 4 * p2.y + p3.y) / 6;

    if (i === 0) {
      ctx.moveTo(startX, startY);
    }
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawPathOutline(pathData) {
  const points = samplePathPoints(pathData, CONFIG.debug.pathSampleStep);
  if (points.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = 'rgba(114, 191, 255, 0.9)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawPathVectors(pathData) {
  const spacing = Math.max(16, CONFIG.debug.vectorSampleSpacing);
  for (let d = 0; d <= pathData.totalLength; d += spacing) {
    const point = getPathPointAtLength(pathData, d);
    const tangent = normalize(getPathTangentAtLength(pathData, d));
    const normal = { x: -tangent.y, y: tangent.x };

    drawCircle(point.x, point.y, 2, 'rgba(255, 255, 255, 0.95)');

    if (CONFIG.debug.showTangents) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + tangent.x * 28, point.y + tangent.y * 28);
      ctx.strokeStyle = 'rgba(255, 91, 91, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (CONFIG.debug.showNormals) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + normal.x * 20, point.y + normal.y * 20);
      ctx.strokeStyle = 'rgba(85, 242, 147, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
}

function drawStripCenters(stripCenters) {
  if (!stripCenters || stripCenters.length === 0) {
    return;
  }

  const step = Math.max(1, Math.floor(stripCenters.length / 350));
  for (let i = 0; i < stripCenters.length; i += step) {
    const p = stripCenters[i];
    drawCircle(p.x, p.y, 1.3, 'rgba(255, 202, 39, 0.32)');
  }
}

function getBrushScale(brushConfig) {
  const foliageScale = resolveGlobalFoliageScale();
  if (Number.isFinite(brushConfig.scale) && brushConfig.scale > 0) {
    return brushConfig.scale * foliageScale;
  }
  if (Number.isFinite(brushConfig.sclale) && brushConfig.sclale > 0) {
    return brushConfig.sclale * foliageScale;
  }
  return 0.5 * foliageScale;
}

function getBrushGlobalHueDeg(brushConfig) {
  const hueDeg = Number(brushConfig.globalHueDeg);
  return Number.isFinite(hueDeg) ? hueDeg : 0;
}

function getBrushGlobalBrightness(brushConfig) {
  const brightness = Number(brushConfig.globalBrightness);
  if (!Number.isFinite(brightness)) {
    return 1;
  }
  return Math.max(0, brightness);
}

function isBranchFilterRandomizationEnabled(brushConfig) {
  return Boolean(brushConfig.randomizeBranchFilter);
}

function getBrushRandomHueRangeDeg(brushConfig) {
  const minCandidate = Number(brushConfig.randomHueMinDeg);
  const maxCandidate = Number(brushConfig.randomHueMaxDeg);
  const minDeg = Number.isFinite(minCandidate) ? minCandidate : 0;
  const maxDeg = Number.isFinite(maxCandidate) ? maxCandidate : 0;
  return minDeg <= maxDeg ? [minDeg, maxDeg] : [maxDeg, minDeg];
}

function getBrushRandomBrightnessRange(brushConfig) {
  const minCandidate = Number(brushConfig.randomBrightnessMin);
  const maxCandidate = Number(brushConfig.randomBrightnessMax);
  const minBrightness = Number.isFinite(minCandidate) ? Math.max(0, minCandidate) : 1;
  const maxBrightness = Number.isFinite(maxCandidate) ? Math.max(0, maxCandidate) : 1;
  return minBrightness <= maxBrightness
    ? [minBrightness, maxBrightness]
    : [maxBrightness, minBrightness];
}

function getBrushRandomFilterVariantCount(brushConfig) {
  const count = Number(brushConfig.randomFilterVariantCount);
  if (!Number.isFinite(count)) {
    return 24;
  }
  return clamp(Math.round(count), 1, 512);
}

function getBrushRandomFilterAssignmentMode(brushConfig) {
  return brushConfig.randomFilterAssignmentMode === 'inheritParent'
    ? 'inheritParent'
    : 'perBranch';
}

function getBranchStableToken(branch, fallbackIndex = 0) {
  if (branch && typeof branch.stableKey === 'string' && branch.stableKey.length > 0) {
    return branch.stableKey;
  }
  if (branch && Number.isFinite(branch.id)) {
    return `id:${branch.id}`;
  }
  return `idx:${fallbackIndex}`;
}

function buildRandomBranchFilterVariants(brushConfig) {
  const [hueMinDeg, hueMaxDeg] = getBrushRandomHueRangeDeg(brushConfig);
  const [brightnessMin, brightnessMax] = getBrushRandomBrightnessRange(brushConfig);
  const variantCount = getBrushRandomFilterVariantCount(brushConfig);
  const seedKey = [
    hueMinDeg.toFixed(4),
    hueMaxDeg.toFixed(4),
    brightnessMin.toFixed(4),
    brightnessMax.toFixed(4),
    variantCount,
  ].join('|');
  const rng = mulberry32(hashSeed(`branch-filter-variants|${seedKey}`));
  const variants = [];
  for (let i = 0; i < variantCount; i += 1) {
    variants.push({
      hueDeg: sampleRangeValue(hueMinDeg, hueMaxDeg, rng),
      brightness: sampleRangeValue(brightnessMin, brightnessMax, rng),
    });
  }
  return variants;
}

function sampleRangeValue(rangeMin, rangeMax, rng) {
  if (!Number.isFinite(rangeMin) || !Number.isFinite(rangeMax)) {
    return 0;
  }
  if (Math.abs(rangeMax - rangeMin) <= 1e-8) {
    return rangeMin;
  }
  return rangeMin + (rangeMax - rangeMin) * rng();
}

function getBranchFilterValues(branch, brushConfig) {
  const globalHueDeg = getBrushGlobalHueDeg(brushConfig);
  const globalBrightness = getBrushGlobalBrightness(brushConfig);
  const branchHueDeg = branch && Number.isFinite(branch.filterHueDeg) ? branch.filterHueDeg : 0;
  const branchBrightness = branch && Number.isFinite(branch.filterBrightness)
    ? Math.max(0, branch.filterBrightness)
    : 1;
  return {
    hueDeg: globalHueDeg + branchHueDeg,
    brightness: Math.max(0, globalBrightness * branchBrightness),
  };
}

function resetFilteredStemTextureCache() {
  STATE.filteredStemTextureCache = new WeakMap();
  if (!STATE.branchGarden || !Array.isArray(STATE.branchGarden.branches)) {
    return;
  }
  for (let i = 0; i < STATE.branchGarden.branches.length; i += 1) {
    const branch = STATE.branchGarden.branches[i];
    if (!branch) {
      continue;
    }
    branch.filteredStemImage = null;
    branch.filteredStemImageFlipped = null;
  }
}

function quantizeFilterValue(value, step) {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value / safeStep) * safeStep;
}

function ensureFilteredTextureBucket(sourceImage) {
  if (!sourceImage) {
    return null;
  }
  let bucket = STATE.filteredStemTextureCache.get(sourceImage);
  if (!bucket) {
    bucket = new Map();
    STATE.filteredStemTextureCache.set(sourceImage, bucket);
  }
  return bucket;
}

function getPrecomputedFilteredTexture(sourceImage, hueDeg, brightness) {
  if (!sourceImage) {
    return sourceImage;
  }

  const normalizedBrightness = Number.isFinite(brightness) ? Math.max(0, brightness) : 1;
  const normalizedHue = Number.isFinite(hueDeg) ? hueDeg : 0;
  const qHue = quantizeFilterValue(normalizedHue, FILTER_CACHE_HUE_STEP_DEG);
  const qBrightness = quantizeFilterValue(normalizedBrightness, FILTER_CACHE_BRIGHTNESS_STEP);

  if (Math.abs(qHue) <= 1e-6 && Math.abs(qBrightness - 1) <= 1e-6) {
    return sourceImage;
  }

  const bucket = ensureFilteredTextureBucket(sourceImage);
  if (!bucket) {
    return sourceImage;
  }
  const key = `${qHue}|${qBrightness}`;
  const cached = bucket.get(key);
  if (cached) {
    return cached;
  }

  const texture = document.createElement('canvas');
  texture.width = sourceImage.width;
  texture.height = sourceImage.height;
  const tctx = texture.getContext('2d');
  if (!tctx || typeof tctx.filter !== 'string') {
    return sourceImage;
  }

  tctx.filter = `hue-rotate(${qHue}deg) brightness(${qBrightness})`;
  tctx.drawImage(sourceImage, 0, 0);
  tctx.filter = 'none';
  bucket.set(key, texture);
  return texture;
}

function assignBranchStemTextures(branch, brushConfig = CONFIG.brush) {
  if (!branch || !STATE.stemImage) {
    return { defaultImage: null, flippedImage: null };
  }

  const values = getBranchFilterValues(branch, brushConfig);
  const defaultImage = getPrecomputedFilteredTexture(STATE.stemImage, values.hueDeg, values.brightness);
  const baseFlippedImage = STATE.stemImageFlippedX || STATE.stemImage;
  const flippedImage = getPrecomputedFilteredTexture(baseFlippedImage, values.hueDeg, values.brightness);

  branch.filteredStemImage = defaultImage;
  branch.filteredStemImageFlipped = flippedImage;
  return { defaultImage, flippedImage };
}

function getBranchStemTextures(branch, brushConfig = CONFIG.brush) {
  if (!branch || !STATE.stemImage) {
    return { defaultImage: null, flippedImage: null };
  }
  if (branch.filteredStemImage && branch.filteredStemImageFlipped) {
    return {
      defaultImage: branch.filteredStemImage,
      flippedImage: branch.filteredStemImageFlipped,
    };
  }
  return assignBranchStemTextures(branch, brushConfig);
}

function isBrushThicknessTaperEnabled(brushConfig) {
  if (!brushConfig || typeof brushConfig !== 'object') {
    return true;
  }
  if (brushConfig.thicknessTaperEnabled === undefined) {
    return true;
  }
  return Boolean(brushConfig.thicknessTaperEnabled);
}

function getBrushThicknessMinScale(brushConfig) {
  if (!brushConfig || typeof brushConfig !== 'object') {
    return 0.1;
  }
  const minScale = Number(brushConfig.thicknessMinScale);
  if (!Number.isFinite(minScale)) {
    return 0.1;
  }
  return clamp(minScale, 0.01, 1);
}

function getBrushThicknessTaperExponent(brushConfig) {
  if (!brushConfig || typeof brushConfig !== 'object') {
    return 1;
  }
  const exponent = Number(brushConfig.thicknessTaperExponent);
  if (!Number.isFinite(exponent)) {
    return 1;
  }
  return Math.max(0.01, exponent);
}

function getBrushThicknessMinWidth(brushConfig) {
  const foliageScale = resolveGlobalFoliageScale();
  if (!brushConfig || typeof brushConfig !== 'object') {
    return 0;
  }
  const minWidth = Number(brushConfig.thicknessMinWidth);
  if (!Number.isFinite(minWidth)) {
    return 0;
  }
  return Math.max(0, minWidth) * foliageScale;
}

function getBranchThicknessBaseScale(branch) {
  if (!branch || !Number.isFinite(branch.thicknessBaseScale)) {
    return 1;
  }
  return Math.max(0.01, branch.thicknessBaseScale);
}

function getThicknessTaperFactorAtDistance(distanceOnPath, referenceLength, brushConfig) {
  if (!isBrushThicknessTaperEnabled(brushConfig)) {
    return 1;
  }
  const minScale = getBrushThicknessMinScale(brushConfig);
  const safeReferenceLength = Number.isFinite(referenceLength)
    ? Math.max(1e-6, referenceLength)
    : 1;
  const normalizedDistance = clamp(
    Number.isFinite(distanceOnPath) ? distanceOnPath / safeReferenceLength : 1,
    0,
    1,
  );
  const exponent = getBrushThicknessTaperExponent(brushConfig);
  const weightedDistance = exponent === 1
    ? normalizedDistance
    : Math.pow(normalizedDistance, exponent);
  return 1 + (minScale - 1) * weightedDistance;
}

function getBrushCacheKey(brushConfig) {
  const brushScale = getBrushScale(brushConfig);
  const stripWidth = Number.isFinite(Number(brushConfig.stripWidth))
    ? Math.max(0.1, Number(brushConfig.stripWidth))
    : 0.1;
  const repeatOverlap = Number.isFinite(Number(brushConfig.repeatOverlap))
    ? Number(brushConfig.repeatOverlap)
    : 0;
  const repeatGap = Number.isFinite(Number(brushConfig.repeatGap))
    ? Number(brushConfig.repeatGap)
    : 0;
  const startOffset = Number.isFinite(Number(brushConfig.startOffset))
    ? Number(brushConfig.startOffset)
    : 0;
  const pathOffset = Number.isFinite(Number(brushConfig.pathOffset))
    ? Number(brushConfig.pathOffset)
    : 0;
  const cropPartialRepeat = brushConfig.cropPartialRepeat ? 1 : 0;
  return [
    brushScale,
    stripWidth,
    repeatOverlap,
    repeatGap,
    startOffset,
    pathOffset,
    cropPartialRepeat,
  ].join('|');
}

function getBranchRenderCache(branch) {
  if (!branch) {
    return null;
  }
  if (!branch.renderCache || typeof branch.renderCache !== 'object') {
    branch.renderCache = {
      valid: false,
      samples: [],
      distances: [],
      centerX: [],
      centerY: [],
      cacheKey: '',
      pathDataRef: null,
      defaultImageRef: null,
      flippedImageRef: null,
    };
  }
  return branch.renderCache;
}

function invalidateBranchStripCache(branch) {
  const cache = getBranchRenderCache(branch);
  if (!cache) {
    return;
  }
  cache.valid = false;
  cache.pathDataRef = null;
  cache.defaultImageRef = null;
  cache.flippedImageRef = null;
}

function invalidateAllBranchStripCaches() {
  if (!STATE.branchGarden || !Array.isArray(STATE.branchGarden.branches)) {
    return;
  }
  for (let i = 0; i < STATE.branchGarden.branches.length; i += 1) {
    invalidateBranchStripCache(STATE.branchGarden.branches[i]);
  }
}

function getCompletedBranchLayerState(layerName = 'single') {
  if (layerName === 'back') {
    return STATE.completedLayerBack;
  }
  if (layerName === 'front') {
    return STATE.completedLayerFront;
  }
  return STATE.completedLayer;
}

function ensureCompletedBranchLayer(layerName = 'single') {
  const layer = getCompletedBranchLayerState(layerName);
  if (!layer.canvas) {
    layer.canvas = document.createElement('canvas');
    layer.ctx = layer.canvas.getContext('2d');
  }
  if (!(layer.committedBranchIds instanceof Set)) {
    layer.committedBranchIds = new Set();
  }
  if (!(layer.committedStemEndByBranchId instanceof Map)) {
    layer.committedStemEndByBranchId = new Map();
  }

  const targetCanvas = layerName === 'front' ? (frontCanvas || canvas) : canvas;
  const desiredWidth = targetCanvas.width;
  const desiredHeight = targetCanvas.height;
  if (layer.canvas.width !== desiredWidth || layer.canvas.height !== desiredHeight) {
    layer.canvas.width = desiredWidth;
    layer.canvas.height = desiredHeight;
    layer.committedBranchIds.clear();
    layer.committedStemEndByBranchId.clear();
  }

  if (layer.ctx) {
    layer.ctx.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
  }
  return layer;
}

function clearCompletedBranchLayer(layer) {
  if (!layer || typeof layer !== 'object') {
    return;
  }
  layer.committedBranchIds.clear();
  layer.committedStemEndByBranchId.clear();
  layer.leavesConfigKey = '';
  if (!layer.canvas || !layer.ctx) {
    return;
  }
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  layer.ctx.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
}

function hasCompletedBranchLayerContent(layerName = 'single') {
  const layer = getCompletedBranchLayerState(layerName);
  if (!layer) {
    return false;
  }
  const hasCommittedIds = layer.committedBranchIds instanceof Set && layer.committedBranchIds.size > 0;
  const hasCommittedStemRanges = (
    layer.committedStemEndByBranchId instanceof Map
    && layer.committedStemEndByBranchId.size > 0
  );
  const hasLeavesKey = typeof layer.leavesConfigKey === 'string' && layer.leavesConfigKey.length > 0;
  return hasCommittedIds || hasCommittedStemRanges || hasLeavesKey;
}

function invalidateCompletedBranchLayer(layerName = 'all') {
  if (layerName === 'all') {
    clearCompletedBranchLayer(STATE.completedLayer);
    clearCompletedBranchLayer(STATE.completedLayerBack);
    clearCompletedBranchLayer(STATE.completedLayerFront);
  } else {
    clearCompletedBranchLayer(getCompletedBranchLayerState(layerName));
  }
  invalidateLeafOverlayCache();
}

function invalidateLeafOverlayCache() {
  const cache = STATE.leafOverlayCache;
  cache.valid = false;
  cache.layoutKey = '';
  cache.branchCount = 0;
  cache.branchPathRefs.length = 0;
  cache.leaves.length = 0;
}

function ensureLeafOverlayCache(leavesConfig) {
  const cache = STATE.leafOverlayCache;
  const branches = STATE.branchGarden && Array.isArray(STATE.branchGarden.branches)
    ? STATE.branchGarden.branches
    : [];
  let mustRebuild = cache.valid !== true || cache.layoutKey !== leavesConfig.layoutKey;
  if (!mustRebuild) {
    if (cache.branchCount !== branches.length || cache.branchPathRefs.length !== branches.length) {
      mustRebuild = true;
    } else {
      for (let i = 0; i < branches.length; i += 1) {
        const branch = branches[i];
        const pathRef = branch ? branch.pathData : null;
        if (cache.branchPathRefs[i] !== pathRef) {
          mustRebuild = true;
          break;
        }
      }
    }
  }
  if (!mustRebuild) {
    return cache;
  }

  cache.leaves.length = 0;
  cache.branchPathRefs.length = 0;
  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    cache.branchPathRefs.push(branch ? branch.pathData : null);
    if (!branch || !branch.pathData) {
      continue;
    }
    const leaves = ensureBranchLeaves(branch, leavesConfig, i);
    if (!Array.isArray(leaves) || leaves.length === 0) {
      continue;
    }
    for (let j = 0; j < leaves.length; j += 1) {
      cache.leaves.push(leaves[j]);
    }
  }
  cache.layoutKey = leavesConfig.layoutKey;
  cache.branchCount = branches.length;
  cache.valid = true;
  return cache;
}

function getBranchRenderId(branch) {
  if (branch && Number.isFinite(branch.id)) {
    return `id:${branch.id}`;
  }
  return `stable:${branch && branch.stableKey ? branch.stableKey : 'unknown'}`;
}

function resolveLeavesConfig(leavesConfigCandidate = CONFIG.leaves || {}) {
  const safeConfig = isPlainObjectLiteral(leavesConfigCandidate) ? leavesConfigCandidate : {};
  const floralScale = resolveFloralResponsiveScaleFactor() * resolveGlobalFoliageScale();
  const enabled = safeConfig.enabled !== false;
  const deterministic = safeConfig.deterministic !== false;
  const spritePath = (typeof safeConfig.spritePath === 'string' && safeConfig.spritePath.length > 0)
    ? safeConfig.spritePath
    : './leaves_new.webp';
  const spriteCellWidth = Number.isFinite(Number(safeConfig.spriteCellWidth))
    ? Math.max(1, Number(safeConfig.spriteCellWidth))
    : 44;
  const spriteCellHeight = Number.isFinite(Number(safeConfig.spriteCellHeight))
    ? Math.max(1, Number(safeConfig.spriteCellHeight))
    : 45.819;
  const spriteScale = Number.isFinite(Number(safeConfig.spriteScale))
    ? Math.max(0.01, Number(safeConfig.spriteScale))
    : 8.3333333;
  const spriteCols = Number.isFinite(Number(safeConfig.spriteCols))
    ? Math.max(1, Math.floor(Number(safeConfig.spriteCols)))
    : 10;
  const spriteRows = Number.isFinite(Number(safeConfig.spriteRows))
    ? Math.max(1, Math.floor(Number(safeConfig.spriteRows)))
    : 8;
  const spriteRowRangeInput = Array.isArray(safeConfig.spriteRowRange) ? safeConfig.spriteRowRange : null;
  let spriteRowMinOneBased = NaN;
  let spriteRowMaxOneBased = NaN;
  if (spriteRowRangeInput && spriteRowRangeInput.length >= 2) {
    const rowA = Number(spriteRowRangeInput[0]);
    const rowB = Number(spriteRowRangeInput[1]);
    if (Number.isFinite(rowA) && Number.isFinite(rowB)) {
      spriteRowMinOneBased = clamp(Math.floor(Math.min(rowA, rowB)), 1, spriteRows);
      spriteRowMaxOneBased = clamp(Math.floor(Math.max(rowA, rowB)), 1, spriteRows);
    }
  }
  if (!Number.isFinite(spriteRowMinOneBased) || !Number.isFinite(spriteRowMaxOneBased)) {
    const spriteRowOneBasedInput = Number(safeConfig.spriteRow);
    const spriteRowOneBased = Number.isFinite(spriteRowOneBasedInput)
      ? clamp(Math.floor(spriteRowOneBasedInput), 1, spriteRows)
      : clamp(5, 1, spriteRows);
    spriteRowMinOneBased = spriteRowOneBased;
    spriteRowMaxOneBased = spriteRowOneBased;
  }
  const spriteRowMinIndex = spriteRowMinOneBased - 1;
  const spriteRowMaxIndex = spriteRowMaxOneBased - 1;
  const drawSizeRangeRaw = resolveRangeValue(
    safeConfig.drawSizeRange,
    safeConfig.drawSize,
    70,
    70,
    70,
  );
  const drawSizeRange = [
    Math.max(1, drawSizeRangeRaw[0] * floralScale),
    Math.max(1, drawSizeRangeRaw[1] * floralScale),
  ];
  drawSizeRange.sort((a, b) => a - b);
  const drawSize = drawSizeRange[0];
  const drawSizeBaseMultiplierInput = Number(safeConfig.drawSizeBaseMultiplier);
  const drawSizeBaseMultiplier = Number.isFinite(drawSizeBaseMultiplierInput)
    ? Math.max(0.01, drawSizeBaseMultiplierInput)
    : 1;
  const drawSizeBaseMultiplierEaseInInput = Number(safeConfig.drawSizeBaseMultiplierEaseIn);
  const drawSizeBaseMultiplierEaseIn = Number.isFinite(drawSizeBaseMultiplierEaseInInput)
    ? clamp(drawSizeBaseMultiplierEaseInInput, 0, 1)
    : 0;
  const growthEnabled = safeConfig.growthEnabled !== false;
  const growthMinScaleInput = Number(safeConfig.growthMinScale);
  const growthMinScale = Number.isFinite(growthMinScaleInput)
    ? clamp(growthMinScaleInput, 0, 1)
    : 0.15;
  const growthDurationSecInput = Number(safeConfig.growthDurationSec);
  const growthDurationSec = Number.isFinite(growthDurationSecInput)
    ? Math.max(0, growthDurationSecInput)
    : 0.6;
  const growthEase = sanitizeLeafGrowthEaseMode(safeConfig.growthEase);
  const growthEasePowerInput = Number(safeConfig.growthEasePower);
  const growthEasePower = Number.isFinite(growthEasePowerInput)
    ? Math.max(0.01, growthEasePowerInput)
    : 2;
  const swayEnabled = safeConfig.swayEnabled !== false;
  const swayMode = resolveGlobalSwayMode();
  const swayInteractionRadiusFactor = Number.isFinite(Number(safeConfig.swayInteractionRadiusFactor))
    ? Math.max(0, Number(safeConfig.swayInteractionRadiusFactor))
    : 2.1;
  const swayRiseSpeed = Number.isFinite(Number(safeConfig.swayRiseSpeed))
    ? Math.max(0, Number(safeConfig.swayRiseSpeed))
    : 5.5;
  const swayFallSpeed = Number.isFinite(Number(safeConfig.swayFallSpeed))
    ? Math.max(0, Number(safeConfig.swayFallSpeed))
    : 0.5;
  const swayEpsilon = Number.isFinite(Number(safeConfig.swayEpsilon))
    ? Math.max(0, Number(safeConfig.swayEpsilon))
    : 0.0008;
  const mouseSpeedSwayAffect = Number.isFinite(Number(safeConfig.mouseSpeedSwayAffect))
    ? Math.max(0, Number(safeConfig.mouseSpeedSwayAffect))
    : 0.7;
  const swayAmplitudeDegRange = normalizeRangeInput(safeConfig.swayAmplitudeDegRange, 0.8, 2.6);
  const swaySpeedRange = normalizeRangeInput(safeConfig.swaySpeedRange, 0.7, 1.6);
  const countRangeRaw = normalizeRangeInput(safeConfig.countRange, 8, 16);
  const countRange = [
    Math.max(0, Math.floor(countRangeRaw[0])),
    Math.max(0, Math.floor(countRangeRaw[1])),
  ];
  countRange.sort((a, b) => a - b);
  const spawnTMinInput = Number(safeConfig.spawnTMin);
  const spawnTMaxInput = Number(safeConfig.spawnTMax);
  const spawnTMinRaw = Number.isFinite(spawnTMinInput) ? spawnTMinInput : 0.08;
  const spawnTMaxRaw = Number.isFinite(spawnTMaxInput) ? spawnTMaxInput : 0.94;
  const spawnTMin = clamp(Math.min(spawnTMinRaw, spawnTMaxRaw), 0, 1);
  const spawnTMax = clamp(Math.max(spawnTMinRaw, spawnTMaxRaw), 0, 1);
  const spawnBiasMode = sanitizeLeafSpawnBiasMode(safeConfig.spawnBiasMode);
  const spawnBiasExponentInput = Number(safeConfig.spawnBiasExponent);
  const spawnBiasExponent = Number.isFinite(spawnBiasExponentInput)
    ? Math.max(0.01, spawnBiasExponentInput)
    : 1.6;
  const minSpawnSpacingTInput = Number(safeConfig.minSpawnSpacingT);
  const minSpawnSpacingT = Number.isFinite(minSpawnSpacingTInput)
    ? clamp(minSpawnSpacingTInput, 0, 1)
    : 0.03;
  const maxSpawnAttemptsPerLeafInput = Number(safeConfig.maxSpawnAttemptsPerLeaf);
  const maxSpawnAttemptsPerLeaf = Number.isFinite(maxSpawnAttemptsPerLeafInput)
    ? Math.max(1, Math.floor(maxSpawnAttemptsPerLeafInput))
    : 40;
  const sideMode = sanitizeSideMode(safeConfig.sideMode);
  const rotationAwayFromNormalDegRange = normalizeRangeInput(
    safeConfig.rotationAwayFromNormalDegRange,
    -22,
    22,
  );
  const layoutKey = [
    enabled ? 1 : 0,
    deterministic ? 1 : 0,
    countRange[0],
    countRange[1],
    spawnTMin,
    spawnTMax,
    spawnBiasMode,
    spawnBiasExponent,
    minSpawnSpacingT,
    maxSpawnAttemptsPerLeaf,
    sideMode,
  ].join('|');
  const appearanceKey = [
    spritePath,
    spriteCellWidth,
    spriteCellHeight,
    spriteScale,
    spriteCols,
    spriteRows,
    spriteRowMinIndex,
    spriteRowMaxIndex,
    floralScale,
    drawSizeRange[0],
    drawSizeRange[1],
    drawSizeBaseMultiplier,
    drawSizeBaseMultiplierEaseIn,
    growthEnabled ? 1 : 0,
    growthMinScale,
    growthDurationSec,
    growthEase,
    growthEasePower,
    swayEnabled ? 1 : 0,
    swayMode,
    swayInteractionRadiusFactor,
    swayRiseSpeed,
    swayFallSpeed,
    swayEpsilon,
    mouseSpeedSwayAffect,
    swayAmplitudeDegRange[0],
    swayAmplitudeDegRange[1],
    swaySpeedRange[0],
    swaySpeedRange[1],
    rotationAwayFromNormalDegRange[0],
    rotationAwayFromNormalDegRange[1],
  ].join('|');
  const cacheKey = `${layoutKey}||${appearanceKey}`;

  return {
    enabled,
    deterministic,
    spritePath,
    spriteCellWidth,
    spriteCellHeight,
    spriteScale,
    spriteCols,
    spriteRows,
    spriteRowMinIndex,
    spriteRowMaxIndex,
    floralResponsiveScaleFactor: floralScale,
    drawSize,
    drawSizeRange,
    drawSizeBaseMultiplier,
    drawSizeBaseMultiplierEaseIn,
    growthEnabled,
    growthMinScale,
    growthDurationSec,
    growthEase,
    growthEasePower,
    swayEnabled,
    swayMode,
    swayInteractionRadiusFactor,
    swayRiseSpeed,
    swayFallSpeed,
    swayEpsilon,
    mouseSpeedSwayAffect,
    swayAmplitudeDegRange,
    swaySpeedRange,
    countRange,
    spawnTMin,
    spawnTMax,
    spawnBiasMode,
    spawnBiasExponent,
    minSpawnSpacingT,
    maxSpawnAttemptsPerLeaf,
    sideMode,
    rotationAwayFromNormalDegRange,
    layoutKey,
    appearanceKey,
    cacheKey,
  };
}

function getLeafSpriteSourceRect(leavesConfig, col, row = leavesConfig.spriteRowMinIndex) {
  const safeCol = clamp(
    Math.floor(Number.isFinite(col) ? col : 0),
    0,
    Math.max(0, leavesConfig.spriteCols - 1),
  );
  const safeRow = clamp(
    Math.floor(Number.isFinite(row) ? row : leavesConfig.spriteRowMinIndex),
    0,
    Math.max(0, leavesConfig.spriteRows - 1),
  );
  return {
    sx: safeCol * leavesConfig.spriteCellWidth * leavesConfig.spriteScale,
    sy: safeRow * leavesConfig.spriteCellHeight * leavesConfig.spriteScale,
    sw: leavesConfig.spriteCellWidth * leavesConfig.spriteScale,
    sh: leavesConfig.spriteCellHeight * leavesConfig.spriteScale,
  };
}

function getBranchLeafCache(branch) {
  if (!branch) {
    return null;
  }
  if (!branch.leafCache || typeof branch.leafCache !== 'object') {
    branch.leafCache = {
      pathDataRef: null,
      layoutKey: '',
      appearanceKey: '',
      leaves: [],
      bounds: null,
    };
  }
  return branch.leafCache;
}

function resolveBranchStemHalfWidth(branch, distanceOnPath, referenceLength, brushConfig = CONFIG.brush) {
  if (!branch || !STATE.stemImage) {
    return 0;
  }
  const branchTextures = getBranchStemTextures(branch, brushConfig);
  const sourceImage = branchTextures && branchTextures.defaultImage
    ? branchTextures.defaultImage
    : STATE.stemImage;
  if (!sourceImage || !Number.isFinite(sourceImage.width) || sourceImage.width <= 0) {
    return 0;
  }

  const brushScale = getBrushScale(brushConfig);
  const branchThicknessBaseScale = getBranchThicknessBaseScale(branch);
  const taperFactor = getThicknessTaperFactorAtDistance(distanceOnPath, referenceLength, brushConfig);
  let widthOnPath = sourceImage.width * brushScale * branchThicknessBaseScale * taperFactor;
  if (isBrushThicknessTaperEnabled(brushConfig)) {
    const minWidth = getBrushThicknessMinWidth(brushConfig);
    if (minWidth > 0) {
      widthOnPath = Math.max(widthOnPath, minWidth);
    }
  }
  return Math.max(0, widthOnPath * 0.5);
}

function sampleLeafSpawnT(leavesConfig, rng) {
  const span = leavesConfig.spawnTMax - leavesConfig.spawnTMin;
  if (span <= 1e-8) {
    return leavesConfig.spawnTMin;
  }

  const u = clamp(rng(), 0, 1);
  let biased = u;
  if (leavesConfig.spawnBiasMode === 'towardBase') {
    biased = Math.pow(u, leavesConfig.spawnBiasExponent);
  } else if (leavesConfig.spawnBiasMode === 'towardTip') {
    biased = 1 - Math.pow(1 - u, leavesConfig.spawnBiasExponent);
  }
  return leavesConfig.spawnTMin + span * biased;
}

function isLeafSwayActive(leavesConfig = resolveLeavesConfig(CONFIG.leaves || {})) {
  if (!leavesConfig || leavesConfig.enabled !== true || leavesConfig.swayEnabled !== true) {
    return false;
  }
  if (leavesConfig.swayMode !== 'always') {
    if (Number.isFinite(STATE.pointerX) && Number.isFinite(STATE.pointerY)) {
      return true;
    }
    const cachedLeaves = STATE.leafOverlayCache && Array.isArray(STATE.leafOverlayCache.leaves)
      ? STATE.leafOverlayCache.leaves
      : null;
    if (cachedLeaves && cachedLeaves.length > 0) {
      for (let i = 0; i < cachedLeaves.length; i += 1) {
        const leaf = cachedLeaves[i];
        if ((Number(leaf.hoverInfluence) || 0) > leavesConfig.swayEpsilon) {
          return true;
        }
      }
    }
    return false;
  }
  const maxAmplitudeDeg = Math.max(
    Math.abs(Number(leavesConfig.swayAmplitudeDegRange[0]) || 0),
    Math.abs(Number(leavesConfig.swayAmplitudeDegRange[1]) || 0),
  );
  const maxSpeed = Math.max(
    Math.abs(Number(leavesConfig.swaySpeedRange[0]) || 0),
    Math.abs(Number(leavesConfig.swaySpeedRange[1]) || 0),
  );
  return maxAmplitudeDeg > 1e-6 && maxSpeed > 1e-6;
}

function resolveLeafSwayInfluence(leaf, leavesConfig, nowMs) {
  if (!leaf || !leavesConfig) {
    return 0;
  }
  if (!Number.isFinite(leaf.hoverInfluence)) {
    leaf.hoverInfluence = leavesConfig.swayMode === 'always' ? 1 : 0;
  }
  if (!Number.isFinite(leaf.targetInfluence)) {
    leaf.targetInfluence = leavesConfig.swayMode === 'always' ? 1 : 0;
  }
  if (!Number.isFinite(leaf.motionTime)) {
    leaf.motionTime = 0;
  }
  if (!Number.isFinite(leaf.lastSwayUpdateMs) || leaf.lastSwayUpdateMs <= 0) {
    leaf.lastSwayUpdateMs = Number.isFinite(nowMs) ? nowMs : performance.now();
  }

  const updateNowMs = Number.isFinite(nowMs) ? nowMs : performance.now();
  const dtSec = clamp((updateNowMs - leaf.lastSwayUpdateMs) / 1000, 0, 0.05);
  leaf.lastSwayUpdateMs = updateNowMs;

  const mouseSpeedDecayPxPerSec = 2600;
  STATE.pointerSpeedPxPerSec = Math.max(0, STATE.pointerSpeedPxPerSec - (mouseSpeedDecayPxPerSec * dtSec));
  const mouseSpeedNorm = clamp((STATE.pointerSpeedPxPerSec || 0) / 1600, 0, 1);
  const mouseSwayScale = clamp(
    1 + (mouseSpeedNorm * Math.max(0, Number(leavesConfig.mouseSpeedSwayAffect) || 0)),
    1,
    8,
  );

  if (leavesConfig.swayMode === 'always') {
    leaf.targetInfluence = 1;
  } else if (!Number.isFinite(STATE.pointerX) || !Number.isFinite(STATE.pointerY)) {
    leaf.targetInfluence = 0;
  } else {
    const leafDrawSize = Number.isFinite(leaf.drawSize) ? Math.max(1, leaf.drawSize) : 1;
    const interactionRadius = leafDrawSize * Math.max(0, leavesConfig.swayInteractionRadiusFactor);
    if (interactionRadius <= 1e-6) {
      leaf.targetInfluence = 0;
    } else {
      const dx = STATE.pointerX - leaf.x;
      const dy = STATE.pointerY - leaf.y;
      const distance = Math.hypot(dx, dy);
      leaf.targetInfluence = distance >= interactionRadius ? 0 : (1 - distance / interactionRadius) * mouseSwayScale;
    }
  }

  const influenceSpeed = leaf.targetInfluence > leaf.hoverInfluence
    ? leavesConfig.swayRiseSpeed
    : leavesConfig.swayFallSpeed;
  const maxStep = Math.max(0, influenceSpeed * mouseSwayScale * dtSec);
  if (leaf.hoverInfluence < leaf.targetInfluence) {
    leaf.hoverInfluence = Math.min(leaf.hoverInfluence + maxStep, leaf.targetInfluence);
  } else {
    leaf.hoverInfluence = Math.max(leaf.hoverInfluence - maxStep, leaf.targetInfluence);
  }
  if (leaf.targetInfluence === 0 && leaf.hoverInfluence <= leavesConfig.swayEpsilon) {
    leaf.hoverInfluence = 0;
  }
  if (leaf.hoverInfluence > 0 || leaf.targetInfluence > 0) {
    leaf.motionTime += dtSec * mouseSwayScale;
  }
  return leaf.hoverInfluence;
}

function evaluateLeafGrowthEaseT(t, easeMode, easePower) {
  const clampedT = clamp(Number.isFinite(t) ? t : 0, 0, 1);
  const power = Number.isFinite(easePower) ? Math.max(0.01, easePower) : 2;
  if (easeMode === 'linear') {
    return clampedT;
  }
  if (easeMode === 'easeIn') {
    return Math.pow(clampedT, power);
  }
  if (easeMode === 'easeInOut') {
    if (clampedT <= 0.5) {
      return 0.5 * Math.pow(clampedT * 2, power);
    }
    return 1 - (0.5 * Math.pow((1 - clampedT) * 2, power));
  }
  return 1 - Math.pow(1 - clampedT, power);
}

function resolveLeafGrowthScale(leaf, branch, leavesConfig) {
  if (!leaf || !branch || !leavesConfig || leavesConfig.growthEnabled !== true || CONFIG.branchGrowth.enabled !== true) {
    return 1;
  }
  const durationSec = Number.isFinite(leavesConfig.growthDurationSec)
    ? Math.max(0, leavesConfig.growthDurationSec)
    : 0;
  if (durationSec <= 1e-8) {
    return 1;
  }
  const ratePxPerSec = Number.isFinite(STATE.branchGrowth && STATE.branchGrowth.globalRatePxPerSec)
    ? Math.max(0, STATE.branchGrowth.globalRatePxPerSec)
    : 0;
  if (ratePxPerSec <= 1e-8) {
    return 1;
  }
  const elapsedSec = Number.isFinite(STATE.branchGrowth && STATE.branchGrowth.elapsedSec)
    ? Math.max(0, STATE.branchGrowth.elapsedSec)
    : 0;
  const branchStartMetric = Number.isFinite(branch.startDistanceMetric)
    ? Math.max(0, branch.startDistanceMetric)
    : 0;
  const branchSweepStartDelaySec = Number.isFinite(branch.sweepStartDelaySec)
    ? Math.max(0, branch.sweepStartDelaySec)
    : 0;
  const leafDistanceOnBranch = Number.isFinite(leaf.distanceOnPath)
    ? Math.max(0, leaf.distanceOnPath)
    : 0;
  const spawnTimeSec = branchSweepStartDelaySec + ((branchStartMetric + leafDistanceOnBranch) / ratePxPerSec);
  const ageSec = elapsedSec - spawnTimeSec;
  if (ageSec <= 0) {
    return clamp(leavesConfig.growthMinScale, 0, 1);
  }
  const progress = clamp(ageSec / durationSec, 0, 1);
  const eased = evaluateLeafGrowthEaseT(progress, leavesConfig.growthEase, leavesConfig.growthEasePower);
  const minScale = clamp(leavesConfig.growthMinScale, 0, 1);
  return minScale + (1 - minScale) * eased;
}

function isLeafSpawnTAllowed(candidateT, placedTs, minSpawnSpacingT) {
  if (!Number.isFinite(candidateT)) {
    return false;
  }
  if (!Array.isArray(placedTs) || placedTs.length === 0 || minSpawnSpacingT <= 1e-8) {
    return true;
  }
  for (let i = 0; i < placedTs.length; i += 1) {
    if (Math.abs(placedTs[i] - candidateT) < minSpawnSpacingT) {
      return false;
    }
  }
  return true;
}

function findLeafSpawnFallbackT(leavesConfig, placedTs) {
  const minT = leavesConfig.spawnTMin;
  const maxT = leavesConfig.spawnTMax;
  const span = maxT - minT;
  if (span <= 1e-8) {
    return isLeafSpawnTAllowed(minT, placedTs, leavesConfig.minSpawnSpacingT) ? minT : null;
  }

  const spacing = Math.max(0, leavesConfig.minSpawnSpacingT);
  const step = Math.max(1e-4, spacing * 0.5, span / 512);
  const towardTip = leavesConfig.spawnBiasMode === 'towardTip';
  let t = towardTip ? maxT : minT;
  while (towardTip ? (t >= minT - 1e-8) : (t <= maxT + 1e-8)) {
    const candidate = clamp(t, minT, maxT);
    if (isLeafSpawnTAllowed(candidate, placedTs, spacing)) {
      return candidate;
    }
    t += towardTip ? -step : step;
  }

  return null;
}

function estimateLeafSpawnCapacity(leavesConfig) {
  const span = Math.max(0, leavesConfig.spawnTMax - leavesConfig.spawnTMin);
  const spacing = Math.max(0, leavesConfig.minSpawnSpacingT);
  if (span <= 1e-8) {
    return 1;
  }
  if (spacing <= 1e-8) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(1, Math.floor(span / spacing) + 1);
}

function ensureBranchLeaves(branch, leavesConfig, branchIndex = 0) {
  if (!branch || !branch.pathData || !leavesConfig || !leavesConfig.enabled) {
    return [];
  }
  const cache = getBranchLeafCache(branch);
  if (!cache) {
    return [];
  }
  if (
    cache.pathDataRef === branch.pathData
    && cache.layoutKey === leavesConfig.layoutKey
    && cache.appearanceKey === leavesConfig.appearanceKey
  ) {
    return cache.leaves;
  }

  cache.leaves.length = 0;
  const totalLength = Number.isFinite(branch.pathData.totalLength)
    ? Math.max(0, branch.pathData.totalLength)
    : 0;
  if (totalLength <= 1e-8 || leavesConfig.countRange[1] <= 0) {
    cache.pathDataRef = branch.pathData;
    cache.layoutKey = leavesConfig.layoutKey;
    cache.appearanceKey = leavesConfig.appearanceKey;
    return cache.leaves;
  }

  const stableToken = getBranchStableToken(branch, branchIndex);
  const rng = leavesConfig.deterministic
    ? mulberry32(hashSeed(`${stableToken}|leaves|${leavesConfig.layoutKey}`))
    : Math.random;
  const requestedLeafCount = sampleIntRange(leavesConfig.countRange, rng);
  const estimatedCapacity = estimateLeafSpawnCapacity(leavesConfig);
  const leafCount = Number.isFinite(estimatedCapacity)
    ? Math.max(0, Math.min(requestedLeafCount, estimatedCapacity))
    : Math.max(0, requestedLeafCount);
  const placedTs = [];

  for (let i = 0; i < leafCount; i += 1) {
    let acceptedT = null;
    for (let attempt = 0; attempt < leavesConfig.maxSpawnAttemptsPerLeaf; attempt += 1) {
      const t = sampleLeafSpawnT(leavesConfig, rng);
      if (isLeafSpawnTAllowed(t, placedTs, leavesConfig.minSpawnSpacingT)) {
        acceptedT = t;
        break;
      }
    }

    if (acceptedT === null) {
      acceptedT = findLeafSpawnFallbackT(leavesConfig, placedTs);
    }
    if (acceptedT === null) {
      continue;
    }

    placedTs.push(acceptedT);
    const distanceOnPath = acceptedT * totalLength;
    const point = getPathPointAtLength(branch.pathData, distanceOnPath);
    const tangent = normalize(getPathTangentAtLength(branch.pathData, distanceOnPath));
    const sideSign = getSideSign(leavesConfig.sideMode, i, rng);
    const outwardNormal = {
      x: -tangent.y * sideSign,
      y: tangent.x * sideSign,
    };
    const halfStemWidth = resolveBranchStemHalfWidth(branch, distanceOnPath, totalLength, CONFIG.brush);
    const baseDrawSize = sampleFloatRange(leavesConfig.drawSizeRange, rng);
    const normalizedBranchT = totalLength > 1e-8 ? clamp(distanceOnPath / totalLength, 0, 1) : 0;
    const tipEaseExponent = 1 + leavesConfig.drawSizeBaseMultiplierEaseIn * 49;
    const easedTipBlend = Math.pow(normalizedBranchT, tipEaseExponent);
    const sizeMultiplier = 1 + (leavesConfig.drawSizeBaseMultiplier - 1) * easedTipBlend;
    const drawSize = Math.max(1, baseDrawSize * sizeMultiplier);
    const attachOffset = -halfStemWidth * 0.2 + Math.max(0.5, baseDrawSize * 0.03);
    const anchorX = point.x + outwardNormal.x * attachOffset;
    const anchorY = point.y + outwardNormal.y * attachOffset;
    const rotationOffsetDeg = sampleFloatRange(leavesConfig.rotationAwayFromNormalDegRange, rng);
    const sideCompensatedOffsetDeg = rotationOffsetDeg * -sideSign;
    // Leaf sprites are authored with "up" along -Y; rotate normal-aligned +X angle by +90deg.
    const rotationRad = (
      Math.atan2(outwardNormal.y, outwardNormal.x)
      + (Math.PI * 0.5)
      + (sideCompensatedOffsetDeg * Math.PI / 180)
    );
    const col = clamp(Math.floor(rng() * leavesConfig.spriteCols), 0, leavesConfig.spriteCols - 1);
    const spriteRowCount = Math.max(1, (leavesConfig.spriteRowMaxIndex - leavesConfig.spriteRowMinIndex) + 1);
    const row = clamp(
      leavesConfig.spriteRowMinIndex + Math.floor(rng() * spriteRowCount),
      leavesConfig.spriteRowMinIndex,
      leavesConfig.spriteRowMaxIndex,
    );
    const swayRng = mulberry32(hashSeed(`${stableToken}|leaf-sway|${i}|${acceptedT.toFixed(6)}`));
    const swayAmplitudeDeg = sampleFloatRange(leavesConfig.swayAmplitudeDegRange, swayRng);
    const swaySpeed = sampleFloatRange(leavesConfig.swaySpeedRange, swayRng);
    const swayPhase = swayRng() * Math.PI * 2;

    cache.leaves.push({
      x: anchorX,
      y: anchorY,
      col,
      row,
      distanceOnPath,
      rotationRad,
      drawSize,
      swayAmplitudeRad: swayAmplitudeDeg * Math.PI / 180,
      swaySpeed,
      swayPhase,
      hoverInfluence: leavesConfig.swayMode === 'always' ? 1 : 0,
      targetInfluence: leavesConfig.swayMode === 'always' ? 1 : 0,
      motionTime: 0,
      lastSwayUpdateMs: 0,
    });
  }

  cache.leaves.sort((a, b) => a.distanceOnPath - b.distanceOnPath);
  if (cache.leaves.length > 0) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < cache.leaves.length; i += 1) {
      const leaf = cache.leaves[i];
      const half = (Number.isFinite(leaf.drawSize) ? leaf.drawSize : leavesConfig.drawSize) * 0.9;
      minX = Math.min(minX, leaf.x - half);
      minY = Math.min(minY, leaf.y - half);
      maxX = Math.max(maxX, leaf.x + half);
      maxY = Math.max(maxY, leaf.y + half);
    }
    cache.bounds = { minX, minY, maxX, maxY };
  } else {
    cache.bounds = null;
  }
  cache.pathDataRef = branch.pathData;
  cache.layoutKey = leavesConfig.layoutKey;
  cache.appearanceKey = leavesConfig.appearanceKey;
  return cache.leaves;
}

function drawBranchLeaves(branch, leavesConfig, renderOptions = {}) {
  if (!branch || !branch.pathData || !leavesConfig || !leavesConfig.enabled || !STATE.leafImage) {
    return { drawn: 0, culled: 0, skippedHidden: 0 };
  }

  const targetCtx = renderOptions.targetCtx || ctx;
  if (!targetCtx) {
    return { drawn: 0, culled: 0, skippedHidden: 0 };
  }

  const branchIndex = Number.isFinite(renderOptions.branchIndex) ? renderOptions.branchIndex : 0;
  const nowMs = Number.isFinite(renderOptions.nowMs)
    ? renderOptions.nowMs
    : performance.now();
  const visibleLength = Number.isFinite(renderOptions.visibleLength)
    ? clamp(renderOptions.visibleLength, 0, branch.pathData.totalLength)
    : branch.pathData.totalLength;
  const visibleStartLength = Number.isFinite(renderOptions.visibleStartLength)
    ? clamp(renderOptions.visibleStartLength, 0, visibleLength)
    : 0;
  if (visibleLength <= 1e-8 || visibleLength <= visibleStartLength + 1e-8) {
    return { drawn: 0, culled: 0, skippedHidden: 0 };
  }

  const leafCache = getBranchLeafCache(branch);
  const leaves = ensureBranchLeaves(branch, leavesConfig, branchIndex);
  if (!Array.isArray(leaves) || leaves.length === 0) {
    return { drawn: 0, culled: 0, skippedHidden: 0 };
  }
  const hiddenBand = renderOptions.hiddenBand && typeof renderOptions.hiddenBand === 'object'
    ? renderOptions.hiddenBand
    : null;
  const skipFullyHiddenInBand = renderOptions.skipFullyHiddenInBand === true
    && hiddenBand
    && Number.isFinite(hiddenBand.centerX)
    && resolveHiddenBandEffectiveHalfWidthForYRange(hiddenBand, 0, STATE.viewportHeight) > 0;
  const cullingEnabled = isLeafViewportCullingEnabled();
  const coarseBounds = leafCache && leafCache.bounds ? leafCache.bounds : null;
  if (cullingEnabled && coarseBounds) {
    if (
      coarseBounds.maxX < 0
      || coarseBounds.maxY < 0
      || coarseBounds.minX > STATE.viewportWidth
      || coarseBounds.minY > STATE.viewportHeight
    ) {
      return { drawn: 0, culled: leaves.length, skippedHidden: 0 };
    }
  }
  let drawn = 0;
  let culled = 0;
  let skippedHidden = 0;

  for (let i = 0; i < leaves.length; i += 1) {
    const leaf = leaves[i];
    if (leaf.distanceOnPath + 1e-6 < visibleStartLength) {
      continue;
    }
    if (leaf.distanceOnPath > visibleLength + 1e-6) {
      break;
    }

    const baseDrawSize = Number.isFinite(leaf.drawSize)
      ? Math.max(1, leaf.drawSize)
      : leavesConfig.drawSize;
    const growthScale = resolveLeafGrowthScale(leaf, branch, leavesConfig);
    const drawSize = Math.max(0.01, baseDrawSize * growthScale);
    const drawX = -drawSize * 0.5;
    const drawY = -drawSize + ((2.2 / leavesConfig.spriteCellHeight) * drawSize);
    const halfAabb = drawSize * 0.9;
    if (skipFullyHiddenInBand) {
      if (
        isAabbFullyInsideHiddenBand(
          leaf.x - halfAabb,
          leaf.x + halfAabb,
          hiddenBand,
          leaf.y - halfAabb,
          leaf.y + halfAabb,
        )
      ) {
        skippedHidden += 1;
        continue;
      }
    }
    if (cullingEnabled) {
      if (
        (leaf.x + halfAabb) < 0
        || (leaf.y + halfAabb) < 0
        || (leaf.x - halfAabb) > STATE.viewportWidth
        || (leaf.y - halfAabb) > STATE.viewportHeight
      ) {
        culled += 1;
        continue;
      }
    }
    const sourceRect = getLeafSpriteSourceRect(leavesConfig, leaf.col, leaf.row);
    const swayInfluence = resolveLeafSwayInfluence(leaf, leavesConfig, nowMs);
    const swayOffsetRad = leavesConfig.swayEnabled
      ? (
        (Number.isFinite(leaf.swayAmplitudeRad) ? leaf.swayAmplitudeRad : 0)
        * Math.sin(((Number.isFinite(leaf.motionTime) ? leaf.motionTime : 0) * (Number.isFinite(leaf.swaySpeed) ? leaf.swaySpeed : 0)) + (leaf.swayPhase || 0))
        * swayInfluence
      )
      : 0;
    targetCtx.save();
    targetCtx.translate(leaf.x, leaf.y);
    targetCtx.rotate(leaf.rotationRad + swayOffsetRad);
    targetCtx.drawImage(
      STATE.leafImage,
      sourceRect.sx,
      sourceRect.sy,
      sourceRect.sw,
      sourceRect.sh,
      drawX,
      drawY,
      drawSize,
      drawSize,
    );
    targetCtx.restore();
    drawn += 1;
  }
  return { drawn, culled, skippedHidden };
}

function drawLeafOverlayFast(leavesConfig, nowMs, targetCtx = ctx) {
  if (!leavesConfig || !leavesConfig.enabled || !STATE.leafImage || !targetCtx) {
    return { drawn: 0, culled: 0 };
  }
  const overlayCache = ensureLeafOverlayCache(leavesConfig);
  const leaves = overlayCache && Array.isArray(overlayCache.leaves) ? overlayCache.leaves : [];
  if (leaves.length === 0) {
    return { drawn: 0, culled: 0 };
  }

  const cullingEnabled = isLeafViewportCullingEnabled();
  let drawn = 0;
  let culled = 0;
  for (let i = 0; i < leaves.length; i += 1) {
    const leaf = leaves[i];
    const drawSize = Number.isFinite(leaf.drawSize) ? Math.max(1, leaf.drawSize) : leavesConfig.drawSize;
    const drawX = -drawSize * 0.5;
    const drawY = -drawSize + ((2.2 / leavesConfig.spriteCellHeight) * drawSize);
    if (cullingEnabled) {
      const halfAabb = drawSize * 0.9;
      if (
        (leaf.x + halfAabb) < 0
        || (leaf.y + halfAabb) < 0
        || (leaf.x - halfAabb) > STATE.viewportWidth
        || (leaf.y - halfAabb) > STATE.viewportHeight
      ) {
        culled += 1;
        continue;
      }
    }

    const sourceRect = getLeafSpriteSourceRect(leavesConfig, leaf.col, leaf.row);
    const swayInfluence = resolveLeafSwayInfluence(leaf, leavesConfig, nowMs);
    const swayOffsetRad = leavesConfig.swayEnabled
      ? (
        (Number.isFinite(leaf.swayAmplitudeRad) ? leaf.swayAmplitudeRad : 0)
        * Math.sin(((Number.isFinite(leaf.motionTime) ? leaf.motionTime : 0) * (Number.isFinite(leaf.swaySpeed) ? leaf.swaySpeed : 0)) + (leaf.swayPhase || 0))
        * swayInfluence
      )
      : 0;
    targetCtx.save();
    targetCtx.translate(leaf.x, leaf.y);
    targetCtx.rotate(leaf.rotationRad + swayOffsetRad);
    targetCtx.drawImage(
      STATE.leafImage,
      sourceRect.sx,
      sourceRect.sy,
      sourceRect.sw,
      sourceRect.sh,
      drawX,
      drawY,
      drawSize,
      drawSize,
    );
    targetCtx.restore();
    drawn += 1;
  }
  return { drawn, culled };
}

function isPerformanceMonitoringEnabled() {
  return Boolean(CONFIG.performance && CONFIG.performance.enabled);
}

function getPerformanceLogIntervalMs() {
  const config = CONFIG.performance || {};
  const interval = Number(config.logIntervalMs);
  if (!Number.isFinite(interval)) {
    return 1000;
  }
  return Math.max(250, interval);
}

function resetPerformanceCounters() {
  const perf = STATE.performance;
  const now = performance.now();
  perf.intervalStartMs = now;
  perf.lastLogMs = now;
  perf.intervalFrames = 0;
  perf.intervalFrameMs = 0;
  perf.intervalSamples = 0;
  perf.intervalActiveBranches = 0;
  perf.intervalCacheBuilds = 0;
  perf.intervalCacheBuildMs = 0;
  perf.intervalCacheReuses = 0;
  perf.intervalLeafDrawMs = 0;
  perf.intervalStemDrawMs = 0;
  perf.intervalFlowerDrawMs = 0;
  perf.intervalFlowerUpdateMs = 0;
  perf.intervalLeavesDrawn = 0;
  perf.intervalLeavesCulled = 0;
  perf.intervalFlowersDrawn = 0;
  perf.intervalFlowersCulled = 0;
  perf.intervalBackSkippedStems = 0;
  perf.intervalBackSkippedLeaves = 0;
  perf.intervalBackSkippedFlowers = 0;
  perf.intervalCacheMissReasons.invalid = 0;
  perf.intervalCacheMissReasons.pathData = 0;
  perf.intervalCacheMissReasons.image = 0;
  perf.intervalCacheMissReasons.brush = 0;
  perf.lastSummary = null;
}

function registerPerformanceCacheBuild(reason, buildMs) {
  if (!isPerformanceMonitoringEnabled()) {
    return;
  }
  const perf = STATE.performance;
  perf.intervalCacheBuilds += 1;
  perf.intervalCacheBuildMs += Number.isFinite(buildMs) ? Math.max(0, buildMs) : 0;
  if (reason === 'pathData' || reason === 'image' || reason === 'brush') {
    perf.intervalCacheMissReasons[reason] += 1;
  } else {
    perf.intervalCacheMissReasons.invalid += 1;
  }
}

function registerPerformanceCacheReuse() {
  if (!isPerformanceMonitoringEnabled()) {
    return;
  }
  STATE.performance.intervalCacheReuses += 1;
}

function registerSwayPerformanceSample(sample = {}) {
  if (!isPerformanceMonitoringEnabled()) {
    return;
  }
  const perf = STATE.performance;
  perf.intervalLeafDrawMs += Number.isFinite(sample.leafDrawMs) ? Math.max(0, sample.leafDrawMs) : 0;
  perf.intervalStemDrawMs += Number.isFinite(sample.stemDrawMs) ? Math.max(0, sample.stemDrawMs) : 0;
  perf.intervalFlowerDrawMs += Number.isFinite(sample.flowerDrawMs) ? Math.max(0, sample.flowerDrawMs) : 0;
  perf.intervalFlowerUpdateMs += Number.isFinite(sample.flowerUpdateMs) ? Math.max(0, sample.flowerUpdateMs) : 0;
  perf.intervalLeavesDrawn += Number.isFinite(sample.leavesDrawn) ? Math.max(0, sample.leavesDrawn) : 0;
  perf.intervalLeavesCulled += Number.isFinite(sample.leavesCulled) ? Math.max(0, sample.leavesCulled) : 0;
  perf.intervalFlowersDrawn += Number.isFinite(sample.flowersDrawn) ? Math.max(0, sample.flowersDrawn) : 0;
  perf.intervalFlowersCulled += Number.isFinite(sample.flowersCulled) ? Math.max(0, sample.flowersCulled) : 0;
  perf.intervalBackSkippedStems += Number.isFinite(sample.backSkippedStems)
    ? Math.max(0, sample.backSkippedStems)
    : 0;
  perf.intervalBackSkippedLeaves += Number.isFinite(sample.backSkippedLeaves)
    ? Math.max(0, sample.backSkippedLeaves)
    : 0;
  perf.intervalBackSkippedFlowers += Number.isFinite(sample.backSkippedFlowers)
    ? Math.max(0, sample.backSkippedFlowers)
    : 0;
}

function flushPerformanceFrame(frameStartMs, activeBranches) {
  if (!isPerformanceMonitoringEnabled()) {
    return;
  }

  const now = performance.now();
  const perf = STATE.performance;
  const frameMs = Math.max(0, now - frameStartMs);
  perf.intervalFrames += 1;
  perf.intervalFrameMs += frameMs;
  perf.intervalActiveBranches += Math.max(0, activeBranches);

  const logIntervalMs = getPerformanceLogIntervalMs();
  if (now - perf.lastLogMs < logIntervalMs) {
    return;
  }

  const frames = Math.max(1, perf.intervalFrames);
  const avgFrameMs = perf.intervalFrameMs / frames;
  const fps = avgFrameMs > 0 ? 1000 / avgFrameMs : 0;
  const avgSamplesPerFrame = perf.intervalSamples / frames;
  const avgActiveBranches = perf.intervalActiveBranches / frames;
  const avgCacheBuildMs = perf.intervalCacheBuilds > 0
    ? perf.intervalCacheBuildMs / perf.intervalCacheBuilds
    : 0;
  const avgLeafDrawMs = perf.intervalLeafDrawMs / frames;
  const avgStemDrawMs = perf.intervalStemDrawMs / frames;
  const avgFlowerDrawMs = perf.intervalFlowerDrawMs / frames;
  const avgFlowerUpdateMs = perf.intervalFlowerUpdateMs / frames;

  const summary = {
    fps,
    avgFrameMs,
    avgSamplesPerFrame,
    avgActiveBranches,
    cacheBuilds: perf.intervalCacheBuilds,
    cacheReuses: perf.intervalCacheReuses,
    avgCacheBuildMs,
    avgLeafDrawMs,
    avgStemDrawMs,
    avgFlowerDrawMs,
    avgFlowerUpdateMs,
    leavesDrawn: perf.intervalLeavesDrawn,
    leavesCulled: perf.intervalLeavesCulled,
    flowersDrawn: perf.intervalFlowersDrawn,
    flowersCulled: perf.intervalFlowersCulled,
    backSkippedStems: perf.intervalBackSkippedStems,
    backSkippedLeaves: perf.intervalBackSkippedLeaves,
    backSkippedFlowers: perf.intervalBackSkippedFlowers,
    cacheMissReasons: {
      invalid: perf.intervalCacheMissReasons.invalid,
      pathData: perf.intervalCacheMissReasons.pathData,
      image: perf.intervalCacheMissReasons.image,
      brush: perf.intervalCacheMissReasons.brush,
    },
  };
  perf.lastSummary = summary;

  console.log(
    '[BranchPerf]',
    `fps=${summary.fps.toFixed(1)}`,
    `frameMs=${summary.avgFrameMs.toFixed(2)}`,
    `samples/frame=${summary.avgSamplesPerFrame.toFixed(0)}`,
    `activeBranches=${summary.avgActiveBranches.toFixed(1)}`,
    `cacheBuilds=${summary.cacheBuilds}`,
    `cacheReuses=${summary.cacheReuses}`,
    `cacheBuildMs=${summary.avgCacheBuildMs.toFixed(2)}`,
    `stemMs=${summary.avgStemDrawMs.toFixed(2)}`,
    `leafMs=${summary.avgLeafDrawMs.toFixed(2)}`,
    `flowerUpdMs=${summary.avgFlowerUpdateMs.toFixed(2)}`,
    `flowerDrawMs=${summary.avgFlowerDrawMs.toFixed(2)}`,
    `leaves(d/c)=${summary.leavesDrawn}/${summary.leavesCulled}`,
    `flowers(d/c)=${summary.flowersDrawn}/${summary.flowersCulled}`,
    `backSkip(s/l/f)=${summary.backSkippedStems}/${summary.backSkippedLeaves}/${summary.backSkippedFlowers}`,
    `misses=${JSON.stringify(summary.cacheMissReasons)}`,
  );

  perf.intervalStartMs = now;
  perf.lastLogMs = now;
  perf.intervalFrames = 0;
  perf.intervalFrameMs = 0;
  perf.intervalSamples = 0;
  perf.intervalActiveBranches = 0;
  perf.intervalCacheBuilds = 0;
  perf.intervalCacheBuildMs = 0;
  perf.intervalCacheReuses = 0;
  perf.intervalLeafDrawMs = 0;
  perf.intervalStemDrawMs = 0;
  perf.intervalFlowerDrawMs = 0;
  perf.intervalFlowerUpdateMs = 0;
  perf.intervalLeavesDrawn = 0;
  perf.intervalLeavesCulled = 0;
  perf.intervalFlowersDrawn = 0;
  perf.intervalFlowersCulled = 0;
  perf.intervalBackSkippedStems = 0;
  perf.intervalBackSkippedLeaves = 0;
  perf.intervalBackSkippedFlowers = 0;
  perf.intervalCacheMissReasons.invalid = 0;
  perf.intervalCacheMissReasons.pathData = 0;
  perf.intervalCacheMissReasons.image = 0;
  perf.intervalCacheMissReasons.brush = 0;
}

function buildBranchStripCache(branch, brushConfig, defaultImage, flippedImage) {
  const cache = getBranchRenderCache(branch);
  const pathData = branch ? branch.pathData : null;
  const activeFlippedImage = flippedImage || defaultImage;

  cache.samples.length = 0;
  cache.distances.length = 0;
  cache.centerX.length = 0;
  cache.centerY.length = 0;

  if (!pathData || !defaultImage) {
    cache.valid = true;
    cache.pathDataRef = pathData;
    cache.defaultImageRef = defaultImage;
    cache.flippedImageRef = activeFlippedImage;
    cache.cacheKey = getBrushCacheKey(brushConfig);
    return cache;
  }

  const hasDirectionalMix = activeFlippedImage !== defaultImage;
  let defaultSliceAccumulator = 0;

  const brushScale = getBrushScale(brushConfig);
  const stripLength = Math.max(0.1, brushConfig.stripWidth);
  const stripStep = Math.max(0.1, stripLength - brushConfig.repeatOverlap);
  const widthOnPath = defaultImage.width * brushScale;
  const tileDrawLength = defaultImage.height * brushScale;
  const tileStep = Math.max(stripLength * 0.5, tileDrawLength + brushConfig.repeatGap);
  const totalLength = pathData.totalLength;

  const phase = positiveModulo(brushConfig.startOffset, tileStep);
  let tileStart = -phase;

  for (; tileStart < totalLength; tileStart += tileStep) {
    let localStart = 0;
    let localEnd = tileDrawLength;

    if (brushConfig.cropPartialRepeat) {
      localStart = Math.max(localStart, -tileStart);
      localEnd = Math.min(localEnd, totalLength - tileStart);
    }

    if (localEnd <= localStart) {
      continue;
    }

    for (let localAlongPath = localStart; localAlongPath < localEnd; localAlongPath += stripStep) {
      const currentStripLength = Math.min(stripLength, localEnd - localAlongPath);
      const distanceOnPath = tileStart + localAlongPath + currentStripLength * 0.5;

      if (distanceOnPath < 0 || distanceOnPath > totalLength) {
        continue;
      }

      const point = getPathPointAtLength(pathData, distanceOnPath);
      const tangent = getPathTangentAtLength(pathData, distanceOnPath);
      const tangentX = tangent.x;
      const tangentY = tangent.y;
      const normalX = -tangentY;
      const normalY = tangentX;

      let imageVariant = 0;
      let sourceImage = defaultImage;
      if (hasDirectionalMix) {
        const horizontalAlignment = clamp(tangentX, -1, 1);
        const defaultRatio = 0.5 + 0.5 * horizontalAlignment;
        if (defaultRatio <= 0) {
          sourceImage = activeFlippedImage;
          imageVariant = 1;
          defaultSliceAccumulator = 0;
        } else if (defaultRatio >= 1) {
          sourceImage = defaultImage;
          imageVariant = 0;
          defaultSliceAccumulator = 0;
        } else {
          defaultSliceAccumulator += defaultRatio;
          if (defaultSliceAccumulator >= 1) {
            sourceImage = defaultImage;
            imageVariant = 0;
            defaultSliceAccumulator -= 1;
          } else {
            sourceImage = activeFlippedImage;
            imageVariant = 1;
          }
        }
      }

      const sourceY = localAlongPath / brushScale;
      if (sourceY >= sourceImage.height) {
        break;
      }

      const sourceHeight = Math.min(currentStripLength / brushScale, sourceImage.height - sourceY);
      if (sourceHeight <= 0) {
        continue;
      }

      const originX = point.x + normalX * brushConfig.pathOffset;
      const originY = point.y + normalY * brushConfig.pathOffset;

      cache.samples.push({
        distanceOnPath,
        originX,
        originY,
        tangentX,
        tangentY,
        normalX,
        normalY,
        sourceY,
        sourceHeight,
        currentStripLength,
        widthOnPath,
        imageVariant,
      });
      cache.distances.push(distanceOnPath);
      cache.centerX.push(point.x);
      cache.centerY.push(point.y);
    }
  }

  cache.valid = true;
  cache.pathDataRef = pathData;
  cache.defaultImageRef = defaultImage;
  cache.flippedImageRef = activeFlippedImage;
  cache.cacheKey = getBrushCacheKey(brushConfig);
  return cache;
}

function ensureBranchStripCache(branch, brushConfig, defaultImage, flippedImage) {
  const cache = getBranchRenderCache(branch);
  const activeFlippedImage = flippedImage || defaultImage;
  const expectedBrushKey = getBrushCacheKey(brushConfig);
  let rebuildReason = '';
  if (!cache.valid) {
    rebuildReason = 'invalid';
  } else if (cache.pathDataRef !== branch.pathData) {
    rebuildReason = 'pathData';
  } else if (cache.defaultImageRef !== defaultImage || cache.flippedImageRef !== activeFlippedImage) {
    rebuildReason = 'image';
  } else if (cache.cacheKey !== expectedBrushKey) {
    rebuildReason = 'brush';
  }
  const shouldRebuild = rebuildReason.length > 0;

  if (shouldRebuild) {
    const t0 = isPerformanceMonitoringEnabled() ? performance.now() : 0;
    buildBranchStripCache(branch, brushConfig, defaultImage, activeFlippedImage);
    const elapsed = isPerformanceMonitoringEnabled() ? (performance.now() - t0) : 0;
    registerPerformanceCacheBuild(rebuildReason, elapsed);
  } else {
    registerPerformanceCacheReuse();
  }
  return cache;
}

function findLastDistanceIndex(distances, value) {
  if (!Array.isArray(distances) || distances.length === 0) {
    return -1;
  }
  let low = 0;
  let high = distances.length - 1;
  let answer = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (distances[mid] <= value) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

function findFirstDistanceIndex(distances, value) {
  if (!Array.isArray(distances) || distances.length === 0) {
    return -1;
  }
  let low = 0;
  let high = distances.length - 1;
  let answer = distances.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (distances[mid] >= value) {
      answer = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return answer >= distances.length ? -1 : answer;
}

function drawStripCentersFromCache(centerX, centerY, endIndexInclusive) {
  if (!Array.isArray(centerX) || !Array.isArray(centerY) || endIndexInclusive < 0) {
    return;
  }
  const count = Math.min(endIndexInclusive + 1, centerX.length, centerY.length);
  if (count <= 0) {
    return;
  }
  const step = Math.max(1, Math.floor(count / 350));
  for (let i = 0; i < count; i += step) {
    drawCircle(centerX[i], centerY[i], 1.3, 'rgba(255, 202, 39, 0.32)');
  }
}

function drawBrushAlongPath(
  branch,
  brushConfig,
  debugConfig,
  defaultImage,
  flippedImage,
  visibleLength = null,
  targetCtx = ctx,
  drawOptions = null,
) {
  if (!branch || !branch.pathData || !defaultImage) {
    return { drawnSamples: 0, skippedHidden: 0 };
  }

  const cache = ensureBranchStripCache(branch, brushConfig, defaultImage, flippedImage);
  const samples = cache.samples;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { drawnSamples: 0, skippedHidden: 0 };
  }
  const safeDrawOptions = drawOptions && typeof drawOptions === 'object' ? drawOptions : null;

  const cutoffDistance = Number.isFinite(visibleLength)
    ? clamp(visibleLength, 0, branch.pathData.totalLength)
    : branch.pathData.totalLength;
  const startDistance = safeDrawOptions && Number.isFinite(safeDrawOptions.visibleStartLength)
    ? clamp(safeDrawOptions.visibleStartLength, 0, cutoffDistance)
    : 0;
  if (cutoffDistance <= 0 || cutoffDistance <= startDistance + 1e-8) {
    return { drawnSamples: 0, skippedHidden: 0 };
  }

  const endIndexInclusive = findLastDistanceIndex(cache.distances, cutoffDistance);
  const startIndex = findFirstDistanceIndex(cache.distances, startDistance);
  if (endIndexInclusive < 0 || startIndex < 0 || startIndex > endIndexInclusive) {
    return { drawnSamples: 0, skippedHidden: 0 };
  }
  if (isPerformanceMonitoringEnabled()) {
    STATE.performance.intervalSamples += (endIndexInclusive - startIndex + 1);
  }

  const defaultRef = cache.defaultImageRef || defaultImage;
  const flippedRef = cache.flippedImageRef || flippedImage || defaultImage;
  const branchThicknessBaseScale = getBranchThicknessBaseScale(branch);
  const taperEnabled = isBrushThicknessTaperEnabled(brushConfig);
  const taperMinScale = taperEnabled ? getBrushThicknessMinScale(brushConfig) : 1;
  const taperExponent = taperEnabled ? getBrushThicknessTaperExponent(brushConfig) : 1;
  const taperMinWidth = taperEnabled ? getBrushThicknessMinWidth(brushConfig) : 0;
  const inverseCutoffDistance = cutoffDistance > 1e-6 ? (1 / cutoffDistance) : 1e6;
  const hiddenBand = safeDrawOptions && safeDrawOptions.hiddenBand && typeof safeDrawOptions.hiddenBand === 'object'
    ? safeDrawOptions.hiddenBand
    : null;
  const skipFullyHiddenInBand = safeDrawOptions
    && safeDrawOptions.skipFullyHiddenInBand === true
    && hiddenBand
    && Number.isFinite(hiddenBand.centerX)
    && resolveHiddenBandEffectiveHalfWidthForYRange(hiddenBand, 0, STATE.viewportHeight) > 0;

  if (skipFullyHiddenInBand) {
    let fullyHidden = true;
    for (let i = startIndex; i <= endIndexInclusive; i += 1) {
      const sample = samples[i];
      let normalizedDistance = clamp(sample.distanceOnPath * inverseCutoffDistance, 0, 1);
      if (taperEnabled && taperExponent !== 1) {
        normalizedDistance = Math.pow(normalizedDistance, taperExponent);
      }
      const taperedScale = taperEnabled
        ? (1 + (taperMinScale - 1) * normalizedDistance)
        : 1;
      let widthOnPath = sample.widthOnPath * branchThicknessBaseScale * taperedScale;
      if (taperMinWidth > 0) {
        widthOnPath = Math.max(widthOnPath, taperMinWidth);
      }
      const xRadius = (
        Math.abs(sample.normalX) * (widthOnPath * 0.5)
        + Math.abs(sample.tangentX) * (sample.currentStripLength * 0.5)
      );
      const yRadius = (
        Math.abs(sample.normalY) * (widthOnPath * 0.5)
        + Math.abs(sample.tangentY) * (sample.currentStripLength * 0.5)
      );
      if (
        !isAabbFullyInsideHiddenBand(
          sample.originX - xRadius,
          sample.originX + xRadius,
          hiddenBand,
          sample.originY - yRadius,
          sample.originY + yRadius,
        )
      ) {
        fullyHidden = false;
        break;
      }
    }
    if (fullyHidden) {
      return { drawnSamples: 0, skippedHidden: 1 };
    }
  }

  let drawnSamples = 0;
  for (let i = startIndex; i <= endIndexInclusive; i += 1) {
    const sample = samples[i];
    const sourceImage = sample.imageVariant === 1 ? flippedRef : defaultRef;
    let normalizedDistance = clamp(sample.distanceOnPath * inverseCutoffDistance, 0, 1);
    if (taperEnabled && taperExponent !== 1) {
      normalizedDistance = Math.pow(normalizedDistance, taperExponent);
    }
    const taperedScale = taperEnabled
      ? (1 + (taperMinScale - 1) * normalizedDistance)
      : 1;
    let widthOnPath = sample.widthOnPath * branchThicknessBaseScale * taperedScale;
    if (taperMinWidth > 0) {
      widthOnPath = Math.max(widthOnPath, taperMinWidth);
    }
    if (widthOnPath <= 1e-6) {
      continue;
    }

    targetCtx.save();
    targetCtx.transform(
      sample.normalX,
      sample.normalY,
      sample.tangentX,
      sample.tangentY,
      sample.originX,
      sample.originY,
    );

    targetCtx.drawImage(
      sourceImage,
      0,
      sample.sourceY,
      sourceImage.width,
      sample.sourceHeight,
      -widthOnPath * 0.5,
      -sample.currentStripLength * 0.5,
      widthOnPath,
      sample.currentStripLength,
    );

    if (debugConfig.enabled && debugConfig.showStripBounds) {
      targetCtx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
      targetCtx.lineWidth = 1;
      targetCtx.strokeRect(
        -widthOnPath * 0.5,
        -sample.currentStripLength * 0.5,
        widthOnPath,
        sample.currentStripLength,
      );
    }

    targetCtx.restore();
    drawnSamples += 1;
  }

  if (debugConfig.enabled && debugConfig.showStripCenters) {
    drawStripCentersFromCache(cache.centerX, cache.centerY, endIndexInclusive);
  }
  return { drawnSamples, skippedHidden: 0 };
}

const DISABLED_DEBUG_CONFIG = {
  enabled: false,
  showStripBounds: false,
  showStripCenters: false,
};
const FRAME_JUMP_KEYS = ['1', '2', '3', '4', '5', '6'];
const FRAME_JUMP_KEY_SET = new Set(FRAME_JUMP_KEYS);

// =========================
// 13) Animation Lifecycle and Timing
// =========================
function sanitizeAnimationSpeedMode(mode, fallback = 'duration') {
  if (mode === 'duration' || mode === 'rate') {
    return mode;
  }
  if (fallback === 'duration' || fallback === 'rate') {
    return fallback;
  }
  return 'duration';
}

function sanitizeAnimationGrowthEaseMode(mode, fallback = 'linear') {
  if (mode === 'linear' || mode === 'easeIn' || mode === 'easeOut' || mode === 'easeInOut') {
    return mode;
  }
  if (fallback === 'linear' || fallback === 'easeIn' || fallback === 'easeOut' || fallback === 'easeInOut') {
    return fallback;
  }
  return 'linear';
}

function sanitizeBranchGrowthMode(mode, fallback = 'simultaneous') {
  if (mode === 'simultaneous' || mode === 'linearBySeedY') {
    return mode;
  }
  if (fallback === 'simultaneous' || fallback === 'linearBySeedY') {
    return fallback;
  }
  return 'simultaneous';
}

function sanitizeBranchGrowthSweepDirection(value, fallback = 'down') {
  if (value === 'down' || value === 'topToBottom') {
    return 'down';
  }
  if (value === 'up' || value === 'bottomToTop') {
    return 'up';
  }
  if (fallback === 'down' || fallback === 'topToBottom') {
    return 'down';
  }
  if (fallback === 'up' || fallback === 'bottomToTop') {
    return 'up';
  }
  return 'down';
}

function sanitizeFrameJumpBindingValue(value, fallback = null) {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.floor(numeric));
}

function sanitizeFrameJumpHotkeysOptions(rawValue, fallbackValue = null) {
  const safeFallback = isPlainObjectLiteral(fallbackValue) ? fallbackValue : {};
  const safeValue = isPlainObjectLiteral(rawValue) ? rawValue : {};
  const fallbackBindings = isPlainObjectLiteral(safeFallback.bindings) ? safeFallback.bindings : {};
  const valueBindings = isPlainObjectLiteral(safeValue.bindings) ? safeValue.bindings : null;

  const timelineFpsRaw = (
    safeValue.timelineFps !== undefined
      ? Number(safeValue.timelineFps)
      : Number(safeFallback.timelineFps)
  );
  const timelineFps = Number.isFinite(timelineFpsRaw) && timelineFpsRaw > 0
    ? timelineFpsRaw
    : 24;

  const bindings = {};
  for (let i = 0; i < FRAME_JUMP_KEYS.length; i += 1) {
    const key = FRAME_JUMP_KEYS[i];
    const hasValueBinding = Boolean(
      valueBindings
      && Object.prototype.hasOwnProperty.call(valueBindings, key)
    );
    const fallbackBinding = sanitizeFrameJumpBindingValue(fallbackBindings[key], null);
    bindings[key] = sanitizeFrameJumpBindingValue(
      hasValueBinding ? valueBindings[key] : undefined,
      fallbackBinding,
    );
  }

  return {
    enabled: safeValue.enabled !== undefined
      ? safeValue.enabled !== false
      : safeFallback.enabled !== false,
    timelineFps,
    bindings,
  };
}

function resolveFrameJumpHotkeysConfig() {
  const topLevelConfig = isPlainObjectLiteral(CONFIG.frameJumpHotkeys)
    ? CONFIG.frameJumpHotkeys
    : null;
  return sanitizeFrameJumpHotkeysOptions(topLevelConfig, null);
}

function applyFrameJumpHotkeysOptions(nextOptions) {
  if (!isPlainObjectLiteral(nextOptions)) {
    return;
  }
  CONFIG.frameJumpHotkeys = sanitizeFrameJumpHotkeysOptions(
    nextOptions,
    CONFIG.frameJumpHotkeys,
  );
}

function isEditableEventTarget(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const element = target instanceof Element
    ? target
    : (target.parentElement instanceof Element ? target.parentElement : null);
  if (!element) {
    return false;
  }
  if (element.isContentEditable === true) {
    return true;
  }
  const editableAncestor = element.closest('input, textarea, select');
  return Boolean(editableAncestor);
}

function evaluateAnimationGrowthEaseT(t, easeMode, easePower) {
  const clampedT = clamp(Number.isFinite(t) ? t : 0, 0, 1);
  const power = Number.isFinite(easePower) ? Math.max(0.01, easePower) : 2;
  if (easeMode === 'linear') {
    return clampedT;
  }
  if (easeMode === 'easeIn') {
    return Math.pow(clampedT, power);
  }
  if (easeMode === 'easeInOut') {
    if (clampedT <= 0.5) {
      return 0.5 * Math.pow(clampedT * 2, power);
    }
    return 1 - (0.5 * Math.pow((1 - clampedT) * 2, power));
  }
  return 1 - Math.pow(1 - clampedT, power);
}

function resolveAnimationEasedElapsedSec(rawElapsedSec, totalTimeSec) {
  const safeElapsed = Number.isFinite(rawElapsedSec) ? Math.max(0, rawElapsedSec) : 0;
  const safeTotal = Number.isFinite(totalTimeSec) ? Math.max(0, totalTimeSec) : 0;
  if (safeTotal <= 1e-8) {
    return safeElapsed;
  }
  const easeMode = sanitizeAnimationGrowthEaseMode(
    CONFIG.branchGrowth && CONFIG.branchGrowth.growthEase,
    'linear',
  );
  const easePower = Number(CONFIG.branchGrowth && CONFIG.branchGrowth.growthEasePower);
  const t = clamp(safeElapsed / safeTotal, 0, 1);
  const easedT = evaluateAnimationGrowthEaseT(t, easeMode, easePower);
  return easedT * safeTotal;
}

function refreshBranchThicknessBaseScales() {
  if (!STATE.branchGarden || !Array.isArray(STATE.branchGarden.branches)) {
    return;
  }

  const branches = STATE.branchGarden.branches;
  const branchById = new Map();
  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    if (branch && Number.isFinite(branch.id)) {
      branchById.set(branch.id, branch);
    }
  }

  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    if (!branch) {
      continue;
    }
    if (!Number.isFinite(branch.parentId)) {
      branch.thicknessBaseScale = getBranchThicknessBaseScale(branch);
      continue;
    }

    const parent = branchById.get(branch.parentId);
    if (!parent || !parent.pathData) {
      branch.thicknessBaseScale = getBranchThicknessBaseScale(branch);
      continue;
    }

    const parentBaseScale = getBranchThicknessBaseScale(parent);
    const parentLength = Number.isFinite(parent.pathData.totalLength)
      ? Math.max(0, parent.pathData.totalLength)
      : 0;
    const spawnDistance = Number.isFinite(branch.spawnDistanceOnParent)
      ? clamp(branch.spawnDistanceOnParent, 0, parentLength)
      : 0;
    branch.thicknessBaseScale = Math.max(
      0.01,
      parentBaseScale * getThicknessTaperFactorAtDistance(spawnDistance, parentLength, CONFIG.brush),
    );
  }
}

function prewarmBranchFilterTextures(brushConfig = CONFIG.brush) {
  if (!STATE.stemImage) {
    return;
  }

  const globalHueDeg = getBrushGlobalHueDeg(brushConfig);
  const globalBrightness = getBrushGlobalBrightness(brushConfig);
  const baseFlippedImage = STATE.stemImageFlippedX || STATE.stemImage;

  if (!isBranchFilterRandomizationEnabled(brushConfig)) {
    getPrecomputedFilteredTexture(STATE.stemImage, globalHueDeg, globalBrightness);
    getPrecomputedFilteredTexture(baseFlippedImage, globalHueDeg, globalBrightness);
    return;
  }

  const variants = buildRandomBranchFilterVariants(brushConfig);
  for (let i = 0; i < variants.length; i += 1) {
    const variant = variants[i];
    const hueDeg = globalHueDeg + variant.hueDeg;
    const brightness = Math.max(0, globalBrightness * variant.brightness);
    getPrecomputedFilteredTexture(STATE.stemImage, hueDeg, brightness);
    getPrecomputedFilteredTexture(baseFlippedImage, hueDeg, brightness);
  }
}

function refreshBranchFilterVariations() {
  if (!STATE.branchGarden || !Array.isArray(STATE.branchGarden.branches)) {
    prewarmBranchFilterTextures(CONFIG.brush);
    return;
  }

  const brushConfig = CONFIG.brush || {};
  const branches = STATE.branchGarden.branches;
  if (!isBranchFilterRandomizationEnabled(brushConfig)) {
    for (let i = 0; i < branches.length; i += 1) {
      const branch = branches[i];
      if (!branch) {
        continue;
      }
      branch.filterVariantIndex = -1;
      branch.filterHueDeg = 0;
      branch.filterBrightness = 1;
      assignBranchStemTextures(branch, brushConfig);
    }
    prewarmBranchFilterTextures(brushConfig);
    return;
  }

  const variants = buildRandomBranchFilterVariants(brushConfig);
  const variantCount = variants.length;
  const assignmentMode = getBrushRandomFilterAssignmentMode(brushConfig);
  const branchById = new Map();
  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    if (branch && Number.isFinite(branch.id)) {
      branchById.set(branch.id, branch);
    }
  }

  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    if (!branch) {
      continue;
    }

    let variantIndex = 0;
    if (assignmentMode === 'inheritParent' && Number.isFinite(branch.parentId)) {
      const parent = branchById.get(branch.parentId);
      if (parent && Number.isFinite(parent.filterVariantIndex) && parent.filterVariantIndex >= 0) {
        variantIndex = parent.filterVariantIndex % variantCount;
      } else {
        const fallbackToken = getBranchStableToken(branch, i);
        variantIndex = positiveModulo(hashSeed(`${fallbackToken}|branch-filter-variant`), variantCount);
      }
    } else {
      const stableToken = getBranchStableToken(branch, i);
      variantIndex = positiveModulo(hashSeed(`${stableToken}|branch-filter-variant`), variantCount);
    }

    const variant = variants[variantIndex];
    branch.filterVariantIndex = variantIndex;
    branch.filterHueDeg = variant ? variant.hueDeg : 0;
    branch.filterBrightness = variant ? variant.brightness : 1;
    assignBranchStemTextures(branch, brushConfig);
  }

  prewarmBranchFilterTextures(brushConfig);
}

function resolveAnimationRatePxPerSec() {
  const animationConfig = CONFIG.branchGrowth || {};
  const animationState = STATE.branchGrowth || {};
  const speedMode = sanitizeAnimationSpeedMode(animationConfig.speedMode, 'duration');

  if (speedMode === 'rate') {
    const pxPerSec = Number(animationConfig.pixelsPerSecond);
    return Number.isFinite(pxPerSec) ? Math.max(0, pxPerSec) : 0;
  }

  const durationSec = Number(animationConfig.totalDurationSec);
  const safeDuration = Number.isFinite(durationSec) ? Math.max(0.001, durationSec) : 0.001;
  const criticalDistance = Number.isFinite(animationState.criticalPathDistance)
    ? Math.max(0, animationState.criticalPathDistance)
    : 0;
  if (criticalDistance <= 0) {
    return 0;
  }
  return criticalDistance / safeDuration;
}

function refreshBranchAnimationMetrics() {
  const animationState = STATE.branchGrowth;
  const branches = STATE.branchGarden && Array.isArray(STATE.branchGarden.branches)
    ? STATE.branchGarden.branches
    : [];

  if (branches.length === 0) {
    animationState.criticalPathDistance = 0;
    animationState.globalRatePxPerSec = 0;
    animationState.maxCompletionSec = 0;
    return;
  }

  const growthConfig = isPlainObjectLiteral(CONFIG.branchGrowth) ? CONFIG.branchGrowth : {};
  const growthMode = sanitizeBranchGrowthMode(growthConfig.mode, 'simultaneous');
  const sweepDirection = sanitizeBranchGrowthSweepDirection(growthConfig.linearSweepDirection, 'down');
  const linearSweepDurationSecRaw = Number(growthConfig.linearSweepDurationSec);
  const linearSweepDurationSec = Number.isFinite(linearSweepDurationSecRaw)
    ? Math.max(0, linearSweepDurationSecRaw)
    : 0;

  const byId = new Map();
  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    branch.pathLength = branch.pathData && Number.isFinite(branch.pathData.totalLength)
      ? Math.max(0, branch.pathData.totalLength)
      : 0;
    branch.startDistanceMetric = 0;
    branch.sweepStartDelaySec = 0;
    branch.rootBranchId = null;
    byId.set(branch.id, branch);
  }

  const ordered = branches.slice().sort((a, b) => {
    const depthA = Number.isFinite(a.depth) ? a.depth : 0;
    const depthB = Number.isFinite(b.depth) ? b.depth : 0;
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    const idA = Number.isFinite(a.id) ? a.id : 0;
    const idB = Number.isFinite(b.id) ? b.id : 0;
    return idA - idB;
  });

  const rootDelayById = new Map();
  if (growthMode === 'linearBySeedY' && linearSweepDurationSec > 1e-8) {
    const rootBranches = [];
    for (let i = 0; i < branches.length; i += 1) {
      const branch = branches[i];
      if (branch && !Number.isFinite(branch.parentId)) {
        rootBranches.push(branch);
      }
    }
    if (rootBranches.length > 0) {
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < rootBranches.length; i += 1) {
        const y = Number(rootBranches[i] && rootBranches[i].seed && rootBranches[i].seed.y);
        if (!Number.isFinite(y)) {
          continue;
        }
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const span = (
        Number.isFinite(minY)
        && Number.isFinite(maxY)
      )
        ? Math.max(0, maxY - minY)
        : 0;
      for (let i = 0; i < rootBranches.length; i += 1) {
        const root = rootBranches[i];
        if (!root || !Number.isFinite(root.id)) {
          continue;
        }
        const y = Number(root.seed && root.seed.y);
        const normalized = (
          span > 1e-8
          && Number.isFinite(y)
        )
          ? (
            sweepDirection === 'up'
              ? clamp((maxY - y) / span, 0, 1)
              : clamp((y - minY) / span, 0, 1)
          )
          : 0;
        rootDelayById.set(root.id, normalized * linearSweepDurationSec);
      }
    }
  }

  let criticalPathDistance = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const branch = ordered[i];
    let startDistanceMetric = 0;
    let rootBranchId = Number.isFinite(branch.id) ? branch.id : null;
    if (Number.isFinite(branch.parentId)) {
      const parent = byId.get(branch.parentId);
      if (parent) {
        const parentStart = Number.isFinite(parent.startDistanceMetric) ? parent.startDistanceMetric : 0;
        const parentLength = Number.isFinite(parent.pathLength) ? parent.pathLength : 0;
        const spawnDistance = Number.isFinite(branch.spawnDistanceOnParent)
          ? clamp(branch.spawnDistanceOnParent, 0, parentLength)
          : 0;
        startDistanceMetric = parentStart + spawnDistance;
        rootBranchId = Number.isFinite(parent.rootBranchId) ? parent.rootBranchId : parent.id;
      }
    }
    branch.startDistanceMetric = startDistanceMetric;
    branch.rootBranchId = rootBranchId;
    if (Number.isFinite(rootBranchId)) {
      branch.sweepStartDelaySec = Number.isFinite(rootDelayById.get(rootBranchId))
        ? Math.max(0, rootDelayById.get(rootBranchId))
        : 0;
    } else {
      branch.sweepStartDelaySec = 0;
    }
    criticalPathDistance = Math.max(criticalPathDistance, startDistanceMetric + branch.pathLength);
  }

  animationState.criticalPathDistance = criticalPathDistance;
  animationState.globalRatePxPerSec = resolveAnimationRatePxPerSec();
  const ratePxPerSec = Number.isFinite(animationState.globalRatePxPerSec)
    ? Math.max(0, animationState.globalRatePxPerSec)
    : 0;
  if (ratePxPerSec <= 1e-8) {
    animationState.maxCompletionSec = 0;
    return;
  }
  let maxCompletionSec = 0;
  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    const sweepStartDelaySec = Number.isFinite(branch && branch.sweepStartDelaySec)
      ? Math.max(0, branch.sweepStartDelaySec)
      : 0;
    const startDistanceMetric = Number.isFinite(branch && branch.startDistanceMetric)
      ? Math.max(0, branch.startDistanceMetric)
      : 0;
    const branchLength = Number.isFinite(branch && branch.pathLength)
      ? Math.max(0, branch.pathLength)
      : 0;
    const completionSec = sweepStartDelaySec + ((startDistanceMetric + branchLength) / ratePxPerSec);
    if (completionSec > maxCompletionSec) {
      maxCompletionSec = completionSec;
    }
  }
  animationState.maxCompletionSec = maxCompletionSec;
}

function getAnimationTotalTimeSec() {
  const animationState = STATE.branchGrowth;
  const explicitCompletionSec = Number.isFinite(animationState.maxCompletionSec)
    ? Math.max(0, animationState.maxCompletionSec)
    : 0;
  if (explicitCompletionSec > 0) {
    return explicitCompletionSec;
  }
  const criticalPathDistance = Number.isFinite(animationState.criticalPathDistance)
    ? Math.max(0, animationState.criticalPathDistance)
    : 0;
  const ratePxPerSec = Number.isFinite(animationState.globalRatePxPerSec)
    ? Math.max(0, animationState.globalRatePxPerSec)
    : 0;
  if (criticalPathDistance <= 0 || ratePxPerSec <= 0) {
    return 0;
  }
  return criticalPathDistance / ratePxPerSec;
}

function getBranchVisibleLengthAtElapsed(branch, elapsedSec) {
  if (!branch) {
    return 0;
  }

  const animationState = STATE.branchGrowth;
  const ratePxPerSec = Number.isFinite(animationState.globalRatePxPerSec)
    ? Math.max(0, animationState.globalRatePxPerSec)
    : 0;
  const branchLength = Number.isFinite(branch.pathLength)
    ? Math.max(0, branch.pathLength)
    : (branch.pathData && Number.isFinite(branch.pathData.totalLength)
      ? Math.max(0, branch.pathData.totalLength)
      : 0);
  const startDistanceMetric = Number.isFinite(branch.startDistanceMetric)
    ? Math.max(0, branch.startDistanceMetric)
    : 0;
  const totalTimeSec = getAnimationTotalTimeSec();
  const elapsedRaw = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const elapsed = resolveAnimationEasedElapsedSec(elapsedRaw, totalTimeSec);
  const sweepStartDelaySec = Number.isFinite(branch.sweepStartDelaySec)
    ? Math.max(0, branch.sweepStartDelaySec)
    : 0;
  const elapsedAfterSweep = Math.max(0, elapsed - sweepStartDelaySec);

  const visible = elapsedAfterSweep * ratePxPerSec - startDistanceMetric;
  return clamp(visible, 0, branchLength);
}

function getOverlayPromotionKey(branch) {
  if (branch && Number.isFinite(branch.id)) {
    return String(branch.id);
  }
  return getBranchRenderId(branch);
}

function getOverlayPromotionEntry(branch) {
  const key = getOverlayPromotionKey(branch);
  let entry = STATE.overlayWrapPromotion.get(key);
  if (!entry) {
    entry = {
      promoted: false,
      promotionCutoverDistanceOnPath: null,
    };
    STATE.overlayWrapPromotion.set(key, entry);
  }
  return entry;
}

function updateOverlayPromotionFromTipExit(branch, visibleLength, hiddenBand) {
  const entry = getOverlayPromotionEntry(branch);
  if (!entry || entry.promoted === true) {
    return entry;
  }
  if (!branch || !branch.pathData || !hiddenBand) {
    return entry;
  }
  const branchLength = Number.isFinite(branch.pathData.totalLength)
    ? Math.max(0, branch.pathData.totalLength)
    : 0;
  if (branchLength <= 1e-8) {
    return entry;
  }
  const tipDistance = clamp(
    Number.isFinite(visibleLength) ? visibleLength : 0,
    0,
    branchLength,
  );
  if (tipDistance <= 1e-8) {
    return entry;
  }
  const tipPoint = getPathPointAtLength(branch.pathData, tipDistance);
  if (!tipPoint || !Number.isFinite(tipPoint.x)) {
    return entry;
  }
  const tipBounds = resolveOverlayHiddenBandBoundsAtY(hiddenBand, tipPoint.y);
  if (!tipBounds) {
    return entry;
  }
  if (tipPoint.x <= tipBounds.leftX || tipPoint.x >= tipBounds.rightX) {
    entry.promoted = true;
    entry.promotionCutoverDistanceOnPath = tipDistance;
  }
  return entry;
}

function resolveOverlayRenderRanges(branch, visibleLength, promotionEntry) {
  const branchLength = Number.isFinite(branch && branch.pathData && branch.pathData.totalLength)
    ? Math.max(0, branch.pathData.totalLength)
    : 0;
  const endLength = clamp(Number.isFinite(visibleLength) ? visibleLength : 0, 0, branchLength);
  if (endLength <= 1e-8) {
    return {
      backStart: 0,
      backEnd: 0,
      frontStart: 0,
      frontEnd: 0,
    };
  }
  if (!promotionEntry || promotionEntry.promoted !== true) {
    return {
      backStart: 0,
      backEnd: endLength,
      frontStart: endLength,
      frontEnd: endLength,
    };
  }
  const cutover = clamp(
    Number.isFinite(promotionEntry.promotionCutoverDistanceOnPath)
      ? promotionEntry.promotionCutoverDistanceOnPath
      : endLength,
    0,
    endLength,
  );
  return {
    backStart: 0,
    backEnd: cutover,
    frontStart: cutover,
    frontEnd: endLength,
  };
}

function scheduleBranchAnimationFrame() {
  const animationState = STATE.branchGrowth;
  if (!animationState.running || animationState.rafId !== null) {
    return;
  }
  animationState.rafId = requestAnimationFrame(stepBranchAnimationFrame);
}

function stopBranchAnimation(options = {}) {
  const { keepElapsed = false } = options;
  const animationState = STATE.branchGrowth;
  if (animationState.rafId !== null) {
    cancelAnimationFrame(animationState.rafId);
    animationState.rafId = null;
  }
  animationState.running = false;
  animationState.startTimeMs = 0;
  if (!keepElapsed) {
    animationState.elapsedSec = 0;
  }
}

function startBranchAnimation(options = {}) {
  const { restart = true } = options;
  if (!STATE.branchGarden) {
    return;
  }

  const animationState = STATE.branchGrowth;
  if (restart) {
    animationState.elapsedSec = 0;
    invalidateCompletedBranchLayer();
    resetOverlayWrapPromotionState();
  }

  refreshBranchAnimationMetrics();
  const totalTimeSec = getAnimationTotalTimeSec();
  if (totalTimeSec <= 0) {
    animationState.running = false;
    animationState.startTimeMs = 0;
    renderScene({ skipAutoStart: true });
    return;
  }

  if (animationState.rafId !== null) {
    cancelAnimationFrame(animationState.rafId);
    animationState.rafId = null;
  }
  cancelFlowerInteractionFrame();
  animationState.running = true;
  animationState.startTimeMs = performance.now() - animationState.elapsedSec * 1000;
  renderScene({ skipAutoStart: true });
  scheduleBranchAnimationFrame();
}

function pauseBranchAnimation() {
  const animationState = STATE.branchGrowth;
  if (!animationState.running) {
    return;
  }
  if (animationState.rafId !== null) {
    cancelAnimationFrame(animationState.rafId);
    animationState.rafId = null;
  }
  animationState.running = false;
  animationState.startTimeMs = 0;
  renderScene({ skipAutoStart: true });
}

function resumeBranchAnimation() {
  const animationState = STATE.branchGrowth;
  if (animationState.running) {
    return;
  }
  refreshBranchAnimationMetrics();
  const totalTimeSec = getAnimationTotalTimeSec();
  if (totalTimeSec <= 0) {
    renderScene({ skipAutoStart: true });
    return;
  }
  cancelFlowerInteractionFrame();
  animationState.running = true;
  animationState.startTimeMs = performance.now() - animationState.elapsedSec * 1000;
  renderScene({ skipAutoStart: true });
  scheduleBranchAnimationFrame();
}

function restartBranchAnimation() {
  STATE.branchGrowth.elapsedSec = 0;
  startBranchAnimation({ restart: true });
}

function stepBranchAnimationFrame(timestampMs) {
  const animationState = STATE.branchGrowth;
  animationState.rafId = null;

  if (!animationState.running) {
    return;
  }

  if (!Number.isFinite(animationState.startTimeMs) || animationState.startTimeMs <= 0) {
    animationState.startTimeMs = timestampMs;
  }
  animationState.elapsedSec = Math.max(0, (timestampMs - animationState.startTimeMs) / 1000);

  const totalTimeSec = getAnimationTotalTimeSec();
  if (animationState.elapsedSec >= totalTimeSec) {
    animationState.elapsedSec = totalTimeSec;
    animationState.running = false;
    animationState.startTimeMs = 0;
    renderScene({ skipAutoStart: true, timestampMs });
    return;
  }

  renderScene({ skipAutoStart: true, timestampMs });
  scheduleBranchAnimationFrame();
}

function onBranchStructureChanged() {
  refreshBranchEndpointsAndFlowerSystem();
  refreshBranchThicknessBaseScales();
  refreshBranchFilterVariations();
  invalidateAllBranchStripCaches();
  invalidateCompletedBranchLayer();
  resetOverlayWrapPromotionState();
  refreshBranchAnimationMetrics();
  if (!CONFIG.branchGrowth.enabled) {
    stopBranchAnimation({ keepElapsed: false });
    return;
  }

  if (CONFIG.branchGrowth.autoStart && !isHeroPlaybackGrowthStartBlocked()) {
    restartBranchAnimation();
    return;
  }

  const animationState = STATE.branchGrowth;
  if (animationState.running) {
    animationState.startTimeMs = performance.now() - animationState.elapsedSec * 1000;
    renderScene({ skipAutoStart: true });
    scheduleBranchAnimationFrame();
    return;
  }

  animationState.elapsedSec = 0;
  renderScene({ skipAutoStart: true });
}

// =========================
// 14) Scene Render
// =========================
function resizeCanvasToViewport() {
  STATE.viewportWidth = window.innerWidth;
  STATE.viewportHeight = window.innerHeight;

  canvas.style.width = STATE.viewportWidth + 'px';
  canvas.style.height = STATE.viewportHeight + 'px';
  canvas.width = Math.floor(STATE.viewportWidth * STATE.dpr);
  canvas.height = Math.floor(STATE.viewportHeight * STATE.dpr);

  ctx.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
  if (frontCanvas && frontCtx) {
    frontCanvas.style.width = STATE.viewportWidth + 'px';
    frontCanvas.style.height = STATE.viewportHeight + 'px';
    frontCanvas.width = Math.floor(STATE.viewportWidth * STATE.dpr);
    frontCanvas.height = Math.floor(STATE.viewportHeight * STATE.dpr);
    frontCtx.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
  }
  if (flowersBackCanvas) {
    flowersBackCanvas.style.width = STATE.viewportWidth + 'px';
    flowersBackCanvas.style.height = STATE.viewportHeight + 'px';
    flowersBackCanvas.width = Math.floor(STATE.viewportWidth * STATE.dpr);
    flowersBackCanvas.height = Math.floor(STATE.viewportHeight * STATE.dpr);
  }
  if (flowersFrontCanvas) {
    flowersFrontCanvas.style.width = STATE.viewportWidth + 'px';
    flowersFrontCanvas.style.height = STATE.viewportHeight + 'px';
    flowersFrontCanvas.width = Math.floor(STATE.viewportWidth * STATE.dpr);
    flowersFrontCanvas.height = Math.floor(STATE.viewportHeight * STATE.dpr);
  }
}

function renderBranch(branch, renderOptions = {}) {
  if (!branch.pathData) {
    return { backSkippedStems: 0, backSkippedLeaves: 0 };
  }

  const visibleEndLength = Number.isFinite(renderOptions.visibleLength)
    ? Math.max(0, renderOptions.visibleLength)
    : null;
  const visibleStartLength = Number.isFinite(renderOptions.visibleStartLength)
    ? Math.max(0, renderOptions.visibleStartLength)
    : 0;
  if (visibleEndLength !== null && visibleEndLength <= visibleStartLength + 1e-8) {
    return { backSkippedStems: 0, backSkippedLeaves: 0 };
  }

  const targetCtx = renderOptions.targetCtx || ctx;
  const leavesConfig = renderOptions.leavesConfig || resolveLeavesConfig(CONFIG.leaves || {});
  const branchIndex = Number.isFinite(renderOptions.branchIndex) ? renderOptions.branchIndex : 0;
  const nowMs = Number.isFinite(renderOptions.nowMs) ? renderOptions.nowMs : performance.now();
  const perfStats = renderOptions.perfStats || null;
  const hiddenBand = renderOptions.hiddenBand && typeof renderOptions.hiddenBand === 'object'
    ? renderOptions.hiddenBand
    : null;
  const skipFullyHiddenInBand = renderOptions.skipFullyHiddenInBand === true;
  const branchTextures = renderOptions.branchTextures || getBranchStemTextures(branch, CONFIG.brush);
  if (!branchTextures || !branchTextures.defaultImage) {
    return { backSkippedStems: 0, backSkippedLeaves: 0 };
  }

  const stemStartMs = (perfStats && isPerformanceMonitoringEnabled()) ? performance.now() : 0;
  const stemStats = drawBrushAlongPath(
    branch,
    CONFIG.brush,
    CONFIG.debug,
    branchTextures.defaultImage,
    branchTextures.flippedImage,
    visibleEndLength,
    targetCtx,
    {
      visibleStartLength,
      hiddenBand,
      skipFullyHiddenInBand,
    },
  );
  if (perfStats && stemStartMs > 0) {
    perfStats.stemDrawMs += Math.max(0, performance.now() - stemStartMs);
  }
  const leafStartMs = (perfStats && isPerformanceMonitoringEnabled()) ? performance.now() : 0;
  const leafStats = drawBranchLeaves(branch, leavesConfig, {
    visibleLength: visibleEndLength,
    visibleStartLength,
    targetCtx,
    branchIndex,
    nowMs,
    hiddenBand,
    skipFullyHiddenInBand,
  });
  if (perfStats) {
    if (leafStartMs > 0) {
      perfStats.leafDrawMs += Math.max(0, performance.now() - leafStartMs);
    }
    perfStats.leavesDrawn += Number.isFinite(leafStats && leafStats.drawn) ? leafStats.drawn : 0;
    perfStats.leavesCulled += Number.isFinite(leafStats && leafStats.culled) ? leafStats.culled : 0;
    perfStats.backSkippedStems += Number.isFinite(stemStats && stemStats.skippedHidden)
      ? stemStats.skippedHidden
      : 0;
    perfStats.backSkippedLeaves += Number.isFinite(leafStats && leafStats.skippedHidden)
      ? leafStats.skippedHidden
      : 0;
  }

  if (CONFIG.debug.enabled && CONFIG.debug.showPathOutline) {
    drawPathOutline(branch.pathData);
  }

  if (CONFIG.debug.enabled && (CONFIG.debug.showTangents || CONFIG.debug.showNormals)) {
    drawPathVectors(branch.pathData);
  }

  if (CONFIG.debug.enabled && CONFIG.debug.showControlPoints) {
    drawControlPoints(branch.controlPoints);
  }

  if (CONFIG.debug.enabled && CONFIG.debug.showControlCurve) {
    drawControlCurve(branch.controlPoints);
  }
  return {
    backSkippedStems: Number.isFinite(stemStats && stemStats.skippedHidden)
      ? stemStats.skippedHidden
      : 0,
    backSkippedLeaves: Number.isFinite(leafStats && leafStats.skippedHidden)
      ? leafStats.skippedHidden
      : 0,
  };
}

function drawOverlayBranchRangeWithStemCache(options = {}) {
  const branch = options.branch || null;
  const branchRenderId = typeof options.branchRenderId === 'string' ? options.branchRenderId : '';
  const branchTextures = options.branchTextures || null;
  const leavesConfig = options.leavesConfig || resolveLeavesConfig(CONFIG.leaves || {});
  const branchIndex = Number.isFinite(options.branchIndex) ? options.branchIndex : 0;
  const targetCtx = options.targetCtx || null;
  const cacheLayer = options.cacheLayer || null;
  const rangeStart = Number.isFinite(options.rangeStart) ? Math.max(0, options.rangeStart) : 0;
  const rangeEnd = Number.isFinite(options.rangeEnd) ? Math.max(0, options.rangeEnd) : 0;
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : performance.now();
  const perfStats = options.perfStats || null;
  const hiddenBand = options.hiddenBand && typeof options.hiddenBand === 'object' ? options.hiddenBand : null;
  const skipFullyHiddenInBand = options.skipFullyHiddenInBand === true;
  if (!branch || !branch.pathData || !branchTextures || !branchTextures.defaultImage || !targetCtx) {
    return;
  }
  if (rangeEnd <= rangeStart + 1e-8) {
    return;
  }

  const supportsRangeCache = Boolean(
    cacheLayer
    && cacheLayer.ctx
    && cacheLayer.committedStemEndByBranchId instanceof Map
    && branchRenderId.length > 0,
  );

  let stemSkippedHidden = 0;
  if (supportsRangeCache) {
    const committedMap = cacheLayer.committedStemEndByBranchId;
    const previousCommittedRaw = committedMap.get(branchRenderId);
    const previousCommitted = Number.isFinite(previousCommittedRaw)
      ? clamp(previousCommittedRaw, rangeStart, rangeEnd)
      : rangeStart;
    const missingStart = Math.max(rangeStart, previousCommitted);
    if (rangeEnd > missingStart + 1e-8) {
      const stemStartMs = (perfStats && isPerformanceMonitoringEnabled()) ? performance.now() : 0;
      drawBrushAlongPath(
        branch,
        CONFIG.brush,
        DISABLED_DEBUG_CONFIG,
        branchTextures.defaultImage,
        branchTextures.flippedImage,
        rangeEnd,
        cacheLayer.ctx,
        {
          visibleStartLength: missingStart,
          hiddenBand,
          skipFullyHiddenInBand,
        },
      );
      const targetStemStats = drawBrushAlongPath(
        branch,
        CONFIG.brush,
        DISABLED_DEBUG_CONFIG,
        branchTextures.defaultImage,
        branchTextures.flippedImage,
        rangeEnd,
        targetCtx,
        {
          visibleStartLength: missingStart,
          hiddenBand,
          skipFullyHiddenInBand,
        },
      );
      if (perfStats && stemStartMs > 0) {
        perfStats.stemDrawMs += Math.max(0, performance.now() - stemStartMs);
      }
      stemSkippedHidden += Number.isFinite(targetStemStats && targetStemStats.skippedHidden)
        ? targetStemStats.skippedHidden
        : 0;
      committedMap.set(branchRenderId, rangeEnd);
      cacheLayer.committedBranchIds.add(branchRenderId);
    }
  } else {
    const stemStartMs = (perfStats && isPerformanceMonitoringEnabled()) ? performance.now() : 0;
    const targetStemStats = drawBrushAlongPath(
      branch,
      CONFIG.brush,
      DISABLED_DEBUG_CONFIG,
      branchTextures.defaultImage,
      branchTextures.flippedImage,
      rangeEnd,
      targetCtx,
      {
        visibleStartLength: rangeStart,
        hiddenBand,
        skipFullyHiddenInBand,
      },
    );
    if (perfStats && stemStartMs > 0) {
      perfStats.stemDrawMs += Math.max(0, performance.now() - stemStartMs);
    }
    stemSkippedHidden += Number.isFinite(targetStemStats && targetStemStats.skippedHidden)
      ? targetStemStats.skippedHidden
      : 0;
  }

  const leafStartMs = (perfStats && isPerformanceMonitoringEnabled()) ? performance.now() : 0;
  const leafStats = drawBranchLeaves(branch, leavesConfig, {
    visibleLength: rangeEnd,
    visibleStartLength: rangeStart,
    targetCtx,
    branchIndex,
    nowMs,
    hiddenBand,
    skipFullyHiddenInBand,
  });
  if (perfStats) {
    if (leafStartMs > 0) {
      perfStats.leafDrawMs += Math.max(0, performance.now() - leafStartMs);
    }
    perfStats.leavesDrawn += Number.isFinite(leafStats && leafStats.drawn) ? leafStats.drawn : 0;
    perfStats.leavesCulled += Number.isFinite(leafStats && leafStats.culled) ? leafStats.culled : 0;
    perfStats.backSkippedStems += stemSkippedHidden;
    perfStats.backSkippedLeaves += Number.isFinite(leafStats && leafStats.skippedHidden)
      ? leafStats.skippedHidden
      : 0;
  }
}

function renderScene(options = {}) {
  if (!STATE.branchGarden || !STATE.stemImage) {
    cancelFlowerInteractionFrame();
    return;
  }
  if (syncGlobalFoliageScaleIfNeeded()) {
    return;
  }

  const perfEnabled = isPerformanceMonitoringEnabled();
  const frameStartMs = perfEnabled ? performance.now() : 0;
  const skipAutoStart = options.skipAutoStart === true;
  const heroPlaybackGateConfig = resolveHeroPlaybackGateConfig();
  const heroPlaybackFrame = getCurrentHeroVideoFrame(heroPlaybackGateConfig);
  const overlayNowMs = performance.now();
  syncCenterOverlayImageLayer(overlayNowMs, heroPlaybackFrame);
  if (enforceHeroPlaybackGatePauseFrames(heroPlaybackFrame, heroPlaybackGateConfig, { rerenderOnPause: false })) {
    return;
  }
  const growthBlockedByHeroGate = isHeroPlaybackGrowthStartBlocked(heroPlaybackGateConfig);

  if (CONFIG.branchGrowth.enabled && !skipAutoStart && !growthBlockedByHeroGate) {
    if (!STATE.branchGrowth.running && STATE.branchGrowth.elapsedSec <= 1e-8 && CONFIG.branchGrowth.autoStart) {
      startBranchAnimation({ restart: true });
      return;
    }
  }

  if (!CONFIG.branchGrowth.enabled && (STATE.branchGrowth.running || STATE.branchGrowth.rafId !== null || STATE.branchGrowth.elapsedSec > 0)) {
    stopBranchAnimation({ keepElapsed: false });
  }
  if (growthBlockedByHeroGate && (STATE.branchGrowth.running || STATE.branchGrowth.rafId !== null || STATE.branchGrowth.elapsedSec > 0)) {
    stopBranchAnimation({ keepElapsed: false });
  }

  const useAnimation = CONFIG.branchGrowth.enabled;
  const elapsedSec = growthBlockedByHeroGate ? 0 : STATE.branchGrowth.elapsedSec;
  const overlayWrapConfig = resolveOverlayWrapConfig();
  const overlayWrapActive = isOverlayWrapActive(overlayWrapConfig, useAnimation)
    && Boolean(frontCanvas && frontCtx);
  const hiddenBand = overlayWrapActive ? getOverlayHiddenBand(overlayWrapConfig) : null;
  const canUseCompletedLayer = (
    true
    && CONFIG.branchGrowth.useOffscreenLayerCache !== false
    && CONFIG.debug.enabled !== true
  );
  const useSingleCompletedLayer = canUseCompletedLayer && overlayWrapActive !== true;
  const useDualCompletedLayer = canUseCompletedLayer && overlayWrapActive === true && Boolean(frontCtx);
  const leavesConfig = resolveLeavesConfig(CONFIG.leaves || {});
  const renderTimestampMs = Number.isFinite(options.timestampMs)
    ? options.timestampMs
    : performance.now();
  const perfStats = {
    stemDrawMs: 0,
    leafDrawMs: 0,
    flowerUpdateMs: 0,
    flowerDrawMs: 0,
    leavesDrawn: 0,
    leavesCulled: 0,
    flowersDrawn: 0,
    flowersCulled: 0,
    backSkippedStems: 0,
    backSkippedLeaves: 0,
    backSkippedFlowers: 0,
  };
  const animationTotalTimeSec = useAnimation ? getAnimationTotalTimeSec() : 0;
  const leafGrowthTailSec = (
    useAnimation
    && leavesConfig
    && leavesConfig.growthEnabled === true
    && Number.isFinite(leavesConfig.growthDurationSec)
  )
    ? Math.max(0, leavesConfig.growthDurationSec)
    : 0;
  const fullGrowthTimeSec = animationTotalTimeSec + leafGrowthTailSec;
  const branchesFullyGrown = !useAnimation
    || animationTotalTimeSec <= 0
    || elapsedSec >= fullGrowthTimeSec - 1e-6;

  ctx.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
  drawBackground();
  if (frontCanvas && frontCtx) {
    frontCtx.setTransform(STATE.dpr, 0, 0, STATE.dpr, 0, 0);
    frontCtx.clearRect(0, 0, STATE.viewportWidth, STATE.viewportHeight);
  }

  let completedLayer = null;
  let completedLayerBack = null;
  let completedLayerFront = null;
  if (useSingleCompletedLayer) {
    completedLayer = ensureCompletedBranchLayer('single');
    if (completedLayer.leavesConfigKey !== leavesConfig.cacheKey) {
      invalidateCompletedBranchLayer('single');
      completedLayer = ensureCompletedBranchLayer('single');
    }
    completedLayer.leavesConfigKey = leavesConfig.cacheKey;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(completedLayer.canvas, 0, 0);
    ctx.restore();
    if (hasCompletedBranchLayerContent('back') || hasCompletedBranchLayerContent('front')) {
      invalidateCompletedBranchLayer('back');
      invalidateCompletedBranchLayer('front');
    }
  } else if (useDualCompletedLayer) {
    completedLayerBack = ensureCompletedBranchLayer('back');
    completedLayerFront = ensureCompletedBranchLayer('front');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(completedLayerBack.canvas, 0, 0);
    ctx.restore();
    if (frontCtx) {
      frontCtx.save();
      frontCtx.setTransform(1, 0, 0, 1, 0, 0);
      frontCtx.drawImage(completedLayerFront.canvas, 0, 0);
      frontCtx.restore();
    }
    if (hasCompletedBranchLayerContent('single')) {
      invalidateCompletedBranchLayer('single');
    }
  } else if (
    hasCompletedBranchLayerContent('single')
    || hasCompletedBranchLayerContent('back')
    || hasCompletedBranchLayerContent('front')
  ) {
    invalidateCompletedBranchLayer('all');
  }

  const branches = STATE.branchGarden.branches;
  const branchById = new Map();
  const branchEndpointVisibleById = new Map();
  for (let i = 0; i < branches.length; i += 1) {
    const branch = branches[i];
    if (branch && Number.isFinite(branch.id)) {
      branchById.set(branch.id, branch);
      if (useAnimation && branch.pathData) {
        const branchLength = Number.isFinite(branch.pathData.totalLength)
          ? Math.max(0, branch.pathData.totalLength)
          : 0;
        const visibleLength = getBranchVisibleLengthAtElapsed(branch, elapsedSec);
        branchEndpointVisibleById.set(
          branch.id,
          visibleLength >= branchLength - 1e-6,
        );
      }
    }
  }
  const isBranchFlowerEndpointVisible = (branchId) => {
    if (!useAnimation || !Number.isFinite(branchId)) {
      return true;
    }
    if (!branchEndpointVisibleById.has(branchId)) {
      return true;
    }
    return branchEndpointVisibleById.get(branchId) === true;
  };
  const shouldRenderLeaves = Boolean(leavesConfig.enabled && STATE.leafImage);
  const canUseLeafOverlayFastPath = Boolean(
    isSwayFastPathEnabled()
    && overlayWrapActive !== true
    && shouldRenderLeaves
    && useSingleCompletedLayer
    && completedLayer
    && branchesFullyGrown
    && completedLayer.committedBranchIds.size >= branches.length
  );
  const canSkipBranchLoop = useSingleCompletedLayer
    && completedLayer
    && branchesFullyGrown
    && completedLayer.committedBranchIds.size >= branches.length
    && !shouldRenderLeaves
    && !canUseLeafOverlayFastPath;

  let activeBranches = 0;
  if (overlayWrapActive) {
    for (let i = 0; i < branches.length; i += 1) {
      const branch = branches[i];
      if (!branch || !branch.pathData) {
        continue;
      }
      const visibleLength = useAnimation
        ? getBranchVisibleLengthAtElapsed(branch, elapsedSec)
        : branch.pathData.totalLength;
      const branchTextures = getBranchStemTextures(branch, CONFIG.brush);
      if (!branchTextures || !branchTextures.defaultImage) {
        continue;
      }
      if (visibleLength > 1e-8) {
        activeBranches += 1;
      }
      const promotionEntry = updateOverlayPromotionFromTipExit(branch, visibleLength, hiddenBand);
      const ranges = resolveOverlayRenderRanges(branch, visibleLength, promotionEntry);
      if (useDualCompletedLayer && completedLayerBack && completedLayerFront && frontCtx) {
        const branchRenderId = getBranchRenderId(branch);
        drawOverlayBranchRangeWithStemCache({
          branch,
          branchRenderId,
          branchTextures,
          leavesConfig,
          branchIndex: i,
          rangeStart: ranges.backStart,
          rangeEnd: ranges.backEnd,
          nowMs: renderTimestampMs,
          targetCtx: ctx,
          cacheLayer: completedLayerBack,
          perfStats,
          hiddenBand,
          skipFullyHiddenInBand: overlayWrapConfig.skipHiddenBackDrawEnabled === true,
        });
        drawOverlayBranchRangeWithStemCache({
          branch,
          branchRenderId,
          branchTextures,
          leavesConfig,
          branchIndex: i,
          rangeStart: ranges.frontStart,
          rangeEnd: ranges.frontEnd,
          nowMs: renderTimestampMs,
          targetCtx: frontCtx,
          cacheLayer: completedLayerFront,
          perfStats,
          hiddenBand: null,
          skipFullyHiddenInBand: false,
        });
      } else {
        renderBranch(branch, {
          visibleStartLength: ranges.backStart,
          visibleLength: ranges.backEnd,
          branchTextures,
          leavesConfig,
          branchIndex: i,
          nowMs: renderTimestampMs,
          targetCtx: ctx,
          perfStats,
          hiddenBand,
          skipFullyHiddenInBand: overlayWrapConfig.skipHiddenBackDrawEnabled === true,
        });
        if (frontCtx) {
          renderBranch(branch, {
            visibleStartLength: ranges.frontStart,
            visibleLength: ranges.frontEnd,
            branchTextures,
            leavesConfig,
            branchIndex: i,
            nowMs: renderTimestampMs,
            targetCtx: frontCtx,
            perfStats,
            hiddenBand: null,
            skipFullyHiddenInBand: false,
          });
        }
      }
    }
  } else if (canSkipBranchLoop) {
    activeBranches = branches.length;
  } else if (canUseLeafOverlayFastPath) {
    activeBranches = branches.length;
    const leafStartMs = perfEnabled ? performance.now() : 0;
    const leafStats = drawLeafOverlayFast(leavesConfig, renderTimestampMs, ctx);
    if (perfEnabled) {
      perfStats.leafDrawMs += Math.max(0, performance.now() - leafStartMs);
    }
    perfStats.leavesDrawn += Number.isFinite(leafStats && leafStats.drawn) ? leafStats.drawn : 0;
    perfStats.leavesCulled += Number.isFinite(leafStats && leafStats.culled) ? leafStats.culled : 0;
  } else {
    for (let i = 0; i < branches.length; i += 1) {
      const branch = branches[i];
      const visibleLength = useAnimation
        ? getBranchVisibleLengthAtElapsed(branch, elapsedSec)
        : null;

      if (useSingleCompletedLayer && branch.pathData) {
        const branchLength = Number.isFinite(branch.pathData.totalLength) ? branch.pathData.totalLength : 0;
        const isFullyVisible = visibleLength === null || visibleLength >= branchLength - 1e-6;
        if (isFullyVisible) {
          const branchRenderId = getBranchRenderId(branch);
          if (completedLayer.committedBranchIds.has(branchRenderId)) {
            activeBranches += 1;
            if (shouldRenderLeaves) {
              const leafStartMs = perfEnabled ? performance.now() : 0;
              const leafStats = drawBranchLeaves(branch, leavesConfig, {
                visibleLength,
                targetCtx: ctx,
                branchIndex: i,
                nowMs: renderTimestampMs,
              });
              if (perfEnabled) {
                perfStats.leafDrawMs += Math.max(0, performance.now() - leafStartMs);
              }
              perfStats.leavesDrawn += Number.isFinite(leafStats && leafStats.drawn) ? leafStats.drawn : 0;
              perfStats.leavesCulled += Number.isFinite(leafStats && leafStats.culled) ? leafStats.culled : 0;
            }
            continue;
          }

          const branchTextures = getBranchStemTextures(branch, CONFIG.brush);
          if (!branchTextures.defaultImage) {
            continue;
          }
          activeBranches += 1;
          const stemStartMs = perfEnabled ? performance.now() : 0;
          drawBrushAlongPath(
            branch,
            CONFIG.brush,
            DISABLED_DEBUG_CONFIG,
            branchTextures.defaultImage,
            branchTextures.flippedImage,
            null,
            completedLayer.ctx,
          );
          if (perfEnabled) {
            perfStats.stemDrawMs += Math.max(0, performance.now() - stemStartMs);
          }
          completedLayer.committedBranchIds.add(branchRenderId);
          // Draw once on this frame since layer blit already happened earlier.
          renderBranch(branch, {
            visibleLength,
            branchTextures,
            leavesConfig,
            branchIndex: i,
            nowMs: renderTimestampMs,
            perfStats,
          });
          continue;
        }
      }

      const branchTextures = getBranchStemTextures(branch, CONFIG.brush);
      if (!branchTextures.defaultImage) {
        continue;
      }
      if (visibleLength === null || visibleLength > 0) {
        activeBranches += 1;
      }
      renderBranch(branch, {
        visibleLength,
        branchTextures,
        leavesConfig,
        branchIndex: i,
        nowMs: renderTimestampMs,
        perfStats,
      });
    }
  }

  if (shouldRenderEndpointFlowers()) {
    if (overlayWrapActive) {
      const isBackLayerForBranch = (branchId) => {
        if (!Number.isFinite(branchId)) {
          return true;
        }
        const branch = branchById.get(branchId);
        if (!branch || !branch.pathData) {
          return true;
        }
        const entry = getOverlayPromotionEntry(branch);
        if (!entry || entry.promoted !== true) {
          return true;
        }
        const cutover = Number.isFinite(entry.promotionCutoverDistanceOnPath)
          ? Math.max(0, entry.promotionCutoverDistanceOnPath)
          : Number.POSITIVE_INFINITY;
        const tipDistance = Number.isFinite(branch.pathData.totalLength)
          ? Math.max(0, branch.pathData.totalLength)
          : 0;
        return tipDistance < cutover - 1e-6;
      };
      const backBranchFilter = (branchId, flower) => (
        isBranchFlowerEndpointVisible(branchId, flower)
        && isBackLayerForBranch(branchId, flower)
      );
      const frontBranchFilter = (branchId, flower) => (
        isBranchFlowerEndpointVisible(branchId, flower)
        && !isBackLayerForBranch(branchId, flower)
      );
      const backFlowerTiming = drawEndpointFlowers(
        renderTimestampMs,
        ctx,
        {
          layerName: 'back',
          clearFront: false,
          branchFilter: backBranchFilter,
          hiddenBand,
          skipHiddenBackDrawEnabled: overlayWrapConfig.skipHiddenBackDrawEnabled === true,
        },
        false,
      );
      if (backFlowerTiming) {
        perfStats.flowerUpdateMs += Number.isFinite(backFlowerTiming.updateMs) ? backFlowerTiming.updateMs : 0;
        perfStats.flowerDrawMs += Number.isFinite(backFlowerTiming.drawMs) ? backFlowerTiming.drawMs : 0;
        perfStats.flowersDrawn += Number.isFinite(backFlowerTiming.drawnCount) ? backFlowerTiming.drawnCount : 0;
        perfStats.flowersCulled += Number.isFinite(backFlowerTiming.culledCount) ? backFlowerTiming.culledCount : 0;
        perfStats.backSkippedFlowers += Number.isFinite(backFlowerTiming.skippedHiddenCount)
          ? backFlowerTiming.skippedHiddenCount
          : 0;
      }
      if (frontCtx) {
        const frontFlowerTiming = drawEndpointFlowers(
          renderTimestampMs,
          frontCtx,
          {
            layerName: 'front',
            skipUpdate: true,
            branchFilter: frontBranchFilter,
          },
          true,
        );
        if (frontFlowerTiming) {
          perfStats.flowerDrawMs += Number.isFinite(frontFlowerTiming.drawMs) ? frontFlowerTiming.drawMs : 0;
          perfStats.flowersDrawn += Number.isFinite(frontFlowerTiming.drawnCount) ? frontFlowerTiming.drawnCount : 0;
          perfStats.flowersCulled += Number.isFinite(frontFlowerTiming.culledCount)
            ? frontFlowerTiming.culledCount
            : 0;
        }
      }
    } else {
      const flowerTiming = drawEndpointFlowers(
        renderTimestampMs,
        ctx,
        {
          layerName: 'back',
          clearFront: true,
          branchFilter: isBranchFlowerEndpointVisible,
        },
      );
      if (flowerTiming) {
        perfStats.flowerUpdateMs += Number.isFinite(flowerTiming.updateMs) ? flowerTiming.updateMs : 0;
        perfStats.flowerDrawMs += Number.isFinite(flowerTiming.drawMs) ? flowerTiming.drawMs : 0;
        perfStats.flowersDrawn += Number.isFinite(flowerTiming.drawnCount) ? flowerTiming.drawnCount : 0;
        perfStats.flowersCulled += Number.isFinite(flowerTiming.culledCount) ? flowerTiming.culledCount : 0;
      }
    }
  }

  if (shouldRenderOpenButtonArrowLive(heroPlaybackGateConfig)) {
    drawOpenButtonArrowHint(heroPlaybackGateConfig, renderTimestampMs);
  }
  if (
    heroPlaybackGateConfig
    && heroPlaybackGateConfig.openButtonDebug
    && heroPlaybackGateConfig.openButtonDebug.enabled === true
  ) {
    const debugTargetCtx = (
      heroPlaybackGateConfig.openButtonDebug.drawOnFrontLayer === true
      && frontCtx
    )
      ? frontCtx
      : ctx;
    drawHeroPlaybackOpenButtonDebugOverlay(heroPlaybackGateConfig, debugTargetCtx);
  }

  if (overlayWrapActive && hiddenBand && overlayWrapConfig.showCenterBandOverlay === true) {
    const overlayTargetCtx = frontCtx || ctx;
    drawOverlayCenterBand(overlayTargetCtx, hiddenBand, overlayWrapConfig);
  }

  if (perfEnabled) {
    registerSwayPerformanceSample(perfStats);
    if (isSwayPerfLogEnabled()) {
      console.log('[SwayPerfFrame]', JSON.stringify(perfStats));
    }
    flushPerformanceFrame(frameStartMs, activeBranches);
  }

  syncFlowerInteractionLoop();
}

// =========================
// 15) Events
// =========================
function onResize() {
  // Keep existing branches; do not regenerate on zoom/resize.
  const previousFloralScale = Number.isFinite(STATE.lastFloralResponsiveScaleFactor)
    ? STATE.lastFloralResponsiveScaleFactor
    : null;
  resizeCanvasToViewport();
  refreshHeroVideoReferenceRect();
  applyHeroVideoWiggleAnchor(resolveHeroPlaybackGateConfig());
  if (STATE.flowerSystem && typeof STATE.flowerSystem.setPixiSurfaces === 'function') {
    STATE.flowerSystem.setPixiSurfaces({
      backCanvas: flowersBackCanvas,
      frontCanvas: flowersFrontCanvas,
    });
  }
  invalidateCompletedBranchLayer();
  resetOverlayWrapPromotionState();
  const nextFloralScale = resolveFloralResponsiveScaleFactor();
  if (previousFloralScale === null || Math.abs(nextFloralScale - previousFloralScale) > 1e-6) {
    // Floral responsive scale changed with viewport/orientation; rebuild endpoint flower geometry.
    refreshBranchEndpointsAndFlowerSystem();
  }
  renderScene();
}

function onHeroVideoMetadataLoaded() {
  refreshHeroVideoReferenceRect();
  applyHeroVideoWiggleAnchor(resolveHeroPlaybackGateConfig());
  renderScene({ skipAutoStart: true });
}

function tryHandleFrameJumpHotkey(event) {
  if (!event) {
    return false;
  }
  if (isEditableEventTarget(event.target)) {
    return false;
  }
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
  if (!FRAME_JUMP_KEY_SET.has(key)) {
    return false;
  }

  const hotkeyConfig = resolveFrameJumpHotkeysConfig();
  if (!hotkeyConfig || hotkeyConfig.enabled !== true) {
    return false;
  }
  const frameIndex = hotkeyConfig.bindings[key];
  if (!Number.isFinite(frameIndex)) {
    return false;
  }
  const targetSecRaw = frameIndex / hotkeyConfig.timelineFps;
  if (!Number.isFinite(targetSecRaw)) {
    return false;
  }

  const videoDurationSec = Number(video.duration);
  const hasDuration = Number.isFinite(videoDurationSec) && videoDurationSec > 0;
  const targetSec = hasDuration
    ? clamp(targetSecRaw, 0, videoDurationSec)
    : Math.max(0, targetSecRaw);
  const wasPlaying = Boolean(video && video.paused === false);

  try {
    video.currentTime = targetSec;
  } catch (_error) {
    return false;
  }
  if (wasPlaying && video && typeof video.play === 'function') {
    const playbackPromise = video.play();
    if (playbackPromise && typeof playbackPromise.catch === 'function') {
      playbackPromise.catch(() => {});
    }
  } else if (!wasPlaying && video && typeof video.pause === 'function') {
    video.pause();
  }

  event.preventDefault();
  return true;
}

function onKeydown(event) {
  if (tryHandleFrameJumpHotkey(event)) {
    return;
  }
  const key = event.key.toLowerCase();

  if (key === 'r') {
    // New random seed layout.
    STATE.lastSeedPacket = setSeeds();
    plantSeeds(STATE.lastSeedPacket, { clearFirst: true });
    renderScene();
  }

  if (key === 'p') {
    const gateConfig = resolveHeroPlaybackGateConfig();
    if (gateConfig.enabled === true) {
      return;
    }
    video.paused ? video.play() : video.pause();
  }

  if (key === 'g' && STATE.branchGarden) {
    // Regenerate current branches from their existing seeds.
    STATE.branchGarden.regenerateAll();
    renderScene();
  }

  if (key === 'm' && STATE.branchGarden) {
    const nextMode = getPathGenerationMode() === 'random'
      ? 'manualTemplate'
      : 'random';
    applyPathGenerationOptions({ mode: nextMode });
  }

  if (key === 'q') {
    const flowerSystem = getFlowerSystem();
    if (!flowerSystem || typeof flowerSystem.animateTogglePetalOpenState !== 'function') {
      return;
    }
    flowerSystem.animateTogglePetalOpenState(getFlowersRuntimeConfig(), performance.now());
    renderScene({ skipAutoStart: true });
  }

  if (key === 'c') {
    const flowerSystem = getFlowerSystem();
    if (!flowerSystem || typeof flowerSystem.togglePetalOpenState !== 'function') {
      return;
    }
    flowerSystem.togglePetalOpenState();
    renderScene({ skipAutoStart: true });
  }
}

function getCanvasPointerPosition(event) {
  if (!event || !canvas) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const scaleX = STATE.viewportWidth > 0 ? (STATE.viewportWidth / rect.width) : 1;
  const scaleY = STATE.viewportHeight > 0 ? (STATE.viewportHeight / rect.height) : 1;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function onMouseMove(event) {
  const pointer = getCanvasPointerPosition(event);
  if (!pointer) {
    return;
  }
  const nowMs = performance.now();
  if (
    Number.isFinite(STATE.pointerLastSampleX)
    && Number.isFinite(STATE.pointerLastSampleY)
    && Number.isFinite(STATE.pointerLastSampleMs)
    && STATE.pointerLastSampleMs > 0
  ) {
    const dtSec = Math.max(1e-4, (nowMs - STATE.pointerLastSampleMs) / 1000);
    const dx = pointer.x - STATE.pointerLastSampleX;
    const dy = pointer.y - STATE.pointerLastSampleY;
    STATE.pointerSpeedPxPerSec = Math.hypot(dx, dy) / dtSec;
  }
  STATE.pointerLastSampleX = pointer.x;
  STATE.pointerLastSampleY = pointer.y;
  STATE.pointerLastSampleMs = nowMs;
  STATE.pointerX = pointer.x;
  STATE.pointerY = pointer.y;
  const flowerSystem = getFlowerSystem();
  if (flowerSystem && CONFIG.flowers && CONFIG.flowers.enabled === true) {
    flowerSystem.setMousePosition(pointer.x, pointer.y);
  }
  if (!STATE.branchGrowth.running) {
    scheduleFlowerInteractionFrame(true);
  }
}

function onMouseOut() {
  STATE.pointerX = Number.NEGATIVE_INFINITY;
  STATE.pointerY = Number.NEGATIVE_INFINITY;
  STATE.pointerSpeedPxPerSec = 0;
  STATE.pointerLastSampleX = Number.NEGATIVE_INFINITY;
  STATE.pointerLastSampleY = Number.NEGATIVE_INFINITY;
  STATE.pointerLastSampleMs = 0;
  const flowerSystem = getFlowerSystem();
  if (flowerSystem && CONFIG.flowers && CONFIG.flowers.enabled === true) {
    flowerSystem.clearMousePosition();
  }
  if (!STATE.branchGrowth.running) {
    scheduleFlowerInteractionFrame(true);
  }
}

function onMouseClick(event) {
  if (tryHandleHeroPlaybackOpenButtonClick(event)) {
    return;
  }
  if (!CONFIG.flowers || CONFIG.flowers.enabled !== true) {
    return;
  }
  const flowerSystem = getFlowerSystem();
  if (!flowerSystem || typeof flowerSystem.applyJumpAt !== 'function') {
    return;
  }
  const pointer = getCanvasPointerPosition(event);
  if (!pointer) {
    return;
  }
  const affectedCount = flowerSystem.applyJumpAt(
    pointer.x,
    pointer.y,
    getFlowersRuntimeConfig(),
  );
  if (affectedCount > 0 && !STATE.branchGrowth.running) {
    scheduleFlowerInteractionFrame(true);
  }
}

function setupEventHandlers() {
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseout', onMouseOut);
  window.addEventListener('click', onMouseClick);
  if (video && typeof video.addEventListener === 'function') {
    video.addEventListener('timeupdate', onHeroVideoTimeUpdate);
    video.addEventListener('play', ensureHeroPlaybackGateMonitorRunning);
    video.addEventListener('seeking', onHeroVideoTimeUpdate);
    video.addEventListener('seeked', onHeroVideoTimeUpdate);
    video.addEventListener('loadedmetadata', onHeroVideoMetadataLoaded);
  }
}

// =========================
// 16) Public API
// =========================
function applyBranchGrowthOptions(nextOptions) {
  if (!nextOptions || typeof nextOptions !== 'object') {
    return;
  }

  const previous = {
    enabled: Boolean(CONFIG.branchGrowth.enabled),
    autoStart: Boolean(CONFIG.branchGrowth.autoStart),
    useOffscreenLayerCache: CONFIG.branchGrowth.useOffscreenLayerCache !== false,
  };

  const sanitized = {};
  if (nextOptions.enabled !== undefined) {
    sanitized.enabled = Boolean(nextOptions.enabled);
  }
  if (nextOptions.autoStart !== undefined) {
    sanitized.autoStart = Boolean(nextOptions.autoStart);
  }
  if (nextOptions.useOffscreenLayerCache !== undefined) {
    sanitized.useOffscreenLayerCache = Boolean(nextOptions.useOffscreenLayerCache);
  }
  if (nextOptions.speedMode !== undefined) {
    sanitized.speedMode = sanitizeAnimationSpeedMode(nextOptions.speedMode, CONFIG.branchGrowth.speedMode);
  }
  if (nextOptions.mode !== undefined) {
    sanitized.mode = sanitizeBranchGrowthMode(nextOptions.mode, CONFIG.branchGrowth.mode);
  }
  if (nextOptions.linearSweepDirection !== undefined) {
    sanitized.linearSweepDirection = sanitizeBranchGrowthSweepDirection(
      nextOptions.linearSweepDirection,
      CONFIG.branchGrowth.linearSweepDirection,
    );
  }
  if (nextOptions.linearSweepDurationSec !== undefined) {
    const linearSweepDurationSec = Number(nextOptions.linearSweepDurationSec);
    if (Number.isFinite(linearSweepDurationSec)) {
      sanitized.linearSweepDurationSec = Math.max(0, linearSweepDurationSec);
    }
  }
  if (nextOptions.totalDurationSec !== undefined) {
    const durationSec = Number(nextOptions.totalDurationSec);
    if (Number.isFinite(durationSec)) {
      sanitized.totalDurationSec = Math.max(0.001, durationSec);
    }
  }
  if (nextOptions.pixelsPerSecond !== undefined) {
    const pxPerSec = Number(nextOptions.pixelsPerSecond);
    if (Number.isFinite(pxPerSec)) {
      sanitized.pixelsPerSecond = Math.max(0, pxPerSec);
    }
  }
  if (nextOptions.growthEase !== undefined) {
    sanitized.growthEase = sanitizeAnimationGrowthEaseMode(
      nextOptions.growthEase,
      CONFIG.branchGrowth.growthEase,
    );
  }
  if (nextOptions.growthEasePower !== undefined) {
    const growthEasePower = Number(nextOptions.growthEasePower);
    if (Number.isFinite(growthEasePower)) {
      sanitized.growthEasePower = Math.max(0.01, growthEasePower);
    }
  }
  if (nextOptions.requireFoliageLoadedBeforeStart !== undefined) {
    sanitized.requireFoliageLoadedBeforeStart = Boolean(nextOptions.requireFoliageLoadedBeforeStart);
  }

  Object.assign(CONFIG.branchGrowth, sanitized);
  if (STATE.heroPlaybackGate) {
    STATE.heroPlaybackGate.growthAnimationEnabledByConfig = CONFIG.branchGrowth.enabled === true;
  }

  const offscreenCacheChanged = (
    previous.useOffscreenLayerCache
    !== (CONFIG.branchGrowth.useOffscreenLayerCache !== false)
  );
  if (offscreenCacheChanged) {
    invalidateCompletedBranchLayer();
  }

  if (!CONFIG.branchGrowth.enabled) {
    stopBranchAnimation({ keepElapsed: false });
    renderScene({ skipAutoStart: true });
    return;
  }

  refreshBranchAnimationMetrics();

  const enabledJustTurnedOn = previous.enabled === false && CONFIG.branchGrowth.enabled === true;
  const autoStartJustEnabled = previous.autoStart === false && CONFIG.branchGrowth.autoStart === true;
  if (
    (enabledJustTurnedOn || autoStartJustEnabled)
    && CONFIG.branchGrowth.autoStart
    && !isHeroPlaybackGrowthStartBlocked()
  ) {
    restartBranchAnimation();
    return;
  }

  if (STATE.branchGrowth.running) {
    STATE.branchGrowth.startTimeMs = performance.now() - STATE.branchGrowth.elapsedSec * 1000;
    scheduleBranchAnimationFrame();
  }

  renderScene({ skipAutoStart: true });
}

// Backward-compatible alias.
function applyAnimationOptions(nextOptions) {
  applyBranchGrowthOptions(nextOptions);
}

function applyHeroPlaybackGateOptions(nextOptions) {
  if (!isPlainObjectLiteral(nextOptions)) {
    return;
  }
  const currentConfig = resolveHeroPlaybackGateConfig();
  const nextLegacyButtonPatch = isPlainObjectLiteral(nextOptions.button) ? nextOptions.button : {};
  const nextOpenButtonPatch = isPlainObjectLiteral(nextOptions.openButton)
    ? nextOptions.openButton
    : nextLegacyButtonPatch;
  const nextOpenButtonArrowPatch = isPlainObjectLiteral(nextOptions.openButtonArrow)
    ? nextOptions.openButtonArrow
    : {};
  const nextOpenButtonDebugPatch = isPlainObjectLiteral(nextOptions.openButtonDebug)
    ? nextOptions.openButtonDebug
    : {};
  const nextVideoWigglePatch = isPlainObjectLiteral(nextOptions.videoWiggle)
    ? nextOptions.videoWiggle
    : {};
  const mergedConfig = {
    ...currentConfig,
    ...nextOptions,
    openButton: {
      ...currentConfig.openButton,
      ...nextOpenButtonPatch,
    },
    openButtonArrow: {
      ...currentConfig.openButtonArrow,
      ...nextOpenButtonArrowPatch,
    },
    openButtonDebug: {
      ...currentConfig.openButtonDebug,
      ...nextOpenButtonDebugPatch,
    },
    videoWiggle: {
      ...currentConfig.videoWiggle,
      ...nextVideoWigglePatch,
    },
  };
  CONFIG.heroPlaybackGate = resolveHeroPlaybackGateConfig(mergedConfig);
  requestOpenButtonArrowImageLoad({ force: true }).catch(() => {});
  startHeroPlaybackGateFlow();
}

function applyCenterOverlayImageOptions(nextOptions) {
  if (!isPlainObjectLiteral(nextOptions)) {
    return;
  }
  const currentConfig = resolveCenterOverlayImageConfig();
  const mergedConfig = {
    ...currentConfig,
    ...nextOptions,
  };
  CONFIG.centerOverlayImage = resolveCenterOverlayImageConfig(mergedConfig);
  requestCenterOverlayImageLoad({ force: true }).catch(() => {});
  renderScene({ skipAutoStart: true });
}

async function applyFlowerOptions(nextOptions) {
  if (!isPlainObjectLiteral(nextOptions)) {
    return;
  }

  ensureFlowerConfigShapeInPlace(CONFIG.flowers);
  const patch = normalizeFlowerOptionPatch(nextOptions);
  mergeFlowerOptionsInPlace(CONFIG.flowers, patch);
  ensureFlowerConfigShapeInPlace(CONFIG.flowers);
  STATE.flowerPerfLastLogMs = 0;

  await loadFlowerSpriteIntoSystem();

  rebuildEndpointFlowers();
  renderScene({ skipAutoStart: true });
}

function applyPerformanceOptions(nextOptions) {
  if (!nextOptions || typeof nextOptions !== 'object') {
    return;
  }

  const sanitized = {};
  if (nextOptions.enabled !== undefined) {
    sanitized.enabled = Boolean(nextOptions.enabled);
  }
  if (nextOptions.logIntervalMs !== undefined) {
    const intervalMs = Number(nextOptions.logIntervalMs);
    if (Number.isFinite(intervalMs)) {
      sanitized.logIntervalMs = Math.max(250, intervalMs);
    }
  }

  Object.assign(CONFIG.performance, sanitized);

  if (CONFIG.performance.enabled) {
    resetPerformanceCounters();
  }
}

function applyOffshootOptions(nextOptions) {
  if (!nextOptions || typeof nextOptions !== 'object') {
    return;
  }
  const sanitized = { ...nextOptions };
  if (sanitized.centerBlockEnabled !== undefined) {
    sanitized.centerBlockEnabled = Boolean(sanitized.centerBlockEnabled);
  }
  if (sanitized.centerBlockHalfWidthPxVideoHeightRatio !== undefined) {
    sanitized.centerBlockHalfWidthPxVideoHeightRatio = Math.max(
      0,
      Number.isFinite(Number(sanitized.centerBlockHalfWidthPxVideoHeightRatio))
        ? Number(sanitized.centerBlockHalfWidthPxVideoHeightRatio)
        : Number(CONFIG.offshoot.centerBlockHalfWidthPxVideoHeightRatio) || 0,
    );
  }
  if (sanitized.centerBlockHalfHeightAbovePxVideoHeightRatio !== undefined) {
    sanitized.centerBlockHalfHeightAbovePxVideoHeightRatio = Math.max(
      0,
      Number.isFinite(Number(sanitized.centerBlockHalfHeightAbovePxVideoHeightRatio))
        ? Number(sanitized.centerBlockHalfHeightAbovePxVideoHeightRatio)
        : Number(CONFIG.offshoot.centerBlockHalfHeightAbovePxVideoHeightRatio) || 0,
    );
  }
  if (sanitized.centerBlockHalfHeightBelowPxVideoHeightRatio !== undefined) {
    sanitized.centerBlockHalfHeightBelowPxVideoHeightRatio = Math.max(
      0,
      Number.isFinite(Number(sanitized.centerBlockHalfHeightBelowPxVideoHeightRatio))
        ? Number(sanitized.centerBlockHalfHeightBelowPxVideoHeightRatio)
        : Number(CONFIG.offshoot.centerBlockHalfHeightBelowPxVideoHeightRatio) || 0,
    );
  }
  Object.assign(CONFIG.offshoot, sanitized);
  if (STATE.branchGarden) {
    STATE.branchGarden.rebuildBranches();
  }
  renderScene();
}

function applyPathGenerationOptions(nextOptions) {
  if (!nextOptions || typeof nextOptions !== 'object') {
    return;
  }
  const sanitized = { ...nextOptions };
  if (sanitized.templateNoiseHighpassWindow3 !== undefined) {
    sanitized.templateNoiseHighpassWindow3 = normalizeTemplateNoiseHighpassWindow(
      Number(sanitized.templateNoiseHighpassWindow3),
      CONFIG.pathGeneration.templateNoiseHighpassWindow3,
    );
  }
  if (sanitized.templateNoiseDirectionalBias !== undefined) {
    sanitized.templateNoiseDirectionalBias = normalizeTemplateNoiseDirectionalBias(
      Number(sanitized.templateNoiseDirectionalBias),
      CONFIG.pathGeneration.templateNoiseDirectionalBias,
    );
  }
  if (
    sanitized.templateScaleRangeMin !== undefined ||
    sanitized.templateScaleRangeMax !== undefined
  ) {
    const current = resolveTemplateScaleRange(CONFIG.pathGeneration);
    const candidateMin = Number(sanitized.templateScaleRangeMin);
    const candidateMax = Number(sanitized.templateScaleRangeMax);
    sanitized.templateScaleRangeMin = Number.isFinite(candidateMin)
      ? Math.max(0, candidateMin)
      : current.minScale;
    sanitized.templateScaleRangeMax = Number.isFinite(candidateMax)
      ? Math.max(0, candidateMax)
      : current.maxScale;
    if (sanitized.templateScaleRangeMin > sanitized.templateScaleRangeMax) {
      const tmp = sanitized.templateScaleRangeMin;
      sanitized.templateScaleRangeMin = sanitized.templateScaleRangeMax;
      sanitized.templateScaleRangeMax = tmp;
    }
  }
  if (sanitized.templateInheritCheckpointSpacingSteps !== undefined) {
    sanitized.templateInheritCheckpointSpacingSteps = Boolean(sanitized.templateInheritCheckpointSpacingSteps);
  }
  if (sanitized.useAbsoluteNoiseX !== undefined) {
    sanitized.useAbsoluteNoiseX = Boolean(sanitized.useAbsoluteNoiseX);
  }
  if (sanitized.useAbsoluteNoiseY !== undefined) {
    sanitized.useAbsoluteNoiseY = Boolean(sanitized.useAbsoluteNoiseY);
  }
  if (sanitized.absoluteNoiseXRatio !== undefined) {
    const numeric = Number(sanitized.absoluteNoiseXRatio);
    sanitized.absoluteNoiseXRatio = clamp(
      Number.isFinite(numeric) ? numeric : CONFIG.pathGeneration.absoluteNoiseXRatio,
      0,
      1,
    );
  }
  if (sanitized.absoluteNoiseYRatio !== undefined) {
    const numeric = Number(sanitized.absoluteNoiseYRatio);
    sanitized.absoluteNoiseYRatio = clamp(
      Number.isFinite(numeric) ? numeric : CONFIG.pathGeneration.absoluteNoiseYRatio,
      0,
      1,
    );
  }
  if (sanitized.baseRotationDeg !== undefined) {
    const numeric = Number(sanitized.baseRotationDeg);
    sanitized.baseRotationDeg = clamp(
      Number.isFinite(numeric) ? numeric : Number(CONFIG.pathGeneration.baseRotationDeg) || 0,
      -180,
      180,
    );
  }
  Object.assign(CONFIG.pathGeneration, sanitized);
  if (STATE.branchGarden) {
    STATE.branchGarden.rebuildBranches({ regenerateRoots: true, resetRootTimeCursor: true });
  }
  renderScene();
}

function formatOffshootValue(value, digits = 3) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => formatOffshootValue(entry, digits)).join(', ')}]`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (Math.abs(value - Math.round(value)) < 1e-8) {
      return String(Math.round(value));
    }
    return value.toFixed(digits).replace(/\.?0+$/, '');
  }
  return String(value);
}

function injectOffshootControlStyles() {
  if (document.getElementById('offshoot-controls-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'offshoot-controls-style';
  style.textContent = `
    #offshoot-controls {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 40;
      width: min(430px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      overflow: auto;
      background: rgba(8, 14, 16, 0.88);
      border: 1px solid rgba(150, 208, 172, 0.35);
      border-radius: 10px;
      padding: 10px;
      color: #d9f8e8;
      font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(2px);
      box-shadow: 0 6px 22px rgba(0, 0, 0, 0.35);
    }

    #offshoot-controls h2 {
      margin: 0 0 8px;
      font-size: 12px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #9dd8ba;
    }

    #offshoot-controls .offshoot-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr auto;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }

    #offshoot-controls .offshoot-range-row {
      grid-template-columns: 1.2fr 1fr auto auto;
    }

    #offshoot-controls .offshoot-key {
      color: #bff2d6;
      word-break: break-word;
    }

    #offshoot-controls .offshoot-value {
      color: #f5fff9;
      text-align: right;
      padding-right: 2px;
    }

    #offshoot-controls .offshoot-actions {
      display: flex;
      gap: 4px;
    }

    #offshoot-controls button {
      border: 1px solid rgba(157, 216, 186, 0.35);
      background: rgba(26, 44, 39, 0.85);
      color: #eafff3;
      border-radius: 5px;
      padding: 2px 6px;
      font: inherit;
      cursor: pointer;
    }

    #offshoot-controls button:hover {
      background: rgba(49, 79, 70, 0.95);
    }

    #offshoot-controls .offshoot-mini {
      min-width: 36px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function createOffshootControls() {
  if (!document.body || document.getElementById('offshoot-controls')) {
    return;
  }

  injectOffshootControlStyles();

  const descriptors = [
    { key: 'enabled', type: 'toggle' },
    { key: 'deterministic', type: 'toggle' },
    { key: 'maxDepth', type: 'number', step: 1, min: 0, max: 20, integer: true },
    { key: 'countRange', type: 'range', step: 1, min: 0, max: 50, integer: true },
    { key: 'spawnTMin', type: 'number', step: 0.02, min: 0, max: 1 },
    { key: 'spawnTMax', type: 'number', step: 0.02, min: 0, max: 1 },
    { key: 'biasExponent', type: 'number', step: 0.2, min: 0.01, max: 8 },
    { key: 'angleDegRange', type: 'range', step: 1, min: 0, max: 89, integer: true },
    { key: 'sideMode', type: 'enum', values: ['random', 'left', 'right', 'alternate'] },
    { key: 'depthScale', type: 'number', step: 0.05, min: 0.05, max: 2 },
    { key: 'minSpawnSpacingT', type: 'number', step: 0.01, min: 0, max: 1 },
    { key: 'maxSpawnAttemptsPerChild', type: 'number', step: 1, min: 1, max: 100, integer: true },
    { key: 'maxTotalBranches', type: 'number', step: 10, min: 1, max: 5000, integer: true },
    { key: 'centerBlockEnabled', type: 'toggle' },
    { key: 'centerBlockHalfWidthPxVideoHeightRatio', type: 'number', step: 0.01, min: 0, max: 3 },
    { key: 'centerBlockHalfHeightAbovePxVideoHeightRatio', type: 'number', step: 0.01, min: 0, max: 3 },
    { key: 'centerBlockHalfHeightBelowPxVideoHeightRatio', type: 'number', step: 0.01, min: 0, max: 3 },
  ];

  const panel = document.createElement('section');
  panel.id = 'offshoot-controls';

  const title = document.createElement('h2');
  title.textContent = 'Offshoot Controls';
  panel.appendChild(title);

  const valueNodes = {};

  function getDescriptor(key) {
    for (let i = 0; i < descriptors.length; i += 1) {
      if (descriptors[i].key === key) {
        return descriptors[i];
      }
    }
    return null;
  }

  function readNumberValue(key, fallback = 0) {
    const value = Number(CONFIG.offshoot[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeNumber(descriptor, value) {
    let next = clamp(value, descriptor.min, descriptor.max);
    if (descriptor.integer) {
      next = Math.round(next);
    }
    return next;
  }

  function getRangeValue(descriptor) {
    const fallback = [descriptor.min, descriptor.max];
    const raw = Array.isArray(CONFIG.offshoot[descriptor.key]) ? CONFIG.offshoot[descriptor.key] : fallback;
    const a = normalizeNumber(descriptor, Number(raw[0]));
    const b = normalizeNumber(descriptor, Number(raw[1]));
    return a <= b ? [a, b] : [b, a];
  }

  function refreshValues() {
    for (let i = 0; i < descriptors.length; i += 1) {
      const descriptor = descriptors[i];
      if (!valueNodes[descriptor.key]) {
        continue;
      }
      valueNodes[descriptor.key].textContent = formatOffshootValue(CONFIG.offshoot[descriptor.key], 3);
    }
  }

  function setOffshootPatch(patch) {
    applyOffshootOptions(patch);
    refreshValues();
  }

  function adjustScalar(descriptor, directionSign, stepMultiplier = 1) {
    const current = readNumberValue(descriptor.key, descriptor.min);
    let next = current + descriptor.step * directionSign * stepMultiplier;
    next = normalizeNumber(descriptor, next);

    if (descriptor.key === 'spawnTMin') {
      const currentMax = readNumberValue('spawnTMax', 1);
      if (next > currentMax) {
        setOffshootPatch({ spawnTMin: next, spawnTMax: next });
        return;
      }
    }

    if (descriptor.key === 'spawnTMax') {
      const currentMin = readNumberValue('spawnTMin', 0);
      if (next < currentMin) {
        setOffshootPatch({ spawnTMin: next, spawnTMax: next });
        return;
      }
    }

    setOffshootPatch({ [descriptor.key]: next });
  }

  function adjustRange(descriptor, index, directionSign, stepMultiplier = 1) {
    const range = getRangeValue(descriptor);
    range[index] = normalizeNumber(
      descriptor,
      range[index] + descriptor.step * directionSign * stepMultiplier,
    );
    if (range[0] > range[1]) {
      if (index === 0) {
        range[1] = range[0];
      } else {
        range[0] = range[1];
      }
    }
    setOffshootPatch({ [descriptor.key]: range });
  }

  function cycleEnum(descriptor) {
    const values = descriptor.values || [];
    if (values.length === 0) {
      return;
    }
    const current = String(CONFIG.offshoot[descriptor.key]);
    const index = values.indexOf(current);
    const nextIndex = index >= 0 ? (index + 1) % values.length : 0;
    setOffshootPatch({ [descriptor.key]: values[nextIndex] });
  }

  for (let i = 0; i < descriptors.length; i += 1) {
    const descriptor = descriptors[i];
    const row = document.createElement('div');
    row.className = 'offshoot-row';
    if (descriptor.type === 'range') {
      row.classList.add('offshoot-range-row');
    }

    const keyEl = document.createElement('div');
    keyEl.className = 'offshoot-key';
    keyEl.textContent = descriptor.key;

    const valueEl = document.createElement('div');
    valueEl.className = 'offshoot-value';
    valueNodes[descriptor.key] = valueEl;

    const actions = document.createElement('div');
    actions.className = 'offshoot-actions';

    if (descriptor.type === 'toggle') {
      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = 'toggle';
      toggleBtn.addEventListener('click', () => {
        setOffshootPatch({ [descriptor.key]: !Boolean(CONFIG.offshoot[descriptor.key]) });
      });
      actions.appendChild(toggleBtn);
    } else if (descriptor.type === 'enum') {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'next';
      nextBtn.addEventListener('click', () => cycleEnum(descriptor));
      actions.appendChild(nextBtn);
    } else if (descriptor.type === 'range') {
      const minActions = document.createElement('div');
      minActions.className = 'offshoot-actions';
      const minMinus = document.createElement('button');
      minMinus.className = 'offshoot-mini';
      minMinus.textContent = 'min-';
      minMinus.addEventListener('click', (event) => {
        adjustRange(descriptor, 0, -1, getModifierStepMultiplier(event));
      });
      const minPlus = document.createElement('button');
      minPlus.className = 'offshoot-mini';
      minPlus.textContent = 'min+';
      minPlus.addEventListener('click', (event) => {
        adjustRange(descriptor, 0, 1, getModifierStepMultiplier(event));
      });
      minActions.append(minMinus, minPlus);

      const maxActions = document.createElement('div');
      maxActions.className = 'offshoot-actions';
      const maxMinus = document.createElement('button');
      maxMinus.className = 'offshoot-mini';
      maxMinus.textContent = 'max-';
      maxMinus.addEventListener('click', (event) => {
        adjustRange(descriptor, 1, -1, getModifierStepMultiplier(event));
      });
      const maxPlus = document.createElement('button');
      maxPlus.className = 'offshoot-mini';
      maxPlus.textContent = 'max+';
      maxPlus.addEventListener('click', (event) => {
        adjustRange(descriptor, 1, 1, getModifierStepMultiplier(event));
      });
      maxActions.append(maxMinus, maxPlus);

      row.append(keyEl, valueEl, minActions, maxActions);
      panel.appendChild(row);
      continue;
    } else {
      const minusBtn = document.createElement('button');
      minusBtn.className = 'offshoot-mini';
      minusBtn.textContent = '-';
      minusBtn.addEventListener('click', (event) => {
        adjustScalar(descriptor, -1, getModifierStepMultiplier(event));
      });
      const plusBtn = document.createElement('button');
      plusBtn.className = 'offshoot-mini';
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', (event) => {
        adjustScalar(descriptor, 1, getModifierStepMultiplier(event));
      });
      actions.append(minusBtn, plusBtn);
    }

    row.append(keyEl, valueEl, actions);
    panel.appendChild(row);
  }

  const footerActions = document.createElement('div');
  footerActions.className = 'offshoot-actions';
  footerActions.style.justifyContent = 'flex-end';

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'defaults';
  const offshootDefaults = JSON.parse(JSON.stringify(CONFIG.offshoot));
  resetBtn.addEventListener('click', () => {
    setOffshootPatch({ ...offshootDefaults });
  });

  footerActions.appendChild(resetBtn);
  panel.appendChild(footerActions);

  document.body.appendChild(panel);
  refreshValues();
}

function injectPathGenerationControlStyles() {
  if (document.getElementById('path-generation-controls-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'path-generation-controls-style';
  style.textContent = `
    #path-generation-controls {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 40;
      width: min(430px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      overflow: auto;
      background: rgba(8, 14, 16, 0.88);
      border: 1px solid rgba(147, 200, 255, 0.35);
      border-radius: 10px;
      padding: 10px;
      color: #e5f4ff;
      font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(2px);
      box-shadow: 0 6px 22px rgba(0, 0, 0, 0.35);
    }

    #path-generation-controls h2 {
      margin: 0 0 8px;
      font-size: 12px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #99c6eb;
    }

    #path-generation-controls .pathgen-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr auto;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }

    #path-generation-controls .pathgen-key {
      color: #bddfff;
      word-break: break-word;
    }

    #path-generation-controls .pathgen-value {
      color: #f5fbff;
      text-align: right;
      padding-right: 2px;
    }

    #path-generation-controls .pathgen-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(153, 198, 235, 0.35);
      background: rgba(18, 27, 38, 0.9);
      color: #f5fbff;
      border-radius: 5px;
      padding: 3px 6px;
      font: inherit;
    }

    #path-generation-controls .pathgen-input:focus {
      outline: none;
      border-color: rgba(180, 220, 255, 0.9);
      box-shadow: 0 0 0 1px rgba(180, 220, 255, 0.35);
    }

    #path-generation-controls .pathgen-input.pathgen-input-invalid {
      border-color: rgba(255, 120, 120, 0.9);
      box-shadow: 0 0 0 1px rgba(255, 120, 120, 0.25);
    }

    #path-generation-controls .pathgen-actions {
      display: flex;
      gap: 4px;
    }

    #path-generation-controls button {
      border: 1px solid rgba(153, 198, 235, 0.35);
      background: rgba(26, 38, 52, 0.85);
      color: #f5fbff;
      border-radius: 5px;
      padding: 2px 6px;
      font: inherit;
      cursor: pointer;
    }

    #path-generation-controls button:hover {
      background: rgba(52, 74, 96, 0.95);
    }

    #path-generation-controls .pathgen-mini {
      min-width: 36px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function createPathGenerationControls() {
  if (!document.body || document.getElementById('path-generation-controls')) {
    return;
  }

  injectPathGenerationControlStyles();

  const descriptors = [
    { key: 'mode', type: 'enum', values: ['random', 'manualTemplate'] },
    { key: 'useAbsoluteNoiseX', type: 'toggle' },
    { key: 'useAbsoluteNoiseY', type: 'toggle' },
    { key: 'absoluteNoiseXRatio', type: 'number', step: 0.05, min: 0, max: 1 },
    { key: 'absoluteNoiseYRatio', type: 'number', step: 0.05, min: 0, max: 1 },
    { key: 'baseRotationDeg', type: 'number', step: 1, min: -180, max: 180 },
    { key: 'templateScale', type: 'number', step: 0.05, min: 0, max: 10 },
    { key: 'templateScaleRangeMin', type: 'number', step: 0.05, min: 0, max: 10 },
    { key: 'templateScaleRangeMax', type: 'number', step: 0.05, min: 0, max: 10 },
    { key: 'templateNoiseAmount', type: 'number', step: 5, min: 0, max: 2000 },
    { key: 'templateNoiseStep', type: 'number', step: 0.0001, min: 0.000001, max: 2 },
    { key: 'templateNoiseAmount2', type: 'number', step: 5, min: 0, max: 2000 },
    { key: 'templateNoiseStep2', type: 'number', step: 0.0001, min: 0.000001, max: 2 },
    { key: 'templateNoiseAmount3', type: 'number', step: 5, min: 0, max: 2000 },
    { key: 'templateNoiseStep3', type: 'number', step: 0.0001, min: 0.000001, max: 2 },
    { key: 'templateNoiseHighpassWindow3', type: 'number', step: 2, min: 3, max: 51, integer: true },
    { key: 'templateNoiseDirectionalBias', type: 'number', step: 0.05, min: 0, max: 1 },
    { key: 'templateInheritCheckpointSpacingSteps', type: 'toggle' },
    { key: 'alignTemplateToGrowth', type: 'toggle' },
    { key: 'templatePickMode', type: 'enum', values: ['random', 'fixed'] },
    { key: 'templatePickDeterministic', type: 'toggle' },
    { key: 'fixedTemplateIndex', type: 'number', step: 1, min: 0, max: 999, integer: true },
    { key: 'manualTemplatesCount', type: 'readonly' },
  ];

  const panel = document.createElement('section');
  panel.id = 'path-generation-controls';

  const title = document.createElement('h2');
  title.textContent = 'Path Generation';
  panel.appendChild(title);

  const valueNodes = {};
  const inputNodes = {};

  function getTemplateCount() {
    return getSanitizedManualTemplates().length;
  }

  function getDescriptorMax(descriptor) {
    if (descriptor.key === 'fixedTemplateIndex') {
      return Math.max(0, getTemplateCount() - 1);
    }
    return descriptor.max;
  }

  function normalizeNumber(descriptor, value) {
    const descriptorMax = getDescriptorMax(descriptor);
    const maxValue = Number.isFinite(descriptorMax) ? descriptorMax : descriptor.max;
    let next = clamp(value, descriptor.min, maxValue);
    if (descriptor.integer) {
      next = Math.round(next);
    }
    if (descriptor.key === 'templateNoiseHighpassWindow3') {
      next = normalizeTemplateNoiseHighpassWindow(next, descriptor.min);
    }
    if (descriptor.key === 'templateNoiseDirectionalBias') {
      next = normalizeTemplateNoiseDirectionalBias(next, descriptor.min);
    }
    return next;
  }

  function readNumberValue(key, fallback = 0) {
    const value = Number(CONFIG.pathGeneration[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function readDescriptorValue(descriptor) {
    if (descriptor.type === 'readonly' && descriptor.key === 'manualTemplatesCount') {
      return getTemplateCount();
    }
    return CONFIG.pathGeneration[descriptor.key];
  }

  function formatDescriptorValue(descriptor, value) {
    if (descriptor.type === 'number') {
      return formatOffshootValue(value, 6);
    }
    if (descriptor.type === 'toggle') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  function parseToggleValue(raw) {
    const text = raw.trim().toLowerCase();
    if (text === 'true' || text === '1' || text === 'yes' || text === 'on') {
      return true;
    }
    if (text === 'false' || text === '0' || text === 'no' || text === 'off') {
      return false;
    }
    return null;
  }

  function parseDescriptorInput(descriptor, raw) {
    const text = raw.trim();
    if (descriptor.type === 'number') {
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) {
        return { ok: false, value: null };
      }
      return { ok: true, value: normalizeNumber(descriptor, parsed) };
    }
    if (descriptor.type === 'toggle') {
      const parsed = parseToggleValue(text);
      if (parsed === null) {
        return { ok: false, value: null };
      }
      return { ok: true, value: parsed };
    }
    if (descriptor.type === 'enum') {
      const values = descriptor.values || [];
      if (values.includes(text)) {
        return { ok: true, value: text };
      }
      const lower = text.toLowerCase();
      for (let i = 0; i < values.length; i += 1) {
        if (String(values[i]).toLowerCase() === lower) {
          return { ok: true, value: values[i] };
        }
      }
      return { ok: false, value: null };
    }
    return { ok: false, value: null };
  }

  function areSameValue(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 1e-10;
    }
    return a === b;
  }

  function commitInputValue(descriptor, inputEl) {
    const parsed = parseDescriptorInput(descriptor, inputEl.value);
    if (!parsed.ok) {
      inputEl.classList.add('pathgen-input-invalid');
      return;
    }

    inputEl.classList.remove('pathgen-input-invalid');
    const currentValue = readDescriptorValue(descriptor);
    if (areSameValue(currentValue, parsed.value)) {
      refreshValues();
      return;
    }

    setPathGenerationPatch({ [descriptor.key]: parsed.value });
  }

  function refreshValues() {
    for (let i = 0; i < descriptors.length; i += 1) {
      const descriptor = descriptors[i];
      const value = readDescriptorValue(descriptor);

      const valueNode = valueNodes[descriptor.key];
      if (valueNode) {
        valueNode.textContent = formatDescriptorValue(descriptor, value);
      }

      const inputNode = inputNodes[descriptor.key];
      if (inputNode && document.activeElement !== inputNode) {
        inputNode.value = formatDescriptorValue(descriptor, value);
        inputNode.classList.remove('pathgen-input-invalid');
      }
    }
  }

  function setPathGenerationPatch(patch) {
    applyPathGenerationOptions(patch);
    refreshValues();
  }

  function adjustScalar(descriptor, directionSign, stepMultiplier = 1) {
    const fallback = Number.isFinite(descriptor.min) ? descriptor.min : 0;
    const current = readNumberValue(descriptor.key, fallback);
    let next = current + descriptor.step * directionSign * stepMultiplier;
    next = normalizeNumber(descriptor, next);
    setPathGenerationPatch({ [descriptor.key]: next });
  }

  function cycleEnum(descriptor) {
    const values = descriptor.values || [];
    if (values.length === 0) {
      return;
    }
    const current = String(CONFIG.pathGeneration[descriptor.key]);
    const index = values.indexOf(current);
    const nextIndex = index >= 0 ? (index + 1) % values.length : 0;
    setPathGenerationPatch({ [descriptor.key]: values[nextIndex] });
  }

  for (let i = 0; i < descriptors.length; i += 1) {
    const descriptor = descriptors[i];
    const row = document.createElement('div');
    row.className = 'pathgen-row';

    const keyEl = document.createElement('div');
    keyEl.className = 'pathgen-key';
    keyEl.textContent = descriptor.key;

    let valueCell;
    if (descriptor.type === 'readonly') {
      const valueEl = document.createElement('div');
      valueEl.className = 'pathgen-value';
      valueNodes[descriptor.key] = valueEl;
      valueCell = valueEl;
    } else {
      const inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'pathgen-input';
      inputNodes[descriptor.key] = inputEl;
      inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          commitInputValue(descriptor, inputEl);
          inputEl.blur();
        } else if (event.key === 'Escape') {
          refreshValues();
          inputEl.blur();
        }
      });
      inputEl.addEventListener('blur', () => {
        commitInputValue(descriptor, inputEl);
      });
      valueCell = inputEl;
    }

    const actions = document.createElement('div');
    actions.className = 'pathgen-actions';

    if (descriptor.type === 'toggle') {
      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = 'toggle';
      toggleBtn.addEventListener('click', () => {
        setPathGenerationPatch({ [descriptor.key]: !Boolean(CONFIG.pathGeneration[descriptor.key]) });
      });
      actions.appendChild(toggleBtn);
    } else if (descriptor.type === 'enum') {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'next';
      nextBtn.addEventListener('click', () => cycleEnum(descriptor));
      actions.appendChild(nextBtn);
    } else if (descriptor.type === 'number') {
      const minusBtn = document.createElement('button');
      minusBtn.className = 'pathgen-mini';
      minusBtn.textContent = '-';
      minusBtn.addEventListener('click', (event) => {
        adjustScalar(descriptor, -1, getModifierStepMultiplier(event));
      });
      const plusBtn = document.createElement('button');
      plusBtn.className = 'pathgen-mini';
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', (event) => {
        adjustScalar(descriptor, 1, getModifierStepMultiplier(event));
      });
      actions.append(minusBtn, plusBtn);
    } else {
      const readonlyTag = document.createElement('div');
      readonlyTag.textContent = 'read-only';
      actions.appendChild(readonlyTag);
    }

    row.append(keyEl, valueCell, actions);
    panel.appendChild(row);
  }

  const footerActions = document.createElement('div');
  footerActions.className = 'pathgen-actions';
  footerActions.style.justifyContent = 'flex-end';

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'defaults';
  const pathGenerationDefaults = JSON.parse(JSON.stringify(CONFIG.pathGeneration));
  resetBtn.addEventListener('click', () => {
    setPathGenerationPatch({ ...pathGenerationDefaults });
  });

  footerActions.appendChild(resetBtn);
  panel.appendChild(footerActions);

  document.body.appendChild(panel);
  refreshValues();
}

function exposeDevToolsApi() {
  const api = {
    config: CONFIG,

    setSeeds,

    plantSeeds(seedPacket, options = {}) {
      const branches = plantSeeds(seedPacket, options);
      renderScene();
      return branches;
    },

    addBranch(seedX, seedY, direction = -1, offshootOrOptions = {}) {
      if (!STATE.branchGarden) {
        return null;
      }
      const branch = STATE.branchGarden.addBranch(
        seedX,
        seedY,
        direction,
        normalizeAddBranchOptions(offshootOrOptions),
      );
      renderScene();
      return branch;
    },

    clearBranches() {
      if (!STATE.branchGarden) {
        return;
      }
      STATE.branchGarden.clear();
      renderScene();
    },

    regenerateBranches() {
      if (!STATE.branchGarden) {
        return;
      }
      STATE.branchGarden.regenerateAll();
      renderScene();
    },

    getBranches() {
      return STATE.branchGarden ? STATE.branchGarden.branches : [];
    },

    getBranchEndpoints() {
      return Array.isArray(STATE.branchEndpoints)
        ? STATE.branchEndpoints.map((endpoint) => ({ ...endpoint }))
        : [];
    },

    setBrushOptions(nextOptions) {
      Object.assign(CONFIG.brush, nextOptions);
      resetFilteredStemTextureCache();
      refreshBranchThicknessBaseScales();
      refreshBranchFilterVariations();
      invalidateAllBranchStripCaches();
      invalidateCompletedBranchLayer();
      renderScene();
    },

    setGlobalFoliageScale(nextScale) {
      const numeric = Number(nextScale);
      CONFIG.globalFoliageScale = Number.isFinite(numeric) ? Math.max(0.01, numeric) : 1;
      renderScene();
      return CONFIG.globalFoliageScale;
    },

    setDebugOptions(nextOptions) {
      Object.assign(CONFIG.debug, nextOptions);
      invalidateCompletedBranchLayer();
      renderScene();
    },

    setOffshootOptions(nextOptions) {
      applyOffshootOptions(nextOptions);
    },

    setPathGenerationOptions(nextOptions) {
      applyPathGenerationOptions(nextOptions);
    },

    setBranchGrowthOptions(nextOptions) {
      applyBranchGrowthOptions(nextOptions);
    },

    setAnimationOptions(nextOptions) {
      applyBranchGrowthOptions(nextOptions);
    },

    setHeroPlaybackGateOptions(nextOptions) {
      applyHeroPlaybackGateOptions(nextOptions);
    },

    setCenterOverlayImageOptions(nextOptions) {
      applyCenterOverlayImageOptions(nextOptions);
    },

    setFrameJumpHotkeysOptions(nextOptions) {
      applyFrameJumpHotkeysOptions(nextOptions);
    },

    async setFlowerOptions(nextOptions) {
      await applyFlowerOptions(nextOptions);
    },

    getFlowerPerformanceSnapshot() {
      const flowerSystem = getFlowerSystem();
      if (!flowerSystem || typeof flowerSystem.getPerformanceSnapshot !== 'function') {
        return null;
      }
      return flowerSystem.getPerformanceSnapshot();
    },

    setPerformanceOptions(nextOptions) {
      applyPerformanceOptions(nextOptions);
    },

    getPerformanceSnapshot() {
      const perf = STATE.performance;
      if (!perf.lastSummary) {
        return null;
      }
      return {
        ...perf.lastSummary,
        cacheMissReasons: {
          ...perf.lastSummary.cacheMissReasons,
        },
      };
    },

    resetPerformanceStats() {
      resetPerformanceCounters();
      return true;
    },

    startBranchGrowth() {
      if (!CONFIG.branchGrowth.enabled) {
        CONFIG.branchGrowth.enabled = true;
      }
      startBranchAnimation({ restart: true });
    },

    pauseBranchGrowth() {
      pauseBranchAnimation();
    },

    resumeBranchGrowth() {
      resumeBranchAnimation();
    },

    restartBranchGrowth() {
      restartBranchAnimation();
    },

    // Backward-compatible aliases
    startAnimation() {
      if (!CONFIG.branchGrowth.enabled) {
        CONFIG.branchGrowth.enabled = true;
      }
      startBranchAnimation({ restart: true });
    },

    pauseAnimation() {
      pauseBranchAnimation();
    },

    resumeAnimation() {
      resumeBranchAnimation();
    },

    restartAnimation() {
      restartBranchAnimation();
    },

    listManualTemplates() {
      return getManualTemplateDescriptors();
    },

    async reloadManualTemplates() {
      await loadManualTemplateSources({ force: true });
      if (STATE.branchGarden) {
        STATE.branchGarden.rebuildBranches({ regenerateRoots: true, resetRootTimeCursor: true });
      }
      renderScene();
      return getManualTemplateDescriptors();
    },

    rerender() {
      renderScene();
    },
  };
  window.stemWarpDemo10 = api;
  window.stemWarpDemo11 = api;
}

// =========================
// 17) Bootstrap
// =========================
async function bootstrap() {
  if (STATE.hasBootstrapped) {
    return;
  }
  STATE.hasBootstrapped = true;

  resizeCanvasToViewport();
  refreshHeroVideoReferenceRect();
  STATE.foliageLoad.videoReady = false;
  STATE.foliageLoad.stemReady = false;
  STATE.foliageLoad.leafReady = false;
  STATE.foliageLoad.flowerReady = false;
  STATE.foliageLoad.ready = false;
  await waitForInitialHeroVideoReadyForStartup();
  STATE.foliageLoad.videoReady = true;

  if (
    window.StemWarpFlowerSystem11
    && typeof window.StemWarpFlowerSystem11.createFlowerSystem === 'function'
  ) {
    STATE.flowerSystem = window.StemWarpFlowerSystem11.createFlowerSystem();
    if (STATE.flowerSystem && typeof STATE.flowerSystem.setPixiSurfaces === 'function') {
      STATE.flowerSystem.setPixiSurfaces({
        backCanvas: flowersBackCanvas,
        frontCanvas: flowersFrontCanvas,
      });
    }
  } else {
    console.warn('Flower system module missing (script_11_flowers.js). Flowers are disabled.');
  }

  // Immediate fallback stem so first paint is not blocked on network.
  STATE.stemImage = createFallbackStemTexture();
  STATE.stemImageFlippedX = createHorizontallyFlippedTexture(STATE.stemImage);
  STATE.leafImage = null;
  setFoliageLoadReadyFlag('stemReady', true);
  resetFilteredStemTextureCache();
  await loadManualTemplateSources();
  STATE.branchGarden = new BranchGarden();

  // Optional center branch.
  // STATE.branchGarden.addBranch(STATE.viewportWidth * 0.5, STATE.viewportHeight * 0.9, -1);

  // Plant many side branches from seeds.
  STATE.lastSeedPacket = setSeeds();
  plantSeeds(STATE.lastSeedPacket, { clearFirst: true });

  if (CONFIG.performance.enabled) {
    resetPerformanceCounters();
  }
  startHeroPlaybackGateFlow();
  renderScene();
  setupEventHandlers();
  exposeDevToolsApi();
  // Load heavier visual assets in the background and progressively upgrade.
  loadStemTexture()
    .then((stemTexture) => {
      if (!stemTexture) {
        return;
      }
      STATE.stemImage = stemTexture;
      STATE.stemImageFlippedX = createHorizontallyFlippedTexture(stemTexture);
      setFoliageLoadReadyFlag('stemReady', true);
      resetFilteredStemTextureCache();
      invalidateAllBranchStripCaches();
      invalidateCompletedBranchLayer();
      renderScene({ skipAutoStart: true });
    })
    .catch((error) => {
      console.warn(error.message || String(error));
      setFoliageLoadReadyFlag('stemReady', true);
    });

  loadLeafTexture(CONFIG.leaves || {})
    .then((leafTexture) => {
      STATE.leafImage = leafTexture;
      setFoliageLoadReadyFlag('leafReady', true);
      invalidateCompletedBranchLayer();
      renderScene({ skipAutoStart: true });
    })
    .catch((error) => {
      console.warn(error.message || String(error));
      setFoliageLoadReadyFlag('leafReady', true);
    });

  loadFlowerSpriteIntoSystem()
    .then(() => {
      setFoliageLoadReadyFlag('flowerReady', true);
      invalidateCompletedBranchLayer();
      renderScene({ skipAutoStart: true });
    })
    .catch((error) => {
      console.warn(error.message || String(error));
      setFoliageLoadReadyFlag('flowerReady', true);
    });
  // createPathGenerationControls();
  // createOffshootControls();
}

// =========================
// 18) Run Area
// =========================
function startBootstrap() {
  bootstrap().catch((error) => {
    console.error('Failed to bootstrap script_11.js', error);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBootstrap, { once: true });
} else {
  startBootstrap();
}
