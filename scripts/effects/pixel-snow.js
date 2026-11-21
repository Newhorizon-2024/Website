import { createSummitCuePlayer } from "../music-controls/summit-accents.js?v=26.11.21.9";

// Draw on a two-CSS-pixel grid so drift, crystals and settled snow share a palette.
const panelSelector = "#settings-section, #navbar, .site-panel, .work-post";
const bankHeight = 9;
const summitDepth = 24;
const patterns = [
    ["@"],
    [".x.", "x@x", ".x."],
    ["..x..", "x.o.x", ".o@o.", "x.o.x", "..x.."],
    ["...x...", ".x.o.x.", "..ooo..", "xoo@oox", "..ooo..", ".x.o.x.", "...x..."]
];
const ink = {x:"#89959f", o:"#c8d4db", "@":"#f3f7fa"};
let weather = null;
let removal = null;

function makeSprite(pattern) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = pattern.length;
    const ctx = sprite.getContext("2d");
    pattern.forEach((row,y) => Array.from(row).forEach((cell,x) => {
        if (cell === ".") return;
        ctx.fillStyle = ink[cell];
        ctx.fillRect(x,y,1,1);
    }));
    return sprite;
}

function createDrifts(width) {
    const count = Math.max(1,Math.min(6,Math.round(width/76)));
    return Array.from({length:count}, (_,i) => ({
        center:(i+.34+Math.random()*.32)/count,
        radius:(.32+Math.random()*.14)/count,
        height:2.3+Math.random()*1.7,
        fill:Math.random()*.48,
        period:7+Math.random()*7
    }));
}

function paintLedge(ledge, depth, full = false) {
    const {canvas,brush,seed,width,drifts} = ledge;
    if (!width) return;
    const growth = depth/summitDepth;
    const bridge = Math.max(0,(growth-.30)/.70);
    brush.clearRect(0,0,width,bankHeight);
    for (let x=0; x<width; x++) {
        const edge = Math.max(0,Math.min(1,(x-2)/5,(width-x-3)/5));
        const grain = Math.sin((x+1)*127.1+seed)*43758.55;
        const profile = 1.0 + 1.35*Math.sin(x*.043+seed) + .85*Math.cos(x*.11-seed)
            + .45*Math.sin(x*.27+seed*2);
        let pile = Math.max(0,profile)*growth + 2.1*bridge + (grain-Math.floor(grain))*.65;
        for (const drift of drifts) {
            const distance = (x/width-drift.center)/drift.radius;
            if (Math.abs(distance)<1) {
                pile += (1-distance*distance)*drift.height*(full ? 1 : drift.fill)*growth;
            }
        }
        const base = bridge>.8 && x>=4 && x<width-4 ? 1 : 0;
        pile = Math.max(base,Math.min(bankHeight,Math.floor(pile*edge)));
        if (!pile) continue;
        const top = bankHeight-pile;
        brush.fillStyle = "#929fae";
        brush.fillRect(x,top,1,pile);
        brush.fillStyle = "#dce5ea";
        brush.fillRect(x,top,1,Math.max(1,pile-1));
        if ((x+Math.floor(seed))%4 !== 0) {
            brush.fillStyle = "#fafcff";
            brush.fillRect(x,top,1,1);
        }
    }
}

// Keep only pixels that actually left this part of the silhouette.
function releaseDrift(ledge, drift, depth, onScreen) {
    const {canvas,bank,width} = ledge;
    let fragment, brush;
    const left = Math.max(0,Math.floor(width*(drift.center-drift.radius)));
    const right = Math.min(width,Math.ceil(width*(drift.center+drift.radius)));
    const span = right-left;
    if (onScreen && span>0) {
        fragment = document.createElement("canvas");
        fragment.className = "pixel-snow-fragment";
        fragment.width = span;
        fragment.height = bankHeight;
        brush = fragment.getContext("2d");
        brush?.drawImage(canvas,left,0,span,bankHeight,0,0,span,bankHeight);
    }
    drift.fill = 0;
    drift.period = 7+Math.random()*7;
    paintLedge(ledge,depth);
    if (!brush) return;
    brush.globalCompositeOperation = "destination-out";
    brush.drawImage(canvas,left,0,span,bankHeight,0,0,span,bankHeight);
    fragment.style.left = 100*left/width+"%";
    fragment.style.width = 100*span/width+"%";
    bank.append(fragment);
    const sideways = (Math.random()-.5)*15;
    const drop = 25+Math.random()*25;
    const turn = (Math.random()-.5)*12;
    const fall = fragment.animate([
        {transform:"none",opacity:1,easing:"cubic-bezier(.4,0,.75,.55)"},
        {transform:"translate("+sideways*.35+"px,"+drop*.4+"px) rotate("+turn*.5+"deg)",opacity:.93,offset:.65},
        {transform:"translate("+sideways+"px,"+drop+"px) rotate("+turn+"deg)",opacity:0}
    ],{duration:680+Math.random()*240,easing:"linear"});
    fall.finished.then(()=>fragment.remove(),()=>fragment.remove());
}

// A short weighted window follows musical phrases; interpolation also works after a seek.
function phraseLevel(score, time) {
    if (!score) return 0;
    const position = Math.max(0,Math.min(1,time/score.duration))*(score.peaks.length-1);
    const index = Math.floor(position);
    const fraction = position-index;
    let sum = 0;
    for (let offset=-3; offset<=3; offset++) {
        const i = Math.min(score.peaks.length-1,Math.max(0,index+offset));
        const next = Math.min(score.peaks.length-1,Math.max(0,index+offset+1));
        sum += (4-Math.abs(offset))*(score.peaks[i]*(1-fraction)+score.peaks[next]*fraction);
    }
    return sum/(16*255);
}

function createSnowfall(sky, ctx, audio, score, bands) {
    const sprites = patterns.map(makeSprite);
    const flakes = [];
    const sectors = new Uint16Array(8);
    let baseCount = 0, covered = false, storm = 0, mist = null;
    let wind = 0, mids = 0, glint = 0;

    function snowflake() {
        const draw = Math.random();
        const level = draw < .52 ? 0 : draw < .83 ? 1 : draw < .96 ? 2 : 3;
        return {level,x:Math.random(),y:0,phase:Math.random()*Math.PI*2,
            speed:(.115+level*.043)*(.85+Math.random()*.34)};
    }

    function enter(flake, upwind) {
        if (upwind) {
            flake.x = -(sprites[flake.level].width+1)/sky.width;
            flake.y = Math.random();
        } else {
            flake.x = Math.random();
            flake.y = -(sprites[flake.level].height+1)/sky.height;
        }
    }

    function resize(w,h) {
        sky.width = Math.max(1,Math.ceil(w/2));
        sky.height = Math.max(1,Math.ceil(h/2));
        baseCount = Math.min(180,Math.max(42,Math.round(sky.width*sky.height/1150)));
        const missing = baseCount-flakes.length;
        for (let i=0;i<missing;i++) {
            const flake = snowflake();
            enter(flake,false);
            flake.y -= (i+Math.random())/missing;
            flakes.push(flake);
        }
        mist = ctx.createLinearGradient(0,0,sky.width,sky.height*.32);
        mist.addColorStop(0,"#a8b8c2");
        mist.addColorStop(.64,"rgba(168,184,194,0)");
    }

    function draw(dt,elapsed,still=false) {
        if (!baseCount) return false;
        const {width,height} = sky;
        const level = phraseLevel(score,audio.currentTime);
        const normalized = Math.max(0,Math.min(1,(level-.72)/.19));
        const target = normalized*normalized*(3-2*normalized);
        const follow = (value,to,seconds) => value+(to-value)*(1-Math.exp(-dt/seconds));
        storm = follow(storm,target,target>storm ? 1.6 : 3.2);
        wind = follow(wind,bands.bass,.55);
        mids = follow(mids,bands.mid,.4);
        glint = follow(glint,bands.high,.24);
        const gust = .65+.23*Math.sin(elapsed*.81)+.12*Math.sin(elapsed*1.87+.5);
        const desired = Math.min(360,Math.round(baseCount*(.56+.48*level+1.18*storm)));
        if (dt>0 && flakes.length<desired) {
            const flake = snowflake();
            enter(flake,covered && storm>.25 && Math.random()<.65);
            flakes.push(flake);
        }
        ctx.clearRect(0,0,width,height);
        if (!still && storm>.02) {
            ctx.globalAlpha = .075*storm*gust;
            ctx.fillStyle = mist;
            ctx.fillRect(0,0,width,height);
        }
        sectors.fill(0);
        let bottomReached = false;
        for (let i=flakes.length-1;i>=0;i--) {
            const f = flakes[i], sprite = sprites[f.level];
            if (still) {
                // Stable static composition, independent of the animated entrance.
                ctx.globalAlpha = .36+f.level*.14;
                ctx.drawImage(sprite,Math.floor(f.x*width),Math.floor((f.phase/(2*Math.PI))*height));
                continue;
            }
            const fall = f.speed*(.83+.42*level+.23*mids+.60*storm);
            const drift = fall*(.17+.15*Math.sin(elapsed*.65+f.phase)+.20*wind
                +storm*(1.25+.75*gust+.60*wind));
            f.y += dt*fall;
            f.x += dt*drift*height/width;
            if (f.y>1 || f.x>1) {
                if (flakes.length>desired) { flakes.splice(i,1); continue; }
                if (f.y<=1) f.x = -(sprite.width+1)/width;
                else enter(f,covered && Math.random()<storm*.55);
                continue;
            }
            if (f.y*height<=-sprite.height || f.x*width<=-sprite.width) continue;
            const x = Math.floor(f.x*width), y = Math.floor(f.y*height);
            if (f.y>.93) bottomReached = true;
            if (f.y>=0 && f.x>=0) sectors[Math.min(3,Math.floor(f.y*4))*2+Math.min(1,Math.floor(f.x*2))]++;
            if (f.level>0 && storm>.18) {
                // Short stepped trails stay on the same two-pixel grid as the crystals.
                const trail = Math.round(storm*(1.5+f.level)*gust);
                ctx.globalAlpha = storm*.20;
                ctx.drawImage(sprite,x-trail,y-Math.ceil(trail*.48));
            }
            ctx.globalAlpha = Math.min(.98,.40+f.level*.14+glint*(f.level ? .27 : .08));
            ctx.drawImage(sprite,x,y);
        }
        if (!still && !covered) covered = bottomReached && sectors.every(count=>count>=Math.max(1,Math.floor(baseCount*.013)));
        ctx.globalAlpha = 1;
        return covered;
    }
    return {resize,draw};
}

function makeWeather(audio, score, bands) {
    const sky = document.createElement("canvas");
    sky.className = "pixel-snow-sky";
    sky.setAttribute("aria-hidden","true");
    const ctx = sky.getContext("2d");
    if (!ctx) return;
    document.body.append(sky);
    const snowfall = createSnowfall(sky,ctx,audio,score,bands);
    const accents = createSummitCuePlayer(score?.path);
    const ledges = new Map();
    const visiblePanels = new Set();
    let frame = 0, last = 0, elapsed = 0, depth = 0, settledTime = 0, sincePaint = 0, mode = "";

    // The external bank shares the section and the panel's transform, including
    // the pivot used when a tall card tilts. Its bottom edge is the panel top.
    function placeLedges() {
        const placements = [];
        for (const panel of visiblePanels) {
            const width = panel.offsetWidth;
            if (!width) continue;
            const style = getComputedStyle(panel);
            const [ox,oy,oz="0px"] = style.transformOrigin.split(" ");
            placements.push({ledge:ledges.get(panel),width,x:panel.offsetLeft,y:panel.offsetTop-2*bankHeight,
                transform:style.transform,origin:ox+" "+(parseFloat(oy)+2*bankHeight)+"px "+oz});
        }
        for (const {ledge,width,x,y,transform,origin} of placements) {
            const {canvas,bank} = ledge;
            const position = x+"px "+y+"px";
            if (position !== ledge.position) { bank.style.translate = position; ledge.position = position; }
            if (origin !== ledge.origin) { bank.style.transformOrigin = origin; ledge.origin = origin; }
            if (transform !== ledge.transform) { bank.style.transform = transform; ledge.transform = transform; }
            if (width !== ledge.cssWidth) {
                ledge.cssWidth = width;
                bank.style.width = width+"px";
                ledge.width = canvas.width = Math.ceil(width/2);
                if (!ledge.drifts.length) ledge.drifts = createDrifts(ledge.width);
                paintLedge(ledge,mode === "still" ? summitDepth : depth,mode === "still");
            }
        }
    }
    const visibility = new IntersectionObserver(entries => {
        for (const {target,isIntersecting} of entries) {
            const ledge = ledges.get(target);
            if (isIntersecting) {
                visiblePanels.add(target);
                paintLedge(ledge,mode === "still" ? summitDepth : depth,mode === "still");
            } else {
                visiblePanels.delete(target);
            }
            ledge.bank.style.visibility = isIntersecting ? "visible" : "hidden";
        }
        placeLedges();
    }, {rootMargin:"56px"});
    const sizes = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === sky) {
                if (entry.contentRect.width && entry.contentRect.height) {
                    snowfall.resize(entry.contentRect.width,entry.contentRect.height);
                    snowfall.draw(0,elapsed,mode === "still");
                }
            }
        }
        placeLedges();
    });
    sizes.observe(sky);
    for (const panel of document.querySelectorAll(panelSelector)) {
        const bank = document.createElement("div");
        bank.className = "pixel-snow-bank";
        bank.setAttribute("aria-hidden","true");
        bank.style.height = 2*bankHeight+"px";
        const canvas = document.createElement("canvas");
        canvas.className = "pixel-snow-ledge";
        canvas.height = bankHeight;
        const brush = canvas.getContext("2d");
        if (!brush) continue;
        bank.append(canvas);
        ledges.set(panel,{panel,bank,canvas,brush,width:0,drifts:[],nextRelease:14+Math.random()*4,seed:Math.random()*80});
        panel.before(bank);
        sizes.observe(panel);
        sizes.observe(panel.parentElement);
        visibility.observe(panel);
    }

    function accumulate(dt) {
        depth = Math.min(summitDepth,settledTime*.62);
        for (const panel of visiblePanels) {
            const ledge = ledges.get(panel);
            if (!ledge.width) continue;
            for (const drift of ledge.drifts) drift.fill = Math.min(1,drift.fill+dt/drift.period);
            paintLedge(ledge,depth);
            if (depth<summitDepth || elapsed<ledge.nextRelease) continue;
            const ripe = ledge.drifts.find(drift => drift.fill>=1);
            if (!ripe) continue;
            const rect = ledge.bank.getBoundingClientRect();
            releaseDrift(ledge,ripe,depth,rect.bottom>=-45 && rect.top<innerHeight);
            ledge.nextRelease = elapsed+1.7+Math.random()*1.9;
        }
    }
    function tick(now) {
        if (!last || now-last >= 32) {
            const dt = last ? Math.min(.15,(now-last)/1000) : 0;
            last = now;
            placeLedges();
            if (mode === "fall") {
                elapsed += dt;
                accents?.advance(audio);
                if (snowfall.draw(dt,elapsed)) {
                    settledTime += dt;
                    sincePaint += dt;
                    if (sincePaint>=.5) {
                        accumulate(sincePaint);
                        sincePaint = 0;
                    }
                }
            }
        }
        frame = requestAnimationFrame(tick);
    }
    return {
        setMode(next) {
            if (mode === next) return;
            mode = next;
            if (mode !== "fall") accents?.reset();
            const fading = mode === "fade" || mode === "park";
            sky.classList.toggle("is-snow-fading",fading);
            for (const {bank} of ledges.values()) {
                bank.classList.toggle("is-snow-fading",fading);
                for (const part of bank.querySelectorAll(".pixel-snow-fragment")) {
                    for (const animation of part.getAnimations()) {
                        if (mode === "still") animation.cancel();
                        else if (mode === "suspend" || mode === "park" || mode === "fade") animation.pause();
                        else animation.play();
                    }
                }
            }
            cancelAnimationFrame(frame);
            last = 0;
            if (mode === "fall" || mode === "fade") frame = requestAnimationFrame(tick);
            if (mode === "fall") {
                for (const panel of visiblePanels) paintLedge(ledges.get(panel),depth);
            }
            if (mode === "still") {
                snowfall.draw(0,elapsed,true);
                for (const ledge of ledges.values()) paintLedge(ledge,summitDepth,true);
            }
        },
        remove() {
            cancelAnimationFrame(frame);
            sizes.disconnect();
            visibility.disconnect();
            sky.remove();
            for (const {bank} of ledges.values()) {
                for (const animation of bank.getAnimations({subtree:true})) animation.cancel();
                bank.remove();
            }
        }
    };
}

export function syncPixelSnow(selected, playing, hidden, reduced, audio, score, bands) {
    // Pauses retain the flake positions and snowbanks; leaving the track releases them.
    if (!selected) {
        if (!weather) return;
        clearTimeout(removal);
        const retired = weather;
        weather = null;
        retired.setMode("fade");
        if (hidden) retired.remove();
        else setTimeout(()=>retired.remove(),560);
        removal = null;
        return;
    }
    if (!weather && playing && !hidden) weather = makeWeather(audio,score,bands);
    if (!weather) return;
    if (hidden || playing) {
        clearTimeout(removal);
        removal = null;
        weather.setMode(hidden ? (playing ? "suspend" : "park") : reduced ? "still" : "fall");
    } else if (removal === null) {
        weather.setMode("fade");
        const parked = weather;
        removal = setTimeout(()=>{ parked.setMode("park"); },560);
    }
}
