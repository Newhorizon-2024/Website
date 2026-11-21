/* Native adaptation of the supplied Cubes component.
 * Credit: inspired by Can Tastemel's lambda.ai work (https://cantastemel.com).
 * Original spring brush / ripple equations retained; occupied cells
 * are borrowed real background cubes, not newly randomized substitutes. */
import {createWorldviewCapture} from './worldview-capture.js?v=26.11.18.5';
import {createDomainGridScan} from './domain-grid-scan.js?v=26.11.20.3';
import {createDomainAssembly} from './domain-assembly.js?v=26.11.20.4';
let controller = null;
let initialized = false;
const INTRO_SECONDS = 1.1;
// Simulation state: center.xy + rotation.xyzw + flash/scale/reveal + leased RGB.
const INSTANCE_FLOATS = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toRotation = (rx, ry, out, offset) => {
  const angle = Math.hypot(rx, ry);
  if (angle < 0.000001) {
    out[offset] = 0;
    out[offset + 1] = 0;
    out[offset + 2] = 0;
    out[offset + 3] = 1;
    return;
  }
  const s = Math.sin(angle / 2) / angle;
  out[offset] = rx * s;
  out[offset + 1] = ry * s;
  out[offset + 2] = 0;
  out[offset + 3] = Math.cos(angle / 2);
};

const multiply = (a, b, out, offset) => {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  out[offset] = aw * bx + ax * bw + ay * bz - az * by;
  out[offset + 1] = aw * by - ax * bz + ay * bw + az * bx;
  out[offset + 2] = aw * bz + ax * by - ay * bx + az * bw;
  out[offset + 3] = aw * bw - ax * bx - ay * by - az * bz;
};


function project(camera, width, height, scale) {
    // Near-orthographic view, shared with the capture bridge's perspective
    // camera: visually flat without a different projection popping at handoff.
    camera.aspect = width / height;
    camera.position.z = (height / scale / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // A narrow FOV puts the camera far away: reserve depth precision for the assembly itself.
    camera.near=Math.max(.1,camera.position.z-24);camera.far=camera.position.z+24;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
function createEngine(container) {
    const canvas = container.querySelector('canvas');
    const status = container.querySelector('.inner-domain-cubes-status');
    const gl = canvas.getContext('webgl2', {alpha:true,premultipliedAlpha:true,antialias:true,depth:true,stencil:false});
    const showNotice = message => {status.textContent=message;status.hidden=false;};
    if (!gl || !window.THREE) {showNotice('当前浏览器无法启用交互方块，正文仍可正常阅读'); return null;}
    const camera = new THREE.PerspectiveCamera(0.6, 1, 0.1, 10000);
    const settingsRef = {current:{gridSize:8,gap:0.18,faceOpacity:1,maxAngle:45,radius:3,speed:1,bounce:0.4,brush:1,perspective:0,autoAnimate:true,rippleOnClick:true,rippleColor:'#ffffff',rippleSpeed:1,intro:true,paused:false}};
    const style = window.NewHorizonBackgroundCubes?.getRenderingStyle?.();
    if (!style) {showNotice('图形效果暂不可用，正文仍可正常阅读');return null;}
    // Reuse this canvas's existing context and frame loop. Three now computes
    // the same StandardMaterial lighting, normals and output as the background.
    const renderer = new THREE.WebGLRenderer({canvas,context:gl,alpha:true,premultipliedAlpha:true,antialias:true});
    renderer.setClearColor(0,0);
    const scene = new THREE.Scene();
    const material = style.material;
    const geometry = new THREE.BoxGeometry();
    const domainState = new THREE.InstancedBufferAttribute(new Float32Array(64*2),2).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('domainState',domainState);
    const mesh = new THREE.InstancedMesh(geometry,material,64);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;
    scene.add(mesh);
    const pose = new THREE.Object3D();
    const instanceColor = new THREE.Color();
    const rippleUniform = {value:new THREE.Color()};
    let lights = [], baseOpacity = 1;

    function syncRenderingStyle(next = window.NewHorizonBackgroundCubes.getRenderingStyle()) {
        if (next.material !== material) {material.copy(next.material);next.material.dispose();}
        baseOpacity=material.opacity;
        // instanceColor already contains the full leased material RGB.
        material.color.setRGB(1,1,1);
        material.transparent=true;
        material.needsUpdate=true;
        Object.assign(renderer,next.renderer);
        lights.forEach(light=>{scene.remove(light);if(light.target)scene.remove(light.target);});
        lights=next.lights;
        lights.forEach(light=>{scene.add(light);if(light.target)scene.add(light.target);});
    }
    syncRenderingStyle(style);
    // The only shader additions are the existing per-cell reveal and transient
    // ripple. StandardMaterial retains its own face lighting and alpha handling.
    material.onBeforeCompile=shader=>{
        const output='gl_FragColor = vec4( outgoingLight, diffuseColor.a );';
        if(shader.fragmentShader.split(output).length!==2)throw new Error('Unsupported StandardMaterial output for inner-domain ripple');
        shader.uniforms.domainRipple=rippleUniform;
        shader.vertexShader=shader.vertexShader.replace('#include <common>',
            '#include <common>\nattribute vec2 domainState;\nvarying vec2 vDomainState;')
            .replace('#include <begin_vertex>','#include <begin_vertex>\nvDomainState=domainState;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
            '#include <common>\nuniform vec3 domainRipple;\nvarying vec2 vDomainState;')
            .replace('#include <color_fragment>',
                '#include <color_fragment>\nif(vDomainState.y<0.00001)discard;\ndiffuseColor.a*=vDomainState.y;')
            .replace(output,'outgoingLight=mix(outgoingLight,domainRipple,vDomainState.x*0.22);\n'+output);
    };
    material.customProgramCacheKey=()=> 'inner-domain-background-lighting-v1';

    const room = createDomainGridScan(container);
    const assembly=createDomainAssembly(container);
    const picker=new THREE.Raycaster(), ndc=new THREE.Vector2();
    let gesture=null;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = preference.matches;
    const view = { width: 1, height: 1, ratio: 1, scale: 1 };
    const pointer = { x: 0, y: 0, inside: false, moved: 0 };
    const cursor = { x: 0, y: 0, vx: 0, vy: 0, weight: 0, primed: false };
    const grid = { size: 0, count: 0 };
    let rx = new Float32Array(0);
    let ry = new Float32Array(0);
    let wx = new Float32Array(0);
    let wy = new Float32Array(0);
    let glow = new Float32Array(0);
    const rings = [];
    let delays = new Float32Array(0);
    let instances = new Float32Array(0);
    let clock = 0;
    // Capture owns each cell's intro. Vacant target poses must not collapse to
    // zero scale before their first arrival (a singular capture transform).
    let introClock = 99;
    let raf = 0;
    let last = 0;

    const allocate = size => {
      if (grid.size === size) return;
      grid.size = size;
      grid.count = size * size;
      rx = new Float32Array(grid.count);
      ry = new Float32Array(grid.count);
      wx = new Float32Array(grid.count);
      wy = new Float32Array(grid.count);
      glow = new Float32Array(grid.count);
      delays = new Float32Array(grid.count);
      instances = new Float32Array(grid.count * INSTANCE_FLOATS);
      const center = (size - 1) / 2;
      for (let i = 0; i < grid.count; i++) {
        const col = i % size;
        const row = Math.floor(i / size);
        delays[i] = Math.hypot(col - center, row - center) / Math.max(1, size / 2);
      }
    };

    const cellOf = i => {
      const size = grid.size;
      const center = (size - 1) / 2;
      return [(i % size) - center, center - Math.floor(i / size)];
    };

    const toWorld = (x, y) => [(x - view.width / 2) / view.scale, (view.height / 2 - y) / view.scale];

    const ripple = (x, y, slot=null) => {
      const s = settingsRef.current;
      if (!s.rippleOnClick || reduce) return;
      const [ox, oy] = toWorld(x, y);
      rings.push({ x: ox, y: oy, slot, born: clock });
      if (rings.length > 6) rings.shift();
      wake();
    };

    const render = () => {
      if (gl.isContextLost()) return;
      const s = settingsRef.current;
      mesh.count=grid.count;
      material.opacity=baseOpacity*s.faceOpacity;
      rippleUniform.value.set(s.rippleColor);
      for(let i=0;i<grid.count;i++){
        const base=i*INSTANCE_FLOATS;
        pose.position.copy(cells[i].root.position);
        pose.quaternion.copy(cells[i].root.quaternion);
        pose.scale.setScalar(Math.max(0.0001,(1-s.gap)*instances[base+7]));
        pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
        mesh.setColorAt(i,instanceColor.fromArray(instances,base+9));
        domainState.setXY(i,instances[base+6],instances[base+8]);
      }
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      domainState.needsUpdate=true;
      renderer.render(scene,camera);
    };

    const step = dt => {
      const s = settingsRef.current;
      allocate(s.gridSize);
      clock += dt;
      if (introClock < 99) introClock += dt;

      const live = s.autoAnimate && !reduce && (!pointer.inside || clock - pointer.moved > 3);
      let goalX = cursor.x;
      let goalY = cursor.y;
      let engaged = false;
      if (pointer.inside && clock - pointer.moved <= 3) {
        [goalX, goalY] = toWorld(pointer.x, pointer.y);
        engaged = true;
      } else if (live) {
        const reach = grid.size * 0.42;
        goalX = Math.sin(clock * 0.37) * reach * Math.cos(clock * 0.11);
        goalY = Math.sin(clock * 0.53 + 1.2) * reach;
        engaged = true;
      }
      if (!cursor.primed && engaged) {
        cursor.x = goalX;
        cursor.y = goalY;
        cursor.primed = true;
      }
      const follow = 1 - Math.exp(-dt * 18);
      const prevX = cursor.x;
      const prevY = cursor.y;
      cursor.x += (goalX - cursor.x) * follow;
      cursor.y += (goalY - cursor.y) * follow;
      const blend = 1 - Math.exp(-dt * 10);
      cursor.vx += ((cursor.x - prevX) / Math.max(dt, 0.001) - cursor.vx) * blend;
      cursor.vy += ((cursor.y - prevY) / Math.max(dt, 0.001) - cursor.vy) * blend;
      cursor.weight += ((engaged ? 1 : 0) - cursor.weight) * (1 - Math.exp(-dt * (engaged ? 6 : 2.5)));

      const stiffness = 160 * s.speed * s.speed;
      const damping = 2 * (1 - 0.82 * s.bounce) * Math.sqrt(stiffness);
      const maxAngle = (s.maxAngle * Math.PI) / 180;
      const lift = 0.8;
      const travel = 8 * s.rippleSpeed;
      const fade = Math.exp(-dt * 3.2);
      const reachLimit = grid.size * 1.5 + 2;
      for (let k = rings.length - 1; k >= 0; k--) {
        if ((clock - rings[k].born) * travel > reachLimit) rings.splice(k, 1);
      }
      const speedNow = Math.hypot(cursor.vx, cursor.vy);
      const sweepX = speedNow > 0.0001 ? -cursor.vy / speedNow : 0;
      const sweepY = speedNow > 0.0001 ? cursor.vx / speedNow : 0;
      const sweep = reduce ? 0 : Math.min(speedNow, 40) * s.brush * 1.6;
      let moving = false;

      for (let i = 0; i < grid.count; i++) {
        const [cx, cy] = cellOf(i);
        const dx = cx - cursor.x;
        const dy = cy - cursor.y;
        const distance = Math.hypot(dx, dy);
        const t = distance / s.radius;
        const falloff = t < 1 ? (1 - t * t) * (1 - t * t) * cursor.weight : 0;
        let targetX = 0;
        let targetY = 0;
        if (falloff > 0 && distance > 0.0001) {
          const tilt = maxAngle * falloff * (distance / Math.hypot(distance, lift));
          targetX = (dy / distance) * tilt;
          targetY = (-dx / distance) * tilt;
        }
        if (falloff > 0 && sweep > 0) {
          wx[i] += sweepX * sweep * falloff * dt * 4;
          wy[i] += sweepY * sweep * falloff * dt * 4;
        }
        glow[i] *= fade;
        for (let k = 0; k < rings.length; k++) {
          const ring = rings[k];
          const slot=assembly.slots[i];
          const ox = ring.slot ? slot.x-ring.slot.x : cx-ring.x;
          const oy = ring.slot ? slot.y-ring.slot.y : cy-ring.y;
          const reach = Math.hypot(ox, oy, ring.slot ? slot.z-ring.slot.z : 0);
          const now = (clock - ring.born) * travel;
          if (reach > now || reach < now - travel * dt) continue;
          const strength = Math.exp(-reach / (grid.size * 0.8));
          wx[i] -= (oy / Math.max(.01,reach)) * 13 * strength;
          wy[i] += (ox / Math.max(.01,reach)) * 13 * strength;
          glow[i] = Math.max(glow[i], strength);
        }
        if (glow[i] > 0.01) moving = true;
        if (reduce) {
          rx[i] = targetX;
          ry[i] = targetY;
          wx[i] = 0;
          wy[i] = 0;
        } else {
          wx[i] += (stiffness * (targetX - rx[i]) - damping * wx[i]) * dt;
          wy[i] += (stiffness * (targetY - ry[i]) - damping * wy[i]) * dt;
          rx[i] += wx[i] * dt;
          ry[i] += wy[i] * dt;
        }
        if (
          Math.abs(targetX - rx[i]) + Math.abs(targetY - ry[i]) > 0.0005 ||
          Math.abs(wx[i]) + Math.abs(wy[i]) > 0.0005
        ) {
          moving = true;
        }

        let grow = 1;
        let tumble = 0;
        if (introClock < 99) {
          const local = clamp((introClock - delays[i] * 0.55) / INTRO_SECONDS, 0, 1);
          const eased = 1 - Math.pow(1 - local, 3);
          grow = eased;
          tumble = (1 - eased) * (Math.PI / 2);
          if (local < 1) moving = true;
        }

        const tilt = [0, 0, 0, 1];
        const tiltScale=assembly.phase==='grid' ? 1 : .42;
        toRotation(rx[i]*tiltScale, ry[i]*tiltScale, tilt, 0);
        const turn = [Math.sin(tumble / 2), 0, 0, Math.cos(tumble / 2)];
        const base = i * INSTANCE_FLOATS;
        instances[base] = cx;
        instances[base + 1] = cy;
        multiply(tilt, turn, instances, base + 2);
        instances[base + 6] = glow[i];
        instances[base + 7] = grow;
      }
      if (introClock >= INTRO_SECONDS + 0.6 && introClock < 99) introClock = 99;
      return (
        moving ||
        live ||
        rings.length > 0 ||
        (engaged && speedNow > 0.01) ||
        Math.abs((engaged ? 1 : 0) - cursor.weight) > 0.002
      );
    };


    const cells = Array.from({length:settingsRef.current.gridSize ** 2}, (_,index)=>({index,root:new THREE.Object3D(),capture:null,born:0,id:null,color:null}));
    let active = false, exiting = false, dirty = false, contextLost = false, nextCaptureAt = 0, exitAt = 0;
    let exitPromise = null, resolveExit = null, exitTimer = null;
    let captureEvents = [];
    let captureTime = 0;
    const captureExitDuration = 1000;
    const quaternion = new THREE.Quaternion();

    function acquire(now) {
        if (exiting || now < nextCaptureAt || !cells.some(cell=>!cell.capture)) return;
        const assembling=assembly.phase!=='grid';
        nextCaptureAt = now + (assembling ? 29 : 220);
        const api = window.NewHorizonBackgroundCubes;
        if (!api?.findNearby) return;
        const rect = container.getBoundingClientRect();
        const candidate = api.findNearby({...rect.toJSON(),margin:64});
        if (!candidate && !assembling) return;
        const aim=candidate?.screen || {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
        const cell = cells.filter(item=>!item.capture).sort((a,b)=>{
            const distance = item=>{
                const base=item.index*INSTANCE_FLOATS;
                return Math.hypot(rect.left+rect.width/2+instances[base]*view.scale-aim.x,
                    rect.top+rect.height/2-instances[base+1]*view.scale-aim.y);
            };
            return distance(a)-distance(b);
        })[0];
        const provider = {claimNearest(){
            const lease = api.claimNearest({x:aim.x,y:aim.y,count:1,group:'inner-domain',preferVisible:true,
                ...(candidate ? {ids:[candidate.id],maxDistance:3} : {})});
            // The lease already exposes its real mesh. Keep that color object
            // rather than inventing a shared domain palette or recoloring it.
            cell.color = lease?.entries[0]?.mesh.material.color || null;
            cell.id=lease?.entries[0]?.id;
            return lease && {...lease,present(){dirty=true;}};
        }};
        const base = cell.index * INSTANCE_FLOATS;
        const travel = Math.hypot(rect.left + rect.width / 2 + instances[base] * view.scale - aim.x,
            rect.top + rect.height / 2 - instances[base + 1] * view.scale - aim.y);
        cell.duration = reduce ? 1 : (880 + Math.min(400, travel * 1.65))*(assembling ? .72 : 1);
        cell.capture = createWorldviewCapture({container,camera,coreRoot:cell.root,orbiters:[],backgroundApi:provider,variant:"cell"});
        if (!cell.capture.begin()) {cell.capture=null;cell.color=null; return;}
        cell.born=now;
        captureEvents.push({cell:cell.index,id:cell.id,time:performance.now()});
    }

    function finishExit() {
        clearTimeout(exitTimer); exitTimer=null;
        for (const cell of cells) {cell.capture?.release();cell.capture=null;cell.id=null;cell.color=null;}
        if (dirty) {window.NewHorizonBackgroundCubes?.present();dirty=false;}
        active=false; exiting=false; cancelAnimationFrame(raf);raf=0;last=0;
        cancelGesture();assembly.reset();rings.length=0;
        instances.fill(0);render();room.clear();
        const resolve=resolveExit;resolveExit=null;exitPromise=null;resolve?.();
    }

    function frame(now) {
        raf=0;
        if (!active || contextLost || document.hidden) {last=0;return;}
        const elapsed = last ? Math.max(0, now - last) : 0;
        last = now;
        captureTime += elapsed;
        const dt = Math.min(.05, elapsed / 1000);
        assembly.tick(dt,reduce,assembly.phase==='vortex' && cells.every(c=>c.capture && captureTime-c.born>=c.duration));
        step(dt);
        camera.fov=.6+assembly.perspective();
        project(camera,view.width,view.height,view.scale);
        for(const cell of cells){
            const base=cell.index*INSTANCE_FLOATS;
            instances[base+9]=cell.color?.r ?? 0;
            instances[base+10]=cell.color?.g ?? 0;
            instances[base+11]=cell.color?.b ?? 0;
            cell.root.position.set(instances[base],instances[base+1],0);
            quaternion.fromArray(instances,base+2).normalize();
            cell.root.quaternion.copy(quaternion);
            assembly.pose(cell.index,cell.root.position,cell.root.quaternion);
            cell.root.scale.setScalar(Math.max(0.0001,(1-settingsRef.current.gap)*instances[base+7]/5.4));
            cell.root.updateMatrixWorld(true);
            if(cell.capture?.hasLease()){
                const progress=clamp(exiting ? (now-exitAt)/captureExitDuration : (captureTime-cell.born)/cell.duration, 0, 1);
                const visual=cell.capture.getVisuals(exiting,progress);
                instances[base+8]=visual.core;
                cell.capture.update(exiting, now, dt);
            }else instances[base+8]=0;
        }
        if(dirty){window.NewHorizonBackgroundCubes?.present();dirty=false;}
        room.draw(view,clock,pointer,assembly.phase==='grid' ? rings : [],reduce);
        render();
        if(exiting && now-exitAt>=captureExitDuration){finishExit();return;}
        if(!exiting)acquire(captureTime);
        raf=requestAnimationFrame(frame);
    }
    function wake(){if(active&&!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
    function resize(){
        view.width=Math.max(1,container.clientWidth);view.height=Math.max(1,container.clientHeight);
        view.ratio=Math.min(devicePixelRatio||1,2);
        view.scale=Math.min(view.width*.78,view.height*.73)/settingsRef.current.gridSize;
        renderer.setPixelRatio(view.ratio);renderer.setSize(view.width,view.height,false);
        project(camera,view.width,view.height,view.scale);allocate(settingsRef.current.gridSize);wake();
    }
    function activate(){
        if(exiting||contextLost||active)return;
        syncRenderingStyle();
        captureEvents=[];rings.length=0;clock=0;introClock=99;
        rx.fill(0);ry.fill(0);wx.fill(0);wy.fill(0);glow.fill(0);
        pointer.inside=false;cursor.primed=false;cursor.weight=0;nextCaptureAt=0;captureTime=0;
        active=true;last=0;resize();wake();
    }
    function leave(){
        if(exitPromise)return exitPromise;
        if(!cells.some(cell=>cell.capture?.hasLease())){finishExit();return Promise.resolve();}
        exiting=true;active=true;exitAt=performance.now();
        cells.forEach(cell=>cell.capture?.beginExit({duration:captureExitDuration}));
        exitPromise=new Promise(resolve=>{resolveExit=resolve;});
        const promise=exitPromise;
        if(reduce){finishExit();return promise;}
        exitTimer=setTimeout(finishExit,captureExitDuration+150);wake();return promise;
    }
    function move(event){
        const rect=container.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;
        pointer.inside=true;pointer.moved=clock;wake();
    }
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
    preference.addEventListener('change',()=>{reduce=preference.matches;rings.length=0;room.clear();wake();});
    container.addEventListener('pointermove',move,{passive:true});
    container.addEventListener('pointerleave',()=>{pointer.inside=false;wake();});
    function pick(x,y){
        ndc.set(2*x/view.width-1,1-2*y/view.height);
        picker.setFromCamera(ndc,camera);
        const hit=picker.intersectObject(mesh,false).find(h=>cells[h.instanceId]?.capture);
        return hit ? assembly.slots[hit.instanceId] : assembly.pickSeam(picker.ray);
    }
    function action(x,y,keyboard=false){
        if(!active||exiting)return;
        if(assembly.phase==='solid'){
            const slot=pick(x,y);
            if(slot || keyboard)ripple(x,y,slot||assembly.slots[0]);
        }else{
            ripple(x,y);assembly.tap();
        }
    }
    function cancelGesture(){
        const id=gesture?.id;gesture=null;
        if(id!=null && container.hasPointerCapture(id))container.releasePointerCapture(id);
    }
    container.addEventListener('pointerdown',e=>{
        if(!active||exiting||gesture||!e.isPrimary||e.button!==0)return;
        const r=container.getBoundingClientRect();
        gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,at:e.timeStamp,moved:false,
            rotate:assembly.phase==='vortex' || (assembly.phase==='solid' && !!pick(e.clientX-r.left,e.clientY-r.top))};
        container.setPointerCapture(e.pointerId);
    });
    container.addEventListener('pointermove',e=>{
        const g=gesture;if(!g || g.id!==e.pointerId)return;
        g.moved ||= Math.hypot(e.clientX-g.x,e.clientY-g.y)>6;
        if(g.moved && g.rotate){
            const scale=3/Math.min(view.width,view.height);
            assembly.turn((e.clientX-g.lastX)*scale,(e.clientY-g.lastY)*scale,(e.timeStamp-g.at)/1000,reduce);
        }
        g.lastX=e.clientX;g.lastY=e.clientY;g.at=e.timeStamp;
    },{passive:true});
    container.addEventListener('pointerup',e=>{
        if(gesture?.id!==e.pointerId)return;
        const tapped=!gesture.moved && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=6,r=container.getBoundingClientRect();
        cancelGesture();if(tapped)action(e.clientX-r.left,e.clientY-r.top);
    });
    for(const type of ['pointercancel','lostpointercapture'])container.addEventListener(type,e=>{if(gesture?.id===e.pointerId)cancelGesture();});
    container.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)action(view.width/2,view.height/2,true);}
        else if(assembly.phase!=='grid' && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
            e.preventDefault();assembly.turn((Number(e.key==='ArrowRight')-Number(e.key==='ArrowLeft'))*.12,
                (Number(e.key==='ArrowDown')-Number(e.key==='ArrowUp'))*.12,.15,reduce);
        }
    });
    document.addEventListener('visibilitychange',()=>{last=0;wake();});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;finishExit();showNotice('图形上下文中断，方块已归还背景；刷新可重载效果');});
    resize();
    return {activate,leave,getState(){return {active,exiting,contextLost,pending:!!raf,view:{...view},count:cells.filter(cell=>cell.capture?.hasLease()).length,
        assembly:assembly.state(),gpuError:gl.getError(),colorSource:'captured-material',edgeStyle:'none',ripples:rings.length,angles:Array.from(rx).map((x,index)=>[x,ry[index]]),
        lighting:{source:'background-scene',material:{type:material.type,color:material.color.toArray(),roughness:material.roughness,metalness:material.metalness,opacity:material.opacity},
            lights:lights.map(light=>({type:light.type,color:light.color.toArray(),intensity:light.intensity,position:light.position.toArray(),target:light.target?.position.toArray()||null})),
            renderer:{outputEncoding:renderer.outputEncoding,toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,physicallyCorrectLights:renderer.physicallyCorrectLights},instanceCount:mesh.count},
        captureEvents:[...captureEvents],cells:cells.filter(cell=>cell.capture).map(cell=>({index:cell.index,id:cell.id,color:cell.color?.toArray()||null,
            instanceColor:mesh.instanceColor?Array.from(mesh.instanceColor.array.slice(cell.index*3,cell.index*3+3)):null,reveal:instances[cell.index*INSTANCE_FLOATS+8],
            targetDeterminant:cell.root.matrixWorld.determinant(),capture:cell.capture.getState()}))};}};
}

export function transitionInnerDomainCubesOut(){return controller?.leave()||Promise.resolve();}
export function initializeInnerDomainCubes(){
    if(initialized)return;
    const section=document.getElementById('inner-domain-section'),container=document.getElementById('inner-domain-cubes');
    if(!section||!container)return;initialized=true;
    let visible=false;
    const sync=()=>{
        if(section.classList.contains('is-active')&&visible&&!document.body.classList.contains('is-section-transitioning')){
            controller ||= createEngine(container);controller?.activate();
        }else if(controller)controller.leave().then(()=>{
            if(section.classList.contains('is-active')&&visible&&!document.body.classList.contains('is-section-transitioning'))controller.activate();
        });
    };
    const intersection=new IntersectionObserver(entries=>{
        if(document.hidden)return;
        visible=entries.some(entry=>entry.isIntersecting);sync();
    },{threshold:.05});
    document.addEventListener('visibilitychange',()=>{
        if(!document.hidden){intersection.disconnect();intersection.observe(container);}
    });
    intersection.observe(container);
    const observer=new MutationObserver(sync);observer.observe(section,{attributes:true,attributeFilter:['class']});
    window.addEventListener('section-shown',()=>requestAnimationFrame(sync));
    window.NewHorizonInnerDomainCubes=Object.freeze({getState:()=>controller?.getState()||{active:false,count:0,pending:false,captureEvents:[]}});
}
