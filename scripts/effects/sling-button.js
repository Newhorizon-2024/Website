import { attachHomeCube } from "./home-cube.js?v=26.11.18.5";

const initializedRoots = new WeakSet();
const CONFIG = { armAt: 48, maxPull: 160, launchSpeed: 2600 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function initializeSlingButton({ root, onSend }) {
    if (!root || initializedRoots.has(root)) return;
    const pad = root.querySelector(".sling-button__pad");
    const move = root.querySelector(".sling-button__move");
    const tether = root.querySelector(".sling-button__tether");
    const charge = root.querySelector(".sling-button__charge");
    const hint = root.querySelector(".sling-button__hint");
    const hintLeft = hint?.querySelector(".sling-button__hint-left");
    const hintRight = hint?.querySelector(".sling-button__hint-right");
    if (![pad, move, tether, charge, hintLeft, hintRight].every(Boolean)) return;
    initializedRoots.add(root);

    const controller = new AbortController();
    const listen = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: controller.signal });
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let x = 0, y = 0, vx = 0, vy = 0;
    let direction = { ux: 0, uy: 1 };
    let grip = null;
    let armed = false;
    let frame = 0, lastTime = 0, clickTimer = 0, sendTimer = 0;
    let skipClick = false;
    const available = () => root.getClientRects().length > 0 && !document.hidden && !document.body.classList.contains("is-section-transitioning");
    const maxPull = () => Math.min(CONFIG.maxPull, Math.max(64, (innerWidth - 80) / 2));

    function setArmed(value) {
        armed = value;
        root.toggleAttribute("data-armed", value);
        pad.toggleAttribute("data-armed", value);
        setHint(value ? "已就绪" : grip ? "继续拉开" : "点击返回",
            value ? "松手返回主页" : grip ? "收回后松手取消" : "拉开后松手");
    }

    function setHint(left, right) {
        if (hintLeft.textContent !== left) hintLeft.textContent = left;
        if (hintRight.textContent !== right) hintRight.textContent = right;
    }

    function resetHintOpacity() {
        hintLeft.style.removeProperty("opacity");
        hintRight.style.removeProperty("opacity");
    }

    function updateHintOpacity(cube) {
        if (!grip?.moved) return;
        const { clientX, clientY } = grip;
        for (const hint of [hintLeft, hintRight]) {
            const rect = hint.getBoundingClientRect();
            const pointerGap = Math.hypot(
                Math.max(rect.left - clientX, clientX - rect.right, 0),
                Math.max(rect.top - clientY, clientY - rect.bottom, 0)
            );
            const cubeGap = Math.hypot(
                Math.max(rect.left - cube.right, cube.left - rect.right, 0),
                Math.max(rect.top - cube.bottom, cube.top - rect.bottom, 0)
            );
            const t = clamp(Math.min(pointerGap, cubeGap) / 26, 0, 1);
            hint.style.opacity = String(t * t * (3 - 2 * t));
        }
    }

    function paint() {
        move.style.transform = `translate(${x}px, ${y}px)`;
        const distance = Math.hypot(x, y);
        const pull = clamp(distance / CONFIG.armAt, 0, 1);
        const { ux, uy } = direction;
        // A single suspended filament drops from the socket, then straightens under tension.
        const slack = (1 - pull) * 10;
        const tailX = x - ux * Math.min(13, distance * 0.4);
        const tailY = y - uy * Math.min(13, distance * 0.4);
        const path = `M0 20 Q${tailX * 0.48} ${(20 + tailY) / 2 + slack} ${tailX} ${tailY}`;
        tether.setAttribute("d", path);
        tether.style.opacity = String(pull * 0.78);
        charge.style.opacity = String(pull);
        if (grip?.moved && !root.hasAttribute("data-cube-field")) {
            updateHintOpacity(pad.querySelector(".sling-button__fallback").getBoundingClientRect());
        }
    }

    function stopFrame() {
        cancelAnimationFrame(frame);
        frame = lastTime = 0;
    }

    function reset() {
        stopFrame();
        clearTimeout(sendTimer);
        sendTimer = 0;
        x = y = vx = vy = 0;
        root.removeAttribute("data-launching");
        setArmed(false);
        resetHintOpacity();
        paint();
    }

    function tick(now) {
        frame = 0;
        if (!available() || motion.matches) { reset(); return; }
        let remaining = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
        lastTime = now;
        while (remaining > 0) {
            const dt = Math.min(remaining, 1 / 240);
            vx += (-400 * x - 24 * vx) * dt;
            vy += (-400 * y - 24 * vy) * dt;
            x += vx * dt;
            y += vy * dt;
            remaining -= dt;
        }
        const settled = Math.hypot(x, y) < 0.05 && Math.hypot(vx, vy) < 0.5;
        if (settled) { x = y = vx = vy = 0; lastTime = 0; }
        paint();
        if (!settled) frame = requestAnimationFrame(tick);
    }

    function settle(velocity) {
        stopFrame();
        if (motion.matches || !available()) { reset(); return; }
        vx = velocity.x;
        vy = velocity.y;
        frame = requestAnimationFrame(tick);
    }

    function send() {
        if (!sendTimer && available() && !pad.disabled) onSend?.();
    }

    function release(event, cancelled = false) {
        const g = grip;
        if (!g || (event && event.pointerId !== g.id)) return;
        grip = null;
        skipClick = true;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { skipClick = false; }, 400);
        if (pad.hasPointerCapture?.(g.id)) pad.releasePointerCapture(g.id);
        root.removeAttribute("data-held");
        pad.removeAttribute("data-held");
        const p = Math.hypot(x, y) / CONFIG.armAt;
        const { ux, uy } = direction;
        const fire = g.moved && armed && !cancelled && available();
        let fingerX = 0, fingerY = 0;
        if (!cancelled && g.history.length > 1) {
            const first = g.history[0], last = g.history.at(-1);
            const dt = last.t - first.t;
            if (dt > 0 && performance.now() - last.t < 50) {
                fingerX = (last.x - first.x) / dt * 1000;
                fingerY = (last.y - first.y) / dt * 1000;
            }
        }
        const factor = Math.min(1, 3000 / Math.max(1, Math.hypot(fingerX, fingerY)));
        const launch = (fire ? 1 : 0.5) * CONFIG.launchSpeed * Math.min(p, fire ? 1.5 : 1);
        let velocityX = fingerX * factor - ux * launch;
        let velocityY = fingerY * factor - uy * launch;
        const handFactor = Math.min(1, 6000 / Math.max(1, Math.hypot(velocityX, velocityY)));
        velocityX *= handFactor;
        velocityY *= handFactor;
        resetHintOpacity();
        setArmed(false);
        if (!g.moved && !cancelled) send();
        if (fire) {
            if (!motion.matches) {
                root.setAttribute("data-launching", "");
                setHint("正在返回", "主页");
                sendTimer = setTimeout(() => {
                    sendTimer = 0;
                    root.removeAttribute("data-launching");
                    send();
                }, 180);
            } else {
                send();
            }
        }
        settle({ x: velocityX, y: velocityY });
    }

    listen(pad, "pointerdown", event => {
        if (!available() || pad.disabled || grip || sendTimer || event.button !== 0 || event.isPrimary === false) return;
        stopFrame();
        const rect = root.getBoundingClientRect();
        const scale = rect.width / (root.offsetWidth || rect.width) || 1;
        const R = maxPull();
        const distance = Math.hypot(x, y);
        const clamped = Math.min(distance, 0.95 * R);
        const raw = distance > 0.5 ? R * clamped / (R - clamped) : 0;
        grip = { id: event.pointerId, startX: event.clientX, startY: event.clientY, scale, moved: false, history: [], clientX: event.clientX, clientY: event.clientY,
            rawX: distance > 0.5 ? raw * x / distance : 0, rawY: distance > 0.5 ? raw * y / distance : 0,
            slop: event.pointerType === "touch" ? 8 : 4 };
        pad.setPointerCapture(event.pointerId);
        root.setAttribute("data-held", "");
        pad.setAttribute("data-held", "");
        setArmed(distance >= CONFIG.armAt);
    });

    listen(pad, "pointermove", event => {
        const g = grip;
        if (!g || g.id !== event.pointerId) return;
        if (event.cancelable) event.preventDefault();
        g.clientX = event.clientX;
        g.clientY = event.clientY;
        const dx = (event.clientX - g.startX) / g.scale;
        const dy = (event.clientY - g.startY) / g.scale;
        if (Math.hypot(dx, dy) > g.slop) g.moved = true;
        const rx = g.rawX + dx, ry = g.rawY + dy;
        const raw = Math.hypot(rx, ry);
        const R = maxPull();
        const d = R * raw / (R + raw);
        if (raw > 0.01) direction = { ux: rx / raw, uy: ry / raw };
        x = d * direction.ux;
        y = d * direction.uy;
        const t = performance.now();
        g.history.push({ x, y, t });
        while (g.history.length > 4 || (g.history.length > 1 && t - g.history[0].t > 80)) g.history.shift();
        setArmed(d >= CONFIG.armAt);
        paint();
    });
    listen(pad, "pointerup", event => release(event));
    listen(pad, "pointercancel", event => release(event, true));
    listen(pad, "lostpointercapture", event => release(event, true));
    listen(pad, "keydown", event => {
        if (event.key === "Escape" && grip) { event.preventDefault(); release(null, true); }
    });
    listen(pad, "click", event => {
        if (event.detail > 0 && skipClick) { skipClick = false; return; }
        send();
    });
    const cancel = () => { release(null, true); reset(); };
    listen(window, "blur", cancel);
    listen(window, "resize", cancel);
    listen(document, "visibilitychange", () => { if (document.hidden) cancel(); });
    listen(window, "section-shown", cancel);
    listen(motion, "change", cancel);
    listen(window, "pagehide", event => {
        cancel();
        clearTimeout(clickTimer);
        if (!event.persisted) controller.abort();
    });
    attachHomeCube({ pad, motion, signal: controller.signal, onBounds: updateHintOpacity, needsBounds: () => Boolean(grip?.moved) });
    paint();
}
