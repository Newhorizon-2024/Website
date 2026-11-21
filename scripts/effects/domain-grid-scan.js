// Grid Scan adapted to the colony: four perspective walls lead into its real 8×8 plane.
// Projection is evaluated on grid lines only. No second WebGL context, postprocess or camera input.
const clamp = t => Math.max(0, Math.min(1, t));
export function scanPhase(time) {
    const t=time%8;
    return {depth:clamp(t/3.1), wall:t<=3.1 ? Math.sin(Math.PI*clamp(t/3.1))**.55 : 0};
}
export function createDomainGridScan(container) {
    const canvas=document.createElement('canvas');
    canvas.className='domain-scan-room'; canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d');
    if(!ctx) return {draw(){},clear(){}};
    container.prepend(canvas);
    let last=-1, aimX=0, aimY=0;
    function clear(){ctx.clearRect(0,0,canvas.width,canvas.height);last=-1;aimX=aimY=0;}
    function draw(view, time, pointer, rings, reduce) {
        const {width:w,height:h,scale:cell}=view, dpr=Math.min(view.ratio,1.5);
        const pw=Math.round(w*dpr),ph=Math.round(h*dpr),resize=canvas.width!==pw||canvas.height!==ph;
        if(!resize && last>=0 && (reduce || (time>=last && time-last<1/30)))return;
        if(resize){canvas.width=pw;canvas.height=ph;}
        last=time;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
        const cx=w/2, cy=h/2, half=4*cell;
        const sweep=scanPhase(reduce ? 7 : time);
        aimX+=((!reduce&&pointer.inside ? (pointer.x/w-.5)*cell*.32 : 0)-aimX)*.12;
        aimY+=((!reduce&&pointer.inside ? (pointer.y/h-.5)*cell*.32 : 0)-aimY)*.12;
        // The rear grid stays registered to the meshes; only the mouth follows the eye.
        function bounds(z){
            const f=(1-z)/(1+2*z);
            return [cx+aimX*f,cy+aimY*f,half+(w*.51-half)*f,half+(h*.51-half)*f];
        }
        function path(alpha,weight,fn){
            if(alpha<.003)return;
            ctx.strokeStyle='rgba(217,226,232,'+alpha+')';ctx.lineWidth=weight;ctx.beginPath();fn();ctx.stroke();
        }
        function ring(z,alpha,width){
            const [x,y,hw,hh]=bounds(z);
            path(alpha,width,()=>ctx.rect(x-hw,y-hh,hw*2,hh*2));
        }
        const [x,y,hw,hh]=bounds(0);
        path(.19,.8,()=>{
            for(let n=-4;n<=4;n++){
                const u=n/4;
                for(const sign of [-1,1]){
                    ctx.moveTo(x+u*hw,y+sign*hh);ctx.lineTo(cx+u*half,cy+sign*half);
                    if(Math.abs(n)<4){ctx.moveTo(x+sign*hw,y+u*hh);ctx.lineTo(cx+sign*half,cy+u*half);}
                }
            }
        });
        for(let k=1;k<=8;k++)ring(k/8,.08+.055*(1-k/8),.8);
        if(sweep.wall){
            for(let k=3;k>=0;k--)if(sweep.depth>=k*.017)
                ring(sweep.depth-k*.017,sweep.wall*[.66,.20,.09,.035][k],k?2:1.25);
        }
        const left=cx-half,top=cy-half;
        path(.14,.8,()=>{
            for(let k=0;k<=8;k++){
                ctx.moveTo(left+k*cell,top);ctx.lineTo(left+k*cell,top+2*half);
                ctx.moveTo(left,top+k*cell);ctx.lineTo(left+2*half,top+k*cell);
            }
        });
        for(let row=0;row<=8;row++)for(let col=0;col<=8;col++){
            let light=0;
            for(const ripple of rings){
                const d=Math.hypot(col-4-ripple.x,4-row-ripple.y)-(time-ripple.born)*8;
                light=Math.max(light,Math.exp(-d*d/.17)*Math.exp(-(time-ripple.born)*1.7));
            }
            if(light>.02){
                ctx.fillStyle='rgba(236,242,245,'+light*.85+')';
                ctx.fillRect(left+col*cell-1,top+row*cell-1,2,2);
            }
        }
    }
    return {draw,clear};
}
