/* Native composition of the four supplied components. Plasma's 60-step volume
 * integration is retained; Faulty Terminal supplies the CRT treatment instead
 * of its old glyph field. Dither's Bayer matrix quantizes that same signal and
 * Noise's seeded grain is the final overlay. No React, CDN or extra RAF. */
(() => {
    'use strict';
    const owners = new WeakMap();
    const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
    const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const MAX_HITS = 4;
    const HIT_SECONDS = 0.7;
    const cubeModule = window.NewHorizonTerminalCube;
    const VERTEX = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
    // Plasma's volume integration is retained. Its longitudinal Y domain now
    // follows screen X: horizontal ribbons, not a rotated/cropped canvas.
    const VOLUME = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform vec2 uScale;
uniform float uZoom;
uniform float uTime;
uniform float uTwist;
uniform float uWave;
uniform float uSharpness;
uniform float uRibbonCount;
uniform float uDetail;
uniform vec2 uOrbit;
uniform float uDither;
out vec4 outColor;
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float driftNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 blend = fract(p);
    blend = blend * blend * (3.0 - 2.0 * blend);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), blend.x), blend.y);
}
void main() {
    float aspect = uView.x / uView.y;
    // Portrait uses a wider view of the longitudinal flow instead of showing
    // one tall cropped slice. Landscape/desktop sampling remains unchanged.
    float portrait = 1.0 - smoothstep(0.68, 1.0, aspect);
    float viewSpan = mix(uView.y, uView.x, portrait);
    vec2 screen = (gl_FragCoord.xy * uScale - 0.5 * uView) / (viewSpan * uZoom);
    float along = mix(0.82, 0.70, smoothstep(0.8, 2.2, aspect));
    vec2 c = vec2(-screen.y * mix(1.28, 1.50, portrait), screen.x * along);
    vec3 rd = normalize(vec3(c, 1.0));
    vec3 ro = vec3(0.0, 0.0, -4.0);
    float cy = cos(uOrbit.x);
    float sy = sin(uOrbit.x);
    float cx = cos(uOrbit.y);
    float sx = sin(uOrbit.y);
    mat3 orbit = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy) *
                 mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
    ro = orbit * ro;
    rd = orbit * rd;
    float z = 0.0;
    float density = 0.0;
    float band = 0.0;
    for (int i = 0; i < 60; i++) {
        vec3 p = ro + rd * z;
        // One march follows 2–6 loose flow channels. Advected noise opens
        // gaps, changes their widths and sheds fine wisps instead of filling
        // the complete screen with constant, parallel tubes.
        float spacing = 2.8 / max(1.0, uRibbonCount - 1.0);
        float strand = clamp(floor((p.x + 1.4) / spacing + 0.5), 0.0, uRibbonCount - 1.0);
        float phase = strand * 2.399963;
        float flow = p.y - uTime * (0.78 + strand * 0.035);
        float cloud = driftNoise(vec2(flow * 0.65 + phase, strand * 3.7 + p.z * 0.16));
        float scraps = driftNoise(vec2(flow * 1.9 - phase, strand * 2.9 + p.z * 0.55));
        float bend = sin(flow * 1.1 + phase) * 0.18 +
                     sin(flow * 2.6 + p.z * 0.6 + phase) * 0.065 + (cloud - 0.5) * 0.16;
        float across = p.x - (strand * spacing - 1.4) + bend * (0.35 + uWave);
        vec2 q = vec2(across, p.z * 0.68);
        float angle = flow * uTwist * 0.18 + phase;
        q *= mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        float radius = min(0.20, spacing * 0.29) * (0.88 + 0.12 * sin(phase + 0.7)) *
                       mix(0.6, 1.15, cloud);
        float eddy = sin(flow * 3.4 + atan(q.y, q.x) * 3.0 + phase) *
                     sin(flow * 1.7 + p.z * 4.0) * 0.023 * uDetail;
        float shell = abs(length(q * vec2(1.0, 0.82)) - radius - eddy) * 0.72;
        float stepLength = clamp(shell * 0.72, 0.035, 0.32);
        z += stepLength;
        float streak = 0.5 + 0.5 * sin(flow * 8.0 + across * 54.0 + p.z * 7.0 + phase);
        float threads = mix(1.0, 0.38 + 0.8 * streak * streak, clamp(uDetail, 0.0, 1.0));
        threads *= 1.0 + max(0.0, uDetail - 1.0) * 0.3 * sin(flow * 17.0 + p.z * 12.0);
        float patches = smoothstep(0.26, 0.7, cloud) * mix(0.35, 1.0, scraps);
        float wispAcross = across + sin(flow * 1.9 + phase) * 0.12 + p.z * 0.23;
        float wisps = exp(-abs(wispAcross) * uSharpness * 0.85 - abs(p.z) * 2.8) *
                      smoothstep(0.48, 0.82, scraps) * 0.25;
        float weight = (0.85 + 0.65 * sin(flow * 1.1 + p.z * 1.8 + phase)) *
                       (exp(-shell * uSharpness) * patches + wisps) * stepLength * threads * 1.3;
        density += weight;
        band += weight * (0.5 + 0.5 * sin(flow * 0.7 + p.z * 2.0 + phase));
    }
    vec2 encoded = sqrt(vec2(density, band) / (1.0 + vec2(density, band)));
    encoded += (vec2(hash(gl_FragCoord.xy), hash(gl_FragCoord.yx + 17.0)) - 0.5) * uDither;
    outColor = vec4(encoded, 0.0, 1.0);
}`;
    const COMPOSITE = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uVolume;
uniform sampler2D uNoise;
uniform vec2 uResolution;
uniform vec2 uNoiseShift;
uniform float uRatio;
uniform float uTime;
uniform float uPresence;
uniform float uCurvature;
uniform float uScanline;
uniform float uGlitch;
uniform float uFlicker;
uniform float uVignette;
uniform float uLevels;
uniform float uCell;
uniform float uGrain;
uniform float uGain;
uniform float uShine;
uniform float uReduced;
uniform float uScreenZoom;
uniform float uFieldScale;
uniform float uExitStrength;
uniform float uExitFade;
uniform vec3 uHeat;
uniform vec4 uHits[4];
uniform float uClock;
out vec4 outColor;
const float bayer8[64] = float[64](
    0.0/64.0,48.0/64.0,12.0/64.0,60.0/64.0,3.0/64.0,51.0/64.0,15.0/64.0,63.0/64.0,
    32.0/64.0,16.0/64.0,44.0/64.0,28.0/64.0,35.0/64.0,19.0/64.0,47.0/64.0,31.0/64.0,
    8.0/64.0,56.0/64.0,4.0/64.0,52.0/64.0,11.0/64.0,59.0/64.0,7.0/64.0,55.0/64.0,
    40.0/64.0,24.0/64.0,36.0/64.0,20.0/64.0,43.0/64.0,27.0/64.0,39.0/64.0,23.0/64.0,
    2.0/64.0,50.0/64.0,14.0/64.0,62.0/64.0,1.0/64.0,49.0/64.0,13.0/64.0,61.0/64.0,
    34.0/64.0,18.0/64.0,46.0/64.0,30.0/64.0,33.0/64.0,17.0/64.0,45.0/64.0,29.0/64.0,
    10.0/64.0,58.0/64.0,6.0/64.0,54.0/64.0,9.0/64.0,57.0/64.0,5.0/64.0,53.0/64.0,
    42.0/64.0,26.0/64.0,38.0/64.0,22.0/64.0,41.0/64.0,25.0/64.0,37.0/64.0,21.0/64.0
);
float hashCell(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}
${cubeModule?.fragment || 'vec4 terminalCube(vec2 uv) { return vec4(0.0); }'}
// Faulty Terminal's rolling tear, with its own time scale kept subtle.
float onOff(float a, float b, float c) {
    return step(c, sin(uTime + a * cos(uTime * b))) * uFlicker;
}
float displace(vec2 look) {
    float y = look.y - mod(uTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + uTime) * 0.0125 * onOff(4.0, 2.0, 0.8) *
           (1.0 + cos(uTime * 60.0)) * window * uGlitch * (1.0 - uReduced);
}
vec2 barrel(vec2 uv) {
    vec2 c = uv * 2.0 - 1.0;
    c *= 1.0 + uCurvature * dot(c, c);
    return c * 0.5 + 0.5;
}
float signalAt(vec2 uv) {
    // A Dither cell samples one shared Plasma field, not a second noise field.
    float deviceCell = max(1.0, floor(uCell * uRatio + 0.5));
    vec2 sampleUV = (floor(uv * uResolution / deviceCell) + 0.5) * deviceCell / uResolution;
    vec2 encoded = clamp(texture(uVolume, sampleUV).rg, 0.0, 0.9995);
    encoded *= encoded;
    vec2 volume = encoded / (1.0 - encoded);
    vec2 delta = (uv - uHeat.xy) * vec2(uResolution.x / uResolution.y, 1.0);
    float heat = uHeat.z * exp(-dot(delta, delta) / 0.05);
    float density = volume.r * uGain * (1.0 + heat * 0.35);
    float band = clamp(volume.g / max(volume.r, 0.00001), 0.0, 1.0);
    float tint = mix(0.65, 0.95, band * 0.35);
    float hdr = tint * density + density * density * uShine;
    float value = pow(1.0 - exp(-hdr), 1.0 / 2.2);
    ivec2 cell = ivec2(mod(floor(uv * uResolution / deviceCell), 8.0));
    cell = (cell + 8) % 8;
    float threshold = bayer8[cell.y * 8 + cell.x] - 0.25;
    float levels = max(uLevels, 2.0) - 1.0;
    float v = value + threshold / levels;
    v = clamp(v - mix(0.2, 0.0, smoothstep(0.45, 0.8, v)), 0.0, 1.0);
    float plasma = floor(v * levels + 0.5) / levels;
    // Faulty Terminal starts the background cells; the solid cube follows its
    // own continuous cubic rise and never inherits random transparent holes.
    vec2 introCell = floor(uv * vec2(60.0, 32.0));
    float cellDelay = hashCell(introCell) * 0.8;
    float cellProgress = clamp((uPresence - cellDelay) / 0.2, 0.0, 1.0);
    plasma *= smoothstep(0.0, 1.0, cellProgress);
    // Cube faces, their nine pips and the eye enter this same monochrome
    // signal before CRT channel splitting, scanlines and seeded grain.
    vec4 cube = terminalCube(uv);
    return mix(plasma, cube.r, cube.a);
}
void main() {
    vec2 nativeUV = gl_FragCoord.xy / uResolution;
    // Zoom the complete signal after barrel curvature. UI remains in its
    // own full-viewport layout and the former curved black border is cropped.
    vec2 uv = (barrel(nativeUV) - 0.5) / (uScreenZoom * uFieldScale) + 0.5;
    // Faulty Terminal's original four-hit, 0.7-second tear envelope. This is
    // independent of Plasma speed, and is fully disabled in reduced motion.
    float hitTear = 0.0;
    float hitSplit = 0.0;
    if (uReduced < 0.5) {
        for (int k = 0; k < 4; k++) {
            vec4 hit = uHits[k];
            if (hit.w <= 0.0) continue;
            float age = uClock - hit.z;
            if (age < 0.0 || age > 0.7) continue;
            float life = age / 0.7;
            float envelope = (1.0 - life) * (1.0 - life);
            float tick = floor(age * 30.0);
            float bands = 14.0 + 26.0 * hashCell(vec2(hit.z, tick * 0.37));
            float row = floor(uv.y * bands);
            float pickRow = hashCell(vec2(row + tick * 7.0, hit.z * 17.0));
            float torn = step(0.42, pickRow);
            float reach = exp(-abs(uv.y - hit.y) * 2.5);
            float shift = (hashCell(vec2(row * 1.7 + tick, hit.z)) - 0.5) * 0.22;
            hitTear += shift * torn * envelope * reach;
            hitSplit = max(hitSplit, envelope * reach * (0.4 + 0.6 * torn));
        }
    }
    uv.x += displace(uv);
    uv.x += hitTear;
    float exitStrength = uExitStrength * (1.0 - uReduced);
    float exitTick = floor(uClock * 30.0);
    float exitRow = floor(uv.y * 31.0);
    float exitPick = hashCell(vec2(exitRow, exitTick));
    float block = step(0.38, exitPick);
    float exitTear = (hashCell(vec2(exitRow + exitTick * 3.0, 19.0)) - 0.5) *
                     0.36 * block + (uv.y - 0.5) * sin(exitTick * 2.1) * 0.12;
    uv.x += exitTear * exitStrength;
    uv.y += (hashCell(vec2(exitRow, exitTick + 8.0)) - 0.5) * block * exitStrength * 0.035;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    float middle = signalAt(uv);
    vec2 off = vec2(0.002);
    float halo = (signalAt(uv + vec2(-off.x, 0.0)) + signalAt(uv + vec2(off.x, 0.0)) +
                  signalAt(uv + vec2(0.0, -off.y)) + signalAt(uv + vec2(0.0, off.y))) * 0.25;
    float bar = step(mod(uv.y + uTime * 6.6666667, 1.0), 0.2) * 0.4 + 1.0;
    float scan = 1.0 - uScanline * (0.5 + 0.5 * sin(gl_FragCoord.y / uRatio * 3.14159265));
    // The Plasma/Dither field is already monochrome. Split the resulting
    // signal afterwards, so the impact's RGB offset survives that filter.
    vec3 channels = vec3(middle);
    if (hitSplit + exitStrength > 0.001) {
        vec2 ca = vec2(hitSplit * 6.0 + exitStrength * 38.0,
                       hitSplit * 6.0 + exitStrength * 9.0) / uResolution;
        channels.r = signalAt(uv + ca);
        channels.b = signalAt(uv - ca);
    }
    vec3 col = (0.9 * channels + 0.12 * halo * bar) * scan;
    col *= 1.0 - exitStrength * step(0.86, exitPick) * 0.8;
    float edge = 0.04 + 0.22 * uVignette;
    vec2 fade = smoothstep(vec2(0.0), vec2(edge), uv) * smoothstep(vec2(0.0), vec2(edge), 1.0 - uv);
    float mask = fade.x * fade.y;
    mask = mask * mask * (3.0 - 2.0 * mask);
    col *= mix(1.0, mask, clamp(uVignette * 1.5, 0.0, 1.0)) * inside;
    // The supplied Noise tile, with CSS overlay blending expressed in shader.
    float grain = texture(uNoise, (gl_FragCoord.xy / uRatio + uNoiseShift) / 256.0).r;
    vec3 overlay = mix(2.0 * col * grain, 1.0 - 2.0 * (1.0 - col) * (1.0 - grain), step(vec3(0.5), col));
    col = mix(col, overlay, uGrain);
    outColor = vec4(clamp(col * uExitFade, 0.0, 1.0), 1.0);
}`;
    // Same generator, seed and triangular grain distribution as supplied Noise.
    function generator(seed) {
        let state = seed >>> 0 || 1;
        return () => {
            state = (state + 0x6d2b79f5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function makeNoise(contrast) {
        const data = new Uint8Array(256 * 256);
        const random = generator(1013904223);
        const range = 0.5 + contrast * 1.1;
        for (let i = 0; i < data.length; i++) {
            // Uint8ClampedArray / canvas ImageData rounds the original samples.
            data[i] = Math.round(clamp(0.5 + (random() + random() - 1) * range, 0, 1) * 255);
        }
        return data;
    }
    function create(container, options = {}) {
        if (!container?.appendChild) return null;
        owners.get(container)?.destroy();
        let settings = Object.freeze({
            speed: clamp(finite(options.speed, 0.65), 0, 3),
            scale: clamp(finite(options.scale, 1), 0.25, 3),
            twist: clamp(finite(options.twist, 1), 0, 3),
            wave: clamp(finite(options.wave, 1), 0, 3),
            softness: clamp(finite(options.softness, 0.52), 0, 1),
            gain: clamp(finite(options.brightness, 0.7), 0.1, 3) * 4.8,
            shine: clamp(finite(options.shine, 1), 0, 3) * 0.025,
            curvature: clamp(finite(options.curvature, 0.13), 0, 0.35),
            scanline: clamp(finite(options.scanlineIntensity, 0.18), 0, 0.65),
            glitch: clamp(finite(options.glitchAmount, 0.4), 0, 2),
            flicker: clamp(finite(options.flickerAmount, 0.35), 0, 1),
            vignette: clamp(finite(options.vignette, 0.65), 0.1, 1),
            levels: clamp(finite(options.colorNum, 4), 2, 8),
            cell: clamp(finite(options.pixelSize, 2), 1, 6),
            grain: clamp(finite(options.noiseOpacity, 0.28), 0, 0.6),
            screenZoom: 1.5,
            fieldScale: 0.9,
            ribbonCount: 6,
            detail: 2,
            noiseContrast: clamp(finite(options.noiseContrast, 0.6), 0, 1),
            maxVolumePixels: clamp(finite(options.maxVolumePixels, 250000), 40000, 250000),
            maxOutputPixels: clamp(finite(options.maxOutputPixels, 1800000), 90000, 1800000),
            quality: clamp(finite(options.quality, 0.65), 0.25, 1),
            dpr: clamp(finite(options.dpr, Math.min(window.devicePixelRatio || 1, 1.5)), 0.5, 2),
            fps: clamp(finite(options.fps, 30), 10, 30),
            intro: options.intro !== false,
            mouseInteractive: options.mouseInteractive !== false
        });
        const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        const canvas = document.createElement('canvas');
        canvas.className = 'terminal-display-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block'});
        container.prepend(canvas);
        let gl = null;
        let resources = null;
        let notice = null;
        let disposed = false;
        let running = false;
        let visible = true;
        let contextLost = false;
        let raf = 0;
        let last = 0;
        let lastPaint = 0;
        let time = 0;
        let clock = 0;
        let hitIndex = 0;
        const hits = new Float32Array(MAX_HITS * 4);
        let intro = settings.intro && !media?.matches ? 0 : 1;
        let draws = 0;
        let error = '';
        let context = 'initializing';
        let floatTarget = false;
        const view = {width: 1, height: 1, ratio: 1, volumeWidth: 1, volumeHeight: 1};
        const pointer = {x: 0.5, y: 0.5, inside: false};
        const motion = {yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0, heat: 0, heatX: 0.5, heatY: 0.5};
        const noiseShift = [0, 0];
        let noiseTick = -1;
        const shifting = generator(0x51fa730b);
        const cube = cubeModule?.create(options);
        const onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
        let notifying = false;
        let exit = null;
        let exitProgress = 0;
        let exitStrength = 0;
        let exitFade = 1;
        let transitionPeak = 0;

        function finishExit(completed) {
            if (!exit) return;
            const pending = exit;
            exit = null;
            clearTimeout(pending.timer);
            pending.resolve(completed);
        }
        function cancelExit() {
            const hadExit = Boolean(exit) || exitProgress > 0;
            finishExit(false);
            exitProgress = exitStrength = transitionPeak = 0;
            exitFade = 1;
            cube?.cancelExit();
            if (hadExit) { draw(); wake(); }
            return hadExit;
        }
        function advanceExit() {
            if (!exit) return;
            exitProgress = clamp((clock - exit.started) / exit.duration, 0, 1);
            exitStrength = exit.glitch ? Math.max(Math.pow(Math.sin(exitProgress * Math.PI), 0.65), 0.55 * (1 - exitProgress)) : 0;
            transitionPeak = Math.max(transitionPeak, exitStrength);
            if (exitProgress >= 1) {
                exitStrength = 0;
                finishExit(true);
            }
        }
        function transitionOut(transitionOptions = {}) {
            if (disposed || !running || !visible || document.hidden || contextLost || context !== 'ready') return Promise.resolve(false);
            if (exit) return exit.promise;
            const duration = clamp(finite(transitionOptions.duration, 1080), 0, 1800) / 1000;
            const reduced = Boolean(media?.matches);
            exitProgress = exitStrength = transitionPeak = 0;
            exitFade = 1;
            cube?.beginExit({duration: reduced ? 0.001 : Math.max(duration, 0.001)});
            // Reduced motion has no continuous RAF, flashes or RGB offsets.
            // An immediate final pose also keeps navigation usable at zero fps.
            if (reduced || duration <= 0) {
                cube?.update(0.01 + duration, {reducedMotion: reduced});
                exitProgress = 1;
                exitFade = reduced ? 0 : 1;
                draw();
                return Promise.resolve(true);
            }
            let resolve;
            const promise = new Promise(done => { resolve = done; });
            exit = {started: clock, duration, glitch: transitionOptions.glitch !== false, resolve, promise, timer: 0};
            // Submit a strong initial frame immediately. A cold/restored or
            // saturated GPU must not skip every glitch frame before the
            // bounded fallback finishes navigation. Reuse this same canvas.
            exitStrength = transitionPeak = exit.glitch ? 0.55 : 0;
            draw();
            exit.timer = setTimeout(() => {
                if (!exit) return;
                if (disposed || !running || !visible || document.hidden || contextLost) { cancelExit(); return; }
                // On a saturated GPU the animation clock may advance slowly.
                // Finish the same pose once at the bounded wall-clock deadline.
                const remaining = Math.max(0, exit.duration - (clock - exit.started));
                cube?.update(remaining + 0.01, {reducedMotion: false});
                clock = Math.max(clock, exit.started + exit.duration);
                // Commit explicitly: subtracting large floating clocks can
                // otherwise leave progress just below one with an exited cube.
                exitProgress = 1;
                exitStrength = 0;
                finishExit(true);
                draw();
            }, Math.min(3300, Math.max(1500, duration * 1000 + 1800)));
            wake();
            return promise;
        }

        function set(next = {}) {
            if (disposed) return settings;
            cube?.setAngles(next);
            settings = Object.freeze({...settings,
                ribbonCount: 6
            });
            draw();
            return settings;
        }

        function clearHits() {
            hits.fill(0);
            hitIndex = 0;
        }
        function hitState() {
            let count = 0, strength = 0;
            for (let k = 0; k < MAX_HITS; k++) {
                const offset = k * 4;
                const age = clock - hits[offset + 2];
                if (hits[offset + 3] <= 0 || age < 0 || age >= HIT_SECONDS) continue;
                count++;
                strength = Math.max(strength, (1 - age / HIT_SECONDS) ** 2);
            }
            return {hitCount: count, impactStrength: strength};
        }

        function showNotice(message) {
            error = message;
            if (!notice) {
                notice = document.createElement('p');
                notice.className = 'terminal-render-notice';
                notice.setAttribute('role', 'status');
                container.appendChild(notice);
            }
            notice.textContent = message;
        }
        function cancel() {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            last = lastPaint = 0;
        }
        function release() {
            if (!gl || !resources) return;
            for (const program of [resources.volume, resources.composite]) {
                if (program?.program) gl.deleteProgram(program.program);
            }
            if (resources.texture) gl.deleteTexture(resources.texture);
            if (resources.noise) gl.deleteTexture(resources.noise);
            if (resources.framebuffer) gl.deleteFramebuffer(resources.framebuffer);
            if (resources.vao) gl.deleteVertexArray(resources.vao);
            resources = null;
        }
        function fail(message) {
            context = 'error';
            cancelExit();
            cube?.stop();
            cancel();
            release();
            showNotice(message);
            notifyUpdate();
        }
        function compile(type, text) {
            const shader = gl.createShader(type);
            if (!shader) throw new Error('Shader allocation failed');
            gl.shaderSource(shader, text);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(log || 'Shader compilation failed');
            }
            return shader;
        }
        function link(fragment) {
            let vertex = null, pixel = null, program = null;
            try {
                vertex = compile(gl.VERTEX_SHADER, VERTEX);
                pixel = compile(gl.FRAGMENT_SHADER, fragment);
                program = gl.createProgram();
                if (!program) throw new Error('Program allocation failed');
                gl.attachShader(program, vertex);
                gl.attachShader(program, pixel);
                gl.linkProgram(program);
                if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
                const uniforms = {};
                const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
                for (let i = 0; i < count; i++) {
                    const info = gl.getActiveUniform(program, i);
                    if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
                }
                return {program, uniforms};
            } catch (problem) {
                if (program) gl.deleteProgram(program);
                throw problem;
            } finally {
                if (vertex) gl.deleteShader(vertex);
                if (pixel) gl.deleteShader(pixel);
            }
        }
        function targetSize() {
            const {texture, framebuffer} = resources;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, floatTarget ? gl.RGBA16F : gl.RGBA8,
                view.volumeWidth, view.volumeHeight, 0, gl.RGBA, floatTarget ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                if (floatTarget) {
                    floatTarget = false;
                    targetSize();
                    return;
                }
                throw new Error('Volume framebuffer unavailable');
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        function initialize() {
            try {
                release();
                resources = {};
                resources.volume = link(VOLUME);
                resources.composite = link(COMPOSITE);
                resources.vao = gl.createVertexArray();
                resources.texture = gl.createTexture();
                resources.framebuffer = gl.createFramebuffer();
                resources.noise = gl.createTexture();
                if (!resources.vao || !resources.texture || !resources.framebuffer || !resources.noise) throw new Error('GPU resource allocation failed');
                floatTarget = Boolean(gl.getExtension('EXT_color_buffer_float'));
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, resources.noise);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 256, 0, gl.RED, gl.UNSIGNED_BYTE, makeNoise(settings.noiseContrast));
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.disable(gl.DEPTH_TEST);
                gl.disable(gl.BLEND);
                context = 'ready';
                error = '';
                notice?.remove();
                notice = null;
                resize(true);
                return true;
            } catch (problem) {
                fail('当前设备暂无法显示动态图像，可继续进入黑洞页。');
                return false;
            }
        }
        function resize(force = false) {
            if (disposed || contextLost) return;
            const rect = container.getBoundingClientRect();
            // CRT startup scales the shell visually. Its layout dimensions stay
            // stable, whereas the transformed rect can be only a few pixels high.
            const width = Math.max(1, container.clientWidth || rect.width || 1);
            const height = Math.max(1, container.clientHeight || rect.height || 1);
            const ratio = Math.min(settings.dpr, Math.sqrt(settings.maxOutputPixels / (width * height)));
            const outputWidth = Math.max(1, Math.floor(width * ratio));
            const outputHeight = Math.max(1, Math.floor(height * ratio));
            const volumeScale = Math.min(settings.quality, Math.sqrt(settings.maxVolumePixels / (width * height)));
            const volumeWidth = Math.max(1, Math.floor(width * volumeScale));
            const volumeHeight = Math.max(1, Math.floor(height * volumeScale));
            const changed = force || canvas.width !== outputWidth || canvas.height !== outputHeight ||
                view.volumeWidth !== volumeWidth || view.volumeHeight !== volumeHeight;
            Object.assign(view, {width, height, ratio, volumeWidth, volumeHeight});
            if (changed) {
                canvas.width = outputWidth;
                canvas.height = outputHeight;
                if (resources) {
                    try { targetSize(); } catch (problem) { fail('图像缓冲暂不可用，可继续进入黑洞页。'); }
                }
            }
            if (running && changed) {
                draw();
                wake();
            }
        }
        function draw() {
            if (disposed || !running || document.hidden || !visible || contextLost || context !== 'ready' || !resources) return;
            const {volume, composite, vao, texture, framebuffer, noise} = resources;
            const reduced = Boolean(media?.matches);
            const presence = reduced ? 1 : intro;
            gl.bindVertexArray(vao);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, view.volumeWidth, view.volumeHeight);
            gl.useProgram(volume.program);
            const u = volume.uniforms;
            gl.uniform2f(u.uView, view.width, view.height);
            gl.uniform2f(u.uScale, view.width / view.volumeWidth, view.height / view.volumeHeight);
            gl.uniform1f(u.uZoom, settings.scale);
            gl.uniform1f(u.uTime, time * 0.4);
            gl.uniform1f(u.uTwist, settings.twist);
            gl.uniform1f(u.uWave, settings.wave * 0.4);
            gl.uniform1f(u.uSharpness, 100 - settings.softness * 90);
            gl.uniform1f(u.uRibbonCount, settings.ribbonCount);
            gl.uniform1f(u.uDetail, settings.detail);
            gl.uniform2f(u.uOrbit, motion.yaw, motion.pitch);
            gl.uniform1f(u.uDither, floatTarget ? 0 : 1 / 255);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(composite.program);
            const c = composite.uniforms;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, noise);
            gl.uniform1i(c.uVolume, 0);
            gl.uniform1i(c.uNoise, 1);
            gl.uniform2f(c.uResolution, canvas.width, canvas.height);
            gl.uniform2fv(c.uNoiseShift, noiseShift);
            gl.uniform1f(c.uRatio, view.ratio);
            gl.uniform1f(c.uTime, time * 0.3);
            gl.uniform1f(c.uPresence, presence);
            gl.uniform1f(c.uCurvature, settings.curvature);
            gl.uniform1f(c.uScanline, settings.scanline);
            gl.uniform1f(c.uGlitch, settings.glitch);
            gl.uniform1f(c.uFlicker, settings.flicker);
            gl.uniform1f(c.uVignette, settings.vignette);
            gl.uniform1f(c.uLevels, settings.levels);
            gl.uniform1f(c.uCell, settings.cell);
            gl.uniform1f(c.uGrain, settings.grain);
            gl.uniform1f(c.uGain, settings.gain);
            gl.uniform1f(c.uShine, settings.shine);
            gl.uniform1f(c.uReduced, reduced ? 1 : 0);
            gl.uniform1f(c.uScreenZoom, settings.screenZoom);
            gl.uniform1f(c.uFieldScale, settings.fieldScale);
            gl.uniform1f(c.uExitStrength, exitStrength);
            gl.uniform1f(c.uExitFade, exitFade);
            if (cube) {
                gl.uniformMatrix3fv(c.uCubeInverse, false, cube.inverse);
                gl.uniform4fv(c.uCubePose, cube.pose);
                gl.uniform4fv(c.uCubeEye, cube.eye);
            }
            gl.uniform3f(c.uHeat, motion.heatX, motion.heatY, motion.heat);
            gl.uniform4fv(c.uHits, hits);
            gl.uniform1f(c.uClock, clock);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.bindVertexArray(null);
            draws++;
            notifyUpdate();
        }
        function notifyUpdate() {
            if (onUpdate && !notifying) {
                notifying = true;
                try { onUpdate(getState()); } catch (_) { /* An optional UI consumer cannot interrupt the display clock. */ }
                finally { notifying = false; }
            }
        }
        function frame(now) {
            raf = 0;
            if (!running || disposed || document.hidden || !visible || contextLost || !resources || media?.matches) return;
            const interval = 1000 / settings.fps;
            if (lastPaint && now - lastPaint < interval - 0.8) { wake(); return; }
            const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 1 / settings.fps;
            last = now;
            lastPaint = now;
            clock += dt;
            time += dt * settings.speed;
            cube?.update(dt, {reducedMotion: false});
            advanceExit();
            for (let k = 0; k < MAX_HITS; k++) {
                const offset = k * 4;
                if (hits[offset + 3] > 0 && clock - hits[offset + 2] >= HIT_SECONDS) hits[offset + 3] = 0;
            }
            if (intro < 1) intro = Math.min(1, intro + dt / 2);
            const engaged = settings.mouseInteractive && pointer.inside;
            const goalYaw = 0;
            const goalPitch = 0;
            motion.yawVelocity += (40 * (goalYaw - motion.yaw) - 11 * motion.yawVelocity) * dt;
            motion.pitchVelocity += (40 * (goalPitch - motion.pitch) - 11 * motion.pitchVelocity) * dt;
            motion.yaw += motion.yawVelocity * dt;
            motion.pitch += motion.pitchVelocity * dt;
            motion.heat += ((engaged ? 1 : 0) - motion.heat) * (1 - Math.exp(-dt * (engaged ? 4 : 2)));
            motion.heatX += (pointer.x - motion.heatX) * (1 - Math.exp(-dt * 8));
            motion.heatY += (pointer.y - motion.heatY) * (1 - Math.exp(-dt * 8));
            const tick = Math.floor(time * 24);
            if (tick !== noiseTick) {
                noiseTick = tick;
                noiseShift[0] = shifting() * 256;
                noiseShift[1] = shifting() * 256;
            }
            draw();
            wake();
        }
        function wake() {
            if (!raf && running && !disposed && visible && !document.hidden && !contextLost && resources && !media?.matches) {
                raf = requestAnimationFrame(frame);
            }
        }
        function start(startOptions = {}) {
            if (disposed) return false;
            const replayIntro = typeof startOptions === 'boolean' ? startOptions : startOptions.intro === true;
            const wasRunning = running;
            cancelExit();
            if (replayIntro) intro = media?.matches ? 1 : 0;
            else if (startOptions === false || startOptions.intro === false || !settings.intro || media?.matches) intro = 1;
            running = true;
            if (!wasRunning || replayIntro) cube?.start({intro: replayIntro || intro < 1, reducedMotion: Boolean(media?.matches)});
            last = lastPaint = 0;
            resize();
            draw();
            wake();
            return context === 'ready';
        }
        function stop() { running = false; cancelExit(); cube?.stop(); pointer.inside = false; clearHits(); cancel(); }
        function onVisibility() {
            cancel();
            if (document.hidden) { clearHits(); cancelExit(); }
            if (!document.hidden && running) { draw(); wake(); }
        }
        function onMotionChange() {
            cancel();
            if (media?.matches) {
                cancelExit();
                if (running) cube?.start({intro: false, reducedMotion: true});
                intro = 1;
                clearHits();
                Object.assign(motion, {yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0, heat: 0});
            }
            draw();
            wake();
        }
        function onMove(event) {
            if (!running || disposed || media?.matches) return;
            const rect = container.getBoundingClientRect();
            pointer.x = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
            pointer.y = 1 - clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
            pointer.inside = true;
        }
        function onLeave() { pointer.inside = false; }
        function hit(x = 0.5, y = 0.5) {
            if (!running || disposed || !visible || document.hidden || contextLost || context !== 'ready' || media?.matches) return false;
            const offset = hitIndex * 4;
            hits[offset] = clamp(finite(x, 0.5), 0, 1);
            hits[offset + 1] = clamp(finite(y, 0.5), 0, 1);
            hits[offset + 2] = clock;
            hits[offset + 3] = 1;
            hitIndex = (hitIndex + 1) % MAX_HITS;
            wake();
            return true;
        }
        function onPointerDown(event) {
            if (event.button !== 0 || event.isPrimary === false) return;
            // Keep all existing navigation/controls independent of CRT impacts.
            if (event.target?.closest?.('button, a, input, select, textarea, [role="button"], [contenteditable], [data-no-terminal-hit]')) return;
            const rect = container.getBoundingClientRect();
            const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
            const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
            if (x >= 0 && x <= 1 && y >= 0 && y <= 1) hit(x, y);
        }
        function onPointerUp(event) {
            if (event.pointerType !== 'mouse') onLeave();
        }
        function onLost(event) {
            event.preventDefault();
            if (disposed) return;
            contextLost = true;
            context = 'lost';
            cancelExit();
            clearHits();
            cancel();
            showNotice('显示连接暂时中断，恢复后将自动继续；也可直接进入黑洞页。');
            notifyUpdate();
        }
        function onRestored() {
            if (disposed) return;
            contextLost = false;
            resources = null; // Lost objects belong to the old GPU context.
            if (initialize()) { draw(); wake(); }
        }
        canvas.addEventListener('webglcontextlost', onLost);
        canvas.addEventListener('webglcontextrestored', onRestored);
        container.addEventListener('pointermove', onMove, {passive: true});
        container.addEventListener('pointerdown', onPointerDown, {passive: true});
        container.addEventListener('pointerleave', onLeave, {passive: true});
        container.addEventListener('pointerup', onPointerUp, {passive: true});
        container.addEventListener('pointercancel', onLeave, {passive: true});
        document.addEventListener('visibilitychange', onVisibility);
        media?.addEventListener?.('change', onMotionChange);
        let resizeObserver = null;
        let intersection = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => resize());
            resizeObserver.observe(container);
        } else window.addEventListener('resize', resize);
        if (typeof IntersectionObserver !== 'undefined') {
            intersection = new IntersectionObserver(([entry]) => {
                const next = entry.isIntersecting;
                if (visible === next) return;
                visible = next;
                if (!visible) { clearHits(); cancelExit(); }
                cancel();
                if (visible && running) { resize(); draw(); wake(); }
            });
            intersection.observe(container);
        }
        try {
            gl = canvas.getContext('webgl2', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'});
            if (gl) initialize();
            else {
                context = 'unsupported';
                showNotice('当前浏览器不支持 WebGL2 动态显示，可继续进入黑洞页。');
            }
        } catch (problem) {
            context = 'unsupported';
            showNotice('当前浏览器无法启用动态图像，可继续进入黑洞页。');
        }
        function getState() {
            return {
                available: context === 'ready', running, pending: Boolean(raf), time, clock, intro,
                orientation: 'horizontal', ...hitState(), maxHits: MAX_HITS, hitSeconds: HIT_SECONDS,
                cube: cube?.getState() || null,
                screenZoom: settings.screenZoom, fieldScale: settings.fieldScale, ribbonCount: settings.ribbonCount, detail: settings.detail,
                exitProgress, transitioning: Boolean(exit), transitionPeak, transitionStrength: exitStrength,
                context, disposed, error, draws, visible, reducedMotion: Boolean(media?.matches),
                width: canvas.width, height: canvas.height,
                volumeWidth: view.volumeWidth, volumeHeight: view.volumeHeight,
                volumePixels: view.volumeWidth * view.volumeHeight, outputPixels: canvas.width * canvas.height,
                floatTarget, maxVolumePixels: settings.maxVolumePixels, settings
            };
        }
        function destroy() {
            if (disposed) return;
            stop();
            cube?.destroy();
            disposed = true;
            context = 'disposed';
            resizeObserver?.disconnect();
            intersection?.disconnect();
            if (!resizeObserver) window.removeEventListener('resize', resize);
            container.removeEventListener('pointermove', onMove);
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointerleave', onLeave);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onLeave);
            document.removeEventListener('visibilitychange', onVisibility);
            media?.removeEventListener?.('change', onMotionChange);
            canvas.removeEventListener('webglcontextlost', onLost);
            canvas.removeEventListener('webglcontextrestored', onRestored);
            release();
            if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
            canvas.remove();
            notice?.remove();
            if (owners.get(container) === api) owners.delete(container);
        }
        const api = Object.freeze({canvas, start, stop, hit, set, transitionOut, cancelExit, destroy, getState, get metrics() { return getState(); }});
        owners.set(container, api);
        if (options.autostart !== false) start();
        return api;
    }
    window.NewHorizonTerminalDisplay = Object.freeze({create});
})();
