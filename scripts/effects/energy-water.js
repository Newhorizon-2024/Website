// Three independent seats in the fluid, all leased from the actual background pool.
// Coordinates stay in the native background camera; the SVG supplies only the fluid surface.
export function createWaterCapture() {
    const slots = [null, null, null];
    let next = 0;
    const ease = n => n*n*(3-2*n);
    function clear() {
        for (const [i, item] of slots.entries()) if (item) {
            item.lease.release({atCurrent:true});
            slots[i] = null;
        }
        next = 0;
    }
    function update(plate, balls, dt) {
        const api = window.NewHorizonBackgroundCubes;
        if (!api || dt <= 0) return;
        const r = plate.svg.getBoundingClientRect(), units = r.width / 320;
        if (!units || !r.height) return;
        next -= dt;
        const seat = slots.indexOf(null);
        if (seat >= 0 && next <= 0) {
            next = .65;
            const b = balls[seat], x = r.left + b.x*units, y = r.top + b.y*units;
            const reach = Math.max(35, 62*units);
            const near = api.findNearby({left:x, right:x, top:y, bottom:y, margin:reach});
            if (near && near.distance <= reach) {
                const lease = api.claimNearest({ids:[near.id], x:near.screen.x, y:near.screen.y, count:1,
                    group:'physical-energy', independent:true, allowBackLayer:true});
                if (lease) {
                    const e = lease.entries[0];
                    slots[seat] = {lease, age:0, phase:e.id*2.4, pos:e.sourcePosition.clone(), rot:e.mesh.rotation.clone(),
                        pose:new THREE.Matrix4(), quat:new THREE.Quaternion(), scale:e.sourceScale.clone()};
                }
            }
        }
        for (const [i, item] of slots.entries()) {
            if (!item) continue;
            const {lease, pos, rot} = item, e = lease.entries[0], c = lease.camera;
            const screen = lease.canvas.getBoundingClientRect();
            if (!screen.height) continue;
            const px = 2*(c.position.z-pos.z)/(screen.height*c.projectionMatrix.elements[5]);
            const b = balls[i], a = item.phase + plate.time*.58;
            const bx = b.x + .33*b.radius*Math.cos(a), by = b.y + .26*b.radius*Math.sin(a*1.25);
            const gx = c.position.x + (r.left + bx*units - screen.left - screen.width/2)*px;
            const gy = c.position.y - (r.top + by*units - screen.top - screen.height/2)*px;
            item.age += dt;
            const arrive = ease(Math.min(1,item.age/1.15));
            const follow = 1-Math.exp(-dt*(2+arrive*14));
            const speed = (window.globalSpeedMultiplier ?? 1)*dt*60, rates = e.originalRandom;
            pos.x += (gx-pos.x)*follow - rates.speedX*speed*(1-arrive);
            pos.y += (gy-pos.y)*follow - rates.speedY*speed*(1-arrive);
            rot.x += rates.rotationSpeedX*speed; rot.y += rates.rotationSpeedY*speed;
            const size = Math.min(e.sourceScale.x, b.radius*.53*units*px);
            item.scale.setScalar(e.sourceScale.x + (size-e.sourceScale.x)*arrive);
            item.pose.compose(pos,item.quat.setFromEuler(rot),item.scale);
            lease.setPose(0,{matrix:item.pose,frontMix:e.originalLayer ? 1-arrive : 0,opacity:1-.12*arrive});
            // A passing cube draws a little liquid out of the nearest lobe on entry.
            const dx=(pos.x-gx)/(px*units), dy=(gy-pos.y)/(px*units), distance=Math.hypot(dx,dy);
            if (distance < b.radius*1.7 && arrive < 1)
                balls.push({x:bx+dx*.76,y:by+dy*.76,radius:7*Math.sin(Math.PI*arrive),stretch:1.2,angle:Math.atan2(dy,dx)});
        }
    }
    return {update,clear};
}

