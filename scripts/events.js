/* ===========================
   1. 页面初始化
=========================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializePanelPointerEffects();
        initializeCountdownTooltip();
        initializeNavigation();
        initializeCreatorGallery();
        initializeNhnLogoMagnet();
        initializeNhnTimeline();
        initializeNhnAccordion();
        initializeWorkFeed();
        initializeWorkPostStats();
    },
    { once: true }
);


/* ===========================
   2. 全局面板光幕与倾斜
=========================== */

function initializePanelPointerEffects() {
    const sitePanels =
        document.querySelectorAll(
            ".site-panel"
        );

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    if (
        !supportsPointerEffects ||
        sitePanels.length === 0
    ) {
        return;
    }

    function resetPanelPointerEffect(panel) {
        panel.classList.remove(
            "is-pointer-active"
        );

        panel.style.setProperty(
            "--panel-light-angle",
            "215deg"
        );

        panel.style.setProperty(
            "--panel-light-shift-x",
            "0px"
        );

        panel.style.setProperty(
            "--panel-light-shift-y",
            "0px"
        );

        panel.style.setProperty(
            "--panel-rotate-x",
            "0deg"
        );

        panel.style.setProperty(
            "--panel-rotate-y",
            "0deg"
        );
    }

    sitePanels.forEach(panel => {
        panel.addEventListener(
            "mouseenter",
            () => {
                panel.classList.add(
                    "is-pointer-active"
                );
            }
        );

        panel.addEventListener(
            "mousemove",
            event => {
                const panelRect =
                    panel.getBoundingClientRect();

                if (
                    panelRect.width === 0 ||
                    panelRect.height === 0
                ) {
                    return;
                }

                const horizontalRatio =
                    (
                        event.clientX -
                        panelRect.left
                    ) /
                    panelRect.width;

                const verticalRatio =
                    (
                        event.clientY -
                        panelRect.top
                    ) /
                    panelRect.height;

                /*
                 * 光幕角度：
                 * 以 215deg 为中心，
                 * 左右最大变化约 10deg。
                 */
                const angleOffset =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    20;

                /*
                 * 光幕位置：
                 * 仅产生少量偏移。
                 */
                const lightShiftX =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    8;

                const lightShiftY =
                    (
                        verticalRatio -
                        0.5
                    ) *
                    5;

                /*
                 * 面板倾斜：
                 * 鼠标向上时，上方向外抬起；
                 * 鼠标向右时，右侧向外抬起。
                 */
                const rotateX =
                    (
                        0.5 -
                        verticalRatio
                    ) *
                    3;

                const rotateY =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    3;

                panel.style.setProperty(
                    "--panel-light-angle",
                    `${
                        215 +
                        angleOffset
                    }deg`
                );

                panel.style.setProperty(
                    "--panel-light-shift-x",
                    `${lightShiftX.toFixed(
                        2
                    )}px`
                );

                panel.style.setProperty(
                    "--panel-light-shift-y",
                    `${lightShiftY.toFixed(
                        2
                    )}px`
                );

                panel.style.setProperty(
                    "--panel-rotate-x",
                    `${rotateX.toFixed(
                        2
                    )}deg`
                );

                panel.style.setProperty(
                    "--panel-rotate-y",
                    `${rotateY.toFixed(
                        2
                    )}deg`
                );
            }
        );

        panel.addEventListener(
            "mouseleave",
            () => {
                resetPanelPointerEffect(
                    panel
                );
            }
        );
    });
}


/* ===========================
   3. 倒计时 Tooltip
=========================== */

function initializeCountdownTooltip() {
    const countdownElement =
        document.getElementById(
            "countdown"
        );

    if (!countdownElement) {
        return;
    }

    const tooltip =
        document.createElement("div");

    tooltip.id =
        "age-tooltip";

    tooltip.textContent =
        "New Horizon 的年龄";

    tooltip.style.position =
        "absolute";

    tooltip.style.background =
        "rgba(0, 0, 0, 0.8)";

    tooltip.style.borderRadius =
        "5px";

    tooltip.style.color =
        "#EEEEEE";

    tooltip.style.display =
        "none";

    tooltip.style.fontSize =
        "0.9em";

    tooltip.style.padding =
        "5px 10px";

    tooltip.style.pointerEvents =
        "none";

    tooltip.style.whiteSpace =
        "nowrap";

    tooltip.style.zIndex =
        "1000";

    document.body.appendChild(
        tooltip
    );

    function isCountdownVisible() {
        const countdownStyle =
            window.getComputedStyle(
                countdownElement
            );

        return (
            countdownStyle.opacity !==
                "0" &&
            countdownStyle.display !==
                "none" &&
            countdownStyle.visibility !==
                "hidden"
        );
    }

    function updateTooltipPosition(event) {
        tooltip.style.left =
            `${event.pageX + 10}px`;

        tooltip.style.top =
            `${event.pageY + 10}px`;
    }

    function showTooltip(event) {
        if (!isCountdownVisible()) {
            return;
        }

        updateTooltipPosition(event);

        tooltip.style.display =
            "block";
    }

    function hideTooltip() {
        tooltip.style.display =
            "none";
    }

    countdownElement.addEventListener(
        "mouseenter",
        showTooltip
    );

    countdownElement.addEventListener(
        "mousemove",
        event => {
            if (
                tooltip.style.display ===
                "none"
            ) {
                return;
            }

            updateTooltipPosition(event);
        }
    );

    countdownElement.addEventListener(
        "mouseleave",
        hideTooltip
    );

    countdownElement.addEventListener(
        "click",
        event => {
            if (
                tooltip.style.display ===
                "block"
            ) {
                hideTooltip();
                return;
            }

            showTooltip(event);
        }
    );
}


/* ===========================
   4. 导航栏切换
=========================== */

function initializeNavigation() {
    const navigationTabs =
        document.querySelectorAll(
            ".tab"
        );

    const sections =
        document.querySelectorAll(
            ".section"
        );

    const mainContent =
        document.getElementById(
            "content"
        );

    const backToHomeButton =
        document.getElementById(
            "back-to-home"
        );

    const newsSection =
        document.getElementById(
            "news-section"
        );

    let homeUnlocked = false;

    function hideAllSections() {
        sections.forEach(section => {
            section.style.display =
                "none";
        });
    }

    function showSection(sectionId) {
        if (!sectionId) {
            console.error(
                "导航按钮缺少 data-target。"
            );

            return;
        }

        hideAllSections();

        /*
         * #content 保持显示，
         * 避免其中的倒计时随栏目切换消失。
         */
        if (mainContent) {
            mainContent.style.display =
                "block";
        }

        if (sectionId === "content") {
            if (newsSection) {
                newsSection.style.display =
                    "block";
            }

            if (backToHomeButton) {
                backToHomeButton.style.display =
                    "none";
            }

            return;
        }

        /*
         * 进入其他栏目时，
         * 只隐藏主页新闻内容。
         */
        if (newsSection) {
            newsSection.style.display =
                "none";
        }

        const targetSection =
            document.getElementById(
                sectionId
            );

        if (!targetSection) {
            console.error(
                `未找到目标部件: #${sectionId}`
            );

            return;
        }

        targetSection.style.display =
            "block";

        if (backToHomeButton) {
            backToHomeButton.style.display =
                "block";
        }
    }

    navigationTabs.forEach(tab => {
        tab.addEventListener(
            "click",
            () => {
                const targetId =
                    tab.getAttribute(
                        "data-target"
                    );

                /*
                 * 导航栏中的主页按钮。
                 */
                if (
                    targetId ===
                    "back-to-home"
                ) {
                    if (!homeUnlocked) {
                        return;
                    }

                    showSection(
                        "content"
                    );

                    return;
                }

                if (!targetId) {
                    console.error(
                        "导航按钮缺少 data-target。"
                    );

                    return;
                }

                /*
                 * 进入任意其他栏目后，
                 * 解锁主页按钮。
                 */
                homeUnlocked = true;

                showSection(targetId);
            }
        );
    });

    backToHomeButton?.addEventListener(
        "click",
        () => {
            showSection("content");
        }
    );

    /*
     * 初始化时隐藏所有栏目页面。
     * 主页新闻内容由原始页面状态控制。
     */
    hideAllSections();

    if (backToHomeButton) {
        backToHomeButton.style.display =
            "none";
    }
}


/* ===========================
   5. 创作者作品预览
=========================== */

function initializeCreatorGallery() {
    const creatorCards =
        document.querySelectorAll(
            ".creator-card"
        );

    const creatorWorks =
        Array.from(
            document.querySelectorAll(
                ".creator-work"
            )
        );

    const lightbox =
        document.getElementById(
            "creator-lightbox"
        );

    const lightboxCaption =
        document.getElementById(
            "creator-lightbox-caption"
        );

    const lightboxCloseButton =
        document.querySelector(
            ".creator-lightbox-close"
        );

    const lightboxImage =
        document.getElementById(
            "creator-lightbox-image"
        );

    const lightboxLink =
        document.getElementById(
            "creator-lightbox-link"
        );

    const lightboxNextButton =
        document.querySelector(
            ".creator-lightbox-next"
        );

    const lightboxPreviousButton =
        document.querySelector(
            ".creator-lightbox-prev"
        );

    const lightboxFigure =
        document.querySelector(
            ".creator-lightbox-figure"
        );

    let activeWorkIndex = 0;

    function createRandomRotation(
        minimum,
        maximum
    ) {
        const rotation =
            Math.random() *
            (
                maximum -
                minimum
            ) +
            minimum;

        return `${rotation.toFixed(
            2
        )}deg`;
    }

    function initializeCardRotations() {
        creatorCards.forEach(card => {
            card.style.setProperty(
                "--avatar-rotation",
                createRandomRotation(
                    -5,
                    5
                )
            );

            for (
                let index = 1;
                index <= 4;
                index += 1
            ) {
                card.style.setProperty(
                    `--work-rotation-${index}`,
                    createRandomRotation(
                        -5,
                        5
                    )
                );
            }
        });
    }

    function initializeCardObserver() {
        if (
            creatorCards.length === 0 ||
            !(
                "IntersectionObserver"
                in window
            )
        ) {
            return;
        }

        const observer =
            new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        const card =
                            entry.target;

                        if (
                            !entry.isIntersecting
                        ) {
                            card.classList.remove(
                                "is-entering",
                                "is-settled"
                            );

                            return;
                        }

                        if (
                            entry.intersectionRatio >=
                            0.58
                        ) {
                            card.classList.add(
                                "is-settled"
                            );

                            card.classList.remove(
                                "is-entering"
                            );

                            return;
                        }

                        card.classList.add(
                            "is-entering"
                        );

                        card.classList.remove(
                            "is-settled"
                        );
                    });
                },
                {
                    root: null,
                    rootMargin:
                        "0px 0px -8% 0px",
                    threshold:
                        [0.08, 0.58]
                }
            );

        creatorCards.forEach(card => {
            observer.observe(card);
        });
    }

    function updateLightbox(index) {
        const work =
            creatorWorks[index];

        if (
            !work ||
            !lightboxImage
        ) {
            return;
        }

        const image =
            work.querySelector("img");

        const caption =
            work.dataset.caption ||
            image?.alt ||
            "";

        const fullImage =
            work.dataset.full ||
            image?.src ||
            "";

        const websiteLink =
            work.dataset.link?.trim() ||
            "";

        activeWorkIndex = index;

        lightboxImage.src =
            fullImage;

        lightboxImage.alt =
            caption;

        if (lightboxCaption) {
            lightboxCaption.textContent =
                caption;
        }

        if (!lightboxLink) {
            return;
        }

        if (websiteLink) {
            lightboxLink.setAttribute(
                "href",
                websiteLink
            );

            lightboxLink.hidden =
                false;

            lightboxLink.setAttribute(
                "aria-hidden",
                "false"
            );

            lightboxLink.setAttribute(
                "tabindex",
                "0"
            );

            return;
        }

        lightboxLink.removeAttribute(
            "href"
        );

        lightboxLink.hidden =
            true;

        lightboxLink.setAttribute(
            "aria-hidden",
            "true"
        );

        lightboxLink.setAttribute(
            "tabindex",
            "-1"
        );
    }

    function openLightbox(index) {
        if (
            !lightbox ||
            creatorWorks.length === 0
        ) {
            return;
        }

        updateLightbox(index);

        lightbox.classList.add(
            "active"
        );

        lightbox.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "creator-lightbox-open"
        );

        lightboxCloseButton?.focus();
    }

    function closeLightbox() {
        if (!lightbox) {
            return;
        }

        lightbox.classList.remove(
            "active"
        );

        lightbox.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "creator-lightbox-open"
        );

        creatorWorks[
            activeWorkIndex
        ]?.focus();
    }

    function changeLightbox(direction) {
        if (
            creatorWorks.length === 0
        ) {
            return;
        }

        activeWorkIndex =
            (
                activeWorkIndex +
                direction +
                creatorWorks.length
            ) %
            creatorWorks.length;

        updateLightbox(
            activeWorkIndex
        );
    }

    initializeCardRotations();
    initializeCardObserver();

    creatorWorks.forEach(
        (work, index) => {
            work.addEventListener(
                "click",
                () => {
                    openLightbox(index);
                }
            );
        }
    );

    lightboxCloseButton?.addEventListener(
        "click",
        closeLightbox
    );

    lightboxNextButton?.addEventListener(
        "click",
        () => {
            changeLightbox(1);
        }
    );

    lightboxPreviousButton?.addEventListener(
        "click",
        () => {
            changeLightbox(-1);
        }
    );

    lightbox?.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                lightbox
            ) {
                closeLightbox();
            }
        }
    );

    lightboxFigure?.addEventListener(
        "click",
        event => {
            event.stopPropagation();
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                !lightbox ||
                !lightbox.classList.contains(
                    "active"
                )
            ) {
                return;
            }

            switch (event.key) {
                case "Escape":
                    closeLightbox();
                    break;

                case "ArrowLeft":
                    changeLightbox(-1);
                    break;

                case "ArrowRight":
                    changeLightbox(1);
                    break;

                default:
                    break;
            }
        }
    );
}


/* ===========================
   6. 情报署标志磁吸
=========================== */

function initializeNhnLogoMagnet() {
    const nhnLogo =
        document.querySelector(
            ".nhn-logo"
        );

    if (!nhnLogo) {
        return;
    }

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    if (!supportsPointerEffects) {
        return;
    }

    /*
     * 鼠标磁吸最大作用距离。
     * 增大该值可扩大鼠标感应范围。
     */
    const magnetDistance = 360;

    /*
     * 图片最大位移距离。
     */
    const magnetOffset = 16;

    /*
     * 图片位移缓动系数。
     * 数值越大，跟随速度越快。
     */
    const interpolationFactor = 0.12;

    let currentX = 0;
    let currentY = 0;

    let targetX = 0;
    let targetY = 0;

    let animationFrame = null;

    function hasActiveMovement() {
        const distanceToTarget =
            Math.hypot(
                targetX - currentX,
                targetY - currentY
            );

        return distanceToTarget > 0.01;
    }

    function animateLogo() {
        currentX +=
            (
                targetX -
                currentX
            ) *
            interpolationFactor;

        currentY +=
            (
                targetY -
                currentY
            ) *
            interpolationFactor;

        nhnLogo.style.transform =
            `translate3d(` +
            `${currentX}px, ` +
            `${currentY}px, 0)`;

        if (hasActiveMovement()) {
            animationFrame =
                window.requestAnimationFrame(
                    animateLogo
                );

            return;
        }

        currentX = targetX;
        currentY = targetY;

        nhnLogo.style.transform =
            `translate3d(` +
            `${currentX}px, ` +
            `${currentY}px, 0)`;

        animationFrame = null;
    }

    function startLogoAnimation() {
        if (animationFrame !== null) {
            return;
        }

        animationFrame =
            window.requestAnimationFrame(
                animateLogo
            );
    }

    function resetLogoPosition() {
        targetX = 0;
        targetY = 0;

        nhnLogo.style.opacity =
            "0.9";

        startLogoAnimation();
    }

    document.addEventListener(
        "mousemove",
        event => {
            const logoRect =
                nhnLogo.getBoundingClientRect();

            const centerX =
                logoRect.left +
                logoRect.width / 2;

            const centerY =
                logoRect.top +
                logoRect.height / 2;

            const deltaX =
                event.clientX -
                centerX;

            const deltaY =
                event.clientY -
                centerY;

            const distance =
                Math.hypot(
                    deltaX,
                    deltaY
                );

            if (
                distance <
                magnetDistance
            ) {
                const strength =
                    1 -
                    distance /
                    magnetDistance;

                targetX =
                    deltaX *
                    (
                        magnetOffset /
                        magnetDistance
                    ) *
                    strength;

                targetY =
                    deltaY *
                    (
                        magnetOffset /
                        magnetDistance
                    ) *
                    strength;

                nhnLogo.style.opacity =
                    "1";
            } else {
                targetX = 0;
                targetY = 0;

                nhnLogo.style.opacity =
                    "0.9";
            }

            startLogoAnimation();
        }
    );

    document.addEventListener(
        "mouseleave",
        resetLogoPosition
    );
}


/* ===========================
   7. 情报署时间轴
=========================== */

function initializeNhnTimeline() {
    const timelineItems =
        document.querySelectorAll(
            ".timeline-item"
        );

    const timelineDetails =
        document.querySelectorAll(
            ".timeline-detail"
        );

    if (
        timelineItems.length === 0 &&
        timelineDetails.length === 0
    ) {
        return;
    }

    function hideTimelineDetails() {
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
    }

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
    }

    function selectTimelineItem(item) {
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

        /*
         * 再次选择当前节点时，
         * 收起详情。
         */
        if (isCurrentItem) {
            hideTimelineDetails();
            return;
        }

        showTimelineDetail(
            item,
            targetDetail
        );
    }

    timelineItems.forEach(item => {
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
            "click",
            event => {
                /*
                 * 阻止事件冒泡，
                 * 避免详情显示后立即被关闭。
                 */
                event.stopPropagation();

                selectTimelineItem(item);
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

                selectTimelineItem(item);
            }
        );
    });

    timelineDetails.forEach(
        detail => {
            detail.setAttribute(
                "aria-hidden",
                "true"
            );

            /*
             * 允许正常选择文字、
             * 点击链接和操作详情内容。
             */
            detail.addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                }
            );
        }
    );

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

    /*
     * 供情报署菜单与返回按钮调用。
     */
    window.hideTimelineDetails =
        hideTimelineDetails;
}


/* ===========================
   8. 情报署手风琴
=========================== */

function initializeNhnAccordion() {
    const accordionOptions =
        document.querySelectorAll(
            ".accordion-menu-option"
        );

    const nhnSection =
        document.getElementById(
            "nhn-section"
        );

    const backToHomeButton =
        document.getElementById(
            "back-to-home"
        );

    const backToNhnButtons =
        document.querySelectorAll(
            ".back-to-nhn"
        );

    if (
        accordionOptions.length === 0 &&
        backToNhnButtons.length === 0
    ) {
        return;
    }

    /*
     * 从菜单 data-target 中收集
     * 所有情报署子页面。
     */
    const nhnSubsections =
        Array.from(
            accordionOptions
        )
            .map(option => {
                const targetId =
                    option.dataset.target;

                if (!targetId) {
                    return null;
                }

                return document.getElementById(
                    targetId
                );
            })
            .filter(Boolean);

    function resetAccordionOptions() {
        accordionOptions.forEach(
            option => {
                option.classList.remove(
                    "expanded"
                );
            }
        );
    }

    function hideAllNhnSubsections() {
        nhnSubsections.forEach(
            subsection => {
                subsection.classList.remove(
                    "visible"
                );

                subsection.style.display =
                    "none";
            }
        );
    }

    function resetTimelineDetails() {
        if (
            typeof window
                .hideTimelineDetails ===
            "function"
        ) {
            window.hideTimelineDetails();
        }
    }

    function showNhnHome() {
        resetTimelineDetails();
        hideAllNhnSubsections();
        resetAccordionOptions();

        if (nhnSection) {
            nhnSection.style.removeProperty(
                "display"
            );

            nhnSection.style.display =
                "block";
        }
    }

    accordionOptions.forEach(
        option => {
            option.addEventListener(
                "click",
                () => {
                    const targetId =
                        option.dataset.target;

                    const isExpanded =
                        option.classList.contains(
                            "expanded"
                        );

                    resetAccordionOptions();

                    /*
                     * 没有 data-target 的选项，
                     * 仅负责展开或收起。
                     */
                    if (!targetId) {
                        if (!isExpanded) {
                            option.classList.add(
                                "expanded"
                            );
                        }

                        return;
                    }

                    const targetSection =
                        document.getElementById(
                            targetId
                        );

                    if (!targetSection) {
                        console.error(
                            `未找到情报署目标部件: #${targetId}`
                        );

                        return;
                    }

                    /*
                     * 先播放手风琴展开动画。
                     */
                    option.classList.add(
                        "expanded"
                    );

                    window.setTimeout(
                        () => {
                            option.classList.remove(
                                "expanded"
                            );

                            resetTimelineDetails();
                            hideAllNhnSubsections();

                            if (nhnSection) {
                                nhnSection.style.display =
                                    "none";
                            }

                            /*
                             * 清除内联 display:none，
                             * 再重新触发 visible 动画。
                             */
                            targetSection.style
                                .removeProperty(
                                    "display"
                                );

                            targetSection.classList
                                .remove(
                                    "visible"
                                );

                            /*
                             * 强制浏览器重新计算布局，
                             * 使进入动画可以再次播放。
                             */
                            void targetSection
                                .offsetWidth;

                            targetSection.classList
                                .add(
                                    "visible"
                                );

                            if (
                                backToHomeButton
                            ) {
                                backToHomeButton
                                    .style
                                    .display =
                                    "block";
                            }
                        },
                        250
                    );
                }
            );
        }
    );

    backToNhnButtons.forEach(
        button => {
            button.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    showNhnHome();
                }
            );
        }
    );
}


/* ===========================
   9. 作品动态跳转
=========================== */

function initializeWorkFeed() {
    const viewCreatorButtons =
        document.querySelectorAll(
            ".work-post-view-creator"
        );

    const worksSection =
        document.getElementById(
            "works-section"
        );

    const creatorsSection =
        document.getElementById(
            "creators-section"
        );

    if (
        viewCreatorButtons.length === 0 ||
        !creatorsSection
    ) {
        return;
    }

    function findCreatorCard(creatorId) {
        return Array.from(
            document.querySelectorAll(
                ".creator-card"
            )
        ).find(card => {
            return (
                card.dataset.creator ===
                creatorId
            );
        });
    }

    function highlightCreatorCard(card) {
        card.classList.remove(
            "is-work-target"
        );

        void card.offsetWidth;

        card.classList.add(
            "is-work-target"
        );

        window.setTimeout(
            () => {
                card.classList.remove(
                    "is-work-target"
                );
            },
            2200
        );
    }

    viewCreatorButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const creatorId =
                    button.dataset.creatorTarget;

                const creatorCard =
                    findCreatorCard(creatorId);

                if (!creatorCard) {
                    console.error(
                        `未找到创作者卡片：${creatorId}`
                    );

                    return;
                }

                document
                    .querySelectorAll(".section")
                    .forEach(section => {
                        section.style.display =
                            "none";
                    });

                creatorsSection.style.display =
                    "block";

                if (worksSection) {
                    worksSection.style.display =
                        "none";
                }

                window.requestAnimationFrame(
                    () => {
                        creatorCard.scrollIntoView({
                            behavior: "smooth",
                            block: "center"
                        });

                        highlightCreatorCard(
                            creatorCard
                        );
                    }
                );
            }
        );
    });
}


/* ===========================
   10. 作品动态数字解码
=========================== */

function initializeWorkPostStats() {
    const workPosts =
        document.querySelectorAll(
            ".work-post"
        );

    if (workPosts.length === 0) {
        return;
    }

    const scrambleCharacters =
        "0123456789#$%&?@";

    /*
     * 返回指定范围内的随机整数。
     */
    function createRandomNumber(
        minimum,
        maximum
    ) {
        return Math.floor(
            Math.random() *
            (
                maximum -
                minimum +
                1
            )
        ) + minimum;
    }

    /*
     * 根据最终数字长度生成乱码。
     */
    function createScrambleText(length) {
        let result = "";

        for (
            let index = 0;
            index < length;
            index += 1
        ) {
            const characterIndex =
                Math.floor(
                    Math.random() *
                    scrambleCharacters.length
                );

            result +=
                scrambleCharacters[
                    characterIndex
                ];
        }

        return result;
    }

    /*
     * 播放单个数字的乱码解码动画。
     */
    function animateStatCount(countElement) {
        const button =
            countElement.closest(
                ".work-post-stat"
            );

        if (!button) {
            return;
        }

        const minimum =
            Number.parseInt(
                button.dataset.min,
                10
            );

        const maximum =
            Number.parseInt(
                button.dataset.max,
                10
            );

        if (
            Number.isNaN(minimum) ||
            Number.isNaN(maximum)
        ) {
            console.error(
                "作品统计按钮缺少有效的 data-min 或 data-max。"
            );

            return;
        }

        const lowerBound =
            Math.min(
                minimum,
                maximum
            );

        const upperBound =
            Math.max(
                minimum,
                maximum
            );

        const finalNumber =
            createRandomNumber(
                lowerBound,
                upperBound
            );

        const finalText =
            finalNumber.toLocaleString(
                "zh-CN"
            );

        const animationDuration = 1100;
        const updateInterval = 55;
        const startTime =
            performance.now();

        countElement.classList.add(
            "is-decoding"
        );

        function updateScramble(
            currentTime
        ) {
            const elapsedTime =
                currentTime -
                startTime;

            const progress =
                Math.min(
                    elapsedTime /
                    animationDuration,
                    1
                );

            /*
             * 动画后半段逐渐显示正确数字。
             */
            const resolvedLength =
                Math.floor(
                    finalText.length *
                    Math.max(
                        0,
                        (
                            progress -
                            0.45
                        ) /
                        0.55
                    )
                );

            const scrambleLength =
                finalText.length -
                resolvedLength;

            const scrambleText =
                createScrambleText(
                    scrambleLength
                );

            const resolvedText =
                finalText.slice(
                    finalText.length -
                    resolvedLength
                );

            countElement.textContent =
                scrambleText +
                resolvedText;

            if (progress >= 1) {
                countElement.textContent =
                    finalText;

                countElement.classList.remove(
                    "is-decoding"
                );

                return;
            }

            window.setTimeout(
                () => {
                    window.requestAnimationFrame(
                        updateScramble
                    );
                },
                updateInterval
            );
        }

        window.requestAnimationFrame(
            updateScramble
        );
    }

    /*
     * 播放一整条作品动态中的统计数字。
     */
    function animatePostStats(post) {
        const countElements =
            post.querySelectorAll(
                ".work-post-action-count"
            );

        countElements.forEach(
            (
                countElement,
                index
            ) => {
                window.setTimeout(
                    () => {
                        animateStatCount(
                            countElement
                        );
                    },
                    index * 140
                );
            }
        );
    }

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        workPosts.forEach(
            animatePostStats
        );

        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (
                        !entry.isIntersecting
                    ) {
                        return;
                    }

                    const post =
                        entry.target;

                    /*
                     * 每条动态只播放一次。
                     */
                    if (
                        post.dataset
                            .statsAnimated ===
                        "true"
                    ) {
                        return;
                    }

                    post.dataset.statsAnimated =
                        "true";

                    animatePostStats(post);

                    observer.unobserve(post);
                });
            },
            {
                root: null,
                rootMargin:
                    "0px 0px -12% 0px",
                threshold: 0.35
            }
        );

    workPosts.forEach(post => {
        observer.observe(post);
    });
}
