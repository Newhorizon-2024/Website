import { topAt } from "./summit-motion.js?v=26.11.22.5";
import { createCrystalView, refillIfTouched } from "./summit-encounter.js?v=26.11.22.5";

export function createCubeCrystal(art, random = Math.random) {
    const view = createCrystalView(art, "cube-crystal");
    let gem = null, retry = 3;
    function retire(delay) {
        gem = null;
        retry = delay;
        view.remove();
    }

    // Query the surrounding band occasionally. Once attached, project only that mesh.
    function sample(api, scale, dt) {
        if (!api?.platformsNear) return;
        const margin = 100 * scale;
        if (!gem) {
            retry -= dt;
            if (retry > 0) return;
            retry = 1 + random() * 2;
            const candidates = api.platformsNear(0, 0, Infinity, { margin, incoming: true })
                .filter(s => s.right - s.left >= 8 * scale &&
                    (s.left > innerWidth + 10 * scale || s.bottom < -2 * scale) &&
                    s.top < innerHeight - 12 * scale && s.right > 0);
            if (!candidates.length) return;
            const host = candidates[Math.floor(random() * candidates.length)];
            gem = { index: host.index, generation: host.generation, age: 0, collected: -1,
                host, x: 0, y: 0, entered: false };
        } else if (gem.collected < 0) {
            const host = api.platformsNear(0, 0, Infinity, { margin, index: gem.index })[0];
            if (!host || host.generation !== gem.generation) { retire(1); return; }
            gem.host = host;
        }
        if (gem.collected >= 0) return;
        gem.x = (gem.host.left + gem.host.right) / 2;
        gem.y = topAt(gem.host, gem.x) - (8 + Math.sin(gem.age * 2.7)) * scale;
    }
    function update(player, scale, dt, canCollect=true) {
        if (!gem) return;
        gem.age += dt;
        const visible = gem.x >= -8 * scale && gem.x <= innerWidth + 8 * scale &&
            gem.y >= -8 * scale && gem.y < innerHeight + 8 * scale;
        if (visible) gem.entered = true;
        if (canCollect && visible && gem.collected < 0 && refillIfTouched(player, gem, scale)) gem.collected = gem.age;
        if ((gem.collected >= 0 && gem.age - gem.collected > .55) ||
            (gem.entered && !visible && gem.collected < 0) || (!gem.entered && gem.age > 48)) retire(4 + random() * 5);
    }
    function draw(scale) {
        if (gem?.entered) view.draw(gem.x,gem.y,scale,gem.age,gem.collected,1);
        else view.remove();
    }
    return {sample,update,draw,detach:view.remove};
}
