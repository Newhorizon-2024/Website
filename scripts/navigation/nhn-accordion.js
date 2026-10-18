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

    const mobileQuery = window.matchMedia(
        "(max-width: 768px), (hover: none), (pointer: coarse)"
    );
    let navigating = false;

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
                option.setAttribute("aria-expanded", "false");
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

    accordionOptions.forEach(
        option => {
            option.addEventListener(
                "click",
                async event => {
                    if (navigating || document.body.classList.contains("is-section-transitioning")) {
                        return;
                    }
                    const targetId =
                        option.dataset.target;

                    const isExpanded =
                        option.classList.contains(
                            "expanded"
                        );

                    resetAccordionOptions();

                    const requiresConfirmation = mobileQuery.matches || event.pointerType === "touch";
                    if (requiresConfirmation && !isExpanded) {
                        option.classList.add("expanded");
                        option.setAttribute("aria-expanded", "true");
                        return;
                    }

                    /*
                     * 没有 data-target 的选项
                     * 只负责手风琴展开。
                     */
                    if (!targetId) {
                        if (requiresConfirmation || !isExpanded) {
                            option.classList.add(
                                "expanded"
                            );
                            option.setAttribute("aria-expanded", "true");
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
                    option.setAttribute("aria-expanded", "true");

                    if (typeof window.showSection !== "function") {
                        console.error("全局 showSection 尚未初始化。");
                        return;
                    }

                    navigating = true;
                    resetTimelineDetails();
                    try {
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
                    } finally {
                        navigating = false;
                        resetAccordionOptions();
                    }
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

    resetAccordionOptions();
    mobileQuery.addEventListener?.("change", resetAccordionOptions);
    window.addEventListener("section-shown", resetAccordionOptions);
}
