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

let mediaSource =
    null;

let frequencyData =
    null;

let waveformData =
    null;

let audioMaskAnimationFrame =
    null;

let audioVisualizerInitialized =
    false;

let audioVisualizerActive =
    false;

let audioResumeEventsBound =
    false;

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
        512,

    /*
     * 原始频率数据平滑程度。
     */
    analyserSmoothing:
        0.76,

    /*
     * 音量上升与下降缓动。
     */
    riseSmoothing:
        0.2,

    fallSmoothing:
        0.065,

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
    const speedMultiplier =
        song?.speedMultiplier ||
        1;

    activeBossrushSpeed =
        speedMultiplier;

    window.globalSpeedMultiplier =
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

            fadeCubeColor(
                "#888888"
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

            fadeCubeColor(
                "#666666"
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

            fadeCubeColor(
                "#444444"
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

            fadeCubeColor(
                "#222222"
            );

            break;

        default:
            activeBossrushSpeed =
                1;

            fadeOutBossrush();

            fadeCubeColor(
                "#888888"
            );

            return;
    }

    showBossrush();
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

function initializeAudioVisualizer() {
    if (
        audioVisualizerInitialized
    ) {
        return true;
    }

    if (!backgroundMusic) {
        console.warn(
            "Bossrush 音频可视化初始化失败：未找到 #background-music。"
        );

        return false;
    }

    createAudioMask();

    if (
        !audioMask ||
        !audioMaskContext
    ) {
        console.warn(
            "Bossrush 音频可视化初始化失败：无法创建音频遮罩。"
        );

        return false;
    }

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        console.warn(
            "当前浏览器不支持 Web Audio API。"
        );

        return false;
    }

    /*
     * 一个 audio 元素只能创建一次
     * MediaElementAudioSourceNode。
     */
    if (
        window
            .bossrushAudioGraph
            ?.source
    ) {
        audioContext =
            window
                .bossrushAudioGraph
                .context;

        analyser =
            window
                .bossrushAudioGraph
                .analyser;

        mediaSource =
            window
                .bossrushAudioGraph
                .source;
    } else {
        try {
            audioContext =
                new AudioContextClass();

            analyser =
                audioContext
                    .createAnalyser();

            analyser.fftSize =
                AUDIO_VISUALIZER_CONFIG
                    .fftSize;

            analyser.smoothingTimeConstant =
                AUDIO_VISUALIZER_CONFIG
                    .analyserSmoothing;

            analyser.minDecibels =
                -90;

            analyser.maxDecibels =
                -12;

            mediaSource =
                audioContext
                    .createMediaElementSource(
                        backgroundMusic
                    );

            mediaSource.connect(
                analyser
            );

            analyser.connect(
                audioContext.destination
            );

            window.bossrushAudioGraph = {
                context:
                    audioContext,

                analyser,

                source:
                    mediaSource
            };
        } catch (error) {
            console.error(
                "Bossrush 音频分析器创建失败：",
                error
            );

            return false;
        }
    }

    frequencyData =
        new Uint8Array(
            analyser.frequencyBinCount
        );

    waveformData =
        new Uint8Array(
            analyser.fftSize
        );

    bindAudioResumeEvents();

    audioVisualizerInitialized =
        true;

    return true;
}


/* ===========================
   AudioContext 恢复
=========================== */

function resumeAudioContext() {
    if (
        !audioContext ||
        audioContext.state !==
            "suspended"
    ) {
        return;
    }

    audioContext
        .resume()
        .catch(
            error => {
                console.warn(
                    "AudioContext 恢复失败：",
                    error
                );
            }
        );
}

function bindAudioResumeEvents() {
    if (
        !backgroundMusic ||
        audioResumeEventsBound
    ) {
        return;
    }

    audioResumeEventsBound =
        true;

    backgroundMusic.addEventListener(
        "play",
        resumeAudioContext
    );

    window.addEventListener(
        "pointerdown",
        resumeAudioContext,
        {
            once:
                true
        }
    );

    window.addEventListener(
        "keydown",
        resumeAudioContext,
        {
            once:
                true
        }
    );
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

    initializeAudioVisualizer();

    const bossrushElements = [
        bossrushEyes,
        bossrushEyesBackground,
        bossrushFilter,
        audioMask
    ].filter(Boolean);

    bossrushElements.forEach(
        element => {
            element.style.animation =
                "";

            element.style.display =
                "block";
        }
    );

    if (audioMask) {
        audioMask.classList.add(
            "is-active"
        );
    }

    startAudioVisualizer();
}


/* ===========================
   隐藏 Bossrush
=========================== */

function fadeOutBossrush() {
    const bossrushElements = [
        bossrushEyes,
        bossrushEyesBackground,
        bossrushFilter,
        audioMask
    ].filter(Boolean);

    if (
        bossrushElements.length ===
        0
    ) {
        return;
    }

    if (bossrushHideTimeout) {
        window.clearTimeout(
            bossrushHideTimeout
        );
    }

    bossrushElements.forEach(
        element => {
            element.style.animation =
                "bossrushFadeOut 1s ease-out forwards";
        }
    );

    bossrushHideTimeout =
        window.setTimeout(
            () => {
                stopAudioVisualizer();

                bossrushElements.forEach(
                    element => {
                        element.style.display =
                            "none";

                        element.style.animation =
                            "";
                    }
                );

                if (audioMask) {
                    audioMask.classList.remove(
                        "is-active"
                    );
                }

                clearAudioMask();

                bossrushHideTimeout =
                    null;
            },
            1000
        );
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

function smoothValue(
    current,
    target
) {
    const smoothing =
        target >
        current
            ? AUDIO_VISUALIZER_CONFIG
                .riseSmoothing
            : AUDIO_VISUALIZER_CONFIG
                .fallSmoothing;

    return current +
        (
            target -
            current
        ) *
        smoothing;
}


/* ===========================
   音频数据读取
=========================== */

function getBandAverage(
    startRatio,
    endRatio
) {
    if (
        !frequencyData ||
        frequencyData.length === 0
    ) {
        return 0;
    }

    const startIndex =
        Math.floor(
            frequencyData.length *
            startRatio
        );

    const endIndex =
        Math.min(
            frequencyData.length,

            Math.max(
                startIndex + 1,

                Math.floor(
                    frequencyData.length *
                    endRatio
                )
            )
        );

    let total =
        0;

    let count =
        0;

    for (
        let index = startIndex;
        index < endIndex;
        index += 1
    ) {
        total +=
            frequencyData[index];

        count +=
            1;
    }

    if (count === 0) {
        return 0;
    }

    return total /
        count /
        255;
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
                0.22
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

function updateAudioVisualizer() {
    if (
        !audioVisualizerActive ||
        !analyser ||
        !frequencyData ||
        !waveformData
    ) {
        audioMaskAnimationFrame =
            null;

        return;
    }

    analyser.getByteFrequencyData(
        frequencyData
    );

    analyser.getByteTimeDomainData(
        waveformData
    );

    const rms =
        getRmsVolume();

    const bass =
        getBandAverage(
            0,
            0.12
        );

    const mid =
        getBandAverage(
            0.12,
            0.42
        );

    const treble =
        getBandAverage(
            0.42,
            0.82
        );

    smoothedVolume =
        smoothValue(
            smoothedVolume,

            clamp(
                rms *
                    2.5,
                0,
                1
            )
        );

    smoothedBass =
        smoothValue(
            smoothedBass,
            bass
        );

    smoothedMid =
        smoothValue(
            smoothedMid,
            mid
        );

    smoothedTreble =
        smoothValue(
            smoothedTreble,
            treble
        );

    visualizerTime +=
        0.03 +
        smoothedMid *
        0.02;

    drawAudioMask();

    audioMaskAnimationFrame =
        window.requestAnimationFrame(
            updateAudioVisualizer
        );
}

function startAudioVisualizer() {
    if (
        !audioVisualizerInitialized ||
        !audioMask
    ) {
        return;
    }

    resumeAudioContext();

    audioVisualizerActive =
        true;

    if (
        audioMaskAnimationFrame ===
        null
    ) {
        audioMaskAnimationFrame =
            window.requestAnimationFrame(
                updateAudioVisualizer
            );
    }
}

function stopAudioVisualizer() {
    audioVisualizerActive =
        false;

    if (
        audioMaskAnimationFrame !==
        null
    ) {
        window.cancelAnimationFrame(
            audioMaskAnimationFrame
        );

        audioMaskAnimationFrame =
            null;
    }
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