// Observer Effect: project genuine equal-height contours of one relief surface.
// Travelling waves reshape a persistent relief; observation adds a local disturbance.
function makeSwell(){
    const band=(a,b)=>a+Math.random()*(b-a);
    const sample=()=>({amplitude:band(.14,.26), speed:band(.88,1.36), spread:band(.42,.95), stretch:band(.88,1.12)});
    const direction=band(-.30,.30), wavelength=band(4.7,6.5);
    const kx=Math.cos(direction)*wavelength, ky=Math.sin(direction)*wavelength;
    let from=sample(),to=sample(),span=band(6,11),age=0;
    let phase=band(0,Math.PI*2),cross=band(0,Math.PI*2), envelope=band(0,Math.PI*2);
    let amplitude=from.amplitude, spread=from.spread, stretch=from.stretch;
    return {
        coordinate(x,y){return x*kx+y*ky+.34*Math.sin(y*3.4+x*.42);},
        advance(dt){
            age+=dt;
            if(age>=span){age-=span;from=to;to=sample();span=band(6,11);}
            const t=age/span,k=t*t*(3-2*t);
            amplitude=from.amplitude+(to.amplitude-from.amplitude)*k;
            spread=from.spread+(to.spread-from.spread)*k;
            stretch=from.stretch+(to.stretch-from.stretch)*k;
            const travel=dt*(from.speed+(to.speed-from.speed)*k);
            phase+=travel;cross+=travel*.72;envelope+=travel*.34;
        },
        height(along,across){
            const a=along*stretch-phase+.23*Math.sin(across-cross*.46);
            const set=.68+.32*Math.cos(along*.42-envelope);
            return amplitude*set*(Math.sin(a)+.23*Math.sin(2*a-.95)
                +.26*spread*Math.sin(along*.76+across*.67-cross));
        }
    };
}
export function initializeObserverRelief(){
    const canvas=document.querySelector('#observer-effect-section .observer-relief canvas');
    if(!canvas || canvas.dataset.ready)return;
    const ctx=canvas.getContext('2d');
    if(!ctx){canvas.parentElement.hidden=true;return;}
    canvas.dataset.ready='true';
    const section=canvas.closest('.section'), motion=matchMedia('(prefers-reduced-motion: reduce)');
    const cols=65,rows=39,n=cols*rows;
    const base=new Float32Array(n), h=new Float32Array(n), sx=new Float32Array(n), sy=new Float32Array(n);
    const ocean=makeSwell(), along=new Float32Array(n), across=new Float32Array(n);
    const peaks=[[-.49,.13,.52,.078],[-.22,-.36,.47,.063],[.30,-.12,.97,.12],[.62,.39,.49,.061]];
    const swellRate=.35;
    for(let j=0,i=0;j<rows;j++)for(let k=0;k<cols;k++,i++){
        const x=k/(cols-1)*2-1,y=j/(rows-1)*2-1;
        along[i]=ocean.coordinate(x,y);across[i]=3*y-.4*x;
        const u=x+.10*Math.sin(5*y+1.2)+.026*Math.sin(13*x+4*y);
        const v=y+.13*Math.sin(4*x-2*y)+.047*Math.cos(8*y+2*x);
        let z=.042+.038*Math.sin(8*u+3*v)*Math.cos(5*v-u);
        for(const [px,py,a,r] of peaks)z+=a*Math.exp(-((u-px)**2+.64*(v-py)**2)/r);
        // An oblique crest gives the main peak a summit and a longer shoulder.
        const dx=u-.30,dy=v+.12,ridge=dy+.62*dx;
        base[i]=z+.12*Math.exp(-dx*dx/.048-ridge*ridge/.015);
    }
    let w=0,height=0,ratio=1,raf=0,last=0,visible=false;
    const aim={x:0,y:0,on:false,strength:0}, pulses=[];
    const usable=()=>visible&&!document.hidden&&section.classList.contains('is-active')&&w>0;
    function draw(){
        ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,height);
        const contourStep=.05, levels=33, paths=Array.from({length:levels},()=>new Path2D()), lit=new Path2D();
        for(let j=0,i=0;j<rows;j++)for(let k=0;k<cols;k++,i++){
            const x=k/(cols-1)*2-1,y=j/(rows-1)*2-1;
            let influence=.17*aim.strength*Math.exp(-((x-aim.x)**2+(y-aim.y)**2)/.047);
            for(const p of pulses){
                const d=Math.hypot(x-p.x,y-p.y)-p.age*.67;
                influence+=.12*Math.exp(-d*d/.005-p.age*1.8);
            }
            const swell=ocean.height(along[i],across[i])*(1-.42*Math.min(1,base[i]));
            h[i]=.23+.80*base[i]+swell+influence;
            sx[i]=w*(.5+x*(.475+.043*y)+.026*y);
            sy[i]=height*(.60+y*.37-h[i]*.34);
        }
        function triangle(a,b,c){
            const lo=Math.max(1,Math.ceil(Math.min(h[a],h[b],h[c])/contourStep));
            const hi=Math.min(levels-1,Math.floor(Math.max(h[a],h[b],h[c])/contourStep));
            if(lo>hi)return;
            for(let l=lo;l<=hi;l++){
                const z=l*contourStep,p=paths[l];let first=-1,fy=0;
                // A triangle's contour has at most two crossings; neighbouring triangles share samples.
                for(let e=0;e<3;e++){
                    const u=e===0?a:e===1?b:c,v=e===0?b:e===1?c:a;
                    if((h[u]<z)===(h[v]<z))continue;
                    const k=(z-h[u])/(h[v]-h[u]),x=sx[u]+(sx[v]-sx[u])*k,y=sy[u]+(sy[v]-sy[u])*k;
                    if(first===-1){first=x;fy=y;}else {
                        p.moveTo(first,fy);p.lineTo(x,y);
                        if(aim.strength>.01 && Math.hypot((a%cols)/(cols-1)*2-1-aim.x,Math.floor(a/cols)/(rows-1)*2-1-aim.y)<.24){
                            lit.moveTo(first,fy);lit.lineTo(x,y);
                        }
                    }
                }
            }
        }
        for(let j=0;j<rows-1;j++)for(let k=0;k<cols-1;k++){
            const i=j*cols+k;triangle(i,i+1,i+cols);triangle(i+1,i+cols+1,i+cols);
        }
        ctx.lineCap='round';
        for(let l=1;l<levels;l++){
            const anchor=l%4===0;
            ctx.strokeStyle='rgba(215,223,226,'+(.17+l*.021+(anchor ? .19 : 0))+')';
            ctx.lineWidth=anchor?1.25:.8;ctx.stroke(paths[l]);
        }
        ctx.strokeStyle='rgba(255,255,255,'+(.65*aim.strength)+')';ctx.lineWidth=1.35;ctx.stroke(lit);
    }
    function frame(now){
        raf=0;if(!usable())return;
        if(!last || now-last>=40 || motion.matches){
            const dt=last?Math.min(.10,(now-last)/1000):.04;last=now;
            if(!motion.matches)ocean.advance(dt*swellRate);
            aim.strength+=(Number(aim.on)-aim.strength)*(motion.matches?1:1-Math.exp(-dt*7));
            for(const p of pulses)p.age+=dt;
            while(pulses.length && pulses[0].age>2.2)pulses.shift();
            draw();
        }
        if(!motion.matches)wake();
    }
    function wake(){if(usable()&&!raf)raf=requestAnimationFrame(frame);}
    function sync(){
        if(!usable()){cancelAnimationFrame(raf);raf=last=0;aim.on=false;aim.strength=0;pulses.length=0;}
        else wake();
    }
    const size=new ResizeObserver(()=>{
        const width=canvas.clientWidth, high=canvas.clientHeight;if(!width||!high)return;
        w=width;height=high;ratio=Math.min(devicePixelRatio||1,1.75);
        canvas.width=Math.round(w*ratio);canvas.height=Math.round(height*ratio);last=0;wake();
    });size.observe(canvas);
    const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync();});io.observe(canvas);
    const sectionWatch=new MutationObserver(sync);sectionWatch.observe(section,{attributes:true,attributeFilter:['class']});
    function locate(e){
        const r=canvas.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
        let best=Infinity,index=0;
        for(let i=0;i<n;i++){const dx=sx[i]-px,dy=sy[i]-py,d=dx*dx+dy*dy;if(d<best){best=d;index=i;}}
        aim.x=index%cols/(cols-1)*2-1;aim.y=Math.floor(index/cols)/(rows-1)*2-1;
        aim.on=best<Math.max(18,height*.09)**2;wake();
    }
    canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')locate(e);},{passive:true});
    canvas.addEventListener('pointerleave',()=>{aim.on=false;wake();});
    canvas.addEventListener('click',e=>{
        locate(e);if(aim.on&&!motion.matches){
            if(pulses.length===3)pulses.shift();pulses.push({x:aim.x,y:aim.y,age:0});
        }
        if(e.pointerType==='touch')aim.on=false;
        wake();
    });
    document.addEventListener('visibilitychange',sync);
    motion.addEventListener('change',()=>{last=0;pulses.length=0;wake();});
}
