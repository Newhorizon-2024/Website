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

    const imageFrameRects =
        new WeakMap();

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

    let revealGroups =
        [];

    let revealLayoutDirty =
        true;

    let scrollRevealFrameId =
        null;

    let sectionObserver =
        null;

    let mutationObserver =
        null;

    let subscribedLenis =
        null;


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

                revealLayoutDirty = true;
                requestScrollRevealUpdate();
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

        let globalIndex = 0;

        revealGroups = revealTextElements.map(
            element => {
                const words = Array.from(
                    element.querySelectorAll(
                        ".innerworld-reveal-word"
                    )
                ).map(word => ({
                    element: word,
                    globalIndex: globalIndex++,
                    documentTop: 0,
                    lastBlur: null,
                    lastOpacity: null,
                    lastShift: null,
                    lastRevealed: null,
                    lastAnimating: null
                }));

                return {
                    element,
                    words,
                    documentTop: 0,
                    documentBottom: 0,
                    terminalState: null
                };
            }
        );

        revealLayoutDirty = true;

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
            revealGroups.length ===
                0
        ) {
            return;
        }

        const viewportHeight =
            window.innerHeight;

        const scrollTop =
            window.scrollY;

        if (revealLayoutDirty) {
            /*
             * 先完成全部布局读取，再开始任何样式写入，
             * 避免逐字读写交错造成强制同步布局。
             */
            revealGroups.forEach(
                group => {
                    const groupRect =
                        group.element
                            .getBoundingClientRect();

                    group.documentTop =
                        groupRect.top +
                        scrollTop;

                    group.documentBottom =
                        groupRect.bottom +
                        scrollTop;

                    group.words.forEach(
                        word => {
                            word.documentTop =
                                word.element
                                    .getBoundingClientRect()
                                    .top +
                                scrollTop;
                        }
                    );

                    group.terminalState =
                        null;
                }
            );

            revealLayoutDirty =
                false;
        }

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

        function applyWordState(
            word,
            progress
        ) {
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

            const blurValue =
                `${blur.toFixed(2)}px`;

            const opacityValue =
                opacity.toFixed(3);

            const shiftValue =
                `${shift.toFixed(2)}px`;

            if (word.lastBlur !== blurValue) {
                word.element.style.setProperty(
                    "--innerworld-word-blur",
                    blurValue
                );
                word.lastBlur = blurValue;
            }

            if (word.lastOpacity !== opacityValue) {
                word.element.style.setProperty(
                    "--innerworld-word-opacity",
                    opacityValue
                );
                word.lastOpacity = opacityValue;
            }

            if (word.lastShift !== shiftValue) {
                word.element.style.setProperty(
                    "--innerworld-word-shift",
                    shiftValue
                );
                word.lastShift = shiftValue;
            }

            const revealed =
                progress >= 0.995;

            const animating =
                progress > 0 &&
                progress < 0.995;

            if (word.lastRevealed !== revealed) {
                word.element.classList.toggle(
                    "is-word-revealed",
                    revealed
                );
                word.lastRevealed = revealed;
            }

            if (word.lastAnimating !== animating) {
                word.element.classList.toggle(
                    "is-word-animating",
                    animating
                );
                word.lastAnimating = animating;
            }
        }

        revealGroups.forEach(
            group => {
                const groupTop =
                    group.documentTop -
                    scrollTop;

                const groupBottom =
                    group.documentBottom -
                    scrollTop;

                let terminalState =
                    null;

                if (groupBottom < revealEnd - 80) {
                    terminalState = 1;
                } else if (groupTop > revealStart + 80) {
                    terminalState = 0;
                }

                if (terminalState !== null) {
                    if (group.terminalState !== terminalState) {
                        group.words.forEach(
                            word => applyWordState(
                                word,
                                terminalState
                            )
                        );
                        group.terminalState = terminalState;
                    }

                    return;
                }

                group.terminalState = null;

                group.words.forEach(
                    word => {
                const wordTop =
                    word.documentTop -
                    scrollTop;

                /*
                * 同一行中的词加入少量顺序偏移，
                * 形成连续向前解锁的效果。
                */
                const stagger =
                    (
                        word.globalIndex %
                        18
                    ) *
                    2.4;

                const adjustedTop =
                    wordTop +
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

                applyWordState(
                    word,
                    progress
                );
                    }
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
                        imageFrameRects.set(
                            frame,
                            frame.getBoundingClientRect()
                        );

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
            imageFrameRects.get(
                frame
            ) ||
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

        imageFrameRects.delete(
            frame
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


    function resetPointerState() {
        /* 页面级指针 RAF 已移除；保留入口兼容状态切换。 */
    }


    /* ===========================
       系统设置变化
    =========================== */

    function handleReducedMotionChange(
        event
    ) {
        if (event.matches) {
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
        () => {
            revealLayoutDirty = true;
            imageFrames.forEach(
                frame => imageFrameRects.delete(
                    frame
                )
            );
            requestScrollRevealUpdate();
        }
    );

    imageFrames.forEach(
        frame => {
            const image =
                frame.querySelector("img");

            if (image && !image.complete) {
                image.addEventListener(
                    "load",
                    () => {
                        revealLayoutDirty = true;
                        requestScrollRevealUpdate();
                    },
                    { once: true }
                );
            }
        }
    );

    document.fonts?.ready.then(
        () => {
            revealLayoutDirty = true;
            requestScrollRevealUpdate();
        }
    );

    function subscribeToLenis(
        lenisInstance =
            window.lenis
    ) {
        if (
            !lenisInstance ||
            subscribedLenis ===
                lenisInstance ||
            typeof lenisInstance.on !==
                "function"
        ) {
            return;
        }

        lenisInstance.on(
            "scroll",
            requestScrollRevealUpdate
        );

        subscribedLenis =
            lenisInstance;
    }

    window.addEventListener(
        "lenis-ready",
        event => {
            subscribeToLenis(
                event.detail?.lenis
            );
        }
    );

    subscribeToLenis();


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
                    return;
                }

                updateSectionState();

                if (sectionActive) {
                    requestScrollRevealUpdate();
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
