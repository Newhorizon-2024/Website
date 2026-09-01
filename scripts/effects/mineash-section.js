/* 世界观 · 米内什 */

let mineashInitialized = false;

export function initializeMineashSection() {
    if (mineashInitialized) return;

    const section = document.getElementById("mineash-section");
    if (!section) return;

    const elements = Array.from(
        section.querySelectorAll("[data-mineash-reveal], [data-mineash-image-reveal]")
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer = null;

    function revealAll() {
        elements.forEach(element => element.classList.add("is-revealed"));
    }

    function revealVisible() {
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
                element.classList.add("is-revealed");
            }
        });
    }

    function createObserver() {
        observer?.disconnect();
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
            revealAll();
            return;
        }

        observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-revealed");
                    } else if (entry.boundingClientRect.top > window.innerHeight) {
                        entry.target.classList.remove("is-revealed");
                    }
                });
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
        );
        elements.forEach(element => observer.observe(element));
    }

    const sectionObserver = new MutationObserver(() => {
        if (section.classList.contains("is-active")) {
            requestAnimationFrame(revealVisible);
        }
    });
    sectionObserver.observe(section, {
        attributes: true,
        attributeFilter: ["class", "style"]
    });

    reducedMotion.addEventListener?.("change", () => {
        createObserver();
        revealVisible();
    });

    mineashInitialized = true;
    createObserver();
    revealVisible();
}
