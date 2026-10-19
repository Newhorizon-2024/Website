/* 世界观 · 组织圆柱轮播。CSS 曲面，不创建 WebGL/React 实例。 */
import { prepareImageLoading } from "./image-loading.js?v=26.10.19.4";

const ORGANIZATIONS_CAROUSEL_CONFIG = {
    preset: "cylinder",
    intro: "rise",
    cardWidth: 220,
    aspectRatio: 1,
    speed: 14, // 度 / 秒
    captions: true,
    gap: 25,
    perspective: 2500,
    tilt: -5,
    segments: 8,
    introDuration: 1400
};

let worldviewOrganizationsInitialized = false;

export function initializeWorldviewOrganizations() {
    if (worldviewOrganizationsInitialized) return;
    const section = document.getElementById("worldview-organizations-section");
    const browser = document.getElementById("organizations-orbit");
    const layer = browser?.querySelector(".organizations-orbit-items");
    const currentButton = browser?.querySelector(".organizations-current");
    const currentIndex = browser?.querySelector(".organizations-current-index");
    const currentName = browser?.querySelector(".organizations-current-name");
    const currentStatus = browser?.querySelector(".organizations-current-status");
    const elements = Array.from(layer?.querySelectorAll(".organization-orbit-item:not([data-gallery-copy])") || []);
    if (!section || !browser || !layer || !elements.length || !currentButton || !currentIndex || !currentName || !currentStatus) return;
    worldviewOrganizationsInitialized = true;

    const config = ORGANIZATIONS_CAROUSEL_CONFIG;
    const count = elements.length;
    const step = 360 / count;
    const cardHeight = config.cardWidth / config.aspectRatio;
    const radius = Math.max(Math.max(count, 3) * (config.cardWidth + config.gap) / (2 * Math.PI), config.cardWidth * 0.6);
    const radians = degrees => degrees * Math.PI / 180;
    const wrapIndex = value => ((value % count) + count) % count;
    const wrapAngle = value => ((value + 180) % 360 + 360) % 360 - 180;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    const listen = (element, type, callback, options = {}) => element.addEventListener(type, callback, { ...options, signal: controller.signal });
    const stage = document.createElement("div");
    stage.className = "organizations-carousel-stage";
    const camera = document.createElement("div");
    camera.className = "organizations-carousel-camera";
    browser.insertBefore(stage, layer);
    stage.append(camera);
    camera.append(layer);

    const organizations = elements.map((element, index) => ({
        element, index,
        image: element.querySelector(".organization-card-media img"),
        id: element.dataset.organizationId || `organization-${index}`,
        name: element.dataset.organizationName || element.textContent.trim(),
        sectionId: element.dataset.sectionId || "",
        strips: []
    }));
    let angle = 0;
    let target = null;
    let velocity = 0;
    let selectedIndex = -1;
    let fit = 1;
    let drop = 560;
    let introElapsed = 0;
    let frame = 0;
    let lastTime = 0;
    let holdUntil = 0;
    let resumeTimer = 0;
    let snapTimer = 0;
    let gesture = null;
    let suppressClickUntil = 0;
    let hovered = false;
    let focused = false;
    let inView = false;
    let wasActive = false;

    browser.dataset.carouselPreset = config.preset;
    currentButton.style.display = config.captions ? "" : "none";
    browser.style.setProperty("--organizations-card-width", `${config.cardWidth}px`);
    browser.style.setProperty("--organizations-card-height", `${cardHeight}px`);
    // 空白舞台仍属于网页滚动；只有命中图片时才由轮播接管滚轮。
    browser.removeAttribute("data-lenis-prevent-wheel");
    const active = () => section.classList.contains("is-active") && !document.hidden && inView;
    const introDone = () => motion.matches || config.intro === "none" || introElapsed >= config.introDuration;
    const cruising = () => !motion.matches && introDone() && !hovered && !focused && !gesture && performance.now() >= holdUntil;

    function updateInformation(index) {
        if (selectedIndex === index) return;
        selectedIndex = index;
        const organization = organizations[index];
        const available = Boolean(organization.sectionId);
        currentIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
        currentName.textContent = organization.name;
        currentStatus.textContent = available ? "进入档案" : "尚未开放";
        currentButton.classList.toggle("is-unavailable", !available);
        currentButton.setAttribute("aria-label", available ? `打开${organization.name}档案` : `${organization.name}尚未开放`);
        organizations.forEach((item, itemIndex) => {
            item.element.setAttribute("aria-selected", String(itemIndex === index));
            item.element.classList.toggle("is-selected", itemIndex === index);
            item.element.tabIndex = itemIndex === index ? 0 : -1;
        });
    }

    // 保留上一版的打开功能：点击任何图片直接进入，空档案仍发送原有反馈事件。
    function openOrganization(organization, sourceElement = organization.element) {
        if (!active() || performance.now() < suppressClickUntil) return;
        if (!organization.sectionId) {
            window.dispatchEvent(new CustomEvent("worldview-organization-unavailable", {
                detail: { id: organization.id, name: organization.name, category: "organization", sourceElement }
            }));
            return;
        }
        if (!document.getElementById(organization.sectionId)) {
            console.error(`未找到组织信息页：#${organization.sectionId}`);
            return;
        }
        window.showSection?.(organization.sectionId, {
            transitionType: "slide", direction: "forward", scrollMode: "top", historyMode: "push"
        });
    }

    async function updateSurface(organization) {
        const image = organization.image;
        if (!image) return;
        const ready = await prepareImageLoading(image);
        if (controller.signal.aborted || !ready || !image.naturalWidth) return;
        const scale = Math.min(config.cardWidth / image.naturalWidth, cardHeight / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        organization.strips.forEach(({ element, start }) => {
            element.style.backgroundImage = `url(${JSON.stringify(image.currentSrc || image.src)})`;
            element.style.backgroundSize = `${width}px ${height}px`;
            element.style.backgroundPosition = `${(config.cardWidth - width) / 2 - start}px ${(cardHeight - height) / 2}px`;
        });
        organization.element.classList.add("is-carousel-image-ready");
    }

    organizations.forEach(organization => {
        const element = organization.element;
        element.setAttribute("data-lenis-prevent-wheel", "");
        element.setAttribute("aria-label", organization.name);
        element.setAttribute("aria-posinset", String(organization.index + 1));
        element.setAttribute("aria-setsize", String(count));
        const surface = document.createElement("span");
        surface.className = "organization-carousel-surface";
        surface.setAttribute("aria-hidden", "true");
        element.querySelector(".organization-card-shell").append(surface);
        for (let index = 0; index < config.segments; index++) {
            const start = config.cardWidth * index / config.segments - (index ? 1.25 : 0);
            const end = config.cardWidth * (index + 1) / config.segments + (index < config.segments - 1 ? 1.25 : 0);
            const offset = (start + end) / 2 - config.cardWidth / 2;
            const turn = offset / radius;
            for (const back of [false, true]) {
                const strip = document.createElement("span");
                strip.className = `organization-carousel-strip${back ? " is-back" : ""}`;
                strip.style.width = `${end - start}px`;
                strip.style.height = `${cardHeight}px`;
                strip.style.left = `${-(end - start) / 2}px`;
                strip.style.top = `${-cardHeight / 2}px`;
                strip.style.transform = `translate3d(${Math.sin(turn) * radius}px, 0, ${(Math.cos(turn) - 1) * radius}px) rotateY(${turn}rad)${back ? " rotateY(180deg)" : ""}`;
                const first = back ? index === config.segments - 1 : index === 0;
                const last = back ? index === 0 : index === config.segments - 1;
                strip.style.borderRadius = `${first ? 12 : 0}px ${last ? 12 : 0}px ${last ? 12 : 0}px ${first ? 12 : 0}px`;
                surface.append(strip);
                organization.strips.push({ element: strip, start: back ? config.cardWidth - end : start });
            }
        }
        if (organization.image) {
            organization.image.loading = "eager";
            organization.image.dataset.imageRevealOwner = "gallery";
            listen(organization.image, "load", () => updateSurface(organization));
            listen(organization.image, "error", () => element.classList.remove("is-carousel-image-ready"));
            updateSurface(organization);
        }
    });

    function render() {
        camera.style.transform = `translateZ(${-radius}px) rotateX(${config.tilt}deg)`;
        layer.style.transform = `rotateY(${angle}deg)`;
        organizations.forEach(organization => {
            const position = organization.index * step;
            const delay = Math.abs(wrapAngle(position + angle)) / 180 * 320;
            const progress = introDone() ? 1 : clamp((introElapsed - delay) / (config.introDuration - delay), 0, 1);
            const lift = drop * Math.pow(1 - progress, 3);
            organization.element.style.transform = `rotateY(${position}deg) translateZ(${radius}px) translateY(${lift}px)`;
            organization.element.style.setProperty("--organization-depth", String(0.55 * Math.pow((1 - Math.cos(radians(position + angle))) / 2, 1.25)));
        });
        updateInformation(wrapIndex(Math.round(-angle / step)));
    }

    function tick(now) {
        frame = 0;
        if (!active()) return;
        const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
        lastTime = now;
        if (!introDone()) introElapsed += dt * 1000;
        else if (!gesture?.horizontal && target !== null) {
            let remaining = dt;
            while (remaining > 0) {
                const h = Math.min(remaining, 1 / 240);
                velocity += (118 * (target - angle) - 2 * Math.sqrt(118) * velocity) * h;
                angle += velocity * h;
                remaining -= h;
            }
            if (Math.abs(target - angle) < 0.004 && Math.abs(velocity) < 0.03) {
                angle = target;
                target = null;
                velocity = 0;
            }
        } else if (!gesture?.horizontal) {
            velocity += ((cruising() ? -config.speed : 0) - velocity) * (1 - Math.exp(-dt / 0.3));
            angle += velocity * dt;
            if (!cruising() && Math.abs(velocity) < 0.01) velocity = 0;
        }
        render();
        if (!introDone() || target !== null || Math.abs(velocity) > 0.01 || cruising()) frame = requestAnimationFrame(tick);
        else lastTime = 0;
    }

    function wake() {
        if (!active()) return;
        if (!motion.matches && performance.now() < holdUntil) {
            clearTimeout(resumeTimer);
            resumeTimer = setTimeout(wake, holdUntil - performance.now() + 25);
        }
        if (motion.matches) {
            if (target !== null) angle = target;
            target = null;
            velocity = 0;
            render();
        } else if (!frame) {
            lastTime = 0;
            frame = requestAnimationFrame(tick);
        }
    }

    function hold() {
        holdUntil = performance.now() + 2800;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(wake, 2820);
    }

    function focusIndex(index, moveFocus = false) {
        const base = target ?? angle;
        target = -index * step + Math.round((base + index * step) / 360) * 360;
        introElapsed = config.introDuration;
        hold();
        if (moveFocus) {
            updateInformation(index);
            organizations[index].element.focus({ preventScroll: true });
        }
        wake();
    }

    function measure() {
        const width = browser.clientWidth;
        const height = browser.clientHeight;
        if (!width || !height) return;
        fit = Math.min(1, width * 0.92 / (2 * radius + 48), (height - 110) * 0.9 / (cardHeight + 2 * radius * Math.abs(Math.sin(radians(config.tilt)))));
        drop = height / fit * 0.6 + cardHeight;
        stage.style.perspective = `${config.perspective}px`;
        stage.style.transform = `translateY(-35px) scale(${fit})`;
        render();
        browser.dataset.carouselReady = "true";
    }

    function finishGesture(event, cancelled = false) {
        if (!gesture || (event && event.pointerId !== gesture.id)) return;
        const previous = gesture;
        gesture = null;
        browser.classList.remove("is-dragging");
        if (browser.hasPointerCapture?.(previous.id)) browser.releasePointerCapture(previous.id);
        if (previous.horizontal || cancelled) suppressClickUntil = performance.now() + 350;
        if (previous.horizontal) {
            target = Math.round((angle + (cancelled ? 0 : previous.velocity) * 0.072) / step) * step;
            velocity = 0;
            hold();
            wake();
        }
    }

    function pause() {
        finishGesture(null, true);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        clearTimeout(snapTimer);
        clearTimeout(resumeTimer);
        velocity = 0;
    }

    function syncVisibility() {
        const sectionActive = section.classList.contains("is-active");
        if (sectionActive && !wasActive) introElapsed = motion.matches ? config.introDuration : 0;
        wasActive = sectionActive;
        const rect = browser.getBoundingClientRect();
        inView = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
        if (active()) { measure(); wake(); }
        else pause();
    }

    listen(layer, "click", event => {
        const element = event.target.closest(".organization-orbit-item");
        const organization = organizations.find(item => item.element === element);
        if (!organization || !active() || gesture?.horizontal || performance.now() < suppressClickUntil) return;
        event.preventDefault();
        event.stopPropagation();
        focusIndex(organization.index);
        openOrganization(organization);
    });
    listen(layer, "dragstart", event => event.preventDefault());
    listen(currentButton, "click", event => {
        event.preventDefault();
        event.stopPropagation();
        openOrganization(organizations[Math.max(0, selectedIndex)]);
    });
    listen(browser, "pointerenter", event => { if (event.pointerType === "mouse") { hovered = true; wake(); } });
    listen(browser, "pointerleave", event => { if (event.pointerType === "mouse") { hovered = false; wake(); } });
    listen(browser, "focusin", () => { focused = true; wake(); });
    listen(browser, "focusout", () => queueMicrotask(() => { focused = browser.contains(document.activeElement); wake(); }));
    listen(browser, "wheel", event => {
        if (!active() || event.ctrlKey || event.metaKey) return;
        const card = event.target.closest?.(".organization-orbit-item");
        if (!card || !elements.includes(card)) return;
        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        if (!delta) return;
        event.preventDefault();
        event.stopPropagation();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? browser.clientHeight : 1;
        target = (target ?? angle) - clamp(delta * unit, -250, 250) * 180 / (Math.PI * radius * fit);
        introElapsed = config.introDuration;
        hold();
        clearTimeout(snapTimer);
        snapTimer = setTimeout(() => { if (target !== null) target = Math.round(target / step) * step; wake(); }, 140);
        wake();
    }, { passive: false });
    listen(browser, "pointerdown", event => {
        if (!active() || event.button !== 0 || event.isPrimary === false || event.target.closest(".organizations-current")) return;
        hold();
        velocity = 0;
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, angle, previous: angle, time: performance.now(), velocity: 0, horizontal: false };
    });
    listen(browser, "pointermove", event => {
        if (!gesture || event.pointerId !== gesture.id) return;
        const dx = event.clientX - gesture.x;
        const dy = event.clientY - gesture.y;
        if (!gesture.horizontal) {
            if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { finishGesture(event, true); return; }
            if (Math.abs(dx) < 8) return;
            gesture.horizontal = true;
            introElapsed = config.introDuration;
            target = null;
            clearTimeout(snapTimer);
            browser.classList.add("is-dragging");
            browser.setPointerCapture(event.pointerId);
        }
        const now = performance.now();
        angle = gesture.angle + dx * 180 / (Math.PI * radius * fit);
        gesture.velocity = clamp((angle - gesture.previous) / Math.max(0.008, (now - gesture.time) / 1000), -360, 360);
        gesture.previous = angle;
        gesture.time = now;
        if (event.cancelable) event.preventDefault();
        render();
    });
    listen(window, "pointerup", event => finishGesture(event));
    listen(browser, "pointercancel", event => finishGesture(event, true));
    listen(browser, "lostpointercapture", event => { if (event.target === browser) finishGesture(event, true); });
    listen(browser, "keydown", event => {
        if (!active()) return;
        const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (Object.hasOwn(steps, event.key)) {
            event.preventDefault();
            const base = Math.round((target ?? angle) / step);
            const index = wrapIndex(-base + steps[event.key]);
            target = (base - steps[event.key]) * step;
            introElapsed = config.introDuration;
            hold();
            organizations[index].element.focus({ preventScroll: true });
            wake();
        } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            focusIndex(event.key === "Home" ? 0 : count - 1, true);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openOrganization(organizations[wrapIndex(Math.round(-(target ?? angle) / step))]);
        }
    });

    const sectionObserver = new MutationObserver(syncVisibility);
    sectionObserver.observe(section, { attributes: true, attributeFilter: ["class"] });
    const resizeObserver = new ResizeObserver(syncVisibility);
    resizeObserver.observe(browser);
    const intersectionObserver = new IntersectionObserver(syncVisibility);
    intersectionObserver.observe(browser);
    listen(window, "resize", syncVisibility, { passive: true });
    listen(window, "pageshow", syncVisibility);
    listen(window, "blur", () => finishGesture(null, true));
    listen(document, "visibilitychange", syncVisibility);
    listen(motion, "change", () => {
        pause();
        introElapsed = config.introDuration;
        angle = Math.round((target ?? angle) / step) * step;
        target = null;
        render();
        wake();
    });
    listen(window, "pagehide", event => {
        pause();
        if (!event.persisted) {
            controller.abort();
            sectionObserver.disconnect();
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
        }
    });
    updateInformation(0);
    syncVisibility();
}
