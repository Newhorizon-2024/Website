/* use-animation-loop 的原生等价入口：单循环、MAX_DT、ResizeObserver 与释放。 */
const MAX_DT = 1 / 15;

export function createAnimationLoop({ target, onResize, onFrame, dpr = 2, fps = 30, onDispose, gl }) {
    let raf = null, timer = null, last = 0, lastPaint = 0, startedAt = 0, frame = 0;
    let running = false, disposed = false;
    const tick = now => {
        if (disposed || !running) return;
        if (lastPaint && now - lastPaint < 1000 / fps - 1) { raf = requestAnimationFrame(tick); return; }
        lastPaint = now;
        if (startedAt === 0) startedAt = now;
        const dt = last === 0 ? 0 : Math.min((now - last) / 1000, MAX_DT);
        last = now;
        const verdict = onFrame?.({ now, dt, elapsed: (now - startedAt) / 1000, frame: frame++ });
        if (disposed) return;
        if (verdict === false) { running = false; raf = null; return; }
        raf = requestAnimationFrame(tick);
    };
    const start = () => {
        if (disposed || running) return;
        running = true;
        last = lastPaint = 0;
        raf = requestAnimationFrame(tick);
    };
    const stop = () => {
        running = false;
        if (raf !== null) cancelAnimationFrame(raf);
        raf = null;
    };
    const resize = () => {
        if (disposed || !target.isConnected) return;
        const rect = target.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const limit = typeof dpr === "function" ? dpr(rect) : dpr;
        const ratio = Math.min(devicePixelRatio || 1, limit);
        onResize?.({ width: rect.width, height: rect.height, dpr: ratio,
            bufferWidth: Math.max(1, Math.round(rect.width * ratio)), bufferHeight: Math.max(1, Math.round(rect.height * ratio)) });
    };
    const observer = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(resize, 100); });
    observer.observe(target);
    return {
        start, stop, resize,
        get running() { return running; },
        dispose() {
            if (disposed) return;
            disposed = true;
            stop();
            clearTimeout(timer);
            observer.disconnect();
            const context = gl?.();
            onDispose?.();
            context?.getExtension("WEBGL_lose_context")?.loseContext();
            startedAt = last = frame = 0;
        }
    };
}
