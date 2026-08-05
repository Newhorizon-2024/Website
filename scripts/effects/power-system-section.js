/* ===========================
   世界观 · 战斗力
=========================== */

let powerSystemInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializePowerSystemSection() {
    if (powerSystemInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "power-system-section"
        );

    if (!section) {
        return;
    }

    const revealElements =
        Array.from(
            section.querySelectorAll(
                "[data-power-reveal]"
            )
        );

    const formStage =
        section.querySelector(
            "[data-power-form-stage]"
        );

    const formCopy =
        section.querySelector(
            ".power-form-copy"
        );

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    let revealObserver =
        null;

    let formObserver =
        null;

    let sectionActive =
        false;

    powerSystemInitialized =
        true;


    /* ===========================
       区块是否活动
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
       显示全部元素
    =========================== */

    function revealAllElements() {
        revealElements.forEach(
            element => {
                element.classList.add(
                    "is-revealed"
                );
            }
        );

        formStage?.classList.add(
            "is-line-released"
        );
    }


    /* ===========================
       创建滚动显示观察器
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
            revealAllElements();

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
                             * 元素尚位于视口下方时，
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
                        "0px 0px -11% 0px",

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
       创建增长线观察器
    =========================== */

    function createFormObserver() {
        formObserver?.disconnect();

        formObserver =
            null;

        if (!formStage) {
            return;
        }

        if (
            reducedMotionQuery.matches ||
            !(
                "IntersectionObserver"
                in window
            )
        ) {
            formStage.classList.add(
                "is-line-released"
            );

            return;
        }

        /*
         * 当用户阅读到形态说明区域时，
         * 背后的 power-line 才向外移动。
         */
        const observeTarget =
            formCopy ||
            formStage;

        formObserver =
            new IntersectionObserver(
                entries => {
                    entries.forEach(
                        entry => {
                            if (
                                entry.isIntersecting
                            ) {
                                formStage.classList.add(
                                    "is-line-released"
                                );

                                return;
                            }

                            if (
                                entry.boundingClientRect
                                    .top >
                                window.innerHeight
                            ) {
                                formStage.classList.remove(
                                    "is-line-released"
                                );
                            }
                        }
                    );
                },
                {
                    root:
                        null,

                    rootMargin:
                        "0px 0px -22% 0px",

                    threshold:
                        0.2
                }
            );

        formObserver.observe(
            observeTarget
        );
    }


    /* ===========================
       重置动画
    =========================== */

    function resetSectionAnimations() {
        if (
            reducedMotionQuery.matches
        ) {
            revealAllElements();

            return;
        }

        revealElements.forEach(
            element => {
                element.classList.remove(
                    "is-revealed"
                );
            }
        );

        formStage?.classList.remove(
            "is-line-released"
        );
    }


    /* ===========================
       显示首屏元素
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
       激活区块
    =========================== */

    function activateSection() {
        sectionActive =
            true;

        resetSectionAnimations();

        window.requestAnimationFrame(
            () => {
                window.requestAnimationFrame(
                    () => {
                        revealVisibleElements();
                    }
                );
            }
        );
    }


    /* ===========================
       停用区块
    =========================== */

    function deactivateSection() {
        sectionActive =
            false;
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
       减少动态设置变化
    =========================== */

    function handleReducedMotionChange(
        event
    ) {
        createRevealObserver();
        createFormObserver();

        if (event.matches) {
            revealAllElements();

            return;
        }

        if (sectionActive) {
            resetSectionAnimations();

            window.requestAnimationFrame(
                revealVisibleElements
            );
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
       页面事件
    =========================== */

    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                updateSectionState();
            }
        }
    );

    reducedMotionQuery
        .addEventListener?.(
            "change",
            handleReducedMotionChange
        );


    /* ===========================
       初始化
    =========================== */

    createRevealObserver();
    createFormObserver();
    updateSectionState();
}