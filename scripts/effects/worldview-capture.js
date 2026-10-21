/* Background cubes retain their native state. This bridge only lends their
 * visual matrices to the existing full-window renderer, then hands matching
 * silhouettes to the directory's existing shell / interactive orbiters. */
export function createWorldviewCapture({ container, camera, coreRoot, orbiters, backgroundApi = null }) {
    let lease = null;
    let records = [];
    let phase = "hidden";
    let progress = 0;
    let visual = { core: 0, orbit: 0, label: 0, assembly: 0 };
    let exitInitial = null;
    let lastRelease = null;
    let claimCenter = null;
    let entrySeconds = 1.5;
    let entryFrameRate = 60;
    let exitSeconds = 1;
    let lastUpdatedAt = 0;
    const mapping = new THREE.Matrix4();
    const cameraSpace = new THREE.Matrix4();
    const worldPose = new THREE.Matrix4();
    const scalePose = new THREE.Matrix4();
    const homePose = new THREE.Matrix4();
    const targetPose = new THREE.Matrix4();
    const startPose = new THREE.Matrix4();
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

    function refreshMapping() {
        if (!lease) return false;
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

    function blendPose(from, to, amount, bow, target) {
        const t = clamp(amount);
        if (t === 0) return target.copy(from);
        if (t === 1) return target.copy(to);
        from.decompose(aPosition, aRotation, aScale);
        to.decompose(bPosition, bRotation, bScale);
        aRotation.normalize();
        bRotation.normalize();
        aTrs.compose(aPosition, aRotation, aScale);
        bTrs.compose(bPosition, bRotation, bScale);
        position.copy(aPosition).lerp(bPosition, t);
        const dx = bPosition.x - aPosition.x, dy = bPosition.y - aPosition.y;
        const length = Math.hypot(dx, dy);
        if (length > 0.001) {
            const arc = 16 * t * t * (1 - t) * (1 - t) * Math.min(8, length * 0.08) * bow;
            position.x -= dy / length * arc;
            position.y += dx / length * arc;
        }
        rotation.copy(aRotation).slerp(bRotation, t);
        scale.set(
            Math.exp(Math.log(Math.max(0.0001, aScale.x)) * (1 - t) + Math.log(Math.max(0.0001, bScale.x)) * t),
            Math.exp(Math.log(Math.max(0.0001, aScale.y)) * (1 - t) + Math.log(Math.max(0.0001, bScale.y)) * t),
            Math.exp(Math.log(Math.max(0.0001, aScale.z)) * (1 - t) + Math.log(Math.max(0.0001, bScale.z)) * t)
        );
        target.compose(position, rotation, scale);
        // Keep affine shear as well as TRS: dropping it at either endpoint
        // makes the two perspective cameras visibly disagree on face corners.
        for (let i = 0; i < 16; i++) {
            target.elements[i] += (from.elements[i] - aTrs.elements[i]) * (1 - t)
                + (to.elements[i] - bTrs.elements[i]) * t;
        }
        return target;
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

    function begin({ duration = 1500 } = {}) {
        release();
        const api = backgroundApi || window.NewHorizonBackgroundCubes;
        const rect = container.getBoundingClientRect();
        if (!api || rect.width <= 1 || rect.height <= 1) return false;
        claimCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        lease = api.claimNearest({ ...claimCenter, count: orbiters.length + 1 });
        if (!lease || lease.entries.length !== orbiters.length + 1) { release(); return false; }
        const hz = frameRate() * speedMultiplier();
        entryFrameRate = frameRate();
        records = lease.entries.map(entry => {
            entry.sourceMatrix.decompose(sampledPosition, sampledRotation, sampledScale);
            return { entry, matrix: entry.sourceMatrix.clone(), exitMatrix: null, free: null,
                opacity: 1, exitOpacity: 1, frontMix: 0, exitFrontMix: 0,
                previousPosition: sampledPosition.clone(), previousEuler: new THREE.Euler().setFromQuaternion(sampledRotation),
                velocity: new THREE.Vector3(-entry.originalRandom.speedX * hz, -entry.originalRandom.speedY * hz, 0),
                angularVelocity: new THREE.Vector3(entry.originalRandom.rotationSpeedX * hz, entry.originalRandom.rotationSpeedY * hz, 0),
                bow: entry.originalRandom.rotationSpeedX < 0 ? -1 : 1 };
        });
        coreRoot.userData.backgroundCubeId = records[0].entry.id;
        orbiters.forEach(({ group }, index) => { group.userData.backgroundCubeId = records[index + 1].entry.id; });
        phase = "entering";
        progress = 0;
        entrySeconds = duration / 1000;
        lastUpdatedAt = performance.now();
        exitInitial = null;
        visual = { core: 0, orbit: 0, label: 0, assembly: 0 };
        container.dataset.capturePhase = phase;
        return true;
    }

    function beginExit({ duration = 1000 } = {}) {
        if (!lease || phase === "exiting") return false;
        exitInitial = { ...visual };
        records.forEach(record => {
            record.exitMatrix = record.matrix.clone();
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
        if (exiting) {
            const initial = exitInitial || visual;
            visual = {
                core: initial.core * (1 - smooth(0.46, 0.54, progress)),
                orbit: initial.orbit * (1 - smooth(0.30, 0.38, progress)),
                label: initial.label * (1 - smooth(0, 0.20, progress)),
                assembly: initial.assembly * (1 - smooth(0, 0.26, progress))
            };
        } else {
            // 先在不透明载体下铺满目标，再移走载体，避免两个半透明
            // canvas 交叉混合时出现 25% 的覆盖率 / 亮度凹陷。
            visual = { core: smooth(0.64, 0.70, progress), orbit: smooth(0.68, 0.74, progress),
                label: smooth(0.84, 1, progress), assembly: smooth(0.80, 1, progress) };
            phase = progress >= 1 ? "held" : "entering";
        }
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

    function update(exiting) {
        if (!lease || !refreshMapping()) return;
        const now = performance.now(), seconds = (now - lastUpdatedAt) / 1000;
        lastUpdatedAt = now;
        let overlap = false;
        for (let index = 0; index < records.length; index++) {
            const record = records[index];
            directoryPose(index, worldPose);
            targetPose.copy(mapping).multiply(worldPose);
            const templateOpacity = index === 0 ? visual.core : visual.orbit;
            if (!exiting) {
                lease.getHomeMatrix(index, homePose);
                const flight = smooth(index * 0.006, index === 0 ? 0.64 : 0.68, progress);
                const lead = progress * entrySeconds * (1 - flight) ** 3 * entryFrameRate * speedMultiplier();
                if (lead > 0.000001) {
                    // 延续原生 Euler 自转，再逐渐让位于目录朝向，不在捕获首帧刹停。
                    sampledPosition.setFromMatrixPosition(homePose);
                    entryEuler.copy(record.entry.mesh.rotation);
                    entryEuler.x += record.entry.originalRandom.rotationSpeedX * lead;
                    entryEuler.y += record.entry.originalRandom.rotationSpeedY * lead;
                    sampledRotation.setFromEuler(entryEuler);
                    homePose.compose(sampledPosition, sampledRotation, record.entry.sourceScale);
                }
                blendPose(homePose, targetPose, flight, record.bow, record.matrix);
                record.matrix.elements[12] -= record.entry.originalRandom.speedX * lead;
                record.matrix.elements[13] -= record.entry.originalRandom.speedY * lead;
                record.frontMix = smooth(0, 0.16, progress);
            } else {
                const initialOpacity = index === 0 ? exitInitial.core : exitInitial.orbit;
                const detachAt = initialOpacity > 0 ? (index === 0 ? 0.58 : 0.42) : 0;
                if (!record.free) {
                    blendPose(record.exitMatrix, targetPose, smooth(0, 0.22, progress) * initialOpacity, 0, startPose);
                    record.matrix.copy(startPose);
                    if (progress >= detachAt) prepareFree(record, progress);
                }
                if (record.free) updateFree(record, progress >= 1 ? 1
                    : (progress - record.free.start) / Math.max(0.0001, 1 - record.free.start));
                record.frontMix = (record.exitFrontMix + (1 - record.exitFrontMix) * smooth(0, 0.22, progress))
                    * (1 - smooth(0.58, 1, progress));
            }
            if (!record.free) sampleMotion(record, seconds);
            const previousOpacity = record.opacity;
            record.opacity = exiting
                ? record.exitOpacity + (1 - record.exitOpacity) * smooth(index === 0 ? 0.28 : 0.08, index === 0 ? 0.46 : 0.30, progress)
                : 1 - smooth(index === 0 ? 0.70 : 0.74, index === 0 ? 0.80 : 0.88, progress);
            overlap ||= templateOpacity > 0 && (record.opacity > 0 || previousOpacity > 0);
            lease.setPose(index, { matrix: record.matrix, opacity: record.opacity,
                frontMix: record.frontMix, visible: record.opacity > 0.0001 });
        }
        // Background's existing RAF can run before the directory's RAF. Only
        // resubmit the shared renderer during actual silhouette overlap, so
        // both canvases paint the same pose and alpha in this browser frame.
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
