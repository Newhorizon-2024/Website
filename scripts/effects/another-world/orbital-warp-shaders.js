/* Independently authored from the public demo's visible output; no original
 * component source or assets used. Moving extended sources -> radial optical
 * lens -> opaque shadow. Stylized optics, not relativistic ray tracing.
 */
(() => {
    'use strict';
    const vertex = `attribute vec2 aPosition;
    void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
    const fragment = `precision highp float;
    uniform vec2 uResolution;
    uniform vec4 uOrbs[30];
    uniform vec4 uFlash;
    uniform int uCount;
    uniform float uTime, uZoom, uWarp, uSplits, uExposure, uRing, uBloom;
    uniform float uContrast, uGrain, uReveal, uSeed, uGlow, uDistanceFade, uOrbitScale;
    uniform int uTestMode;
    uniform float uEffectTime, uEffectStrength, uEffectScale;
    const float CORE = 0.45;
    const float APERTURE = 0.55;

    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        vec4 a = sin(vec4(dot(i, vec2(127.1, 311.7)),
            dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7)),
            dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7)),
            dot(i + vec2(1.0), vec2(127.1, 311.7)))) * 43758.5453;
        a = fract(a);
        return mix(mix(a.x, a.y, f.x), mix(a.z, a.w, f.x), f.y);
    }
    // V9 optical experiments. These are mutually selectable visual hypotheses,
    // not claims about the reference's implementation or physical gravity.
    // Evaluate outside sourceLight: cost does not grow with emitter count.
    vec2 turbulentFlow(vec2 p) {
        vec2 q = p * vec2(4.5, 10.0) * uEffectScale
            + vec2(-uEffectTime * 0.28, uEffectTime * 0.13) + vec2(uSeed, uSeed * 0.7);
        vec2 broad = vec2(noise(q), noise(q + vec2(19.1, 7.7))) * 2.0 - 1.0;
        vec2 fine = vec2(noise(q * 2.03 + broad * 0.4),
            noise(q * 2.03 + vec2(11.9, 25.3))) * 2.0 - 1.0;
        return (broad * 0.72 + fine * 0.28) * vec2(0.028, 0.060) / sqrt(uEffectScale);
    }
    vec2 waterRefraction(vec2 p) {
        vec2 n1 = vec2(0.894427, 0.447214);
        vec2 n2 = vec2(-0.351123, 0.936329);
        vec2 n3 = vec2(0.768221, -0.640184);
        float k = 9.0 * uEffectScale;
        float a = dot(p, n1) * k - uEffectTime * 0.78 + uSeed;
        float b = dot(p, n2) * k * 1.37 + uEffectTime * 0.61;
        float c = dot(p, n3) * k * 0.73 - uEffectTime * 0.49;
        return (n1 * cos(a) * 0.52 + n2 * cos(b) * 0.31 + n3 * cos(c) * 0.17)
            * 0.038 / sqrt(uEffectScale);
    }
    // Original V9 radial experiment retained exactly for direct comparison.
    vec2 legacyRadialRipples(vec2 p) {
        float r = max(length(p), 0.001), a = atan(p.y, p.x);
        float k = 24.0 * uEffectScale;
        // Constant phase transport: no expanding/contracting pulse envelope.
        float phase = (r - CORE) * k - uEffectTime * 1.8
            + sin(a * 3.0 + 0.23) * 0.24 + sin(a * 5.0 - 0.71) * 0.12;
        // Bound amplitude * wavenumber even at maximum strength/detail.
        float amplitude = min(0.028, 0.68 / (k * max(0.001, uEffectStrength)));
        if (uEffectStrength > 3.0) {
            // Above the original range, intentionally permit optical folding.
            // Raising only the uniform would cancel against its denominator.
            float overdrive = 1.0 + smoothstep(3.0, 30.0, uEffectStrength) * 6.48;
            amplitude = min(0.028, 0.68 * overdrive
                / (k * max(0.001, uEffectStrength)));
        }
        return p / r * sin(phase) * amplitude;
    }
    vec2 radialRipples(vec2 p) {
        float r = max(length(p), 0.001), a = atan(p.y, p.x);
        vec2 normal = p / r, tangent = vec2(-normal.y, normal.x);
        float k = 24.0 * uEffectScale;
        // Every feature shares one outward travelling coordinate. No separate
        // temporal amplitude gate, growing shell, or cyclic aperture scaling.
        float travel = (r - CORE) - uEffectTime * 0.075;
        vec2 q = normal * (1.65 + 0.18 * sin(travel * 0.5))
            + vec2(travel * 0.55, uSeed * 0.37);
        float swell = noise(q);
        float fine = noise(q * 1.91 + vec2(11.3, 7.9));
        // Periodic angular harmonics and closed direction coordinates avoid
        // an atan seam. Different wavefronts have different local curvature.
        float contour = sin(a * 3.0 + 0.3 * sin(travel * 0.7)) * 0.65
            + sin(a * 5.0 - travel * 0.3 + 0.7) * 0.28
            + (swell - 0.5) * 1.1;
        float phase0 = k * travel + contour;
        float phase1 = k * 0.63 * travel + contour * 0.73 + 1.9
            + sin(a * 7.0 + travel * 0.25) * 0.18;
        float phase2 = k * 1.67 * travel + contour * 1.11 + 3.6
            + (fine - 0.5) * 0.16;
        // Inverse-wavenumber weights keep fine detail from dominating strain.
        float radial = (sin(phase0) * 0.58 + sin(phase1) * (0.28 / 0.63)
            + sin(phase2) * (0.14 / 1.67)) / 1.1082783;
        float shear = (cos(phase0) * 0.65 + cos(phase1) * 0.35)
            * (0.4 + fine * 0.6) * 0.18;
        float localEnergy = (0.82 + swell * 0.18) * (0.96 + fine * 0.04);
        // Budget includes extra spatial variation; strength changes displacement
        // only, never the phase, source radius or shadow geometry.
        float amplitude = min(0.035, 0.78 / ((k * 0.95 + 12.0)
            * max(0.001, uEffectStrength)));
        if (uEffectStrength > 3.0) {
            // Experimental high range relaxes the strain budget, not the
            // shadow geometry, phase speed or luminosity. 0..3 is unchanged.
            float overdrive = 1.0 + smoothstep(3.0, 30.0, uEffectStrength) * 6.48;
            amplitude = min(0.035, 0.78 * overdrive / ((k * 0.95 + 12.0)
                * max(0.001, uEffectStrength)));
        }
        return (normal * radial + tangent * shear) * amplitude * localEnergy;
    }
    vec2 layeredShear(vec2 p) {
        float r = max(length(p), 0.001), a = atan(p.y, p.x);
        float twist = 0.0, radial = 0.0;
        for (int layer = 0; layer < 5; layer++) {
            float i = float(layer);
            float center = CORE + 0.18 + i * 0.37 / sqrt(uEffectScale);
            float width = (0.12 + i * 0.026) / sqrt(uEffectScale);
            float band = exp(-pow((r - center) / width, 2.0));
            float phase = a * (2.0 + mod(i, 3.0))
                + uEffectTime * (0.23 + i * 0.071) + i * 2.13 + uSeed;
            twist += sin(phase) * band * (0.022 - i * 0.0015);
            radial += cos(phase * 1.0 + 0.7) * band * 0.0035;
        }
        // Fixed-radius layers slide tangentially; unlike mode 3 no wavefront
        // is transported outward. No new luminous rings are composited.
        return vec2(-p.y, p.x) * twist + p / r * radial;
    }
    vec2 disturbLight(vec2 p) {
        if (uTestMode == 0 || uEffectStrength <= 0.0) return p;
        float r = length(p);
        float envelope = smoothstep(CORE + 0.015, CORE + 0.11, r)
            * (1.0 - smoothstep(1.7, 3.3, r));
        if (uTestMode == 3) {
            // Wider inner ramp reduces the near-horizon envelope gradient.
            envelope = smoothstep(CORE + 0.015, CORE + 0.19, r)
                * (1.0 - smoothstep(1.7, 3.3, r));
        }
        vec2 delta = vec2(0.0);
        if (uTestMode == 1) delta = turbulentFlow(p);
        else if (uTestMode == 2) delta = waterRefraction(p);
        else if (uTestMode == 3) delta = radialRipples(p);
        else if (uTestMode == 4) delta = layeredShear(p);
        else if (uTestMode == 5) delta = turbulentFlow(p) * 0.65
            + waterRefraction(p) * 0.30 + legacyRadialRipples(p) * 0.35;
        else if (uTestMode == 6) delta = legacyRadialRipples(p);
        delta *= uEffectStrength * envelope;
        float displacementCap = 0.10;
        if (uEffectStrength > 3.0) {
            // One bounded optical sample, not extra passes or extra rings.
            // High settings can produce folds/caustics by design; the cap
            // limits sampling displacement, not every possible visual artefact.
            displacementCap = mix(0.10, 0.60,
                smoothstep(3.0, 30.0, uEffectStrength));
        }
        delta *= min(1.0, displacementCap / max(length(delta), 0.00001));
        if (uEffectStrength > 3.0 && dot(p + delta, p + delta) < 0.0000000001) {
            // Avoid atan(0, 0) in the downstream lens at a folded field origin.
            return r > 0.001 ? p / r * 0.00001 : vec2(0.00001, 0.0);
        }
        return p + delta;
    }
    // Independently derived radial deflection, keeping the two image branches.
    // A circular critical curve stretches compact emitters tangentially, rather
    // than keeping them round except at the ends of a horizontal branch cut.
    // There is no horizontal half-plane mask or artificially blank outer ring.
    vec2 lens(vec2 p) {
        float r = max(length(p), CORE * 0.9), a = atan(p.y, p.x);
        float n = uSplits, aperture = APERTURE * uOrbitScale;
        vec2 mapped = p - pow(aperture, n) * pow(r, 1.0 - n)
            * vec2(cos((n - 1.0) * a), sin((n - 1.0) * a)) * uWarp;
        // A slowly turning, localized shear separates the caustic branches.
        // Without it the entire critical circle samples one identical source
        // point, yielding a rigid Einstein ring instead of asymmetric wisps.
        float orientation = uTime * 0.19 + uSeed * 0.23;
        vec2 shear = vec2(cos(orientation) * p.x + sin(orientation) * p.y,
            sin(orientation) * p.x - cos(orientation) * p.y);
        return mapped + shear * 0.34 * exp(-max(0.0, r - APERTURE) * 1.4) * uWarp;
    }
    vec2 sampleField(vec2 p) { return lens(disturbLight(p)); }
    // Overlapping extended emitters, not a pre-drawn Gaussian arch.
    // Compress source X only, preserving broad distant wings.
    vec2 sourceLight(vec2 p) {
        vec2 q = p;
        // Slow, unbounded source coordinate: avoid sampling the same small
        // saturated source interval across the entire width of the viewport.
        q.x = sign(p.x) * log(abs(p.x) * 0.7 + sqrt(1.0 + p.x * p.x * 0.49)) / 0.9;
        q.y *= 0.74 + 0.26 / (1.0 + 0.3 * p.x * p.x);
        float clouds = 0.0, diffuse = 0.0;
        for (int i = 0; i < 30; i++) {
            if (i >= uCount) break;
            vec4 orb = uOrbs[i];
            float farField = smoothstep(0.35, 1.3, abs(p.x));
            float flatten = 1.0 / (1.0 + 0.22 * pow(abs(p.x), 4.0));
            vec2 d = q - vec2(orb.x, orb.y * flatten);
            float baseWidth = 0.13 + 0.02 * sin(float(i) * 1.71 + uSeed);
            float width = baseWidth * (1.0 + farField * 1.3);
            float pulse = pow(max(0.0, sin(uTime * 0.45 + float(i) * 2.39996323 + uSeed)), 10.0);
            // Only a few nearby plumes dominate at a time. Distant tails still
            // overlap into broad wings, without bleaching every caustic detail.
            float sourceGain = mix(0.16 + 2.6 * pulse, 1.0, farField * 0.85);
            float ellipsoid = d.x * d.x / 0.075 + d.y * d.y / (width * width);
            // Z carries continuous source velocity. Tails contract at orbital
            // turning points instead of abruptly flipping their direction.
            float behind = d.x + orb.z * 0.38;
            float farther = d.x + orb.z * 0.85;
            float tail = exp(-behind * behind / 0.18 - d.y * d.y / (width * width * 1.35));
            float end = exp(-farther * farther / 0.55 - d.y * d.y / (width * width * 1.8));
            clouds += (exp(-ellipsoid) + tail * 0.48 + end * 0.35) * orb.w * sourceGain;
            diffuse += exp(-ellipsoid * 0.25) * orb.w;
        }
        float norm = 4.0 / max(4.0, float(uCount));
        // Keep the critical circle from sampling a permanently bright origin.
        // This soft low-energy source region is not a screen-space ring mask.
        float quietOrigin = 1.0 - 0.12 * exp(-dot(q, q) / 0.009);
        return vec2(clouds * norm * quietOrigin, diffuse * norm);
    }
    // A brief, extended filament patch re-illuminates existing material. There
    // are no compact orbiting cores and no independent screen-space bolt/point.
    // Its seed and position stay fixed for a stroke; only its envelope changes.
    float flashLight(vec2 field, float density) {
        if (uFlash.w <= 0.0 || uGlow <= 0.0) return 0.0;
        vec2 local = field - uFlash.xy;
        float along = 1.0 - smoothstep(0.45, 1.0, abs(local.x) / uFlash.z);
        float across = exp(-pow(local.y / 0.17, 2.0) * 1.4);
        float fold = noise(vec2(local.x * 10.0 + uSeed, local.y * 24.0 + uSeed * 0.31));
        float filaments = smoothstep(0.38, 0.78, fold);
        float material = smoothstep(0.025, 0.22, density);
        return along * across * (0.16 + 0.84 * filaments) * material
            * uFlash.w * uGlow * 10.0;
    }
    void main() {
        float frame = min(uResolution.y, uResolution.x * 0.75);
        vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / frame * 2.0 * (uZoom / 1.8);
        float r = length(p), aa = 2.0 * (uZoom / 1.8) / frame;
        if (r < CORE - aa * 1.5) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        vec2 field = sampleField(p);
        vec2 smokeUV = vec2(field.x * 2.3 - uTime * 0.15, field.y * 4.0 + uSeed);
        float smoke = noise(smokeUV);
        float fine = noise(smokeUV * 2.1 + vec2(7.3, 11.7));
        // Only source density moves: no water waves or breathing aperture.
        field.y += (smoke - 0.5) * 0.014;
        vec2 light = sourceLight(field);
        float density = light.x * (0.9 + 0.1 * mix(smoke, fine, 0.32));
        float gather = mix(1.0, 0.82 + 0.18 * smoothstep(0.6, 1.8, r), uDistanceFade);
        // Demagnify the weak inner image continuously, instead of letting it
        // form a broad glowing crescent directly on the shadow's silhouette.
        float imageWeight = mix(0.008, 1.0, smoothstep(CORE, APERTURE + 0.03, r));
        float wings = 1.0 + 0.50 * smoothstep(0.7, 2.0, abs(field.x));
        float energy = pow(max(density * 1.35 * wings, 0.0), uContrast) * gather * imageWeight;
        energy += flashLight(field, light.x) * imageWeight;
        float haze = pow(max(light.y * 0.22, 0.0), 2.4) * uBloom * 0.14;
        vec3 color = mix(vec3(0.80, 0.83, 0.89), vec3(1.0),
            smoothstep(0.05, 1.7, energy)) * (energy + haze);
        // Local reflection from this same field, only in the narrow rim annulus.
        if (abs(r - CORE) < aa * 5.0 + 0.012) {
            vec2 direction = p / max(r, 0.001);
            vec2 nearby = sourceLight(sampleField(direction * 0.66));
            float reflection = min(1.5, pow(max(nearby.x, 0.0), 3.0));
            float rimWidth = max(0.0016, aa * 0.55);
            float rim = exp(-pow((r - CORE) / rimWidth, 2.0));
            float shoulder = exp(-pow((r - CORE) / (rimWidth * 2.6), 2.0));
            color += vec3(0.92, 0.95, 1.0) * rim * (0.022 + reflection * 0.18) * uRing;
            color += vec3(0.72, 0.79, 0.91) * shoulder * reflection * 0.016 * uRing * uBloom;
        }
        color = vec3(1.0) - exp(-color * uExposure * 1.35);
        float outside = smoothstep(CORE - aa * 0.5, CORE + aa * 0.5, r);
        float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        color = (color + grain * uGrain * 0.015) * outside;
        gl_FragColor = vec4(clamp(color * uReveal, 0.0, 1.0), 1.0);
    }`;
    window.NewHorizonOrbitalWarpShaders = Object.freeze({vertex, fragment});
})();
