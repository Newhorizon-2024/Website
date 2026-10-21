/* One closed analytic cube in Terminal Display's existing composite pass.
 * No scene graph, unfolded panels, inner core, GL resources or animation loop.
 * The controller advances only when its owning display calls update(). */
(() => {
    'use strict';

    // uResolution and uRatio belong to the owning terminal composite shader.
    // Pose is (bottom-up UV center x/y, size/min-viewport, opacity). Eye is
    // (the same projected center x/y, radius/subject-size, opacity).
    const fragment = `
uniform mat3 uCubeInverse;
uniform vec4 uCubePose;
uniform vec4 uCubeEye;

vec4 terminalCube(vec2 uv) {
    if (uCubePose.w <= 0.0) return vec4(0.0);
    float ratio = max(uRatio, 0.00001);
    // Native dimensions are multiplied by the owning display's fixed 1.5 zoom
    // and 0.9 field scale; the cube itself never changes its orthographic size.
    float apparentSize = clamp(min(uResolution.x, uResolution.y) * uCubePose.z,
                               99.0 * ratio, 180.0 * ratio);
    // Inverse columns are the forward rotation's rows. The changing bound is
    // used only for culling; orthographic scale stays fixed to the standard
    // isometric pose's projected span, sqrt(8/3). No frame rescales the cube.
    vec2 halfSpan = vec2(dot(abs(uCubeInverse[0]), vec3(0.5)),
                         dot(abs(uCubeInverse[1]), vec3(0.5)));
    float pixelsPerUnit = apparentSize / 1.632993162;
    vec2 pixel = (uv - uCubePose.xy) * uResolution;
    float eyeRadius = apparentSize * uCubeEye.z;
    vec2 eyePixel = (uv - uCubeEye.xy) * uResolution;
    // signalAt is sampled several times for CRT halo and RGB splitting. Most
    // fragments stop here, before any slab intersection or eye distances.
    vec2 subjectBounds = halfSpan * pixelsPerUnit;
    bool nearCube = all(lessThanEqual(abs(pixel), subjectBounds + vec2(1.0)));
    bool nearEye = all(lessThanEqual(abs(eyePixel), vec2(eyeRadius + 7.0 * ratio)));
    if (!nearCube && !nearEye) return vec4(0.0);

    vec4 subject = vec4(0.0);
    if (nearCube) {
        vec3 rayOrigin = uCubeInverse * vec3(pixel / pixelsPerUnit, 2.0);
        vec3 rayDirection = uCubeInverse * vec3(0.0, 0.0, -1.0);
        bvec3 parallel = lessThan(abs(rayDirection), vec3(0.00001));
        bool parallelMiss = (parallel.x && abs(rayOrigin.x) > 0.5) ||
                            (parallel.y && abs(rayOrigin.y) > 0.5) ||
                            (parallel.z && abs(rayOrigin.z) > 0.5);
        // Preserve the direction's sign, including zero, without infinities or
        // the 0*infinity NaNs that otherwise break axis-aligned orientations.
        vec3 directionSign = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), rayDirection));
        vec3 reciprocal = directionSign / max(abs(rayDirection), vec3(0.00001));
        vec3 slabA = (vec3(-0.5) - rayOrigin) * reciprocal;
        vec3 slabB = (vec3(0.5) - rayOrigin) * reciprocal;
        vec3 entry = min(slabA, slabB);
        vec3 leave = max(slabA, slabB);
        float nearT = max(max(entry.x, entry.y), entry.z);
        float farT = min(min(leave.x, leave.y), leave.z);
        if (!parallelMiss && farT >= max(nearT, 0.0)) {
            vec3 hit = rayOrigin + rayDirection * max(nearT, 0.0);
            vec3 normalAxis = abs(hit);
            vec2 face;
            float incidence;
            if (normalAxis.x >= normalAxis.y && normalAxis.x >= normalAxis.z) {
                face = hit.zy;
                incidence = abs(rayDirection.x);
            } else if (normalAxis.y >= normalAxis.z) {
                face = hit.xz;
                incidence = abs(rayDirection.y);
            } else {
                face = hit.xy;
                incidence = abs(rayDirection.z);
            }
            // Original NH proportions: a 5.4 face, 0.78 grid spacing and
            // 0.38 square size. The same 3x3 grid exists on all six faces.
            const float gap = 0.78 / 5.4;
            const float squareHalf = 0.19 / 5.4;
            vec2 grid = clamp(floor(face / gap + 0.5), vec2(-1.0), vec2(1.0));
            vec2 square = abs(face - grid * gap) - squareHalf;
            float squareDistance = max(square.x, square.y);
            // Analytic pixel coverage avoids derivatives inside a divergent
            // ray-hit branch, which are undefined at silhouette boundaries.
            float aa = min(squareHalf * 0.8, 0.65 / (pixelsPerUnit * max(incidence, 0.04)));
            float dotMask = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, squareDistance);
            // Opaque, pure-black matter. No lighting, gray edge, inner core,
            // transparent shell or independent face assemblies are rendered.
            subject = vec4(vec3(dotMask), 1.0);
        }
    }

    if (nearEye && uCubeEye.w > 0.0) {
        // A compact filled white hexagon, screen aligned at the projected
        // center. Half-plane distance gives six edges with a soft outer glow.
        vec2 p = abs(eyePixel);
        float d = max(p.x - eyeRadius * 0.866025404,
                      dot(p, vec2(0.5, 0.866025404)) - eyeRadius * 0.866025404);
        float fill = 1.0 - smoothstep(-0.5 * ratio, 0.5 * ratio, d);
        float glow = exp(-max(d, 0.0) / (1.8 * ratio)) * 0.22;
        float eyeSignal = clamp(fill + glow, 0.0, 1.0) * uCubeEye.w;
        float alpha = eyeSignal + subject.a * (1.0 - eyeSignal);
        vec3 premultiplied = vec3(eyeSignal) + subject.rgb * subject.a * (1.0 - eyeSignal);
        subject = vec4(premultiplied / max(alpha, 0.00001), alpha);
    }
    subject.a *= uCubePose.w;
    return subject;
}`;

    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const duration = (value, fallback) => clamp(finite(value, fallback), 0.05, 10);

    function multiplyQuaternion(a, b) {
        return [
            a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
            a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
            a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
            a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
        ];
    }

    function create(options = {}) {
        const random = typeof options.random === 'function' ? options.random : Math.random;
        const sample = () => clamp(finite(random(), 0.5), 0, 1);
        const floatPhases = [sample(), sample(), sample()].map(value => value * Math.PI * 2);
        const angularVelocity = Object.freeze({x: 0, y: 0, z: 0});
        const introDuration = duration(options.introDuration, 2.1);
        const defaultExitDuration = duration(options.exitDuration, 1.08);
        const sizeFraction = clamp(finite(options.sizeFraction, 0.272), 0.15, 0.6);
        const eyeRadiusFraction = clamp(finite(options.eyeRadiusFraction, 0.0525), 0.02, 0.18);
        const inverse = new Float32Array(9);
        const pose = new Float32Array([0.5, 0.5, sizeFraction, 0]);
        const eye = new Float32Array([0.5, 0.5, eyeRadiusFraction, 0]);
        const uniforms = Object.freeze({uCubeInverse: inverse, uCubePose: pose, uCubeEye: eye});
        // Fixed standard isometric view: all three visible faces have equal
        // projected area. Only gentle, bounded angular offsets vary with time.
        let initialX = -35 * Math.PI / 180, initialY = Math.PI / 4;
        let baseRotation = multiplyQuaternion(
            [Math.sin(initialX / 2), 0, 0, Math.cos(initialX / 2)],
            [0, Math.sin(initialY / 2), 0, Math.cos(initialY / 2)]
        );
        const radians = Math.PI / 180;
        let targetRoll = -Math.PI / 3;
        const entrySweep = Math.PI / 2;
        let roll = targetRoll;
        let entryRollFrom = targetRoll - entrySweep;
        let rotation = baseRotation.slice();
        let motionTime = 0;
        let tilt = [0, 0, 0];
        let phase = 'idle';
        let progress = 0;
        let running = false;
        let disposed = false;
        let reducedMotion = false;
        let exitDuration = defaultExitDuration;
        let exitStartY = 0.5;
        let entryStartY = -0.4;
        let elapsed = 0;

        function writeRotation() {
            const length = Math.hypot(...rotation) || 1;
            rotation = rotation.map(value => value / length);
            const [x, y, z, w] = rotation;
            // Column-major transpose of the quaternion's forward rotation.
            inverse.set([
                1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
                2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
                2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)
            ]);
        }

        function writeFloat() {
            // Entry retains its quarter-turn sweep; only screen Z floats.
            if (reducedMotion || phase === 'active') roll = targetRoll;
            else if (phase === 'entering') {
                roll = targetRoll + (entryRollFrom - targetRoll) * Math.pow(1 - progress, 3);
            }
            // Exiting keeps the exact current roll, including interrupted
            // intros. Only entry adds a quarter turn; no spin accumulates.
            tilt = reducedMotion ? [0, 0, 0] : [
                0,
                0,
                Math.sin(motionTime * 0.31 + floatPhases[2]) * radians
            ];
            const angle = Math.hypot(...tilt);
            const factor = angle > 0 ? Math.sin(angle * 0.5) / angle : 0;
            // Axis-angle offsets guarantee deviation <= one degree,
            // without accumulated spin, depth travel, translation or scaling.
            const rolledBase = multiplyQuaternion([0, 0, Math.sin(roll / 2), Math.cos(roll / 2)], baseRotation);
            rotation = multiplyQuaternion([tilt[0] * factor, tilt[1] * factor,
                tilt[2] * factor, Math.cos(angle * 0.5)], rolledBase);
            writeRotation();
        }

        function writePose() {
            let y = 0.5;
            if (phase === 'entering') y = 0.5 + (entryStartY - 0.5) * Math.pow(1 - progress, 3);
            else if (phase === 'exiting') y = exitStartY + (-0.4 - exitStartY) * Math.pow(progress, 3);
            else if (phase === 'exited') y = -0.4;
            pose[0] = eye[0] = 0.5;
            pose[1] = eye[1] = y;
            const opacity = phase === 'idle' || phase === 'exited' || disposed ? 0 : 1;
            pose[3] = eye[3] = opacity;
        }

        function settle() {
            if (phase === 'entering') {phase = 'active'; progress = 1;}
            else if (phase === 'exiting') {phase = 'exited'; progress = 1;}
        }

        function start({intro = true, reducedMotion: reduce = false} = {}) {
            if (disposed) return false;
            running = true;
            reducedMotion = Boolean(reduce);
            elapsed = 0;
            progress = intro && !reducedMotion ? 0 : 1;
            phase = intro && !reducedMotion ? 'entering' : 'active';
            entryStartY = -0.4;
            entryRollFrom = targetRoll - entrySweep;
            writeFloat();
            writePose();
            return true;
        }

        function stop() {
            if (disposed) return false;
            running = false;
            return true;
        }

        function update(dt, {reducedMotion: reduce = reducedMotion} = {}) {
            if (disposed) return false;
            reducedMotion = Boolean(reduce);
            if (!running) return false;
            const seconds = Math.max(0, finite(dt, 0));
            if (reducedMotion) {settle(); writeFloat();}
            else {
                if (phase === 'entering' || phase === 'exiting') {
                    elapsed += seconds;
                    progress = clamp(elapsed / (phase === 'entering' ? introDuration : exitDuration), 0, 1);
                    if (progress >= 1) settle();
                }
                if (phase !== 'idle' && phase !== 'exited') {
                    motionTime += seconds;
                    writeFloat();
                }
            }
            writePose();
            return true;
        }

        function beginExit({duration: seconds = defaultExitDuration} = {}) {
            if (disposed || phase === 'idle' || phase === 'exited') return false;
            if (phase === 'exiting') return true;
            exitStartY = pose[1];
            exitDuration = duration(seconds, defaultExitDuration);
            phase = 'exiting';
            progress = elapsed = 0;
            if (reducedMotion) settle();
            writePose();
            return true;
        }

        function cancelExit() {
            if (disposed || (phase !== 'exiting' && phase !== 'exited')) return false;
            // Resume from both the current projected center and screen roll;
            // cancelling an exit during an intro cannot reset its orientation.
            entryStartY = pose[1];
            entryRollFrom = roll;
            phase = reducedMotion ? 'active' : 'entering';
            progress = reducedMotion ? 1 : 0;
            elapsed = 0;
            writeFloat();
            writePose();
            return true;
        }

        function setAngles(values = {}) {
            if (disposed) return false;
            const previousRoll = targetRoll;
            initialX = -35 * radians;
            initialY = 45 * radians;
            targetRoll = -60 * radians;
            baseRotation = multiplyQuaternion(
                [Math.sin(initialX / 2), 0, 0, Math.cos(initialX / 2)],
                [0, Math.sin(initialY / 2), 0, Math.cos(initialY / 2)]
            );
            entryRollFrom += targetRoll - previousRoll;
            roll += targetRoll - previousRoll;
            writeFloat();
            return true;
        }

        setAngles(options);

        function getState() {
            const center = {x: pose[0], y: pose[1]};
            return {
                phase, progress, running, disposed, reducedMotion, center,
                rotation: rotation.slice(), angularVelocity: {...angularVelocity}, inverse: Array.from(inverse),
                rotationMode: 'boundedFloat', motionTime, depth: 0, translation: {x: 0, y: 0, z: 0},
                baseEuler: {x: initialX, y: initialY, z: 0}, maxTiltDegrees: 1,
                effectiveRollDegrees: (roll + tilt[2]) / radians,
                rollDegrees: roll / radians, targetRollDegrees: targetRoll / radians,
                entrySweepDegrees: entrySweep / radians, entryRollFromDegrees: entryRollFrom / radians,
                tiltDegrees: {x: tilt[0] / radians, y: tilt[1] / radians, z: tilt[2] / radians},
                scaleMode: 'fixed-orthographic', scaleBreathing: false,
                opacity: pose[3], sizeFraction, introDuration, exitDuration,
                faces: 6, dotsPerFace: 9, solid: true, shell: false, core: false,
                eye: {kind: 'filled-hexagon', filled: true, anchor: 'projected-center', center: {...center}, projectedCenter: {...center},
                      screenAligned: true, radiusFraction: eyeRadiusFraction, segments: 6},
                animationOwner: 'terminal-display', raf: false, glResources: 0
            };
        }

        function destroy() {
            if (disposed) return;
            disposed = true;
            running = false;
            phase = 'disposed';
            writePose();
        }

        writeFloat();
        writePose();
        return Object.freeze({start, stop, update, beginExit, cancelExit, setAngles, getState, destroy,
            get inverse() {return inverse;}, get pose() {return pose;}, get eye() {return eye;},
            get uniforms() {return uniforms;}});
    }

    window.NewHorizonTerminalCube = Object.freeze({fragment, create});
})();
