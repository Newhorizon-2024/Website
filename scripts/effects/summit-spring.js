export function createSpring(art, pad) {
    const el = document.createElement("canvas");
    el.className = "summit-spring";
    el.width = el.height = 16;
    el.setAttribute("aria-hidden","true");
    const ctx = el.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const animation = art?.meta.animations.spring;
    let age = Infinity, painted = -1;
    function draw(dt) {
        age += dt;
        const frame = age < .325 ? 1 + Math.min(4, Math.floor(age/.065)) : 0;
        if (painted === frame) return;
        painted = frame;
        ctx.clearRect(0,0,16,16);
        if (animation) {
            const {cell,columns} = art.meta;
            const id = animation.frames[frame];
            ctx.drawImage(art.image,id%columns*cell,Math.floor(id/columns)*cell,16,16,0,0,16,16);
        } else {
            ctx.fillStyle = "#b5bec7"; ctx.fillRect(4,14,8,2);
            ctx.fillStyle = "#d96056"; ctx.fillRect(2,frame ? 7 : 12,12,2);
        }
    }
    function surface(scale) {
        if (!pad) return null;
        if (!el.isConnected) pad.append(el);
        if (el.style.width !== 16*scale+"px") el.style.width = el.style.height = 16*scale+"px";
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || getComputedStyle(pad).visibility !== "visible") return null;
        return {id:el, spring:true, top:r.bottom-3*scale, bottom:r.bottom, left:r.left+2*scale,
            right:r.right-2*scale, bounce:() => { age = 0; }};
    }
    return {surface, draw, detach() {el.remove(); age = Infinity; painted = -1;}};
}
