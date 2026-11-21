// 各目录部件共用同一条升起曲线。退场从当前播放位置反向运行。
const directories = new WeakMap();
const motion = matchMedia("(prefers-reduced-motion: reduce)");

export function leaveDirectory(section) {
    return directories.get(section)?.leave();
}

export function bindDirectoryRise(host, describe, onShown = () => {}, duration = 1400) {
    const section = host.closest(".section");
    let state = "inactive", animations = [], exit = null, release = null;

    function clear() {
        for (const animation of animations) animation.cancel();
        animations = [];
    }
    function complete() {
        if (state !== "entering" && state !== "waiting") return;
        state = "shown";
        clear();
        onShown();
    }
    function finishExit() {
        if (state !== "leaving") return;
        state = "out";
        // 隐藏前保持起点姿态，避免最后一帧回跳。
        for (const animation of animations) { animation.pause(); animation.currentTime = 0; }
        release?.();
        release = null;
    }
    function build(at) {
        animations = describe().map(({element, distance, delay = 0, fade = true}) => {
            const from = {translate: `0 ${distance}px`}, to = {translate: "0 0px"};
            if (fade) { from.opacity = 0; to.opacity = 1; }
            const animation = element.animate([from, to], {
                id: "directory-rise", duration: duration - delay, delay,
                easing: "cubic-bezier(.333333,1,.666667,1)", fill: "both"
            });
            animation.pause();
            animation.currentTime = at;
            return animation;
        });
    }
    function inView() {
        const r = host.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    }
    function sync() {
        if (!section.classList.contains("is-active")) {
            finishExit();
            state = "inactive"; clear(); exit = null;
            return;
        }
        if (state === "inactive") state = "waiting";
        if (motion.matches || document.hidden || !inView()) {
            if (state === "leaving") finishExit();
            else if (motion.matches) complete();
            else if (state === "entering") animations.forEach(a => a.pause());
            return;
        }
        if (state === "waiting") {
            state = "entering";
            build(0);
            const batch = animations;
            for (const a of batch) a.play();
            Promise.all(batch.map(a => a.finished)).then(() => {
                if (animations === batch && state === "entering") complete();
            }).catch(() => {});
        } else if (state === "entering") {
            animations.forEach(a => { if (a.playState === "paused") a.play(); });
        }
    }
    function leave() {
        if (state === "leaving" || state === "out") return exit;
        if (state === "inactive" || state === "waiting" || motion.matches || document.hidden || !inView()) return;
        state = "leaving";
        if (!animations.length) build(duration);
        exit = new Promise(resolve => { release = resolve; });
        const batch = animations;
        const started = batch.filter(a => a.currentTime > 0);
        for (const a of started) { a.playbackRate = -3; a.play(); }
        Promise.all(started.map(a => a.finished)).then(() => {
            if (animations === batch) finishExit();
        }).catch(() => {});
        return exit;
    }
    const api = {leave, complete, get settled() { return state === "shown"; }};
    directories.set(section, api);
    const visibility = new IntersectionObserver(sync);
    visibility.observe(host);
    const classes = new MutationObserver(sync);
    classes.observe(section, {attributes: true, attributeFilter: ["class"]});
    const controller = new AbortController();
    const opts = {signal: controller.signal};
    motion.addEventListener("change", sync, opts);
    document.addEventListener("visibilitychange", sync, opts);
    window.addEventListener("pageshow", sync, opts);
    window.addEventListener("pagehide", event => {
        finishExit();
        if (!event.persisted) { clear(); visibility.disconnect(); classes.disconnect(); controller.abort(); }
    }, opts);
    queueMicrotask(sync);
    return api;
}

export function initializeDirectoryRises() {
    const menu = document.querySelector("#nhn-section .accordion-menu");
    if (menu) bindDirectoryRise(menu, () => Array.from(menu.querySelectorAll(".accordion-menu-option"), (element, i) =>
        ({element, distance: Math.min(85, menu.clientHeight * .32), delay: i * 110})));
    for (const [id, parts] of [
        ["things-option-wheel", [[".things-wheel-stage, .things-wheel-options", 0], [".things-wheel-center", 90]]],
        ["scenes-globe", [[".scenes-globe-canvas, .scenes-node-layer, .scenes-globe-reticle", 0],
            [".scenes-current, .scenes-globe-hint", 110]]]
    ]) {
        const host = document.getElementById(id);
        if (host) bindDirectoryRise(host, () => parts.flatMap(([selector, delay]) =>
            Array.from(host.querySelectorAll(selector), element =>
                ({element, delay, distance: Math.min(120, host.clientHeight * .22)}))));
    }
}
