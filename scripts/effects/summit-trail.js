// Dust is emitted in page coordinates and stays on the ledge when the reader scrolls.
export function createDust(art) {
    const bursts = [];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const animation = art?.meta.animations.smoke;
    function emit(action, x, y, facing, scale) {
        if (reduced.matches) return;
        if (bursts.length >= 4) bursts.shift().el.remove();
        const el = document.createElement("canvas");
        el.className = "summit-companion summit-dust";
        el.width = 56;
        el.height = 28;
        el.style.width = el.width * scale + "px";
        el.style.height = el.height * scale + "px";
        el.setAttribute("aria-hidden", "true");
        const ctx = el.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        const count = action === "land" ? 6 : 4;
        const particles = Array.from({length:count}, (_, i) => {
            const side = action === "wall" ? facing : (i % 2 ? 1 : -1);
            return {dx: side * (1 + Math.random() * 3), vx: side * (8 + Math.random() * 16),
                vy: 7 + Math.random() * 19, life: .22 + Math.random() * .14, tile: i % 4};
        });
        bursts.push({el, ctx, particles, x:x + scrollX, y:y + scrollY, scale, age:0});
        document.body.append(el);
    }
    function update(dt) {
        for (let i = bursts.length - 1; i >= 0; i--) {
            const b = bursts[i];
            b.age += dt;
            if (b.age > .36) { b.el.remove(); bursts.splice(i, 1); continue; }
            b.ctx.clearRect(0, 0, b.el.width, b.el.height);
            for (const p of b.particles) {
                const progress = b.age / p.life;
                if (progress >= 1) continue;
                const x = Math.round(28 + p.dx + b.age * p.vx);
                const y = Math.round(23 - b.age * p.vy - Math.sin(Math.PI * progress) * 2);
                const size = Math.max(1, Math.round(7 * (1 - progress * .85)));
                b.ctx.globalAlpha = .88 * Math.min(1, (1 - progress) * 3);
                if (animation) {
                    const tile = animation.frames[p.tile], {columns, cell} = art.meta;
                    b.ctx.drawImage(art.image, tile % columns * cell, Math.floor(tile / columns) * cell,
                        8, 8, x - (size >> 1), y - size, size, size);
                } else {
                    b.ctx.fillStyle = "#eee5db";
                    b.ctx.fillRect(x, y - size, size, size);
                }
            }
            b.el.style.transform = "translate3d(" + Math.round(b.x - scrollX - 28*b.scale) + "px," +
                Math.round(b.y - scrollY - 23*b.scale) + "px,0)";
        }
    }
    function clear() { for (const b of bursts) b.el.remove(); bursts.length = 0; }
    return {emit, update, clear};
}
