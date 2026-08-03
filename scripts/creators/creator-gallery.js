/* ===========================
    创作者作品预览
=========================== */

export function initializeCreatorGallery() {
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