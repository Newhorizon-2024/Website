import { captureArrival } from "./capture-arrival.js?v=26.11.18.5";

// Deform the leased cube itself. At mix zero its positions, normals and lighting
// are the original box; the material remains in the existing two-layer renderer.
const surface = `
uniform float waterMix, waterTime;
varying vec3 vLiquidPoint;
vec3 liquidPoint(vec3 p) {
    vec3 s = normalize(p);
    float t = waterTime;
    float h = smoothstep(-0.7,1.,s.y);
    float ripple = sin(6.*s.y-1.7*t+2.3*s.x)*cos(4.*s.z+.7*t);
    float tongue = .5+.5*sin(5.*s.x+2.*s.z+1.3*t);
    vec3 q = s*(.47+.032*ripple);
    q.xz *= 1.-.43*h*h;
    q.y += .36*h*h*(.32+.68*tongue)+.055*h*sin(4.*s.z-t)-.075;
    q.x += .115*h*h*sin(1.5*t+3.*s.y);
    return mix(p,q,waterMix);
}
`;
function shapeMaterial(material, mix, time) {
    material.onBeforeCompile = shader => {
        shader.uniforms.waterMix = mix;
        shader.uniforms.waterTime = time;
        shader.vertexShader = surface+shader.vertexShader
            .replace("#include <beginnormal_vertex>", `
                vec3 tangentA = normalize(cross(abs(normal.y)>.9 ? vec3(1,0,0) : vec3(0,1,0), normal));
                vec3 tangentB = cross(normal,tangentA);
                vec3 objectNormal = normalize(cross(
                    liquidPoint(position+tangentA*.002)-liquidPoint(position-tangentA*.002),
                    liquidPoint(position+tangentB*.002)-liquidPoint(position-tangentB*.002)));
            `)
            .replace("#include <begin_vertex>", "vec3 transformed = liquidPoint(position); vLiquidPoint = transformed;");
        shader.fragmentShader = "uniform float waterMix,waterTime; varying vec3 vLiquidPoint;\n"+shader.fragmentShader
            .replace("#include <tonemapping_fragment>", `
                vec3 eye = normalize(vViewPosition);
                float rim = pow(1.-clamp(dot(eye,normal),0.,1.),2.4);
                vec3 reflected = reflect(-eye,normal);
                float strip = pow(max(0.,1.-abs(reflected.y+.22*sin(reflected.x*4.+waterTime*.7)) * 2.),5.);
                float flow = sin(vLiquidPoint.y*18.-2.1*waterTime+3.*sin(vLiquidPoint.x*9.+waterTime));
                float silver = .095+.34*rim+.37*strip+.075*pow(.5+.5*flow,6.);
                // Solid tonal shapes follow the moving surface normals and caustics.
                float edge = .013;
                float tone = .09 + .17*smoothstep(.17-edge,.17+edge,silver)
                                 + .24*smoothstep(.30-edge,.30+edge,silver)
                                 + .28*smoothstep(.46-edge,.46+edge,silver)
                                 + .18*smoothstep(.61-edge,.61+edge,silver);
                gl_FragColor.rgb = mix(gl_FragColor.rgb,vec3(.92,.97,1.)*tone,waterMix);
                #include <tonemapping_fragment>
            `);
    };
    material.customProgramCacheKey = () => "conservation-water-flame";
    material.needsUpdate = true;
}

export function initializeConservationFlame() {
    const section = document.getElementById("energy-conservation-section");
    const copy = section?.querySelector(".worldview-article-copy");
    const api = window.NewHorizonBackgroundCubes;
    if (!copy || !api) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let lease, entry, originalGeometry, surfaceMesh, stopFrame;
    let age=0, inView=false, away=false, returning=null;
    const mix={value:0}, time={value:0};
    const pos=new THREE.Vector3(), target=new THREE.Vector3(), scale=new THREE.Vector3();
    const rotation=new THREE.Quaternion(), upright=new THREE.Quaternion(), pose=new THREE.Matrix4();

    function release() {
        if (!lease) return;
        entry.mesh.geometry = originalGeometry;
        lease.setPose(0,{matrix:pose.compose(pos,rotation,entry.sourceScale)});
        lease.release({atCurrent:true});
        surfaceMesh.dispose();
        lease=null; returning=null;
    }
    function frame(_now,dt) {
        if (returning && lease) {
            returning.age += dt;
            const p = Math.min(1, returning.age / .8);
            const u = p*p*(3-2*p);
            mix.value = returning.mix*(1-u);
            time.value += dt;
            scale.copy(returning.scale).lerp(entry.sourceScale,u);
            lease.setPose(0,{matrix:pose.compose(pos,rotation,scale),opacity:1-.47*mix.value,
                frontMix:entry.originalLayer ? 1-mix.value : 0,visible:true});
            if (p === 1) { release(); sync(); }
            return;
        }
        const box=copy.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x=box.left+box.width/2,y=box.top+box.height/2;
        if (!lease) {
            lease=api.claimNearest({x,y,count:1,group:"conservation-flame",independent:true,preferVisible:true,allowBackLayer:true});
            if (!lease) return;
            entry=lease.entries[0];
            originalGeometry=entry.mesh.geometry;
            surfaceMesh=new THREE.BoxGeometry(1,1,1,26,26,26);
            entry.mesh.geometry=surfaceMesh;
            age=time.value=mix.value=0;
            pos.copy(entry.sourcePosition); rotation.copy(entry.sourceQuaternion);
            shapeMaterial(entry.mesh.material,mix,time);
        }
        const rect=lease.canvas.getBoundingClientRect();
        if (!rect.height) return;
        age+=dt;
        const progress=reduced.matches ? 1 : Math.min(1,age/1.95);
        const u=captureArrival(progress);
        mix.value=u*u*(3-2*u);
        if (!reduced.matches) time.value+=dt;
        const cam=lease.camera;
        const px=2*(cam.position.z-entry.sourcePosition.z)/(rect.height*cam.projectionMatrix.elements[5]);
        target.set(cam.position.x+(x-rect.left-rect.width/2)*px,cam.position.y-(y-rect.top-rect.height/2)*px,entry.sourcePosition.z);
        pos.lerpVectors(entry.sourcePosition,target,u);
        rotation.copy(entry.sourceQuaternion).slerp(upright,mix.value);
        const size=Math.min(190,box.width*.34)*px;
        scale.copy(entry.sourceScale).lerp(target.setScalar(size),mix.value);
        lease.setPose(0,{matrix:pose.compose(pos,rotation,scale),opacity:1-.47*mix.value,
            frontMix:entry.originalLayer ? 1-mix.value : 0,visible:true});
    }
    function sync() {
        const active=section.classList.contains("is-active") && !away;
        if (away || document.hidden) {
            stopFrame?.(); stopFrame=null;
            if (!active || returning) release();
            return;
        }
        if (active && inView && !returning) {
            if (!stopFrame) stopFrame=api.beforeRender(frame);
        } else if (lease && !reduced.matches) {
            returning ??= {age:0, mix:mix.value, scale:scale.clone()};
            if (!stopFrame) stopFrame=api.beforeRender(frame);
        } else {
            stopFrame?.(); stopFrame=null; release();
        }
    }
    const visibility=new IntersectionObserver(([e])=>{inView=e.isIntersecting;sync();});
    visibility.observe(copy);
    const classes=new MutationObserver(sync);
    classes.observe(section,{attributes:true,attributeFilter:["class"]});
    const events=new AbortController();
    document.addEventListener("visibilitychange",sync,{signal:events.signal});
    window.addEventListener("pageshow",()=>{away=false;sync();},{signal:events.signal});
    window.addEventListener("pagehide",e=>{
        away=true;sync();
        if (!e.persisted) {visibility.disconnect();classes.disconnect();events.abort();}
    },{signal:events.signal});
}
