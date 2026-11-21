// Quarter-turns in the cube's own coordinate frame. Integer lattice coordinates
// ensure every later move selects the physical layer produced by previous moves.
const moves = {
    R:['x',3,-1], U:['y',3,-1], F:['z',3,-1], L:['x',-3,1], D:['y',-3,1]
};
const phrases=[['R','U',"R'","U'"],['F','R',"F'","R'"],['L',"D'","L'",'D']];
const axes={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
const spacing=.91/2;
export function createSliceTurns(slots){
    const pieces=slots.map(s=>({
        origin:new THREE.Vector3(s.x,s.y,s.z).divideScalar(spacing).round(),
        cell:new THREE.Vector3(), basis:new THREE.Quaternion(), moving:false
    }));
    const rotation=new THREE.Quaternion();
    let sequence=[], token='', axis, angle=0, elapsed=0, wait=0, completed=0, previous=-1;
    function reset(){
        sequence=[];token='';angle=elapsed=completed=0;previous=-1;wait=5+Math.random()*4;
        rotation.identity();
        pieces.forEach((p,i)=>{p.cell.copy(p.origin);p.basis.identity();p.moving=false;writeSlot(i);});
    }
    function writeSlot(i){
        const {cell}=pieces[i],s=slots[i];
        s.x=cell.x*spacing;s.y=cell.y*spacing;s.z=cell.z*spacing;
    }
    function start(){
        if(!sequence.length){
            previous=(previous+1+Math.floor(Math.random()*(phrases.length-1)))%phrases.length;
            sequence=phrases[previous].slice();
        }
        token=sequence.shift();
        const [a,layer,direction]=moves[token[0]];
        axis=axes[a];angle=direction*(token.endsWith("'")?-1:1)*Math.PI/2;elapsed=0;
        for(const p of pieces)p.moving=p.cell[a]===layer;
    }
    function commit(){
        rotation.setFromAxisAngle(axis,angle);
        pieces.forEach((p,i)=>{
            if(!p.moving)return;
            p.cell.applyQuaternion(rotation).round();p.basis.premultiply(rotation).normalize();
            p.moving=false;writeSlot(i);
        });
        token='';completed++;rotation.identity();
        wait=sequence.length ? .19 : 10+Math.random()*8;
    }
    function tick(dt,reduced){
        if(reduced){
            if(token)commit();
            sequence.length=0;wait=Math.max(wait,5);return;
        }
        if(!token){
            wait-=dt;if(wait>0)return;
            start();
        }
        elapsed+=dt;
        const t=Math.min(1,elapsed/.82),k=t*t*t*(10-15*t+6*t*t);
        rotation.setFromAxisAngle(axis,angle*k);
        if(t===1)commit();
    }
    function pose(i,position,orientation){
        const p=pieces[i];orientation.premultiply(p.basis);
        if(p.moving){position.applyQuaternion(rotation);orientation.premultiply(rotation);}
    }
    reset();
    return {reset,tick,pose,state:()=>({move:token,completed,turning:token?pieces.filter(p=>p.moving).length:0})};
}
