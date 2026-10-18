/* ===========================
   世界观 · 事物 Option Wheel
=========================== */

let worldviewThingsInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeWorldviewThings() {
    if (worldviewThingsInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "worldview-things-section"
        );

    const wheel =
        document.getElementById(
            "things-option-wheel"
        );

    if (
        !section ||
        !wheel
    ) {
        return;
    }

    const options =
        Array.from(
            wheel.querySelectorAll(
                ".things-wheel-option"
            )
        );

    const centerButton =
        wheel.querySelector(
            ".things-wheel-center"
        );

    const currentName =
        wheel.querySelector(
            ".things-wheel-current-accessible"
        );

    const currentIndex =
        wheel.querySelector(
            ".things-wheel-index"
        );

    const currentStatus =
        wheel.querySelector(
            ".things-wheel-status"
        );

    const fuzzyTextCanvas =
        wheel.querySelector(
            ".things-wheel-fuzzy-text"
        );

    const fuzzyTextContext =
        fuzzyTextCanvas?.getContext(
            "2d"
        );

    if (
        options.length === 0 ||
        !centerButton ||
        !currentName ||
        !currentIndex ||
        !currentStatus ||
        !fuzzyTextCanvas ||
        !fuzzyTextContext
    ) {
        console.warn(
            "事物 Option Wheel 初始化失败：缺少必要元素。"
        );

        return;
    }

    worldviewThingsInitialized =
        true;


    /* ===========================
       基础状态
    =========================== */

    let selectedIndex =
        0;

    /*
     * 与循环后的 selectedIndex 分离，持续记录转轮实际走过的步数。
     * 这样从末项进入首项时，视觉角度仍只前进一格，
     * 不会因为索引从最大值跳回 0 而反向旋转一整圈。
     */
    let visualSelectedIndex =
        0;

    let dragging =
        false;

    let pointerInside =
        false;

    let activePointerId =
        null;

    let pointerStartX =
        0;

    let pointerStartY =
        0;

    let previousPointerX =
        0;

    let previousPointerY =
        0;

    let accumulatedDrag =
        0;

    let totalDragDistance =
        0;

    let suppressClick =
        false;

    let wheelLocked =
        false;

    let wheelUnlockTimeout =
        null;

    let centerTextTimeout =
        null;

    let lenisStoppedByWheel =
        false;


    /* ===========================
       Shape Blur 状态
    =========================== */

    let shapePointerX =
        0.5;

    let shapePointerY =
        0.5;

    let shapeStrength =
        0;

    let shapeTargetStrength =
        0;

    let shapeDriftX =
        0;

    let shapeDriftY =
        0;

    let shapeTargetDriftX =
        0;

    let shapeTargetDriftY =
        0;


    /* ===========================
       Fuzzy Text 状态
    =========================== */

    let fuzzyText =
        "Bossrush";

    let fuzzyIntensity =
        0.18;

    let fuzzyTargetIntensity =
        0.18;

    let fuzzyCanvasWidth =
        0;

    let fuzzyCanvasHeight =
        0;


    /* ===========================
       动画状态
    =========================== */

    let visualAnimationFrameId =
        null;

    let visualEffectsActive =
        false;

    let wheelVisible = true;


    /* ===========================
       常量
    =========================== */

    const optionCount =
        options.length;

    const angleStep =
        360 /
        optionCount;

    const dragStepThreshold =
        42;

    const clickSuppressionDistance =
        7;

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    const finePointerQuery =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );


    /* ===========================
       通用工具
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

    function normalizeIndex(
        index
    ) {
        return (
            (
                index %
                optionCount
            ) +
            optionCount
        ) %
        optionCount;
    }

    function getSelectedOption() {
        return (
            options[
                selectedIndex
            ] ||
            null
        );
    }

    function isSectionActive() {
        return (
            section.classList.contains(
                "is-active"
            ) ||
            section.classList.contains(
                "depth-enter"
            ) ||
            section.classList.contains(
                "slide-enter-left"
            ) ||
            section.classList.contains(
                "slide-enter-right"
            )
        );
    }


    /* ===========================
       Lenis 控制
    =========================== */

    function stopPageScrolling() {
        if (lenisStoppedByWheel) {
            return;
        }

        if (
            window.lenis &&
            typeof window.lenis.stop ===
                "function"
        ) {
            window.lenis.stop();

            lenisStoppedByWheel =
                true;
        }
    }

    function restorePageScrolling() {
        if (!lenisStoppedByWheel) {
            return;
        }

        if (
            window.lenis &&
            typeof window.lenis.start ===
                "function"
        ) {
            window.lenis.start();
        }

        lenisStoppedByWheel =
            false;
    }


    /* ===========================
       文字选择控制
    =========================== */

    function disableTextSelection() {
        document.body.classList.add(
            "is-things-wheel-dragging"
        );
    }

    function restoreTextSelection() {
        document.body.classList.remove(
            "is-things-wheel-dragging"
        );
    }


    /* ===========================
       更新轮盘
    =========================== */

    function updateWheel(
        nextIndex,
        animateCenter = true
    ) {
        const normalizedNextIndex =
            normalizeIndex(
                nextIndex
            );

        let indexDifference =
            nextIndex -
            selectedIndex;

        /*
         * 点击非相邻选项时选择最短方向；滚轮、拖动和方向键
         * 传入的 +1 / -1（包括越过首尾）则会自然保持原方向。
         */
        while (
            indexDifference >
            optionCount / 2
        ) {
            indexDifference -=
                optionCount;
        }

        while (
            indexDifference <
            -optionCount / 2
        ) {
            indexDifference +=
                optionCount;
        }

        visualSelectedIndex +=
            indexDifference;

        selectedIndex =
            normalizedNextIndex;

        options.forEach(
            (
                option,
                index
            ) => {
                const relativeIndex =
                    index -
                    visualSelectedIndex;

                const angle =
                    relativeIndex *
                    angleStep;

                option.style.setProperty(
                    "--things-option-angle",
                    `${angle}deg`
                );

                const isSelected =
                    index ===
                    selectedIndex;

                option.classList.toggle(
                    "is-selected",
                    isSelected
                );

                option.setAttribute(
                    "aria-selected",
                    String(
                        isSelected
                    )
                );

                option.tabIndex =
                    isSelected
                        ? 0
                        : -1;
            }
        );

        updateCenterContent(
            animateCenter
        );

        const selectedOption =
            getSelectedOption();

        window.dispatchEvent(
            new CustomEvent(
                "worldview-things-change",
                {
                    detail: {
                        index:
                            selectedIndex,

                        option:
                            selectedOption,

                        id:
                            selectedOption
                                ?.dataset
                                .thingsId ||
                            "",

                        sectionId:
                            selectedOption
                                ?.dataset
                                .sectionId ||
                            ""
                    }
                }
            )
        );
    }


    /* ===========================
       更新中心内容
    =========================== */

    function updateCenterContent(
        animate
    ) {
        const option =
            getSelectedOption();

        if (!option) {
            return;
        }

        const label =
            option.textContent
                .trim();

        const sectionId =
            option.dataset
                .sectionId ||
            "";

        const isAvailable =
            sectionId.length >
            0;

        if (centerTextTimeout) {
            window.clearTimeout(
                centerTextTimeout
            );

            centerTextTimeout =
                null;
        }

        function applyCenterContent() {
            currentName.textContent =
                label;

            fuzzyText =
                label;

            currentIndex.textContent =
                `${String(
                    selectedIndex +
                        1
                ).padStart(
                    2,
                    "0"
                )} / ${String(
                    optionCount
                ).padStart(
                    2,
                    "0"
                )}`;

            currentStatus.textContent =
                isAvailable
                    ? "进入档案"
                    : "尚未开放";

            centerButton.classList.toggle(
                "is-unavailable",
                !isAvailable
            );

            centerButton.setAttribute(
                "aria-label",
                isAvailable
                    ? `打开${label}档案`
                    : `${label}尚未开放`
            );

            resizeFuzzyTextCanvas();

            fuzzyTextCanvas.classList.remove(
                "is-changing"
            );

            centerTextTimeout =
                null;
        }

        if (
            !animate ||
            reducedMotionQuery.matches
        ) {
            fuzzyTextCanvas.classList.remove(
                "is-changing"
            );

            applyCenterContent();

            return;
        }

        fuzzyTextCanvas.classList.add(
            "is-changing"
        );

        centerTextTimeout =
            window.setTimeout(
                applyCenterContent,
                150
            );
    }


    /* ===========================
       打开当前项目
    =========================== */

    async function openSelectedOption() {
        const option =
            getSelectedOption();

        if (!option) {
            return false;
        }

        const sectionId =
            option.dataset
                .sectionId ||
            "";

        const itemId =
            option.dataset
                .thingsId ||
            "";

        const label =
            option.textContent
                .trim();

        if (!sectionId) {
            window.dispatchEvent(
                new CustomEvent(
                    "worldview-things-unavailable",
                    {
                        detail: {
                            id:
                                itemId,

                            label,

                            category:
                                "things",

                            sourceElement:
                                centerButton
                        }
                    }
                )
            );

            console.info(
                `世界观事物“${label}”暂未开放。`
            );

            return false;
        }

        const targetSection =
            document.getElementById(
                sectionId
            );

        if (!targetSection) {
            console.error(
                `未找到事物目标区块：#${sectionId}`
            );

            return false;
        }

        if (
            typeof window.showSection !==
            "function"
        ) {
            console.error(
                "全局 showSection 尚未初始化。"
            );

            return false;
        }

        resetInteractionState();

        const result =
            await window.showSection(
                sectionId,
                {
                    transitionType:
                        "slide",

                    direction:
                        "forward",

                    scrollMode:
                        "top",

                    historyMode:
                        "push"
                }
            );

        return result !==
            false;
    }


    /* ===========================
       Fuzzy Text：源文字逐行切片
       参考参数：900 字重、0.18 / 0.5 强度、1px 切片、60fps
    =========================== */

    const fuzzySource = document.createElement("canvas");
    const fuzzySourceContext = fuzzySource.getContext("2d");
    let fuzzyPixelRatio = 1;
    let fuzzyInk = "";
    let fuzzyFont = "";
    let fuzzyRange = 30;
    let fuzzyInkBounds = { left: 0, top: 0, width: 0, height: 0 };
    let lastFuzzyFrame = 0;
    let lastFuzzyInkCheck = 0;

    function paintFuzzySource() {
        if (!fuzzySourceContext || !fuzzyFont) return;
        fuzzySourceContext.setTransform(1, 0, 0, 1, 0, 0);
        fuzzySourceContext.clearRect(0, 0, fuzzySource.width, fuzzySource.height);
        fuzzySourceContext.setTransform(fuzzyPixelRatio, 0, 0, fuzzyPixelRatio, 0, 0);
        fuzzySourceContext.font = fuzzyFont;
        fuzzySourceContext.textBaseline = "alphabetic";
        fuzzySourceContext.fillStyle = fuzzyInk;
        const metrics = fuzzySourceContext.measureText(fuzzyText);
        fuzzySourceContext.fillText(
            fuzzyText,
            5 + (metrics.actualBoundingBoxLeft || 0),
            metrics.actualBoundingBoxAscent || parseFloat(fuzzyFont.split(" ")[1])
        );
    }

    function resizeFuzzyTextCanvas() {
        const rect = fuzzyTextCanvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || !fuzzySourceContext) return;

        fuzzyCanvasWidth = rect.width;
        fuzzyCanvasHeight = rect.height;
        fuzzyPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        // 窄屏缩小扰动留白，为长名称保留完整的文字空间。
        fuzzyRange = Math.min(30, Math.max(12, rect.width * 0.1));
        const style = getComputedStyle(fuzzyTextCanvas);
        const family = style.fontFamily || 'Arial, "Microsoft YaHei", sans-serif';
        let fontSize = Math.min(50, Math.max(24, rect.width / 6));
        const availableWidth = Math.max(1, rect.width - (fuzzyRange + 8) * 2 - 10);
        fuzzySourceContext.font = `900 ${fontSize}px ${family}`;
        const initialWidth = fuzzySourceContext.measureText(fuzzyText).width;
        if (initialWidth > availableWidth) fontSize *= availableWidth / initialWidth;
        fuzzyFont = `900 ${fontSize}px ${family}`;
        fuzzySourceContext.font = fuzzyFont;
        const metrics = fuzzySourceContext.measureText(fuzzyText);
        const width = Math.ceil(
            (metrics.actualBoundingBoxLeft || 0) +
            (metrics.actualBoundingBoxRight ?? metrics.width)
        );
        const height = Math.ceil(
            (metrics.actualBoundingBoxAscent ?? fontSize) +
            (metrics.actualBoundingBoxDescent ?? fontSize * 0.2)
        );
        fuzzySource.width = Math.max(1, Math.ceil((width + 10) * fuzzyPixelRatio));
        fuzzySource.height = Math.max(1, Math.ceil(height * fuzzyPixelRatio));
        fuzzyTextCanvas.width = Math.max(1, Math.round(rect.width * fuzzyPixelRatio));
        fuzzyTextCanvas.height = Math.max(1, Math.round(rect.height * fuzzyPixelRatio));
        fuzzyInkBounds = {
            left: (rect.width - width) / 2,
            top: (rect.height - height) / 2,
            width,
            height
        };
        fuzzyInk = style.color || "#eeeeee";
        paintFuzzySource();
        lastFuzzyFrame = 0;
        drawFuzzyText();
    }

    function drawFuzzyText(currentTime = performance.now()) {
        if (!fuzzySource.width || !fuzzyCanvasWidth || !fuzzyCanvasHeight) return;
        // 源文字仅在内容、尺寸、字体或颜色变化时重绘。
        if (currentTime - lastFuzzyInkCheck > 250) {
            lastFuzzyInkCheck = currentTime;
            const ink = getComputedStyle(fuzzyTextCanvas).color || "#eeeeee";
            if (ink !== fuzzyInk) {
                fuzzyInk = ink;
                paintFuzzySource();
            }
        }
        fuzzyTextContext.setTransform(1, 0, 0, 1, 0, 0);
        fuzzyTextContext.clearRect(0, 0, fuzzyTextCanvas.width, fuzzyTextCanvas.height);
        const amplitude = (reducedMotionQuery.matches ? 0 : fuzzyIntensity) *
            fuzzyRange * fuzzyPixelRatio;
        const x = Math.round((fuzzyTextCanvas.width - fuzzySource.width) / 2);
        const y = Math.round((fuzzyTextCanvas.height - fuzzySource.height) / 2);
        if (amplitude < 0.5) {
            fuzzyTextContext.drawImage(fuzzySource, x, y);
            return;
        }
        const sliceSize = Math.max(1, Math.round(fuzzyPixelRatio));
        for (let row = 0; row < fuzzySource.height; row += sliceSize) {
            const height = Math.min(sliceSize, fuzzySource.height - row);
            const shift = Math.round((Math.random() - 0.5) * amplitude);
            fuzzyTextContext.drawImage(
                fuzzySource, 0, row, fuzzySource.width, height,
                x + shift, y + row, fuzzySource.width, height
            );
        }
    }


    /* ===========================
       Shape Blur 指针位置
    =========================== */

    function updateShapePointer(
        event
    ) {
        if (
            !finePointerQuery.matches ||
            reducedMotionQuery.matches
        ) {
            return;
        }

        const rect =
            wheel.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        shapePointerX =
            clamp(
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width,
                0,
                1
            );

        shapePointerY =
            clamp(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height,
                0,
                1
            );

        shapeTargetDriftX =
            (
                shapePointerX -
                    0.5
            ) *
            34;

        shapeTargetDriftY =
            (
                shapePointerY -
                    0.5
            ) *
            34;

        shapeTargetStrength =
            1.35;

        wheel.style.setProperty(
            "--things-blur-x",
            `${(
                shapePointerX *
                100
            ).toFixed(
                2
            )}%`
        );

        wheel.style.setProperty(
            "--things-blur-y",
            `${(
                shapePointerY *
                100
            ).toFixed(
                2
            )}%`
        );

        wheel.classList.add(
            "is-shape-active"
        );
    }

    function clearShapePointer() {
        shapeTargetStrength =
            0;

        shapeTargetDriftX =
            0;

        shapeTargetDriftY =
            0;

        wheel.classList.remove(
            "is-shape-active"
        );
    }


    /* ===========================
       视觉动画循环
    =========================== */

    function animateVisualEffects(
        currentTime
    ) {
        if (
            !visualEffectsActive ||
            !isSectionActive() || document.hidden || !wheelVisible
        ) {
            visualAnimationFrameId =
                null;

            return;
        }

        fuzzyIntensity = fuzzyTargetIntensity;

        shapeStrength =
            clamp(
                lerp(
                    shapeStrength,
                    shapeTargetStrength,
                    0.14
                ),
                0,
                1.35
            );

        shapeDriftX =
            lerp(
                shapeDriftX,
                shapeTargetDriftX,
                0.1
            );

        shapeDriftY =
            lerp(
                shapeDriftY,
                shapeTargetDriftY,
                0.1
            );

        const pulse =
            1 +
            Math.sin(
                currentTime *
                0.0018
            ) *
            0.004 *
            shapeStrength;

        wheel.style.setProperty(
            "--things-blur-strength",
            shapeStrength.toFixed(
                3
            )
        );

        wheel.style.setProperty(
            "--things-blur-drift-x",
            `${shapeDriftX.toFixed(
                2
            )}px`
        );

        wheel.style.setProperty(
            "--things-blur-drift-y",
            `${shapeDriftY.toFixed(
                2
            )}px`
        );

        wheel.style.setProperty(
            "--things-blur-scale",
            pulse.toFixed(
                4
            )
        );

        if (currentTime - lastFuzzyFrame >= 1000 / 60 - 1) {
            lastFuzzyFrame = currentTime;
            drawFuzzyText(currentTime);
        }

        visualAnimationFrameId =
            window.requestAnimationFrame(
                animateVisualEffects
            );
    }

    function startVisualEffects() {
        if (!isSectionActive() || document.hidden || !wheelVisible) return;
        if (reducedMotionQuery.matches) {
            stopVisualEffects();
            resizeFuzzyTextCanvas();
            return;
        }
        visualEffectsActive =
            true;

        resizeFuzzyTextCanvas();

        if (
            visualAnimationFrameId !==
            null
        ) {
            return;
        }

        visualAnimationFrameId =
            window.requestAnimationFrame(
                animateVisualEffects
            );
    }

    function stopVisualEffects() {
        visualEffectsActive =
            false;

        if (
            visualAnimationFrameId ===
            null
        ) {
            return;
        }

        window.cancelAnimationFrame(
            visualAnimationFrameId
        );

        visualAnimationFrameId =
            null;
    }


    /* ===========================
       滚轮锁
    =========================== */

    function lockWheelBriefly() {
        wheelLocked =
            true;

        if (wheelUnlockTimeout) {
            window.clearTimeout(
                wheelUnlockTimeout
            );
        }

        wheelUnlockTimeout =
            window.setTimeout(
                () => {
                    wheelLocked =
                        false;

                    wheelUnlockTimeout =
                        null;
                },
                240
            );
    }


    /* ===========================
       滚轮操作
    =========================== */

    function handleWheel(
        event
    ) {
        if (!isSectionActive()) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        stopPageScrolling();

        if (wheelLocked) {
            return;
        }

        const verticalDelta =
            Math.abs(
                event.deltaY
            );

        const horizontalDelta =
            Math.abs(
                event.deltaX
            );

        const primaryDelta =
            verticalDelta >=
            horizontalDelta
                ? event.deltaY
                : event.deltaX;

        if (
            Math.abs(
                primaryDelta
            ) <
            1
        ) {
            return;
        }

        const direction =
            primaryDelta >
            0
                ? 1
                : -1;

        updateWheel(
            selectedIndex +
                direction
        );

        lockWheelBriefly();
    }


    /* ===========================
       指针进入与离开
    =========================== */

    function handlePointerEnter() {
        pointerInside =
            true;

        stopPageScrolling();

        if (
            finePointerQuery.matches &&
            !reducedMotionQuery.matches
        ) {
            shapeTargetStrength =
                0.72;

            wheel.classList.add(
                "is-shape-active"
            );
        }
    }

    function handlePointerLeave() {
        pointerInside =
            false;

        clearShapePointer();

        if (!dragging) {
            restorePageScrolling();
        }
    }


    /* ===========================
       中心文字悬停
    =========================== */

    function handleCenterPointerEnter(event) {
        if (
            reducedMotionQuery.matches
        ) {
            return;
        }

        const rect = fuzzyTextCanvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * fuzzyCanvasWidth / (rect.width || 1);
        const y = (event.clientY - rect.top) * fuzzyCanvasHeight / (rect.height || 1);
        const overText = finePointerQuery.matches && event.pointerType !== "touch" &&
            x >= fuzzyInkBounds.left && x <= fuzzyInkBounds.left + fuzzyInkBounds.width &&
            y >= fuzzyInkBounds.top && y <= fuzzyInkBounds.top + fuzzyInkBounds.height;
        fuzzyTargetIntensity = overText ? 0.5 : 0.18;
    }

    function handleCenterPointerLeave() {
        fuzzyTargetIntensity =
            0.18;
    }


    /* ===========================
       开始拖动
    =========================== */

    function handlePointerDown(
        event
    ) {
        if (
            event.button !==
                undefined &&
            event.button !==
                0
        ) {
            return;
        }

        if (!isSectionActive()) {
            return;
        }

        const clickedControl =
            event.target.closest(
                [
                    ".things-wheel-option",
                    ".things-wheel-center"
                ].join(",")
            );

        /*
         * 点击按钮时保留正常 click，
         * 不进入拖动模式。
         */
        if (clickedControl) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        dragging =
            true;

        suppressClick =
            false;

        activePointerId =
            event.pointerId;

        pointerStartX =
            event.clientX;

        pointerStartY =
            event.clientY;

        previousPointerX =
            event.clientX;

        previousPointerY =
            event.clientY;

        accumulatedDrag =
            0;

        totalDragDistance =
            0;

        wheel.classList.add(
            "is-dragging"
        );

        disableTextSelection();
        stopPageScrolling();

        wheel.setPointerCapture?.(
            event.pointerId
        );
    }


    /* ===========================
       拖动过程
    =========================== */

    function handlePointerMove(
        event
    ) {
        updateShapePointer(
            event
        );

        if (
            !dragging ||
            event.pointerId !==
                activePointerId
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const deltaX =
            event.clientX -
            previousPointerX;

        const deltaY =
            event.clientY -
            previousPointerY;

        previousPointerX =
            event.clientX;

        previousPointerY =
            event.clientY;

        totalDragDistance +=
            Math.hypot(
                deltaX,
                deltaY
            );

        if (
            totalDragDistance >
            clickSuppressionDistance
        ) {
            suppressClick =
                true;
        }

        const totalHorizontal =
            event.clientX -
            pointerStartX;

        const totalVertical =
            event.clientY -
            pointerStartY;

        const useHorizontal =
            Math.abs(
                totalHorizontal
            ) >
            Math.abs(
                totalVertical
            ) *
            1.2;

        accumulatedDrag +=
            useHorizontal
                ? deltaX
                : -deltaY;

        while (
            Math.abs(
                accumulatedDrag
            ) >=
            dragStepThreshold
        ) {
            const direction =
                accumulatedDrag >
                0
                    ? 1
                    : -1;

            updateWheel(
                selectedIndex +
                    direction
            );

            accumulatedDrag -=
                direction *
                dragStepThreshold;
        }
    }


    /* ===========================
       结束拖动
    =========================== */

    function finishPointerInteraction(
        event = null
    ) {
        if (!dragging) {
            return;
        }

        if (
            event &&
            activePointerId !==
                null &&
            event.pointerId !==
                activePointerId
        ) {
            return;
        }

        dragging =
            false;

        wheel.classList.remove(
            "is-dragging"
        );

        restoreTextSelection();

        if (
            event &&
            wheel.hasPointerCapture?.(
                event.pointerId
            )
        ) {
            wheel.releasePointerCapture(
                event.pointerId
            );
        }

        activePointerId =
            null;

        accumulatedDrag =
            0;

        totalDragDistance =
            0;

        if (suppressClick) {
            window.setTimeout(
                () => {
                    suppressClick =
                        false;
                },
                0
            );
        }

        if (!pointerInside) {
            restorePageScrolling();
        }
    }

    function handlePointerUp(
        event
    ) {
        if (!dragging) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        finishPointerInteraction(
            event
        );
    }

    function handlePointerCancel(
        event
    ) {
        finishPointerInteraction(
            event
        );
    }

    function handleLostPointerCapture(
        event
    ) {
        finishPointerInteraction(
            event
        );
    }


    /* ===========================
       圆周选项点击
    =========================== */

    function handleOptionClick(
        event,
        index
    ) {
        event.preventDefault();
        event.stopPropagation();

        if (suppressClick) {
            return;
        }

        /*
         * 再次点击当前项时进入档案。
         */
        if (
            index ===
            selectedIndex
        ) {
            openSelectedOption();

            return;
        }

        updateWheel(
            index
        );

        centerButton.focus({
            preventScroll:
                true
        });
    }


    /* ===========================
       中央按钮点击
    =========================== */

    function handleCenterClick(
        event
    ) {
        event.preventDefault();
        event.stopPropagation();

        if (
            suppressClick ||
            dragging
        ) {
            return;
        }

        openSelectedOption();
    }


    /* ===========================
       键盘控制
    =========================== */

    function handleKeyDown(
        event
    ) {
        if (
            event.key ===
                "ArrowDown" ||
            event.key ===
                "ArrowRight"
        ) {
            event.preventDefault();
            event.stopPropagation();

            updateWheel(
                selectedIndex +
                    1
            );

            return;
        }

        if (
            event.key ===
                "ArrowUp" ||
            event.key ===
                "ArrowLeft"
        ) {
            event.preventDefault();
            event.stopPropagation();

            updateWheel(
                selectedIndex -
                    1
            );

            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            event.stopPropagation();

            updateWheel(
                0
            );

            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            event.stopPropagation();

            updateWheel(
                optionCount -
                    1
            );

            return;
        }

        if (
            event.key ===
                "Enter" ||
            event.key ===
                " "
        ) {
            event.preventDefault();
            event.stopPropagation();

            openSelectedOption();
        }
    }


    /* ===========================
       禁止浏览器原生拖动
    =========================== */

    function handleDragStart(
        event
    ) {
        event.preventDefault();
        event.stopPropagation();
    }

    function handleSelectStart(
        event
    ) {
        if (
            dragging ||
            wheel.contains(
                event.target
            )
        ) {
            event.preventDefault();
        }
    }


    /* ===========================
       重置状态
    =========================== */

    function resetInteractionState() {
        dragging =
            false;

        pointerInside =
            false;

        activePointerId =
            null;

        accumulatedDrag =
            0;

        totalDragDistance =
            0;

        suppressClick =
            false;

        fuzzyTargetIntensity =
            0.18;

        clearShapePointer();

        wheel.classList.remove(
            "is-dragging"
        );

        restoreTextSelection();
        restorePageScrolling();
    }


    /* ===========================
       区块状态变化
    =========================== */

    function updateSectionState() {
        if (isSectionActive()) {
            window.requestAnimationFrame(
                () => {
                    resizeFuzzyTextCanvas();
                    startVisualEffects();
                }
            );

            return;
        }

        resetInteractionState();
        stopVisualEffects();
    }

    const sectionClassObserver =
        new MutationObserver(
            updateSectionState
        );

    sectionClassObserver.observe(
        section,
        {
            attributes:
                true,

            attributeFilter:
                [
                    "class"
                ]
        }
    );

    const wheelVisibilityObserver = typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            wheelVisible = entry.isIntersecting;
            if (wheelVisible) updateSectionState();
            else stopVisualEffects();
        })
        : null;
    wheelVisibilityObserver?.observe(wheel);


    /* ===========================
       系统设置变化
    =========================== */

    function handleReducedMotionChange(
        event
    ) {
        if (event.matches) {
            stopVisualEffects();
            fuzzyTargetIntensity =
                0;

            shapeTargetStrength =
                0;

            shapeStrength =
                0;

            wheel.style.setProperty(
                "--things-blur-strength",
                "0"
            );

            drawFuzzyText();

            return;
        }

        fuzzyTargetIntensity =
            0.18;

        if (isSectionActive()) {
            startVisualEffects();
        }
    }


    /* ===========================
       圆周选项事件
    =========================== */

    options.forEach(
        (
            option,
            index
        ) => {
            option.addEventListener(
                "click",
                event => {
                    handleOptionClick(
                        event,
                        index
                    );
                }
            );

            option.addEventListener(
                "dragstart",
                handleDragStart
            );
        }
    );


    /* ===========================
       中央按钮事件
    =========================== */

    centerButton.addEventListener(
        "click",
        handleCenterClick
    );

    centerButton.addEventListener(
        "pointerenter",
        handleCenterPointerEnter
    );

    centerButton.addEventListener(
        "pointerleave",
        handleCenterPointerLeave
    );

    centerButton.addEventListener("pointermove", handleCenterPointerEnter);
    centerButton.addEventListener("pointercancel", handleCenterPointerLeave);

    centerButton.addEventListener(
        "dragstart",
        handleDragStart
    );


    /* ===========================
       轮盘事件
    =========================== */

    wheel.addEventListener(
        "wheel",
        handleWheel,
        {
            passive:
                false,

            capture:
                true
        }
    );

    wheel.addEventListener(
        "pointerenter",
        handlePointerEnter
    );

    wheel.addEventListener(
        "pointerleave",
        handlePointerLeave
    );

    wheel.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    wheel.addEventListener(
        "pointermove",
        handlePointerMove
    );

    wheel.addEventListener(
        "pointerup",
        handlePointerUp
    );

    wheel.addEventListener(
        "pointercancel",
        handlePointerCancel
    );

    wheel.addEventListener(
        "lostpointercapture",
        handleLostPointerCapture
    );

    wheel.addEventListener(
        "dragstart",
        handleDragStart
    );

    wheel.addEventListener(
        "selectstart",
        handleSelectStart
    );

    wheel.addEventListener(
        "keydown",
        handleKeyDown
    );

    wheel.addEventListener(
        "contextmenu",
        event => {
            if (dragging) {
                event.preventDefault();
            }
        }
    );


    /* ===========================
       页面级事件
    =========================== */

    window.addEventListener(
        "resize",
        resizeFuzzyTextCanvas
    );

    window.addEventListener(
        "blur",
        () => {
            resetInteractionState();
        }
    );

    window.addEventListener(
        "pagehide",
        event => {
            resetInteractionState();
            stopVisualEffects();
            if (!event.persisted) {
                wheelVisibilityObserver?.disconnect();
                sectionClassObserver.disconnect();
            }
        }
    );

    window.addEventListener("pageshow", updateSectionState);

    document.fonts?.ready.then(() => {
        if (isSectionActive()) resizeFuzzyTextCanvas();
    });

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                resetInteractionState();
                stopVisualEffects();

                return;
            }

            updateSectionState();
        }
    );

    reducedMotionQuery
        .addEventListener?.(
            "change",
            handleReducedMotionChange
        );


    /* ===========================
       初始状态
    =========================== */

    updateWheel(
        0,
        false
    );

    resizeFuzzyTextCanvas();
    drawFuzzyText();
    updateSectionState();
}
