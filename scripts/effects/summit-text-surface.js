// Range geometry follows the DOM. Canvas metrics trim the transparent font leading.
const inkCanvas = document.createElement("canvas");
const ctx = inkCanvas.getContext("2d",{willReadFrequently:true});
const cache = new WeakMap();
let fontRevision = 0;
document.fonts?.addEventListener("loadingdone", () => { fontRevision++; });

export function textSurface(el, style, footRadius) {
    const node = el.firstChild;
    if (!ctx || node?.nodeType !== Node.TEXT_NODE) return null;
    const text = node.data;
    const range = document.createRange();
    range.selectNodeContents(node);
    const line = range.getBoundingClientRect();
    if (!line.width || !line.height) return null;
    const font = [style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(" ");
    const key = [fontRevision,font,style.letterSpacing,text,line.width,line.height].join("|");
    let record = cache.get(el);
    if (key !== record?.key) {
        inkCanvas.width = Math.ceil(line.width) + 2;
        inkCanvas.height = Math.ceil(line.height) + 2;
        ctx.font = font;
        const glyphs = [];
        let offset = 0;
        for (const ch of text) {
            const start = offset;
            offset += ch.length;
            if (!ch.trim()) continue;
            range.setStart(node,start); range.setEnd(node,offset);
            const r = range.getBoundingClientRect(), ink = ctx.measureText(ch);
            if (!r.width || ink.width <= 0) continue;
            const sx = r.width/ink.width;
            const sy = r.height/(ink.fontBoundingBoxAscent+ink.fontBoundingBoxDescent);
            if (!Number.isFinite(sy)) return null;
            const baseline = r.top-line.top + ink.fontBoundingBoxAscent*sy;
            ctx.setTransform(sx,0,0,sy,1+r.left-line.left,1+baseline);
            ctx.fillText(ch,0,0);
            glyphs.push({left:r.left-line.left-ink.actualBoundingBoxLeft*sx,
                right:r.left-line.left+ink.actualBoundingBoxRight*sx,
                top:baseline-ink.actualBoundingBoxAscent*sy, bottom:baseline+ink.actualBoundingBoxDescent*sy});
        }
        if (!glyphs.length) return null;
        // Sample once per text/font/size change. A foot over the side of a rounded
        // digit can sit lower than a foot over its apex.
        const {width,height} = inkCanvas;
        const pixels = ctx.getImageData(0,0,width,height).data;
        const tops = new Float32Array(width).fill(Infinity);
        for (let x=0; x<width; x++) {
            for (let y=0; y<height; y++) {
                if (pixels[(y*width+x)*4+3] >= 48) { tops[x] = y-1; break; }
            }
        }
        record = {key,glyphs,tops,left:Math.min(...glyphs.map(g=>g.left)),right:Math.max(...glyphs.map(g=>g.right)),
            top:Math.min(...glyphs.map(g=>g.top)),bottom:Math.max(...glyphs.map(g=>g.bottom))};
        cache.set(el,record);
    }
    return {id:el, left:line.left+record.left, right:line.left+record.right,
        top:line.top+record.top, bottom:line.top+record.bottom, inkTop(x) {
            const at = x-line.left;
            let minTop = Infinity, nearest, best = Infinity;
            const first = Math.max(0,Math.floor(at-footRadius)+1);
            const last = Math.min(record.tops.length-1,Math.ceil(at+footRadius));
            for (let i=first; i<=last; i++) minTop = Math.min(minTop,record.tops[i]);
            if (Number.isFinite(minTop)) return line.top+minTop;
            for (const g of record.glyphs) {
                const d = Math.max(0,g.left-at,at-g.right);
                if (d < best) {best=d;nearest=g;}
                if (d <= footRadius) minTop = Math.min(minTop,g.top);
            }
            return line.top + (Number.isFinite(minTop) ? minTop : nearest.top);
        }};
}
