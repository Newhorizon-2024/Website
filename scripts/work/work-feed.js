/* ===========================
    作品动态跳转
=========================== */

export function initializeWorkFeed() {
    const viewCreatorButtons =
        document.querySelectorAll(
            ".work-post-view-creator"
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

                if (
                    typeof window.
                        showSection !==
                    "function"
                ) {
                    console.error(
                        "全局 showSection 尚未初始化。"
                    );

                    return;
                }

                window.showSection(
                    "creators-section",
                    {
                        transitionType: "depth",
                        direction: "forward",
                        scrollMode: "none"
                    }
                ).then(sectionChanged => {
                    if (!sectionChanged) {
                        return;
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
                });
            }
        );
    });
}