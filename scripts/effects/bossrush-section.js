/* 世界观 · Bossrush */

let bossrushSectionInitialized = false;

export function initializeBossrushSection() {
    if (bossrushSectionInitialized) return;

    const section = document.getElementById("bossrush-section");
    if (!section) return;

    const revealElements = Array.from(
        section.querySelectorAll(
            "[data-bossrush-reveal], [data-bossrush-image-reveal]"
        )
    );
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );
    let observer = null;

    function revealAll() {
        revealElements.forEach(element => {
            element.classList.add("is-revealed");
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
                        return;
                    }

                    if (entry.boundingClientRect.top > window.innerHeight) {
                        entry.target.classList.remove("is-revealed");
                    }
                });
            },
            {
                rootMargin: "0px 0px -10% 0px",
                threshold: 0.12
            }
        );

        revealElements.forEach(element => observer.observe(element));
    }

    function revealVisibleElements() {
        revealElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
                element.classList.add("is-revealed");
            }
        });
    }

    const sectionObserver = new MutationObserver(() => {
        if (section.classList.contains("is-active")) {
            requestAnimationFrame(revealVisibleElements);
        }
    });

    sectionObserver.observe(section, {
        attributes: true,
        attributeFilter: ["class", "style"]
    });

    reducedMotion.addEventListener?.("change", () => {
        createObserver();
        revealVisibleElements();
    });

    bossrushSectionInitialized = true;
    createObserver();
    revealVisibleElements();
}
