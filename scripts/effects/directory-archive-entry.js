const motion = matchMedia("(prefers-reduced-motion: reduce)");
const approach = "cubic-bezier(.46,.03,.30,1)";

// The wheel and the projected marker share the navigation clock, including the
// handoff to the incoming section. All layers exist only for this transition.
export function beginArchiveEntry(section, origin) {
    if (!origin || !section?.contains(origin) || motion.matches || document.hidden || !origin.animate) return;
    const globe = origin.closest("#scenes-globe");
    const host = globe || origin.closest("#things-option-wheel");
    if (!host) return;
    const anchor = globe ? origin.querySelector(".scene-node-marker") : host.querySelector(".things-wheel-ring");
    if (!anchor) return;
    const box = anchor.getBoundingClientRect(), hostBox = host.getBoundingClientRect();
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    if (!box.width || !box.height || hostBox.bottom <= 0 || hostBox.top >= height) return;
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const layer = document.createElement("div");
    layer.className = "archive-entry";
    layer.setAttribute("aria-hidden", "true");
    const veil = document.createElement("div");
    veil.className = "archive-entry-veil";
    layer.append(veil);
    document.body.append(layer);
    const duration = globe ? 780 : 720;
    const animations = [];
    const trails = [];
    const listeners = new AbortController();
    const wasInert = host.inert;
    host.inert = true;

    function play(element, frames, timing = {}) {
        const animation = element.animate(frames, {duration, fill:"both", easing:approach, ...timing});
        animations.push(animation);
        return animation;
    }
    function dispose() {
        if (listeners.signal.aborted) return;
        listeners.abort();
        for (const animation of animations) animation.cancel();
        trails.forEach(line=>line.remove());
        host.inert = wasInert;
        layer.remove();
    }

    try {
        if (globe) {
            const pivot = (x - hostBox.left) + "px " + (y - hostBox.top) + "px";
            const dx = width / 2 - x, dy = height / 2 - y;
            play(host, [
                {transformOrigin:pivot, transform:"translate(0,0) scale(1)"},
                {transformOrigin:pivot, transform:`translate(${dx}px,${dy}px) scale(2.6)`}
            ]);
            const fading = ".scenes-current, .scenes-globe-hint, .scenes-globe-reticle, .scene-node:not(.is-selected), .scene-node.is-selected .scene-node-name";
            for (const el of host.querySelectorAll(fading)) {
                play(el, [{opacity:getComputedStyle(el).opacity}, {opacity:0}], {duration:200});
            }
            const image = anchor.querySelector("img");
            // If the marker is still loading, the globe itself carries the approach.
            if (image?.complete && image.naturalWidth) {
                const photo = document.createElement("div");
                photo.className = "archive-entry-photo";
                const fit = Math.max(width / box.width, height / box.height) * 1.035;
                const w = box.width * fit, h = box.height * fit;
                const radius = parseFloat(getComputedStyle(anchor).borderTopLeftRadius) || 0;
                Object.assign(photo.style, {width:w+"px", height:h+"px",
                    backgroundImage:"url("+JSON.stringify(image.currentSrc)+")",
                    backgroundPosition:getComputedStyle(image).objectPosition, filter:getComputedStyle(image).filter});
                layer.append(photo);
                play(photo, [
                    {transform:`translate(${box.left}px,${box.top}px) scale(${1/fit})`, borderRadius:radius*fit+"px"},
                    {transform:`translate(${(width-w)/2}px,${(height-h)/2}px) scale(1)`, borderRadius:"0px"}
                ]);
                play(photo, [
                    {opacity:Number(getComputedStyle(origin).opacity)},
                    {opacity:0}
                ], {easing:"cubic-bezier(.42,0,.8,1)"});
                play(anchor, [{opacity:1}, {opacity:0}], {duration:140});
            }
        } else {
            const dial = host.querySelector(".things-clock-hands");
            if (dial) {
                // Start at each live SVG hand's angle. Ghosts sample earlier points
                // on the same accelerating curve instead of rotating a second clock.
                const turns = [310,640,1040];
                Array.from(dial.querySelectorAll("line")).forEach((hand,index) => {
                    const base = hand.transform.baseVal;
                    const angle = base.numberOfItems ? base.getItem(0).angle : 0;
                    for (let tail=0;tail<=5;tail++) {
                        const line = tail ? hand.cloneNode(false) : hand;
                        if (tail) {
                            line.classList.add("things-clock-trail");
                            dial.prepend(line);
                            trails.push(line);
                        }
                        const frames = Array.from({length:25},(_,i)=>{
                            const t=i/24, sample=Math.max(0,t-tail*.021);
                            return {
                                transform:"rotate("+(angle+turns[index]*sample**2.35)+"deg)",
                                opacity:tail ? (.32/(1+tail*.42))*Math.min(1,t*4) : 1
                            };
                        });
                        play(line,frames,{easing:"linear"});
                    }
                });
            }
            // Staggered silver arcs: a narrow bright core and a soft angular tail.
            // Successive rings wind in opposite directions around the dial.
            const reach = Math.hypot(Math.max(x, width-x), Math.max(y, height-y));
            for (let i=0; i<6; i++) {
                const ring = document.createElement("div");
                ring.className = "archive-entry-ring";
                const size = box.width * (.48 + i*.105);
                Object.assign(ring.style, {width:size+"px", height:size+"px", left:x-size/2+"px", top:y-size/2+"px"});
                layer.append(ring);
                const angle = i*137, turn = i%2 ? -43 : 43;
                const endScale = Math.min(7, (reach*2/size)*(.70+i*.085));
                play(ring, [
                    {transform:`rotate(${angle}deg) scale(.9)`, opacity:0},
                    {opacity:i%2 ? .69 : .94, offset:.18},
                    {transform:`rotate(${angle+turn}deg) scale(${endScale})`, opacity:0}
                ], {delay:i*31, duration:duration-i*31, easing:"cubic-bezier(.38,.14,.55,1)"});
            }
        }
        const cover = play(veil, [{opacity:0}, {opacity:.12, offset:.35}, {opacity:1}]);
        document.addEventListener("visibilitychange", () => { if (document.hidden) dispose(); }, {signal:listeners.signal});
        window.addEventListener("pagehide", dispose, {signal:listeners.signal});
        window.addEventListener("resize", dispose, {signal:listeners.signal});
        motion.addEventListener("change", dispose, {signal:listeners.signal});
        return {
            ready:cover.finished.catch(() => {}),
            reveal() {
                if (!layer.isConnected) return;
                layer.style.pointerEvents = "none";
                play(layer, [{opacity:1}, {opacity:0}], {duration:420, easing:"ease-out"}).finished.then(dispose, dispose);
            },
            dispose
        };
    } catch {
        dispose();
        return;
    }
}
