import { clamp, topAt } from "./summit-motion.js?v=26.11.22.5";

// The perch is stored relative to its real platform. Scroll and cube rotation then
// move the encounter with the ledge, instead of leaving a pickup suspended over UI.
function placePerch(player, platforms, scale, preferredSide) {
    const margin = 10 * scale, clearance = 24 * scale;
    for (const s of platforms) {
        if (s.id !== player.support) continue;
        const left = Math.max(margin, s.left + margin), right = Math.min(innerWidth-margin,s.right-margin);
        if (left > right) continue;
        for (const side of [preferredSide, -preferredSide]) {
            const x = clamp(player.x + side * 46 * scale, left, right);
            if (Math.abs(x-player.x) < 16*scale) continue;
            const y = topAt(s,x);
            if (y < 18*scale || y > innerHeight-margin) continue;
            if (platforms.some(other => other !== s && !other.edges && x > other.left-margin &&
                x < other.right+margin && y-clearance < other.bottom && y-2*scale > other.top)) continue;
            return {id:s.id, u:(x-s.left)/(s.right-s.left), x, y, side};
        }
    }
    return null;
}

function startVisit(spot, scale, random) {
    const entrySide = spot.x < innerWidth / 2 ? -1 : 1;
    const startX = entrySide < 0 ? -42 * scale : innerWidth + 42 * scale;
    const startY = Math.max(16 * scale, spot.y - 45 * scale);
    const flightTime = clamp(Math.abs(spot.x - startX) / (175 * scale), .95, 3.5);
    return {
        spot, age: 0, depart: -1, collected: -1, lostPerch: false,
        birdDwell: 4 + random() * 3, life: flightTime + 21 + random() * 5,
        bird: { phase: "arriving", x: startX, y: startY, startX, startY,
            flightTime, clock: 0, facing: -entrySide }
    };
}

function leave(v, playerX) {
    const bird = v.bird;
    if (bird.phase === "departing" || bird.phase === "gone") return;
    v.depart = v.age;
    bird.hop = bird.phase === "perched";
    bird.phase = "departing";
    bird.facing = Math.sign(bird.x - playerX) || v.spot.side;
    bird.clock = 0;
}

function advanceBird(v, player, scale, dt) {
    const b = v.bird;
    b.clock += dt;
    if (b.phase === "arriving") {
        const u = Math.min(1, b.clock / b.flightTime);
        const remaining = (1 - u) ** 1.5;
        b.x = v.spot.x + (b.startX - v.spot.x) * remaining;
        b.y = v.spot.y + (b.startY - v.spot.y) * remaining - 12 * scale * Math.sin(Math.PI * u) ** 2;
        if (u === 1) { b.phase = "perched"; b.clock = 0; }
    } else if (b.phase === "perched") {
        b.x = v.spot.x;
        b.y = v.spot.y;
        b.facing = Math.sign(player.x - b.x) || b.facing;
        const near = Math.hypot(player.x - b.x, player.y - b.y) < 17 * scale;
        if ((near && b.clock > .35) || b.clock > v.birdDwell) leave(v, player.x);
    } else if (b.phase === "departing") {
        const t = b.clock;
        b.x += b.facing * (85 + 165 * Math.min(t / .45, 1)) * scale * dt;
        b.y -= (9 + 95 * Math.exp(-t * 3.4)) * scale * dt;
        const margin = 28 * scale;
        if (b.x < -margin || b.x > innerWidth + margin || b.y < -margin || b.y > innerHeight + margin) {
            b.phase = "gone";
        }
    }
}

export function createEncounter(random = Math.random) {
    let visit = null, wait = 1.8;
    function reset(delay = 1.8) { visit = null; wait = delay; }
    function abandon(playerX) {
        if (!visit) return;
        visit.lostPerch = true;
        leave(visit, playerX);
    }
    function update(player, platforms, scale, dt, canCollect=true) {
        if (!visit) {
            wait -= dt;
            if (wait > 0 || player.support === null) return;
            const spot = placePerch(player, platforms, scale, random() < .75 ? player.facing : -player.facing);
            if (!spot) { wait = .35; return; }
            visit = startVisit(spot, scale, random);
        }
        const v = visit;
        v.age += dt;
        if (!v.lostPerch) {
            const surface = platforms.find(p => p.id === v.spot.id);
            if (surface) {
                const x = surface.left + (surface.right - surface.left) * v.spot.u;
                const y = topAt(surface, x);
                const jumped = surface.edges && Math.hypot(x - v.spot.x, y - v.spot.y) > 48 * scale;
                if (x < 0 || x > innerWidth || y < 12 * scale || y > innerHeight + 12 * scale || jumped) abandon(player.x);
                else { v.spot.x = x; v.spot.y = y; }
            } else abandon(player.x);
        }
        advanceBird(v, player, scale, dt);
        if (canCollect && !v.lostPerch && v.depart >= 0 && v.age - v.depart >= .22 && v.collected < 0 &&
            player.support === null && (player.dashes === 0 || player.stamina < 90)) {
            const pos = crystalPosition(v, scale);
            if (refillIfTouched(player,pos,scale)) v.collected = v.age;
        }
        const gemFinished = v.lostPerch || (v.collected >= 0 && v.age - v.collected > .55) || v.age > v.life;
        if (gemFinished && v.bird.phase === "gone") reset(v.lostPerch ? 1.5 : 6 + random() * 4);
    }
    return { update, abandon, get visit() { return visit; } };
}

function crystalPosition(v,scale) {
    const {x,y}=v.spot;
    const rise = clamp((v.age-v.depart-.22)/.28,0,1);
    const height = Math.min(20*scale, y-8*scale);
    return {x,y:y-height+(1-rise)*4*scale+Math.sin(v.age*2.7)*.9*scale};
}

const pixelBird=["   bb    ","  bccb   "," bcccbww ","  ccbbb  ","  bbbo   "];
const pixelGem=["   a   ","  aba  "," abcba "," abcca ","  aba  ","   a   "];
const colors={b:"#293342",c:"#61a4cc",w:"#e6edf0",o:"#eaa15d",a:"#318a78"};
function fallback(ctx,pattern,x,y) {
    pattern.forEach((row,dy)=>[...row].forEach((p,dx)=>{if(p!==" "){ctx.fillStyle=colors[p];ctx.fillRect(x+dx,y+dy,1,1);}}));
}
function badge(kind, size = 40) {
    const el = document.createElement("canvas");
    el.width=el.height=size;
    el.className="summit-companion summit-"+kind; el.setAttribute("aria-hidden","true");
    const ctx=el.getContext("2d");ctx.imageSmoothingEnabled=false;
    return {el,ctx};
}
function position(item,x,y,scale) {
    const {el,ctx}=item;
    if(!el.isConnected) document.body.append(el);
    const half=el.width/2;
    el.style.width=el.style.height=el.width*scale+"px";
    el.style.transform="translate3d("+Math.round(x-half*scale)+"px,"+Math.round(y-half*scale)+"px,0)";
    ctx.clearRect(0,0,el.width,el.height);
}
export function createCrystalView(art, kind) {
    const gem = badge(kind);
    function draw(x,y,scale,t,collected,opacity) {
        position(gem,x,y,scale);
        if (collected < 0) {
            gem.el.style.opacity = String(clamp(opacity,0,1));
            paintSprite(art,gem.ctx,"crystalIdle",t,1);
            const gleam = t % 2.7;
            if (art && gleam < .36) paintSprite(art,gem.ctx,"crystalFlash",gleam,1);
        } else {
            const burst = t-collected;
            gem.el.style.opacity = String(Math.max(0,1-burst/.55));
            for(let i=0;i<6;i++){
                const a=i*Math.PI/3, r=3+burst*22;
                gem.ctx.fillStyle=i%2?"#eafff6":"#79dcbb";
                gem.ctx.fillRect(20+Math.round(Math.cos(a)*r),20+Math.round(Math.sin(a)*r+burst*burst*12),2,2);
            }
        }
    }
    return {draw, remove:()=>gem.el.remove()};
}

export function refillIfTouched(player,pos,scale) {
    if (player.support !== null || (player.dashes > 0 && player.stamina >= 90) ||
        Math.hypot(player.x-pos.x, player.y-6*scale-pos.y) > 8*scale) return false;
    player.dashes=1; player.stamina=110; player.refillDelay=0;
    return true;
}

function paintSprite(art,ctx,action,seconds,direction) {
    const anim = art?.meta.animations[action];
    ctx.save();ctx.translate(ctx.canvas.width/2,ctx.canvas.height/2);ctx.scale(direction,1);
    if (anim) {
        const {columns,cell}=art.meta;
        const idx=anim.frames[Math.floor(seconds/anim.delay)%anim.frames.length];
        ctx.drawImage(art.image,idx%columns*cell,Math.floor(idx/columns)*cell,cell,cell,-anim.anchor[0],-anim.anchor[1],cell,cell);
    } else if (action==="crystalIdle") fallback(ctx,pixelGem,-3,-3);
    else if (action.startsWith("bird")) fallback(ctx,pixelBird,-4,-5);
    ctx.restore();
}

export function createEncounterView(art) {
    const bird=badge("bird"),gem=createCrystalView(art,"crystal");
    function detach(){bird.el.remove();gem.remove();}
    function draw(v,scale) {
        if (!v) {detach();return;}
        const b = v.bird, t = v.age, away = t - v.depart;
        if (b.phase !== "gone") {
            let action = "birdFly", clock = b.clock;
            if (b.phase === "perched") {
                const peck = b.clock - .55;
                action = peck >= 0 && peck < 1.04 ? "birdPeck" : "birdIdle";
                if (action === "birdPeck") clock = peck;
            } else if (b.phase === "departing" && b.hop && clock < .24) {
                action = "birdJump";
            }
            position(bird, b.x, b.y, scale);
            paintSprite(art,bird.ctx, action, clock, b.facing);
        } else bird.el.remove();
        if (v.lostPerch || v.depart < 0 || away < .22 || (v.collected >= 0 && t - v.collected > .55)) {
            gem.remove();
            return;
        }

        const c=crystalPosition(v,scale);
        gem.draw(c.x,c.y,scale,t,v.collected,Math.min((away-.22)*5,(v.life-t)*2));
    }
    return {draw,detach};
}
