/* ===========================
   世界观 · 新世界
=========================== */

let newworldInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeNewworldSection() {
    if (newworldInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "newworld-section"
        );

    if (!section) {
        return;
    }

    const revealElements =
        Array.from(
            section.querySelectorAll(
                "[data-newworld-reveal]"
            )
        );

    const gallery =
        section.querySelector(
            ".newworld-gallery"
        );

    const galleryFrame =
        section.querySelector(
            ".newworld-gallery-frame"
        );

    const galleryImage =
        galleryFrame?.querySelector(
            ":scope > img"
        );

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    const mobileQuery =
        window.matchMedia(
            "(max-width: 700px)"
        );

    let sectionActive =
        false;

    let pointerInsideGallery =
        false;

    let targetImageX =
        0;

    let targetImageY =
        0;

    let currentImageX =
        0;

    let currentImageY =
        0;

    let animationFrameId =
        null;

    let revealObserver =
        null;

    newworldInitialized =
        true;


    /* ===========================
       区块显示状态
    =========================== */

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
       是否允许图片视差
    =========================== */

    function canUseGalleryMotion() {
        return (
            !reducedMotionQuery.matches &&
            !mobileQuery.matches
        );
    }


    /* ===========================
       创建 Reveal 观察器
    =========================== */

    function createRevealObserver() {
        revealObserver?.disconnect();

        revealObserver =
            null;

        if (
            reducedMotionQuery.matches ||
            !(
                "IntersectionObserver"
                in window
            )
        ) {
            revealElements.forEach(
                element => {
                    element.classList.add(
                        "is-revealed"
                    );
                }
            );

            return;
        }

        revealObserver =
            new IntersectionObserver(
                entries => {
                    entries.forEach(
                        entry => {
                            if (
                                entry.isIntersecting
                            ) {
                                entry.target
                                    .classList
                                    .add(
                                        "is-revealed"
                                    );

                                return;
                            }

                            /*
                             * 元素仍位于视口下方时，
                             * 恢复初始状态。
                             */
                            if (
                                entry.boundingClientRect
                                    .top >
                                window.innerHeight
                            ) {
                                entry.target
                                    .classList
                                    .remove(
                                        "is-revealed"
                                    );
                            }
                        }
                    );
                },
                {
                    root:
                        null,

                    rootMargin:
                        "0px 0px -10% 0px",

                    threshold:
                        0.14
                }
            );

        revealElements.forEach(
            element => {
                revealObserver.observe(
                    element
                );
            }
        );
    }


    /* ===========================
       重置 Reveal
    =========================== */

    function resetRevealElements() {
        if (
            reducedMotionQuery.matches
        ) {
            revealElements.forEach(
                element => {
                    element.classList.add(
                        "is-revealed"
                    );
                }
            );

            return;
        }

        revealElements.forEach(
            element => {
                element.classList.remove(
                    "is-revealed"
                );
            }
        );
    }


    /* ===========================
       显示视口中的元素
    =========================== */

    function revealVisibleElements() {
        revealElements.forEach(
            element => {
                const rect =
                    element.getBoundingClientRect();

                if (
                    rect.top <
                        window.innerHeight *
                        0.9 &&
                    rect.bottom >
                        0
                ) {
                    element.classList.add(
                        "is-revealed"
                    );
                }
            }
        );
    }


    /* ===========================
       进入区块
    =========================== */

    function activateSection() {
        sectionActive =
            true;

        resetRevealElements();
        resetGalleryState();

        window.requestAnimationFrame(
            () => {
                window.requestAnimationFrame(
                    () => {
                        revealVisibleElements();

                        if (
                            canUseGalleryMotion()
                        ) {
                            startGalleryAnimation();
                        }
                    }
                );
            }
        );
    }


    /* ===========================
       离开区块
    =========================== */

    function deactivateSection() {
        sectionActive =
            false;

        pointerInsideGallery =
            false;

        targetImageX =
            0;

        targetImageY =
            0;

        stopGalleryAnimation();
    }


    /* ===========================
       更新区块状态
    =========================== */

    function updateSectionState() {
        const active =
            isSectionActive();

        if (
            active &&
            !sectionActive
        ) {
            activateSection();
            return;
        }

        if (
            !active &&
            sectionActive
        ) {
            deactivateSection();
        }
    }


    /* ===========================
       获取图片基础缩放
    =========================== */

    function getBaseImageScale() {
        if (
            !gallery?.classList
                .contains(
                    "is-revealed"
                )
        ) {
            return 1.075;
        }

        return 1;
    }


    /* ===========================
       指针进入画廊
    =========================== */

    function handleGalleryPointerEnter() {
        if (!canUseGalleryMotion()) {
            return;
        }

        pointerInsideGallery =
            true;

        startGalleryAnimation();
    }


    /* ===========================
       指针移动
    =========================== */

    function handleGalleryPointerMove(
        event
    ) {
        if (
            !galleryFrame ||
            !canUseGalleryMotion()
        ) {
            return;
        }

        const rect =
            galleryFrame
                .getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        const relativeX =
            (
                event.clientX -
                rect.left
            ) /
            rect.width;

        const relativeY =
            (
                event.clientY -
                rect.top
            ) /
            rect.height;

        targetImageX =
            (
                relativeX -
                0.5
            ) *
            -12;

        targetImageY =
            (
                relativeY -
                0.5
            ) *
            -8;
    }


    /* ===========================
       指针离开画廊
    =========================== */

    function handleGalleryPointerLeave() {
        pointerInsideGallery =
            false;

        targetImageX =
            0;

        targetImageY =
            0;
    }


    /* ===========================
       图片视差动画
    =========================== */

    function animateGallery() {
        if (
            !sectionActive ||
            !galleryImage ||
            !canUseGalleryMotion()
        ) {
            animationFrameId =
                null;

            return;
        }

        currentImageX +=
            (
                targetImageX -
                currentImageX
            ) *
            0.07;

        currentImageY +=
            (
                targetImageY -
                currentImageY
            ) *
            0.07;

        const baseScale =
            getBaseImageScale();

        const pointerScale =
            pointerInsideGallery
                ? 1.012
                : 1;

        const finalScale =
            baseScale *
            pointerScale;

        galleryImage.style.transform =
            [
                "translate3d(",
                `${currentImageX.toFixed(
                    2
                )}px,`,
                `${currentImageY.toFixed(
                    2
                )}px,`,
                "0)",
                `scale(${finalScale.toFixed(
                    4
                )})`
            ].join(" ");

        animationFrameId =
            window.requestAnimationFrame(
                animateGallery
            );
    }


    /* ===========================
       启动图片动画
    =========================== */

    function startGalleryAnimation() {
        if (
            !canUseGalleryMotion() ||
            !galleryImage ||
            animationFrameId !==
                null
        ) {
            return;
        }

        animationFrameId =
            window.requestAnimationFrame(
                animateGallery
            );
    }


    /* ===========================
       停止图片动画
    =========================== */

    function stopGalleryAnimation() {
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
       重置图片状态
    =========================== */

    function resetGalleryState() {
        currentImageX =
            0;

        currentImageY =
            0;

        targetImageX =
            0;

        targetImageY =
            0;

        if (!galleryImage) {
            return;
        }

        if (!canUseGalleryMotion()) {
            galleryImage.style.transform =
                "none";

            return;
        }

        galleryImage.style.removeProperty(
            "transform"
        );
    }


    /* ===========================
       动态设置变化
    =========================== */

    function handleMotionSettingChange() {
        stopGalleryAnimation();
        resetGalleryState();

        if (
            reducedMotionQuery.matches
        ) {
            revealElements.forEach(
                element => {
                    element.classList.add(
                        "is-revealed"
                    );
                }
            );

            return;
        }

        createRevealObserver();

        if (
            sectionActive &&
            canUseGalleryMotion()
        ) {
            startGalleryAnimation();
        }
    }


    /* ===========================
       区块 Class 监听
    =========================== */

    const sectionObserver =
        new MutationObserver(
            updateSectionState
        );

    sectionObserver.observe(
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
       画廊事件
    =========================== */

    galleryFrame?.addEventListener(
        "pointerenter",
        handleGalleryPointerEnter
    );

    galleryFrame?.addEventListener(
        "pointermove",
        handleGalleryPointerMove
    );

    galleryFrame?.addEventListener(
        "pointerleave",
        handleGalleryPointerLeave
    );


    /* ===========================
       页面事件
    =========================== */

    window.addEventListener(
        "resize",
        resetGalleryState
    );

    window.addEventListener(
        "pagehide",
        deactivateSection
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                stopGalleryAnimation();
                return;
            }

            updateSectionState();
        }
    );

    reducedMotionQuery
        .addEventListener?.(
            "change",
            handleMotionSettingChange
        );

    mobileQuery
        .addEventListener?.(
            "change",
            handleMotionSettingChange
        );


    /* ===========================
       初始化
    =========================== */

    createRevealObserver();
    updateSectionState();
}