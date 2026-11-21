import { captureArrival } from "./capture-arrival.js?v=26.11.18.5";
/* Background cubes retain their native state. This bridge only lends their
 * visual matrices to the existing full-window renderer, then hands matching
 * silhouettes to the directory's existing shell / interactive orbiters. */
const frameMappings = new WeakMap();

export function createWorldviewCapture({ container, camera, coreRoot, orbiters, backgroundApi = null, variant = "directory" }) {
    let lease = null;
    let records = [];
    let phase = "hidden";
    let progress = 0;
    let visual = beginVisual();
    let exitInitial = null;
    let lastRelease = null;
    let claimCenter = null;
    let nativeTime = 0;
    let exitSeconds = 1;
    const mapping = new THREE.Matrix4();
    let backgroundWidth = 1, backgroundHeight = 1;
    const cameraSpace = new THREE.Matrix4();
    const worldPose = new THREE.Matrix4();
    const scalePose = new THREE.Matrix4();
    const homePose = new THREE.Matrix4();
    const targetPose = new THREE.Matrix4();
    const fromScreen = new THREE.Vector3(), targetScreen = new THREE.Vector3();
    const aPosition = new THREE.Vector3(), bPosition = new THREE.Vector3();
    const aRotation = new THREE.Quaternion(), bRotation = new THREE.Quaternion();
    const aScale = new THREE.Vector3(), bScale = new THREE.Vector3();
    const aTrs = new THREE.Matrix4(), bTrs = new THREE.Matrix4();
    const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    const sampledPosition = new THREE.Vector3(), sampledScale = new THREE.Vector3();
    const sampledRotation = new THREE.Quaternion();
    const sampledEuler = new THREE.Euler();
    const freeEuler = new THREE.Euler();
    const entryEuler = new THREE.Euler();
    const unitCorners = [];
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
        unitCorners.push(new THREE.Vector3(x, y, z));
    }
    const clamp = value => Math.max(0, Math.min(1, value));
    // C2 连续的缓动：起止加速度也归零，避免吸附 / 解除捕获时出现折点。
    const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
    const frameRate = () => 1 / (lease.getFrameSeconds?.() || 1 / 60);
    const speedMultiplier = () => Number.isFinite(window.globalSpeedMultiplier) ? window.globalSpeedMultiplier : 1;

    function refreshMapping(frameTime) {
        if (!lease) return false;
        const cached = frameTime === undefined ? null : frameMappings.get(container);
        if (cached && cached.time === frameTime && cached.camera === camera && cached.background === lease.camera) {
            mapping.copy(cached.matrix);
            backgroundWidth = cached.width;
            backgroundHeight = cached.height;
            return true;
        }
        const targetRect = container.getBoundingClientRect();
        const backgroundRect = lease.canvas.getBoundingClientRect();
        if (targetRect.width <= 1 || targetRect.height <= 1 || backgroundRect.width <= 1 || backgroundRect.height <= 1) return false;
        camera.updateMatrixWorld(true);
        lease.camera.updateMatrixWorld(true);
        const targetProjection = camera.projectionMatrix.elements;
        const backgroundProjection = lease.camera.projectionMatrix.elements;
        const offsetX = (targetRect.left + targetRect.width / 2 - backgroundRect.left) / backgroundRect.width * 2 - 1;
        const offsetY = 1 - (targetRect.top + targetRect.height / 2 - backgroundRect.top) / backgroundRect.height * 2;
        const depth = Math.min(4, 64 / Math.max(16, camera.position.z));
        // Affine camera-space map: every cube vertex, not just its center,
        // has the same screen projection in both differently sized canvases.
        cameraSpace.set(
            depth * targetRect.width / backgroundRect.width * targetProjection[0] / backgroundProjection[0], 0, -depth * offsetX / backgroundProjection[0], 0,
            0, depth * targetRect.height / backgroundRect.height * targetProjection[5] / backgroundProjection[5], -depth * offsetY / backgroundProjection[5], 0,
            0, 0, depth, 0,
            0, 0, 0, 1
        );
        mapping.copy(lease.camera.matrixWorld).multiply(cameraSpace).multiply(camera.matrixWorldInverse);
        backgroundWidth = backgroundRect.width;
        backgroundHeight = backgroundRect.height;
        if (frameTime !== undefined) frameMappings.set(container, {time: frameTime, camera, background: lease.camera,
            matrix: mapping.clone(), width: backgroundWidth, height: backgroundHeight});
        return true;
    }

    function directoryPose(index, target) {
        if (index === 0) {
            target.copy(coreRoot.matrixWorld);
            scalePose.makeScale(5.4, 5.4, 5.4);
        } else {
            target.copy(orbiters[index - 1].group.userData.cube.matrixWorld);
            scalePose.makeScale(0.92, 0.92, 0.92);
        }
        return target.multiply(scalePose);
    }

    function flyToTarget(from, to, amount, record, target) {
        const bow = record.bow;
        if (amount <= 0) return target.copy(from);
        if (amount >= 1) return target.copy(to);
        from.decompose(aPosition, aRotation, aScale);
        to.decompose(bPosition, bRotation, bScale);
        aRotation.copy(sampledRotation);
        bRotation.normalize();
        aTrs.compose(aPosition, aRotation, aScale);
        bTrs.compose(bPosition, bRotation, bScale);

        const backgroundCamera = lease.camera;
        const startDepth = -fromScreen.copy(aPosition).applyMatrix4(backgroundCamera.matrixWorldInverse).z;
        const endDepth = -targetScreen.copy(bPosition).applyMatrix4(backgroundCamera.matrixWorldInverse).z;
        const depth = Math.exp(THREE.MathUtils.lerp(Math.log(startDepth), Math.log(endDepth), amount));
        fromScreen.copy(aPosition).project(backgroundCamera);
        targetScreen.copy(bPosition).project(backgroundCamera);
        const dx = (targetScreen.x - fromScreen.x) * backgroundWidth / 2;
        const dy = (targetScreen.y - fromScreen.y) * backgroundHeight / 2;
        const distance = Math.hypot(dx, dy);
        const arc = 16 * amount ** 2 * (1 - amount) ** 2 * Math.min(bow.limit, distance * bow.ratio) * bow.sign;
        position.copy(fromScreen).lerp(targetScreen, amount);
        if (distance > 0.001) {
            position.x -= (dy / distance) * arc * 2 / backgroundWidth;
            position.y += (dx / distance) * arc * 2 / backgroundHeight;
        }
        const projection = backgroundCamera.projectionMatrix.elements;
        position.z = projection[14] / depth - projection[10];
        position.unproject(backgroundCamera);
        // Track the destination hemisphere across frames. Shortest-path
        // slerp can otherwise reverse suddenly when the moving goal crosses 180°.
        if ((record.previousGoal || aRotation).dot(bRotation) < 0) {
            bRotation.set(-bRotation.x, -bRotation.y, -bRotation.z, -bRotation.w);
        }
        (record.previousGoal ||= new THREE.Quaternion()).copy(bRotation);
        const angle = Math.acos(THREE.MathUtils.clamp(aRotation.dot(bRotation), -1, 1));
        const sine = Math.sin(angle);
        if (Math.abs(sine) < 0.0001) rotation.copy(aRotation).slerp(bRotation, amount);
        else {
            const start = Math.sin((1 - amount) * angle) / sine;
            const end = Math.sin(amount * angle) / sine;
            rotation.set(aRotation.x * start + bRotation.x * end, aRotation.y * start + bRotation.y * end,
                aRotation.z * start + bRotation.z * end, aRotation.w * start + bRotation.w * end).normalize();
        }

        // Interpolate apparent size rather than world size, so changing depth
        // does not make an approaching cube swell before it reaches its slot.
        for (const axis of ["x", "y", "z"]) {
            const startSize = Math.max(0.000001, aScale[axis] / startDepth);
            const endSize = Math.max(0.000001, bScale[axis] / endDepth);
            scale[axis] = depth * Math.exp(THREE.MathUtils.lerp(Math.log(startSize), Math.log(endSize), amount));
        }
        target.compose(position, rotation, scale);
        // Keep the affine part of the mapped pose so its face corners match
        // the destination camera throughout the handoff.
        const startWeight = (1 - amount) * depth / startDepth;
        const endWeight = amount * depth / endDepth;
        for (let i = 0; i < 12; i++) {
            target.elements[i] += (from.elements[i] - aTrs.elements[i]) * startWeight
                + (to.elements[i] - bTrs.elements[i]) * endWeight;
        }
        return target;
    }

    function timing(index) {
        if (variant === "cell") return { launch: 0, dock: 0.72, reveal: 0.81, settled: 1, recall: 0.03, covered: 0.17, detach: 0.40 };
        if (index === 0) return { launch: 0, dock: 0.50, reveal: 0.58, settled: 0.69, recall: 0.08, covered: 0.25, detach: 0.48 };
        const stagger = (index - 1) / Math.max(1, orbiters.length - 1);
        const delay = stagger * 0.17;
        const reverse = (1 - stagger) * 0.13;
        return { launch: 0.045 + delay, dock: 0.58 + delay, reveal: 0.65 + delay, settled: 0.78 + delay,
            recall: reverse, covered: reverse + 0.13, detach: reverse + 0.34 };
    }

    function beginVisual() {
        return { core: 0, orbit: 0, orbiters: new Array(orbiters.length).fill(0), label: 0, assembly: 0 };
    }

    function release() {
        if (!lease) return;
        // Reduced-motion / forced hide still returns the current silhouette,
        // never the pre-capture home. Normal exits already finish as native TRS.
        if (phase !== "exiting" || progress < 1) {
            records.forEach((record, index) => {
                prepareFree(record, 1);
                updateFree(record, 1);
                lease.setPose(index, { matrix: record.matrix, opacity: 1, frontMix: 0 });
            });
            lease.present();
        }
        if (coreRoot.userData.backgroundCubeId === records[0]?.entry.id) delete coreRoot.userData.backgroundCubeId;
        orbiters.forEach(({ group }, index) => {
            if (group.userData.backgroundCubeId === records[index + 1]?.entry.id) delete group.userData.backgroundCubeId;
        });
        lease.release({ atCurrent: true });
        lastRelease = lease.getState();
        lease = null;
        records = [];
        phase = "hidden";
    }

    function begin() {
        release();
        const api = backgroundApi || window.NewHorizonBackgroundCubes;
        const rect = container.getBoundingClientRect();
        if (!api || rect.width <= 1 || rect.height <= 1) return false;
        claimCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        lease = api.claimNearest({ ...claimCenter, count: orbiters.length + 1 });
        if (!lease || lease.entries.length !== orbiters.length + 1) { release(); return false; }
        const hz = frameRate() * speedMultiplier();
        nativeTime = 0;
        records = lease.entries.map((entry, index) => {
            entry.sourceMatrix.decompose(sampledPosition, sampledRotation, sampledScale);
            return { entry, matrix: entry.sourceMatrix.clone(), free: null, docked: false, reveal: 0,
                timing: timing(index), nativeHz: frameRate(),
                opacity: 1, exitOpacity: 1, frontMix: 0, exitFrontMix: 0,
                previousPosition: sampledPosition.clone(), previousEuler: new THREE.Euler().setFromQuaternion(sampledRotation),
                velocity: new THREE.Vector3(-entry.originalRandom.speedX * hz, -entry.originalRandom.speedY * hz, 0),
                angularVelocity: new THREE.Vector3(entry.originalRandom.rotationSpeedX * hz, entry.originalRandom.rotationSpeedY * hz, 0),
                bow: { sign: entry.originalRandom.rotationSpeedX < 0 ? -1 : 1,
                    limit: variant === "cell" ? 16 : 42, ratio: variant === "cell" ? 0.12 : 0.15 } };
        });
        coreRoot.userData.backgroundCubeId = records[0].entry.id;
        orbiters.forEach(({ group }, index) => { group.userData.backgroundCubeId = records[index + 1].entry.id; });
        phase = "entering";
        progress = 0;
        exitInitial = null;
        visual = beginVisual();
        container.dataset.capturePhase = phase;
        return true;
    }

    function beginExit({ duration = 1000 } = {}) {
        if (!lease || phase === "exiting") return false;
        exitInitial = { ...visual };
        records.forEach(record => {
            record.exitReveal = record.reveal;
            record.exitOpacity = record.opacity;
            record.exitFrontMix = record.frontMix;
            record.free = null;
        });
        phase = "exiting";
        progress = 0;
        exitSeconds = duration / 1000;
        container.dataset.capturePhase = phase;
        return true;
    }

    function getVisuals(exiting, amount) {
        if (!lease) return null;
        progress = clamp(amount);
        let orbit = 0;
        for (let index = 0; index < records.length; index++) {
            const record = records[index];
            const stage = record.timing;
            record.reveal = exiting
                ? record.exitReveal * (1 - smooth(stage.covered, stage.detach, progress))
                : smooth(stage.dock, stage.reveal, progress);
            if (index === 0) visual.core = record.reveal;
            else {
                visual.orbiters[index - 1] = record.reveal;
                orbit = Math.max(orbit, record.reveal);
            }
        }
        visual.orbit = orbit;
        visual.label = exiting ? exitInitial.label * (1 - smooth(0, 0.17, progress)) : smooth(0.87, 1, progress);
        visual.assembly = exiting ? exitInitial.assembly * (1 - smooth(0, 0.24, progress)) : smooth(0.57, 0.94, progress);
        if (!exiting) phase = progress >= 1 ? "held" : "entering";
        container.dataset.capturePhase = phase;
        return visual;
    }

    function sampleMotion(record, seconds) {
        record.matrix.decompose(sampledPosition, sampledRotation, sampledScale);
        sampledRotation.normalize();
        sampledEuler.setFromQuaternion(sampledRotation);
        if (seconds > 0.001 && seconds < 0.15) {
            record.velocity.copy(sampledPosition).sub(record.previousPosition).divideScalar(seconds).clampLength(0, 80);
            const difference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b)) / seconds;
            record.angularVelocity.set(difference(sampledEuler.x, record.previousEuler.x),
                difference(sampledEuler.y, record.previousEuler.y), difference(sampledEuler.z, record.previousEuler.z)).clampLength(0, 2.5);
        }
        record.previousPosition.copy(sampledPosition);
        record.previousEuler.copy(sampledEuler);
    }

    function prepareFree(record, start) {
        const nativeSize = record.entry.sourceScale;
        const visualSize = Math.cbrt(Math.abs(record.matrix.determinant()));
        const nativeSizeMean = Math.cbrt(nativeSize.x * nativeSize.y * nativeSize.z);
        sampledPosition.setFromMatrixPosition(record.matrix).applyMatrix4(lease.camera.matrixWorldInverse);
        const depth = Math.max(0.01, -sampledPosition.z);
        const radius = nativeSize.length() / 2 + 2;
        sampledPosition.setFromMatrixPosition(lease.camera.matrixWorld);
        const dx = record.matrix.elements[12] - sampledPosition.x;
        const dy = record.matrix.elements[13] - sampledPosition.y;
        const margin = Math.min(48, Math.min(window.innerWidth, window.innerHeight) * 0.15);
        // 原背景按世界坐标左 / 下边界循环。深度换算不能把仍可见的
        // 方块放到该边界之外，否则接管的下一帧就会意外重新随机。
        let maximumRatio = (lease.camera.far - radius) / depth;
        if (dx < -0.0001) maximumRatio = Math.min(maximumRatio,
            (sampledPosition.x + window.innerWidth / 2 - margin) / -dx);
        if (dy < -0.0001) maximumRatio = Math.min(maximumRatio,
            (sampledPosition.y + window.innerHeight / 2 - margin) / -dy);
        const ratio = Math.max((lease.camera.near + radius) / depth,
            Math.min(Math.max(0.0001, maximumRatio), nativeSizeMean / Math.max(0.0001, visualSize)));
        // 沿视线进行同投影换算：恢复原随机尺寸而不在屏幕上飞向另一个位置。
        // 近 / 远裁剪面留出完整方块的半径，不能把手机上的方块推到 far 之外。
        scalePose.makeScale(ratio, ratio, ratio);
        const from = new THREE.Matrix4().copy(lease.camera.matrixWorld).multiply(scalePose)
            .multiply(lease.camera.matrixWorldInverse).multiply(record.matrix);
        const origin = new THREE.Vector3(), quaternion = new THREE.Quaternion(), fromScale = new THREE.Vector3();
        from.decompose(origin, quaternion, fromScale);
        quaternion.normalize();
        const trs = new THREE.Matrix4().compose(origin, quaternion, fromScale);
        const residual = from.elements.map((value, index) => value - trs.elements[index]);
        const hz = frameRate() * speedMultiplier();
        record.free = { start, seconds: exitSeconds * (1 - start), origin,
            euler: new THREE.Euler().setFromQuaternion(quaternion), fromScale, residual,
            velocity: record.velocity.clone().multiplyScalar(ratio).clampLength(0, 80),
            angularVelocity: record.angularVelocity.clone(),
            targetVelocity: new THREE.Vector3(-record.entry.originalRandom.speedX * hz, -record.entry.originalRandom.speedY * hz, 0),
            targetAngularVelocity: new THREE.Vector3(record.entry.originalRandom.rotationSpeedX * hz, record.entry.originalRandom.rotationSpeedY * hz, 0) };
    }

    function updateFree(record, amount) {
        const free = record.free;
        const u = clamp(amount);
        const eased = smooth(0, 1, u);
        // Integral of smootherstep. Position and angle inherit the last orbit
        // velocity, then converge continuously to the existing background rates.
        const integral = u ** 6 - 3 * u ** 5 + 2.5 * u ** 4;
        const elapsed = free.seconds * u, blended = free.seconds * integral;
        position.copy(free.origin).addScaledVector(free.velocity, elapsed - blended).addScaledVector(free.targetVelocity, blended);
        freeEuler.set(free.euler.x + free.angularVelocity.x * (elapsed - blended) + free.targetAngularVelocity.x * blended,
            free.euler.y + free.angularVelocity.y * (elapsed - blended) + free.targetAngularVelocity.y * blended,
            free.euler.z + free.angularVelocity.z * (elapsed - blended) + free.targetAngularVelocity.z * blended);
        rotation.setFromEuler(freeEuler);
        scale.copy(free.fromScale).lerp(record.entry.sourceScale, eased);
        record.matrix.compose(position, rotation, scale);
        for (let i = 0; i < 16; i++) record.matrix.elements[i] += free.residual[i] * (1 - eased);
    }

    function update(exiting, now, seconds) {
        if (!lease || !refreshMapping(now)) return;
        if (!exiting) nativeTime += Math.max(0, seconds) * Math.max(0, speedMultiplier());
        let overlap = false;
        for (let index = 0; index < records.length; index++) {
            const record = records[index];
            const stage = record.timing;
            const previousOpacity = record.opacity;
            if (!exiting) {
                directoryPose(index, worldPose);
                targetPose.copy(mapping).multiply(worldPose);
                record.docked = progress >= stage.dock;
                if (record.docked) record.matrix.copy(targetPose);
                else {
                    lease.getHomeMatrix(index, homePose);
                    const lead = nativeTime * record.nativeHz;
                    sampledPosition.setFromMatrixPosition(homePose);
                    sampledPosition.x -= record.entry.originalRandom.speedX * lead;
                    sampledPosition.y -= record.entry.originalRandom.speedY * lead;
                    const thrown = record.entry.throwMotion;
                    if (thrown) {
                        const travel = -Math.expm1(-thrown.damping * nativeTime) / thrown.damping;
                        sampledPosition.x += thrown.x * travel;
                        sampledPosition.y += thrown.y * travel;
                    }
                    entryEuler.copy(record.entry.mesh.rotation);
                    entryEuler.x += record.entry.originalRandom.rotationSpeedX * lead;
                    entryEuler.y += record.entry.originalRandom.rotationSpeedY * lead;
                    sampledRotation.setFromEuler(entryEuler);
                    homePose.compose(sampledPosition, sampledRotation, record.entry.sourceScale);
                    const travel = (progress - stage.launch) / (stage.dock - stage.launch);
                    flyToTarget(homePose, targetPose, captureArrival(travel), record, record.matrix);
                }
                record.frontMix = smooth(stage.launch, Math.min(stage.dock, stage.launch + 0.26), progress);
                record.opacity = 1 - smooth(stage.reveal, stage.settled, progress);
                sampleMotion(record, seconds);
            } else {
                const detachAt = record.docked ? stage.detach : 0;
                if (!record.free) {
                    if (record.docked) {
                        directoryPose(index, worldPose);
                        record.matrix.copy(mapping).multiply(worldPose);
                        sampleMotion(record, seconds);
                    }
                    if (progress >= detachAt) prepareFree(record, Math.min(progress, 0.9999));
                }
                if (record.free) updateFree(record, progress >= 1 ? 1
                    : (progress - record.free.start) / (1 - record.free.start));
                const transfer = smooth(detachAt, Math.min(0.98, detachAt + 0.36), progress);
                record.frontMix = record.exitFrontMix * (1 - transfer);
                record.opacity = record.exitOpacity + (1 - record.exitOpacity) * smooth(stage.recall, stage.covered, progress);
            }
            overlap ||= record.docked && record.reveal > 0 && (record.opacity > 0 || previousOpacity > 0);
            lease.setPose(index, { matrix: record.matrix, opacity: record.opacity,
                frontMix: record.frontMix, visible: record.opacity > 0.0001 });
        }
        // Paint both canvases in the same frame during the silhouette handoff.
        if (overlap || (exiting && progress >= 1)) lease.present();
        if (exiting && progress >= 1) release();
    }

    function getState() {
        let maxSeamError = 0;
        if (lease && refreshMapping()) {
            const rect = container.getBoundingClientRect(), backgroundRect = lease.canvas.getBoundingClientRect();
            const local = new THREE.Vector3(), other = new THREE.Vector3();
            records.forEach((record, index) => {
                directoryPose(index, worldPose);
                targetPose.copy(mapping).multiply(worldPose);
                for (const corner of unitCorners) {
                    local.copy(corner).applyMatrix4(worldPose).project(camera);
                    other.copy(corner).applyMatrix4(targetPose).project(lease.camera);
                    const x = rect.left + (local.x + 1) * rect.width / 2;
                    const y = rect.top + (1 - local.y) * rect.height / 2;
                    const bx = backgroundRect.left + (other.x + 1) * backgroundRect.width / 2;
                    const by = backgroundRect.top + (1 - other.y) * backgroundRect.height / 2;
                    maxSeamError = Math.max(maxSeamError, Math.hypot(x - bx, y - by));
                }
            });
        }
        return { phase, progress, active: Boolean(lease), releaseMode: "in-place", claimCenter: claimCenter && { ...claimCenter }, visual: { ...visual }, maxSeamError,
            bindings: records.map((record, index) => ({ id: record.entry.id, role: index ? orbiters[index - 1].group.userData.target : "core" })),
            lease: lease?.getState() || null, lastRelease };
    }

    return { begin, beginExit, getVisuals, update, release, getState, hasLease: () => Boolean(lease) };
}
