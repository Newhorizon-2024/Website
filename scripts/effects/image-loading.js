/* 展示图片：九方点加载、解码确认及淡入。保留原有 DOM 和图片布局。 */
let initialized = false;
let layer = null;
let observer = null;
let intersectionObserver = null;
let frame = null;
const records = new WeakMap();
const tracked = new Set();
const indicators = new Set();
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const excluded = ".creator-gallery-transition-image, [data-image-loading='off'], #bossrush-eyes img, #bossrush-eyes-bg img, #bossrush-filter img";

function sourceKey(image) {
    return [image.getAttribute("src"), image.getAttribute("srcset"), image.getAttribute("sizes")].join("|");
}

function scheduleFrame() {
    if (frame === null && indicators.size && !document.hidden) {
        frame = requestAnimationFrame(updateIndicators);
    }
}

function makeIndicator(record) {
    if (record.indicator) return record.indicator;
    const indicator = document.createElement("div");
    indicator.className = "image-load-indicator";
    const grid = document.createElement("span");
    grid.className = "image-load-grid";
    grid.setAttribute("aria-hidden", "true");
    // 原始九宫格在旋转后，外围八点仍按顺时针方向依次点亮。
    [0, 1, 2, 7, -1, 3, 6, 5, 4].forEach(order => {
        const dot = document.createElement("span");
        dot.className = order < 0 ? "image-load-dot is-center" : "image-load-dot";
        dot.style.setProperty("--dot-order", String(order));
        grid.append(dot);
    });
    indicator.append(grid);
    layer.append(indicator);
    record.indicator = indicator;
    return indicator;
}

function removeIndicator(record) {
    clearTimeout(record.removeTimer);
    record.indicator?.remove();
    record.indicator = null;
    indicators.delete(record);
}

function isVisible(record, rect) {
    const image = record.image;
    record.waitForVisibility = false;
    if (!image.isConnected || !record.intersecting || document.body.classList.contains("locked")) return false;
    if (rect.width < 2 || rect.height < 2 || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return false;
    if (document.body.classList.contains("creator-lightbox-open") && !image.closest("#creator-lightbox")) return false;
    const lightbox = image.closest("#creator-lightbox");
    if (lightbox && !lightbox.classList.contains("active")) return false;
    if (getComputedStyle(image).visibility === "hidden" || image.classList.contains("is-gallery-transition-hidden")) return false;
    for (let parent = image.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.visibility === "hidden") return false;
        if (Number(style.opacity) < 0.02) {
            // 查看器/Section 正在由透明变为可见时，继续等下一帧。
            // CSS 过渡不会触发 MutationObserver，不能在首帧 opacity=0 时停止。
            record.waitForVisibility = parent.getAnimations?.().some(animation => animation.playState === "running");
            return false;
        }
    }
    return true;
}

function updateIndicators(now) {
    frame = null;
    let keepRunning = false;
    for (const record of indicators) {
        const rect = record.image.getBoundingClientRect();
        if (!isVisible(record, rect)) {
            record.indicator?.classList.remove("is-visible");
            keepRunning ||= record.state === "pending" && record.waitForVisibility;
            continue;
        }
        const x = (Math.max(0, rect.left) + Math.min(innerWidth, rect.right)) / 2;
        const y = (Math.max(0, rect.top) + Math.min(innerHeight, rect.bottom)) / 2;
        // 不让下层叠放作品的加载点覆盖上层已显示的作品。
        const top = document.elementFromPoint(x, y);
        if (top && !top.contains(record.image) && !record.image.parentElement?.contains(top)) {
            record.indicator?.classList.remove("is-visible");
            continue;
        }
        const pending = record.state === "pending";
        if (pending && now - record.startedAt < 120) {
            keepRunning = true;
            continue;
        }
        const indicator = makeIndicator(record);
        if (!record.shownAt) record.shownAt = now;
        indicator.classList.add("is-visible");
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;
        indicator.style.setProperty("--loader-scale", String(Math.max(0.28, Math.min(1, rect.width / 130, rect.height / 100))));
        keepRunning ||= pending || record.state === "leaving";
    }
    if (keepRunning) scheduleFrame();
}

function settle(record, succeeded) {
    const complete = record.resolve;
    record.resolve = null;
    complete?.(succeeded);
}

function finishReady(record, generation) {
    if (record.generation !== generation || !record.image.isConnected) return;
    record.image.dataset.imageLoadState = "ready";
    record.image.removeAttribute("aria-busy");
    record.state = "leaving";
    if (record.indicator) {
        record.indicator.classList.add("is-leaving");
        record.removeTimer = setTimeout(() => removeIndicator(record), motionQuery.matches ? 0 : 240);
    } else {
        indicators.delete(record);
    }
    // 查看器拥有自己的缩略图转场，避免同时争用同一个 opacity 动画。
    if (!motionQuery.matches && record.image.dataset.imageRevealOwner !== "gallery" && record.image.animate) {
        const opacity = getComputedStyle(record.image).opacity;
        record.fade = record.image.animate([{ opacity: 0 }, { opacity }], {
            duration: 420,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)"
        });
    }
    settle(record, true);
    scheduleFrame();
}

async function decodeImage(record) {
    if (record.state !== "pending" || record.decoding) return;
    const image = record.image;
    const generation = record.generation;
    if (!image.complete || !image.naturalWidth) return;
    record.decoding = true;
    let decodeTimer;
    try {
        // 个别缓存图在 load 后 decode() 仍可能不结束。只对已加载的图有限等待，
        // 后续仍校验请求代次和有效尺寸，不让旧图源放行新请求。
        await Promise.race([
            image.decode?.(),
            new Promise(resolve => { decodeTimer = setTimeout(resolve, 1000); })
        ]);
    } catch {
        if (record.generation !== generation) return;
        // 某些浏览器不支持特定格式的 decode；load + 有效尺寸仍可确认图源。
        if (!image.complete || !image.naturalWidth) {
            failImage(record);
            return;
        }
    } finally {
        clearTimeout(decodeTimer);
    }
    if (record.generation !== generation) return;
    if (!image.complete || !image.naturalWidth) { failImage(record); return; }
    record.decodedSource = image.currentSrc || image.src;
    const wait = record.shownAt && !motionQuery.matches
        ? Math.max(0, 540 - (performance.now() - record.shownAt))
        : 0;
    if (wait) record.readyTimer = setTimeout(() => finishReady(record, generation), wait);
    else finishReady(record, generation);
}

function failImage(record) {
    if (record.state !== "pending") return;
    clearTimeout(record.readyTimer);
    record.state = "error";
    record.image.dataset.imageLoadState = "error";
    record.image.removeAttribute("aria-busy");
    const indicator = makeIndicator(record);
    indicator.classList.add("is-error");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "image-load-retry";
    retry.textContent = "重试加载";
    retry.setAttribute("aria-label", `图片加载失败，重试${record.image.alt || "图片"}`);
    retry.addEventListener("click", event => {
        event.stopPropagation();
        const src = record.image.getAttribute("src");
        beginImage(record, true);
        // 保留原始 URL / srcset，重试不改变正式资源路径。
        if (src) record.image.src = src;
    });
    indicator.append(retry);
    settle(record, false);
    scheduleFrame();
}

function beginImage(record, force = false) {
    const image = record.image;
    const key = sourceKey(image);
    if (!force && key === record.key) return;
    settle(record, false);
    clearTimeout(record.readyTimer);
    removeIndicator(record);
    record.fade?.cancel();
    record.fade = null;
    record.key = key;
    record.generation++;
    record.decoding = false;
    record.shownAt = 0;
    record.startedAt = performance.now();
    if (!image.getAttribute("src")?.trim() && !image.getAttribute("srcset")?.trim()) {
        record.state = "idle";
        image.removeAttribute("data-image-load-state");
        image.removeAttribute("aria-busy");
        record.promise = Promise.resolve(false);
        return;
    }
    record.state = "pending";
    record.promise = new Promise(resolve => { record.resolve = resolve; });
    image.dataset.imageLoadState = "pending";
    image.setAttribute("aria-busy", "true");
    indicators.add(record);
    if (image.complete) {
        if (image.naturalWidth > 0) decodeImage(record);
        else queueMicrotask(() => {
            if (record.key === key && record.state === "pending" && image.complete && !image.naturalWidth) failImage(record);
        });
    }
    scheduleFrame();
}

export function prepareImageLoading(image) {
    if (!image || image.matches(excluded)) return Promise.resolve(true);
    if (!initialized) initializeImageLoading();
    let record = records.get(image);
    if (!record) {
        record = { image, generation: 0, key: null, intersecting: !intersectionObserver, state: "idle" };
        record.load = () => {
            const current = image.currentSrc || image.src;
            if (record.state !== "pending" && current !== record.decodedSource) beginImage(record, true);
            decodeImage(record);
        };
        record.error = () => failImage(record);
        image.addEventListener("load", record.load);
        image.addEventListener("error", record.error);
        records.set(image, record);
        tracked.add(record);
        intersectionObserver?.observe(image);
    }
    beginImage(record);
    return record.promise;
}

function removeImage(record) {
    clearTimeout(record.readyTimer);
    record.generation++;
    settle(record, false);
    record.fade?.cancel();
    removeIndicator(record);
    record.image.removeEventListener("load", record.load);
    record.image.removeEventListener("error", record.error);
    record.image.removeAttribute("data-image-load-state");
    record.image.removeAttribute("aria-busy");
    intersectionObserver?.unobserve(record.image);
    records.delete(record.image);
    tracked.delete(record);
}

export function initializeImageLoading() {
    if (initialized) return;
    initialized = true;
    layer = document.createElement("div");
    layer.id = "image-loading-layer";
    document.body.append(layer);
    if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const record = records.get(entry.target);
                if (record) record.intersecting = entry.isIntersecting;
            }
            scheduleFrame();
        });
    }
    const scan = node => {
        if (node.nodeType !== 1) return;
        if (node.matches("img")) prepareImageLoading(node);
        node.querySelectorAll("img").forEach(prepareImageLoading);
    };
    scan(document.body);
    observer = new MutationObserver(mutations => {
        let removed = false;
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach(scan);
                removed ||= mutation.removedNodes.length > 0;
            } else if (mutation.target instanceof HTMLImageElement && ["src", "srcset", "sizes"].includes(mutation.attributeName)) {
                prepareImageLoading(mutation.target);
            }
        }
        if (removed) for (const record of tracked) if (!record.image.isConnected) removeImage(record);
        scheduleFrame();
    });
    observer.observe(document.body, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["src", "srcset", "sizes", "class", "hidden", "aria-hidden"]
    });
    window.addEventListener("scroll", scheduleFrame, { passive: true });
    window.addEventListener("resize", scheduleFrame, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
            for (const record of indicators) record.indicator?.classList.remove("is-visible");
        } else scheduleFrame();
    });
    window.addEventListener("pagehide", event => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        if (!event.persisted) {
            observer.disconnect();
            intersectionObserver?.disconnect();
            for (const record of tracked) removeImage(record);
        }
    });
    window.addEventListener("pageshow", scheduleFrame);
}
