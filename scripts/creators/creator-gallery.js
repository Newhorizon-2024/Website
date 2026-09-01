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

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    let activeWorkIndex = 0;
    let transitionInProgress = false;

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

    function setLightboxOpen(open) {
        lightbox?.classList.toggle(
            "active",
            open
        );

        lightbox?.setAttribute(
            "aria-hidden",
            open
                ? "false"
                : "true"
        );

        document.body.classList.toggle(
            "creator-lightbox-open",
            open
        );
    }

    function nextPaint() {
        return new Promise(resolve => {
            window.requestAnimationFrame(
                () => {
                    window.requestAnimationFrame(
                        resolve
                    );
                }
            );
        });
    }

    function waitForLightboxImage() {
        if (
            !lightboxImage ||
            (
                lightboxImage.complete &&
                lightboxImage.naturalWidth > 0
            )
        ) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            let settled = false;

            const finish = () => {
                if (settled) {
                    return;
                }

                settled = true;
                resolve();
            };

            lightboxImage.addEventListener(
                "load",
                finish,
                { once: true }
            );

            lightboxImage.addEventListener(
                "error",
                finish,
                { once: true }
            );

            window.setTimeout(
                finish,
                1200
            );
        });
    }

    function isUsableRect(rect) {
        return Boolean(
            rect &&
            rect.width > 2 &&
            rect.height > 2 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight
        );
    }

    async function animateBetweenImages(
        sourceImage,
        targetImage,
        imageSource,
        reverse = false
    ) {
        if (
            reducedMotionQuery.matches ||
            typeof Element.prototype.animate !==
                "function" ||
            !sourceImage ||
            !targetImage ||
            !imageSource
        ) {
            return false;
        }

        const sourceRect =
            sourceImage.getBoundingClientRect();

        const targetRect =
            targetImage.getBoundingClientRect();

        if (
            !isUsableRect(sourceRect) ||
            !isUsableRect(targetRect)
        ) {
            return false;
        }

        const transitionImage =
            document.createElement("img");

        transitionImage.className =
            "creator-gallery-transition-image";
        transitionImage.src =
            imageSource;
        transitionImage.alt =
            "";
        transitionImage.draggable =
            false;
        transitionImage.style.left =
            `${sourceRect.left}px`;
        transitionImage.style.top =
            `${sourceRect.top}px`;
        transitionImage.style.width =
            `${sourceRect.width}px`;
        transitionImage.style.height =
            `${sourceRect.height}px`;

        document.body.append(
            transitionImage
        );

        sourceImage.classList.add(
            "is-gallery-transition-hidden"
        );
        targetImage.classList.add(
            "is-gallery-transition-hidden"
        );

        const translateX =
            targetRect.left -
            sourceRect.left;
        const translateY =
            targetRect.top -
            sourceRect.top;
        const scaleX =
            targetRect.width /
            sourceRect.width;
        const scaleY =
            targetRect.height /
            sourceRect.height;

        const animation =
            transitionImage.animate(
                [
                    {
                        borderRadius:
                            reverse
                                ? "0px"
                                : "2px",
                        transform:
                            "translate3d(0, 0, 0) scale(1)"
                    },
                    {
                        borderRadius:
                            reverse
                                ? "2px"
                                : "0px",
                        transform:
                            `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`
                    }
                ],
                {
                    duration:
                        window.innerWidth <= 600
                            ? 380
                            : 480,
                    easing:
                        "cubic-bezier(0.22, 1, 0.36, 1)",
                    fill:
                        "forwards"
                }
            );

        await animation.finished.catch(
            () => undefined
        );

        transitionImage.remove();
        sourceImage.classList.remove(
            "is-gallery-transition-hidden"
        );
        targetImage.classList.remove(
            "is-gallery-transition-hidden"
        );

        return true;
    }

    async function openLightbox(index) {
        if (
            !lightbox ||
            creatorWorks.length === 0 ||
            transitionInProgress
        ) {
            return;
        }

        transitionInProgress = true;

        const sourceImage =
            creatorWorks[index]
                ?.querySelector("img");

        updateLightbox(index);

        await waitForLightboxImage();

        lightboxImage?.classList.add(
            "is-gallery-transition-hidden"
        );

        setLightboxOpen(true);
        await nextPaint();

        await animateBetweenImages(
            sourceImage,
            lightboxImage,
            sourceImage?.currentSrc ||
                lightboxImage?.currentSrc ||
                lightboxImage?.src
        );

        lightboxImage?.classList.remove(
            "is-gallery-transition-hidden"
        );

        lightboxCloseButton?.focus();
        transitionInProgress = false;
    }

    async function closeLightbox() {
        if (
            !lightbox ||
            transitionInProgress
        ) {
            return;
        }

        transitionInProgress = true;

        const targetImage =
            creatorWorks[
                activeWorkIndex
            ]?.querySelector("img");

        const imageSource =
            lightboxImage?.currentSrc ||
            lightboxImage?.src ||
            targetImage?.currentSrc;

        lightbox.classList.remove(
            "active"
        );
        lightbox.setAttribute(
            "aria-hidden",
            "true"
        );

        await animateBetweenImages(
            lightboxImage,
            targetImage,
            imageSource,
            true
        );

        document.body.classList.remove(
            "creator-lightbox-open"
        );

        creatorWorks[
            activeWorkIndex
        ]?.focus();

        transitionInProgress = false;
    }

    async function changeLightbox(direction) {
        if (
            creatorWorks.length === 0 ||
            transitionInProgress
        ) {
            return;
        }

        transitionInProgress = true;

        if (
            reducedMotionQuery.matches ||
            !lightboxImage ||
            typeof lightboxImage.animate !==
                "function"
        ) {
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

            transitionInProgress = false;
            return;
        }

        lightboxImage.classList.add(
            "is-gallery-switching"
        );

        await lightboxImage.animate(
            [
                {
                    opacity: 1,
                    transform:
                        "translateX(0) scale(1)"
                },
                {
                    opacity: 0,
                    transform:
                        `translateX(${direction > 0 ? -28 : 28}px) scale(0.985)`
                }
            ],
            {
                duration: 170,
                easing: "ease-in",
                fill: "forwards"
            }
        ).finished.catch(
            () => undefined
        );

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

        await waitForLightboxImage();

        await lightboxImage.animate(
            [
                {
                    opacity: 0,
                    transform:
                        `translateX(${direction > 0 ? 28 : -28}px) scale(0.985)`
                },
                {
                    opacity: 1,
                    transform:
                        "translateX(0) scale(1)"
                }
            ],
            {
                duration: 230,
                easing:
                    "cubic-bezier(0.22, 1, 0.36, 1)",
                fill: "forwards"
            }
        ).finished.catch(
            () => undefined
        );

        lightboxImage.classList.remove(
            "is-gallery-switching"
        );
        transitionInProgress = false;
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
