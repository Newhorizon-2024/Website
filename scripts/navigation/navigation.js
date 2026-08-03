/* ===========================
   1. 导航栏状态
=========================== */

let navigationInitialized = false;


/* ===========================
   2. 导航栏初始化
=========================== */

export function initializeNavigation() {
    if (navigationInitialized) {
        return;
    }

    const navbar =
        document.getElementById(
            "navbar"
        );

    const navigationTabs =
        Array.from(
            document.querySelectorAll(
                "#navbar .tab"
            )
        );

    const navigationIndicator =
        document.getElementById(
            "nav-indicator"
        );

    const sections =
        document.querySelectorAll(
            ".section"
        );

    const backToHomeButton =
        document.getElementById(
            "back-to-home"
        );

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    const depthDuration = 800;
    const slideDuration = 650;

    let currentActiveTab =
        navigationTabs.find(tab => {
            return tab.classList.contains(
                "active"
            );
        }) ||
        navigationTabs[0] ||
        null;

    let activeSection =
        document.querySelector(
            ".section.is-active"
        ) ||
        document.getElementById(
            "home-section"
        );

    let isTransitioning = false;

    navigationInitialized = true;


    /* ===========================
       3. 通用辅助函数
    =========================== */

    function wait(duration) {
        return new Promise(resolve => {
            window.setTimeout(
                resolve,
                duration
            );
        });
    }

    function clearTransitionClasses(
        section
    ) {
        if (!section) {
            return;
        }

        section.classList.remove(
            "depth-enter",
            "slide-enter-left",
            "slide-enter-right"
        );
    }

    function resetSection(section) {
        if (!section) {
            return;
        }

        clearTransitionClasses(section);

        section.classList.remove(
            "is-active"
        );

        section.style.removeProperty(
            "display"
        );
    }

    function isBountySection(sectionId) {
        return [
            "bounty-board-section",
            "wanted-info-section",
            "the-ruler-info-section",
            "the-monarch-info-section"
        ].includes(sectionId);
    }

    function isNhnSection(sectionId) {
        return [
            "nhn-section",
            "timeline-section"
        ].includes(sectionId);
    }

    function getTransitionType(
        fromId,
        toId,
        requestedType
    ) {
        if (
            requestedType === "depth" ||
            requestedType === "slide"
        ) {
            return requestedType;
        }

        if (
            isBountySection(fromId) &&
            isBountySection(toId)
        ) {
            return "slide";
        }

        if (
            isNhnSection(fromId) &&
            isNhnSection(toId)
        ) {
            return "slide";
        }

        return "depth";
    }

    function getDirection(
        fromId,
        toId,
        requestedDirection
    ) {
        if (
            requestedDirection ===
                "forward" ||
            requestedDirection ===
                "backward"
        ) {
            return requestedDirection;
        }

        if (
            toId === "home-section" ||
            toId === "nhn-section" ||
            toId ===
                "bounty-board-section"
        ) {
            return "backward";
        }

        return "forward";
    }


    /* ===========================
       4. 导航栏追踪指示器
    =========================== */

    function moveIndicator(tab) {
        if (
            !tab ||
            !navbar ||
            !navigationIndicator
        ) {
            return;
        }

        const tabRect =
            tab.getBoundingClientRect();

        const navbarRect =
            navbar.getBoundingClientRect();

        navigationIndicator.style.left =
            `${
                tabRect.left -
                navbarRect.left
            }px`;

        navigationIndicator.style.width =
            `${tabRect.width}px`;
    }

    function setActiveNavigationTab(tab) {
        if (!tab) {
            return;
        }

        currentActiveTab = tab;

        navigationTabs.forEach(
            navigationTab => {
                navigationTab.classList.toggle(
                    "active",
                    navigationTab === tab
                );

                navigationTab.setAttribute(
                    "aria-selected",
                    String(
                        navigationTab === tab
                    )
                );
            }
        );

        moveIndicator(tab);
    }

    function findNavigationTab(
        sectionId
    ) {
        return navigationTabs.find(tab => {
            return (
                tab.dataset.target ===
                sectionId
            );
        }) || null;
    }

    function updateNavigationIndicator(
        sectionId
    ) {
        const matchingTab =
            findNavigationTab(sectionId);

        if (matchingTab) {
            setActiveNavigationTab(
                matchingTab
            );
        }
    }


    /* ===========================
       5. 页面状态更新
    =========================== */

    function updateBackButton(sectionId) {
        if (!backToHomeButton) {
            return;
        }

        backToHomeButton.style.display =
            sectionId === "home-section"
                ? "none"
                : "block";
    }

    function updateTimelineState(
        sectionId
    ) {
        const timelineSection =
            document.getElementById(
                "timeline-section"
            );

        if (!timelineSection) {
            return;
        }

        if (
            sectionId !==
            "timeline-section"
        ) {
            timelineSection.classList.remove(
                "visible"
            );

            return;
        }

        timelineSection.classList.remove(
            "visible"
        );

        void timelineSection.offsetWidth;

        timelineSection.classList.add(
            "visible"
        );
    }

    function updateBountyPosterState(
        sectionId
    ) {
        const bountyInfoSectionIds = [
            "wanted-info-section"
        ];

        if (
            bountyInfoSectionIds.includes(
                sectionId
            )
        ) {
            window
                .startBountyPosterBackground?.();

            return;
        }

        window
            .stopBountyPosterBackground?.();
    }

    /* ===========================
        5. 页面滚动位置
    =========================== */

    function getSectionScrollTop(
        targetSection
    ) {
        let targetTop =
            0;

        let currentElement =
            targetSection;

        /*
        * 使用 offsetTop 累加真实布局位置，
        * 不受 transform、scale 和转场位移影响。
        */
        while (currentElement) {
            targetTop +=
                currentElement.offsetTop ||
                0;

            currentElement =
                currentElement.offsetParent;
        }

        return Math.max(
            0,
            targetTop
        );
    }

    function scrollToSectionTop(
        targetSection
    ) {
        if (!targetSection) {
            return;
        }

        const scrollTarget =
            targetSection.id ===
            "home-section"
                ? document.getElementById(
                    "home-scroll-anchor"
                ) ||
                    targetSection
                : targetSection;

        const targetTop =
            getSectionScrollTop(
                scrollTarget
            );

        /*
        * Lenis 存在时只由 Lenis 控制滚动。
        * 不再同时调用 window.scrollTo，
        * 避免两套滚动状态互相覆盖。
        */
        if (
            window.lenis &&
            typeof window.lenis.scrollTo ===
                "function"
        ) {
            window.lenis.resize?.();

            window.lenis.scrollTo(
                targetTop,
                {
                    immediate:
                        true,

                    force:
                        true,

                    lock:
                        true
                }
            );

            return;
        }

        /*
        * Lenis 尚未启动时退回原生滚动。
        */
        window.scrollTo({
            top:
                targetTop,

            left:
                0,

            behavior:
                "auto"
        });
    }

    function updateSectionScroll(
        targetSection,
        scrollMode
    ) {
        if (
            !targetSection ||
            scrollMode ===
                "none"
        ) {
            return;
        }

        if (
            scrollMode ===
            "top"
        ) {
            scrollToSectionTop(
                targetSection
            );

            return;
        }

        const targetRect =
            targetSection
                .getBoundingClientRect();

        const acceptableTopDistance =
            window.innerHeight *
            0.35;

        if (
            Math.abs(
                targetRect.top
            ) >
            acceptableTopDistance
        ) {
            scrollToSectionTop(
                targetSection
            );
        }
    }

    /* ===========================
    页面切换期间关闭滚动锚定
    =========================== */

    function disableScrollAnchoring() {
        document.documentElement
            .style
            .setProperty(
                "overflow-anchor",
                "none"
            );

        document.body
            .style
            .setProperty(
                "overflow-anchor",
                "none"
            );
    }

    function restoreScrollAnchoring() {
        document.documentElement
            .style
            .removeProperty(
                "overflow-anchor"
            );

        document.body
            .style
            .removeProperty(
                "overflow-anchor"
            );
    }


    /* ===========================
        页面显示完成事件
    =========================== */

    function dispatchSectionShown(
        sectionId,
        previousSectionId,
        options,
        transitionType
    ) {
        window.dispatchEvent(
            new CustomEvent(
                "section-shown",
                {
                    detail: {
                        sectionId,

                        previousSectionId:
                            previousSectionId ||
                            null,

                        historyMode:
                            options.historyMode ||
                            "push",

                        transitionType
                    }
                }
            )
        );
    }


    /* ===========================
        6. 页面切换
    =========================== */

    async function showSection(
        sectionId,
        options = {}
    ) {
        if (!sectionId) {
            console.error(
                "导航按钮缺少 data-target。"
            );

            return false;
        }

        const targetSection =
            document.getElementById(
                sectionId
            );

        if (!targetSection) {
            console.error(
                `未找到目标部件：#${sectionId}`
            );

            return false;
        }

        if (isTransitioning) {
            return false;
        }

        const scrollMode =
            options.scrollMode ||
            "none";

        if (
            targetSection ===
            activeSection
        ) {
            updateNavigationIndicator(
                sectionId
            );

            updateSectionScroll(
                targetSection,
                scrollMode
            );

            return true;
        }

        const previousSection =
            activeSection;

        const previousId =
            previousSection?.id ||
            "";

        const transitionType =
            getTransitionType(
                previousId,
                sectionId,
                options.transitionType
            );

        const direction =
            getDirection(
                previousId,
                sectionId,
                options.direction
            );

        const prefersReducedMotion =
            reducedMotionQuery.matches;

        isTransitioning =
            true;

        document.body.classList.add(
            "is-section-transitioning"
        );

        disableScrollAnchoring();

        try {
            /*
            * 清理无关页面。
            */
            sections.forEach(
                section => {
                    if (
                        section !==
                            previousSection &&
                        section !==
                            targetSection
                    ) {
                        resetSection(
                            section
                        );
                    }
                }
            );

            clearTransitionClasses(
                previousSection
            );

            clearTransitionClasses(
                targetSection
            );

            updateBackButton(
                sectionId
            );

            updateNavigationIndicator(
                sectionId
            );


            /* ===========================
            减少动态效果
            =========================== */

            if (
                prefersReducedMotion ||
                !previousSection
            ) {
                resetSection(
                    previousSection
                );

                /*
                * 提交旧页面隐藏后的布局。
                */
                void document.body.offsetHeight;

                clearTransitionClasses(
                    targetSection
                );

                targetSection.classList.add(
                    "is-active"
                );

                /*
                * 目标页面进入布局后定位。
                */
                void targetSection.offsetWidth;

                window.lenis?.resize?.();

                activeSection =
                    targetSection;

                dispatchSectionShown(
                    sectionId,
                    previousId,
                    options,
                    transitionType
                );

                updateTimelineState(
                    sectionId
                );

                updateBountyPosterState(
                    sectionId
                );

                updateSectionScroll(
                    targetSection,
                    scrollMode
                );

                return true;
            }


            /* ===========================
            普通转场
            =========================== */

            let enterClass =
                "depth-enter";

            if (
                transitionType ===
                "slide"
            ) {
                enterClass =
                    direction ===
                    "forward"
                        ? "slide-enter-right"
                        : "slide-enter-left";
            }

            /*
            * 先隐藏旧页面。
            */
            resetSection(
                previousSection
            );

            /*
            * 立即提交旧布局，
            * 防止浏览器继续保留旧页面锚点。
            */
            void document.body.offsetHeight;

            /*
            * 再显示目标页面的进入状态。
            */
            targetSection.classList.add(
                "is-active",
                enterClass
            );

            /*
            * 目标区块进入文档流。
            */
            void targetSection.offsetWidth;

            window.lenis?.resize?.();

            /*
            * 在浏览器绘制目标页面前，
            * 立即定位到目标区块顶部。
            */
            updateSectionScroll(
                targetSection,
                scrollMode
            );

            /*
            * 提交滚动和布局结果。
            */
            void document.documentElement
                .offsetHeight;

            window.requestAnimationFrame(
                () => {
                    window.requestAnimationFrame(
                        () => {
                            targetSection
                                .classList
                                .remove(
                                    enterClass
                                );
                        }
                    );
                }
            );

            await wait(
                transitionType ===
                "slide"
                    ? slideDuration
                    : depthDuration
            );

            clearTransitionClasses(
                targetSection
            );

            activeSection =
                targetSection;

            dispatchSectionShown(
                sectionId,
                previousId,
                options,
                transitionType
            );

            updateTimelineState(
                sectionId
            );

            updateBountyPosterState(
                sectionId
            );

            return true;
        } finally {
            document.body.classList.remove(
                "is-section-transitioning"
            );

            isTransitioning =
                false;

            /*
            * 等布局完全稳定后，
            * 再恢复浏览器滚动锚定。
            */
            window.requestAnimationFrame(
                () => {
                    window.requestAnimationFrame(
                        restoreScrollAnchoring
                    );
                }
            );
        }
    }

    /* ===========================
       7. 导航栏事件
    =========================== */

    if (
        navbar &&
        navigationIndicator &&
        navigationTabs.length > 0
    ) {
        window.requestAnimationFrame(
            () => {
                moveIndicator(
                    currentActiveTab
                );
            }
        );

        navigationTabs.forEach(tab => {
            tab.addEventListener(
                "mouseenter",
                () => {
                    moveIndicator(tab);
                }
            );

            tab.addEventListener(
                "focus",
                () => {
                    moveIndicator(tab);
                }
            );

            tab.addEventListener(
                "click",
                () => {
                    const targetId =
                        tab.dataset.target;

                    if (!targetId) {
                        console.error(
                            "导航按钮缺少 data-target。"
                        );

                        return;
                    }

                    setActiveNavigationTab(
                        tab
                    );

                    showSection(
                        targetId,
                        {
                            transitionType:
                                "depth",
                            direction:
                                "forward",
                            scrollMode:
                                "none"
                        }
                    );
                }
            );
        });

        navbar.addEventListener(
            "mouseleave",
            () => {
                moveIndicator(
                    currentActiveTab
                );
            }
        );

        navbar.addEventListener(
            "focusout",
            event => {
                if (
                    navbar.contains(
                        event.relatedTarget
                    )
                ) {
                    return;
                }

                moveIndicator(
                    currentActiveTab
                );
            }
        );

        window.addEventListener(
            "resize",
            () => {
                moveIndicator(
                    currentActiveTab
                );
            }
        );
    }


    /* ===========================
    8. 返回首页
    =========================== */

    backToHomeButton?.addEventListener(
        "click",
        () => {
            showSection(
                "home-section",
                {
                    transitionType:
                        "depth",

                    direction:
                        "backward",

                    scrollMode:
                        "top"
                }
            );
        }
    );


    /* ===========================
       9. 初始页面状态
    =========================== */

    sections.forEach(section => {
        if (
            section !==
            activeSection
        ) {
            resetSection(section);
        }
    });

    if (activeSection) {
        clearTransitionClasses(
            activeSection
        );

        activeSection.classList.add(
            "is-active"
        );
    }

    updateBackButton(
        activeSection?.id ||
        "home-section"
    );

    updateBountyPosterState(
        activeSection?.id ||
        "home-section"
    );

    updateNavigationIndicator(
        activeSection?.id ||
        ""
    );

    window.requestAnimationFrame(
        () => {
            moveIndicator(
                currentActiveTab
            );
        }
    );


    /* ===========================
       10. 临时跨模块接口
    =========================== */

    window.showSection =
        showSection;
}