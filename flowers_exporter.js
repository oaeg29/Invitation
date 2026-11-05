(function attachFlowerExporterPage(globalScope) {
  'use strict';

  const BASE_EXPORT_SETTINGS = {
    fps: 30,
    loopFrames: 120,
    neutralFrameIndex: 0,
    supersample: 2,
    captureScale: 1,
    maxAtlasSize: 4096,
    paddingPx: 2,
    loopLockMode: 'continuousCycle',
    allowMultiPage: true,
    forceSinglePageByDownscaling: false,
  };

  const EXPORT_QUALITY_PROFILES = {
    standard: {
      label: 'Standard (faster)',
      settings: {
        supersample: 2,
        captureScale: 1,
        maxAtlasSize: 4096,
        paddingPx: 2,
      },
    },
    high: {
      label: 'High Quality',
      settings: {
        supersample: 2,
        captureScale: 2,
        maxAtlasSize: 4096,
        paddingPx: 2,
      },
    },
    ultra: {
      label: 'Ultra (slowest)',
      settings: {
        supersample: 3,
        captureScale: 3,
        maxAtlasSize: 4096,
        paddingPx: 2,
      },
    },
    extreme: {
      label: 'Extreme (very slow)',
      settings: {
        supersample: 4,
        captureScale: 3,
        maxAtlasSize: 4096,
        paddingPx: 2,
      },
    },
  };

  const DEFAULT_CONFIG_TEMPLATE = {
    flowers: {
      drawSize: 80,
      swayInteractionRadiusFactor: 3.1,
      swayRiseSpeed: 5.5,
      swayFallSpeed: 0.5,
      swayEpsilon: 0.0008,
      mouseSpeedSwayAffect: 0.7,
      swayMode: 'always',
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
      types: {
        lily: {
          method: 'sweep3',
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
          displacementSpace: 'flower',
          stamenRowMode: 'fixedRow',
          stamenFixedRow: 1,
          stamenCount: 2,
          stamenAdditionalMode: 'rowList',
          stamenRowList: [2, 3, 4, 5, 6, 7, 8],
          closedUseMiddlePetalSprite: true,
          closedSpritePath: './closed_lily.webp',
          closedSpriteCols: 8,
          closedSpriteRows: 1,
          closedSpriteScale: 4.1590909091,
          growth: {
            enabled: true,
            tipLeadFraction: 0.1,
            sizeMinScale: 0.05,
            sizeDurationSec: 1,
            sizeEase: 'easeOut',
            sizeEasePower: 2,
            openAutoEnabled: true,
            openDelayMs: 350,
            openSweepDirection: 'down',
            openSweepDurationSec: 0.8,
            openPetalDurationSec: 0.4,
            openPetalEase: 'easeOut',
            openPetalEasePower: 2,
          },
          pairRotationDegByRowPair: {
            1: { 1: 20, 2: 13, 3: 30 },
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
            './blue_sprite_2.webp',
            './blue_sprite_1.webp',
            './blue_sprite_3.webp',
            './blue_sprite.webp',
          ],
          spriteCellWidth: 44,
          spriteCellHeight: 44,
          spriteScale: 8.3333333,
          spriteCols: 10,
          spriteRows: 10,
          baseSize: 60,
          density: 130,
          centerBiasExponent: 1,
          pointDrawSize: 40,
          drawOrder: 'random',
          growth: {
            enabled: true,
            tipLeadFraction: 0.1,
            sizeMinScale: 0.05,
            sizeDurationSec: 1,
            sizeEase: 'easeOut',
            sizeEasePower: 2,
            positionMinScale: 0.05,
            positionDurationSec: 1,
            positionEase: 'easeOut',
            positionEasePower: 2,
          },
          hoverAmplitudeDegRange: [2, 6],
          hoverSpeedRange: [2.2, 4.2],
        },
      },
    },
  };

  function tryParseJsObjectLiteral(rawText) {
    if (typeof rawText !== 'string') {
      throw new Error('Config input must be a string.');
    }
    let expression = rawText.trim();
    if (expression.length === 0) {
      throw new Error('Config textarea is empty.');
    }
    expression = expression.replace(/^\uFEFF/, '').trim();
    expression = expression.replace(/^\s*(const|let|var)\s+[a-zA-Z_$][\w$]*\s*=\s*/m, '');
    expression = expression.replace(/^\s*[a-zA-Z_$][\w$]*\s*=\s*/m, '');
    expression = expression.replace(/;\s*$/, '').trim();
    return Function('"use strict"; return (' + expression + ');')();
  }

  function resolveExportSettings(profileKey) {
    const key = (
      typeof profileKey === 'string'
      && Object.prototype.hasOwnProperty.call(EXPORT_QUALITY_PROFILES, profileKey)
    )
      ? profileKey
      : 'high';
    const profile = EXPORT_QUALITY_PROFILES[key];
    return {
      profileKey: key,
      profileLabel: profile.label,
      settings: {
        ...BASE_EXPORT_SETTINGS,
        ...(profile && profile.settings ? profile.settings : {}),
      },
    };
  }

  function isEditableTarget(target) {
    if (!target || typeof target !== 'object') {
      return false;
    }
    const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }
    return target.isContentEditable === true;
  }

  function triggerDownload(fileName, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 1200);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nowTimestamp() {
    const d = new Date();
    return d.toLocaleTimeString();
  }

  function bootstrapExporterPage() {
    const configInput = document.getElementById('configInput');
    const exportBtn = document.getElementById('exportBtn');
    const qualityProfileSelect = document.getElementById('qualityProfileSelect');
    const loopModeSelect = document.getElementById('loopModeSelect');
    const loopFramesSelect = document.getElementById('loopFramesSelect');
    const frameSplitSelect = document.getElementById('frameSplitSelect');
    const allowMultiPageToggle = document.getElementById('allowMultiPageToggle');
    const forceSinglePageDownscaleToggle = document.getElementById('forceSinglePageDownscaleToggle');
    const variantSelect = document.getElementById('variantSelect');
    const refreshVariantsBtn = document.getElementById('refreshVariantsBtn');
    const qualityProfileHint = document.getElementById('qualityProfileHint');
    const packingWarning = document.getElementById('packingWarning');
    const previewCanvas = document.getElementById('previewCanvas');
    const statusText = document.getElementById('statusText');
    const logOutput = document.getElementById('logOutput');
    const ctrlSwayRiseSpeed = document.getElementById('ctrlSwayRiseSpeed');
    const ctrlSwayFallSpeed = document.getElementById('ctrlSwayFallSpeed');
    const ctrlSwayEpsilon = document.getElementById('ctrlSwayEpsilon');
    const ctrlMouseSpeedSwayAffect = document.getElementById('ctrlMouseSpeedSwayAffect');
    const ctrlLilyAmpMin = document.getElementById('ctrlLilyAmpMin');
    const ctrlLilyAmpMax = document.getElementById('ctrlLilyAmpMax');
    const ctrlLilySpeedMin = document.getElementById('ctrlLilySpeedMin');
    const ctrlLilySpeedMax = document.getElementById('ctrlLilySpeedMax');
    const ctrlBlueAmpMin = document.getElementById('ctrlBlueAmpMin');
    const ctrlBlueAmpMax = document.getElementById('ctrlBlueAmpMax');
    const ctrlBlueSpeedMin = document.getElementById('ctrlBlueSpeedMin');
    const ctrlBlueSpeedMax = document.getElementById('ctrlBlueSpeedMax');

    if (
      !configInput
      || !exportBtn
      || !qualityProfileSelect
      || !loopModeSelect
      || !loopFramesSelect
      || !frameSplitSelect
      || !allowMultiPageToggle
      || !forceSinglePageDownscaleToggle
      || !variantSelect
      || !refreshVariantsBtn
      || !qualityProfileHint
      || !packingWarning
      || !previewCanvas
      || !statusText
      || !logOutput
      || !ctrlSwayRiseSpeed
      || !ctrlSwayFallSpeed
      || !ctrlSwayEpsilon
      || !ctrlMouseSpeedSwayAffect
      || !ctrlLilyAmpMin
      || !ctrlLilyAmpMax
      || !ctrlLilySpeedMin
      || !ctrlLilySpeedMax
      || !ctrlBlueAmpMin
      || !ctrlBlueAmpMax
      || !ctrlBlueSpeedMin
      || !ctrlBlueSpeedMax
    ) {
      return;
    }

    const flowerSystemApi = globalScope.StemWarpFlowerSystem11;
    if (!flowerSystemApi || typeof flowerSystemApi.createFlowerAtlasExporter !== 'function') {
      statusText.textContent = 'Flower exporter API missing. Ensure script_11_flowers.js loaded correctly.';
      return;
    }

    const exporter = flowerSystemApi.createFlowerAtlasExporter();
    let busy = false;
    let previewRafId = 0;
    let previewLastMs = 0;
    let previewAccumulatorMs = 0;
    let previewFrameIndex = 0;
    let pendingRebuildTimer = 0;
    const controlInputElements = [
      ctrlSwayRiseSpeed,
      ctrlSwayFallSpeed,
      ctrlSwayEpsilon,
      ctrlMouseSpeedSwayAffect,
      ctrlLilyAmpMin,
      ctrlLilyAmpMax,
      ctrlLilySpeedMin,
      ctrlLilySpeedMax,
      ctrlBlueAmpMin,
      ctrlBlueAmpMax,
      ctrlBlueSpeedMin,
      ctrlBlueSpeedMax,
    ];

    function appendLog(message) {
      const line = `[${nowTimestamp()}] ${message}`;
      logOutput.textContent += `${line}\n`;
      logOutput.scrollTop = logOutput.scrollHeight;
    }

    function setStatus(message) {
      statusText.textContent = message;
    }

    function clearPreview() {
      const ctx = previewCanvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }

    function stopPreviewLoop() {
      if (previewRafId) {
        cancelAnimationFrame(previewRafId);
        previewRafId = 0;
      }
      previewLastMs = 0;
      previewAccumulatorMs = 0;
    }

    function getFlowerRoot(rawConfig) {
      if (rawConfig && typeof rawConfig === 'object' && rawConfig.flowers && typeof rawConfig.flowers === 'object') {
        return rawConfig.flowers;
      }
      return rawConfig;
    }

    function toFiniteNumber(value, fallback = 0) {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }

    function getRangePair(rawRange, fallbackMin = 0, fallbackMax = 0) {
      if (Array.isArray(rawRange) && rawRange.length >= 2) {
        const min = toFiniteNumber(rawRange[0], fallbackMin);
        const max = toFiniteNumber(rawRange[1], fallbackMax);
        return [min, max];
      }
      return [fallbackMin, fallbackMax];
    }

    function parseCurrentConfigOrThrow() {
      return parseConfigText(configInput.value);
    }

    function writeConfig(rawConfig) {
      configInput.value = JSON.stringify(rawConfig, null, 2);
    }

    function syncSwayControlsFromConfig(rawConfig) {
      const flowers = getFlowerRoot(rawConfig) || {};
      const types = flowers.types && typeof flowers.types === 'object' ? flowers.types : {};
      const lily = types.lily && typeof types.lily === 'object' ? types.lily : {};
      const blue = types.blue && typeof types.blue === 'object' ? types.blue : {};
      const lilyAmp = getRangePair(lily.hoverAmplitudeDegRange, 2, 12);
      const lilySpeed = getRangePair(lily.hoverSpeedRange, 2.2, 4.2);
      const blueAmp = getRangePair(blue.hoverAmplitudeDegRange, 2, 6);
      const blueSpeed = getRangePair(blue.hoverSpeedRange, 2.2, 4.2);

      ctrlSwayRiseSpeed.value = String(toFiniteNumber(flowers.swayRiseSpeed, 5.5));
      ctrlSwayFallSpeed.value = String(toFiniteNumber(flowers.swayFallSpeed, 0.5));
      ctrlSwayEpsilon.value = String(toFiniteNumber(flowers.swayEpsilon, 0.0008));
      ctrlMouseSpeedSwayAffect.value = String(toFiniteNumber(flowers.mouseSpeedSwayAffect, 0.7));
      ctrlLilyAmpMin.value = String(lilyAmp[0]);
      ctrlLilyAmpMax.value = String(lilyAmp[1]);
      ctrlLilySpeedMin.value = String(lilySpeed[0]);
      ctrlLilySpeedMax.value = String(lilySpeed[1]);
      ctrlBlueAmpMin.value = String(blueAmp[0]);
      ctrlBlueAmpMax.value = String(blueAmp[1]);
      ctrlBlueSpeedMin.value = String(blueSpeed[0]);
      ctrlBlueSpeedMax.value = String(blueSpeed[1]);
    }

    function applySwayControlsToConfig(rawConfig) {
      const flowers = getFlowerRoot(rawConfig);
      if (!flowers || typeof flowers !== 'object') {
        return rawConfig;
      }
      if (!flowers.types || typeof flowers.types !== 'object') {
        flowers.types = {};
      }
      if (!flowers.types.lily || typeof flowers.types.lily !== 'object') {
        flowers.types.lily = {};
      }
      if (!flowers.types.blue || typeof flowers.types.blue !== 'object') {
        flowers.types.blue = {};
      }

      flowers.swayRiseSpeed = toFiniteNumber(ctrlSwayRiseSpeed.value, 5.5);
      flowers.swayFallSpeed = toFiniteNumber(ctrlSwayFallSpeed.value, 0.5);
      flowers.swayEpsilon = toFiniteNumber(ctrlSwayEpsilon.value, 0.0008);
      flowers.mouseSpeedSwayAffect = toFiniteNumber(ctrlMouseSpeedSwayAffect.value, 0.7);
      flowers.types.lily.hoverAmplitudeDegRange = [
        toFiniteNumber(ctrlLilyAmpMin.value, 2),
        toFiniteNumber(ctrlLilyAmpMax.value, 12),
      ];
      flowers.types.lily.hoverSpeedRange = [
        toFiniteNumber(ctrlLilySpeedMin.value, 2.2),
        toFiniteNumber(ctrlLilySpeedMax.value, 4.2),
      ];
      flowers.types.blue.hoverAmplitudeDegRange = [
        toFiniteNumber(ctrlBlueAmpMin.value, 2),
        toFiniteNumber(ctrlBlueAmpMax.value, 6),
      ];
      flowers.types.blue.hoverSpeedRange = [
        toFiniteNumber(ctrlBlueSpeedMin.value, 2.2),
        toFiniteNumber(ctrlBlueSpeedMax.value, 4.2),
      ];
      return rawConfig;
    }

    function getTotalFramesForSettings(settings) {
      const neutral = Math.max(0, Math.floor(toFiniteNumber(settings.neutralFrameIndex, 0)));
      const loopFrames = Math.max(1, Math.floor(toFiniteNumber(settings.loopFrames, 60)));
      return neutral + loopFrames + 1;
    }

    function getSelectedLoopMode() {
      const value = typeof loopModeSelect.value === 'string' ? loopModeSelect.value : '';
      if (value === 'continuousCycle' || value === 'singleCycle' || value === 'none') {
        return value;
      }
      return 'continuousCycle';
    }

    function getSelectedLoopFrames() {
      const rawValue = Number(loopFramesSelect.value);
      if (rawValue === 60 || rawValue === 120) {
        return rawValue;
      }
      return 120;
    }

    function getSelectedAnimatedFramesPerSheet() {
      const rawValue = Number(frameSplitSelect.value);
      if (rawValue === 60 || rawValue === 120) {
        return rawValue;
      }
      return 0;
    }

    function getSelectedExportSettings() {
      const selected = resolveExportSettings(qualityProfileSelect.value);
      return {
        ...selected,
        settings: {
          ...selected.settings,
          loopFrames: getSelectedLoopFrames(),
          animatedFramesPerSheet: getSelectedAnimatedFramesPerSheet(),
          loopLockMode: getSelectedLoopMode(),
          allowMultiPage: allowMultiPageToggle.checked !== false,
          forceSinglePageByDownscaling: forceSinglePageDownscaleToggle.checked === true,
        },
      };
    }

    function getPreviewAnimatedRange(settings) {
      const totalFrames = getTotalFramesForSettings(settings);
      const neutral = Math.max(0, Math.floor(toFiniteNumber(settings.neutralFrameIndex, 0)));
      const startIndex = Math.min(Math.max(0, neutral + 1), Math.max(0, totalFrames - 1));
      const count = Math.max(1, totalFrames - startIndex);
      return { startIndex, count, totalFrames };
    }

    function drawPreviewFrame(frameIndex) {
      const variantKey = variantSelect.value;
      if (!variantKey) {
        clearPreview();
        return;
      }
      exporter.renderVariantFrame(variantKey, frameIndex, previewCanvas);
    }

    function schedulePreviewTick() {
      previewRafId = requestAnimationFrame(stepPreviewLoop);
    }

    function stepPreviewLoop(nowMs) {
      const variantKey = variantSelect.value;
      if (!variantKey) {
        stopPreviewLoop();
        clearPreview();
        return;
      }
      const selected = getSelectedExportSettings();
      const settings = selected.settings;
      const fps = Math.max(1, toFiniteNumber(settings.fps, 30));
      const frameDurationMs = 1000 / fps;
      const previewRange = getPreviewAnimatedRange(settings);
      const previewStart = previewRange.startIndex;
      const previewEndExclusive = previewStart + previewRange.count;
      if (!Number.isFinite(previewLastMs) || previewLastMs <= 0) {
        previewLastMs = nowMs;
      }
      const deltaMs = Math.max(0, nowMs - previewLastMs);
      previewLastMs = nowMs;
      previewAccumulatorMs += deltaMs;
      if (previewFrameIndex < previewStart || previewFrameIndex >= previewEndExclusive) {
        previewFrameIndex = previewStart;
      }
      while (previewAccumulatorMs >= frameDurationMs) {
        previewAccumulatorMs -= frameDurationMs;
        previewFrameIndex += 1;
        if (previewFrameIndex >= previewEndExclusive) {
          previewFrameIndex = previewStart;
        }
      }
      drawPreviewFrame(previewFrameIndex);
      schedulePreviewTick();
    }

    function startPreviewLoop(resetFrame = true) {
      stopPreviewLoop();
      if (resetFrame) {
        const selected = getSelectedExportSettings();
        const previewRange = getPreviewAnimatedRange(selected.settings);
        previewFrameIndex = previewRange.startIndex;
      }
      drawPreviewFrame(previewFrameIndex);
      schedulePreviewTick();
    }

    function populateVariantDropdown(variants, preferredKey = '') {
      const safeVariants = Array.isArray(variants) ? variants : [];
      const currentPreferred = typeof preferredKey === 'string' ? preferredKey : '';
      variantSelect.innerHTML = '';
      for (let i = 0; i < safeVariants.length; i += 1) {
        const variant = safeVariants[i];
        const option = document.createElement('option');
        option.value = variant.key;
        option.textContent = `${variant.key} [${variant.type}]`;
        variantSelect.appendChild(option);
      }
      if (safeVariants.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '(no variants)';
        variantSelect.appendChild(option);
        variantSelect.value = '';
        return '';
      }
      const hasPreferred = safeVariants.some((variant) => variant.key === currentPreferred);
      variantSelect.value = hasPreferred ? currentPreferred : safeVariants[0].key;
      return variantSelect.value;
    }

    async function refreshExporterState(options = {}) {
      const reason = typeof options.reason === 'string' ? options.reason : 'refresh';
      const keepSelection = options.keepSelection !== false;
      const showProgress = options.showProgress === true;
      const previousSelection = keepSelection ? variantSelect.value : '';
      const selectedProfile = getSelectedExportSettings();
      const exportSettings = selectedProfile.settings;
      const rawConfig = parseCurrentConfigOrThrow();
      const prepared = await exporter.prepare(rawConfig, exportSettings, showProgress ? {
        onProgress(payload) {
          if (!payload || typeof payload !== 'object') {
            return;
          }
          const phase = payload.phase || 'progress';
          const message = payload.message || '';
          const completed = Number.isFinite(payload.completed) ? payload.completed : 0;
          const total = Number.isFinite(payload.total) ? payload.total : 0;
          if (total > 0) {
            setStatus(`${phase}: ${message} (${completed}/${total})`);
          } else {
            setStatus(`${phase}: ${message}`);
          }
        },
      } : null);
      const variants = exporter.listVariants();
      const selectedVariant = populateVariantDropdown(variants, previousSelection);
      if (selectedVariant) {
        startPreviewLoop(reason !== 'profile-change');
      } else {
        clearPreview();
      }
      setStatus(`Ready. ${variants.length} variant(s) prepared.`);
      appendLog(
        `${reason}: prepared ${prepared.variantCount} variant(s), selected ${selectedVariant || '(none)'}.`,
      );
      return {
        selectedVariant,
        variants,
        settings: exportSettings,
        rawConfig,
      };
    }

    function scheduleRebuildFromControls() {
      if (pendingRebuildTimer) {
        clearTimeout(pendingRebuildTimer);
        pendingRebuildTimer = 0;
      }
      pendingRebuildTimer = setTimeout(async () => {
        pendingRebuildTimer = 0;
        if (busy) {
          return;
        }
        try {
          let rawConfig = parseCurrentConfigOrThrow();
          rawConfig = applySwayControlsToConfig(rawConfig);
          writeConfig(rawConfig);
          await refreshExporterState({ reason: 'sway-controls', keepSelection: true, showProgress: false });
        } catch (error) {
          const message = error && error.message ? error.message : String(error);
          setStatus('Failed applying sway controls.');
          appendLog(`ERROR: ${message}`);
        }
      }, 180);
    }

    function updateQualityHint() {
      const selected = getSelectedExportSettings();
      const settings = selected.settings;
      qualityProfileHint.textContent = `fps=${settings.fps}, loopFrames=${settings.loopFrames}, split=${settings.animatedFramesPerSheet > 0 ? settings.animatedFramesPerSheet : 'auto'}, supersample=${settings.supersample}, captureScale=${settings.captureScale}, atlas=${settings.maxAtlasSize}px, loopLock=${settings.loopLockMode}, multiPage=${settings.allowMultiPage ? 'on' : 'off'}, forceSingle=${settings.forceSinglePageByDownscaling ? 'on' : 'off'}`;
    }

    function setPackingWarning(text) {
      packingWarning.textContent = typeof text === 'string' ? text : '';
    }

    function updatePackingWarningFromManifest(manifest, variantKey, exportSettings) {
      setPackingWarning('');
      const variants = manifest && manifest.variants && typeof manifest.variants === 'object'
        ? manifest.variants
        : null;
      const variant = variants ? variants[variantKey] : null;
      const pages = variant && Array.isArray(variant.pages) ? variant.pages : [];
      if (pages.length > 1) {
        setPackingWarning(
          `Warning: ${variantKey} overflowed to ${pages.length} atlas pages at ${exportSettings.maxAtlasSize}px.`,
        );
        return;
      }
      const packScaleX = Number(variant && variant.packScale && variant.packScale.x);
      const packScaleY = Number(variant && variant.packScale && variant.packScale.y);
      if (Number.isFinite(packScaleX) && Number.isFinite(packScaleY) && (packScaleX < 0.9999 || packScaleY < 0.9999)) {
        setPackingWarning(
          `Info: ${variantKey} was downscaled to fit one page (scale ${packScaleX.toFixed(3)} x ${packScaleY.toFixed(3)}).`,
        );
      }
    }

    function parseConfigText(rawText) {
      const trimmed = typeof rawText === 'string' ? rawText.trim() : '';
      if (trimmed.length === 0) {
        throw new Error('Config textarea is empty. Paste JSON config first.');
      }
      try {
        return JSON.parse(trimmed);
      } catch (_jsonError) {
        return tryParseJsObjectLiteral(trimmed);
      }
    }

    async function runExport() {
      if (busy) {
        return;
      }
      busy = true;
      exportBtn.disabled = true;
      setStatus('Preparing export...');
      appendLog('Starting export.');

      try {
        const selectedProfile = getSelectedExportSettings();
        const exportSettings = selectedProfile.settings;
        const selectedVariantKey = typeof variantSelect.value === 'string' ? variantSelect.value : '';
        if (!selectedVariantKey) {
          throw new Error('No variant selected. Click "Refresh Variants" first.');
        }
        appendLog(`Profile: ${selectedProfile.profileLabel}`);
        appendLog(`Variant: ${selectedVariantKey}`);
        appendLog(
          `Settings: fps=${exportSettings.fps}, frames=${exportSettings.loopFrames + 1}, supersample=${exportSettings.supersample}, captureScale=${exportSettings.captureScale}, atlas=${exportSettings.maxAtlasSize}, loopLock=${exportSettings.loopLockMode}, split=${exportSettings.animatedFramesPerSheet > 0 ? exportSettings.animatedFramesPerSheet : 'auto'}, multiPage=${exportSettings.allowMultiPage ? 'on' : 'off'}, forceSingle=${exportSettings.forceSinglePageByDownscaling ? 'on' : 'off'}`,
        );
        setPackingWarning('');

        let rawConfig = parseConfigText(configInput.value);
        rawConfig = applySwayControlsToConfig(rawConfig);
        writeConfig(rawConfig);
        const result = await exporter.bakeVariantAtlas(rawConfig, exportSettings, selectedVariantKey, {
          onProgress(payload) {
            if (!payload || typeof payload !== 'object') {
              return;
            }
            const phase = payload.phase || 'progress';
            const message = payload.message || '';
            const completed = Number.isFinite(payload.completed) ? payload.completed : 0;
            const total = Number.isFinite(payload.total) ? payload.total : 0;
            if (total > 0) {
              setStatus(`${phase}: ${message} (${completed}/${total})`);
            } else {
              setStatus(`${phase}: ${message}`);
            }
            if (phase === 'warn' && message) {
              appendLog(`WARN: ${message}`);
              setPackingWarning(message);
            }
          },
        });

        if (!result || !Array.isArray(result.files) || !result.manifest) {
          throw new Error('Exporter returned an invalid payload.');
        }

        appendLog(`Generated ${result.files.length} file(s). Triggering downloads...`);
        for (let i = 0; i < result.files.length; i += 1) {
          const file = result.files[i];
          if (!file || !file.fileName || !file.blob) {
            continue;
          }
          triggerDownload(file.fileName, file.blob);
          appendLog(`Downloaded ${file.fileName}`);
          await delay(40);
        }

        const variantKeys = Object.keys(result.manifest.variants || {});
        if (variantKeys.length > 0) {
          previewFrameIndex = 0;
          drawPreviewFrame(previewFrameIndex);
          appendLog(
            `Preview updated using ${variantKeys[0]} frame ${exportSettings.neutralFrameIndex}.`,
          );
        }
        updatePackingWarningFromManifest(result.manifest, selectedVariantKey, exportSettings);

        setStatus('Export complete for selected variant.');
        appendLog('Export complete for selected variant. Move files to /exports/flowers/.');
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Export failed. Check log for details.');
        appendLog(`ERROR: ${message}`);
        console.error('[FlowerExporter]', error);
      } finally {
        busy = false;
        exportBtn.disabled = false;
      }
    }

    configInput.value = JSON.stringify(DEFAULT_CONFIG_TEMPLATE, null, 2);
    qualityProfileSelect.value = 'high';
    loopModeSelect.value = 'continuousCycle';
    loopFramesSelect.value = '120';
    frameSplitSelect.value = '0';
    allowMultiPageToggle.checked = true;
    forceSinglePageDownscaleToggle.checked = false;
    updateQualityHint();
    setPackingWarning('');
    clearPreview();
    setStatus('Ready. Press Shift+E or click Export Selected Variant.');
    appendLog('Ready.');
    try {
      const initialConfig = parseCurrentConfigOrThrow();
      syncSwayControlsFromConfig(initialConfig);
    } catch (_error) {
      // Ignore initial parse errors for startup defaults.
    }

    refreshExporterState({ reason: 'initial', keepSelection: true, showProgress: false })
      .catch((error) => {
        const message = error && error.message ? error.message : String(error);
        setStatus('Failed to prepare variants.');
        appendLog(`ERROR: ${message}`);
      });

    exportBtn.addEventListener('click', () => {
      runExport();
    });

    refreshVariantsBtn.addEventListener('click', async () => {
      if (busy) {
        return;
      }
      try {
        let rawConfig = parseCurrentConfigOrThrow();
        rawConfig = applySwayControlsToConfig(rawConfig);
        writeConfig(rawConfig);
        syncSwayControlsFromConfig(rawConfig);
        await refreshExporterState({ reason: 'manual-refresh', keepSelection: true, showProgress: true });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Refresh failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    qualityProfileSelect.addEventListener('change', async () => {
      updateQualityHint();
      if (busy) {
        return;
      }
      try {
        await refreshExporterState({ reason: 'profile-change', keepSelection: true, showProgress: false });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Profile change failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    loopModeSelect.addEventListener('change', async () => {
      updateQualityHint();
      if (busy) {
        return;
      }
      try {
        await refreshExporterState({ reason: 'loop-mode-change', keepSelection: true, showProgress: false });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Loop mode change failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    loopFramesSelect.addEventListener('change', async () => {
      updateQualityHint();
      if (busy) {
        return;
      }
      try {
        await refreshExporterState({ reason: 'loop-frames-change', keepSelection: true, showProgress: false });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Loop frames change failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    frameSplitSelect.addEventListener('change', async () => {
      updateQualityHint();
      setPackingWarning('');
      if (busy) {
        return;
      }
      try {
        await refreshExporterState({ reason: 'frame-split-change', keepSelection: true, showProgress: false });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Frame split change failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    allowMultiPageToggle.addEventListener('change', async () => {
      updateQualityHint();
      setPackingWarning('');
      if (busy) {
        return;
      }
      try {
        await refreshExporterState({ reason: 'allow-multipage-change', keepSelection: true, showProgress: false });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Multi-page toggle change failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    forceSinglePageDownscaleToggle.addEventListener('change', async () => {
      updateQualityHint();
      setPackingWarning('');
      if (busy) {
        return;
      }
      try {
        await refreshExporterState({ reason: 'force-single-page-downscale-change', keepSelection: true, showProgress: false });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        setStatus('Single-page downscale toggle change failed.');
        appendLog(`ERROR: ${message}`);
      }
    });

    variantSelect.addEventListener('change', () => {
      startPreviewLoop(true);
    });

    configInput.addEventListener('change', () => {
      try {
        const rawConfig = parseCurrentConfigOrThrow();
        syncSwayControlsFromConfig(rawConfig);
      } catch (_error) {
        // Keep current control values until config is valid.
      }
    });

    for (let i = 0; i < controlInputElements.length; i += 1) {
      const input = controlInputElements[i];
      input.addEventListener('input', scheduleRebuildFromControls);
    }

    document.addEventListener('keydown', (event) => {
      if (!event || event.defaultPrevented) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      if (event.shiftKey !== true || key !== 'e') {
        return;
      }
      event.preventDefault();
      runExport();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapExporterPage);
  } else {
    bootstrapExporterPage();
  }
})(window);
