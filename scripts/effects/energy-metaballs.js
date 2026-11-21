// 取参考效果的反平方叠加场，在阈值处生成矢量轮廓。两种能量共用同一套融合规则。
import {createWaterCapture} from './energy-water.js?v=26.11.20.2';
const STEP = 5, COLS = 65, ROWS = 53;
const WIDTH = (COLS - 1) * STEP, HEIGHT = (ROWS - 1) * STEP;
const EDGES = [[], [3, 0], [0, 1], [3, 1], [1, 2], null, [0, 2], [3, 2],
    [2, 3], [0, 2], null, [1, 2], [1, 3], [0, 1], [3, 0], []];

function sampleField(values, balls) {
    // 常量及椭圆变换只按球计算一次，不在采样点内做三角运算。
    values.fill(0);
    for (const { x, y, radius, stretch, angle } of balls) {
        const c = Math.cos(angle), s = Math.sin(angle), k = stretch * stretch;
        const xx = c*c/k + s*s*k, yy = s*s/k + c*c*k, xy = 2*c*s*(1/k-k);
        const mass = radius * radius;
        for (let row = 0, i = 0; row < ROWS; row++) {
            const dy = row * STEP - y, cross = xy * dy, vertical = yy * dy * dy;
            for (let col = 0; col < COLS; col++, i++) {
                const dx = col * STEP - x;
                values[i] += mass / Math.max(1, xx*dx*dx + cross*dx + vertical);
            }
        }
    }
}

// 邻格共享边的编号，合并和分裂时也能拼出闭合路径。鞍点按双线性场决定连通方向。
function outline(values) {
    const points = new Map();
    function crossing(id) {
        if (points.has(id)) return points.get(id);
        const i = Math.floor(id / 2), vertical = id % 2;
        const next = i + (vertical ? COLS : 1);
        const t = (1 - values[i]) / (values[next] - values[i]);
        const x = (i % COLS + (vertical ? 0 : t)) * STEP;
        const y = (Math.floor(i / COLS) + (vertical ? t : 0)) * STEP;
        const point = { xy: `${x.toFixed(1)} ${y.toFixed(1)}`, links: [], used: false };
        points.set(id, point);
        return point;
    }
    for (let row = 0; row < ROWS - 1; row++) {
        for (let col = 0; col < COLS - 1; col++) {
            const i = row*COLS + col, j = i + COLS;
            const a = values[i]-1, b = values[i+1]-1, c = values[j+1]-1, d = values[j]-1;
            const mask = (a>0 ? 1:0) | (b>0 ? 2:0) | (c>0 ? 4:0) | (d>0 ? 8:0);
            if (!mask || mask === 15) continue;
            const edges = [2*i, 2*(i+1)+1, 2*j, 2*i+1];
            const pairs = EDGES[mask] ?? (a*c > b*d ? [0,1,2,3] : [0,3,1,2]);
            for (let n = 0; n < pairs.length; n += 2) {
                const first = crossing(edges[pairs[n]]), second = crossing(edges[pairs[n+1]]);
                first.links.push(second);
                second.links.push(first);
            }
        }
    }
    let path = '';
    for (const start of points.values()) {
        if (start.used) continue;
        let point = start, command = 'M';
        do {
            path += command + point.xy;
            command = 'L';
            point.used = true;
            point = point.links.find(p => !p.used);
        } while (point);
        path += 'Z';
    }
    return path;
}

function drawPlate(plate, dt = 0) {
    const t = plate.time * .38, {sin, cos} = Math;
    function ball(x, y, radius, stretch = 1, angle = 0) {
        const dx = plate.x - x, dy = plate.y - y;
        const pull = plate.pull * .15 * Math.exp(-(dx*dx + dy*dy) / 6800);
        return {x: x + dx*pull, y: y + dy*pull, radius, stretch, angle};
    }
    const balls = plate.physical ? [
        ball(114 + 13*sin(t), 144 + 9*cos(t), 33, 1.38, -.31),
        ball(201 + 32*cos(t), 112 - 8*sin(t), 30, 1.26, -.35),
        ball(80 - 18*cos(t*.78), 162 + 10*sin(t*.78), 15, 1.15, -.37),
        ball(242 + 12*sin(t*.69), 79 + 13*cos(t*.69), 12),
        ball(264 - 9*sin(t*.91), 63 + 10*cos(t*.91), 5.5)
    ] : [
        ball(144 + 9*sin(t*.9), 148 + 13*cos(t*.8), 36 + 3*sin(t), 1.12, .73),
        ball(194 + 15*cos(t*.83), 96 - 15*sin(t*.83), 25 - 2*sin(t), 1.12, -.76),
        ball(103 - 18*cos(t*.85), 103 + 20*sin(t*.85), 21, 1.08, .8),
        ball(89 + 11*sin(t*.8), 168 + 11*cos(t*.8), 12),
        ball(207 + 10*cos(t*.57), 174 + 13*sin(t*.57), 9)
    ];
    if (plate.physical) plate.water.update(plate, balls, dt);
    else plate.shine.setAttribute('opacity',plate.white);
    sampleField(plate.values, balls);
    plate.path.setAttribute('d', outline(plate.values));
}

function createPlate(host, kind) {
    const physical = kind === 'physical', prefix = `energy-${kind}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.setAttribute('class', `energy-field__${kind}`);
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = `<defs>
        <linearGradient id="${prefix}-body" x2="${physical ? '36%' : '80%'}" y2="100%">
            <stop stop-color="#eee" stop-opacity=".23"/><stop offset=".22" stop-color="#bababc" stop-opacity=".10"/>
            <stop offset=".57" stop-color="#77777a" stop-opacity=".055"/><stop offset="1" stop-color="#ddd" stop-opacity=".13"/>
        </linearGradient>
        <linearGradient id="${prefix}-rim" x2="75%" y2="100%">
            <stop stop-color="#fff" stop-opacity=".55"/><stop offset=".36" stop-color="#ddd" stop-opacity=".13"/>
            <stop offset=".72" stop-color="#aaa" stop-opacity=".06"/><stop offset="1" stop-color="#eee" stop-opacity=".40"/>
        </linearGradient></defs>
        <path fill="url(#${prefix}-body)" fill-rule="evenodd" stroke="url(#${prefix}-rim)" stroke-width="1.15" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
    const path = svg.querySelector('path');
    let shine;
    if (!physical) {
        path.id = 'energy-vital-surface';
        // Reuse geometry only, not the body gradient from the original path.
        svg.querySelector('defs').insertAdjacentHTML('beforeend','<clipPath id="energy-vital-clip"><use href="#energy-vital-surface"/></clipPath>');
        svg.insertAdjacentHTML('beforeend','<rect width="320" height="260" clip-path="url(#energy-vital-clip)" fill="#fff" opacity="0"/>');
        shine = svg.lastElementChild;
    }
    host.append(svg);
    return {physical, svg, path: svg.querySelector('path'), values: new Float32Array(COLS*ROWS),
        time: physical ? 4.5 : 1.6, x: WIDTH/2, y: HEIGHT/2, targetX: WIDTH/2, targetY: HEIGHT/2,
        pull: 0, targetPull: 0, visible: false, drawn: false, water:physical ? createWaterCapture() : null, white:0, shine};
}

export function initializeEnergyField() {
    const section = document.getElementById('energy-section');
    const host = section?.querySelector('.energy-field');
    if (!host || host.childElementCount) return;
    const plates = ['physical', 'vital'].map(kind => createPlate(host, kind));
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, suspended = false;
    const onscreen = () => !suspended && !document.hidden && section.classList.contains('is-active') && plates.some(p => p.visible);
    const cursor = new DOMPoint();
    let pointer=null;
    function locate(p){
        const r=p.svg.getBoundingClientRect();
        p.targetPull=Number(!!pointer && r.width>0 && r.height>0 && pointer.x>=r.left && pointer.x<=r.right && pointer.y>=r.top && pointer.y<=r.bottom);
        if(p.targetPull){p.targetX=WIDTH*(pointer.x-r.left)/r.width;p.targetY=HEIGHT*(pointer.y-r.top)/r.height;}
    }
    function hoverWhite(p){
        cursor.x=p.targetX;cursor.y=p.targetY;
        return p.targetPull && p.path.isPointInFill(cursor) ? 1 : 0;
    }
    function clearWhite(p){p.white=0;p.shine?.setAttribute('opacity',0);}

    function tick(now) {
        frame = 0;
        if (!onscreen() || motion.matches) return;
        const elapsed = now - last;
        if (!last || elapsed >= 1000/24 - 1) {
            const dt = last ? Math.min(elapsed / 1000, .08) : 0;
            last = now;
            const follow = 1 - Math.exp(-5*dt);
            for (const p of plates) {
                if (!p.visible) continue;
                p.time += dt;
                p.x += (p.targetX - p.x) * follow;
                p.y += (p.targetY - p.y) * follow;
                p.pull += (p.targetPull - p.pull) * follow;
                if(p.shine){
                    const target=hoverWhite(p);
                    p.white+=(target-p.white)*(1-Math.exp(-dt*(target?12:8)));
                    if(Math.abs(p.white-target)<.008)p.white=target;
                }
                drawPlate(p,dt);
                p.drawn = true;
            }
        }
        frame = requestAnimationFrame(tick);
    }

    function sync() {
        const physical=plates[0];
        if (!section.classList.contains('is-active') || motion.matches || (!document.hidden && !suspended && !physical.visible))
            physical.water.clear();
        if (!onscreen() || motion.matches) {
            cancelAnimationFrame(frame); frame = 0; last = 0;
            for (const p of plates) {
                p.pull = p.targetPull = 0;
                if (onscreen() && p.visible) {
                    if(!p.drawn){drawPlate(p);p.drawn=true;}
                    if(p.shine){locate(p);p.white=hoverWhite(p);p.shine.setAttribute('opacity',p.white);}
                } else clearWhite(p);
            }
            if (!onscreen())pointer=null;
        } else if (!frame) frame = requestAnimationFrame(tick);
    }
    const view = new IntersectionObserver(entries => {
        for (const entry of entries) {
            const p = plates.find(p => p.svg === entry.target);
            p.visible = entry.isIntersecting;
            if (!p.visible) { p.pull = p.targetPull = 0; clearWhite(p); }
        }
        sync();
    });
    plates.forEach(p => view.observe(p.svg));
    const sections = new MutationObserver(sync);
    sections.observe(section, {attributes: true, attributeFilter: ['class']});
    const events = new AbortController();
    const options = {passive: true, signal: events.signal};
    function release() { pointer=null; plates.forEach(p => { p.targetPull = 0; if(motion.matches)clearWhite(p); }); }
    function updateHover(){
        for (const p of plates) {
            if (!p.visible) continue;
            locate(p);
            if (p.shine && motion.matches){p.white=hoverWhite(p);p.shine.setAttribute('opacity',p.white);}
        }
    }
    section.addEventListener('pointermove', e => {
        if(e.pointerType!=='mouse'){release();return;}
        if(!onscreen())return;
        pointer={x:e.clientX,y:e.clientY};updateHover();
    }, options);
    section.addEventListener('pointerleave', release, options);
    window.addEventListener('blur', release, options);
    const trackViewport=()=>{if(pointer && onscreen())updateHover();};
    window.addEventListener('scroll', trackViewport, options);
    window.addEventListener('resize', trackViewport, options);
    document.addEventListener('visibilitychange', sync, options);
    motion.addEventListener('change', sync, options);
    window.addEventListener('pageshow', () => { suspended = false; sync(); }, options);
    window.addEventListener('pagehide', e => {
        suspended = true; sync();
        if (!e.persisted) { plates[0].water.clear(); view.disconnect(); sections.disconnect(); events.abort(); }
    }, options);
}
