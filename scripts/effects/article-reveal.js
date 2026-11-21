import { drawArchiveTitle } from "./archive-title-stroke.js?v=26.11.21.3";

/* 正文按段进入视口，在本次阅读中只显现一次。 */
export function initializeArticleReveal() {
    if (!window.IntersectionObserver || !Element.prototype.animate) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const articles = document.querySelectorAll("[data-archive-article], #timeline-section");
    const playing = new Set();
    let article = null;
    let observer = null;
    let read = new WeakSet();

    let finishTitle;
    function stop() {
        finishTitle?.();
        finishTitle = null;
        observer?.disconnect();
        observer = null;
        for (const animation of playing) animation.cancel();
        playing.clear();
    }

    function synchronize() {
        let next = document.querySelector(".section.is-active[data-archive-article], #timeline-section.is-active");
        if (next?.id === "timeline-section") next = next.querySelector(".timeline-detail.active");

        if (next !== article) {
            stop();
            article = next;
            read = new WeakSet();
        }
        if (!article || document.hidden || motion.matches) {
            stop();
            return;
        }
        if (observer) return;

        observer = new IntersectionObserver((entries, source) => {
            if (source !== observer) return;
            let order = 0;
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const text = entry.target;
                source.unobserve(text);
                read.add(text);
                if (text.tagName === "H1") {
                    finishTitle = drawArchiveTitle(text);
                    continue;
                }
                const animation = text.animate([
                    { opacity: .32, filter: "blur(2px)", translate: "0 5px", offset: 0 },
                    { offset: 1 }
                ], {
                    duration: 440,
                    delay: Math.min(order++, 3) * 22,
                    easing: "cubic-bezier(.2,.7,.25,1)",
                    fill: "backwards"
                });
                playing.add(animation);
                animation.onfinish = animation.oncancel = () => playing.delete(animation);
            }
        });
        const heading = article.hasAttribute("data-archive-article") && article.querySelector("h1");
        if (heading && !read.has(heading)) observer.observe(heading);
        for (const text of article.querySelectorAll("p, .ruler-prophecy h2, .innerworld-quote cite, .innerworld-figure figcaption, .innerworld-chapter-header h2, .innerworld-ending > h2")) {
            if (read.has(text) || text.closest("button, [hidden], [aria-hidden='true']") ||
                text.matches("[class$='-eyebrow'], [class$='-title-en'], .timeline-detail-en, .innerworld-chapter-index, .newworld-subtitle, .colosseum-game-en") ||
                !text.textContent.trim()) continue;
            observer.observe(text);
        }
    }

    const navigation = new MutationObserver(synchronize);
    for (const section of articles) navigation.observe(section, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("timeline-thread-select", synchronize);
    window.addEventListener("timeline-thread-clear", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    motion.addEventListener("change", synchronize);
    synchronize();
}

