import { MorphSliderStage } from "../creators/morph-slider.js?v=26.10.19.4";
import { prepareImageLoading } from "./image-loading.js?v=26.10.19.4";

let initialized = false;

/* 悬赏令共用作品预览的变形转场；原图尺寸和单击行为不变。 */
export function initializeWantedPreview() {
    if (initialized) return;
    const posters = [...document.querySelectorAll("#bounty-board-section img.wanted-poster")];
    if (!posters.length) return;
    initialized = true;

    const lightbox = document.createElement("div");
    lightbox.id = "wanted-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "悬赏令大图预览");
    lightbox.setAttribute("aria-describedby", "wanted-lightbox-hint");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.inert = true;
    lightbox.innerHTML = `
        <div class="wanted-lightbox-figure">
            <div id="wanted-morph-stage" class="wanted-morph-stage" tabindex="0" role="group" aria-label="悬赏令图片，可左右拖动切换" data-morph-transition="melt">
                <img id="wanted-lightbox-image" alt="" decoding="async" draggable="false">
            </div>
            <p id="wanted-lightbox-caption" aria-live="polite"></p>
            <p id="wanted-lightbox-hint">点击图片外空白处关闭 · 左右切换</p>
        </div>
        <button type="button" class="wanted-lightbox-control wanted-lightbox-prev" aria-label="上一张悬赏令"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>
        <button type="button" class="wanted-lightbox-control wanted-lightbox-next" aria-label="下一张悬赏令"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>`;
    document.body.append(lightbox);
    const stage = lightbox.querySelector(".wanted-morph-stage");
    const image = lightbox.querySelector("#wanted-lightbox-image");
    const caption = lightbox.querySelector("#wanted-lightbox-caption");
    const previous = lightbox.querySelector(".wanted-lightbox-prev");
    const next = lightbox.querySelector(".wanted-lightbox-next");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const morph = new MorphSliderStage(stage);
    const preloads = new Map();
    const animations = new Set();
    const clones = new Set();
    const hiddenImages = new Set();
    const backgroundInert = new Map();
    let index = 0;
    let requestId = 0;
    let opened = false;
    let closing = false;
    let transitioning = false;
    let hold = null;
    let gesture = null;
    let focusBeforeOpen = null;
    let lenisBeforeOpen = null;
    let lenisWasRunning = false;
    let lastTap = null;
    let touch = null;
    let skipNativeDoubleClickUntil = 0;
    let suppressClickUntil = 0;
    const wrap = value => (value % posters.length + posters.length) % posters.length;
    const source = poster => poster.dataset.full || poster.currentSrc || poster.src;

    function visualRect(target) {
        const rect = target.getBoundingClientRect();
        if (!target.naturalWidth || target !== image && target !== hold) return rect;
        const scale = Math.min(rect.width / target.naturalWidth, rect.height / target.naturalHeight);
        const width = target.naturalWidth * scale, height = target.naturalHeight * scale;
        const left = rect.left + (rect.width - width) / 2, top = rect.top + (rect.height - height) / 2;
        return { left, top, width, height, right: left + width, bottom: top + height };
    }

    function overImage(event) {
        // 待加载/失败阶段没有可见图片，不让全屏 img 布局框吞掉空白退出。
        if (!image.naturalWidth || image.dataset.imageLoadState !== "ready") return false;
        const rect = visualRect(image);
        return event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom;
    }

    function animate(element, frames, options) {
        if (!element.animate) return null;
        const animation = element.animate(frames, options);
        animations.add(animation);
        const settled = () => animations.delete(animation);
        animation.onfinish = settled;
        animation.oncancel = settled;
        return animation;
    }

    function cancelVisuals() {
        morph.cancel();
        for (const animation of animations) animation.cancel();
        animations.clear();
        for (const clone of clones) clone.remove();
        clones.clear();
        for (const target of hiddenImages) target.classList.remove("is-wanted-transition-hidden");
        hiddenImages.clear();
    }

    function removeHold() { hold?.remove(); hold = null; }

    function rememberCurrent() {
        if (hold?.complete && hold.naturalWidth) return hold;
        if (!image.complete || !image.naturalWidth || image.dataset.imageLoadState !== "ready") return null;
        hold = new Image();
        hold.className = "wanted-morph-hold";
        hold.dataset.imageLoading = "off";
        hold.setAttribute("aria-hidden", "true");
        hold.alt = "";
        hold.src = image.currentSrc || image.src;
        stage.insertBefore(hold, image);
        return hold;
    }

    function preload(targetIndex) {
        const src = source(posters[wrap(targetIndex)]);
        if (preloads.has(src)) return preloads.get(src);
        const target = new Image();
        target.decoding = "async";
        if (new URL(src, location.href).origin !== location.origin) target.crossOrigin = "anonymous";
        const record = { image: target, ready: false };
        record.promise = new Promise(resolve => {
            target.onload = async () => {
                let timeout;
                try {
                    await Promise.race([target.decode?.(), new Promise(done => { timeout = setTimeout(done, 1000); })]);
                } catch { /* 已加载的有效图片可作为降级路径。 */ }
                finally { clearTimeout(timeout); }
                record.ready = Boolean(target.naturalWidth);
                resolve(record.ready);
            };
            target.onerror = () => resolve(false);
        });
        preloads.set(src, record);
        target.src = src;
        // 上一张、当前张、下一张之外不持续保留解码图。
        while (preloads.size > 3) preloads.delete(preloads.keys().next().value);
        return record;
    }

    function preloadNeighbors() {
        if (!opened) return;
        const wanted = new Set([source(posters[wrap(index - 1)]), source(posters[index]), source(posters[wrap(index + 1)])]);
        for (const key of preloads.keys()) if (!wanted.has(key)) preloads.delete(key);
        preload(index - 1); preload(index + 1);
    }

    function setModal(open) {
        if (open) {
            focusBeforeOpen = document.activeElement;
            lenisBeforeOpen = window.lenis || null;
            lenisWasRunning = Boolean(lenisBeforeOpen && !lenisBeforeOpen.isStopped);
            if (lenisWasRunning) lenisBeforeOpen.stop();
            for (const sibling of document.body.children) {
                if (!(sibling instanceof HTMLElement) || sibling === lightbox || sibling.id === "image-loading-layer") continue;
                backgroundInert.set(sibling, sibling.inert);
                sibling.inert = true;
            }
        } else {
            for (const [sibling, inert] of backgroundInert) sibling.inert = inert;
            backgroundInert.clear();
            if (lenisWasRunning && window.lenis === lenisBeforeOpen) lenisBeforeOpen?.start();
            lenisWasRunning = false;
            lenisBeforeOpen = null;
        }
        document.body.classList.toggle("wanted-lightbox-open", open);
        lightbox.classList.toggle("active", open);
        lightbox.setAttribute("aria-hidden", String(!open));
        lightbox.inert = !open;
    }

    function update(targetIndex) {
        index = wrap(targetIndex);
        const poster = posters[index];
        lightbox.dataset.posterIndex = String(index);
        const src = source(poster);
        if (new URL(src, location.href).origin !== location.origin) image.crossOrigin = "anonymous";
        else image.removeAttribute("crossorigin");
        image.dataset.imageRevealOwner = "gallery";
        image.alt = poster.alt || "悬赏令";
        image.src = src;
        caption.textContent = `${image.alt} · ${index + 1} / ${posters.length}`;
        return prepareImageLoading(image);
    }

    async function fly(from, to, src) {
        if (motion.matches || !from?.naturalWidth || !to?.naturalWidth || !Element.prototype.animate) return false;
        const a = visualRect(from), b = visualRect(to);
        if ([a, b].some(rect => rect.width <= 2 || rect.height <= 2 || rect.bottom <= 0 || rect.top >= innerHeight)) return false;
        const clone = new Image();
        clone.className = "wanted-gallery-transition-image";
        clone.dataset.imageLoading = "off";
        clone.alt = "";
        clone.src = src;
        Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
        document.body.append(clone);
        clones.add(clone);
        for (const target of [from, to]) { hiddenImages.add(target); target.classList.add("is-wanted-transition-hidden"); }
        const animation = animate(clone, [
            { transform: "translate3d(0,0,0) scale(1)", filter: "grayscale(0)" },
            { filter: "grayscale(1)", offset: 0.5 },
            { transform: `translate3d(${b.left - a.left}px,${b.top - a.top}px,0) scale(${b.width / a.width},${b.height / a.height})`, filter: "grayscale(0)" }
        ], { duration: innerWidth <= 600 ? 380 : 480, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
        await animation?.finished.catch(() => undefined);
        clone.remove(); clones.delete(clone);
        for (const target of [from, to]) {
            // 仅本次飞行仍拥有目标时恢复，避免异步旧动画误动新请求。
            if (!clones.size) { target.classList.remove("is-wanted-transition-hidden"); hiddenImages.delete(target); }
        }
        return true;
    }

    async function open(targetIndex) {
        if (opened || closing || document.body.classList.contains("creator-lightbox-open")) return;
        window.dispatchEvent(new CustomEvent("wanted-preview-open", { detail: { poster: posters[targetIndex], index: targetIndex } }));
        const token = ++requestId, started = performance.now();
        cancelVisuals(); removeHold();
        opened = true;
        transitioning = false;
        setModal(true);
        stage.focus({ preventScroll: true });
        const succeeded = await update(targetIndex);
        if (token !== requestId || !opened) return;
        if (succeeded) {
            preloadNeighbors();
            transitioning = true;
            if (performance.now() - started < 200) await fly(posters[index], image, source(posters[index]));
            else if (!motion.matches) {
                const fade = animate(image, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
                await fade?.finished.catch(() => undefined);
            }
        }
        if (token === requestId) { transitioning = false; delete image.dataset.imageRevealOwner; }
    }

    function cancelGesture() {
        const g = gesture;
        gesture = null;
        stage.classList.remove("is-dragging");
        if (g && stage.hasPointerCapture?.(g.id)) stage.releasePointerCapture(g.id);
        morph.cancel();
    }

    async function close({ immediate = false, restoreFocus = true } = {}) {
        if (!opened && !closing) return;
        const token = ++requestId;
        opened = false;
        closing = true;
        transitioning = false;
        lastTap = touch = null;
        cancelGesture(); cancelVisuals(); removeHold();
        // 先读取仍在布局中的大图，再让背景与主体同步淡出。
        let flight;
        if (!immediate && image.dataset.imageLoadState === "ready") flight = fly(image, posters[index], image.currentSrc || image.src);
        lightbox.classList.remove("active");
        lightbox.setAttribute("aria-hidden", "true");
        lightbox.inert = true;
        if (flight) await flight;
        if (token !== requestId) return;
        cancelVisuals(); morph.destroy(); preloads.clear();
        delete image.dataset.imageRevealOwner;
        setModal(false);
        if (restoreFocus) {
            const target = focusBeforeOpen?.isConnected ? focusBeforeOpen : posters[index];
            target?.focus({ preventScroll: true });
        }
        focusBeforeOpen = null;
        closing = false;
    }

    async function change(direction, dragProgress = 0, pointer = [0.5, 0.5]) {
        if (!opened || closing || transitioning || posters.length < 2) return;
        const token = ++requestId;
        const previousImage = rememberCurrent();
        cancelVisuals();
        const succeeded = await update(index + direction);
        if (token !== requestId || !opened) return;
        if (!succeeded) { removeHold(); delete image.dataset.imageRevealOwner; return; }
        transitioning = true;
        try {
            if (previousImage && !motion.matches && morph.prepare(previousImage, image, { direction, pointer })) {
                await morph.play({ from: dragProgress, to: 1, duration: dragProgress ? 500 : 1100 });
            } else {
                const fade = animate(image, [{ opacity: 0 }, { opacity: 1 }], { duration: motion.matches ? 120 : 320, easing: "ease-out" });
                await fade?.finished.catch(() => undefined);
            }
        } finally {
            if (token === requestId) {
                morph.cancel(); removeHold();
                transitioning = false;
                delete image.dataset.imageRevealOwner;
                if (opened) preloadNeighbors();
            }
        }
    }

    function endGesture(event, cancelled = false) {
        const g = gesture;
        if (!g || event.pointerId !== g.id) return;
        gesture = null;
        stage.classList.remove("is-dragging");
        if (stage.hasPointerCapture?.(g.id)) stage.releasePointerCapture(g.id);
        if (!g.moved) return;
        suppressClickUntil = performance.now() + 450;
        if (!cancelled && g.progress > 0.25) {
            change(g.direction, g.rendered ? g.progress : 0, g.pointer);
        } else if (g.rendered && !motion.matches) {
            const token = requestId;
            transitioning = true;
            morph.play({ from: g.progress, to: 0, duration: 350 }).finally(() => {
                if (token === requestId) { morph.cancel(); transitioning = false; }
            });
        } else morph.cancel();
    }

    stage.addEventListener("pointerdown", event => {
        if (event.button !== 0 || event.isPrimary === false || gesture || transitioning || closing ||
            !opened || image.dataset.imageLoadState !== "ready" || !overImage(event)) return;
        const rect = stage.getBoundingClientRect();
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width,
            moved: false, progress: 0, direction: 1, rendered: false,
            pointer: [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height] };
        stage.setPointerCapture?.(event.pointerId);
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
        const target = preload(index + g.direction);
        if (target.ready && !motion.matches && morph.prepare(image, target.image, { direction: g.direction, pointer: g.pointer })) {
            morph.render(g.progress); g.rendered = true;
        }
    });
    stage.addEventListener("pointerup", event => endGesture(event));
    stage.addEventListener("pointercancel", event => endGesture(event, true));
    stage.addEventListener("lostpointercapture", event => endGesture(event, true));
    stage.addEventListener("dragstart", event => event.preventDefault());
    previous.addEventListener("click", event => { event.stopPropagation(); cancelGesture(); change(-1); });
    next.addEventListener("click", event => { event.stopPropagation(); cancelGesture(); change(1); });
    lightbox.addEventListener("click", event => {
        if (!opened || performance.now() < suppressClickUntil || event.target.closest("button, a")) return;
        if (!overImage(event)) close();
    });

    posters.forEach((poster, posterIndex) => {
        if (!poster.hasAttribute("tabindex")) poster.tabIndex = 0;
        poster.setAttribute("role", "button");
        poster.setAttribute("aria-haspopup", "dialog");
        poster.setAttribute("aria-controls", "wanted-lightbox");
        poster.setAttribute("aria-label", `${poster.alt || "悬赏令"}，双击放大，按住拖动查看效果`);
        poster.addEventListener("dblclick", event => {
            event.preventDefault();
            if (performance.now() >= skipNativeDoubleClickUntil) open(posterIndex);
        });
        poster.addEventListener("keydown", event => {
            if (event.key === "Enter") { event.preventDefault(); open(posterIndex); }
        });
        poster.addEventListener("pointerdown", event => {
            if (event.pointerType === "mouse" || event.button !== 0 || event.isPrimary === false) return;
            touch = { id: event.pointerId, posterIndex, x: event.clientX, y: event.clientY, start: performance.now(), moved: false };
        });
        poster.addEventListener("pointermove", event => {
            if (touch?.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) touch.moved = true;
        });
        poster.addEventListener("pointerup", event => {
            const g = touch; touch = null;
            if (!g || g.id !== event.pointerId || g.moved || performance.now() - g.start > 450) { lastTap = null; return; }
            const now = performance.now();
            if (lastTap && lastTap.posterIndex === posterIndex && now - lastTap.time <= 350 &&
                Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 28) {
                if (event.cancelable) event.preventDefault();
                lastTap = null;
                skipNativeDoubleClickUntil = now + 700;
                open(posterIndex);
            } else lastTap = { posterIndex, time: now, x: event.clientX, y: event.clientY };
        });
        poster.addEventListener("pointercancel", () => { touch = lastTap = null; });
    });

    document.addEventListener("keydown", event => {
        if (!opened) return;
        if (event.key === "Escape") { event.preventDefault(); close(); }
        else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); cancelGesture(); change(event.key === "ArrowLeft" ? -1 : 1);
        } else if (event.key === "Tab") {
            const retries = [...document.querySelectorAll("#image-loading-layer .image-load-indicator.is-visible .image-load-retry")];
            const focusable = [stage, previous, next, ...retries].filter(target => !target.disabled && target.getClientRects().length);
            const current = focusable.indexOf(document.activeElement);
            event.preventDefault();
            const target = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
            focusable[target]?.focus({ preventScroll: true });
        }
    });
    window.addEventListener("wanted-poster-drag-start", () => { lastTap = touch = null; });
    function leavePage() {
        lastTap = touch = null;
        close({ immediate: true, restoreFocus: false });
    }
    window.addEventListener("section-shown", leavePage);
    window.addEventListener("pagehide", leavePage);
    window.addEventListener("blur", () => { close({ immediate: true, restoreFocus: false }); lastTap = touch = null; });
    window.addEventListener("resize", () => { if (gesture) cancelGesture(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) leavePage(); });
    motion.addEventListener("change", () => { cancelGesture(); cancelVisuals(); });
}
