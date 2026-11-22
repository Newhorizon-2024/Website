const pack = new URL("./summit-local/", import.meta.url);
const packs = new Map();

export function loadSummitPack(name) {
    const revision = name === "wildlife" ? "?v=26.11.22.2" : "";
    if (!packs.has(name)) packs.set(name, Promise.all([
        fetch(new URL(name+".json"+revision, pack)).then(r => { if (!r.ok) throw Error("skin"); return r.json(); }),
        new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = new URL(name+".png"+revision, pack).href;
        })
    ]).then(([meta, image]) => ({meta, image})).catch(() => null));
    return packs.get(name);
}

export function createAvatar(skin) {
    const el = document.createElement("canvas");
    el.className = "summit-avatar";
    el.width = 48; el.height = 40;
    el.setAttribute("aria-hidden", "true");
    const ctx = el.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let lastPose = "", age = 0, trailingX = 0, trailingY = 0;
    let squash = 0;
    function tile(index, x, y, size = 32) {
        const {cell, columns} = skin.meta;
        ctx.drawImage(skin.image,index%columns*cell,Math.floor(index/columns)*cell,cell,cell,x,y,size,size);
    }
    function draw(p, scale, dt) {
        // The attack silhouette lasts beyond the .15 s movement impulse.
        const dashPose = p.dashAge >= 0 && p.dashAge < .30 &&
            (p.pose === "dash" || p.pose === "idle" || p.pose === "runFast" ||
             p.pose === "fallFast" || (p.pose === "jumpFast" && p.jumpHold <= 0));
        const action = dashPose ? "dash" : p.pose;
        if (lastPose !== action) {
            if (action === "duck") squash = .4;
            else if (lastPose === "duck" && p.support != null && action !== "dash") squash = -.2;
            else squash = 0;
            age = 0;
            lastPose = action;
        } else {
            age += dt;
            squash -= Math.sign(squash) * Math.min(Math.abs(squash), 1.75 * dt);
        }
        const pose = skin?.meta.animations[action] || skin?.meta.animations.idle;
        if (dashPose) age = p.dashAge;
        const frame = pose?.frames[Math.floor(age / (pose.delay || .1)) % pose.frames.length] ?? 0;
        const head = skin?.meta.hair[frame] || [16, action === "duck" ? 25 : 20];
        const follow = 1 - Math.exp(-dt * 12);
        trailingX += (Math.max(-5, Math.min(5, -p.vx / scale / 33)) - trailingX) * follow;
        trailingY += (Math.max(-5, Math.min(4, -p.vy / scale / 32)) - trailingY) * follow;
        ctx.clearRect(0, 0, el.width, el.height);
        ctx.save();
        ctx.translate(24, 34);
        ctx.scale(p.facing * (1 + squash), 1 - squash);
        ctx.translate(-16, -32);
        const hairColor = p.dashes ? "#b93248" : "#55a9d7";
        for (let i = 4; i >= 0; i--) {
            const t = i / 4;
            const x = Math.round(head[0] + t * (trailingX * p.facing - 6));
            const y = Math.round(head[1] + t * (trailingY + 4));
            if (skin) {
                const palette = skin.meta.hairSprites[p.dashes ? "ready" : "spent"];
                const [ox,oy] = skin.meta.hairOrigin;
                const k = 1 - .5*t;
                tile(palette.strand,Math.round(x-ox*k),Math.round(y-oy*k),Math.round(32*k));
                continue;
            }
            const radius = Math.round(3 - t * 2);
            ctx.fillStyle = "#321f32";
            ctx.fillRect(x-radius-1,y-radius,radius*2+2,radius*2+1);
            ctx.fillStyle = hairColor;
            ctx.fillRect(x-radius,y-radius,radius*2+1,radius*2);
        }
        if (skin) {
            const palette = skin.meta.hairSprites[p.dashes ? "ready" : "spent"];
            const [ox,oy] = skin.meta.hairOrigin;
            tile(palette.bangs[skin.meta.bangs[frame] || 0],head[0]-ox,head[1]-oy);
            // The face is in the body tile; fringe and trailing strands sit behind it.
            tile(frame,0,0);
        } else {
            // An original miniature climber also keeps the game playable without the private skin.
            if (action === "duck") { ctx.translate(0, 32); ctx.scale(1, .70); ctx.translate(0, -32); }
            ctx.fillStyle = "#ddd5c8"; ctx.fillRect(14,18,6,6);
            ctx.fillStyle = "#392f39"; ctx.fillRect(18,20,1,1);
            ctx.fillStyle = "#526879"; ctx.fillRect(12,24,8,5);
            ctx.fillStyle = "#d0a95c"; ctx.fillRect(12,23,8,2);
            ctx.fillStyle = "#46394a";
            const stride = p.pose === "runFast" ? Math.floor(age * 12) % 2 * 2 : 0;
            ctx.fillRect(12-stride,29,3,3); ctx.fillRect(17+stride,29,3,3);
        }
        ctx.restore();
        if (el.style.width !== el.width*scale+"px") {
            el.style.width = el.width*scale+"px";
            el.style.height = el.height*scale+"px";
        }
        el.style.transform = "translate3d(" + Math.round(p.x - 24*scale) + "px," + Math.round(p.y - 34*scale) + "px,0)";
    }
    function hit(x,y) {
        const r = el.getBoundingClientRect();
        if (!r.width || x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false;
        const px = Math.floor((x-r.left)*el.width/r.width);
        const py = Math.floor((y-r.top)*el.height/r.height);
        return ctx.getImageData(px,py,1,1).data[3] > 48;
    }
    return {el, draw, hit};
}
