/* ElasticSlider 风格增强：保留原生进度条、Dot 和 player.js 的跳转入口。 */
const PROGRESS_ELASTIC_CONFIG = {
    restHeight: 6,
    activeHeight: 9,
    maxStretch: 18 // 不侵入进度条两侧的时间文字。
};

let initialized = false;

export function initializeElasticProgressBar({ input }) {
    if (initialized || !input) return;
    const track = input.closest("#progress-elastic-track");
    if (!track) return;
    initialized = true;
    const config = PROGRESS_ELASTIC_CONFIG;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    const listen = (element, type, callback, options = {}) => element.addEventListener(type, callback, { ...options, signal: controller.signal });
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let stretch = 0;
    let stretchVelocity = 0;
    let emphasis = 0;
    let emphasisVelocity = 0;
    let side = 1;
    let hovered = false;
    let focused = false;
    let pointerId = null;
    let frame = 0;
    let lastTime = 0;
    let inView = false;
    let width = 1;

    const active = () => inView && !document.hidden;
    const goal = () => hovered || focused || pointerId !== null ? 1 : 0;

    function paint() {
        const length = motion.matches ? 0 : stretch;
        const scaleX = 1 + length / Math.max(1, width);
        const scaleY = 1 - 0.18 * clamp(length / config.maxStretch, -1, 1);
        const height = config.restHeight + (config.activeHeight - config.restHeight) * (motion.matches ? 0 : clamp(emphasis, 0, 1));
        input.style.transformOrigin = side > 0 ? "0% 50%" : "100% 50%";
        input.style.transform = Math.abs(length) < 0.001 ? "" : `scale(${scaleX}, ${scaleY})`;
        // 反向补偿原生 thumb，橡皮筋拉伸不会把 Dot 拉成长条。
        input.style.setProperty("--progress-dot-scale-x", String(1 / scaleX));
        input.style.setProperty("--progress-dot-scale-y", String(1 / scaleY));
        input.style.setProperty("--progress-elastic-height", `${height}px`);
    }

    function reset() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        stretch = stretchVelocity = emphasis = emphasisVelocity = 0;
        paint();
    }

    function tick(now) {
        frame = 0;
        if (!active() || motion.matches) { reset(); return; }
        let remaining = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
        lastTime = now;
        const target = goal();
        while (remaining > 0) {
            const dt = Math.min(remaining, 1 / 240);
            if (pointerId === null) {
                stretchVelocity += (-225 * stretch - 16 * stretchVelocity) * dt;
                stretch += stretchVelocity * dt;
            }
            emphasisVelocity += (676 * (target - emphasis) - 52 * emphasisVelocity) * dt;
            emphasis += emphasisVelocity * dt;
            remaining -= dt;
        }
        const settled = (pointerId !== null || (Math.abs(stretch) < 0.01 && Math.abs(stretchVelocity) < 0.1)) &&
            Math.abs(emphasis - target) < 0.001 && Math.abs(emphasisVelocity) < 0.01;
        if (settled) {
            if (pointerId === null) stretch = stretchVelocity = 0;
            emphasis = target;
            emphasisVelocity = 0;
        }
        paint();
        if (!settled) frame = requestAnimationFrame(tick);
        else lastTime = 0;
    }

    function wake() {
        if (!active() || motion.matches) { reset(); return; }
        if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    }

    function commit(value) {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const step = Number(input.step) || 1;
        const next = clamp(min + Math.round((value - min) / step) * step, min, max);
        if (Math.abs(Number(input.value) - next) < 0.000001) return;
        input.value = String(Number(next.toFixed(6)));
        // 不直接写 audio.currentTime，继续交由已有 seekAudio() 校验和跳转。
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function follow(event) {
        const rect = track.getBoundingClientRect();
        if (!rect.width) return;
        width = rect.width;
        const distance = event.clientX - rect.left;
        const beyond = distance < 0 ? -distance : distance > width ? distance - width : 0;
        side = distance < 0 ? -1 : 1;
        const limit = Math.min(config.maxStretch, width * 0.1);
        stretch = motion.matches ? 0 : limit * (1 - Math.exp(-beyond / Math.max(1, limit)));
        stretchVelocity = 0;
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        // 原生 14px Dot 的中心只能在两端各 7px 以内移动。
        let fraction = clamp((distance - 7) / Math.max(1, width - 14), 0, 1);
        if (getComputedStyle(input).direction === "rtl") fraction = 1 - fraction;
        commit(min + fraction * (max - min));
        paint();
        wake();
    }

    function finishPointer(event = null, cancelled = false) {
        if (pointerId === null || (event && event.pointerId !== pointerId)) return;
        if (event && !cancelled) follow(event);
        if (event) {
            const rect = track.getBoundingClientRect();
            hovered = event.pointerType === "mouse" && event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top - 14 && event.clientY <= rect.bottom + 14;
        }
        const previous = pointerId;
        pointerId = null;
        track.classList.remove("is-dragging");
        if (track.hasPointerCapture?.(previous)) track.releasePointerCapture(previous);
        wake();
    }

    function syncVisibility() {
        const rect = track.getBoundingClientRect();
        width = Math.max(1, rect.width);
        inView = rect.width > 0 && rect.height > 0 && rect.bottom > -14 && rect.top < innerHeight + 14 && rect.right > 0 && rect.left < innerWidth;
        if (!active()) {
            hovered = focused = false;
            finishPointer(null, true);
            reset();
        } else paint();
    }

    listen(track, "pointerenter", event => { if (event.pointerType === "mouse") { hovered = true; wake(); } });
    listen(track, "pointerleave", event => { if (event.pointerType === "mouse") { hovered = false; wake(); } });
    listen(input, "focus", () => { focused = input.matches(":focus-visible"); wake(); });
    listen(input, "blur", () => { focused = false; track.classList.remove("is-pointer-focused"); wake(); });
    listen(track, "pointerdown", event => {
        if (!active() || input.disabled || event.button !== 0 || event.isPrimary === false || pointerId !== null) return;
        if (event.cancelable) event.preventDefault();
        pointerId = event.pointerId;
        track.classList.add("is-pointer-focused");
        input.focus({ preventScroll: true });
        focused = false;
        track.classList.add("is-dragging");
        track.setPointerCapture(event.pointerId);
        follow(event);
    });
    listen(track, "pointermove", event => {
        if (event.pointerId === pointerId) {
            if (event.cancelable) event.preventDefault();
            follow(event);
        }
    });
    listen(window, "pointerup", event => finishPointer(event));
    listen(track, "pointercancel", event => finishPointer(event, true));
    listen(track, "lostpointercapture", event => { if (event.target === track) finishPointer(event, true); });
    listen(input, "keydown", event => {
        track.classList.remove("is-pointer-focused");
        if (!active() || input.disabled) return;
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const unit = Number(input.step) || 1;
        const value = Number(input.value);
        const jumps = { ArrowRight: value + unit, ArrowUp: value + unit, ArrowLeft: value - unit, ArrowDown: value - unit,
            PageUp: value + (max - min) / 10, PageDown: value - (max - min) / 10, Home: min, End: max };
        if (!Object.hasOwn(jumps, event.key)) return;
        event.preventDefault();
        focused = true;
        wake();
        if (jumps[event.key] < min || jumps[event.key] > max) {
            side = jumps[event.key] < min ? -1 : 1;
            stretchVelocity = config.maxStretch * 5;
            wake();
        }
        commit(jumps[event.key]);
    });
    const resizeObserver = new ResizeObserver(syncVisibility);
    resizeObserver.observe(track);
    const intersectionObserver = new IntersectionObserver(syncVisibility);
    intersectionObserver.observe(track);
    listen(document, "visibilitychange", syncVisibility);
    listen(motion, "change", () => { finishPointer(null, true); reset(); wake(); });
    listen(window, "blur", () => { hovered = false; finishPointer(null, true); wake(); });
    listen(window, "pageshow", syncVisibility);
    listen(window, "pagehide", event => {
        finishPointer(null, true);
        reset();
        if (!event.persisted) {
            controller.abort();
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
        }
    });
    syncVisibility();
}
