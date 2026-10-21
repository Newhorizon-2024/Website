/* Original native WebGL controller: one canvas and one bounded RAF per owner.
 * No external libraries or network requests. Lifecycle is independent of visuals.
 */
(() => {
    'use strict';
    const DEFAULTS = Object.freeze({speed:1, exposure:1, grain:0.03, lens:1, rim:1,
        zoom:1.8, particleCount:13, mirrorSplits:2, bloom:1, contrast:3,
        orbSize:0.75, glow:0.08, distanceFade:0.35, testMode:0, effectStrength:0.8,
        effectScale:1, effectSpeed:1, freezeScene:0, exposureCycle:0});
    // The author's confirmed preview profile, distinct from the generic API defaults.
    const PREFERRED_DEFAULTS = Object.freeze({speed:0.75, exposure:3, grain:1, lens:0.06, rim:2,
        zoom:1, particleCount:30, mirrorSplits:2, bloom:4, contrast:5,
        orbSize:0.2, glow:0.2, distanceFade:1, testMode:5, effectStrength:6.19,
        effectScale:0.5, effectSpeed:2, freezeScene:0, exposureCycle:1});
    const LIMITS = {speed:[0,3], exposure:[0,3], grain:[0,1], lens:[0,1.3], rim:[0,3],
        zoom:[1,3], particleCount:[1,30], mirrorSplits:[1,6], bloom:[0,4],
        contrast:[1,5], orbSize:[0.2,1.2], glow:[0,0.2], distanceFade:[0,1],
        testMode:[0,6], effectStrength:[0,30], effectScale:[0.5,3], effectSpeed:[0,2], freezeScene:[0,1], exposureCycle:[0,1]};
    const owners = new WeakMap();
    const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
    const hash = value => {const n=Math.sin(value*127.1)*43758.5453;return n-Math.floor(n);};
    const OBSERVATION_DELAY=1.5;
    const smoothObservation=value=>{const v=clamp(value,0,1);return v*v*v*(v*(v*6-15)+10);};
    function create(container, options={}) {
        const source=window.NewHorizonOrbitalWarpShaders;
        if(!source || !container?.appendChild)return null;
        owners.get(container)?.destroy();
        const randomSeed=()=>{
            const n=new Uint32Array(1);
            if(globalThis.crypto?.getRandomValues){crypto.getRandomValues(n);return n[0];}
            return Math.floor(Math.random()*4294967296);
        };
        const instanceSeed=Number.isFinite(options.seed)?Math.trunc(options.seed)>>>0:randomSeed();
        const observationEntry=options.observationEntry===true;
        const shaderSeed=(instanceSeed%65521)/65521*37;
        const random=value=>hash(value+(instanceSeed%104729)*0.173);
        const canvas=document.createElement('canvas');
        canvas.className='black-hole-canvas';canvas.setAttribute('aria-hidden','true');
        let gl;
        try{
            const attributes={alpha:false,antialias:false,powerPreference:'low-power'};
            gl=canvas.getContext('webgl2',attributes)||canvas.getContext('webgl',attributes);
        }catch{return null;}
        if(!gl)return null;
        const isGL2=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext;
        let program=null,buffer=null;
        const shaders=[];
        const release=()=>{
            if(buffer)gl.deleteBuffer(buffer);
            if(program)gl.deleteProgram(program);
            for(const shader of shaders)gl.deleteShader(shader);
        };
        try{
            const compile=(type,text)=>{
                const shader=gl.createShader(type);shaders.push(shader);
                gl.shaderSource(shader,text);gl.compileShader(shader);
                if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
                return shader;
            };
            const vertex=isGL2?'#version 300 es\n'+source.vertex.replace('attribute vec2','in vec2'):source.vertex;
            const fragment=isGL2?'#version 300 es\n'+source.fragment.replace('precision highp float;','precision highp float;\nout vec4 fragColor;').replaceAll('gl_FragColor','fragColor'):source.fragment;
            program=gl.createProgram();
            gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
            gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
            if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
            gl.useProgram(program);
            buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
            const position=gl.getAttribLocation(program,'aPosition');
            gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        }catch(error){
            release();gl.getExtension('WEBGL_lose_context')?.loseContext();
            console.warn('Independent black hole unavailable:',error.message);return null;
        }
        const state={...DEFAULTS};
        const assign=values=>{
            if(!values||typeof values!=='object')return;
            for(const[key,[min,max]]of Object.entries(LIMITS)){
                const incoming=['freezeScene','exposureCycle'].includes(key)&&typeof values[key]==='boolean'?Number(values[key]):values[key];
                if(!Number.isFinite(incoming))continue;
                const value=clamp(incoming,min,max);
                state[key]=['particleCount','mirrorSplits','testMode','freezeScene','exposureCycle'].includes(key)?Math.round(value):value;
            }
            if(observationEntry)state.speed=0.75;
        };
        assign(options);
        const uniforms=Object.fromEntries(['uResolution','uOrbs[0]','uCount','uTime','uZoom',
            'uWarp','uSplits','uExposure','uRing','uBloom','uContrast','uGrain','uReveal',
            'uSeed','uGlow','uDistanceFade','uOrbitScale','uTestMode','uEffectTime','uEffectStrength','uEffectScale','uFlash'].map(name=>[name,gl.getUniformLocation(program,name)]));
        const orbs=new Float32Array(30*4);
        const reduced=matchMedia('(prefers-reduced-motion: reduce)');
        let frame=0,resizeFrame=0,last=0,lastPaint=0,draws=0,recovered=null;
        let time=clamp(Number(options.time)||0,0,10000000);
        let effectTime=Number.isFinite(options.effectTime)?clamp(options.effectTime,0,10000000):time;
        let exposureTime=Number.isFinite(options.exposureTime)?clamp(options.exposureTime,0,10000000):time;
        const exposureSampler=observationEntry?window.NewHorizonExposureCycle?.createObservation?.(instanceSeed):
            window.NewHorizonExposureCycle?.create(instanceSeed);
        let paused=Boolean(options.paused),visible=true,disposed=false,lost=false;
        let observationHold=0,notifyingObservation=false;
        const observationUpdate=typeof options.onObservationUpdate==='function'?options.onObservationUpdate:null;
        let hover=0,hoverTarget=0,grip=null;
        let introAge=options.intro===false||reduced.matches||paused||state.freezeScene?2:0;
        let gulpAge=2,gulpStrength=0,pixelRatio=1,cssWidth=1,cssHeight=1;
        const snapshot=()=>({...state,seed:instanceSeed,time,effectTime,exposureTime,paused,intro:false,observationEntry});
        const exposureAt=()=>{
            if(observationEntry){
                const blackout=exposureTime<OBSERVATION_DELAY;
                const pulse=exposureSampler?.(Math.max(0,exposureTime-OBSERVATION_DELAY))||
                    {phase:'static',stageName:'high',index:2,stageIndex:2,groupIndex:0,peakFactor:1,
                        value:1,cameraFactor:1,firstGroup:false};
                const enabled=Boolean(state.exposureCycle)&&!reduced.matches&&Boolean(exposureSampler);
                const peakFactor=enabled?pulse.peakFactor:1;
                const value=blackout?0:enabled?pulse.value:1;
                const currentCap=blackout?0:state.exposure*peakFactor;
                const cameraFactor=blackout?3:reduced.matches?1:pulse.cameraFactor;
                return{...pulse,enabled,blackout,phase:blackout?'hold':enabled?pulse.phase:'static',
                    stageName:blackout?'hold':reduced.matches?'high':enabled?pulse.stageName:'static',
                    ...(reduced.matches&&!blackout?{index:2,stageIndex:2}:{}),
                    peakFactor,value,cap:currentCap,currentCap,masterCap:state.exposure,
                    effectiveExposure:state.exposure*value,cameraFactor,cameraZoom:state.zoom*cameraFactor,
                    firstGroup:!reduced.matches&&pulse.firstGroup,
                    observationVisibility:blackout?0:reduced.matches?1:smoothObservation((exposureTime-OBSERVATION_DELAY)/0.75),
                    startDelay:OBSERVATION_DELAY};
            }
            if(!state.exposureCycle||reduced.matches||!exposureSampler)
                return{enabled:false,phase:'static',value:1,peakFactor:1,
                    cap:state.exposure,effectiveExposure:state.exposure};
            const pulse=exposureSampler(exposureTime);
            return{...pulse,enabled:true,cap:state.exposure,effectiveExposure:state.exposure*pulse.value};
        };
        const flashAt=seconds=>{
            // One seeded event per window, with jittered timing and long quiet
            // gaps. No timers or extra RAF; seeks and restores reproduce it.
            const bucket=Math.floor(seconds/6.4),id=bucket*11+401;
            const onset=0.8+random(id)*3.0;
            const duration=0.34+random(id+1)*0.12;
            const age=seconds-bucket*6.4-onset;
            const attack=0.025+random(id+2)*0.015;
            const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
            let envelope=0;
            if(age>=0&&age<duration&&!reduced.matches&&state.glow>0){
                const first=smooth(0,attack,age)*Math.exp(-Math.max(0,age-attack)/0.085);
                const echoAt=0.17+random(id+3)*0.035;
                const echo=smooth(echoAt,echoAt+0.025,age)
                    *Math.exp(-Math.max(0,age-echoAt-0.025)/0.06)*(0.12+random(id+4)*0.10);
                envelope=clamp((first+echo)*(1-smooth(duration-0.09,duration,age)),0,1);
            }
            return{bucket,onset,duration,age,envelope,centerX:(random(id+5)-0.5)*1.1,
                centerY:(random(id+6)-0.5)*0.32,length:0.28+random(id+7)*0.22};
        };
        const draw=()=>{
            if(disposed||lost||document.hidden||!visible)return;
            const exposure=exposureAt();
            const intro=Math.min(1,introAge/1.2),ease=1-Math.pow(1-intro,3);
            const impulse=gulpAge<1.3&&!reduced.matches?Math.sin(gulpAge*9)*Math.exp(-gulpAge*4.8)*gulpStrength:0;
            const contraction=1-impulse*0.18;
            // Seeded, irregular, flattened orbits form one coherent extended source.
            // Their height can cross the lens; the shadow radius stays fixed.
            const phase=time*0.34+shaderSeed*0.13;
            const height=0.20*Math.sin(phase)+0.045*Math.sin(time*0.19+shaderSeed);
            const shear=0.09*Math.cos(time*0.23+shaderSeed*0.3);
            for(let i=0;i<state.particleCount;i++){
                const angle=time*(0.34+random(i+81)*0.14)+i*2.39996323+random(i+19)*0.9+(1-ease)*1.6;
                const x=Math.cos(angle)*state.orbSize*(0.85+random(i+7)*0.25)*contraction;
                const y=height+shear*x+Math.sin(angle)*(0.045+random(i+42)*0.035)*contraction;
                orbs[i*4]=x;orbs[i*4+1]=y;
                orbs[i*4+2]=-Math.sin(angle);
                orbs[i*4+3]=(0.65+random(i+35)*0.7)*(0.45+0.55*(0.5+0.5*Math.cos(angle+random(i+91)*2)));
            }
            gl.useProgram(program);
            gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height);
            gl.uniform4fv(uniforms['uOrbs[0]'],orbs);gl.uniform1i(uniforms.uCount,state.particleCount);
            gl.uniform1i(uniforms.uTestMode,state.testMode);
            const flash=flashAt(effectTime);
            gl.uniform4f(uniforms.uFlash,flash.centerX,flash.centerY,flash.length,flash.envelope);
            const values={uTime:time,uZoom:observationEntry?exposure.cameraZoom:state.zoom,uWarp:state.lens,uSplits:state.mirrorSplits,
                uExposure:exposure.effectiveExposure,uRing:state.rim,uBloom:state.bloom,uContrast:state.contrast,
                uGrain:state.grain,uReveal:ease*(observationEntry?exposure.observationVisibility:1),uSeed:shaderSeed,uGlow:state.glow,
                uDistanceFade:state.distanceFade,uOrbitScale:contraction,
                uEffectTime:effectTime,uEffectStrength:state.effectStrength,uEffectScale:state.effectScale};
            for(const[name,value]of Object.entries(values))gl.uniform1f(uniforms[name],value);
            gl.drawArrays(gl.TRIANGLES,0,3);draws++;
            if(observationUpdate&&!notifyingObservation){
                notifyingObservation=true;
                try{observationUpdate({blackout:observationEntry&&exposure.blackout,
                    stageName:exposure.stageName||'static',phase:exposure.phase,cap:exposure.currentCap??exposure.cap,
                    masterCap:exposure.masterCap??state.exposure,cameraZoom:observationEntry?exposure.cameraZoom:state.zoom,
                    firstGroup:Boolean(exposure.firstGroup)});}catch{}finally{notifyingObservation=false;}
            }
        };
        const stop=()=>{cancelAnimationFrame(frame);frame=0;last=lastPaint=0;};
        const effectsRunning=()=>state.speed>0&&state.effectSpeed>0
            &&((state.testMode>0&&state.effectStrength>0)||state.glow>0);
        const exposureRunning=()=>observationEntry?state.speed>0:
            Boolean(exposureSampler)&&state.exposureCycle>0&&state.exposure>0&&state.speed>0;
        const shouldRun=()=>!disposed&&!lost&&!paused&&!reduced.matches&&!document.hidden&&visible
            &&((state.speed>0&&!state.freezeScene)||effectsRunning()||exposureRunning()||introAge<1.2||gulpAge<1.3);
        const tick=now=>{
            frame=0;
            if(!shouldRun()){last=lastPaint=0;return;}
            frame=requestAnimationFrame(tick);
            if(lastPaint&&now-lastPaint<1000/60-1)return;
            const dt=last?Math.min((now-last)/1000,0.07):0;last=lastPaint=now;
            hover+=(hoverTarget-hover)*(1-Math.exp(-dt*5));
            if(observationEntry){
                const previous=exposureTime;
                if(exposureRunning())exposureTime+=dt*state.speed;
                // Only the portion beyond the initial hold advances source
                // and effect clocks, even when one frame crosses its boundary.
                const active=Math.max(0,exposureTime-OBSERVATION_DELAY)-Math.max(0,previous-OBSERVATION_DELAY);
                if(!state.freezeScene)time+=active*(1+hover*0.3);
                if(effectsRunning())effectTime+=active*state.effectSpeed;
            }else{
                if(!state.freezeScene)time+=dt*state.speed*(1+hover*0.3);
                if(effectsRunning())effectTime+=dt*state.speed*state.effectSpeed;
                // Keep the slow envelope independent of ripple speed and pointer hover.
                if(exposureRunning())exposureTime+=dt*state.speed;
            }
            introAge+=dt;gulpAge+=dt;draw();
        };
        const cancelObservationHold=()=>{if(observationHold)clearTimeout(observationHold);observationHold=0;};
        const syncObservationHold=()=>{
            const eligible=observationEntry&&reduced.matches&&exposureTime<OBSERVATION_DELAY&&
                !disposed&&!lost&&!paused&&!document.hidden&&visible;
            if(!eligible){cancelObservationHold();return;}
            if(!observationHold)observationHold=setTimeout(()=>{
                observationHold=0;
                if(disposed||lost||paused||document.hidden||!visible||!reduced.matches)return;
                exposureTime=OBSERVATION_DELAY;introAge=gulpAge=2;draw();
            },1000);
        };
        const sync=()=>{if(shouldRun()){if(!frame)frame=requestAnimationFrame(tick);}else stop();syncObservationHold();};
        const resize=()=>{
            resizeFrame=0;if(disposed||lost)return;
            const rect=container.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
            cssWidth=rect.width;cssHeight=rect.height;
            pixelRatio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1500000/(cssWidth*cssHeight)));
            const width=Math.max(1,Math.round(cssWidth*pixelRatio)),height=Math.max(1,Math.round(cssHeight*pixelRatio));
            if(canvas.width!==width||canvas.height!==height||!draws){
                canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);draw();
            }
        };
        const scheduleResize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);};
        const onVisibility=()=>{grip=null;hoverTarget=hover=0;if(!document.hidden)draw();sync();};
        const onMotion=()=>{introAge=gulpAge=2;draw();sync();};
        const onLost=event=>{
            event.preventDefault();lost=true;stop();cancelObservationHold();
            container.classList.add('is-unavailable');canvas.style.visibility='hidden';
        };
        const onRestored=()=>{
            const saved=snapshot();lost=false;api.destroy();
            if(typeof options.onRestore==='function')options.onRestore(saved);
            else recovered=create(container,{...options,...saved});
        };
        const onEnter=event=>{if(event.pointerType==='mouse')hoverTarget=1;};
        const onLeave=()=>{hoverTarget=0;grip=null;};
        const onDown=event=>{if(event.button===0&&event.isPrimary)grip={id:event.pointerId,x:event.clientX,y:event.clientY};};
        const onUp=event=>{
            const current=grip;grip=null;
            if(current&&current.id===event.pointerId&&Math.hypot(event.clientX-current.x,event.clientY-current.y)<8)api.gulp();
        };
        const onCancel=()=>{grip=null;};
        const ro=new ResizeObserver(scheduleResize);ro.observe(container);
        const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)draw();sync();});io.observe(container);
        canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
        document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onMotion);
        const pointerListeners=[['pointerenter',onEnter],['pointerleave',onLeave],['pointerdown',onDown],['pointerup',onUp],['pointercancel',onCancel]];
        for(const[type,fn]of pointerListeners)canvas.addEventListener(type,fn);
        const api={
            mode:'orbital-lens-v8',
            set(values){if(recovered)return recovered.set(values);if(disposed)return;assign(values);if(state.freezeScene)introAge=gulpAge=2;draw();sync();},
            pause(value=true){if(recovered)return recovered.pause(value);if(disposed)return paused;paused=Boolean(value);if(paused){introAge=gulpAge=2;draw();}sync();return paused;},
            seek(seconds){if(recovered)return recovered.seek(seconds);if(disposed)return;time=clamp(Number(seconds)||0,0,10000000);effectTime=exposureTime=time;introAge=gulpAge=2;draw();if(observationEntry)sync();},
            gulp(strength=1){if(recovered)return recovered.gulp(strength);if(disposed||lost||paused||reduced.matches||state.freezeScene)return;gulpAge=0;gulpStrength=clamp(Number(strength)||0,0,3);sync();},
            replay(){if(recovered)return recovered.replay();if(disposed)return;introAge=reduced.matches||state.freezeScene?2:0;draw();sync();},
            get paused(){return recovered?recovered.paused:paused;},get running(){return recovered?recovered.running:Boolean(frame);},get canvas(){return recovered?recovered.canvas:canvas;},
            get seed(){return instanceSeed;},get time(){return recovered?recovered.time:time;},
            get effectTime(){return recovered?recovered.effectTime:effectTime;},get settings(){return recovered?recovered.settings:{...state};},
            get exposureTime(){return recovered?recovered.exposureTime:exposureTime;},
            get observationEntry(){return recovered?recovered.observationEntry:observationEntry;},
            get metrics(){
                if(recovered)return recovered.metrics;
                const exposurePulse=exposureAt();
                const renderedZoom=observationEntry?exposurePulse.cameraZoom:state.zoom;
                const coreRadiusPx=0.225*Math.min(canvas.height,canvas.width*0.75)/(renderedZoom/1.8);
                return{draws,passes:1,particleCount:state.particleCount,pointLights:0,flash:flashAt(effectTime),context:isGL2?'webgl2':'webgl',
                    width:canvas.width,height:canvas.height,cssWidth,cssHeight,pixelRatio,
                    coreRadiusPx,coreRadiusCss:coreRadiusPx/pixelRatio,centerX:canvas.width/2,centerY:canvas.height/2,
                    seed:instanceSeed,time,effectTime,exposureTime,exposurePulse,observationEntry,renderedZoom,
                    cameraZoom:renderedZoom,observationVisibility:observationEntry?exposurePulse.observationVisibility:1,
                    observationBlackout:Boolean(observationEntry&&exposurePulse.blackout),
                    observationHoldPending:Boolean(observationHold),...state};
            },
            destroy(){
                if(recovered){recovered.destroy();recovered=null;return;}
                if(disposed)return;disposed=true;stop();cancelObservationHold();cancelAnimationFrame(resizeFrame);
                ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onMotion);
                canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);
                for(const[type,fn]of pointerListeners)canvas.removeEventListener(type,fn);
                if(owners.get(container)===api)owners.delete(container);
                release();canvas.remove();if(!lost)gl.getExtension('WEBGL_lose_context')?.loseContext();
            }
        };
        owners.set(container,api);container.classList.remove('is-unavailable');container.appendChild(canvas);
        resize();sync();return api;
    }
    window.NewHorizonOrbitalBlackHole=Object.freeze({create,defaults:DEFAULTS,preferredDefaults:PREFERRED_DEFAULTS});
})();
