import { captureArrival } from "../effects/capture-arrival.js?v=26.11.18.5";
/* The plates and print corners borrow live meshes from the two background layers. */
export function initializeCreatorCaptures(cards, motion) {
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const section = cards[0].closest(".section");
    const canvas = document.getElementById("background-3d");
    const api = window.NewHorizonBackgroundCubes;
    const active = new Set();
    const visible = new Set();
    const records = new WeakMap();
    const listeners = new AbortController();
    const { signal } = listeners;
    const smooth = t => t * t * (3 - 2 * t);
    const randomDelay = (low, high) => low + Math.random() * (high - low);
    let unsubscribe = null, suspended = false, contextLost = false;

    let time = 0, lastFrame = null;

    function release(cube) {
        // The projection correction is visual only. Return the real orientation and native scale.
        cube.matrix.compose(cube.position, cube.quaternion, cube.entry.sourceScale);
        cube.lease.setPose(0, { matrix: cube.matrix });
        cube.lease.release({ atCurrent: true });
        cube.anchor?.remove();
    }

    function clear(record) {
        if (record.plate) release(record.plate);
        for (const pin of record.pins) release(pin);
        record.pins.clear();
        record.plate = null;
        active.delete(record);
    }

    function pause() {
        unsubscribe?.();
        unsubscribe = null;
        lastFrame = null;
    }

    function stop() {
        pause();
        for (const record of active) clear(record);
    }

    function claim(x, y, pin, now) {
        const lease = api.claimNearest({ x, y, count: 1, group: pin ? "creator-print" : "creator-backdrop",
            independent: true, preferVisible: true, allowBackLayer: !pin });
        if (!lease) return null;
        const entry = lease.entries[0];
        return { lease, entry, pin, start: now, duration: pin ? 1250 : 1650,
            position: entry.sourcePosition.clone(), rotation: entry.mesh.rotation.clone(),
            quaternion: entry.sourceQuaternion.clone(), scale: entry.sourceScale.clone(),
            matrix: entry.sourceMatrix.clone(), fromFront: entry.originalLayer === 1 ? 1 : 0,
            front: entry.originalLayer === 1 ? 1 : 0, opacity: 1, blend: 0, fitKey: null,
            goal: new THREE.Vector3(), exiting: null };
    }

    // Fit the actual projected vertices, including perspective. A tilted plate slightly overhangs
    // the spread without a near-plane cut, even on a short or wide viewport.
    function fitPlate(cube, height, focal, settled) {
        if (settled && cube.fitKey === height && cube.focal === focal) return;
        const vertices = cube.vertices ||= Array.from({ length: 8 }, () => new THREE.Vector3());
        let near = 0;
        vertices.forEach((v, i) => {
            v.set((i & 1) - .5, ((i >> 1) & 1) - .5, (i >> 2) - .5).applyQuaternion(cube.quaternion);
            near = Math.max(near, v.z);
        });
        let low = 0, high = .997 / near;
        let minX, maxX, minY, maxY, k;
        for (let i = 0; i < 15; i++) {
            k = (low + high) / 2;
            minX = minY = Infinity; maxX = maxY = -Infinity;
            for (const v of vertices) {
                const factor = focal * k / (1 - v.z * k);
                minX = Math.min(minX, v.x * factor); maxX = Math.max(maxX, v.x * factor);
                minY = Math.min(minY, v.y * factor); maxY = Math.max(maxY, v.y * factor);
            }
            if (maxY - minY < height) low = k; else high = k;
        }
        cube.relativeSize = k;
        cube.offsetX = (minX + maxX) / 2;
        cube.offsetY = (minY + maxY) / 2;
        cube.fitKey = settled ? height : null;
        cube.focal = focal;
    }

    function paint(cube, mix) {
        cube.matrix.compose(cube.position, cube.quaternion, cube.scale);
        // Only the oversized background plate needs off-axis perspective compensation.
        if (!cube.pin) {
            const camera = cube.lease.camera, depth = camera.position.z - cube.position.z;
            const sx = mix * (cube.position.x - camera.position.x) / depth;
            const sy = mix * (cube.position.y - camera.position.y) / depth;
            const m = cube.matrix.elements;
            for (let i = 0; i < 12; i += 4) {
                m[i] -= sx * m[i + 2];
                m[i + 1] -= sy * m[i + 2];
            }
        }
        cube.lease.setPose(0, { matrix: cube.matrix, frontMix: cube.front, opacity: cube.opacity });
    }

    function spin(cube, amount) {
        const rates = cube.entry.originalRandom;
        cube.rotation.x += rates.rotationSpeedX * amount;
        cube.rotation.y += rates.rotationSpeedY * amount;
        cube.quaternion.setFromEuler(cube.rotation);
    }

    function dock(cube, x, y, height, now, view, speed) {
        const t = motion.matches ? 1 : Math.min(1, (now - cube.start) / cube.duration);
        const mix = captureArrival(t);
        // Translational movement settles completely. The plate keeps its native axes
        // at 14% angular speed, while the print corners keep their original rotation.
        cube.spinRatio = cube.pin ? 1 : 1 - .86 * mix;
        if (!motion.matches) spin(cube, speed * cube.spinRatio);
        const camera = cube.lease.camera, depth = camera.position.z - cube.entry.sourcePosition.z;
        const focal = view.height * camera.projectionMatrix.elements[5] / 2;
        const units = depth / focal;
        if (!cube.pin) {
            fitPlate(cube, height, focal, motion.matches);
            cube.scale.setScalar(THREE.MathUtils.lerp(cube.entry.sourceScale.x, depth * cube.relativeSize, mix));
            x -= cube.offsetX; y += cube.offsetY;
        }
        cube.goal.set(camera.position.x + (x - view.left - view.width / 2) * units,
            camera.position.y + (view.top + view.height / 2 - y) * units, cube.entry.sourcePosition.z);
        cube.position.lerpVectors(cube.entry.sourcePosition, cube.goal, mix);
        cube.opacity = THREE.MathUtils.lerp(1, cube.pin ? .92 : .37, mix);
        cube.front = THREE.MathUtils.lerp(cube.fromFront, cube.pin ? 1 : 0, mix);
        cube.blend = mix;
        paint(cube, mix);
    }

    function retire(cube, now, speed) {
        if (motion.matches) { release(cube); return null; }
        cube.exiting ||= { start: now, size: cube.scale.x, front: cube.front, opacity: cube.opacity };
        const exit = cube.exiting;
        const t = Math.min(1, (now - exit.start) / 480), mix = smooth(t);
        const rates = cube.entry.originalRandom;
        spin(cube, speed * THREE.MathUtils.lerp(cube.spinRatio ?? 1, 1, mix));
        cube.position.x -= rates.speedX * speed * mix;
        cube.position.y -= rates.speedY * speed * mix;
        if (!cube.pin) cube.scale.setScalar(THREE.MathUtils.lerp(exit.size, cube.entry.sourceScale.x, mix));
        cube.opacity = THREE.MathUtils.lerp(exit.opacity, 1, mix);
        cube.front = THREE.MathUtils.lerp(exit.front, cube.fromFront, mix);
        paint(cube, cube.blend * (1 - mix));
        if (t < 1) return cube;
        release(cube);
        return null;
    }

    function catchCorner(record, now, view) {
        const work = record.card.querySelector('.creator-work[data-stack-depth="0"]');
        if (!work || work.classList.contains("is-stack-dragging")) return;
        // Keep the anchor inside the transformed print, so tilting and dragging carry it.
        const anchor = document.createElement("span");
        anchor.className = "creator-cube-anchor";
        anchor.setAttribute("aria-hidden", "true");
        work.append(anchor);
        const first = Math.floor(Math.random() * 4);
        for (let i = 0; i < 4; i++) {
            const corner = (first + i) % 4;
            if ([...record.pins].some(pin => pin.corner === corner)) continue;
            const drift = Math.random() ** 2 * .24;
            const alongX = Math.random() < .5;
            const dx = alongX ? drift : 0, dy = alongX ? 0 : drift;
            anchor.style.left = (corner & 1 ? 1 - dx : dx) * 100 + "%";
            anchor.style.top = (corner & 2 ? 1 - dy : dy) * 100 + "%";
            const at = anchor.getBoundingClientRect();
            if (at.x < view.left || at.x > view.right || at.y < view.top || at.y > view.bottom) continue;
            const pin = claim(at.x, at.y, true, now);
            if (!pin) break;
            Object.assign(pin, { anchor, work, corner, holdUntil: now + randomDelay(9500, 15000) });
            record.pins.add(pin);
            return;
        }
        anchor.remove();
    }

    function draw(frameTime) {
        if (document.hidden || suspended) { pause(); return; }
        if (contextLost || !section.classList.contains("is-active")) { stop(); return; }
        if (document.body.classList.contains("creator-lightbox-open")) { lastFrame = null; return; }
        if (lastFrame !== null) time += Math.max(0, frameTime - lastFrame);
        lastFrame = frameTime;
        const now = time;
        const view = canvas.getBoundingClientRect();
        const speed = window.globalSpeedMultiplier ?? 1;
        const leaving = document.body.classList.contains("is-section-transitioning");
        for (const record of active) {
            if (!visible.has(record) || leaving) {
                if (record.plate) record.plate = retire(record.plate, now, speed);
                for (const pin of record.pins) {
                    if (!retire(pin, now, speed)) record.pins.delete(pin);
                }
                if (!record.plate && !record.pins.size) active.delete(record);
                continue;
            }
            const box = record.spread.getBoundingClientRect(), id = record.identity.getBoundingClientRect();
            if (!box.height || !view.height) { clear(record); continue; }
            const mobile = record.mobile.matches;
            const x = mobile ? id.left + record.avatar.getBoundingClientRect().width * .5 : id.left + id.width * .5;
            // On phones the profile occupies a horizontal heading above the prints.
            const y = mobile ? id.top + id.height * .42 : box.top + box.height * .5;
            const height = (mobile ? id.height + 36 : box.height) * 1.075;
            record.plate ||= claim(x, y, false, now);
            if (record.plate?.exiting) record.plate = retire(record.plate, now, speed);
            else if (record.plate) dock(record.plate, x, y, height, now, view, speed);

            if (record.pins.size < 4 && now >= record.nextPin) {
                catchCorner(record, now, view);
                record.nextPin = now + randomDelay(700, 1500);
            }
            for (const pin of record.pins) {
                if (pin.exiting || now >= pin.holdUntil || pin.work.dataset.stackDepth !== "0") {
                    if (!retire(pin, now, speed)) record.pins.delete(pin);
                } else {
                    const at = pin.anchor.getBoundingClientRect();
                    dock(pin, at.x, at.y, 0, now, view, speed);
                }
            }
        }
        if (!active.size) pause();
    }

    function sync() {
        if (!api?.beforeRender || !canvas || contextLost || !section.classList.contains("is-active")) { stop(); return; }
        if (suspended || document.hidden) { pause(); return; }
        for (const record of visible) active.add(record);
        if (active.size) unsubscribe ||= api.beforeRender(draw);
    }

    const mobile = matchMedia("(max-width: 760px)");
    const observer = new IntersectionObserver(entries => {
        if (document.hidden || suspended) return;
        for (const entry of entries) {
            const record = records.get(entry.target);
            const shown = entry.isIntersecting && entry.intersectionRect.height > 0;
            const ratio = entry.intersectionRect.height / Math.max(1, Math.min(entry.boundingClientRect.height, entry.rootBounds?.height || innerHeight));
            const settled = shown && ratio >= (record.card.classList.contains("is-settled") ? .50 : .58);
            record.card.classList.toggle("is-settled", settled);
            record.card.classList.toggle("is-entering", shown && !settled);
            if (shown) {
                if (!visible.has(record)) record.nextPin = time + randomDelay(650, 1400);
                visible.add(record);
            } else visible.delete(record);
        }
        sync();
    }, { rootMargin: "0px 0px -8% 0px", threshold: Array.from({length: 51}, (_, i) => i / 50) });

    cards.forEach(card => {
        records.set(card, { card, spread: card.querySelector(".creator-spread"), identity: card.querySelector(".creator-identity"),
            avatar: card.querySelector(".creator-avatar"), mobile, plate: null, pins: new Set() });
        observer.observe(card);
    });
    section.classList.add("has-creator-reveal");
    window.addEventListener("section-shown", sync, {signal});
    function resumeVisibility() {
        if (!document.hidden && !suspended) {
            observer.disconnect();
            for (const card of cards) observer.observe(card);
        }
        sync();
    }
    document.addEventListener("visibilitychange", resumeVisibility, {signal});
    canvas?.addEventListener("webglcontextlost", () => { contextLost = true; sync(); }, {signal});
    canvas?.addEventListener("webglcontextrestored", () => { contextLost = false; sync(); }, {signal});
    window.addEventListener("pageshow", () => { suspended = false; resumeVisibility(); }, {signal});
    window.addEventListener("pagehide", event => {
        suspended = true;
        if (event.persisted) pause();
        else { stop(); observer.disconnect(); listeners.abort(); }
    }, {signal});
}
