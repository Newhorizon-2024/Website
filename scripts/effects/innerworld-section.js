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

        resetImageFrames();
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


    function resetOnPreferenceChange() {
        if (reducedMotionQuery.matches || !finePointerQuery.matches) resetImageFrames();
    }

    reducedMotionQuery.addEventListener("change", resetOnPreferenceChange);
    finePointerQuery.addEventListener("change", resetOnPreferenceChange);
    window.addEventListener("resize", () => imageFrames.forEach(frame => imageFrameRects.delete(frame)));

    /* ===========================
       Section 类名监听
    =========================== */

    const mutationObserver =
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
