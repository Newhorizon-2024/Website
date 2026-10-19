/* MorphSlider 的原生 WebGL 适配。只在切图/拖动时绘制，静止时交还原始 img。 */
const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;
const FRAGMENT = `
precision highp float;
uniform sampler2D tCurrent, tNext;
uniform vec2 uResolution, uCurrentSize, uNextSize, uPointer;
uniform float uProgress, uDir, uTime;
uniform int uMode;
varying vec2 vUv;
const float PI = 3.14159265359;
float hash11(float p) { p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p) { vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),u.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),u.x),u.y);
}
float fbm(vec2 p) { float v=0., a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.;a*=.5;}return v; }
mat2 rot(float a) { float s=sin(a), c=cos(a);return mat2(c,-s,s,c); }
// 与 img 的 object-fit: contain 一致，避免横图/竖图在大屏中被裁切。
vec2 containUV(vec2 uv, vec2 img) {
    float r=uResolution.x/max(uResolution.y,1.);
    float a=img.x/max(img.y,1.);
    vec2 s=r>a?vec2(r/a,1.):vec2(1.,a/r);
    return (uv-.5)*s+.5;
}
vec4 sampleCurrent(vec2 uv) {
    vec2 q=containUV(uv,uCurrentSize);
    float mask=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
    vec4 c=texture2D(tCurrent,clamp(q,0.,1.));return vec4(c.rgb*c.a,c.a)*mask;
}
vec4 sampleNext(vec2 uv) {
    vec2 q=containUV(uv,uNextSize);
    float mask=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
    vec4 c=texture2D(tNext,clamp(q,0.,1.));return vec4(c.rgb*c.a,c.a)*mask;
}
void main() {
    float p=clamp(uProgress,0.,1.), env=sin(p*PI);
    vec2 uv=vUv;
    // 漂移只作用于转场，中止/结束时完全回归原始图片。
    uv+=vec2(sin(uTime*.25+uv.y*4.),cos(uTime*.22+uv.x*4.))*.0032*env;
    vec2 uvC=uv, uvN=uv;
    float m=smoothstep(0.,1.,p);
    if(uMode==3) {
        vec2 c=uv-.5;float ang=env*.55*3.5*(1.-length(c));
        uvC=rot(ang)*c+.5;uvN=rot(-ang)*c+.5;
    } else if(uMode==1) {
        float d=distance(uv,uPointer), ring=p*1.6;
        vec2 disp=normalize(uv-uPointer+1e-4)*sin((d-ring)*30.)*env*.55*.25;
        uvC=uv+disp;uvN=uv+disp*.6;
        m=1.-smoothstep(ring-.03,ring+.03,d);
    } else if(uMode==2) {
        float rnd=hash11(floor(uv.y*14.));
        vec2 disp=vec2((rnd-.5)*env*.55*.6,0.);
        uvC=uv+disp;uvN=uv+disp;
        float localX=uDir>0.?uv.x:1.-uv.x;
        float th=p*1.5-.25+(rnd-.5)*.25;
        m=1.-smoothstep(th-.06,th+.06,localX);
    } else {
        float nn=fbm(uv*2.4+uTime*.03), warp=fbm(uv*2.4*1.7-uTime*.02);
        vec2 g=vec2(nn,warp)-.5;
        uvC=uv+g*.55*.5*p;uvN=uv-g*.55*.5*(1.-p);
        m=smoothstep(nn-.15,nn+.15,p);
    }
    if(p<.0001){uvC=vUv;m=0.;}else if(p>.9999){uvN=vUv;m=1.;}
    float ca=.35*env*.03;
    vec4 c=sampleCurrent(uvC), n=sampleNext(uvN);
    c.r=sampleCurrent(uvC+vec2(ca,0.)).r;c.b=sampleCurrent(uvC-vec2(ca,0.)).b;
    n.r=sampleNext(uvN+vec2(ca,0.)).r;n.b=sampleNext(uvN-vec2(ca,0.)).b;
    vec4 col=mix(c,n,m);
    vec3 color=col.rgb;
    float gray=dot(color,vec3(.2126,.7152,.0722));
    // 转场中间采用黑白滤镜，起止逐渐还原，静止原图保留原色。
    color=mix(color,vec3(gray),smoothstep(0.,.2,env));
    // Channel separation must not leave nonzero RGB in a zero-alpha letterbox.
    color=min(color,vec3(col.a));
    // Keep contain letterboxes and transparent artwork transparent throughout the transition.
    gl_FragColor=vec4(color,col.a);
}
`;
const MODES = { melt: 0, ripple: 1, shear: 2, swirl: 3 };
const sourceKey = image => image.currentSrc || image.src;

export class MorphSliderStage {
    constructor(stage) {
        this.stage = stage;
        this.frame = 0;
        this.progress = 0;
        this.resolve = null;
        this.gl = null;
        this.disabled = false;
        stage.dataset.morphState = "idle";
    }

    initialize() {
        if (this.gl) return true;
        if (this.disabled) return false;
        const canvas = document.createElement("canvas");
        canvas.className = "creator-morph-canvas";
        canvas.setAttribute("aria-hidden", "true");
        let gl = null;
        try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" }); } catch { /* 浏览器可能禁止创建额外上下文 */ }
        if (!gl) { this.disabled = true; this.stage.dataset.morphState = "fallback"; return false; }
        this.canvas = canvas;
        this.gl = gl;
        this.shaders = [];
        try {
            const compile = (type, source) => {
                const shader = gl.createShader(type);
                this.shaders.push(shader);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
                return shader;
            };
            const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision;
            this.program = gl.createProgram();
            gl.attachShader(this.program, compile(gl.VERTEX_SHADER, VERTEX));
            gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, precision ? FRAGMENT : FRAGMENT.replace("precision highp float", "precision mediump float")));
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
            gl.useProgram(this.program);
            this.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
            const position = gl.getAttribLocation(this.program, "position");
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            this.uniforms = Object.fromEntries(["tCurrent","tNext","uResolution","uCurrentSize","uNextSize","uProgress","uDir","uMode","uPointer","uTime"].map(name => [name, gl.getUniformLocation(this.program, name)]));
            gl.uniform1i(this.uniforms.tCurrent, 0);
            gl.uniform1i(this.uniforms.tNext, 1);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            this.textures = [gl.createTexture(), gl.createTexture()];
            this.keys = [null, null];
            this.sizes = [[1,1],[1,1]];
            this.textures.forEach((texture, index) => {
                gl.activeTexture(gl.TEXTURE0 + index);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                for (const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
                for (const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,name,gl.LINEAR);
            });
            this.contextLost = event => { event.preventDefault(); this.cancel(); this.disabled = true; this.stage.dataset.morphState = "fallback"; };
            canvas.addEventListener("webglcontextlost", this.contextLost);
            this.stage.append(canvas);
            this.observer = new ResizeObserver(() => { this.resize(); if (this.stage.classList.contains("is-morphing")) this.render(this.progress); });
            this.observer.observe(this.stage);
            this.resize();
            return true;
        } catch (error) {
            console.warn("作品变形转场不可用，已保留普通图片预览。", error.message);
            this.destroy();
            this.disabled = true;
            this.stage.dataset.morphState = "fallback";
            return false;
        }
    }

    resize() {
        if (!this.gl) return;
        const rect = this.canvas.getBoundingClientRect();
        // 限制填充像素而不是影响图片布局，避免高 DPI 下无意义的满屏 GPU 开销。
        const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1500000 / Math.max(1, rect.width * rect.height)));
        this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
        this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    upload(image, index) {
        if (!image?.complete || !image.naturalWidth) return false;
        const key = sourceKey(image);
        if (this.keys[index] === key) return true;
        const gl = this.gl;
        let source = image;
        const limit = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), innerWidth <= 760 ? 1536 : 2048);
        if (Math.max(image.naturalWidth, image.naturalHeight) > limit) {
            const canvas = document.createElement("canvas");
            const ratio = limit / Math.max(image.naturalWidth, image.naturalHeight);
            canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
            const context = canvas.getContext("2d");
            if (!context) return false;
            context.drawImage(image,0,0,canvas.width,canvas.height);
            source = canvas;
        }
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[index]);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
        if (gl.getError() !== gl.NO_ERROR) throw new Error("图片纹理上传失败");
        this.keys[index] = key;
        this.sizes[index] = [image.naturalWidth,image.naturalHeight];
        return true;
    }

    prepare(current, next, { direction = 1, pointer = [0.5,0.5] } = {}) {
        if (!current?.naturalWidth || !next?.naturalWidth || !this.initialize() || this.disabled || this.gl.isContextLost()) return false;
        try {
            if (!this.upload(current,0) || !this.upload(next,1)) return false;
            this.cancel(false);
            const gl = this.gl, u = this.uniforms;
            gl.uniform1f(u.uDir,direction);
            gl.uniform1i(u.uMode,MODES[this.stage.dataset.morphTransition] ?? 0);
            gl.uniform2fv(u.uPointer,pointer);
            gl.uniform2fv(u.uCurrentSize,this.sizes[0]);
            gl.uniform2fv(u.uNextSize,this.sizes[1]);
            this.stage.classList.add("is-morphing");
            this.stage.dataset.morphState = "active";
            return true;
        } catch {
            // CORS、显存不足等情况不应使浏览作品的基本功能失效。
            this.destroy();
            this.disabled = true;
            this.stage.dataset.morphState = "fallback";
            return false;
        }
    }

    render(progress) {
        if (!this.gl || this.disabled) return;
        this.progress = progress;
        this.stage.dataset.morphProgress = progress.toFixed(4);
        const gl = this.gl;
        gl.uniform2f(this.uniforms.uResolution,this.canvas.width,this.canvas.height);
        gl.uniform1f(this.uniforms.uProgress,progress);
        gl.uniform1f(this.uniforms.uTime,performance.now()*0.001);
        gl.drawArrays(gl.TRIANGLES,0,3);
    }

    play({ from = 0, to = 1, duration = 1100 } = {}) {
        this.cancel(false);
        if (!this.gl || this.disabled) return Promise.resolve(false);
        this.stage.classList.add("is-morphing");
        this.stage.dataset.morphState = "active";
        this.render(from);
        return new Promise(resolve => {
            this.resolve = resolve;
            const started = performance.now();
            const tick = now => {
                this.frame = 0;
                if (document.hidden) { this.cancel(); return; }
                const t = Math.min(1,(now-started)/Math.max(1,duration));
                const ease = t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
                this.render(from+(to-from)*ease);
                if (t < 1) this.frame = requestAnimationFrame(tick);
                else { this.resolve = null; resolve(true); }
            };
            this.frame = requestAnimationFrame(tick);
        });
    }

    cancel(hide = true) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        const resolve = this.resolve;
        this.resolve = null;
        resolve?.(false);
        if (hide) {
            this.stage.classList.remove("is-morphing");
            this.stage.dataset.morphState = this.disabled ? "fallback" : "idle";
        }
    }

    destroy() {
        this.cancel();
        this.observer?.disconnect();
        const gl = this.gl;
        if (gl) {
            this.canvas.removeEventListener("webglcontextlost",this.contextLost);
            this.textures?.forEach(texture=>gl.deleteTexture(texture));
            if (this.buffer) gl.deleteBuffer(this.buffer);
            if (this.program) gl.deleteProgram(this.program);
            this.shaders?.forEach(shader=>gl.deleteShader(shader));
            gl.getExtension("WEBGL_lose_context")?.loseContext();
            this.canvas.remove();
        }
        this.gl = null;
        this.disabled = false;
        this.stage.dataset.morphState = "idle";
    }
}
