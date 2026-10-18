/* ===========================
   情报署时间轴
=========================== */


/* ===========================
   1. Threads 配置
=========================== */

const TIMELINE_THREADS_CONFIG = {
    /* 按 CSS 尺寸和屏幕像素密度绘制，避免低分辨率拉伸。 */
    maximumPixelRatio: 2,

    /*
     * 流线数量。
     */
    threadCount: 17,

    /*
     * 每条流线的采样点数量。
     */
    pointCount: 72,

    /*
     * 基础透明度。
     */
    baseOpacity: 0.055,

    /*
     * 节点悬停时的透明度。
     */
    hoverOpacity: 0.13,

    /*
     * 节点选中后的透明度。
     */
    activeOpacity: 0.19,

    /*
     * 线条粗细。
     */
    minimumLineWidth: 0.55,
    maximumLineWidth: 1.25,

    /*
     * 运动速度。
     */
    baseSpeed: 0.0002,
    activeSpeedMultiplier: 1.45,

    /*
     * 波浪幅度。
     */
    baseAmplitude: 13,
    activeAmplitude: 25,

    /*
     * 鼠标牵引强度。
     */
    pointerInfluence: 42,

    /*
     * 时间轴节点牵引强度。
     */
    nodeInfluence: 58,

    /*
     * 鼠标影响范围。
     */
    pointerRadius: 240,

    /*
     * 选中节点影响范围。
     */
    nodeRadius: 330,

    /*
     * 颜色。
     */
    color: [218, 218, 218]
};

let timelineInitialized = false;


/* ===========================
   2. 时间轴初始化
=========================== */

export function initializeNhnTimeline() {
    if (timelineInitialized) return;
    const timelineSection =
        document.getElementById(
            "timeline-section"
        );

    const timelineItems =
        document.querySelectorAll(
            ".timeline-item"
        );

    const timelineDetails =
        document.querySelectorAll(
            ".timeline-detail"
        );

    if (
        !timelineSection ||
        (
            timelineItems.length === 0 &&
            timelineDetails.length === 0
        )
    ) {
        return;
    }

    timelineInitialized = true;
    const timelineScroll = timelineSection.querySelector(".timeline-scroll");
    const timelineTrack = timelineSection.querySelector(".timeline-track");
    const timelineLine = timelineSection.querySelector(".timeline-line");
    const svgNamespace = "http://www.w3.org/2000/svg";
    const mainCurve = document.createElementNS(svgNamespace, "svg");
    const mainPath = document.createElementNS(svgNamespace, "path");
    mainCurve.classList.add("timeline-main-curve");
    mainCurve.setAttribute("aria-hidden", "true");
    mainCurve.setAttribute("focusable", "false");
    mainPath.classList.add("timeline-main-path");
    mainPath.setAttribute("fill", "none");
    mainPath.setAttribute("vector-effect", "non-scaling-stroke");
    mainPath.setAttribute("pathLength", "1");
    mainCurve.append(mainPath);
    timelineLine?.append(mainCurve);
    timelineLine?.setAttribute("aria-hidden", "true");
    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasPixelRatio = 0;
    let mainGeometry = null;
    let focusedItem = null;


    /* ===========================
       3. Threads Canvas 状态
    =========================== */

    let threadsCanvas =
        document.getElementById(
            "timeline-threads-canvas"
        );

    let threadsContext =
        null;

    let threadLines =
        [];

    let animationFrameId =
        null;

    let resizeObserver =
        null;

    let intersectionObserver =
        null;

    let sectionVisible =
        false;

    let reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    let lastFrameTime =
        performance.now();

    let elapsedTime =
        0;


    /* ===========================
       4. Threads 交互状态
    =========================== */

    const pointer = {
        active:
            false,

        x:
            0.5,

        y:
            0.5,

        targetX:
            0.5,

        targetY:
            0.5,

        strength:
            0,

        targetStrength:
            0
    };

    const nodeFocus = {
        active:
            false,

        selected:
            false,

        x:
            0.5,

        y:
            0.5,

        targetX:
            0.5,

        targetY:
            0.5,

        strength:
            0,

        targetStrength:
            0
    };


    /* ===========================
       5. 通用工具
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

    function lerp(
        start,
        end,
        amount
    ) {
        return start +
            (
                end -
                start
            ) *
            amount;
    }

    function smoothStep(
        value
    ) {
        const normalized =
            clamp(
                value,
                0,
                1
            );

        return normalized *
            normalized *
            (
                3 -
                2 *
                normalized
            );
    }


    /* ===========================
       6. 创建 Canvas
    =========================== */

    function createThreadsCanvas() {
        if (!threadsCanvas) {
            threadsCanvas =
                document.createElement(
                    "canvas"
                );

            threadsCanvas.id =
                "timeline-threads-canvas";

            threadsCanvas.setAttribute(
                "aria-hidden",
                "true"
            );

            timelineSection.prepend(
                threadsCanvas
            );
        }

        threadsContext =
            threadsCanvas.getContext(
                "2d",
                {
                    alpha:
                        true
                }
            );

        if (!threadsContext) {
            console.warn(
                "时间轴 Threads 初始化失败：无法创建 Canvas 2D 上下文。"
            );

            return false;
        }

        threadsContext.lineCap = "round";
        threadsContext.lineJoin = "round";

        return true;
    }


    /* ===========================
       7. 创建流线数据
    =========================== */

    function createThreadLines() {
        threadLines =
            [];

        for (
            let index = 0;
            index <
            TIMELINE_THREADS_CONFIG
                .threadCount;
            index += 1
        ) {
            const normalizedIndex =
                TIMELINE_THREADS_CONFIG
                    .threadCount <= 1
                    ? 0.5
                    : index /
                        (
                            TIMELINE_THREADS_CONFIG
                                .threadCount -
                            1
                        );

            threadLines.push({
                baseY:
                    lerp(
                        0.14,
                        0.86,
                        normalizedIndex
                    ),

                phase:
                    Math.random() *
                    Math.PI *
                    2,

                speed:
                    lerp(
                        0.68,
                        1.32,
                        Math.random()
                    ),

                amplitude:
                    lerp(
                        0.55,
                        1.15,
                        Math.random()
                    ),

                frequency:
                    lerp(
                        1.1,
                        2.4,
                        Math.random()
                    ),

                secondaryFrequency:
                    lerp(
                        2.4,
                        4.6,
                        Math.random()
                    ),

                direction:
                    index % 2 === 0
                        ? 1
                        : -1,

                lineWidth:
                    lerp(
                        TIMELINE_THREADS_CONFIG
                            .minimumLineWidth,

                        TIMELINE_THREADS_CONFIG
                            .maximumLineWidth,

                        Math.random()
                    ),

                opacity:
                    lerp(
                        0.65,
                        1,
                        Math.random()
                    )
            });
        }
    }


    /* ===========================
       8. Canvas 尺寸
    =========================== */

    function getLayoutOffset(element) {
        let x = 0;
        let y = 0;
        for (let node = element; node && node !== timelineSection; node = node.offsetParent) {
            x += node.offsetLeft;
            y += node.offsetTop;
        }
        return { x, y };
    }

    function measureMainCurve() {
        if (!timelineTrack || !timelineLine || !timelineSection.clientWidth) return;
        const width = timelineLine.clientWidth;
        const height = timelineTrack.offsetHeight;
        if (!width || !height) return;
        const style = getComputedStyle(timelineTrack);
        const dotSize = parseFloat(getComputedStyle(timelineSection).getPropertyValue("--timeline-dot-size")) || 16;
        mainGeometry = {
            width, height,
            baseline: parseFloat(style.paddingTop) + dotSize / 2,
            lineLeft: innerWidth > 600 ? (timelineTrack.clientWidth - width) / 2 : 0,
            offset: getLayoutOffset(timelineTrack),
            amplitude: innerWidth > 600 ? 27 : 16,
            nodes: Array.from(timelineItems, item => ({
                item,
                x: item.offsetLeft + item.offsetWidth / 2
            }))
        };
        mainCurve.setAttribute("viewBox", `0 0 ${width} ${height}`);
        drawMainCurve();
    }

    function mainCurveOffset(x) {
        if (!mainGeometry) return 0;
        const progress = x / mainGeometry.width;
        return (
            Math.sin(progress * Math.PI * 2 * 1.15 + elapsedTime * 0.75) +
            Math.sin(progress * Math.PI * 2 * 2.1 - elapsedTime * 0.42 + 0.8) * 0.22
        ) * mainGeometry.amplitude;
    }

    function drawMainCurve() {
        if (!mainGeometry) return;
        const { width, baseline, lineLeft, nodes } = mainGeometry;
        // 三次贝塞尔片段通过同一函数采样；节点中心严格落在这条线上。
        const sampleCount = Math.max(24, Math.ceil(width / 24));
        const step = width / sampleCount;
        let path = `M 0 ${(baseline + mainCurveOffset(0)).toFixed(3)}`;
        for (let index = 0; index < sampleCount; index++) {
            const x0 = index * step;
            const x1 = (index + 1) * step;
            const y0 = baseline + mainCurveOffset(x0);
            const y1 = baseline + mainCurveOffset(x1);
            const tangent0 = (mainCurveOffset(x0 + 0.25) - mainCurveOffset(x0 - 0.25)) / 0.5;
            const tangent1 = (mainCurveOffset(x1 + 0.25) - mainCurveOffset(x1 - 0.25)) / 0.5;
            path += ` C ${(x0 + step / 3).toFixed(3)} ${(y0 + tangent0 * step / 3).toFixed(3)}, ${(x1 - step / 3).toFixed(3)} ${(y1 - tangent1 * step / 3).toFixed(3)}, ${x1.toFixed(3)} ${y1.toFixed(3)}`;
        }
        mainPath.setAttribute("d", path);
        nodes.forEach(({item, x}) => {
            item.style.transform = `translate3d(0, ${mainCurveOffset(x - lineLeft).toFixed(3)}px, 0)`;
        });
        if (focusedItem && nodeFocus.active) updateNodeFocusPosition(focusedItem, nodeFocus.selected);
    }

    function resizeThreadsCanvas() {
        if (!threadsCanvas || !threadsContext) return;
        const width = timelineSection.clientWidth;
        const height = timelineSection.clientHeight;
        if (!width || !height) return;
        canvasWidth = width;
        canvasHeight = height;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, TIMELINE_THREADS_CONFIG.maximumPixelRatio);
        canvasPixelRatio = pixelRatio;
        const backingWidth = Math.max(1, Math.round(width * pixelRatio));
        const backingHeight = Math.max(1, Math.round(height * pixelRatio));
        if (threadsCanvas.width !== backingWidth || threadsCanvas.height !== backingHeight) {
            threadsCanvas.width = backingWidth;
            threadsCanvas.height = backingHeight;
        }
        threadsContext.setTransform(backingWidth / width, 0, 0, backingHeight / height, 0, 0);
        threadsContext.lineCap = "round";
        threadsContext.lineJoin = "round";
        measureMainCurve();
    }


    /* ===========================
       9. 获取节点位置
    =========================== */

    function updateNodeFocusPosition(item, selected = false) {
        focusedItem = item;
        if (!item || !mainGeometry) {
            nodeFocus.active = false;
            nodeFocus.selected = false;
            nodeFocus.targetStrength = 0;
            return;
        }
        const node = mainGeometry.nodes.find(node => node.item === item);
        if (!node || !canvasWidth || !canvasHeight) return;
        nodeFocus.targetX = clamp(
            (mainGeometry.offset.x + node.x - (timelineScroll?.scrollLeft || 0)) / canvasWidth,
            0, 1
        );
        nodeFocus.targetY = clamp(
            (mainGeometry.offset.y + mainGeometry.baseline +
                mainCurveOffset(node.x - mainGeometry.lineLeft)) / canvasHeight,
            0, 1
        );
        nodeFocus.active = true;
        nodeFocus.selected = selected;
        nodeFocus.targetStrength = selected ? 1 : 0.58;
    }


    /* ===========================
       10. 流场影响
    =========================== */

    function calculateInfluence(
        pointX,
        pointY,
        focusX,
        focusY,
        radius,
        strength
    ) {
        if (
            strength <= 0 ||
            radius <= 0
        ) {
            return {
                x:
                    0,

                y:
                    0,

                influence:
                    0
            };
        }

        const deltaX =
            focusX -
            pointX;

        const deltaY =
            focusY -
            pointY;

        const distance =
            Math.sqrt(
                deltaX *
                    deltaX +
                deltaY *
                    deltaY
            );

        if (
            distance >=
            radius
        ) {
            return {
                x:
                    0,

                y:
                    0,

                influence:
                    0
            };
        }

        const normalized =
            1 -
            distance /
                radius;

        const influence =
            smoothStep(
                normalized
            ) *
            strength;

        return {
            x:
                deltaX *
                influence *
                0.16,

            y:
                deltaY *
                influence *
                0.42,

            influence
        };
    }


    /* ===========================
       11. 绘制单条流线
    =========================== */

    function drawThread(
        thread,
        width,
        height,
        activeIntensity
    ) {
        const {
            color
        } =
            TIMELINE_THREADS_CONFIG;

        const pointerPixelX =
            pointer.x *
            width;

        const pointerPixelY =
            pointer.y *
            height;

        const nodePixelX =
            nodeFocus.x *
            width;

        const nodePixelY =
            nodeFocus.y *
            height;

        const amplitude =
            TIMELINE_THREADS_CONFIG
                .baseAmplitude +
            activeIntensity *
                (
                    TIMELINE_THREADS_CONFIG
                        .activeAmplitude -
                    TIMELINE_THREADS_CONFIG
                        .baseAmplitude
                );

        threadsContext.beginPath();

        let maximumInfluence =
            0;

        for (
            let pointIndex = 0;
            pointIndex <
            TIMELINE_THREADS_CONFIG
                .pointCount;
            pointIndex += 1
        ) {
            const progress =
                pointIndex /
                (
                    TIMELINE_THREADS_CONFIG
                        .pointCount -
                    1
                );

            const baseX =
                progress *
                width;

            const primaryWave =
                Math.sin(
                    progress *
                        Math.PI *
                        2 *
                        thread.frequency +
                    elapsedTime *
                        thread.speed *
                        thread.direction +
                    thread.phase
                ) *
                amplitude *
                thread.amplitude;

            const secondaryWave =
                Math.sin(
                    progress *
                        Math.PI *
                        2 *
                        thread
                            .secondaryFrequency -
                    elapsedTime *
                        thread.speed *
                        0.62 *
                        thread.direction +
                    thread.phase *
                        1.7
                ) *
                amplitude *
                0.28;

            let pointX =
                baseX;

            let pointY =
                thread.baseY *
                    height +
                primaryWave +
                secondaryWave;

            const pointerEffect =
                calculateInfluence(
                    pointX,
                    pointY,

                    pointerPixelX,
                    pointerPixelY,

                    TIMELINE_THREADS_CONFIG
                        .pointerRadius,

                    pointer.strength
                );

            const nodeEffect =
                calculateInfluence(
                    pointX,
                    pointY,

                    nodePixelX,
                    nodePixelY,

                    TIMELINE_THREADS_CONFIG
                        .nodeRadius,

                    nodeFocus.strength
                );

            pointX +=
                pointerEffect.x +
                nodeEffect.x;

            pointY +=
                pointerEffect.y +
                nodeEffect.y;

            maximumInfluence =
                Math.max(
                    maximumInfluence,
                    pointerEffect
                        .influence,
                    nodeEffect
                        .influence
                );

            if (
                pointIndex ===
                0
            ) {
                threadsContext.moveTo(
                    pointX,
                    pointY
                );
            } else {
                threadsContext.lineTo(
                    pointX,
                    pointY
                );
            }
        }

        const opacity =
            lerp(
                TIMELINE_THREADS_CONFIG
                    .baseOpacity,

                nodeFocus.selected
                    ? TIMELINE_THREADS_CONFIG
                        .activeOpacity
                    : TIMELINE_THREADS_CONFIG
                        .hoverOpacity,

                clamp(
                    activeIntensity +
                    maximumInfluence *
                        0.5,
                    0,
                    1
                )
            ) *
            thread.opacity;

        threadsContext.strokeStyle =
            `rgba(
                ${color[0]},
                ${color[1]},
                ${color[2]},
                ${opacity}
            )`;

        threadsContext.lineWidth =
            thread.lineWidth +
            maximumInfluence *
                0.7;

        threadsContext.stroke();
    }


    /* ===========================
       12. 绘制 Threads
    =========================== */

    function renderThreads(
        currentTime
    ) {
        if (
            !sectionVisible ||
            document.hidden || !timelineSection.classList.contains("is-active") ||
            reducedMotion ||
            !threadsContext ||
            !threadsCanvas
        ) {
            animationFrameId =
                null;

            return;
        }

        const deltaTime =
            Math.min(
                32,
                currentTime -
                lastFrameTime
            );

        lastFrameTime =
            currentTime;

        const speedMultiplier =
            nodeFocus.selected
                ? TIMELINE_THREADS_CONFIG
                    .activeSpeedMultiplier
                : 1;

        elapsedTime +=
            deltaTime *
            TIMELINE_THREADS_CONFIG
                .baseSpeed *
            speedMultiplier;

        if (canvasPixelRatio !== Math.min(window.devicePixelRatio || 1, TIMELINE_THREADS_CONFIG.maximumPixelRatio)) {
            resizeThreadsCanvas();
        }
        drawMainCurve();

        pointer.x =
            lerp(
                pointer.x,
                pointer.targetX,
                0.1
            );

        pointer.y =
            lerp(
                pointer.y,
                pointer.targetY,
                0.1
            );

        pointer.strength =
            lerp(
                pointer.strength,
                pointer.targetStrength,
                0.085
            );

        nodeFocus.x =
            lerp(
                nodeFocus.x,
                nodeFocus.targetX,
                0.09
            );

        nodeFocus.y =
            lerp(
                nodeFocus.y,
                nodeFocus.targetY,
                0.09
            );

        nodeFocus.strength =
            lerp(
                nodeFocus.strength,
                nodeFocus.targetStrength,
                0.075
            );

        const width =
            canvasWidth;

        const height =
            canvasHeight;

        threadsContext.clearRect(
            0,
            0,
            width,
            height
        );

        threadsContext.save();

        threadsContext.globalCompositeOperation =
            "screen";

        threadsContext.filter = "none";

        const activeIntensity =
            clamp(
                Math.max(
                    pointer.strength *
                        0.42,

                    nodeFocus.strength
                ),
                0,
                1
            );

        threadLines.forEach(
            thread => {
                drawThread(
                    thread,
                    width,
                    height,
                    activeIntensity
                );
            }
        );

        threadsContext.restore();

        animationFrameId =
            window.requestAnimationFrame(
                renderThreads
            );
    }


    /* ===========================
       13. Threads 生命周期
    =========================== */

    function startThreads() {
        if (!sectionVisible || document.hidden || !timelineSection.classList.contains("is-active")) return;
        resizeThreadsCanvas();
        if (
            reducedMotion ||
            !sectionVisible ||
            animationFrameId !==
                null
        ) {
            return;
        }

        lastFrameTime =
            performance.now();

        animationFrameId =
            window.requestAnimationFrame(
                renderThreads
            );
    }

    function stopThreads() {
        if (
            animationFrameId !==
            null
        ) {
            window.cancelAnimationFrame(
                animationFrameId
            );

            animationFrameId =
                null;
        }
    }

    function clearThreadsCanvas() {
        if (
            !threadsContext ||
            !threadsCanvas
        ) {
            return;
        }

        threadsContext.clearRect(
            0,
            0,
            canvasWidth,
            canvasHeight
        );
    }


    /* ===========================
       14. 隐藏时间轴详情
    =========================== */

    function hideTimelineDetails() {
        focusedItem = null;
        timelineDetails.forEach(
            detail => {
                detail.classList.remove(
                    "active"
                );

                detail.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        );

        timelineItems.forEach(
            item => {
                item.classList.remove(
                    "active"
                );

                item.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        );

        nodeFocus.selected =
            false;

        nodeFocus.active =
            false;

        nodeFocus.targetStrength =
            0;

        window.dispatchEvent(
            new CustomEvent(
                "timeline-thread-clear"
            )
        );
    }


    /* ===========================
       15. 显示时间轴详情
    =========================== */

    function showTimelineDetail(
        item,
        detail
    ) {
        hideTimelineDetails();

        item.classList.add(
            "active"
        );

        item.setAttribute(
            "aria-expanded",
            "true"
        );

        detail.classList.add(
            "active"
        );

        detail.setAttribute(
            "aria-hidden",
            "false"
        );

        updateNodeFocusPosition(
            item,
            true
        );

        window.dispatchEvent(
            new CustomEvent(
                "timeline-thread-select",
                {
                    detail: {
                        target:
                            detail.id,

                        item
                    }
                }
            )
        );
    }


    /* ===========================
       16. 选择时间轴节点
    =========================== */

    function selectTimelineItem(
        item
    ) {
        const targetId =
            item.dataset.target;

        if (!targetId) {
            console.error(
                "该时间轴节点没有设置 data-target。"
            );

            return;
        }

        const targetDetail =
            document.getElementById(
                targetId
            );

        if (!targetDetail) {
            console.error(
                `未找到时间轴事件详情: #${targetId}`
            );

            return;
        }

        const isCurrentItem =
            item.classList.contains(
                "active"
            );

        if (isCurrentItem) {
            hideTimelineDetails();
            return;
        }

        showTimelineDetail(
            item,
            targetDetail
        );
    }


    /* ===========================
       17. 时间轴节点事件
    =========================== */

    timelineItems.forEach(
        item => {
            item.setAttribute(
                "role",
                "button"
            );

            item.setAttribute(
                "tabindex",
                "0"
            );

            item.setAttribute(
                "aria-expanded",
                "false"
            );

            const targetId =
                item.dataset.target;

            if (targetId) {
                item.setAttribute(
                    "aria-controls",
                    targetId
                );
            }

            item.addEventListener(
                "pointerenter",
                () => {
                    if (
                        item.classList
                            .contains(
                                "active"
                            )
                    ) {
                        return;
                    }

                    updateNodeFocusPosition(
                        item,
                        false
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            "timeline-thread-hover",
                            {
                                detail: {
                                    item
                                }
                            }
                        )
                    );
                }
            );

            item.addEventListener(
                "pointerleave",
                () => {
                    const activeItem =
                        timelineSection
                            .querySelector(
                                ".timeline-item.active"
                            );

                    if (activeItem) {
                        updateNodeFocusPosition(
                            activeItem,
                            true
                        );

                        return;
                    }

                    nodeFocus.active =
                        false;

                    focusedItem = null;

                    nodeFocus.targetStrength =
                        0;

                    window.dispatchEvent(
                        new CustomEvent(
                            "timeline-thread-hover-clear"
                        )
                    );
                }
            );

            item.addEventListener(
                "focus",
                () => {
                    updateNodeFocusPosition(
                        item,
                        item.classList
                            .contains(
                                "active"
                            )
                    );
                }
            );

            item.addEventListener(
                "blur",
                () => {
                    const activeItem =
                        timelineSection
                            .querySelector(
                                ".timeline-item.active"
                            );

                    if (activeItem) {
                        updateNodeFocusPosition(
                            activeItem,
                            true
                        );

                        return;
                    }

                    nodeFocus.targetStrength =
                        0;
                    nodeFocus.active = false;
                    focusedItem = null;
                }
            );

            item.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    selectTimelineItem(
                        item
                    );
                }
            );

            item.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key !==
                            "Enter" &&
                        event.key !==
                            " "
                    ) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();

                    selectTimelineItem(
                        item
                    );
                }
            );
        }
    );


    /* ===========================
       18. 详情区域事件
    =========================== */

    timelineDetails.forEach(
        detail => {
            detail.setAttribute(
                "aria-hidden",
                "true"
            );

            detail.addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                }
            );
        }
    );


    /* ===========================
       19. 时间轴指针交互
    =========================== */

    timelineSection.addEventListener(
        "pointermove",
        event => {
            const rect =
                timelineSection
                    .getBoundingClientRect();

            if (
                rect.width <= 0 ||
                rect.height <= 0
            ) {
                return;
            }

            pointer.targetX =
                clamp(
                    (
                        event.clientX -
                        rect.left
                    ) /
                    rect.width,
                    0,
                    1
                );

            pointer.targetY =
                clamp(
                    (
                        event.clientY -
                        rect.top
                    ) /
                    rect.height,
                    0,
                    1
                );

            pointer.active =
                true;

            pointer.targetStrength =
                1;
        }
    );

    timelineSection.addEventListener(
        "pointerleave",
        () => {
            pointer.active =
                false;

            pointer.targetStrength =
                0;

            const activeItem =
                timelineSection
                    .querySelector(
                        ".timeline-item.active"
                    );

            if (activeItem) {
                updateNodeFocusPosition(
                    activeItem,
                    true
                );

                return;
            }

            nodeFocus.active =
                false;

            focusedItem = null;

            nodeFocus.targetStrength =
                0;
        }
    );


    /* ===========================
       20. 文档级事件
    =========================== */

    document.addEventListener(
        "click",
        event => {
            const clickedItem =
                event.target.closest(
                    ".timeline-item"
                );

            const clickedDetail =
                event.target.closest(
                    ".timeline-detail"
                );

            if (
                !clickedItem &&
                !clickedDetail
            ) {
                hideTimelineDetails();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                hideTimelineDetails();
            }
        }
    );


    /* ===========================
       21. 尺寸与可见性监听
    =========================== */

    resizeObserver =
        new ResizeObserver(
            () => {
                resizeThreadsCanvas();

                const activeItem =
                    timelineSection
                        .querySelector(
                            ".timeline-item.active"
                        );

                if (activeItem) {
                    updateNodeFocusPosition(
                        activeItem,
                        true
                    );
                }
            }
        );

    resizeObserver.observe(
        timelineSection
    );

    if (timelineTrack) resizeObserver.observe(timelineTrack);
    timelineScroll?.addEventListener("scroll", () => {
        if (focusedItem) updateNodeFocusPosition(focusedItem, nodeFocus.selected);
    }, { passive: true });

    function updateTimelineVisibility() {
        const rect = timelineSection.getBoundingClientRect();
        sectionVisible = timelineSection.classList.contains("is-active") &&
            rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight &&
            rect.right > 0 && rect.left < innerWidth;
        if (sectionVisible && !document.hidden) startThreads();
        else {
            stopThreads();
            clearThreadsCanvas();
        }
    }

    const sectionClassObserver = new MutationObserver(updateTimelineVisibility);
    sectionClassObserver.observe(timelineSection, { attributes: true, attributeFilter: ["class"] });
    let pixelRatioQuery = null;
    function watchPixelRatio() {
        pixelRatioQuery?.removeEventListener("change", handlePixelRatioChange);
        pixelRatioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
        pixelRatioQuery.addEventListener("change", handlePixelRatioChange);
    }
    function handlePixelRatioChange() {
        watchPixelRatio();
        resizeThreadsCanvas();
        updateTimelineVisibility();
    }
    watchPixelRatio();
    window.addEventListener("resize", () => {
        resizeThreadsCanvas();
        updateTimelineVisibility();
    }, { passive: true });
    document.addEventListener("visibilitychange", updateTimelineVisibility);
    window.addEventListener("pageshow", updateTimelineVisibility);
    window.addEventListener("pagehide", event => {
        stopThreads();
        if (!event.persisted) {
            resizeObserver.disconnect();
            intersectionObserver?.disconnect();
            sectionClassObserver.disconnect();
            pixelRatioQuery?.removeEventListener("change", handlePixelRatioChange);
        }
    });

    intersectionObserver =
        new IntersectionObserver(
            entries => {
                const entry =
                    entries[0];

                sectionVisible =
                    Boolean(
                        entry?.isIntersecting
                    ) &&
                    (
                        timelineSection
                            .classList
                            .contains(
                                "is-active"
                            ) ||
                        timelineSection
                            .classList
                            .contains(
                                "visible"
                            ) ||
                        timelineSection
                            .classList
                            .contains(
                                "depth-enter"
                            ) ||
                        timelineSection
                            .classList
                            .contains(
                                "slide-enter-left"
                            ) ||
                        timelineSection
                            .classList
                            .contains(
                                "slide-enter-right"
                            )
                    );

                if (sectionVisible) {
                    startThreads();
                } else {
                    stopThreads();
                    clearThreadsCanvas();
                }
            },
            {
                threshold:
                    0.01
            }
        );

    intersectionObserver.observe(
        timelineSection
    );


    /* ===========================
       22. 减少动态效果变化
    =========================== */

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    function handleReducedMotionChange(
        event
    ) {
        reducedMotion =
            event.matches;

        if (reducedMotion) {
            stopThreads();
            resizeThreadsCanvas();
            clearThreadsCanvas();
            return;
        }

        startThreads();
    }

    reducedMotionQuery.addEventListener?.(
        "change",
        handleReducedMotionChange
    );


    /* ===========================
       23. 初始化 Threads
    =========================== */

    if (createThreadsCanvas()) {
        createThreadLines();
        resizeThreadsCanvas();
    }


    /* ===========================
       24. 对外接口
    =========================== */

    window.hideTimelineDetails =
        hideTimelineDetails;

    window.refreshTimelineThreads =
        () => {
            updateTimelineVisibility();
            resizeThreadsCanvas();

            const activeItem =
                timelineSection
                    .querySelector(
                        ".timeline-item.active"
                    );

            if (activeItem) {
                updateNodeFocusPosition(
                    activeItem,
                    true
                );
            }

            startThreads();
        };

    window.stopTimelineThreads =
        () => {
            sectionVisible =
                false;

            stopThreads();
            clearThreadsCanvas();
        };
}
