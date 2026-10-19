/* 作品堆叠只改变显示层级，不重排 DOM，也不改变大图预览的作品索引。 */

let controller = null;

export function initializeCreatorStacks({ isBlocked = () => false } = {}) {
    if (controller) return controller;

    const section = document.getElementById("creators-section");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stacks = [...document.querySelectorAll(".creator-gallery")].map(gallery => {
        const original = [...gallery.querySelectorAll(":scope > .creator-work")];
        const card = gallery.closest(".creator-card");
        const side = card?.matches(":nth-child(even)") ? -1 : 1;
        const rotations = card ? getComputedStyle(card) : null;
        original.forEach((work, index) => {
            work.dataset.stackOriginalIndex = String(index);
            work.style.setProperty("--stack-rotation", rotations?.getPropertyValue(`--work-rotation-${index + 1}`).trim() || "0deg");
            work.querySelectorAll("img").forEach(image => { image.draggable = false; });
            if (original.length > 1) work.setAttribute("aria-description", "单击预览；横向拖出后松开，可将图片放到堆叠底部。");
        });
        gallery.classList.add("is-stack-ready");
        gallery.dataset.stackCount = String(original.length);
        return { gallery, card, original, order: [...original], side };
    }).filter(stack => stack.original.length);

    if (!section || !stacks.length) return null;
    let gesture = null;
    let suppressPointerClick = false;
    const extractionTimers = new Map();

    function clearExtraction(stack) {
        clearTimeout(extractionTimers.get(stack));
        extractionTimers.delete(stack);
        stack.gallery.classList.remove("is-stack-extracted");
        stack.card?.classList.remove("is-stack-extracted");
        const extracted = stacks.some(item => item.gallery.classList.contains("is-stack-extracted"));
        section.classList.toggle("is-stack-extracted", extracted);
        document.body.classList.toggle("creator-stack-extracted", extracted);
        document.documentElement.classList.toggle("creator-stack-extracted", extracted);
    }

    function beginExtraction(stack) {
        clearTimeout(extractionTimers.get(stack));
        extractionTimers.delete(stack);
        stack.gallery.classList.add("is-stack-extracted");
        stack.card?.classList.add("is-stack-extracted");
        section.classList.add("is-stack-extracted");
        document.body.classList.add("creator-stack-extracted");
        document.documentElement.classList.add("creator-stack-extracted");
    }

    function settleExtraction(current, immediate) {
        const { stack, work } = current;
        if (!current.dragging) return;
        if (immediate || reducedMotion.matches) { clearExtraction(stack); return; }
        // Keep the section unclipped until its existing return transition finishes.
        const style = getComputedStyle(work);
        const milliseconds = value => parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000) || 0;
        const durations = style.transitionDuration.split(",").map(milliseconds);
        const delays = style.transitionDelay.split(",").map(milliseconds);
        const properties = style.transitionProperty.split(",").map(value => value.trim());
        const duration = Math.max(0, ...properties.map((property, index) =>
            property === "all" || property === "transform"
                ? durations[index % durations.length] + delays[index % delays.length] : 0));
        clearTimeout(extractionTimers.get(stack));
        if (!duration) { clearExtraction(stack); return; }
        extractionTimers.set(stack, setTimeout(() => clearExtraction(stack), duration + 60));
    }

    function render(stack) {
        stack.order.forEach((work, depth) => {
            // Preserve the existing four-photo fan; larger albums share its footprint.
            const x = stack.order.length <= 4 ? [0, 15, 29, 42][depth] : 42 * depth / (stack.order.length - 1);
            const y = stack.order.length <= 4 ? [0, 6, 12, 17][depth] : 17 * depth / (stack.order.length - 1);
            work.dataset.stackDepth = String(depth);
            work.style.setProperty("--stack-x", `${x * stack.side}%`);
            work.style.setProperty("--stack-y", `${y}%`);
            work.style.zIndex = String(stack.order.length - depth);
        });
    }

    function clearDrag(work) {
        work.classList.remove("is-stack-dragging");
        for (const name of ["--stack-drag-x", "--stack-drag-y", "--stack-tilt-x", "--stack-tilt-y"]) work.style.removeProperty(name);
    }

    function finish(event, cancelled = false, immediate = false) {
        const current = gesture;
        if (!current || (event && event.pointerId !== current.id)) return;
        gesture = null;
        if (current.dragging || cancelled) suppressPointerClick = true;
        const passed = current.touch ? Math.abs(current.dx) : Math.max(Math.abs(current.dx), Math.abs(current.dy));
        if (!cancelled && current.dragging && passed >= current.threshold) {
            current.stack.order = current.stack.order.filter(work => work !== current.work);
            current.stack.order.push(current.work);
        }
        clearDrag(current.work);
        current.stack.gallery.classList.remove("is-stack-dragging");
        render(current.stack);
        settleExtraction(current, immediate);
        try {
            if (current.work.hasPointerCapture?.(current.id)) current.work.releasePointerCapture(current.id);
        } catch { /* A cancelled pointer may already have lost its capture. */ }
    }

    function reset() {
        finish(null, true, true);
        stacks.forEach(stack => { clearExtraction(stack); stack.order = [...stack.original]; render(stack); });
    }

    function cancelImmediately() {
        finish(null, true, true);
        stacks.forEach(clearExtraction);
    }

    stacks.forEach(stack => {
        render(stack);
        stack.original.forEach(work => {
            work.addEventListener("dragstart", event => event.preventDefault());
            work.addEventListener("pointerdown", event => {
                if (stack.original.length < 2 || gesture || event.isPrimary === false || event.button !== 0 ||
                    !section.classList.contains("is-active") || isBlocked()) return;
                const card = stack.gallery.closest(".creator-card");
                const scale = card?.offsetWidth ? card.getBoundingClientRect().width / card.offsetWidth : 1;
                gesture = {
                    id: event.pointerId, stack, work, x: event.clientX, y: event.clientY,
                    dx: 0, dy: 0, dragging: false, touch: event.pointerType === "touch",
                    scale: Math.max(0.1, scale),
                    threshold: Math.min(200, Math.max(72, work.offsetWidth * 0.45))
                };
            });
            work.addEventListener("lostpointercapture", event => finish(event, true));
        });
    });

    // Reset suppression on a *new* press, not a timer: genuine quick taps remain usable.
    window.addEventListener("pointerdown", () => { if (!gesture) suppressPointerClick = false; }, { capture: true, passive: true });
    window.addEventListener("pointermove", event => {
        const current = gesture;
        if (!current || current.id !== event.pointerId) return;
        if (isBlocked() || !section.classList.contains("is-active")) { finish(event, true, true); return; }
        const dx = (event.clientX - current.x) / current.scale;
        const dy = (event.clientY - current.y) / current.scale;
        if (!current.dragging) {
            // Native vertical pan / pinch stays available on touchscreens.
            if (current.touch && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.15) {
                finish(event, true);
                return;
            }
            if (Math.hypot(dx, dy) < (current.touch ? 8 : 5) ||
                (current.touch && Math.abs(dx) < Math.abs(dy) * 1.15)) return;
            current.dragging = true;
            beginExtraction(current.stack);
            current.work.classList.add("is-stack-dragging");
            current.stack.gallery.classList.add("is-stack-dragging");
            try { current.work.setPointerCapture(event.pointerId); } catch {}
        }
        current.dx = dx;
        current.dy = dy;
        if (event.cancelable) event.preventDefault();
        const tilt = reducedMotion.matches ? 0 : 1;
        current.work.style.setProperty("--stack-drag-x", `${dx}px`);
        current.work.style.setProperty("--stack-drag-y", `${dy}px`);
        current.work.style.setProperty("--stack-tilt-x", `${Math.max(-9, Math.min(9, -dy * 0.035)) * tilt}deg`);
        current.work.style.setProperty("--stack-tilt-y", `${Math.max(-9, Math.min(9, dx * 0.035)) * tilt}deg`);
    }, { passive: false });
    window.addEventListener("pointerup", event => finish(event));
    window.addEventListener("pointercancel", event => finish(event, true));
    window.addEventListener("click", event => {
        if ((!suppressPointerClick && !gesture?.dragging) || event.detail === 0) return;
        suppressPointerClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, { capture: true });
    document.getElementById("navbar")?.addEventListener("click", event => {
        if (event.target.closest(".tab[data-target]")) reset();
    }, { capture: true });
    window.addEventListener("section-shown", reset);
    window.addEventListener("blur", cancelImmediately);
    window.addEventListener("resize", cancelImmediately);
    window.addEventListener("pagehide", reset);
    window.addEventListener("pageshow", reset);
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelImmediately(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && gesture) finish(null, true); });
    reducedMotion.addEventListener("change", cancelImmediately);

    controller = { reset };
    return controller;
}
