import { prepareImageLoading } from "../effects/image-loading.js?v=26.10.18.11";
import { MorphSliderStage } from "./morph-slider.js?v=26.10.19.1";

let initialized = false;

/* ===========================
    创作者作品预览
=========================== */

export function initializeCreatorGallery() {
    if (initialized) return;
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

    const stage = document.getElementById("creator-morph-stage");
    const indicators = lightbox?.querySelector(".creator-lightbox-indicators");
    if (!stage || !lightbox || !lightboxImage || !creatorWorks.length) return;
    initialized = true;
    lightbox.inert = true;
    const morph = new MorphSliderStage(stage);
    const preloads = new Map();
    const animations = new Set();
    const clones = new Set();
    const hiddenOwners = new WeakMap();
    let holdImage = null;
    let gesture = null;
    let closing = false;
    let lenisWasRunning = false;

    let activeWorkIndex = 0;
    let transitionInProgress = false;
    let lightboxRequestId = 0;

    const wrap = index => (index % creatorWorks.length + creatorWorks.length) % creatorWorks.length;

    function preload(index) {
        const work = creatorWorks[wrap(index)];
        const src = work.dataset.full || work.querySelector("img")?.src || "";
        if (preloads.has(src)) return preloads.get(src);
        const image = new Image();
        image.decoding = "async";
        if (new URL(src, location.href).origin !== location.origin) image.crossOrigin = "anonymous";
        const record = { image, ready: false };
        record.promise = new Promise(resolve => {
            image.onload = async () => {
                try { await image.decode?.(); } catch { /* load + 有效尺寸仍可用于兜底 */ }
                record.ready = image.naturalWidth > 0;
                resolve(record.ready);
            };
            image.onerror = () => resolve(false);
        });
        preloads.set(src, record);
        image.src = src;
        // 只预热相邻作品，不一次解码整个创作者图库。
        while (preloads.size > 5) preloads.delete(preloads.keys().next().value);
        return record;
    }

    function preloadNeighbors() { preload(activeWorkIndex - 1); preload(activeWorkIndex + 1); }

    function updateIndicators() {
        lightbox.dataset.workIndex = String(activeWorkIndex);
        indicators?.querySelectorAll("button").forEach((button, index) => {
            const active = index === activeWorkIndex;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
            if (active) {
                const left = button.offsetLeft - indicators.clientWidth / 2 + button.offsetWidth / 2;
                indicators.scrollTo({ left, behavior: "instant" });
            }
        });
    }

    function removeHold() { holdImage?.remove(); holdImage = null; }

    function rememberCurrent() {
        if (holdImage?.complete && holdImage.naturalWidth) return holdImage;
        if (!lightboxImage.complete || !lightboxImage.naturalWidth || lightboxImage.dataset.imageLoadState !== "ready") return null;
        holdImage = new Image();
        holdImage.className = "creator-morph-hold";
        holdImage.dataset.imageLoading = "off";
        holdImage.alt = "";
        holdImage.setAttribute("aria-hidden", "true");
        holdImage.src = lightboxImage.currentSrc || lightboxImage.src;
        stage.insertBefore(holdImage, lightboxImage);
        return holdImage;
    }

    function cancelVisuals() {
        morph.cancel();
        for (const animation of animations) animation.cancel();
        animations.clear();
        for (const clone of clones) clone.remove();
        clones.clear();
        document.querySelectorAll(".is-gallery-transition-hidden").forEach(image => {
            image.classList.remove("is-gallery-transition-hidden");
            hiddenOwners.delete(image);
        });
    }

    function animate(element, frames, options) {
        const animation = element.animate(frames, options);
        animations.add(animation);
        const done = () => animations.delete(animation);
        animation.onfinish = done;
        animation.oncancel = done;
        return animation;
    }

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
        updateIndicators();

        // 以缩略图比例预留查看器空间，加载期间也有稳定的提示位置。
        for (const name of ["width", "height"]) {
            const value = image?.getAttribute(name);
            if (value) lightboxImage.setAttribute(name, value);
        }
        const ratio = Number(image?.getAttribute("width") || image?.naturalWidth || 16) /
            Number(image?.getAttribute("height") || image?.naturalHeight || 9);
        const loadingWidth = Math.min(1200, innerWidth * 0.82, innerHeight * 0.78 * ratio);
        lightboxImage.style.setProperty("--lightbox-loading-width", `${loadingWidth}px`);
        lightboxImage.style.setProperty("--lightbox-loading-height", `${loadingWidth / ratio}px`);
        lightboxImage.dataset.imageRevealOwner = "gallery";

        lightboxImage.src =
            fullImage;

        lightboxImage.alt =
            caption;

        prepareImageLoading(lightboxImage);

        if (lightboxCaption) {
            lightboxCaption.textContent =
                caption;
            if (lightbox.classList.contains("active") && !reducedMotionQuery.matches) {
                animate(lightboxCaption, [
                    { opacity: 0, transform: "translateY(8px)", filter: "blur(4px)" },
                    { opacity: 0.72, transform: "translateY(0)", filter: "blur(0)" }
                ], { duration: 726, easing: "cubic-bezier(.16,1,.3,1)" });
            }
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
        const wasOpen = lightbox.classList.contains("active");
        if (open && !wasOpen) {
            lenisWasRunning = Boolean(window.lenis && !window.lenis.isStopped);
            if (lenisWasRunning) window.lenis.stop();
        }
        if (!open && lenisWasRunning) { window.lenis?.start(); lenisWasRunning = false; }
        lightbox.inert = !open;
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
        return lightboxImage ? prepareImageLoading(lightboxImage) : Promise.resolve(false);
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

    function visualRect(image) {
        const rect = image.getBoundingClientRect();
        if (image !== lightboxImage || !image.naturalWidth) return rect;
        const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
        const left = rect.left + (rect.width - width) / 2, top = rect.top + (rect.height - height) / 2;
        return { left, top, width, height, right: left + width, bottom: top + height };
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
            !imageSource ||
            !sourceImage.complete || !sourceImage.naturalWidth ||
            !targetImage.complete || !targetImage.naturalWidth
        ) {
            return false;
        }

        const sourceRect =
            visualRect(sourceImage);

        const targetRect =
            visualRect(targetImage);

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
        clones.add(transitionImage);

        sourceImage.classList.add(
            "is-gallery-transition-hidden"
        );
        targetImage.classList.add(
            "is-gallery-transition-hidden"
        );
        hiddenOwners.set(sourceImage, transitionImage);
        hiddenOwners.set(targetImage, transitionImage);

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
            animate(transitionImage,
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
        clones.delete(transitionImage);
        for (const image of [sourceImage, targetImage]) {
            if (hiddenOwners.get(image) === transitionImage) {
                image.classList.remove("is-gallery-transition-hidden");
                hiddenOwners.delete(image);
            }
        }

        return true;
    }

    async function openLightbox(index) {
        if (!lightbox || !lightboxImage || !creatorWorks.length || transitionInProgress) return;
        const requestId = ++lightboxRequestId;
        const startedAt = performance.now();
        cancelVisuals();
        removeHold();
        const sourceImage = creatorWorks[index]?.querySelector("img");
        updateLightbox(index);
        setLightboxOpen(true);
        lightboxCloseButton?.focus();

        // 立即打开查看器展示加载点；网络等待期间仍可关闭或切换下一张。
        const succeeded = await waitForLightboxImage();
        if (requestId !== lightboxRequestId || !lightbox.classList.contains("active")) return;
        if (!succeeded) {
            delete lightboxImage.dataset.imageRevealOwner;
            return;
        }
        preloadNeighbors();
        transitionInProgress = true;
        try {
            let morphed = false;
            if (performance.now() - startedAt < 180 && sourceImage?.complete && sourceImage.naturalWidth) {
                lightboxImage.classList.add("is-gallery-transition-hidden");
                await nextPaint();
                if (requestId !== lightboxRequestId || !lightbox.classList.contains("active")) return;
                morphed = await animateBetweenImages(
                    sourceImage, lightboxImage,
                    sourceImage.currentSrc || lightboxImage.currentSrc || lightboxImage.src
                );
                if (requestId === lightboxRequestId) lightboxImage.classList.remove("is-gallery-transition-hidden");
            }
            if (requestId !== lightboxRequestId) return;
            if (!morphed && !reducedMotionQuery.matches && lightboxImage.animate) {
                await animate(lightboxImage,
                    [{ opacity: 0 }, { opacity: 1 }],
                    { duration: 320, easing: "ease-out" }
                ).finished.catch(() => undefined);
            }
        } finally {
            if (requestId === lightboxRequestId) {
                transitionInProgress = false;
                delete lightboxImage.dataset.imageRevealOwner;
            }
        }
    }

    async function closeLightbox({ immediate = false, restoreFocus = true } = {}) {
        if (!lightbox?.classList.contains("active") || closing) return;
        ++lightboxRequestId;
        closing = true;
        transitionInProgress = true;
        cancelGesture();
        cancelVisuals();
        removeHold();
        const targetImage = creatorWorks[activeWorkIndex]?.querySelector("img");
        const canMorph = lightboxImage?.dataset.imageLoadState === "ready";
        lightbox.classList.remove("active");
        lightbox.setAttribute("aria-hidden", "true");
        lightbox.inert = true;
        try {
            if (canMorph && !immediate) {
                await animateBetweenImages(
                    lightboxImage, targetImage,
                    lightboxImage.currentSrc || lightboxImage.src || targetImage?.currentSrc, true
                );
            }
        } finally {
            setLightboxOpen(false);
            morph.destroy();
            preloads.clear();
            delete lightboxImage.dataset.imageRevealOwner;
            if (restoreFocus) creatorWorks[activeWorkIndex]?.focus({ preventScroll: true });
            closing = false;
            transitionInProgress = false;
        }
    }

    async function changeLightbox(direction) {
        return goToLightboxIndex(wrap(activeWorkIndex + direction), direction);
    }

    async function goToLightboxIndex(index, direction = 1, dragProgress = 0, pointer = [0.5, 0.5]) {
        if (!lightbox.classList.contains("active") || closing || transitionInProgress || index === activeWorkIndex) return;
        const requestId = ++lightboxRequestId;
        const previous = rememberCurrent();
        let succeeded = false;
        try {
            updateLightbox(index);
            succeeded = await waitForLightboxImage();
            if (requestId !== lightboxRequestId || !lightbox.classList.contains("active")) return;
            if (!succeeded) return;
            transitionInProgress = true;
            const ready = previous && !reducedMotionQuery.matches && morph.prepare(previous, lightboxImage, { direction, pointer });
            if (ready) {
                await morph.play({ from: dragProgress, to: 1, duration: dragProgress ? 500 : 1100 });
            } else if (lightboxImage.animate) {
                await animate(lightboxImage, [{ opacity: 0 }, { opacity: 1 }], {
                    duration: reducedMotionQuery.matches ? 150 : 320, easing: "ease-out"
                }).finished.catch(() => undefined);
            }
        } finally {
            if (requestId === lightboxRequestId) {
                morph.cancel();
                removeHold();
                delete lightboxImage.dataset.imageRevealOwner;
                transitionInProgress = false;
                if (succeeded && lightbox.classList.contains("active")) preloadNeighbors();
            }
        }
    }

    function cancelGesture() {
        const previous = gesture;
        gesture = null;
        stage.classList.remove("is-dragging");
        if (previous && stage.hasPointerCapture?.(previous.id)) stage.releasePointerCapture(previous.id);
        morph.cancel();
    }

    function endGesture(event, cancelled = false) {
        const g = gesture;
        if (!g || (event && event.pointerId !== g.id)) return;
        gesture = null;
        stage.classList.remove("is-dragging");
        if (stage.hasPointerCapture?.(g.id)) stage.releasePointerCapture(g.id);
        if (!g.moved) { morph.cancel(); return; }
        if (!cancelled && g.progress > 0.4) {
            goToLightboxIndex(wrap(activeWorkIndex + g.direction), g.direction, g.progress, g.pointer);
        } else if (g.rendered && !reducedMotionQuery.matches) {
            transitionInProgress = true;
            const requestId = lightboxRequestId;
            morph.play({ from: g.progress, to: 0, duration: 400 }).finally(() => {
                if (requestId === lightboxRequestId) { morph.cancel(); transitionInProgress = false; }
            });
        } else morph.cancel();
    }

    stage.addEventListener("pointerdown", event => {
        if (event.button !== 0 || event.isPrimary === false || gesture || transitionInProgress || closing ||
            !lightbox.classList.contains("active") || lightboxImage.dataset.imageLoadState !== "ready") return;
        const rect = stage.getBoundingClientRect();
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width,
            moved: false, progress: 0, direction: 1, rendered: false,
            pointer: [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height] };
        stage.setPointerCapture(event.pointerId);
        stage.focus({ preventScroll: true });
    });
    stage.addEventListener("pointermove", event => {
        const g = gesture;
        if (!g || g.id !== event.pointerId) return;
        const dx = event.clientX - g.x, dy = event.clientY - g.y;
        if (!g.moved && (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.15)) return;
        g.moved = true;
        stage.classList.add("is-dragging");
        if (event.cancelable) event.preventDefault();
        g.direction = dx < 0 ? 1 : -1;
        g.progress = Math.min(1, Math.abs(dx) / Math.max(1, g.width));
        const target = preload(activeWorkIndex + g.direction);
        if (target.ready && !reducedMotionQuery.matches && morph.prepare(lightboxImage, target.image, { direction: g.direction, pointer: g.pointer })) {
            morph.render(g.progress);
            g.rendered = true;
        }
    });
    stage.addEventListener("pointerup", event => endGesture(event));
    stage.addEventListener("pointercancel", event => endGesture(event, true));
    stage.addEventListener("lostpointercapture", event => endGesture(event, true));
    stage.addEventListener("dragstart", event => event.preventDefault());

    creatorWorks.forEach((work, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "morph-slider-dot";
        button.setAttribute("role", "tab");
        button.setAttribute("aria-controls", "creator-morph-stage");
        button.setAttribute("aria-label", `第 ${index + 1} 张：${work.dataset.caption || work.querySelector("img")?.alt || "作品"}`);
        button.addEventListener("click", () => goToLightboxIndex(index, index > activeWorkIndex ? 1 : -1));
        indicators?.append(button);
    });
    updateIndicators();

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
                    event.preventDefault();
                    closeLightbox();
                    break;

                case "ArrowLeft":
                    event.preventDefault();
                    changeLightbox(-1);
                    break;

                case "ArrowRight":
                    event.preventDefault();
                    changeLightbox(1);
                    break;

                case "Tab": {
                    const focusable = [...lightbox.querySelectorAll("button, a[href], [tabindex='0']")].filter(element => !element.hidden && !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
                    const first = focusable[0], last = focusable.at(-1);
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
                    break;
                }
                default:
                    break;
            }
        }
    );

    reducedMotionQuery.addEventListener("change", () => { cancelGesture(); cancelVisuals(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelGesture(); cancelVisuals(); } });
    window.addEventListener("blur", cancelGesture);
    window.addEventListener("resize", () => { if (gesture) cancelGesture(); });
    window.addEventListener("section-shown", event => {
        if (event.detail?.sectionId !== "creators-section" && lightbox.classList.contains("active")) closeLightbox({ immediate: true, restoreFocus: false });
    });
    window.addEventListener("pagehide", () => {
        ++lightboxRequestId;
        cancelGesture(); cancelVisuals(); removeHold(); morph.destroy(); preloads.clear();
        setLightboxOpen(false); closing = transitionInProgress = false;
    });
}
