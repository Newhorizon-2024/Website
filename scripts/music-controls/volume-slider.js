/* WakeSlider 风格音量条：只增强已有 range，音量计算仍由 player.js 负责。 */
const WAKE_VOLUME_CONFIG = {
    bars: 32,
    height: 56,
    restHeight: 12,
    sensitivity: 1,
    reach: 6,
    skew: 0.6,
    glide: 0.3,
    smoothing: 100
};

let initialized = false;

export function initializeWakeVolumeSlider({ input, panel }) {
    if (initialized || !input || !panel) return;
    const root = panel.querySelector(".volume-wake-slider");
    const track = panel.querySelector(".volume-wake-track");
    const barLayer = panel.querySelector(".volume-wake-bars");
    const output = panel.querySelector("#volume-value");
    if (!root || !track || !barLayer || !output) return;
    initialized = true;
    const config = WAKE_VOLUME_CONFIG;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    const listen = (element, type, callback, options = {}) => element.addEventListener(type, callback, { ...options, signal: controller.signal });
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const percentage = () => {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 1;
        return clamp((Number(input.value) - min) / (max - min), 0, 1) * 100;
    };
    const bars = Array.from({ length: config.bars }, () => {
        const bar = document.createElement("span");
        bar.className = "volume-wake-bar";
        barLayer.append(bar);
        return bar;
    });
    let head = percentage();
    let target = head;
    let headVelocity = 0;
    let speed = 0;
    let speedVelocity = 0;
    let frame = 0;
    let lastTime = 0;
    let pointerId = null;
    let inView = false;

    const active = () => panel.classList.contains("is-open") && !document.hidden && inView;

    function updateValue() {
        const text = `${Math.round(percentage())}%`;
        output.value = text;
        input.setAttribute("aria-valuetext", text);
    }

    function paint() {
        const position = head / 100 * (config.bars - 1);
        const energy = motion.matches ? 0 : clamp(Math.abs(speed) * config.sensitivity / 320, 0, 1);
        const amplitude = energy * energy * (3 - 2 * energy);
        const rest = config.restHeight / config.height;
        const radius = 1.5 + (config.reach - 1.5) * amplitude;
        const direction = Math.sign(speed) || 1;
        const lit = head <= 0 ? -1 : Math.round(position);
        bars.forEach((bar, index) => {
            const distance = index - position;
            const reach = radius * (distance * direction < 0 ? 1 + config.skew : 1 - config.skew / 2);
            const lift = Math.abs(distance) >= reach ? 0 : amplitude * Math.pow(Math.cos(Math.PI * distance / (2 * reach)), 2);
            bar.style.transform = `scaleY(${rest + (1 - rest) * lift})`;
            bar.dataset.on = String(index <= lit);
        });
    }

    function flatten() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        head = target = percentage();
        headVelocity = speed = speedVelocity = 0;
        updateValue();
        paint();
    }

    function tick(now) {
        frame = 0;
        if (!active() || motion.matches) { flatten(); return; }
        let remaining = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
        lastTime = now;
        const headFrequency = 9.23 / config.glide;
        const speedFrequency = 2000 / config.smoothing;
        while (remaining > 0) {
            const dt = Math.min(remaining, 1 / 240);
            headVelocity += (headFrequency ** 2 * (target - head) - 2 * headFrequency * headVelocity) * dt;
            head += headVelocity * dt;
            speedVelocity += (speedFrequency ** 2 * (headVelocity - speed) - 2.5 * speedFrequency * speedVelocity) * dt;
            speed += speedVelocity * dt;
            remaining -= dt;
        }
        paint();
        if (Math.abs(target - head) < 0.002 && Math.abs(headVelocity) < 0.02 && Math.abs(speed) < 0.05 && Math.abs(speedVelocity) < 0.2) flatten();
        else frame = requestAnimationFrame(tick);
    }

    function onInput() {
        target = percentage();
        updateValue();
        if (!active() || motion.matches) { flatten(); return; }
        if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    }

    function commit(value) {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 1;
        const step = Number(input.step) || 0.01;
        const next = clamp(min + Math.round((value - min) / step) * step, min, max);
        if (Math.abs(next - Number(input.value)) < 0.000001) return;
        input.value = String(Number(next.toFixed(6)));
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function commitPointer(x) {
        const rect = track.getBoundingClientRect();
        if (!rect.width) return;
        let ratio = clamp((x - rect.left) / rect.width, 0, 1);
        if (getComputedStyle(track).direction === "rtl") ratio = 1 - ratio;
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 1;
        commit(min + ratio * (max - min));
    }

    function finishPointer(event = null) {
        if (pointerId === null || (event && event.pointerId !== pointerId)) return;
        const previous = pointerId;
        pointerId = null;
        if (track.hasPointerCapture?.(previous)) track.releasePointerCapture(previous);
        root.classList.remove("is-dragging");
    }

    function syncVisibility() {
        const rect = track.getBoundingClientRect();
        inView = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
        if (!active()) finishPointer();
        flatten();
    }

    listen(input, "input", onInput);
    listen(track, "pointerdown", event => {
        if (!active() || input.disabled || pointerId !== null || event.button !== 0 || event.isPrimary === false) return;
        if (event.cancelable) event.preventDefault();
        pointerId = event.pointerId;
        input.focus({ preventScroll: true });
        root.classList.add("is-dragging");
        track.setPointerCapture(event.pointerId);
        commitPointer(event.clientX);
    });
    listen(track, "pointermove", event => {
        if (event.pointerId === pointerId) {
            if (event.cancelable) event.preventDefault();
            commitPointer(event.clientX);
        }
    });
    listen(track, "pointerup", finishPointer);
    listen(track, "pointercancel", finishPointer);
    listen(track, "lostpointercapture", event => { if (event.target === track) finishPointer(event); });
    listen(input, "keydown", event => {
        if (!active() || input.disabled) return;
        const value = Number(input.value);
        const step = Number(input.step) || 0.01;
        const jumps = {
            ArrowRight: value + step, ArrowUp: value + step,
            ArrowLeft: value - step, ArrowDown: value - step,
            PageUp: value + step * 10, PageDown: value - step * 10,
            Home: Number(input.min) || 0, End: Number(input.max) || 1
        };
        if (!Object.hasOwn(jumps, event.key)) return;
        event.preventDefault();
        commit(jumps[event.key]);
        flatten();
    });
    const panelObserver = new MutationObserver(syncVisibility);
    panelObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
    const intersectionObserver = new IntersectionObserver(syncVisibility);
    intersectionObserver.observe(track);
    listen(document, "visibilitychange", syncVisibility);
    listen(motion, "change", syncVisibility);
    listen(window, "blur", () => finishPointer());
    listen(window, "pageshow", syncVisibility);
    listen(window, "pagehide", event => {
        finishPointer();
        flatten();
        if (!event.persisted) {
            controller.abort();
            panelObserver.disconnect();
            intersectionObserver.disconnect();
        }
    });
    root.classList.add("is-enhanced");
    syncVisibility();
}
