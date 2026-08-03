/* ===========================
   12. 悬赏令页面切换
=========================== */

export function initializeBountyNavigation() {
    const bountyLinks =
        document.querySelectorAll(
            ".bounty-page-link"
        );

    if (bountyLinks.length === 0) {
        return;
    }

    function showBountySection(
        sectionId
    ) {
        const targetSection =
            document.getElementById(
                sectionId
            );

        if (!targetSection) {
            console.error(
                `未找到悬赏令页面：#${sectionId}`
            );

            return;
        }

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

        const isReturning =
            sectionId ===
            "bounty-board-section";

        window.showSection(
            sectionId,
            {
                transitionType: "slide",
                direction:
                    isReturning
                        ? "backward"
                        : "forward",
                scrollMode: "none"
            }
        );
    }

    bountyLinks.forEach(link => {
        function activateLink() {
            const targetId =
                link.dataset.target;

            if (!targetId) {
                console.error(
                    "悬赏令链接缺少 data-target。"
                );

                return;
            }

            showBountySection(
                targetId
            );
        }

        link.addEventListener(
            "click",
            event => {
                event.stopPropagation();
                activateLink();
            }
        );

        link.addEventListener(
            "keydown",
            event => {
                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                activateLink();
            }
        );
    });
}