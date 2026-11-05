(function initStemWarpUserConfig(global) {
  function createStemWarpUserConfig(runtime) {
    const safeRuntime = runtime && typeof runtime === 'object' ? runtime : {};
    const gradient = safeRuntime.gradient;
    const valScaling = Number.isFinite(Number(safeRuntime.valScaling)) ? Number(safeRuntime.valScaling) : 0.01;
    const defaultCountPerSide = Number.isFinite(Number(safeRuntime.defaultCountPerSide))
      ? Math.max(1, Math.floor(Number(safeRuntime.defaultCountPerSide)))
      : 9;

    return {
  // LITE MODE - Opt-in "simpler experience" for slow devices.
  // Activated when the URL contains `?<queryParamKey>=1` (e.g. ?lite=1).
  // When active: the hero video plays normally, the foliage video plays once
  // then freezes on its last frame, and the canvas-based branches / leaves /
  // flowers / jump-sparkle system is disabled entirely. DPR is also capped to 1.
  // The splash shows an opt-in hint after `splashHintDelayMs` if the hero
  // video has not yet reached HAVE_CURRENT_DATA (likely-slow load).
  liteMode: {
    enabled: true,
    queryParamKey: 'lite',
    splashHintDelayMs: 4800,
    splashHintRequireHeroNotReady: false,
    splashHintText: 'slow speeds?  tap here for a simpler experience',
    splashHintColor: null,
    renderDprCap: 1.55, // lite-mode DPR ceiling (set <1 only for aggressive testing)
    heroReadyTimeoutMs: 0, // 0 = splashHintDelayMs + built-in safety margin
    splashHintTestStall: {
      enabled: false, // testing-only: keep splash visible and hold hero loading in full mode
      stallDurationMs: 15000,
    },
    viewportLayout: {
      disableRelative166Offset: true, // in lite mode: skip relative166 auto-mode even on iOS
    },
    videoOverrides: {
    
      hero: {
        webm: './hero_final_keyed_lite.webm',
        webmFallback: './hero_final_keyed_lite.webm',
        mov: './hero_final_foriOS_lite.mov',
        movFallback: './hero_final_foriOS.mov',
      },
      foliage: {
        lowerVideo: {
          webm: './smallGrowBloom_lower.webm',
          webmFallback: './smallGrowBloom_lower.webm',
          mov: './smallGrowBloom_lower_foriOS.mov',
          movFallback: './smallGrowBloom_lower_foriOS.mov',
        },
        upperVideo: {
          webm: './smallGrowBloom_upper.webm',
          webmFallback: './smallGrowBloom_upper.webm',
          mov: './smallGrowBloom_upper_foriOS.mov',
          movFallback: './smallGrowBloom_upper_foriOS.mov',
        },
        combinedVideo: {
          webm: './foliage_vid_combined_lite.webm',
          webmFallback: './foliage_vid_combined.webm',
          mov: './foliage_vid_combined_lite.mov',
          movFallback: './foliage_vid_combined.mov',
        },
      },
    },
  },

  // SECTION CONTROL - Enable/disable individual canvas elements
  sectionControl: {
    enabled: false,
    debugConsole: {
      enabled: true,
      position: 'top-right', // top-right | top-left | bottom-right | bottom-left
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      textColor: '#00ff00',
      fontSize: '12px',
      padding: '10px',
      maxWidth: '300px',
    },
    canvases: {
      myCanvas: {
        enabled: true,
        description: 'Holds foliage below Hero video',
      },
      myCanvasFront: {
        enabled: true,
        description: 'Holds foliage above Hero video',
      },
      myCanvasFlowersBack: {
        enabled: true,
        description: 'Empty as far as I can tell',
      },
      myCanvasFlowersFront: {
        enabled: true,
        description: 'Empty canvas as far as I can tell',
      },
      rsvpNameFitMeasureCanvas: {
        enabled: true,
        description: 'RSVP name fit measurement canvas (hidden, for text sizing)',
      },
    },
  },

  backgroundColor: gradient,
  pageBackground: {
    mode: 'solid', // gradient | solid
    pureWhite: false, // quick override: forces pure white background regardless of mode
    solidColor: '#ffffff', // used when mode === 'solid'
    gradient: {
      top: 'hsl(205, 15%, 100%)',
      mid: 'hsl(208, 15%, 89%)',
      bottom: 'hsl(208, 20%, 82%)',
    },
  },
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
    stripWidthMobile: null, // null uses stripWidth; set a number to override on likely-mobile devices
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
    repeatOverlapMobile: null, // null uses repeatOverlap; set a number to override on likely-mobile devices
    startOffset: 0,
    cropPartialRepeat: true,
  },

  seeds: {
    // countPerSide: defaultCountPerSide,
    countPerSide: defaultCountPerSide,

    sidePad: -0.14, // interpreted by sidePadBasis
    sidePadBasis: 'videoWidthRatio', // px | videoWidthRatio | viewportWidthRatio
    sideAnchorXMode: 'videoCenter', // viewportEdges | videoCenter
    sideMargin: 0,
    mode: 'explicitYRatios', // autoSpacing | explicitYRatios
    // mode: 'autoSpacing', // autoSpacing | explicitYRatios

    explicitYRatioBasis: 'video', // video | viewport
    explicitYRatios: [0.05, 0.1, 0.3, 0.5, 0.4 , 0.45, 0.89, 0.85, 0.9, 0.81, 0.75], // shared ratios for both sides (0..1 or 0..100)
    explicitYRatiosBySide: null, // optional { left: [...], right: [...] }
    explicitYRatiosLeft: null, // optional side override list
    explicitYRatiosRight: null, // optional side override list
    startY: window.innerHeight * 0.05, // explicit first-seed Y; null randomizes first seed per side
    randomizeSpacing: false, // if true, per-seed spacing is sampled in [minSpacing, maxSpacing]
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
    angleDegRange: [0,0],
    sideMode: 'alternate', // random | left | right | alternate
    depthScale: 0.6,
    minSpawnSpacingT: 0.02,
    maxSpawnAttemptsPerChild: 800,
    maxTotalBranches: 200,
    pathGenerationMode: 'inherit', // inherit | random | manualTemplate
    templateIndexPool: [2], // e.g. [1, 4, 7] => randomly pick one for each offshoot
    centerBlockEnabled: true, // clip offshoot branches when they enter the center block area
     centerBlockHalfWidthPxVideoHeightRatio: 0.16, // X half-width as ratio of sampled video height
    centerBlockHalfHeightAbovePxVideoHeightRatio: 0.8, // Y extent above center as ratio of sampled video height
    centerBlockHalfHeightBelowPxVideoHeightRatio: 0.8,  // Y extent below center as ratio of sampled video height
  },

  priority: {
    enabled: true,
    endpointCullRadiusPxVideoHeightRatio: 0.045,
    squares: [
      {
        enabled: true,
        centerXRatio: 0.4,
        centerYRatio: 0.4,
        sizeXRatio: 0.15,
        sizeYRatio: 0.12,
      },
      {
        enabled: false,
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        sizeXRatio: 0.25,
        sizeYRatio: 0.25,
      },
      {
        enabled: false,
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        sizeXRatio: 0.25,
        sizeYRatio: 0.25,
      },
      {
        enabled: false,
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        sizeXRatio: 0.25,
        sizeYRatio: 0.25,
      },
      {
        enabled: false,
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        sizeXRatio: 0.25,
        sizeYRatio: 0.25,
      },
    ],
    debug: {
      enabled: false,
      drawOnFrontLayer: true,
      strokeStyle: 'rgba(255, 120, 70, 0.95)',
      fillStyle: 'rgba(255, 120, 70, 0.12)',
      lineWidthPx: 2,
      showCulledEndpointCircles: true,
      culledCircleStrokeStyle: 'rgba(255, 65, 65, 0.98)',
      culledCircleFillStyle: 'rgba(255, 65, 65, 0.14)',
    },
  },

  branchGrowth: {
    enabled: false,
    mode: 'linearBySeedY', // simultaneous | linearBySeedY
    linearSweepDirection: 'up', // down (top->bottom) | up (bottom->top)
    linearSweepDurationSec: 8, // sweep time across root seed Y range
    speedMode: 'rate', // duration | rate
    totalDurationSec: 1.5,
    pixelsPerSecond: 50,
    growthEase: 'easeOut', // linear | easeIn | easeOut | easeInOut
    growthEasePower: 1,
    autoStart: true,
    requireFoliageLoadedBeforeStart: true,
    useOffscreenLayerCache: true,
    useIncrementalStemCache: true, // commit only new tip growth each frame; free blit replays the rest
    growthFpsCap: 30, // max render fps during growth animation (0 = uncapped); matches native RAF cadence above this
    earlyCommitEnabled: false, // commit partially-grown branches once they cross earlyCommitThreshold
    earlyCommitThreshold: 0.5, // fraction of totalLength (0..1) at which a growing branch is committed early
    overlayPromotionGrowthOnMode: 'growthON', // growthON only: matchGrowthOff | firstExitCutover
  },

  foliageVideos: {
    enabled: true,
    mode: 'combined', // split | combined
    startFrame: 270, // Hero video frame at which to start foliage videos
    playbackSpeed: 1.45,
    fallbackToFoliageOnLoadError: true,
    handoffMinHoldMs: 110, // keep video visible a bit longer to guarantee zero-flash handoff
    handoffSettleRafCount: 2, // extra RAF paints while canvas is visible before hiding video
    handoffTimeoutMs: 900, // hard safety timeout for handoff finalization
    keepCanvasesMountedDuringVideo: true, // avoid cold compositor attach on reveal
    syncEnabled: false, // enable/disable sync loop to keep videos in sync
    syncMethod: 'requestVideoFrameCallback', // 'auto' (try requestVideoFrameCallback first), 'requestVideoFrameCallback', 'raf'
    driftThresholdFrames: 3, // frames of drift allowed before correction (at 30fps = 0.033s)
    syncMaster: 'upper', // which video is the master ('lower' or 'upper')
    lowerVideo: {
      webm: './smallGrowBloom_lower.webm',
      mov: './smallGrowBloom_lower_foriOS.mov',
    },
    upperVideo: {
      webm: './smallGrowBloom_upper.webm',
      mov: './smallGrowBloom_upper_foriOS.mov',
    },
    combinedVideo: {
      webm: './foliage_vid_combined_lite.webm',
      mov: './foliage_vid_combined.mov',
    },
  },

  frameJumpHotkeys: {
    enabled: true,
    timelineFps: 30,
    bindings: {
      1: 0,
      2: 130,
      3: 273,
      4: null,
      5: null,
      6: null,
    },
  },

  mastersound: {
    enabled: true, // set to true to enable master sound system
    // Parallel lists: each index corresponds to one sound effect
    filePaths: [
      // './sound1.mp3',
      // './sound2.mp3',
      // './sound3.mp3',
      './woosh_2.mp3',
      './pop.mp3',
      './twinkle_2.mp3',
      './twinkle_3.mp3',
      './shine.mp3',
      './paper_flip.m4a',

      

    ],
    triggerFrames: [
      // 150,
      // 200,
      // 300,
      126,
      222-6,
      219-5,
      219-5,
      188-5,
      243,
    ],
    delaysMs: [
      // 0,
      // 100,
      // 50,
      500,
      0,
      200,
      100,
      0,
      0,
    ],
    volumes: [
      // 1.0, // volume level (0.0 to 1.0)
      // 0.8,
      // 0.5,
      0.05/10,
      0.03/10,
      0.02/10,
      0.13/10,
      0.01/10,
      0.2/10,

    ],
    speeds: [
      // 1.0, // playback speed (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
      // 1.2,
      // 0.8,
      1.0,
      1.0,
      0.6,
      0.5,
      1.3,
      1,
    ],
    enabledFlags: [
      // 1, // 1 = enabled, 0 = disabled
      // 1,
      // 0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
    backgroundMusic: {
      enabled: true, // set to true to enable background music
      // filePath: './moon_song.wav', // path to background music file relative to script location
      filePath: './viramiller_dream.mp3', // path to background music file relative to script location

      volume: 1, // volume level (0.0 to 1.0)
    },
  },

  heroPlaybackGate: {
    enabled: true,
    frameRate: 30,
    introPauseFrame: 125,
    postButtonPauseFrame: 273,
    growthStartFrame: 253,
    pauseGuardFrames: 2,
    startDelayAfterSplashDismissMs: 500,
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
      centerXRatio: 0.5, // 49.8% of rendered video width
      centerYRatio: 0.7497135, // 78.97135% of rendered video height
      diameterRatio: 0.092, // 6.2% of rendered video size (min(width,height))
      hitMarginPercentOfButtonSize: 200, // 0..100 extra size percentage
      enableBeforeIntroPauseFrames: 10, // enable interaction this many frames before introPauseFrame
      sound: {
        enabled: false, // set to true to enable sound effect
        // filePath: './open_win.wav', // path to sound file relative to script location
        filePath: './click_2.wav', // path to sound file relative to script location

        delayMs: 0, // delay in milliseconds before playing sound
        volume: 0.01/10, // volume level (0.0 to 1.0)
      },
    },
    wiggleButton: {
      enabled: true,
      centerXRatio: 0.5, // ratio of rendered video width
      centerYRatio: 0.70, // ratio of rendered video height
      sizeXRatio: 0.43, // ratio of rendered video size (min(width,height))
      sizeYRatio: 0.27, // ratio of rendered video size (min(width,height))
      enableBeforeIntroPauseFrames: 10, // enable interaction this many frames before introPauseFrame
    },
    wiggleButtonDebug: {
      enabled: false,
      drawOnFrontLayer: true,
      strokeStyle: 'rgba(95, 175, 255, 0.98)',
      fillStyle: 'rgba(95, 175, 255, 0.16)',
      lineWidthPx: 2,
    },
    openButtonDebug: {
      enabled: false,
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

  loadingScreen: {
    enabled: true,
    messageText: 'please wait, \n something special is loading',
    textSizePx: 17,
    edgePaddingPx: 30,
    messageMaxWidthPx: 300,
    dotsGapFromTextPx: 10, // distance between message text and loading dots row
    fontFamily: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif',
    fontWeight: 100,
    lineHeight: 1.2,
    textColor: '#000000',
    textDropShadowEnabled: false,
    colorModel: 'hslOffsets', // hslOffsets | explicit
    hslBaseHue: 222, // base (darkest) hue
    hslBaseSaturation: 0, // keep splash tint sampling neutral/white
    hslBaseLightness: 100, // keep splash tint sampling white
    // Per-stop H/S/L offsets from base, as [h, s, l]
    hslStopOffsets: {
      linearBottom: [0, 0, 0],
      linearMid: [0, 0, 10],
      linearTop: [0, 0, 0],
      radialEnd: [0, 0, 30],
      radialMid: [0, 0, 40],
      radialStart: [0, 0, 60],
    },
    debugFreezeVisible: false, // keep splash pinned on screen for tuning
    dotsLineHeight: 0.5, // line-height used by the loading dots row only
    // Legacy global interval + step fallback (used if hslStopOffsets entries are missing)
    // hslHueInterval: 0, // per-step hue delta
    // hslSaturationInterval: 0, // per-step saturation delta
    // hslLightnessInterval: 10, // per-step lightness delta
    // gradientStepLinearBottom: 0, // base + interval * step
    // gradientStepLinearMid: 1,
    // gradientStepLinearTop: 2,
    // gradientStepRadialEnd: 2,
    // gradientStepRadialMid: 4,
    // gradientStepRadialStart: 6,
    // gradientLinearBottomAlpha: 0.995,
    // gradientLinearMidAlpha: 0.985,
    // gradientLinearTopAlpha: 0.97,
    // gradientRadialEndAlpha: 0,
    // gradientRadialMidAlpha: 0.16,
    // gradientRadialStartAlpha: 0.36,


    //     hslHueInterval: 0, // per-step hue delta
    // hslSaturationInterval: 0, // per-step saturation delta
    // hslLightnessInterval: 10, // per-step lightness delta
    // gradientStepLinearBottom: 0, // base + interval * step
    // gradientStepLinearMid: 1,
    // gradientStepLinearTop: 2,
    // gradientStepRadialEnd: 2,
    // gradientStepRadialMid: 4,
    // gradientStepRadialStart: 6,
    // gradientLinearBottomAlpha: 1,
    // gradientLinearMidAlpha: 1,
    // gradientLinearTopAlpha: 0.5,
    // gradientRadialEndAlpha: 1,
    // gradientRadialMidAlpha: 1,
    // gradientRadialStartAlpha: 1,



          hslHueInterval: 0, // per-step hue delta
    hslSaturationInterval: 0, // per-step saturation delta
    hslLightnessInterval: 10, // per-step lightness delta
    gradientStepLinearBottom: 0, // base + interval * step
    gradientStepLinearMid: 1,
    gradientStepLinearTop: 2,
    gradientStepRadialEnd: 2,
    gradientStepRadialMid: 4,
    gradientStepRadialStart: 6,
    gradientLinearBottomAlpha: 0,
    gradientLinearMidAlpha: 0,
    gradientLinearTopAlpha: 0,
    gradientRadialEndAlpha: 0,
    gradientRadialMidAlpha: 0,
    gradientRadialStartAlpha: 0,

    // Legacy explicit colors (used only when colorModel === 'explicit')
    // gradientRadialStart: 'rgba(248, 251, 255, 0.36)',
    // gradientRadialMid: 'rgba(238, 243, 248, 0.16)',
    // gradientRadialEnd: 'rgba(255, 255, 255, 0)',
    // gradientLinearTop: 'rgba(28, 38, 52, 0.97)',
    // gradientLinearMid: 'rgba(18, 26, 38, 0.985)',
    // gradientLinearBottom: 'rgba(12, 18, 27, 0.995)',
    washEnabled: false,
    washDurationMs: 1200,
    fadeOutDurationMs: 200,
    washCenterColor: 'rgba(255, 255, 255, 0)',
    washMidColor: 'rgba(255, 255, 255, 0.84)',
    washMid2Color: 'rgba(255, 255, 255, 0.45)',
    washEdgeColor: 'rgba(255, 255, 255, 0.12)',
    washOuterColor: 'rgba(255, 255, 255, 0)',
    washScaleStart: 0.05, // starting bloom scale
    washScaleEnd: 10, // ending bloom scale (increase to fill the whole screen)
    washOpacityStart: 1,
    washOpacityPeak: 0,
    washOpacityEnd: 0,
    washCenterStopPercent: 0, // radial gradient stop locations for bloom
    washMidStopPercent: 25,
    washMid2StopPercent: 48,
    washEdgeStopPercent: 72,
    washOuterStopPercent: 100,
  },

  // wash1: {
  //   enabled: true,
  //   triggerFrame: 56, // fires when hero video playback frame crosses this value
  //   retriggerOnLoop: true,
  //   positionBasis: 'video', // video | viewport
  //   centerXRatio: 0.5,
  //   centerYRatio: 0.5,
  //   offsetXPx: 0,
  //   offsetYPx: 0,
  //   // Uses loadingScreen wash values as fallbacks, but you can override here:
  //   durationMs: 700,
  //   centerColor: 'rgba(255, 229, 61, 0.81)',
  //   midColor: 'rgba(255, 217, 0, 0.44)',
  //   edgeColor: 'rgba(136, 178, 215, 0.61)',
  //   scaleStart: 0.1,
  //   scaleEnd: 10,
  //   opacityStart: 0.3,
  //   opacityPeak: 1,
  //   opacityEnd: 0,
  //   centerStopPercent: 0,
  //   midStopPercent: 25,
  //   edgeStopPercent: 58,
  // },


    wash1: {
    enabled: false,
    triggerFrame: 56, // fires when hero video playback frame crosses this value
    retriggerOnLoop: true,
    positionBasis: 'video', // video | viewport
    centerXRatio: 0.5,
    centerYRatio: 0.67,
    offsetXPx: 0,
    offsetYPx: 0,
    // Uses loadingScreen wash values as fallbacks, but you can override here:
    durationMs: 700,
    centerColor: 'rgb(161, 214, 228)',
    midColor: 'rgba(242, 234, 182, 0.63)',
    mid2Color: 'rgba(255, 246, 209, 0.75)',
    edgeColor: 'rgba(136, 178, 215, 0)',
    outerColor: 'rgba(136, 178, 215, 0)',
    scaleStart: 0.1,
    scaleEnd: 5,
    opacityStart: 1,
    opacityPeak: 1,
    opacityEnd: 0,
    centerStopPercent: 12,
    midStopPercent: 24,
    mid2StopPercent: 34,
    edgeStopPercent: 74,
    outerStopPercent: 100,
  },

  wash2: {
    enabled: false,
    triggerFrame: 175, // fires when hero video playback frame crosses this value
    retriggerOnLoop: true,
    positionBasis: 'video', // video | viewport
    centerXRatio: 0.5,
    centerYRatio: 0.67,
    offsetXPx: 0,
    offsetYPx: 0,
    // Uses loadingScreen wash values as fallbacks, but you can override here:
    durationMs: 2000,
    centerColor: 'rgb(161, 214, 228)',
    midColor: 'rgba(242, 234, 182, 0.63)',
    mid2Color: 'rgba(255, 246, 209, 0.75)',
    edgeColor: 'rgba(136, 178, 215, 0)',
    outerColor: 'rgba(136, 178, 215, 0)',
    scaleStart: 0.1,
    scaleEnd: 5,
    opacityStart: 1,
    opacityPeak: 1,
    opacityEnd: 1,
    centerStopPercent: 12,
    midStopPercent: 24,
    mid2StopPercent: 34,
    edgeStopPercent: 74,
    outerStopPercent: 100,
  },


  centerOverlayImage: {
    enabled: true,
    spritePath: './page_1.6.webp', // fallback/default page path; section pageIndex controls active page when swipeSections is enabled
    scale: 0.38, // interpreted by scaleMode
    scaleMode: 'videoSizeRatio', // multiplier | videoSizeRatio
    offsetXPx: 0,
    offsetYPx: -0.0520833333, // interpreted by offsetYMode
    offsetYMode: 'videoSizeRatio', // px | videoSizeRatio
    displayAfterFrame: 255,
    maxOpacity: 1,
    fadeInEnabled: true,
    fadeInDurationSec: 0.45,
  },

  swipeSections: {
    enabled: true,
    sectionStyling: {
      globalEnabled: true,
    },

    section1Label: {
      enabled: true,
      sectionId: 'section-1',
      offsetXVideoHeightRatio: -0.01356,
      offsetYVideoHeightRatio: 0.2495,
      widthVideoHeightRatio: 0.55,
      fontFamily: 'ZeinaDidotScript',  
      fontSourcePath: './Didot_Bold.otf',
      fontWeight: 700,
      fontStyle: 'bold',
      fontSizeVideoHeightRatio: 0.01785,
      textColor: '#1f1b17',
      textAlign: 'center',
      lineHeight: 1.0,
    },

    // Ordered page list used by section.pageIndex (1-based).
    pages: [
      './page_1.6.webp',
      './page_2.1.webp',
      './page_3.2.webp',
      './page_4.webp',
    ],
    // Section count is derived from this array length.
    sections: [
      {
        id: 'section-1',
        frame: 273,
        pageIndex: 1, // 1-based index into swipeSections.pages
        // Optional per-section Y placement override for centerOverlayImage.
        // Ratio uses the same video-size basis as centerOverlayImage.offsetYMode='videoSizeRatio'.
        centerOverlayOffsetYVideoHeightRatio: -0.0520833333,
        sectionStyling: {
          background: {
            color: 'rgb(255, 255, 255)',
            media: {
              type: 'image',
              path: '',
              opacity: 0.14,
            },
          },
          upperLayers: [
            {
              color: 'rgba(82, 112, 148, 0)',
              opacity: 0,
              blendMode: 'soft-light',
              mask: {
                enabled: true,
                centerXRatio: 0.5,
                centerYRatio: 0.36,
                innerRadiusRatio: 0.18,
                outerRadiusRatio: 0.86,
                opacity: 1,
                centerColor: 'rgba(255, 255, 255, 0)',
                outerColor: 'rgba(255, 255, 255, 0)',
              },
            },
            {
              color: 'rgba(255, 255, 255, 0)',
              opacity: 0,
              blendMode: 'soft-light',
              mask: {
                enabled: false,
                centerColor: 'rgba(255, 255, 255, 1)',
                outerColor: 'rgba(255, 255, 255, 0)',
              },
            },
          ],
        },
      },
      {
        id: 'section-2',
        frame: 300,
        pageIndex: 2,
        // centerOverlayOffsetYVideoHeightRatio: -0.0520833333 + -0.095, // example of a per-section Y offset tweak
        centerOverlayOffsetYVideoHeightRatio: -0.0520833333, // example of a per-section Y offset tweak
        sectionStyling: {
          background: {
            color: 'rgba(156, 179, 195, 0.85)',
            media: {
              type: 'image',
              path: './section_2_bg.webp',
              opacity: 0.6,
            },
          },
          upperLayers: [
            {
              color: 'rgba(156, 179, 195)',
              opacity: 0.3,
              blendMode: 'soft-light',
              mask: {
                enabled: false,
                centerXRatio: 0.5,
                centerYRatio: 0.5,
                innerRadiusRatio: 0.2,
                outerRadiusRatio: 0.88,
                opacity: 1,
                centerColor: 'rgba(255, 255, 255, 1)',
                outerColor: 'rgba(255, 255, 255, 0)',
              },
            },
            {
              color: 'rgba(144, 177, 225)',
              opacity: 0.7,
              blendMode: 'soft-light',
              mask: {
                enabled: true,
                centerXRatio: 0.5,
                centerYRatio: 0.5,
                innerRadiusRatio: 0.2,
                outerRadiusRatio: 0.82,
                opacity: 1,
                centerColor: 'rgba(255, 255, 255, 0)',
                outerColor: 'rgb(255, 255, 255)',
              },
            },
          ],
        },

        button: {
          enabled: true,
          text: 'View Location',
          link: 'https://www.google.com/maps/dir//Sonesta+Hotel+Tower+%26+Casino+Cairo%D8%8C+Sonesta+Cairo+Hotel%D8%8C+3+El+Tayaran+St,+Ash+Sharekat,+Nasr+City,+Cairo+Governorate+4450113%E2%80%AD/@30.0789591,31.314985,17z/data=!4m20!1m10!3m9!1s0x14583e4709298029:0x12ce28bf24f83939!2sSonesta+Hotel+Tower+%26+Casino+Cairo!5m2!4m1!1i2!8m2!3d30.0789591!4d31.3175599!16s%2Fg%2F1tdjn3ms!4m8!1m0!1m5!1m1!1s0x14583e4709298029:0x12ce28bf24f83939!2m2!1d31.3175599!2d30.0789591!3e0!5m1!1e4?entry=ttu&g_ep=EgoyMDI2MDUwMi4wIKXMDSoASAFQAw%3D%3D',
          pngSrc: './loc_pin.webp',
          pngFit: 'contain',
          offsetXVideoHeightRatio: 0,
          offsetYVideoHeightRatio: 0.18,
          widthVideoHeightRatio: 0.08,
          heightVideoHeightRatio: 0.08,
          backgroundColor: 'rgba(255, 255, 255, 0)',
          textColor: '#1f1b17',
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: '18px',
          padding: '8px 16px',
          animation: {
            hoverScale: 1.08,
            transitionDurationMs: 180,
            transitionEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            wiggle: {
              enabled: true,
              delayAfterShowMs: 240,
              maxAngleDeg: 2.4,
              durationMs: 760,
              speedHz: 5.8,
              dampingStrength: 3.2,
            },
          },
          debug: {
            enabled: false,
            outlineStyle: '2px dashed rgba(255, 20, 20, 0.9)',
            outlineOffset: '3px',
          },
        },
      },
      {
        id: 'section-3',
        frame: 327,
        pageIndex: 3,
        centerOverlayOffsetYVideoHeightRatio: -0.0520833333,
        sectionStyling: {
          background: {
            color: 'rgb(223, 205, 193)',
            media: {
              type: 'image',
              path: './section_3_bg.webp',
              opacity: 0.35,
            },
          },
          upperLayers: [
            {
              color: 'rgb(181, 151, 135)',
              opacity: 0.82,
              blendMode: 'soft-light',
              mask: {
                enabled: true,
                centerXRatio: 0.5,
                centerYRatio: 0.5,
                innerRadiusRatio: 0.26,
                outerRadiusRatio: 0.76,
                opacity: 1,
                centerColor: 'rgba(255, 255, 255, 0)',
                outerColor: 'rgba(255, 255, 255, 1)',
              },
            },
            {
              color: 'rgb(200, 133, 95)',
              opacity: 0.42,
              blendMode: 'soft-light',
              mask: {
                enabled: false,
                centerColor: 'rgba(255, 255, 255, 1)',
                outerColor: 'rgba(255, 255, 255, 0)',
              },
            },
          ],
        },
      },
      {
        id: 'section-4',
        frame: 354,
        pageIndex: 4,
        centerOverlayOffsetYVideoHeightRatio: -0.0520833333,
        sectionStyling: {
          background: {
            color: 'rgba(30, 42, 76, 1)',
            media: {
              type: 'image', // keep as image for now; switch to video type later without schema change
              path: 'section_4_bg.webp',
              opacity: 0.8,
            },
          },
          upperLayers: [
            {
              color: 'rgba(41, 47, 65, 1)',
              opacity: 0.7,
              blendMode: 'soft-light',
              mask: {
                enabled: true,
                centerXRatio: 0.5,
                centerYRatio: 0.48,
                innerRadiusRatio: 0.2,
                outerRadiusRatio: 0.8,
                opacity: 1,
                centerColor: 'rgba(255, 255, 255, 0)',
                outerColor: 'rgba(255, 255, 255, 1)',
              },
            },
            {
              color: 'rgba(41, 47, 65, 1)',
              opacity: 0.5,
              blendMode: 'soft-light',
              mask: {
                enabled: false,
                centerXRatio: 0.5,
                centerYRatio: 0.72,
                innerRadiusRatio: 0.16,
                outerRadiusRatio: 0.56,
                opacity: 1,
                centerColor: 'rgba(255, 255, 255, 1)',
                outerColor: 'rgba(255, 255, 255, 0)',
              },
            },
          ],
        },
      },
    ],
    input: {
      wheelEnabled: true,
      touchEnabled: true,
      wheelDeltaThresholdPx: 95,
      wheelCooldownMs: 0, // optional legacy throttle after trigger (ms)
      wheelGestureQuietWindowMs: 80, // reset gesture latch after no wheel events for this long (ms)
      wheelGestureResetDeltaPx: 12, // minimum opposite-direction delta to reset latch early (px)
      wheelDirectionResetEnabled: true, // allows immediate opposite-direction wheel gesture reset
      touchSwipeThresholdPx: 42, // minimum touch distance before swipe triggers (px)
      touchMinFlickVelocityPxPerMs: 0.62, // OR-rule with distance threshold; useful for short fast flicks
      touchAxisLockRatio: 1.2,
      touchPreventDefault: true, // preventDefault only after swipe intent is locked
      touchCancelOnMultiTouch: true, // cancel swipe candidate when a second finger appears
      touchRequireOverlayWrapBandStart: true,
      touchFallbackToFullscreenWhenOverlayWrapDisabled: true,
    },
    transition: {
      timingMode: 'matchFrameDelta', // matchFrameDelta | fixedDuration | instant
      speedMultiplier: 1, // >1 is faster
      fixedDurationMs: 520, // used only by timingMode=fixedDuration
      minDurationMs: 220,
      maxDurationMs: 500,
      rapidSwipeMode: 'ignore', // canonical toggle: ignore | retarget
    },
    overlayTransition: {
      mode: 'fade', // fade | none
      fadeOutDurationMs: 170,
      fadeInDurationMs: 230,
      swapNearTargetProgress: 0.85, // 0..1; when the target image path swaps during section travel
    },
    outro: {
      enabled: false,
      delayMs: 5000, // delay after landing on the last section before triggering outro
      videoFadeDurationMs: 1000, // hero video opacity 1 -> 0 duration
      imageInvertDurationMs: 1000, // center image invert(0) -> invert(1) duration
    },
    scrollHint: {
      enabled: true,
      spritePath: './scroll_4_more.webp',
      widthVideoHeightRatio: 0.07,
      scale: 2,
      offsetXVideoHeightRatio: 0,
      offsetYVideoHeightRatio: 0.73,
      bottomMarginPx: 10,
      jumpDelayMs: 4200,
      jumpDistancePx: 5,
      jumpDurationMs: 150,
      visibleSectionIds: ['section-1', 'section-2', 'section-3'],
      debug: {
        enabled: false,
      },
    },
    rsvp: {
      enabled: true,
      sectionId: 'section-3',
      zIndex: 5000, // Above video (z-index: 1) but below upper canvas (z-index: 10000)
      initialState: {
        name: '',
        response: null, // yes | no | null
      },
      nameField: {
        offsetXVideoHeightRatio: 0,
        offsetYVideoHeightRatio: -0.1,
        widthVideoHeightRatio: 0.36,
        heightVideoHeightRatio: 0.088,
        fontFamily: 'ZeinaRsvpScript',
        fontSourcePath: './PinyonScript-Regular.ttf', // local path to font file, e.g. './fonts/ZeinaRsvpScript.woff2'
        fontWeight: 500,
        fontStyle: 'normal',
        fontSizeVideoHeightRatio: 0.042,
        textColor: '#1f1b17',
        textAlign: 'center',
        maxLength: 120,
        autoFitEnabled: true,
        autoFitMinFontSizeRatio: 0.62, // min rendered size = base font size * this ratio
        autoFitStepPx: 0.5, // shrink step used while text overflows field width
        autoFitHorizontalPaddingPx: 4, // reserved horizontal fit margin inside the field
      },
      debug: {
        enabled: false, // set true to render RSVP layout debug rectangles
        showNameFieldRect: true,
        showButtonRects: true,
        showConfirmButtonRect: true,
        strokeColor: 'rgba(255, 120, 120, 0.95)',
        lineWidthPx: 2,
      },
      validation: {
        showMissingIndicatorsAfterInvalidAttemptOnly: true,
        invalidConfirmShake: {
          enabled: true,
          delayMs: 0,
          maxOffsetVideoHeightRatio: 0.012,
          durationMs: 420,
          speedHz: 7.5,
          dampingStrength: 4.0,
          cooldownMs: 140,
        },
        missingIndicators: {
          text: '*',
          color: '#cf2d2d',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSizeVideoHeightRatio: 0.025,
          name: {
            offsetXVideoHeightRatio: 0.045,
            offsetYVideoHeightRatio: -0.1838,
          },
          response: {
            offsetXVideoHeightRatio: 0.095,
            offsetYVideoHeightRatio: -0.002,
          },
        },
      },
      confirmGlow: {
        enabled: true,
        offsetXVideoHeightRatio: 0,
        offsetYVideoHeightRatio: 0,
        widthVideoHeightRatio: 0.24,
        heightVideoHeightRatio: 0.24,
        core: {
          innerColor: 'rgba(255,255,255,0.72)',
          outerColor: 'rgba(255,255,255,0)',
        },
        rays: {
          enabled: true,
          color: 'rgb(255, 255, 255)',
          secondaryColor: 'rgba(255, 255, 255, 0)',
          repeatDeg: 45,
          rotationDurationMs: 14000,
          blurPx: 4.5,
          opacity: 0.9,
          radialMaskInnerStop: 0.33,
          radialMaskOuterStop: 0.62,
          radialMaskEdgeBlurRatio: 2,
        },
        pulse: {
          durationMs: 1500,
          easing: 'ease-in-out',
          minScale: 0.55,
          maxScale: 0.7,
          minOpacity: 0.35,
          maxOpacity: 0.62,
        },
        final: {
          scale: 0.67,
          opacity: 0.78,
          transitionDurationMs: 320,
          transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      },
      scrollHintOnSection3: {
        requireConfirmBeforeJump: true,
      },
      buttons: {
        spritePath: './yes&no.webp', // sprite-sheet path (2x2 default mapping: yes row0, no row1; unselected col0, selected col1)
        spriteCellWidth: 44,
        spriteCellHeight: 44,
        spriteScale: 8.3295454546,
        spriteCols: 2,
        spriteRows: 2,
        yes: {
          offsetXVideoHeightRatio: -0.075,
          offsetYVideoHeightRatio: 0.07,
          widthVideoHeightRatio: 0.11,
          heightVideoHeightRatio: 0.11,
        },
        no: {
          offsetXVideoHeightRatio: 0.075,
          offsetYVideoHeightRatio: 0.07,
          widthVideoHeightRatio: 0.11,
          heightVideoHeightRatio: 0.11,
        },
        confirm: {
          enabled: true,
          offsetXVideoHeightRatio: 0,
          offsetYVideoHeightRatio: 0.2,
          widthVideoHeightRatio: 0.14,
          heightVideoHeightRatio: 0.07,
          spritePath: 'confirm.webp', // optional dedicated confirm sprite-sheet path; empty = fallback to default button sprite
          spriteCellWidth: 733,
          spriteCellHeight: 366.5,
          spriteScale: 1,
          spriteCols: 1,
          spriteRows: 2,
          unselectedRow: 0,
          selectedRow: 1,
          col: 0,
          appsScript: {
            enabled: true,
            webAppUrl: 'https://script.google.com/macros/s/AKfycbyYesFFD1SUCSgvCtEzR9fAB3Qo-iFRBflAwGSdYIWhD4Py_1P5QW2L1EVq4OcCamcdUw/exec', // paste deployed Google Apps Script Web App URL
            mode: 'no-cors',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            payload: {}, // optional extra fields merged into { name, rsvp }
          },
          submitUrl: '',
          submitMethod: 'POST',
          submitHeaders: {
            'Content-Type': 'application/json',
          },
          submitPayload: {},
        },
        animation: {
          hoverScale: 1.06,
          selectedScale: 1.14, // post-click persistent enlargement
          transitionDurationMs: 180,
          transitionEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
      },
    },
  },

  foliageExportViewportHeight: 949,

  foliageCompositionScale: {
    enabled: true,
    mode: 'fixedReference949', // fixedReference949 | dynamicHeroVsInitialHero
    fixedReferenceHeightPx: 949,
    clamp: [0.25, 4],
  },

  floralResponsiveScale: {
    enabled: false,
    // [viewportWidthCssPx, scaleFactor]
    points: [
      [390, 0.62],
      [768, 0.78],
      [1024, 0.9],
      [1366, 1.0],
    ],
    globalMultiplier: 1.5, // global floral size multiplier (applies to full foliage: branches + leaves + flowers)
    pointerModifierEnabled: true,
    pointerCoarseMultiplier: 0.95, // touch-first devices
    pointerFineMultiplier: 1.0, // mouse/trackpad devices
    pointerNoneMultiplier: 1.0,
    pointerUnknownMultiplier: 1.0,
    dprModifierEnabled: false,
    dprBaseline: 2,
    dprStrength: 0.14, // mild; > baseline shrinks slightly, < baseline grows slightly
    dprMultiplierClamp: [0.92, 1.08],
    landscapeModifierEnabled: false,
    landscapeMultiplier: 1.1, // applied only when viewportWidth > viewportHeight
    finalScaleClamp: [0.25, 10],
  },

  overlayWrap: {
    enabled: true,
    animationOnly: false,
    centerHalfWidthPxFromVideoEnabled: true,
    centerHalfWidthPxVideoHeightRatio: 0.179, // 16.2760416667% of rendered hero video height
    centerHalfWidthPxVideoHeightRatioBottom: 0.2, // second width ratio used below the switch Y
    centerHalfWidthSwitchYVideoHeightRatio: 0.78, // switch Y as % of initially sampled video height (0..1 or 0..100)
    centerHalfWidthPx: 60, // fallback when video size is unavailable
    skipHiddenBackDrawEnabled: true,
    spriteHiddenCullInnerPaddingPx: 10,
    spriteHiddenCullRadiusScale: 0.5, // 0.05..1 scales the hidden-cull test circle radius
    debugHiddenSpriteCullCirclesEnabled: false,
    debugHiddenSpriteCullCirclesMode: 'culled', // culled | all
    debugHiddenSpriteCullCirclesMaxPerFrame: 400,
    debugHiddenSpriteCullCircleStrokeVisible: 'rgba(90, 220, 120, 0.55)',
    debugHiddenSpriteCullCircleStrokeCulled: 'rgba(255, 80, 80, 0.65)',
    debugHiddenSpriteCullCircleLineWidth: 1,
    showCenterBandOverlay: false,
    centerBandOverlayFill: 'rgba(255, 95, 95, 0.16)',
    centerBandOverlayStroke: 'rgba(255, 95, 95, 0.85)',
    centerBandOverlayLineWidth: 1.5,
  },

  motion: {
    swayMode: 'wind', // always | influence | wind
    maxSwayFps: 24, // <=0 disables cap for interaction-only render loop
    leafViewportCullingEnabled: true,
    leafSpriteViewportCullPaddingPx: -50, // +100 = render 100px outside viewport, -100 = cull 100px inside viewport (aggressive)
    flowerViewportCullingEnabled: true,
    flowerSpriteViewportCullingEnabled: true, // Enable per-petal viewport culling
    flowerSpriteViewportCullPaddingPx: 10, // +100 = cull 100px outside viewport (prevent pop-in), -50 = cull 50px inside viewport (aggressive)
    swayFastPathEnabled: true,
    swayPerfLogEnabled: false,

    wind: {
      enabled: true,
      sweepSpeedPxPerSec: 75,      // horizontal travel speed in canvas px/sec
      yAmplitudeRatio: 0.4,        // sin-wave Y amplitude as fraction of canvas height (0..1)
      yFrequencyHz: 0.02,           // Y oscillation cycles per second
      radiusFactor: 2.5,            // influence radius = flowers.drawSize * radiusFactor
      influencers: [
        { phaseShiftX: 0, phaseShiftY: 0 },           // first influencer
        // { phaseShiftX: 0.75, phaseShiftY: 0.25 },   // second influencer (uncomment to enable)
      ],
      debug: {
        enabled: false,
        drawOnFrontLayer: true,
        strokeStyle: 'rgba(80, 180, 255, 0.9)',
        fillStyle: 'rgba(80, 180, 255, 0.12)',
        lineWidthPx: 2,
      },
    },
  },

  renderDpr: {
    enabled: true,
    mobileOnly: false,
    mobileCap: 2,
    desktopCap: true, // ignored when mobileOnly=true; null disables desktop cap
  },

  safariTopTintShim: {
    enabled: true, // iOS Safari 26 top-bar tint shim experiment
    iosOnly: true,
    iosMinMajor: 26,
    rootBackgroundOnly: false, // false => allow shim on base relative166 mode too
    opacity: 0.01, // if Safari ignores this, set to 1 while keeping shim height tiny
  },

  topBarColorSync: {
    enabled: true,
    // Maps swipe section IDs -> top bar/body tint color.
    bySectionId: {
      'section-1': 'rgb(255, 255, 255)',
      'section-2': 'rgb(137, 184, 227)',
      'section-3': 'rgb(222, 192, 168)',
      'section-4': 'rgb(7, 10, 22)',
    },
    debug: {
      enabled: false, // or use URL param ?topTintDebug=1 (alias: ?tintDebug=1)
      throttleMs: 0,
    },
    // Optional override for meta[name="theme-color"] syncing. Null/omitted keeps iOS default behavior.
    // syncThemeColor: true,
  },

  flowers: {
    enabled: true,
    renderer: 'canvas', // pixi | canvas
    pixiEnabled: false,
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
      influenceDynamicCapRange: [25, 40], // [min, max] chosen by device budget
      influenceNoPointerFallBoostRange: [3.0, 4.0], // [min, max]
      mouseSpeedSwayAffectRange: [0.1, 0.2], // [min, max]
      interactionRadiusScaleRange: [0.82, 1.0], // [min, max] multiplier on swayInteractionRadiusFactor
      minSwayFallSpeed: 0.5,
    },
    assignmentMode: 'mixed', // single | mixed
    singleType: 'lily',
    mixRatios: {

      lily: 0.8,
      blue: 0.5,
    },
    endpointDirectionTailLengthPx: 26,
    endpointDirectionSampleCount: 5,
    drawSize: 75,
    swayInteractionRadiusFactor: 3.1,
    swayRiseSpeed: 5.5,
    swayFallSpeed: 0.6,
    swayEpsilon: 0.0008,
    mouseSpeedSwayAffect: 0.7,
    influenceDynamicCapEnabled: true,
    influenceDynamicCap: 40,
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
    jumpInteractionRadiusFactor: 0.8,
    jumpStrengthDeg: 20,
    jumpAttackSpeedDegPerSec: 60,
    jumpReturnSpeedDegPerSec: 55/2,
    jumpDistanceExponent: 1,
    jumpJitterDeg: 40,
    jumpEpsilonDeg: 0.5,
    jumpSparkle: {
      enabled: true,
      renderer: 'video', // canvas | video
      forceCanvasRendererOnIOS: false, // keep jump sparkle on canvas on iPhone/iPad unless explicitly disabled
      sourcePath: './sparkle_003.webm',
      playbackRate: 1,
      playbackAdvanceTimeoutMs: 360, // wait this long for confirmed frame advancement before showing sparkle
      startup: {
        readyWaitMs: 90, // cold-start media readiness wait budget
        sameSourceReadyWaitMs: 0, // same-source fast path budget (0 = don't block)
        seekWaitMs: 70, // seek settle wait after currentTime reset
        fastPathSameSourceEnabled: true,
        instantBudgetMs: 120, // threshold used by telemetry for "instant" startup
      },
      fps: 30,
      widthVideoHeightRatio: 0.27,
      offsetXVideoHeightRatio: 0,
      offsetYVideoHeightRatio: 0.05,
      layerMode: 'front', // matchFlowerLayer | front | back
      zIndexBack: 2,
      zIndexFront: 50002,
      inputDedupe: {
        enabled: false,
        windowMs: 400,
        radiusPx: 24,
        applyTo: 'sparkleOnly',
      },
      targetSelection: {
        mode: 'nearest', // nearest | weightedTopAware
        weightedTopAware: {
          distanceWeight: 0.3,
          upperLayerWeight: 0.8,
          drawOrderWeight: 0.8,
          proximityWindowVideoHeightRatio: 0.045,
        },
      },
    },
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
        growth: {
          enabled: true,
          tipLeadFraction: 0.4, // 0..1, show flower this far before branch tip reaches final endpoint
          sizeMinScale: 0.05, // 0..1 fraction of final lily draw size
          sizeDurationSec: 4, // time from minScale to full size
          sizeEase: 'easeInOut', // linear | easeIn | easeOut | easeInOut
          sizeEasePower: 4, // easing curve strength
          openAutoEnabled: true, // when false, lilies remain closed after growth
          openDelayMs:200, // delay after branch growth completes before lilies begin opening
          openSweepDirection: 'down', // down = top lilies open first, up = bottom lilies open first
          openSweepDurationSec: 0.8, // time for the lily-open wave to travel across flowers
          openPetalDurationSec: 0.4, // per-lily opening duration once wave reaches it
          openPetalEase: 'easeOut', // linear | easeIn | easeOut | easeInOut
          openPetalEasePower: 2, // easing curve strength for per-lily opening
        },
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
        hoverAmplitudeDegRange: [2, 15],
        hoverSpeedRange: [2.2, 4.2],
      },
      blue: {
        // NOTE: this fallback is shadowed at runtime by `spritePathPool[0]`.
        // Kept pointing at a real file so any future code path that reads
        // `spritePath` directly does not 404.
        spritePath: './blue_sprite_2.webp',
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
        baseSize: 59, // circle radius in px for point cloud generation
        density: 130, // fixed number of points per flower
        centerBiasExponent: 1, // larger = stronger center clustering
        pointDrawSize: 40,
        drawOrder: 'random', // outerFirst | random
        growth: {
          enabled: true,
          tipLeadFraction: 0.4, // 0..1, show flower this far before branch tip reaches final endpoint
          sizeMinScale: 0.09, // 0..1 fraction of final blue point sprite size
          sizeDurationSec: 3.5, // time for blue point sprite size growth
          sizeEase: 'easeIn', // linear | easeIn | easeOut | easeInOut
          sizeEasePower: 4, // easing curve strength for blue point sprite size growth
          sizeEaseInPower: 4.5, // used by easeIn/easeInOut entry-half; defaults to sizeEasePower
          sizeEaseOutPower: 4, // used by easeOut/easeInOut exit-half; defaults to sizeEasePower
          positionMinScale: 0.05, // 0..1 radial spread from center at spawn time
          positionDurationSec: 5, // time for blue radial spread growth
          positionEase: 'easeInOut', // linear | easeIn | easeOut | easeInOut
          positionEasePower: 4, // easing curve strength for blue radial spread growth
          positionEaseInPower: 3, // used by easeIn/easeInOut entry-half; defaults to positionEasePower
          positionEaseOutPower: 4, // used by easeOut/easeInOut exit-half; defaults to positionEasePower
        },
        hoverAmplitudeDegRange: [2, 27],
        hoverSpeedRange: [0.8, 3.2],
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
    swayEnabled: false,
    swayInteractionRadiusFactor: 2.1,
    swayRiseSpeed: 5.5,
    swayFallSpeed: 0.5,
    swayEpsilon: 0.0008,
    mouseSpeedSwayAffect: 0.7,
    swayAmplitudeDegRange: [-30.8, 35.6],
    swaySpeedRange: [1.9, 2.8],
    countRange: [1, 4],
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
    enabled: false,
    foliagePlaybackAudit: false,
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
  }

  global.STEM_WARP_USER_CONFIG = createStemWarpUserConfig({
    gradient: undefined,
    valScaling: 0,
    defaultCountPerSide: 22,
  });
})(typeof window !== 'undefined' ? window : globalThis);
