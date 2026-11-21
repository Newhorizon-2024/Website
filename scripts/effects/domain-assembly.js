// 8² real cells, 4³ destinations. Slot order builds each course from the bottom up.
import {createSliceTurns} from './domain-slice-turns.js?v=26.11.20.3';
const ease = t => { t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); };
const VORTEX_RATE=1.55;
export function createDomainAssembly(host) {
    let phase, taps, age, pitch, yaw, vx, vy;
    const group=new THREE.Quaternion(), euler=new THREE.Euler(0,0,0,'YXZ');
    const target=new THREE.Vector3(), twist=new THREE.Quaternion(), tumble=new THREE.Euler(0,0,0,'YXZ');
    const slots=Array.from({length:64},(_,i)=>{
        const rank=(i*37+11)%64, x=rank%4, y=rank>>4, z=(rank>>2)%4;
        return {rank,x:(z%2 ? 1.5-x : x-1.5)*.91,y:(y-1.5)*.91,z:(z-1.5)*.91};
    });
    const slices=createSliceTurns(slots);
    const localRay=new THREE.Ray(), inverse=new THREE.Quaternion(), contact=new THREE.Vector3();
    const hull=new THREE.Box3(new THREE.Vector3(-1.775,-1.775,-1.775),new THREE.Vector3(1.775,1.775,1.775));
    function pickSeam(ray){
        if(phase!=='solid')return null;
        // A ray can pass straight through aligned seams. Still treat the face as one control.
        inverse.copy(group).conjugate();
        localRay.origin.copy(ray.origin).applyQuaternion(inverse);
        localRay.direction.copy(ray.direction).applyQuaternion(inverse);
        if(!localRay.intersectBox(hull,contact))return null;
        let closest=null,best=Infinity;
        for(const slot of slots){
            const d=(slot.x-contact.x)**2+(slot.y-contact.y)**2+(slot.z-contact.z)**2;
            if(d<best){best=d;closest=slot;}
        }
        return closest;
    }
    function set(p){phase=p;host.dataset.assembly=p;}
    function reset(){set('grid');taps=age=0;pitch=-.27;yaw=.48;vx=0;vy=.27;slices.reset();}
    reset();
    function tap(){if(phase==='grid' && ++taps===3)set('vortex');}
    function tick(dt, reduced, ready){
        if(phase==='grid')return;
        age=reduced ? Math.max(6,age+dt) : age+dt*(phase==='vortex' ? VORTEX_RATE : 1);
        if(phase==='vortex' && age>=5.7 && ready)set('solid');
        if(!reduced){pitch+=vx*dt;yaw+=vy*dt;vx*=Math.exp(-.75*dt);}
        if(phase==='solid')slices.tick(dt,reduced);
        pitch=Math.max(-1.48,Math.min(1.48,pitch));
        const enter=ease(age/.52);
        group.setFromEuler(euler.set(pitch*enter,yaw*enter,0,'YXZ'));
    }
    function turn(dx,dy,dt,reduce){
        if(phase==='grid')return;
        pitch=Math.max(-1.48,Math.min(1.48,pitch+dy));yaw+=dx;
        const rate=n=>Math.max(-1.4,Math.min(1.4,n/Math.max(.025,dt)));
        vx=reduce ? 0 : rate(dy)*.16;
        if(!reduce && Math.abs(dx)>.002)vy=Math.sign(dx)*Math.max(.18,Math.abs(rate(dx))*.55);
    }
    function pose(i,p,q){
        if(phase==='grid')return;
        const s=slots[i], local=ease((age-1.25-s.rank*.047)/1.35);
        target.set(s.x,s.y,s.z);
        if(phase==='solid')slices.pose(i,target,q);
        if(local<1){
            const w=ease(age/.88), startX=p.x, startY=p.y, row=(startY+3.5)/7;
            // Wind rows into a tapered helix. Depth is a real scene coordinate;
            // individual boxes bank into the flow and level out as they dock.
            const a=age*(2.9+.55*(1-row)) + row*3.5 + (startX+3.5)*.81;
            const radius=.80+row*1.50+.30*Math.abs(startX);
            p.set(startX+(radius*Math.cos(a)-startX)*w,
                startY+w*(.58*Math.sin(a+.4)-startY*.13),radius*Math.sin(a)*w);
            const bank=w*(1-local);
            twist.setFromEuler(tumble.set((.40+.28*Math.sin(a+i))*bank,
                (.68+.42*Math.cos(a))*bank,.33*Math.sin(a-i*.23)*bank,'YXZ'));
            q.premultiply(twist);
            p.lerp(target,local);
        }else p.copy(target);
        // Orbit the entire model, including flying and already docked pieces.
        p.applyQuaternion(group);
        q.premultiply(group);
    }
    function perspective(){return phase==='vortex' ? 16*ease(age/.92)*(1-ease((age-3.7)/1.85)) : 0;}
    return {reset,tap,tick,turn,pose,slots,perspective,pickSeam,get phase(){return phase;},state:()=>({phase,taps,age,pitch,yaw,vx,vy,slices:slices.state()})};
}
