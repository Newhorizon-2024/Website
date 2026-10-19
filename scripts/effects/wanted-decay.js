/* DecayCard 的原生按需渲染层。交互、动画时钟及原图的显隐由 wanted-poster 管理。 */
export const WANTED_DECAY_BLEED = 1.24;

const MAX_TEXTURE_SIDE = 1536;
const MAX_CANVAS_PIXELS = 650000;
const VERTEX = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
    vUv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uSize;
uniform vec2 uFrame;
uniform vec2 uImageSize;
uniform float uUnit;
uniform float uScale;
uniform float uIdle;
uniform float uFrequency;
uniform int uOctaves;
uniform float uSeed;
uniform float uRadius;
uniform float uTime;
uniform float uFlow;
uniform float uChroma;
uniform float uGray;
in vec2 vUv;
out vec4 fragColor;

vec4 permute(vec4 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n = 1.0 / 7.0;
    vec3 ns = n * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float turbulence(vec2 p, float z) {
    float sum = 0.0;
    float amp = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= uOctaves) break;
        sum += abs(snoise(vec3(p, z))) * amp;
        p = p * 2.0 + 19.19;
        amp *= 0.5;
    }
    return clamp(sum * 0.45 + 0.231, 0.0, 1.0);
}

float roundedBox(vec2 p, vec2 extent, float r) {
    vec2 q = abs(p) - extent + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 sampleImage(vec2 view) {
    vec2 uv = view / uFrame;
    float card = uFrame.x / uFrame.y;
    float image = uImageSize.x / max(1.0, uImageSize.y);
    // contain，而非源示例的 cover；尺寸与原 img 一致时正好完整使用 0..1。
    vec2 scale = card > image ? vec2(card / image, 1.0) : vec2(1.0, image / card);
    uv = (uv - 0.5) * scale + 0.5;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    return texture(uImage, clamp(uv, 0.0, 1.0)) * inside;
}

void main() {
    // 图框逻辑宽 600，高度随原图实际比例变化；1.24 的出血不会放大图片本体。
    vec2 view = uFrame * 0.5 + (vUv - 0.5) * uFrame * 1.24;
    float inside = min(min(view.x, uFrame.x - view.x), min(view.y, uFrame.y - view.y));
    float rim = 1.0 - smoothstep(0.0, 160.0, inside);
    float drift = snoise(vec3(view * 0.004 + uSeed * 0.37, uTime * 0.12)) * 0.5 + 0.5;
    float idle = uIdle * mix(smoothstep(0.55, 0.95, drift) * 0.5, 0.25 + 0.75 * smoothstep(0.3, 0.8, drift), rim);
    float scale = uScale * mix(0.2, 1.0, rim) + idle * 120.0;
    vec2 offset = vec2(0.0);
    if (scale > 0.01) {
        vec2 p = view * uFrequency + vec2(uSeed * 17.31, uSeed * 9.17);
        float z = uTime * (uFlow * 0.35 + uIdle * 0.5) + uSeed * 3.1;
        float red = turbulence(p, z);
        float blue = turbulence(p + vec2(31.7, 47.3), z + 5.3);
        offset = scale * (vec2(red, blue) - 0.5);
    }
    vec2 source = view + offset;
    float edge = roundedBox(source - uFrame * 0.5, uFrame * 0.5, uRadius);
    float coverage = 1.0 - smoothstep(-0.75 / uUnit, 0.75 / uUnit, edge);
    vec4 image = sampleImage(source);
    vec3 color = image.rgb;
    if (uChroma > 0.0) {
        vec2 split = offset * uChroma * 0.08 + vec2(uChroma * min(scale, 200.0) * 0.012, 0.0);
        color.r = sampleImage(source + split).r;
        color.b = sampleImage(source - split).b;
    }
    color = mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), uGray);
    float alpha = coverage * image.a;
    // 上下文采用预乘 alpha；原 PNG 的透明区不能变成实体矩形。
    fragColor = vec4(color * alpha, alpha);
}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export class WantedDecayStage {
    constructor(canvas, { onContextLost } = {}) {
        this.canvas = canvas;
        this.onContextLost = onContextLost;
        this.gl = null;
        this.program = null;
        this.texture = null;
        this.buffer = null;
        this.vertexArray = null;
        this.ready = false;
        this.disabled = false;
        this.destroyed = false;
        this.source = null;
        this.sourceKey = "";
        this.uniforms = {};
        this.onLost = event => {
            event.preventDefault();
            if (this.destroyed) return;
            this.ready = false;
            this.disabled = true;
            this.onContextLost?.();
        };
        canvas.addEventListener("webglcontextlost", this.onLost);
    }

    initialize() {
        if (this.destroyed || this.disabled) return false;
        if (this.program) return true;
        let gl;
        try {
            gl = this.canvas.getContext("webgl2", {
                alpha: true,
                premultipliedAlpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                powerPreference: "low-power"
            });
        } catch { /* 浏览器可拒绝建立额外的 GPU 上下文。 */ }
        if (!gl) {
            this.disabled = true;
            return false;
        }
        this.gl = gl;
        const shaders = [];
        try {
            for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
                const shader = gl.createShader(type);
                if (!shader) throw new Error("shader allocation failed");
                shaders.push(shader);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    throw new Error(gl.getShaderInfoLog(shader) || "shader compilation failed");
                }
            }
            const program = gl.createProgram();
            this.program = program;
            if (!program) throw new Error("program allocation failed");
            shaders.forEach(shader => gl.attachShader(program, shader));
            gl.bindAttribLocation(program, 0, "position");
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) || "shader link failed");
            }
            this.vertexArray = gl.createVertexArray();
            this.buffer = gl.createBuffer();
            this.texture = gl.createTexture();
            if (!this.vertexArray || !this.buffer || !this.texture) throw new Error("GPU allocation failed");
            gl.bindVertexArray(this.vertexArray);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            for (const name of ["uImage", "uSize", "uFrame", "uImageSize", "uUnit", "uScale", "uIdle", "uFrequency", "uOctaves", "uSeed", "uRadius", "uTime", "uFlow", "uChroma", "uGray"]) {
                this.uniforms[name] = gl.getUniformLocation(program, name);
            }
            return true;
        } catch (error) {
            console.warn("[WantedDecay] 使用原图片：", error.message);
            this.disabled = true;
            this.releaseResources();
            return false;
        } finally {
            shaders.forEach(shader => gl.deleteShader(shader));
        }
    }

    prepare(image, { width, height } = {}) {
        this.ready = false;
        if (this.destroyed || this.disabled || !image || image.complete === false) return false;
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;
        if (!(imageWidth > 0 && imageHeight > 0 && width > 0 && height > 0) ||
            ![imageWidth, imageHeight, width, height].every(Number.isFinite) || !this.initialize()) return false;
        const gl = this.gl;
        try {
            const ratio = clamp(finite(window.devicePixelRatio, 1), 1, 1.5);
            const pixelWidth = width * WANTED_DECAY_BLEED * ratio;
            const pixelHeight = height * WANTED_DECAY_BLEED * ratio;
            const budget = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (pixelWidth * pixelHeight)), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0] / pixelWidth, gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1] / pixelHeight);
            const targetWidth = Math.max(1, Math.floor(pixelWidth * budget));
            const targetHeight = Math.max(1, Math.floor(pixelHeight * budget));
            if (this.canvas.width !== targetWidth) this.canvas.width = targetWidth;
            if (this.canvas.height !== targetHeight) this.canvas.height = targetHeight;
            this.frameWidth = 600;
            this.frameHeight = 600 * (height / width);
            this.imageWidth = imageWidth;
            this.imageHeight = imageHeight;
            const sourceKey = image.currentSrc || image.src || "";
            if (this.source !== image || this.sourceKey !== sourceKey || this.uploadWidth !== imageWidth || this.uploadHeight !== imageHeight) {
                const cap = Math.min(MAX_TEXTURE_SIDE, gl.getParameter(gl.MAX_TEXTURE_SIZE));
                const sampleRatio = Math.min(1, cap / Math.max(imageWidth, imageHeight));
                let source = image;
                let sampler = null;
                if (sampleRatio < 1) {
                    sampler = document.createElement("canvas");
                    sampler.width = Math.max(1, Math.round(imageWidth * sampleRatio));
                    sampler.height = Math.max(1, Math.round(imageHeight * sampleRatio));
                    const context = sampler.getContext("2d", { alpha: true });
                    if (!context) return false;
                    context.imageSmoothingEnabled = true;
                    context.imageSmoothingQuality = "high";
                    context.drawImage(image, 0, 0, sampler.width, sampler.height);
                    source = sampler;
                }
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                try {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
                } finally {
                    if (sampler) { sampler.width = 1; sampler.height = 1; }
                }
                if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) return false;
                this.source = image;
                this.sourceKey = sourceKey;
                this.uploadWidth = imageWidth;
                this.uploadHeight = imageHeight;
            }
            this.ready = true;
            return true;
        } catch { return false; }
    }

    draw({ level = 0, time = 0 } = {}) {
        if (!this.ready || this.destroyed || this.disabled || !this.program || this.gl.isContextLost()) return false;
        const gl = this.gl;
        const uniforms = this.uniforms;
        try {
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(this.program);
            gl.bindVertexArray(this.vertexArray);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(uniforms.uImage, 0);
            gl.uniform2f(uniforms.uSize, this.canvas.width, this.canvas.height);
            gl.uniform2f(uniforms.uFrame, this.frameWidth, this.frameHeight);
            gl.uniform2f(uniforms.uImageSize, this.imageWidth, this.imageHeight);
            gl.uniform1f(uniforms.uUnit, Math.min(this.canvas.width / (this.frameWidth * WANTED_DECAY_BLEED), this.canvas.height / (this.frameHeight * WANTED_DECAY_BLEED)));
            gl.uniform1f(uniforms.uScale, clamp(finite(level), 0, 1) * 0.5 * 440);
            gl.uniform1f(uniforms.uIdle, 0.35);
            gl.uniform1f(uniforms.uFrequency, 0.003 + 0.25 * 0.047);
            gl.uniform1i(uniforms.uOctaves, 5);
            gl.uniform1f(uniforms.uSeed, 4);
            gl.uniform1f(uniforms.uRadius, 0);
            gl.uniform1f(uniforms.uTime, finite(time));
            gl.uniform1f(uniforms.uFlow, 0);
            gl.uniform1f(uniforms.uChroma, 0);
            gl.uniform1f(uniforms.uGray, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            return true;
        } catch { this.ready = false; return false; }
    }

    releaseResources() {
        const gl = this.gl;
        if (!gl) return;
        gl.useProgram(null);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteTexture(this.texture);
        gl.deleteBuffer(this.buffer);
        gl.deleteVertexArray(this.vertexArray);
        gl.deleteProgram(this.program);
        this.texture = null;
        this.buffer = null;
        this.vertexArray = null;
        this.program = null;
        this.source = null;
        this.sourceKey = "";
        this.ready = false;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.canvas.removeEventListener("webglcontextlost", this.onLost);
        this.onContextLost = null;
        const gl = this.gl;
        this.releaseResources();
        try {
            if (gl && !gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch { /* 已失效或受限的 GPU 上下文无需再次释放。 */ }
        this.gl = null;
        this.uniforms = {};
    }
}
