import { vertex, fragment } from "./shadowflame-shaders.js?v=26.10.19.1";
import { createAnimationLoop } from "./animation-loop.js?v=26.10.18.12";

/* 保留 Shadowflame 噪声和火星运动；高度与火星起点匹配当前两侧抬高的设计。 */
const CONFIG = Object.freeze({
    coreColor: "#ffffff", flameColor: "#d4d4d4", backgroundColor: "#000000",
    speed: 0.6, warp: 1, detail: 4, shimmer: 0.5, height: 0.82, grain: 0.05,
    flameWidth: 1.6, sparkCount: 60, sparkSize: 1.2, sparkSpeed: 1
});
const TIME_WRAP = 300.0;
const SPARK_ORIGIN = 0.28;
const SPARK_ORIGIN_JITTER = 0.14;
const SPRITE_PX = 32;
const TARGET_FILE = "stained, brutal calamity - dm dokuro.mp3";

const hexToRgb = hex => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [1, 1, 1];
    return [parseInt(result[1],16)/255, parseInt(result[2],16)/255, parseInt(result[3],16)/255];
};

function buildSparkSprite(coreHex) {
    const c = document.createElement("canvas");
    c.width = SPRITE_PX; c.height = SPRITE_PX;
    const g = c.getContext("2d");
    if (!g) return c;
    const mid = SPRITE_PX / 2;
    const [cr,cg,cb] = hexToRgb(coreHex);
    const to255 = v => Math.round(v * 255);
    const lift = v => Math.round((v + (1-v)*0.6)*255);
    const core = `${to255(cr)},${to255(cg)},${to255(cb)}`;
    const grad = g.createRadialGradient(mid,mid,0,mid,mid,mid);
    grad.addColorStop(0,`rgb(${lift(cr)},${lift(cg)},${lift(cb)})`);
    grad.addColorStop(0.22,`rgba(${core},1)`);
    grad.addColorStop(0.5,`rgba(${core},0.55)`);
    grad.addColorStop(1,`rgba(${core},0)`);
    g.fillStyle = grad;
    g.fillRect(0,0,SPRITE_PX,SPRITE_PX);
    return c;
}

function createShadowflame(container, reducedMotion) {
    const live = { ...CONFIG, paused: false, reducedMotion };
    const canvas = document.createElement("canvas");
    canvas.className = "shadowflame-canvas";
    canvas.setAttribute("aria-hidden","true");
    let gl = null;
    try { gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" }); } catch { /* 下方使用静态兜底 */ }
    if (!gl) { container.classList.add("is-fallback"); return { setState() {}, suspend() {}, destroy() {} }; }
    const shaders = [];
    let program = null, buffer = null;
    const disposeGL = () => {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        shaders.forEach(shader => gl.deleteShader(shader));
        canvas.remove();
    };
    try {
        const compile = (type, source) => {
            const shader = gl.createShader(type);
            shaders.push(shader);
            gl.shaderSource(shader,source); gl.compileShader(shader);
            if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
            return shader;
        };
        program = gl.createProgram();
        gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
        gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program,"position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    } catch (error) {
        console.warn("Shadowflame 不可用，已使用静态背景。",error.message);
        disposeGL(); gl.getExtension("WEBGL_lose_context")?.loseContext();
        container.classList.add("is-fallback");
        return { setState() {}, suspend() {}, destroy() {} };
    }
    container.append(canvas);
    const u = Object.fromEntries(["iResolution","iTime","uSpeed","uWarp","uDetail","uShimmer","uHeight","uWidth","uGrain","uCoreColor","uFlameColor","uBgColor"].map(name => [name,gl.getUniformLocation(program,name)]));
    const sparkCanvas = document.createElement("canvas");
    sparkCanvas.className = "shadowflame-sparks";
    sparkCanvas.setAttribute("aria-hidden","true");
    container.append(sparkCanvas);
    const sctx = sparkCanvas.getContext("2d");
    const sparkDpr = Math.min(devicePixelRatio || 1,2);
    let sparkW = 0, sparkH = 0, sparks = [], sprite = null, spriteKey = "";

    // 起点随横向位置略抬高，寿命、运动与亮度公式继续沿用原设计。
    const makeSpark = fresh => {
        const L = live;
        const halfW = sparkW * 0.3 * L.flameWidth;
        const rx = Math.random() + Math.random() - 1;
        const sparkX = sparkW/2 + rx*halfW;
        const side = Math.min(1,Math.abs((sparkX-sparkW/2)/Math.max(1,sparkW/2)));
        const originVy = SPARK_ORIGIN + side*0.14 + (Math.random()*2-1)*SPARK_ORIGIN_JITTER;
        const s = {
            x: sparkX, y: sparkH*(1-originVy), vy: 0.5+Math.random()*1.2,
            sway: Math.random()*Math.PI*2,
            size: L.sparkSize*(0.35+Math.random()*Math.random()*1.9),
            life: fresh ? 0 : Math.random(), maxLife: 70+Math.random()*110, seed: Math.random()*Math.PI*2
        };
        if (!fresh) s.y -= Math.random()*sparkH*0.35;
        return s;
    };
    const syncSparkCount = () => {
        const target = Math.max(0,Math.round(live.sparkCount));
        if (sparks.length > target) sparks.length = target;
        else while (sparks.length < target) sparks.push(makeSpark(false));
    };
    const stepAndDrawSparks = (dt,m) => {
        if (!sctx) return;
        sctx.clearRect(0,0,sparkW,sparkH);
        syncSparkCount();
        if (sparks.length === 0) return;
        const L = live;
        const rise = L.sparkSpeed*m;
        const key = L.coreColor;
        if (key !== spriteKey) { sprite = buildSparkSprite(key); spriteKey = key; }
        if (!sprite) return;
        const fscale = Math.min(3,dt*60);
        sctx.globalCompositeOperation = "lighter";
        for (let i=0;i<sparks.length;i++) {
            const s = sparks[i];
            s.y -= s.vy*rise*1.4*fscale;
            s.x += Math.sin(s.sway+s.y*0.03)*0.6*rise*fscale;
            s.life += (1/s.maxLife)*(0.4+m)*fscale;
            if (s.y < -6 || s.life >= 1) { sparks[i] = makeSpark(true); continue; }
            const fadeIn = Math.min(1,s.life*9);
            const fadeOut = Math.max(0,1-Math.max(0,s.life-0.4)/0.6);
            const flick = 0.55+0.45*Math.sin(s.seed+s.y*0.2);
            const a = fadeIn*fadeOut*flick*(0.45+0.55*m);
            if (a <= 0.01) continue;
            const rad = (s.size*(1-s.life*0.35)+0.5)*1.9;
            sctx.globalAlpha = Math.min(1,a);
            sctx.drawImage(sprite,s.x-rad,s.y-rad,rad*2,rad*2);
        }
        sctx.globalAlpha = 1;
    };

    let simTime = 0;
    let contextLost = false;
    let motion = live.paused || live.reducedMotion ? 0 : 1;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const syncUniforms = () => {
        gl.useProgram(program);
        gl.uniform1f(u.iTime,simTime);
        for (const [name,value] of [["uSpeed",live.speed],["uWarp",live.warp],["uDetail",live.detail],["uShimmer",live.shimmer],["uHeight",live.height],["uWidth",live.flameWidth],["uGrain",live.grain]]) gl.uniform1f(u[name],value);
        gl.uniform3fv(u.uCoreColor,hexToRgb(live.coreColor));
        gl.uniform3fv(u.uFlameColor,hexToRgb(live.flameColor));
        gl.uniform3fv(u.uBgColor,hexToRgb(live.backgroundColor));
    };
    const renderStill = () => { syncUniforms(); gl.drawArrays(gl.TRIANGLES,0,3); stepAndDrawSparks(0,motion); };
    const loop = createAnimationLoop({
        target: container,
        // 只控制绘制分辨率/帧率，不更改着色器或运动公式。
        fps: 30, dpr: rect => Math.min(1.25,Math.sqrt(1000000/Math.max(1,rect.width*rect.height))),
        gl: () => gl,
        onResize: ({width,height,dpr}) => {
            const w = Math.max(1,Math.floor(width)), h = Math.max(1,Math.floor(height));
            canvas.width = Math.max(1,Math.round(w*dpr)); canvas.height = Math.max(1,Math.round(h*dpr));
            gl.viewport(0,0,canvas.width,canvas.height);
            gl.uniform2f(u.iResolution,gl.drawingBufferWidth,gl.drawingBufferHeight);
            if (sctx) {
                sparkCanvas.width = Math.floor(w*sparkDpr); sparkCanvas.height = Math.floor(h*sparkDpr);
                sparkW = w; sparkH = h;
                sctx.setTransform(sparkDpr,0,0,sparkDpr,0,0);
            }
            renderStill();
        },
        onFrame: ({dt}) => {
            const L = live;
            const wantMotion = !isVisible || !isPageVisible || L.paused || L.reducedMotion ? 0 : 1;
            motion += (wantMotion-motion)*Math.min(1,dt*4);
            if (wantMotion === 0 && motion < 0.001) motion = 0;
            simTime += dt*motion;
            if (simTime > TIME_WRAP) simTime -= TIME_WRAP;
            syncUniforms(); gl.drawArrays(gl.TRIANGLES,0,3); stepAndDrawSparks(dt,motion);
            if (wantMotion === 0 && motion === 0) return false;
        },
        onDispose: () => { sprite = null; sparks = []; disposeGL(); sparkCanvas.remove(); }
    });
    const io = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && isPageVisible && !contextLost) loop.start(); else loop.stop();
    },{threshold:0});
    io.observe(container);
    const onContextLost = event => {
        event.preventDefault(); contextLost = true; loop.stop();
        container.classList.add("is-fallback"); canvas.style.visibility = "hidden"; sparkCanvas.style.visibility = "hidden";
    };
    canvas.addEventListener("webglcontextlost",onContextLost);
    loop.resize(); loop.start();
    return {
        setState({paused = false, reducedMotion = false, pageVisible = true}) {
            live.paused = paused; live.reducedMotion = reducedMotion; isPageVisible = pageVisible;
            if (contextLost) return;
            if (!pageVisible) { loop.stop(); return; }
            if (reducedMotion) motion = 0;
            loop.start();
        },
        suspend() { loop.stop(); },
        destroy() { canvas.removeEventListener("webglcontextlost",onContextLost); io.disconnect(); loop.dispose(); }
    };
}

let connection = null;
function fileName(value) {
    try { return decodeURIComponent(new URL(value,document.baseURI).pathname).split("/").pop().toLowerCase(); }
    catch { return ""; }
}

export function applyShadowflameSong(song, audio) {
    if (!audio) return;
    if (!connection) connection = connectAudio(audio);
    connection.select(song);
}

function connectAudio(audio) {
    const controller = new AbortController();
    const listen = (target,type,callback) => target.addEventListener(type,callback,{signal:controller.signal});
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let selected = false, playing = !audio.paused && !audio.ended;
    let engine = null, layer = null, hideTimer = null;
    const destroy = () => {
        clearTimeout(hideTimer); hideTimer = null;
        engine?.destroy(); engine = null;
        if (layer) { layer.replaceChildren(); layer.hidden = true; layer.classList.remove("is-fallback"); }
    };
    const sync = () => {
        const foregroundBlocked = document.body.classList.contains("locked") || document.body.classList.contains("creator-lightbox-open");
        const wanted = selected && playing && !audio.paused && !audio.ended && !audio.error &&
            fileName(audio.src) === TARGET_FILE && !document.hidden && !foregroundBlocked;
        if (wanted) {
            clearTimeout(hideTimer); hideTimer = null;
            if (!layer) {
                layer = document.createElement("div"); layer.id = "shadowflame-background";
                layer.setAttribute("aria-hidden","true"); document.body.append(layer);
            }
            layer.hidden = false;
            if (!engine) engine = createShadowflame(layer,reduced.matches);
            layer.classList.add("is-visible");
            engine.setState({ reducedMotion: reduced.matches, pageVisible: true });
        } else if (layer) {
            layer.classList.remove("is-visible");
            engine?.setState({ paused: true, reducedMotion: reduced.matches, pageVisible: !document.hidden });
            if (document.hidden || reduced.matches) destroy();
            else if (hideTimer === null) hideTimer = setTimeout(destroy,550);
        }
    };
    for (const type of ["playing"]) listen(audio,type,() => { playing = true; sync(); });
    for (const type of ["pause","ended","error","emptied","abort","waiting","loadstart"]) listen(audio,type,() => { playing = false; sync(); });
    listen(document,"visibilitychange",sync);
    listen(reduced,"change",sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
    listen(window,"pagehide",event => {
        destroy();
        if (!event.persisted) { observer.disconnect(); controller.abort(); }
    });
    listen(window,"pageshow",sync);
    return { select(song) { selected = fileName(song?.path || "") === TARGET_FILE; sync(); } };
}
