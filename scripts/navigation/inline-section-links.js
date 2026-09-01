/* 正文内 Section 导航 */

let inlineSectionLinksInitialized = false;

export function initializeInlineSectionLinks() {
    if (inlineSectionLinksInitialized) return;

    const links = Array.from(
        document.querySelectorAll("[data-section-link]")
    );

    if (links.length === 0) return;

    inlineSectionLinksInitialized = true;

    links.forEach(link => {
        link.addEventListener("click", async event => {
            const targetId = link.dataset.sectionLink;

            if (!targetId || !document.getElementById(targetId)) {
                return;
            }

            if (typeof window.showSection !== "function") {
                return;
            }

            event.preventDefault();

            await window.showSection(targetId, {
                transitionType: "slide",
                direction: "forward",
                scrollMode: "top",
                historyMode: "push"
            });
        });
    });
}
