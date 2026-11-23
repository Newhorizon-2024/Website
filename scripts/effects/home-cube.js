import { getHomeSpring } from "./summit-spring.js?v=26.11.23.1";
import { captureArrival } from "./capture-arrival.js?v=26.11.18.5";
/* Dock a live background mesh using the same camera, material and frame as the field. */
export function attachHomeCube({ pad, motion, signal, onBounds, needsBounds }) {
    const api = window.NewHorizonBackgroundCubes;
    const canvas = document.getElementById("background-3d");
    const front = document.getElementById("background-3d-foreground");
    if (!api?.beforeRender || !canvas || !front || front.hidden) return;

    const root = pad.closest(".sling-button");
    const spring = getHomeSpring(pad);
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const orientation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const pose = new THREE.Matrix4();
    const corner = new THREE.Vector3();
    const source = new THREE.Vector3();
    const goal = new THREE.Vector3();
    const edgePx = 29;
    let lease = null, unsubscribe = null;
    let visible = false, suspended = false, contextLost = false;
    let age = 0, exitAge = -1, exitSize = 0, lastMix = 0;
    const ease = t => t * t * t * (10 + t * (6 * t - 15));

    function release() {
        spring.setContact(null);
        if (!lease) return;
        // Restore native TRS before the background adopts the last screen position.
        pose.compose(position, orientation, lease.entries[0].sourceScale);
        lease.setPose(0, { matrix: pose });
        lease.release({ atCurrent: true });
        lease = null;
        root.removeAttribute("data-cube-phase");
    }

    function draw(_now, seconds) {
        const rect = pad.getBoundingClientRect();
        const available = rect.width && rect.height && !document.body.matches(
            ".locked, .is-section-transitioning, .is-another-world-obscured"
        );
        if (!available && !lease) return;
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        if (!lease) {
            lease = api.claimNearest({ x: cx, y: cy, count: 1, group: "return-home", independent: true, preferVisible: true });
            if (!lease) return;
            const entry = lease.entries[0];
            source.copy(entry.sourcePosition);
            position.copy(source);
            rotation.copy(entry.mesh.rotation);
            orientation.copy(entry.sourceQuaternion);
            scale.copy(entry.sourceScale);
            age = 0;
            exitAge = -1;
            lastMix = 0;
            root.dataset.cubePhase = "arriving";
        }

        const entry = lease.entries[0], camera = lease.camera;
        const rates = entry.originalRandom;
        const speed = window.globalSpeedMultiplier ?? 1;
        if (!motion.matches) {
            // The field integrates these Euler rates once per rendered frame.
            rotation.x += rates.rotationSpeedX * speed;
            rotation.y += rates.rotationSpeedY * speed;
            orientation.setFromEuler(rotation);
        }
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) { release(); return; }
        const depth = camera.position.z - entry.sourcePosition.z;
        const units = 2 * depth / (bounds.height * camera.projectionMatrix.elements[5]);
        const xSlope = (cx - bounds.left - bounds.width / 2) * units / depth;
        const ySlope = (bounds.top + bounds.height / 2 - cy) * units / depth;
        let mix;
        if (!available || exitAge >= 0) {
            if (exitAge < 0) {
                exitAge = 0;
                exitSize = scale.x;
                root.dataset.cubePhase = "leaving";
            }
            exitAge += seconds;
            const t = motion.matches ? 1 : Math.min(1, exitAge / 0.36);
            mix = lastMix * (1 - ease(t));
            position.x -= rates.speedX * speed * ease(t);
            position.y -= rates.speedY * speed * ease(t);
            scale.setScalar(THREE.MathUtils.lerp(exitSize, entry.sourceScale.x, ease(t)));
            if (t === 1) { release(); return; }
        } else {
            age += seconds;
            const t = motion.matches ? 1 : Math.min(age / 1.25, 1);
            mix = captureArrival(t);
            lastMix = mix;
            goal.set(camera.position.x + xSlope * depth, camera.position.y + ySlope * depth, source.z);
            // Follow the incoming drift, then settle along a shallow transverse arc.
            if (t < 1) {
                source.x -= rates.speedX * speed;
                source.y -= rates.speedY * speed;
            }
            position.lerpVectors(source, goal, mix);
            const dx = goal.x - source.x, dy = goal.y - source.y;
            const length = Math.hypot(dx, dy);
            if (length > 0 && t < 1 && !motion.matches) {
                const bow = 16 * mix * mix * (1 - mix) ** 2 * Math.min(16 * units, length * 0.09);
                const sign = rates.rotationSpeedY < 0 ? -1 : 1;
                position.x -= sign * dy / length * bow;
                position.y += sign * dx / length * bow;
            }
            scale.setScalar(THREE.MathUtils.lerp(entry.sourceScale.x, edgePx * units, mix));
            if (t === 1 && root.dataset.cubePhase !== "docked") root.dataset.cubePhase = "docked";
        }

        pose.compose(position, orientation, scale);
        // Off-axis projection otherwise stretches the cube near the viewport edges.
        const m = pose.elements;
        const shearX = (position.x - camera.position.x) / depth * mix;
        const shearY = (position.y - camera.position.y) / depth * mix;
        for (const column of [0, 4, 8]) {
            m[column] -= shearX * m[column + 2];
            m[column + 1] -= shearY * m[column + 2];
        }
        // Squash across screen axes so the reaction follows gravity at every rotation.
        const recoil = spring.recoil;
        if (recoil && root.dataset.cubePhase === "docked") {
            for (const column of [0, 4, 8]) {
                m[column] *= 1 + .26 * recoil;
                m[column + 1] *= 1 - .48 * recoil;
            }
            m[13] -= 7 * units * recoil;
        }
        lease.setPose(0, { matrix: pose, frontMix: mix });
        const dockedContact = spring.active && root.dataset.cubePhase === "docked";
        if (needsBounds() || dockedContact) {
            const vertices = [];
            let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
            for (let i = 0; i < 8; i++) {
                corner.set((i & 1) - 0.5, ((i >> 1) & 1) - 0.5, (i >> 2) - 0.5).applyMatrix4(pose).project(camera);
                const x = bounds.left + (corner.x + 1) * bounds.width / 2;
                const y = bounds.top + (1 - corner.y) * bounds.height / 2;
                if (dockedContact) vertices.push({x, y});
                left = Math.min(left, x); right = Math.max(right, x);
                top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
            const box = {left, right, top, bottom};
            if (dockedContact) {
                const edges = [];
                for (let i = 0; i < 8; i++) {
                    for (const axis of [1, 2, 4]) if (!(i & axis)) edges.push([vertices[i], vertices[i | axis]]);
                }
                spring.setContact({...box, edges});
            }
            if (needsBounds()) onBounds(box);
        }
    }

    function sync() {
        root.toggleAttribute("data-cube-field", !contextLost);
        if (visible && !suspended && !contextLost && !document.hidden && !signal.aborted) {
            unsubscribe ||= api.beforeRender(draw);
        } else {
            unsubscribe?.();
            unsubscribe = null;
            if (contextLost || signal.aborted || (!suspended && !document.hidden && !visible)) release();
        }
    }

    const observer = new IntersectionObserver(([entry]) => { if (!document.hidden && !suspended) visible = entry.isIntersecting; sync(); });
    observer.observe(root);
    function refreshVisibility() {
        if (!document.hidden && !suspended) {
            observer.disconnect();
            observer.observe(root);
        }
        sync();
    }
    document.addEventListener("visibilitychange", refreshVisibility, { signal });
    window.addEventListener("pagehide", event => { suspended = true; sync(); if (!event.persisted) release(); }, { signal });
    window.addEventListener("pageshow", () => { suspended = false; refreshVisibility(); }, { signal });
    canvas.addEventListener("webglcontextlost", () => { contextLost = true; sync(); }, { signal });
    canvas.addEventListener("webglcontextrestored", () => { contextLost = false; sync(); }, { signal });
    signal.addEventListener("abort", () => { observer.disconnect(); sync(); }, { once: true });
    sync();
}
