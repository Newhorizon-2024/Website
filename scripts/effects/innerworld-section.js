/* ===========================
   里世界独立区块
=========================== */

let innerworldInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeInnerworldSection() {
    if (innerworldInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "innerworld-section"
        );

    if (!section) {
        return;
    }

    innerworldInitialized =
        true;

    const revealTextElements =
        Array.from(
            section.querySelectorAll(
                [
                    ".innerworld-title",
                    ".innerworld-chapter-header h2",
                    ".innerworld-copy p",
                    ".innerworld-figure figcaption",
                    ".innerworld-testimony-header h2",
                    ".innerworld-quote p",
                    ".innerworld-quote cite",
                    ".innerworld-ending > h2"
                ].join(",")
            )
        );

    const imageFrames =
        Array.from(
            section.querySelectorAll(
                ".innerworld-image-frame"
            )
        );

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    const finePointerQuery =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );

    let sectionActive =
        false;

    let revealWords =
        [];

    let scrollRevealFrameId =
        null;

    let sectionObserver =
        null;

    let mutationObserver =
        null;

    let animationFrameId =
        null;

    let previousFrameTime =
        performance.now();

    let elapsedTime =
        0;

    let currentPointerX =
        0;

    let currentPointerY =
        0;

    let targetPointerX =
        0;

    let targetPointerY =
        0;


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


    /* ===========================
       判断区块状态
    =========================== */

    function isSectionDisplayed() {
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

    function updateSectionState() {
        const nextActive =
            isSectionDisplayed();

        if (
            nextActive ===
            sectionActive
        ) {
            return;
        }

        sectionActive =
            nextActive;

        if (sectionActive) {
            showInnerworldSection();
        } else {
            hideInnerworldSection();
        }
    }


    /* ===========================
       显示区块
    =========================== */

    function showInnerworldSection() {
        section.classList.remove(
            "is-innerworld-ready"
        );

        window.requestAnimationFrame(
            () => {
                if (!sectionActive) {
                    return;
                }

                section.classList.add(
                    "is-innerworld-ready"
                );

                requestScrollRevealUpdate();
                startAnimation();
            }
        );
    }


    /* ===========================
       隐藏区块
    =========================== */

    function hideInnerworldSection() {
        section.classList.remove(
            "is-innerworld-ready"
        );

        stopAnimation();

        if (
            scrollRevealFrameId !==
            null
        ) {
            window.cancelAnimationFrame(
                scrollRevealFrameId
            );

            scrollRevealFrameId =
                null;
        }

        resetPointerState();
        resetImageFrames();
    }


    /* ===========================
        Scroll Reveal 文字拆分
    =========================== */

    function initializeScrollReveal() {
        if (
            reducedMotionQuery.matches
        ) {
            return;
        }

        revealTextElements.forEach(
            element => {
                splitTextIntoRevealWords(
                    element
                );
            }
        );

        revealWords =
            Array.from(
                section.querySelectorAll(
                    ".innerworld-reveal-word"
                )
            );

        updateScrollReveal();
    }


    /* ===========================
    拆分文字
    =========================== */

    function splitTextIntoRevealWords(
        element
    ) {
        if (
            !element ||
            element.dataset
                .scrollRevealReady ===
                "true"
        ) {
            return;
        }

        element.dataset.scrollRevealReady =
            "true";

        const textNodes =
            [];

        const walker =
            document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode(node) {
                        if (
                            !node.nodeValue ||
                            node.nodeValue
                                .trim() ===
                                ""
                        ) {
                            return NodeFilter
                                .FILTER_REJECT;
                        }

                        const parent =
                            node.parentElement;

                        if (
                            parent?.closest(
                                ".innerworld-reveal-word"
                            )
                        ) {
                            return NodeFilter
                                .FILTER_REJECT;
                        }

                        return NodeFilter
                            .FILTER_ACCEPT;
                    }
                }
            );

        let currentNode =
            walker.nextNode();

        while (currentNode) {
            textNodes.push(
                currentNode
            );

            currentNode =
                walker.nextNode();
        }

        textNodes.forEach(
            textNode => {
                const fragment =
                    document
                        .createDocumentFragment();

                /*
                * 中文按单字拆分；
                * 英文单词与标点尽量维持整体。
                */
                const tokens =
                    tokenizeRevealText(
                        textNode.nodeValue
                    );

                tokens.forEach(
                    token => {
                        if (
                            /^\s+$/.test(
                                token
                            )
                        ) {
                            const space =
                                document
                                    .createTextNode(
                                        token
                                    );

                            fragment.appendChild(
                                space
                            );

                            return;
                        }

                        const word =
                            document
                                .createElement(
                                    "span"
                                );

                        word.className =
                            "innerworld-reveal-word";

                        word.textContent =
                            token;

                        fragment.appendChild(
                            word
                        );
                    }
                );

                textNode.parentNode
                    ?.replaceChild(
                        fragment,
                        textNode
                    );
            }
        );
    }


    /* ===========================
    中英文分词
    =========================== */

    function tokenizeRevealText(
        text
    ) {
        return text.match(
            /[\u3400-\u9FFF]|[A-Za-z0-9]+(?:['’_-][A-Za-z0-9]+)*|[^\s]|[\s]+/g
        ) || [];
    }


    /* ===========================
    更新单词显现进度
    =========================== */

    function updateScrollReveal() {
        scrollRevealFrameId =
            null;

        if (
            !sectionActive ||
            reducedMotionQuery.matches ||
            revealWords.length ===
                0
        ) {
            return;
        }

        const viewportHeight =
            window.innerHeight;

        /*
        * 显现区间：
        * 元素进入视口底部约 92% 时开始，
        * 到达视口约 40% 时基本清晰。
        */
        const revealStart =
            viewportHeight *
            0.92;

        const revealEnd =
            viewportHeight *
            0.4;

        revealWords.forEach(
            (
                word,
                index
            ) => {
                const rect =
                    word.getBoundingClientRect();

                /*
                * 同一行中的词加入少量顺序偏移，
                * 形成连续向前解锁的效果。
                */
                const stagger =
                    (
                        index %
                        18
                    ) *
                    2.4;

                const adjustedTop =
                    rect.top +
                    stagger;

                const progress =
                    clamp(
                        (
                            revealStart -
                            adjustedTop
                        ) /
                        (
                            revealStart -
                            revealEnd
                        ),
                        0,
                        1
                    );

                /*
                * 使用平滑曲线，而不是线性突变。
                */
                const easedProgress =
                    progress *
                    progress *
                    (
                        3 -
                        2 *
                        progress
                    );

                const blur =
                    (
                        1 -
                        easedProgress
                    ) *
                    10;

                const opacity =
                    0.08 +
                    easedProgress *
                    0.92;

                const shift =
                    (
                        1 -
                        easedProgress
                    ) *
                    10;

                word.style.setProperty(
                    "--innerworld-word-blur",
                    `${blur.toFixed(2)}px`
                );

                word.style.setProperty(
                    "--innerworld-word-opacity",
                    opacity.toFixed(3)
                );

                word.style.setProperty(
                    "--innerworld-word-shift",
                    `${shift.toFixed(2)}px`
                );

                word.classList.toggle(
                    "is-word-revealed",
                    progress >=
                        0.995
                );
            }
        );
    }


    /* ===========================
    请求更新 Scroll Reveal
    =========================== */

    function requestScrollRevealUpdate() {
        if (
            scrollRevealFrameId !==
            null
        ) {
            return;
        }

        scrollRevealFrameId =
            window.requestAnimationFrame(
                updateScrollReveal
            );
    }

    /* ===========================
       插图指针视差
    =========================== */

    function initializeImagePointerEffects() {
        if (
            !finePointerQuery.matches ||
            reducedMotionQuery.matches
        ) {
            return;
        }

        imageFrames.forEach(
            frame => {
                frame.addEventListener(
                    "pointerenter",
                    () => {
                        frame.classList.add(
                            "is-innerworld-image-active"
                        );
                    }
                );

                frame.addEventListener(
                    "pointermove",
                    event => {
                        updateImagePointer(
                            frame,
                            event
                        );
                    }
                );

                frame.addEventListener(
                    "pointerleave",
                    () => {
                        resetImageFrame(
                            frame
                        );
                    }
                );
            }
        );
    }

    function updateImagePointer(
        frame,
        event
    ) {
        if (
            !sectionActive ||
            reducedMotionQuery.matches
        ) {
            return;
        }

        const rect =
            frame.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        const normalizedX =
            clamp(
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width,
                0,
                1
            );

        const normalizedY =
            clamp(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height,
                0,
                1
            );

        const offsetX =
            (
                normalizedX -
                0.5
            ) *
            8;

        const offsetY =
            (
                normalizedY -
                0.5
            ) *
            6;

        frame.style.setProperty(
            "--innerworld-image-x",
            `${offsetX.toFixed(2)}px`
        );

        frame.style.setProperty(
            "--innerworld-image-y",
            `${offsetY.toFixed(2)}px`
        );

        frame.style.setProperty(
            "--innerworld-reality-x",
            `${(
                normalizedX *
                100
            ).toFixed(2)}%`
        );

        frame.style.setProperty(
            "--innerworld-reality-y",
            `${(
                normalizedY *
                100
            ).toFixed(2)}%`
        );
    }

    function resetImageFrame(
        frame
    ) {
        if (!frame) {
            return;
        }

        frame.classList.remove(
            "is-innerworld-image-active"
        );

        frame.style.setProperty(
            "--innerworld-image-x",
            "0px"
        );

        frame.style.setProperty(
            "--innerworld-image-y",
            "0px"
        );

        frame.style.setProperty(
            "--innerworld-reality-x",
            "50%"
        );

        frame.style.setProperty(
            "--innerworld-reality-y",
            "50%"
        );
    }

    function resetImageFrames() {
        imageFrames.forEach(
            resetImageFrame
        );
    }


    /* ===========================
       页面指针输入
    =========================== */

    function handleSectionPointerMove(
        event
    ) {
        if (
            !sectionActive ||
            !finePointerQuery.matches ||
            reducedMotionQuery.matches
        ) {
            return;
        }

        const rect =
            section.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        targetPointerX =
            clamp(
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width,
                0,
                1
            ) -
            0.5;

        targetPointerY =
            clamp(
                (
                    event.clientY -
                    rect.top
                ) /
                Math.min(
                    rect.height,
                    window.innerHeight
                ),
                0,
                1
            ) -
            0.5;
    }

    function handleSectionPointerLeave() {
        targetPointerX =
            0;

        targetPointerY =
            0;
    }

    function resetPointerState() {
        currentPointerX =
            0;

        currentPointerY =
            0;

        targetPointerX =
            0;

        targetPointerY =
            0;
    }


    /* ===========================
       每帧动画
    =========================== */

    function animate(
        currentTime
    ) {
        if (
            !sectionActive ||
            reducedMotionQuery.matches
        ) {
            animationFrameId =
                null;

            return;
        }

        const deltaTime =
            Math.min(
                32,
                currentTime -
                previousFrameTime
            );

        previousFrameTime =
            currentTime;

        elapsedTime +=
            deltaTime *
            0.001;

        currentPointerX =
            lerp(
                currentPointerX,
                targetPointerX,
                0.055
            );

        currentPointerY =
            lerp(
                currentPointerY,
                targetPointerY,
                0.055
            );

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }

    function startAnimation() {
        if (
            reducedMotionQuery.matches ||
            animationFrameId !==
                null
        ) {
            return;
        }

        previousFrameTime =
            performance.now();

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }

    function stopAnimation() {
        if (
            animationFrameId ===
            null
        ) {
            return;
        }

        window.cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId =
            null;
    }


    /* ===========================
       系统设置变化
    =========================== */

    function handleReducedMotionChange(
        event
    ) {
        if (event.matches) {
            stopAnimation();

            revealWords.forEach(
                word => {
                    word.style.setProperty(
                        "--innerworld-word-blur",
                        "0px"
                    );

                    word.style.setProperty(
                        "--innerworld-word-opacity",
                        "1"
                    );

                    word.style.setProperty(
                        "--innerworld-word-shift",
                        "0px"
                    );

                    word.classList.add(
                        "is-word-revealed"
                    );
                }
            );

            resetPointerState();
            resetImageFrames();

            return;
        }

        if (
            revealWords.length ===
            0
        ) {
            initializeScrollReveal();
        }

        if (sectionActive) {
            startAnimation();
            requestScrollRevealUpdate();
        }
    }

    function handleFinePointerChange(
        event
    ) {
        if (!event.matches) {
            resetPointerState();
            resetImageFrames();
        }
    }


    /* ===========================
       事件监听
    =========================== */

    section.addEventListener(
        "pointermove",
        handleSectionPointerMove
    );

    section.addEventListener(
        "pointerleave",
        handleSectionPointerLeave
    );

    reducedMotionQuery
        .addEventListener?.(
            "change",
            handleReducedMotionChange
        );

    finePointerQuery
        .addEventListener?.(
            "change",
            handleFinePointerChange
        );

    window.addEventListener(
        "scroll",
        requestScrollRevealUpdate,
        {
            passive:
                true
        }
    );

    window.addEventListener(
        "resize",
        requestScrollRevealUpdate
    );

    window.lenis?.on?.(
        "scroll",
        requestScrollRevealUpdate
    );


    /* ===========================
       Section 类名监听
    =========================== */

    mutationObserver =
        new MutationObserver(
            updateSectionState
        );

    mutationObserver.observe(
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


    /* ===========================
       可视区域监听
    =========================== */

    sectionObserver =
        new IntersectionObserver(
            entries => {
                const entry =
                    entries[0];

                if (
                    !entry ||
                    !entry.isIntersecting
                ) {
                    stopAnimation();
                    return;
                }

                updateSectionState();

                if (sectionActive) {
                    startAnimation();
                    refreshRevealStates();
                }
            },
            {
                threshold:
                    0.01
            }
        );

    sectionObserver.observe(
        section
    );


    /* ===========================
       页面事件
    =========================== */

    window.addEventListener(
        "innerworld-section-show",
        () => {
            sectionActive =
                true;

            showInnerworldSection();
        }
    );

    window.addEventListener(
        "innerworld-section-hide",
        () => {
            sectionActive =
                false;

            hideInnerworldSection();
        }
    );


    /* ===========================
       初始设置
    =========================== */

    initializeScrollReveal();
    initializeImagePointerEffects();

    updateSectionState();
}


/* ===========================
   显示接口
=========================== */

export function showInnerworldSection() {
    const section =
        document.getElementById(
            "innerworld-section"
        );

    if (!section) {
        return false;
    }

    window.dispatchEvent(
        new CustomEvent(
            "innerworld-section-show"
        )
    );

    return true;
}


/* ===========================
   隐藏接口
=========================== */

export function hideInnerworldSection() {
    const section =
        document.getElementById(
            "innerworld-section"
        );

    if (!section) {
        return false;
    }

    window.dispatchEvent(
        new CustomEvent(
            "innerworld-section-hide"
        )
    );

    return true;
}