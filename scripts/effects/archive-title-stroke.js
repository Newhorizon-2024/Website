/* 使用原文字的换行、字距和基线绘制临时描边层。结束后还原原生标题。 */
const ns = "http://www.w3.org/2000/svg";
const motion = matchMedia("(prefers-reduced-motion: reduce)");

export function drawArchiveTitle(heading) {
    if (!heading || motion.matches || !heading.animate || heading.childElementCount) return;
    const node = heading.firstChild;
    if (node?.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
    const style = getComputedStyle(heading);
    const size = parseFloat(style.fontSize);
    const paint = document.createElement("span");
    paint.setAttribute("aria-hidden", "true");
    paint.className = "archive-stroke-paint";
    const svg = document.createElementNS(ns, "svg");
    svg.style.cssText = "display:block;width:100%;height:100%;overflow:visible;font:inherit;letter-spacing:inherit";
    const outline = document.createElementNS(ns, "g");
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "currentColor");
    outline.setAttribute("stroke-width", String(Math.max(.8, size * .017)));
    outline.setAttribute("stroke-linejoin", "round");
    svg.append(outline);
    // SVG 中的字符不会重复计入标题文本、检索或读屏名称。
    paint.attachShadow({mode:"open"}).append(svg);
    const ink = document.createElement("span");
    ink.className = "archive-stroke-ink";
    node.replaceWith(ink);
    ink.append(node);
    heading.append(paint);
    heading.classList.add("is-stroking");
    const animations = [];
    let done = false;
    function finish() {
        if (done) return;
        done = true;
        animations.forEach(animation => animation.cancel());
        paint.remove();
        ink.replaceWith(node);
        heading.classList.remove("is-stroking");
        window.removeEventListener("resize", finish);
    }
    // 将实际排版后的每个字定位回本地 SVG 坐标，窄屏换行及标题缩放也一致。
    const ctm = svg.getScreenCTM();
    if (!ctm || !ctm.a || !ctm.d) { finish(); return; }
    const inverse = ctm.inverse(), range = document.createRange();
    let offset = 0, index = 0;
    for (const char of node.data) {
        range.setStart(node, offset);
        offset += char.length;
        range.setEnd(node, offset);
        if (!char.trim()) continue;
        const rect = range.getBoundingClientRect();
        const point = new DOMPoint(rect.left, rect.top).matrixTransform(inverse);
        const glyph = document.createElementNS(ns, "text");
        glyph.textContent = char;
        outline.append(glyph);
        const box = glyph.getExtentOfChar(0);
        glyph.setAttribute("x", String(point.x - box.x));
        glyph.setAttribute("y", String(point.y - box.y));
        const dash = size * 7;
        glyph.setAttribute("stroke-dasharray", String(dash));
        animations.push(glyph.animate([{ strokeDashoffset: dash }, { strokeDashoffset: 0 }],
            { duration:1600, delay:index++ * 50, easing:"cubic-bezier(.22,.72,.25,1)", fill:"both" }));
    }
    const wipe = ink.animate([{clipPath:"inset(-.4em 100% -.4em -.4em)"}, {clipPath:"inset(-.4em)"}],
        {duration:450, delay:1400, easing:"ease-in-out", fill:"both"});
    animations.push(wipe);
    wipe.onfinish = finish;
    window.addEventListener("resize", finish);
    return finish;
}
