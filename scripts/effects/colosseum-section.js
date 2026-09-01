/* ===========================
   世界观 · 罗马斗兽场
=========================== */

let colosseumInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeColosseumSection() {
    if (colosseumInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "colosseum-section"
        );

    if (!section) {
        return;
    }

    const revealElements =
        Array.from(
            section.querySelectorAll(
                "[data-colosseum-reveal]"
            )
        );

    const imageElements =
        Array.from(
            section.querySelectorAll(
                "[data-colosseum-image-reveal]"
            )
        );

    const allRevealElements =
        [
            ...revealElements,
            ...imageElements
        ];

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    let observer =
        null;

    let sectionActive =
        false;

    colosseumInitialized =
        true;


    /* ===========================
       当前 Section 是否可见
    =========================== */

    function isSectionActive() {
        const style =
            window.getComputedStyle(
                section
            );

        return (
            style.display !== "none" &&
            style.visibility !== "hidden"
        );
    }


    /* ===========================
       全部显示
    =========================== */

    function revealAll() {
        allRevealElements.forEach(
            element => {
                element.classList.add(
                    "is-revealed"
                );
            }
        );
    }


    /* ===========================
       创建观察器
    =========================== */

    function createObserver() {
        observer?.disconnect();

        if (
            reducedMotion.matches ||
            !(
                "IntersectionObserver"
                in window
            )
        ) {
            revealAll();
            return;
        }

        observer =
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
                             * 只有重新回到视口下方，
                             * 才允许再次进入 Reveal。
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
                        0.12
                }
            );

        allRevealElements.forEach(
            element => {
                observer.observe(
                    element
                );
            }
        );
    }


    /* ===========================
       首屏立即检查
    =========================== */

    function revealVisibleElements() {
        allRevealElements.forEach(
            element => {
                const rect =
                    element.getBoundingClientRect();

                if (
                    rect.top <
                        window.innerHeight *
                        0.92 &&
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
       Section 激活
    =========================== */

    function activateSection() {
        if (sectionActive) {
            return;
        }

        sectionActive =
            true;

        requestAnimationFrame(
            () => {
                requestAnimationFrame(
                    revealVisibleElements
                );
            }
        );
    }


    /* ===========================
       Section 停用
    =========================== */

    function deactivateSection() {
        sectionActive =
            false;
    }


    /* ===========================
       更新状态
    =========================== */

    function updateSectionState() {
        if (isSectionActive()) {
            activateSection();
        } else {
            deactivateSection();
        }
    }


    /* ===========================
       Section 变化监听
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
                    "class",
                    "style"
                ]
        }
    );


    /* ===========================
       Reduced Motion
    =========================== */

    function handleReducedMotion() {
        createObserver();

        if (reducedMotion.matches) {
            revealAll();
        } else {
            revealVisibleElements();
        }
    }

    reducedMotion.addEventListener?.(
        "change",
        handleReducedMotion
    );


    /* ===========================
       页面恢复
    =========================== */

    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                updateSectionState();
            }
        }
    );


    /* ===========================
       初始化
    =========================== */

    createObserver();
    updateSectionState();
}
