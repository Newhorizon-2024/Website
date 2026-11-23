import { applyShadowflameSong } from "../effects/shadowflame.js?v=26.11.21.5";
import { syncPixelSnow } from "../effects/pixel-snow.js?v=26.11.22.6";
import { trackWaveforms } from "./track-waveforms-data.js?v=26.11.21.7";

/* ===========================
   Bossrush 视觉效果
=========================== */

const bossrushEyes =
    document.getElementById(
        "bossrush-eyes"
    );

const bossrushEyesBackground =
    document.getElementById(
        "bossrush-eyes-bg"
    );

const bossrushFilter =
    document.getElementById(
        "bossrush-filter"
    );

const backgroundMusic =
    document.getElementById(
        "background-music"
    );


/* ===========================
   基础状态
=========================== */

let bossrushHideTimeout =
    null;

let cubeColorAnimationFrame =
    null;

let activeBossrushSpeed =
    1;


/* ===========================
   音频可视化状态
=========================== */

let audioMask =
    null;

let audioMaskContext =
    null;

let audioContext =
    null;

let analyser =
    null;

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

let frequencyData =
    null;

let waveformData =
    null;

let audioMaskAnimationFrame =
    null;

let audioEvents = null;
let spectrum = null;
let graphUnavailable = false;
let playing = false;
let snowSelected = false;
const summitDesktop = matchMedia("(hover: hover) and (pointer: fine)");
const mobileDevice = navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let summitSelected = false, summitGame = null, summitLoading = null;
function syncSummitGame() {
    const selected = summitSelected && summitDesktop.matches && !mobileDevice && !backgroundMusic?.ended;
    const active = selected && playing && !pageAway && !document.hidden;
    if (!selected) {
        summitGame?.destroy();
        summitGame = null;
    } else if (summitGame) {
        summitGame.setPlaying(playing && !pageAway);
    } else if (active && !summitLoading) {
        summitLoading = import("../effects/summit-game.js?v=26.11.23.1")
            .then(module => module.createSummitGame())
            .then(game => { summitGame = game; syncSummitGame(); })
            .catch(error => console.warn("Summit game could not start", error))
            .finally(() => { summitLoading = null; });
    }
}

let snowScore = null;
const snowBands = {bass:0,mid:0,high:0};
let pageAway = false;
let bossVisible = false;
let lastSampleAt = 0;
let bassFloor = 0, previousBass = 0, pulse = 0;
let primed = false;

let smoothedVolume =
    0;

let smoothedBass =
    0;

let smoothedMid =
    0;

let smoothedTreble =
    0;

let visualizerTime =
    0;


/* ===========================
   可视化配置
=========================== */

const AUDIO_VISUALIZER_CONFIG = {
    /*
     * Canvas 内部分辨率。
     * 放大后由 CSS 模糊处理。
     */
    width:
        200,

    height:
        100,

    /*
     * FFT 数据精度。
     */
    fftSize:
        2048,

    /*
     * 原始频率数据平滑程度。
     */
    analyserSmoothing:
        0.64,

    /*
     * 光频最低与最高高度。
     */
    minimumHeight:
        0.06,

    maximumHeight:
        0.74,

    /*
     * Canvas 内部透明度。
     */
    minimumOpacity:
        0.035,

    maximumOpacity:
        0.42,

    /*
     * 底部大面积雾光颜色。
     */
    bottomColor:
        [82, 82, 82],

    /*
     * 上沿波峰颜色。
     */
    topColor:
        [148, 148, 148]
};


/* ===========================
   应用歌曲视觉
=========================== */

export function applySongVisuals(
    song
) {
    applyShadowflameSong(song, backgroundMusic);
    summitSelected = song?.path === "media/Reach for the Summit - Lena Raine.mp3";
    snowSelected = song?.visualEffect === "pixel-snow";
    const row = snowSelected && trackWaveforms[song.path];
    snowScore = row ? {path:song.path,duration:row[0],peaks:Uint8Array.from(atob(row[1]),c=>c.charCodeAt(0))} : null;
    playing = !backgroundMusic?.paused && backgroundMusic?.readyState >= 3;
    spectrum?.clear();
    resetRhythm();
    const speedMultiplier =
        song?.speedMultiplier ||
        1;

    activeBossrushSpeed =
        speedMultiplier;

    const root =
        document.documentElement;

    switch (speedMultiplier) {
        case 2:
            root.style.setProperty(
                "--eyes-size",
                "clamp(100px, 35vw, 200px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(150px, 35vw, 300px)"
            );

            break;

        case 4:
            root.style.setProperty(
                "--eyes-size",
                "clamp(200px, 45vw, 400px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(200px, 45vw, 400px)"
            );

            break;

        case 6:
            root.style.setProperty(
                "--eyes-size",
                "clamp(300px, 55vw, 600px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(300px, 55vw, 600px)"
            );

            break;

        case 8:
            root.style.setProperty(
                "--eyes-size",
                "clamp(400px, 65vw, 800px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(400px, 65vw, 800px)"
            );

            break;

        default:
            activeBossrushSpeed =
                1;

            break;
    }

    syncVisualizer();
}


/* ===========================
   创建音频遮罩
=========================== */

function createAudioMask() {
    const existingMask =
        document.getElementById(
            "bossrush-audio-mask"
        );

    if (existingMask) {
        audioMask =
            existingMask;
    } else {
        audioMask =
            document.createElement(
                "canvas"
            );

        audioMask.id =
            "bossrush-audio-mask";

        audioMask.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.appendChild(
            audioMask
        );
    }

    audioMask.width =
        AUDIO_VISUALIZER_CONFIG
            .width;

    audioMask.height =
        AUDIO_VISUALIZER_CONFIG
            .height;

    audioMaskContext =
        audioMask.getContext(
            "2d",
            {
                alpha:
                    true
            }
        );

    if (audioMaskContext) {
        audioMaskContext.imageSmoothingEnabled =
            true;
    }
}


/* ===========================
   初始化音频分析器
=========================== */

// 等音频上下文真正运行后才接管媒体输出。受自动播放限制时仍可直接播放。
function ensureAudioGraph() {
    if (analyser) return true;
    if (graphUnavailable) return false;
    try {
        if (!audioContext) {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) { graphUnavailable = true; return false; }
            audioContext = window.bossrushAudioGraph?.context || new Context();
            audioContext.addEventListener("statechange", syncVisualizer, { signal: audioEvents.signal });
        }
        if (audioContext.state !== "running") return false;
        const existing = window.bossrushAudioGraph;
        if (existing?.source) {
            analyser = existing.analyser;
        } else {
            const node = audioContext.createAnalyser();
            node.fftSize = AUDIO_VISUALIZER_CONFIG.fftSize;
            node.smoothingTimeConstant = AUDIO_VISUALIZER_CONFIG.analyserSmoothing;
            node.minDecibels = -90;
            node.maxDecibels = -12;
            const source = audioContext.createMediaElementSource(backgroundMusic);
            source.connect(node);
            node.connect(audioContext.destination);
            window.bossrushAudioGraph = { context: audioContext, analyser: node, source };
            analyser = node;
        }
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        waveformData = new Uint8Array(analyser.fftSize);
        return true;
    } catch {
        graphUnavailable = true;
        return false;
    }
}

function resumeAudioGraph() {
    if (audioContext?.state === "suspended" || audioContext?.state === "interrupted") {
        audioContext.resume().catch(() => {});
    }
}

export function initializeSongVisualizer(volumeSpectrum) {
    if (!backgroundMusic || audioEvents) return;
    audioEvents = new AbortController();
    const listen = (target, name, fn) => target.addEventListener(name, fn, { signal: audioEvents.signal });
    spectrum = volumeSpectrum;
    spectrum?.onVisibilityChange(syncVisualizer);
    listen(backgroundMusic, "volumechange", syncVisualizer);
    listen(backgroundMusic, "playing", () => {
        playing = true;
        syncVisualizer();
        resumeAudioGraph();
    });
    for (const type of ["pause", "ended", "waiting", "seeking", "emptied", "error"]) {
        listen(backgroundMusic, type, () => { playing = false; syncVisualizer(); });
    }
    listen(backgroundMusic, "seeked", () => {
        playing = !backgroundMusic.paused && !backgroundMusic.ended && backgroundMusic.readyState >= 3;
        syncVisualizer();
    });
    listen(window, "pointerdown", resumeAudioGraph);
    listen(window, "keydown", resumeAudioGraph);
    listen(document, "visibilitychange", syncVisualizer);
    listen(reduceMotion, "change", syncVisualizer);
    listen(summitDesktop, "change", syncSummitGame);
    listen(window, "pageshow", () => { pageAway = false; syncVisualizer(); });
    listen(window, "pagehide", event => {
        pageAway = true;
        syncVisualizer();
        if (!event.persisted) {
            spectrum?.onVisibilityChange(null);
            audioEvents.abort();
        }
    });
    playing = !backgroundMusic.paused && backgroundMusic.readyState >= 3;
    syncVisualizer();
}

function syncVisualizer() {
    syncSummitGame();
    syncPixelSnow(snowSelected && !backgroundMusic?.ended, playing, document.hidden || pageAway,
        reduceMotion.matches, backgroundMusic, snowScore, snowBands);
    const bossSelected = activeBossrushSpeed > 1 && playing;
    const speed = bossSelected ? activeBossrushSpeed : 1;
    if (window.globalSpeedMultiplier !== speed) {
        window.globalSpeedMultiplier = speed;
        fadeCubeColor(({4:"#666666", 6:"#444444", 8:"#222222"})[speed] || "#888888");
    }
    if (bossSelected !== bossVisible) {
        bossVisible = bossSelected;
        if (bossVisible) showBossrush();
        else fadeOutBossrush();
    }
    const volumeVisible = spectrum?.visible && !backgroundMusic.muted && backgroundMusic.volume > 0;
    if (!volumeVisible) spectrum?.clear();
    const run = playing && !pageAway && !document.hidden && !reduceMotion.matches && (bossVisible || volumeVisible || snowSelected);
    if (run) {
        ensureAudioGraph();
        resumeAudioGraph();
    }
    if (run && analyser && audioContext.state === "running") {
        if (audioMaskAnimationFrame === null) audioMaskAnimationFrame = requestAnimationFrame(updateAudioVisualizer);
    } else {
        cancelAnimationFrame(audioMaskAnimationFrame);
        audioMaskAnimationFrame = null;
        lastSampleAt = 0;
        snowBands.bass = snowBands.mid = snowBands.high = 0;
        spectrum?.clear();
        if (bossVisible) clearAudioMask();
        resetRhythm();
    }
}


/* ===========================
   显示 Bossrush
=========================== */

function showBossrush() {
    if (bossrushHideTimeout) {
        window.clearTimeout(
            bossrushHideTimeout
        );

        bossrushHideTimeout =
            null;
    }

    if (!audioMask) createAudioMask();

    const bossrushElements = [
        bossrushEyes,
        bossrushEyesBackground,
        bossrushFilter,
        audioMask
    ].filter(Boolean);

    bossrushElements.forEach(
        element => {
            const hiding = element.getAnimations().find(animation => animation.id === "bossrush-hide");
            if (hiding) {
                const opacity = getComputedStyle(element).opacity;
                hiding.cancel();
                element.animate([{opacity}, {offset:1}], {
                    id:"bossrush-resume", duration:reduceMotion.matches ? 160 : 400, easing:"ease-out"
                });
            }

            element.style.display =
                "block";
        }
    );

    if (audioMask) {
        audioMask.classList.add(
            "is-active"
        );
    }


}


/* ===========================
   隐藏 Bossrush
=========================== */

function fadeOutBossrush() {
    const elements = [bossrushEyes, bossrushEyesBackground, bossrushFilter, audioMask].filter(Boolean);
    const duration = reduceMotion.matches ? 160 : 600;
    clearTimeout(bossrushHideTimeout);
    for (const element of elements) {
        const opacity = getComputedStyle(element).opacity;
        element.getAnimations().find(animation => animation.id === "bossrush-resume")?.cancel();
        element.animate([{ opacity }, { opacity: 0 }],
            { id: "bossrush-hide", duration, easing: "ease-out", fill: "forwards" });
    }
    bossrushHideTimeout = setTimeout(() => {
        for (const element of elements) {
            element.style.display = "none";
            element.getAnimations().find(animation => animation.id === "bossrush-hide")?.cancel();
        }
        audioMask?.classList.remove("is-active");
        clearAudioMask();
        resetRhythm();
        bossrushHideTimeout = null;
    }, duration);
}

/* ===========================
   数值工具
=========================== */

function clamp(
    value,
    minimum,
    maximum
) {
    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}

function getRmsVolume() {
    if (
        !waveformData ||
        waveformData.length === 0
    ) {
        return 0;
    }

    let total =
        0;

    for (
        let index = 0;
        index <
        waveformData.length;
        index += 1
    ) {
        const normalized =
            (
                waveformData[index] -
                128
            ) /
            128;

        total +=
            normalized *
            normalized;
    }

    return Math.sqrt(
        total /
        waveformData.length
    );
}


/* ===========================
   绘制音频光频
=========================== */

function drawAudioMask() {
    if (
        !audioMaskContext ||
        !audioMask ||
        !frequencyData
    ) {
        return;
    }

    const width =
        audioMask.width;

    const height =
        audioMask.height;

    audioMaskContext.clearRect(
        0,
        0,
        width,
        height
    );

    const [
        bottomRed,
        bottomGreen,
        bottomBlue
    ] =
        AUDIO_VISUALIZER_CONFIG
            .bottomColor;

    const [
        topRed,
        topGreen,
        topBlue
    ] =
        AUDIO_VISUALIZER_CONFIG
            .topColor;

    /*
     * Bossrush 等级会有限增强光频，
     * 不会让高速歌曲完全覆盖画面。
     */
    const levelStrength =
        clamp(
            0.9 +
            activeBossrushSpeed *
            0.025,
            0.92,
            1.1
        );

    /*
     * RMS 与低频负责主要高度；
     * 中频负责细微变化。
     */
    const energy =
        clamp(
            (
                smoothedVolume *
                1.55 +
                smoothedBass *
                0.8 +
                smoothedMid *
                0.22 + pulse * 0.18
            ) *
            levelStrength,
            0,
            1
        );

    const baseHeightRatio =
        AUDIO_VISUALIZER_CONFIG
            .minimumHeight +
        energy *
        (
            AUDIO_VISUALIZER_CONFIG
                .maximumHeight -
            AUDIO_VISUALIZER_CONFIG
                .minimumHeight
        );

    const baseOpacity =
        AUDIO_VISUALIZER_CONFIG
            .minimumOpacity +
        energy *
        (
            AUDIO_VISUALIZER_CONFIG
                .maximumOpacity -
            AUDIO_VISUALIZER_CONFIG
                .minimumOpacity
        );

    const columns =
        52;

    const columnWidth =
        width /
        columns;


    /* ===========================
       第一层：底部雾光
    =========================== */

    audioMaskContext.save();

    audioMaskContext.globalCompositeOperation =
        "source-over";

    const broadGradient =
        audioMaskContext
            .createLinearGradient(
                0,
                height,
                0,
                0
            );

    broadGradient.addColorStop(
        0,
        `rgba(
            ${bottomRed},
            ${bottomGreen},
            ${bottomBlue},
            ${baseOpacity * 0.9}
        )`
    );

    broadGradient.addColorStop(
        0.38,
        `rgba(
            ${bottomRed},
            ${bottomGreen},
            ${bottomBlue},
            ${baseOpacity * 0.38}
        )`
    );

    broadGradient.addColorStop(
        0.72,
        `rgba(
            ${bottomRed},
            ${bottomGreen},
            ${bottomBlue},
            ${baseOpacity * 0.09}
        )`
    );

    broadGradient.addColorStop(
        1,
        `rgba(
            ${bottomRed},
            ${bottomGreen},
            ${bottomBlue},
            0
        )`
    );

    audioMaskContext.fillStyle =
        broadGradient;

    audioMaskContext.beginPath();

    audioMaskContext.moveTo(
        0,
        height
    );

    for (
        let index = 0;
        index <= columns;
        index += 1
    ) {
        const x =
            index *
            columnWidth;

        const slowWave =
            Math.sin(
                visualizerTime *
                0.62 +
                index *
                0.27
            ) *
            0.045;

        const secondaryWave =
            Math.sin(
                visualizerTime *
                0.98 -
                index *
                0.15
            ) *
            0.026;

        const frequencyIndex =
            Math.min(
                frequencyData.length - 1,

                Math.floor(
                    index /
                    columns *
                    frequencyData.length *
                    0.4
                )
            );

        const frequencyValue =
            frequencyData[
                frequencyIndex
            ] /
            255;

        const localHeight =
            baseHeightRatio +
            slowWave +
            secondaryWave +
            frequencyValue *
            0.13 *
            (
                0.35 +
                smoothedBass
            );

        const y =
            height -
            height *
            clamp(
                localHeight,
                0.035,
                0.9
            );

        if (index === 0) {
            audioMaskContext.lineTo(
                x,
                y
            );
        } else {
            const controlX =
                (
                    index -
                    0.5
                ) *
                columnWidth;

            audioMaskContext
                .quadraticCurveTo(
                    controlX,
                    y,
                    x,
                    y
                );
        }
    }

    audioMaskContext.lineTo(
        width,
        height
    );

    audioMaskContext.closePath();
    audioMaskContext.fill();

    audioMaskContext.restore();


    /* ===========================
       第二层：动态波峰
    =========================== */

    audioMaskContext.save();

    audioMaskContext.globalCompositeOperation =
        "lighter";

    audioMaskContext.beginPath();

    for (
        let index = 0;
        index <= columns;
        index += 1
    ) {
        const x =
            index *
            columnWidth;

        const frequencyIndex =
            Math.min(
                frequencyData.length - 1,

                Math.floor(
                    index /
                    columns *
                    frequencyData.length *
                    0.7
                )
            );

        const frequencyValue =
            frequencyData[
                frequencyIndex
            ] /
            255;

        const fastWave =
            Math.sin(
                visualizerTime *
                1.55 +
                index *
                0.47
            ) *
            0.022;

        const localHeight =
            AUDIO_VISUALIZER_CONFIG
                .minimumHeight +
            energy *
            0.46 +
            frequencyValue *
            0.18 +
            fastWave +
            smoothedTreble *
            0.05;

        const y =
            height -
            height *
            clamp(
                localHeight,
                0.035,
                0.82
            );

        if (index === 0) {
            audioMaskContext.moveTo(
                x,
                y
            );
        } else {
            audioMaskContext.lineTo(
                x,
                y
            );
        }
    }

    audioMaskContext.lineTo(
        width,
        height
    );

    audioMaskContext.lineTo(
        0,
        height
    );

    audioMaskContext.closePath();

    const detailGradient =
        audioMaskContext
            .createLinearGradient(
                0,
                height,
                0,
                height *
                    0.12
            );

    detailGradient.addColorStop(
        0,
        `rgba(
            ${topRed},
            ${topGreen},
            ${topBlue},
            ${baseOpacity * 0.46}
        )`
    );

    detailGradient.addColorStop(
        0.58,
        `rgba(
            ${topRed},
            ${topGreen},
            ${topBlue},
            ${baseOpacity * 0.13}
        )`
    );

    detailGradient.addColorStop(
        1,
        `rgba(
            ${topRed},
            ${topGreen},
            ${topBlue},
            0
        )`
    );

    audioMaskContext.fillStyle =
        detailGradient;

    audioMaskContext.fill();

    audioMaskContext.restore();


    /* ===========================
       CSS 整体响应
    =========================== */

    const cssScale =
        0.8 +
        energy *
        0.38;

    const cssTranslate =
        (
            1 -
            energy
        ) *
        7;

    audioMask.style.opacity =
        String(
            0.24 +
            energy *
            0.38
        );

    audioMask.style.transform =
        `translate3d(
            0,
            ${cssTranslate}vh,
            0
        )
        scaleX(1.08)
        scaleY(${cssScale})`;
}


/* ===========================
   可视化动画循环
=========================== */

function resetRhythm() {
    pulse = bassFloor = previousBass = 0;
    primed = false;
    smoothedVolume = smoothedBass = smoothedMid = smoothedTreble = 0;
    bossrushEyes?.style.removeProperty("--beat-scale");
    bossrushEyesBackground?.style.removeProperty("--echo-scale");
    bossrushEyesBackground?.style.removeProperty("--echo-opacity");
}

function readBand(lowHz, highHz, hz) {
    const first = Math.min(frequencyData.length - 1, Math.max(1, Math.round(lowHz / hz)));
    const end = Math.min(frequencyData.length, Math.max(first + 1, Math.round(highHz / hz)));
    let sum = 0;
    for (let i = first; i < end; i++) sum += frequencyData[i];
    return sum / (end - first) / 255;
}

function updateBossrushRhythm(hz, dt) {
    analyser.getByteTimeDomainData(waveformData);
    const bass = readBand(42, 185, hz);
    const rms = Math.min(1, getRmsVolume() * 2.5);
    const follow = (value, target) => value + (target - value) *
        (1 - Math.exp(-dt / (target > value ? .065 : .23)));
    smoothedVolume = follow(smoothedVolume, rms);
    smoothedBass = follow(smoothedBass, bass);
    smoothedMid = follow(smoothedMid, readBand(220, 1800, hz));
    smoothedTreble = follow(smoothedTreble, readBand(2600, 9500, hz));
    if (!primed) {
        previousBass = bassFloor = bass;
        primed = true;
    }
    // 用相对低频底噪与相邻采样的起音差识别鼓点，持续响亮的段落也能自然回落。
    const attack = Math.max(0, bass - bassFloor - .035) * 2.8 + Math.max(0, bass - previousBass) * 1.65;
    pulse = Math.max(pulse * Math.exp(-dt / .19), Math.min(1, attack));
    bassFloor += (bass - bassFloor) * (1 - Math.exp(-dt / .68));
    previousBass = bass;
    const weight = .65 + activeBossrushSpeed * .045;
    bossrushEyes?.style.setProperty("--beat-scale", (1 + (.012 * smoothedVolume + .046 * pulse) * weight).toFixed(4));
    bossrushEyesBackground?.style.setProperty("--echo-scale", (1 + (.035 * smoothedBass + .085 * pulse) * weight).toFixed(4));
    bossrushEyesBackground?.style.setProperty("--echo-opacity", (.45 + .48 * pulse).toFixed(3));
    visualizerTime += dt * (1.55 + smoothedMid);
    drawAudioMask();
}

function updateAudioVisualizer(now) {
    if (now - lastSampleAt >= 1000 / 30 - 0.5) {
        const dt = lastSampleAt ? Math.min((now - lastSampleAt) / 1000, .1) : 1 / 30;
        lastSampleAt = now;
        analyser.getByteFrequencyData(frequencyData);
        const hz = audioContext.sampleRate / analyser.fftSize;
        if (spectrum?.visible && !backgroundMusic.muted && backgroundMusic.volume > 0) {
            spectrum.draw(frequencyData, hz, dt);
        }
        if (snowSelected) {
            snowBands.bass = readBand(45,200,hz);
            snowBands.mid = readBand(250,1800,hz);
            snowBands.high = readBand(2600,9000,hz);
        }
        if (bossVisible) updateBossrushRhythm(hz, dt);
    }
    audioMaskAnimationFrame = requestAnimationFrame(updateAudioVisualizer);
}


function clearAudioMask() {
    if (
        audioMaskContext &&
        audioMask
    ) {
        audioMaskContext.clearRect(
            0,
            0,
            audioMask.width,
            audioMask.height
        );
    }

    smoothedVolume =
        0;

    smoothedBass =
        0;

    smoothedMid =
        0;

    smoothedTreble =
        0;

    visualizerTime =
        0;

    if (audioMask) {
        audioMask.style.opacity =
            "";

        audioMask.style.transform =
            "";
    }
}


/* ===========================
   方块颜色渐变
=========================== */

function fadeCubeColor(
    targetColor,
    duration = 600
) {
    if (
        !window.material ||
        !window.material.color ||
        typeof THREE ===
            "undefined"
    ) {
        return;
    }

    if (cubeColorAnimationFrame) {
        window.cancelAnimationFrame(
            cubeColorAnimationFrame
        );
    }

    const startingColor =
        window.material.color.clone();

    const endingColor =
        new THREE.Color(
            targetColor
        );

    const startingTime =
        performance.now();

    function updateCubeColor(
        time
    ) {
        const progress =
            Math.min(
                1,
                (
                    time -
                    startingTime
                ) /
                duration
            );

        window.material.color
            .copy(
                startingColor
            )
            .lerp(
                endingColor,
                progress
            );

        if (progress < 1) {
            cubeColorAnimationFrame =
                window.requestAnimationFrame(
                    updateCubeColor
                );

            return;
        }

        cubeColorAnimationFrame =
            null;
    }

    cubeColorAnimationFrame =
        window.requestAnimationFrame(
            updateCubeColor
        );
}
