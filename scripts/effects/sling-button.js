/* SlingButton 的原生适配：不引入 React / Motion，导航仅通过 onSend 触发。 */
const initializedRoots = new WeakSet();
const CONFIG = { size: 56, stroke: 3, armAt: 48, maxPull: 160, launchSpeed: 2600, particles: 14, flight: 120, spread: 60 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export function initializeSlingButton({ root, onSend }) {
    if (!root || initializedRoots.has(root)) return;
    const pad = root.querySelector(".sling-button__pad");
    const move = root.querySelector(".sling-button__move");
    const icon = root.querySelector(".sling-button__icon");
    const tension = root.querySelector(".sling-button__tension");
    const band = root.querySelector(".sling-button__band");
    const hot = root.querySelector(".sling-button__band--hot");
    const arc = root.querySelector(".sling-button__arc");
    const hint = root.querySelector(".sling-button__hint");
    const hintLeft = hint?.querySelector(".sling-button__hint-left");
    const hintRight = hint?.querySelector(".sling-button__hint-right");
    if (![pad, move, icon, tension, band, hot, arc, hintLeft, hintRight].every(Boolean)) return;
    initializedRoots.add(root);

    const controller = new AbortController();
    const listen = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: controller.signal });
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const wellR = CONFIG.size / 2 + 4 + CONFIG.stroke;
    const padR = CONFIG.size / 2 - CONFIG.stroke / 2;
    const dots = Array.from({ length: CONFIG.particles }, () => {
        const dot = document.createElement("span");
        dot.className = "sling-button__dot";
        dot.setAttribute("aria-hidden", "true");
        root.insertBefore(dot, move);
        return dot;
    });
    let x = 0, y = 0, vx = 0, vy = 0;
    let direction = { ux: 0, uy: 1 };
    let grip = null;
    let armed = false;
    let frame = 0, lastTime = 0, dotTimer = 0, clickTimer = 0, sendTimer = 0;
    let pendingDots = false, power = 0, skipClick = false;
    const animations = new Set();
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

    function relaxIcon() {
        icon.style.transition = motion.matches ? "none" : `transform 360ms ${EASE_OUT}`;
        icon.style.transform = "rotate(0deg)";
    }

    function animateDot(dot, keyframes, options) {
        const animation = dot.animate(keyframes, options);
        animations.add(animation);
        const done = () => animations.delete(animation);
        animation.onfinish = done;
        animation.oncancel = done;
    }

    function launchDots() {
        if (!pendingDots) return;
        pendingDots = false;
        clearTimeout(dotTimer);
        dotTimer = 0;
        relaxIcon();
        if (motion.matches || !available()) return;
        const { ux, uy } = direction;
        const base = Math.atan2(-uy, -ux);
        const cone = CONFIG.spread * Math.PI / 180;
        const rect = root.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        dots.forEach((dot, index) => {
            const lead = index === 0;
            const angle = base + (lead ? 0 : (Math.random() + Math.random() - 1) * cone / 2);
            const cx = Math.cos(angle), cy = Math.sin(angle);
            const reach = (lead ? CONFIG.flight : CONFIG.flight * (0.3 + Math.random())) * (0.85 + 0.35 * power);
            const drift = lead ? 0 : (Math.random() - 0.5) * CONFIG.flight * 0.4;
            const scale = lead ? 1 : 0.3 + Math.random() * 0.6;
            const duration = lead ? 300 : 300 * (0.7 + Math.random());
            const delay = lead ? 0 : Math.random() * 70;
            const endX = clamp(cx * (wellR + reach) - cy * drift, 8 - centerX, innerWidth - 8 - centerX);
            animateDot(dot, [
                { transform: `translate(${cx * wellR}px, ${cy * wellR}px) scale(${scale})`, opacity: 1 },
                { opacity: 1, offset: 0.55 },
                { transform: `translate(${endX}px, ${cy * (wellR + reach) + cx * drift}px) scale(${lead ? 0.6 : scale * 0.3})`, opacity: 0 }
            ], { duration, delay, easing: EASE_OUT, fill: "none" });
        });
    }

    function paint() {
        move.style.transform = `translate(${x}px, ${y}px)`;
        const { ux, uy } = direction;
        const projection = x * ux + y * uy;
        const p = clamp(projection / CONFIG.armAt, 0, 1);
        const dist = Math.hypot(x, y);
        let path = "";
        if (dist > 0.5) {
            const a = Math.atan2(y, x);
            const b = Math.acos(clamp((wellR - padR) / dist, -1, 1));
            path = [a + b, a - b].map(angle => {
                const cx = Math.cos(angle), cy = Math.sin(angle);
                return `M${(wellR * cx).toFixed(2)},${(wellR * cy).toFixed(2)}L${(x + padR * cx).toFixed(2)},${(y + padR * cy).toFixed(2)}`;
            }).join("");
        }
        band.setAttribute("d", path);
        hot.setAttribute("d", path);
        hot.style.opacity = String(p);
        tension.style.opacity = String(clamp(projection / 6, 0, 1));
        arc.setAttribute("stroke-dasharray", `${p} ${1 - p}`);
        arc.setAttribute("stroke-dashoffset", String(p / 2));
        arc.style.opacity = p > 0.01 ? "1" : "0";
        arc.setAttribute("transform", `rotate(${Math.atan2(-uy, -ux) * 180 / Math.PI})`);
        if (grip) {
            icon.style.transition = "none";
            const angle = Math.atan2(-uy, -ux) * 180 / Math.PI + 90;
            icon.style.transform = `rotate(${angle * clamp(dist / 12, 0, 1)}deg)`;
        }
        if (pendingDots && projection <= CONFIG.size / 4) launchDots();
    }

    function stopFrame() {
        cancelAnimationFrame(frame);
        frame = lastTime = 0;
    }

    function reset() {
        stopFrame();
        clearTimeout(dotTimer);
        clearTimeout(sendTimer);
        sendTimer = 0;
        pendingDots = false;
        for (const animation of animations) animation.cancel();
        animations.clear();
        x = y = vx = vy = 0;
        root.removeAttribute("data-launching");
        setArmed(false);
        relaxIcon();
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
        relaxIcon();
        setArmed(false);
        if (!g.moved && !cancelled) send();
        if (fire) {
            if (!motion.matches) {
                power = clamp((Math.min(p, 1.5) - 1) / 0.5, 0, 1);
                pendingDots = true;
                dotTimer = setTimeout(launchDots, 150);
                // 先呈现一次短促的发射反馈，再使用原有导航入口。
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
        pendingDots = false;
        clearTimeout(dotTimer);
        const rect = root.getBoundingClientRect();
        const scale = rect.width / (root.offsetWidth || rect.width) || 1;
        const R = maxPull();
        const distance = Math.hypot(x, y);
        const clamped = Math.min(distance, 0.95 * R);
        const raw = distance > 0.5 ? R * clamped / (R - clamped) : 0;
        grip = { id: event.pointerId, startX: event.clientX, startY: event.clientY, scale, moved: false, history: [],
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
    paint();
}
