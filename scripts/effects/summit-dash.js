// A small pixel surface follows the dash origin, keeping the page itself stationary.
export function createDashEffect(sprite, art) {
    const layer = document.createElement("canvas");
    layer.className = "summit-dash-effect";
    layer.setAttribute("aria-hidden", "true");
    layer.width = layer.height = 160;
    const mid = 80;
    const ctx = layer.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const slash = art?.meta.animations.dashSlash;
    const times = [0, .08, .15];
    const echoes = times.map(() => {
        const copy = document.createElement("canvas");
        copy.width = sprite.width;
        copy.height = sprite.height;
        return { canvas: copy, brush: copy.getContext("2d"), x: 0, y: 0 };
    });
    const flecks = [];
    let nextEcho = 0, nextParticle = .02;

    function clear() {
        layer.remove();
        nextEcho = 0;
        nextParticle = .02;
        flecks.length = 0;
    }

    function draw(p, scale) {
        const t = p.dashAge;
        if (!(t >= 0 && t < .42) || reduced.matches) {
            if (layer.isConnected) clear();
            return;
        }
        if (t === 0) clear();
        if (!layer.isConnected) sprite.before(layer);
        const x = mid + Math.round((p.x - p.dashStartX) / scale);
        const y = mid + Math.round((p.y - p.dashStartY) / scale);
        while (nextEcho < times.length && t + .00001 >= times[nextEcho]) {
            const echo = echoes[nextEcho];
            const brush = echo.brush;
            brush.clearRect(0, 0, sprite.width, sprite.height);
            brush.drawImage(sprite, 0, 0);
            brush.globalCompositeOperation = "source-in";
            brush.fillStyle = "#56b5ec";
            brush.fillRect(0, 0, sprite.width, sprite.height);
            brush.globalCompositeOperation = "source-over";
            echo.x = nextEcho === 0 ? mid : x;
            echo.y = nextEcho === 0 ? mid : y;
            nextEcho++;
        }
        if (nextParticle <= .15 && t >= nextParticle) {
            nextParticle += .02;
            if (Math.hypot(p.vx, p.vy) > scale) {
                const spread = (Math.random() - .5) * 4;
                flecks.push({ born: t, x: x - p.dashY * spread, y: y - 6 + p.dashX * spread,
                    speed: 18 + Math.random() * 25, bright: Math.random() < .4 });
            }
        }

        ctx.clearRect(0, 0, layer.width, layer.height);
        for (let i = 0; i < nextEcho; i++) {
            ctx.globalAlpha = .58 * Math.max(0, 1 - (t - times[i]) / .23) ** 2;
            const echo = echoes[i];
            ctx.drawImage(echo.canvas, echo.x - 24, echo.y - 34);
        }
        for (const f of flecks) {
            const age = t - f.born;
            ctx.globalAlpha = Math.max(0, 1 - age / .22);
            ctx.fillStyle = f.bright ? "#c5f4ff" : "#63bfe9";
            ctx.fillRect(Math.round(f.x - p.dashX * f.speed * age),
                Math.round(f.y - p.dashY * f.speed * age + age * age * 14), 1, 1);
        }
        const slashFrame = Math.floor(t / (slash?.delay || .035));
        if (slashFrame < 4) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.translate(mid, mid - 6);
            ctx.rotate(Math.atan2(p.dashY, p.dashX));
            if (slash) {
                const { cell, columns } = art.meta;
                const index = slash.frames[slashFrame];
                ctx.drawImage(art.image, index % columns * cell, Math.floor(index / columns) * cell,
                    24, 8, -12, -4, 24, 8);
            } else {
                ctx.fillStyle = "#e1f6ff";
                ctx.fillRect(-6 - slashFrame * 2, 0, 12 + slashFrame * 3, 1);
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        layer.style.width = layer.style.height = layer.width * scale + "px";
        layer.style.transform = "translate3d(" + Math.round(p.dashStartX - mid * scale) + "px," +
            Math.round(p.dashStartY - mid * scale) + "px,0)";
    }
    return { draw, detach: () => layer.remove(), clear };
}