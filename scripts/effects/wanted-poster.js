/* 悬赏令：悬停倾斜、按住拖动衰变，以及松手后的短暂归位共用一张画布。 */
import { WantedDecayStage, WANTED_DECAY_BLEED } from "./wanted-decay.js?v=26.10.19.4";

let initialized = false;

export function initializeWantedPosterPointerEffects() {
    if (initialized) return;
    const section = document.getElementById("bounty-board-section");
    const posters = [...section?.querySelectorAll(".wanted-poster") || []];
    if (!section || !posters.length) return;
    initialized = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const RETURN_MS = 500;
    let canvas = null;
    let renderer = null;
    let gesture = null;
    let settling = null;
    let frame = 0;
    let lastPointer = null;
    let suppressPointerClick = false;
    let suppressDoubleUntil = 0;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const soften = (value, bound = 50) => value > bound
        ? bound + (value - bound) * 0.2
        : value < -bound ? -bound + (value + bound) * 0.2 : value;

    function clearHover(poster) {
        poster.classList.remove("is-pointer-active");
        poster.style.removeProperty("--poster-rotate-x");
        poster.style.removeProperty("--poster-rotate-y");
    }

    function hover(poster, event = lastPointer) {
        if (!event || event.pointerType === "touch" || !fineHover.matches ||
            !section.classList.contains("is-active") || document.hidden ||
            document.body.classList.contains("wanted-lightbox-open") ||
            gesture?.dragging || settling) return;
        const rect = poster.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
            clearHover(poster);
            return;
        }
        poster.classList.add("is-pointer-active");
        if (reduceMotion.matches) return;
        const x = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
        const y = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
        poster.style.setProperty("--poster-rotate-x", `${(-y * 12).toFixed(2)}deg`);
        poster.style.setProperty("--poster-rotate-y", `${(x * 12).toFixed(2)}deg`);
    }

    function ensureCanvas() {
        if (canvas) return;
        canvas = document.createElement("canvas");
        canvas.id = "wanted-decay-canvas";
        canvas.dataset.imageLoading = "off";
        canvas.dataset.decayState = "idle";
        canvas.setAttribute("aria-hidden", "true");
        canvas.width = canvas.height = 1;
        canvas.hidden = true;
        document.body.append(canvas);
        renderer = new WantedDecayStage(canvas, { onContextLost: () => cancel(true) });
    }

    function releaseCapture(current) {
        try {
            if (current.poster.hasPointerCapture?.(current.id)) current.poster.releasePointerCapture(current.id);
        } catch {}
    }

    function resetVisual(current, restoreHover = false) {
        current.poster.classList.remove("is-wanted-held", "is-wanted-returning", "is-wanted-decaying");
        for (const name of ["--poster-drag-x", "--poster-drag-y", "--poster-drag-rotate", "--poster-source-opacity"]) {
            current.poster.style.removeProperty(name);
        }
        if (canvas) {
            canvas.hidden = true;
            canvas.style.transform = "";
            canvas.style.opacity = "";
            canvas.dataset.decayState = "idle";
        }
        if (restoreHover) hover(current.poster);
    }

    function finishReturn(restoreHover = false) {
        const current = settling;
        settling = null;
        if (current) resetVisual(current, restoreHover);
    }

    function stop(event, cancelled = false, immediate = false) {
        const current = gesture;
        if (!current || (event && event.pointerId !== current.id)) return;
        gesture = null;
        if (current.dragging || cancelled) {
            suppressPointerClick = true;
            suppressDoubleUntil = performance.now() + 350;
        }
        // Clear gesture before releasing capture: lostpointercapture must not cancel recovery.
        releaseCapture(current);
        if (!current.dragging) {
            if (!settling && !immediate) hover(current.poster);
            return;
        }
        cancelAnimationFrame(frame);
        frame = 0;
        current.poster.classList.remove("is-wanted-held");
        if (!immediate && !reduceMotion.matches && !document.hidden &&
            section.classList.contains("is-active") && !document.body.classList.contains("wanted-lightbox-open")) {
            settling = current;
            current.returnAt = performance.now();
            current.returnX = current.offsetX;
            current.returnY = current.offsetY;
            current.returnAngle = current.angle;
            current.returnLevel = current.level;
            current.poster.classList.add("is-wanted-returning");
            if (canvas) canvas.dataset.decayState = current.shader ? "returning" : "fallback-returning";
            frame = requestAnimationFrame(animate);
        } else resetVisual(current, !immediate);
    }

    function cancel(dispose = false) {
        stop(null, true, true);
        cancelAnimationFrame(frame);
        frame = 0;
        finishReturn();
        posters.forEach(clearHover);
        if (dispose) {
            renderer?.destroy();
            renderer = null;
            canvas?.remove();
            canvas = null;
        }
    }

    function paint(current, sourceOpacity = 0) {
        // Source and canvas share geometry; recovery crossfades idle noise into the exact image.
        current.poster.style.setProperty("--poster-drag-x", `${current.offsetX.toFixed(2)}px`);
        current.poster.style.setProperty("--poster-drag-y", `${current.offsetY.toFixed(2)}px`);
        current.poster.style.setProperty("--poster-drag-rotate", `${current.angle.toFixed(3)}deg`);
        if (!current.shader) return;
        canvas.style.transform = `translate3d(${current.offsetX.toFixed(2)}px, ${current.offsetY.toFixed(2)}px, 0) rotate(${current.angle.toFixed(3)}deg)`;
        canvas.style.opacity = String(1 - sourceOpacity);
        current.poster.style.setProperty("--poster-source-opacity", String(sourceOpacity));
        canvas.dataset.decayFrame = String(++current.draws);
        if (!renderer.draw({ level: current.level, time: current.time })) {
            current.shader = false;
            current.poster.classList.remove("is-wanted-decaying");
            canvas.hidden = true;
            canvas.dataset.decayState = settling === current ? "fallback-returning" : "fallback";
        }
    }

    function animate(now) {
        frame = 0;
        const current = gesture?.dragging ? gesture : settling;
        if (!current) return;
        if (document.hidden || reduceMotion.matches || !section.classList.contains("is-active") ||
            document.body.classList.contains("wanted-lightbox-open")) {
            cancel();
            return;
        }
        // At most 30 GPU draws per second; hover is CSS-only and idle owns no RAF.
        if (now - current.drawnAt >= 1000 / 30 - 1) {
            const dt = Math.min(0.05, Math.max(0.001, (now - current.lastTime) / 1000));
            current.lastTime = current.drawnAt = now;
            current.time += dt;
            if (settling === current) {
                const progress = clamp((now - current.returnAt) / RETURN_MS, 0, 1);
                const remaining = Math.pow(1 - progress, 3);
                current.offsetX = current.returnX * remaining;
                current.offsetY = current.returnY * remaining;
                current.angle = current.returnAngle * remaining;
                current.level = current.returnLevel * remaining;
                const blend = clamp((progress - 0.35) / 0.65, 0, 1);
                paint(current, blend * blend * (3 - 2 * blend));
                if (progress >= 1) {
                    finishReturn(true);
                    return;
                }
            } else {
                const speed = Math.hypot(current.x - current.lastX, current.y - current.lastY) / dt;
                current.lastX = current.x;
                current.lastY = current.y;
                const wanted = Math.max(0.05, Math.pow(clamp(speed / 1350, 0, 1), 2));
                current.level += (wanted - current.level) * (1 - Math.exp(-dt / (wanted > current.level ? 0.08 : 0.6)));
                const follow = 1 - Math.exp(-dt / 0.16);
                current.offsetX += (current.originX + soften((current.x - current.startX) * 0.5) - current.offsetX) * follow;
                current.offsetY += (current.originY + soften((current.y - current.startY) * 0.5) - current.offsetY) * follow;
                current.angle += (clamp((current.x - current.startX) / 200, -1, 1) * 10 - current.angle) * follow;
                paint(current);
            }
        }
        frame = requestAnimationFrame(animate);
    }

    function beginDrag(current) {
        cancelAnimationFrame(frame);
        frame = 0;
        const previous = settling?.poster === current.poster ? settling : null;
        if (previous) {
            Object.assign(current, {
                rect: previous.rect, offsetX: previous.offsetX, offsetY: previous.offsetY,
                originX: previous.offsetX, originY: previous.offsetY, angle: previous.angle,
                level: previous.level, time: previous.time
            });
        }
        finishReturn();
        current.dragging = true;
        clearHover(current.poster);
        current.poster.classList.add("is-wanted-held");
        window.dispatchEvent(new CustomEvent("wanted-poster-drag-start", { detail: { poster: current.poster } }));
        try { current.poster.setPointerCapture(current.id); } catch {}
        if (reduceMotion.matches) return;
        const rect = current.rect;
        ensureCanvas();
        Object.assign(canvas.style, {
            left: `${rect.left - rect.width * (WANTED_DECAY_BLEED - 1) / 2}px`,
            top: `${rect.top - rect.height * (WANTED_DECAY_BLEED - 1) / 2}px`,
            width: `${rect.width * WANTED_DECAY_BLEED}px`,
            height: `${rect.height * WANTED_DECAY_BLEED}px`,
            opacity: "1"
        });
        current.shader = renderer.prepare(current.poster, { width: rect.width, height: rect.height });
        canvas.dataset.decayState = current.shader ? "active" : "fallback";
        if (current.shader) {
            // Draw before hiding the source; never substitute an empty upload frame.
            current.shader = renderer.draw({ level: current.level, time: current.time });
            if (current.shader) {
                canvas.hidden = false;
                current.poster.classList.add("is-wanted-decaying");
                paint(current);
            }
        }
        if (!current.shader) {
            canvas.hidden = true;
            canvas.dataset.decayState = "fallback";
        }
        frame = requestAnimationFrame(animate);
    }

    function layoutRect(poster) {
        // Measure original layout, not the perspective-expanded hover bounding box.
        const transform = poster.style.transform;
        const transition = poster.style.transition;
        poster.style.transition = "none";
        poster.style.transform = "none";
        const rect = poster.getBoundingClientRect();
        if (transform) poster.style.transform = transform;
        else poster.style.removeProperty("transform");
        if (transition) poster.style.transition = transition;
        else poster.style.removeProperty("transition");
        return rect;
    }

    posters.forEach(poster => {
        poster.draggable = false;
        poster.classList.remove("is-pointer-active");
        for (const name of ["--poster-rotate-x", "--poster-rotate-y", "--poster-scale"]) poster.style.removeProperty(name);
        poster.addEventListener("dragstart", event => event.preventDefault());
        poster.addEventListener("pointerenter", event => hover(poster, event));
        poster.addEventListener("pointermove", event => hover(poster, event));
        poster.addEventListener("pointerleave", () => clearHover(poster));
        poster.addEventListener("pointerdown", event => {
            if (gesture || event.isPrimary === false || event.button !== 0 || !section.classList.contains("is-active") ||
                document.body.classList.contains("wanted-lightbox-open")) return;
            gesture = {
                poster, id: event.pointerId, touch: event.pointerType === "touch",
                startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
                lastX: event.clientX, lastY: event.clientY, rect: layoutRect(poster),
                dragging: false, shader: false, level: 0, time: 0, offsetX: 0, offsetY: 0, angle: 0,
                originX: 0, originY: 0, lastTime: performance.now(), drawnAt: 0, draws: 0
            };
        });
        poster.addEventListener("lostpointercapture", event => stop(event, true));
    });

    window.addEventListener("pointerdown", () => { if (!gesture) suppressPointerClick = false; }, { capture: true, passive: true });
    window.addEventListener("pointermove", event => {
        lastPointer = { pointerType: event.pointerType, clientX: event.clientX, clientY: event.clientY };
        const current = gesture;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
        if (!current.dragging) {
            if (current.touch && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.15) {
                window.dispatchEvent(new CustomEvent("wanted-poster-drag-start", { detail: { poster: current.poster } }));
                stop(event, true, true);
                return;
            }
            if (Math.hypot(dx, dy) < (current.touch ? 8 : 6) ||
                (current.touch && Math.abs(dx) < Math.abs(dy) * 1.15)) return;
            current.x = event.clientX;
            current.y = event.clientY;
            beginDrag(current);
        }
        current.x = event.clientX;
        current.y = event.clientY;
        if (event.cancelable && current.dragging && !reduceMotion.matches) event.preventDefault();
    }, { passive: false });
    window.addEventListener("pointerup", event => stop(event));
    window.addEventListener("pointercancel", event => stop(event, true));
    window.addEventListener("click", event => {
        if ((!suppressPointerClick && !gesture?.dragging) || event.detail === 0) return;
        suppressPointerClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, { capture: true });
    window.addEventListener("dblclick", event => {
        if (event.target.matches?.(".wanted-poster") && (gesture?.dragging || performance.now() < suppressDoubleUntil)) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, { capture: true });
    window.addEventListener("wanted-preview-open", () => cancel(true));
    window.addEventListener("blur", () => { lastPointer = null; cancel(true); });
    window.addEventListener("pagehide", () => cancel(true));
    window.addEventListener("resize", () => cancel(true));
    window.addEventListener("scroll", () => cancel(), { passive: true });
    window.addEventListener("section-shown", event => { if (event.detail?.sectionId !== "bounty-board-section") cancel(true); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancel(true); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && (gesture || settling)) cancel(); });
    reduceMotion.addEventListener("change", () => cancel(true));
    fineHover.addEventListener("change", () => posters.forEach(clearHover));
}
