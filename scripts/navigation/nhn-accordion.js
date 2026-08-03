import {
    hideWorldviewCore,
    initializeWorldviewCore,
    showWorldviewCore
} from "../effects/worldview-core.js";


/* ===========================
    情报署手风琴
=========================== */

export function initializeNhnAccordion() {
    const accordionOptions =
        document.querySelectorAll(
            ".accordion-menu-option"
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

    function resetAccordionOptions() {
        accordionOptions.forEach(
            option => {
                option.classList.remove(
                    "expanded"
                );
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

    function restartTimelineAnimation(
        targetSection
    ) {
        if (
            targetSection.id !==
            "timeline-section"
        ) {
            return;
        }

        targetSection.classList.remove(
            "visible"
        );

        void targetSection.offsetWidth;

        targetSection.classList.add(
            "visible"
        );
    }

    function updateWorldviewState(
        targetId
    ) {
        if (
            targetId ===
            "worldview-section"
        ) {
            /*
             * 等待showSection完成当前帧中的显示切换，
             * 再读取容器尺寸并启动渲染。
             */
            window.requestAnimationFrame(
                () => {
                    showWorldviewCore();
                }
            );

            return;
        }

        hideWorldviewCore();
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
                     * 没有 data-target 的选项
                     * 只负责手风琴展开。
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

                    option.classList.add(
                        "expanded"
                    );

                    window.setTimeout(
                        async () => {
                            option.classList.remove(
                                "expanded"
                            );

                            resetTimelineDetails();

                            if (
                                typeof window
                                    .showSection !==
                                "function"
                            ) {
                                console.error(
                                    "全局 showSection 尚未初始化。"
                                );

                                return;
                            }

                            await window.showSection(
                                targetId,
                                {
                                    transitionType:
                                        "slide",

                                    direction:
                                        "forward",

                                    scrollMode:
                                        "none"
                                }
                            );

                            updateWorldviewState(
                                targetId
                            );
                        }
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

                    resetTimelineDetails();
                    resetAccordionOptions();

                    if (
                        typeof window
                            .showSection !==
                        "function"
                    ) {
                        console.error(
                            "全局 showSection 尚未初始化。"
                        );

                        return;
                    }

                    hideWorldviewCore();

                    window.showSection(
                        "nhn-section",
                        {
                            transitionType:
                                "slide",

                            direction:
                                "backward",

                            scrollMode:
                                "none"
                        }
                    );
                }
            );
        }
    );
}