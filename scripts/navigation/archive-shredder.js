/* 原链接留在网格中，拖动和碎纸只绘制它的文字副本。 */
export function initializeArchiveShredder(index, list) {
    const slot = document.createElement("div");
    slot.className = "archive-slit";
    slot.setAttribute("aria-hidden", "true");
    list.after(slot);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let drag = null, suppress = false;
    const fragments = new Set();

    for (const link of list.querySelectorAll("a")) {
        link.draggable = false;
        link.setAttribute("aria-keyshortcuts", "Delete");
        const grip = document.createElement("i");
        grip.className = "archive-grip";
        grip.setAttribute("aria-hidden", "true");
        link.append(grip);
    }
    function copy(link, rect) {
        const sheet = document.createElement("div");
        sheet.className = "archive-sheet";
        sheet.setAttribute("aria-hidden", "true");
        sheet.append(link.firstElementChild.cloneNode(true), link.querySelector("small").cloneNode(true));
        Object.assign(sheet.style, {width: rect.width+"px", height: rect.height+"px", left: rect.left+"px", top: rect.top+"px"});
        document.body.append(sheet);
        return sheet;
    }
    function feed(link, x) {
        if (link.classList.contains("is-feeding")) return;
        const rect = link.getBoundingClientRect(), line = slot.getBoundingClientRect();
        const left = Math.max(line.left, Math.min(x - rect.width / 2, line.right - rect.width));
        link.classList.add("is-feeding");
        setTimeout(() => link.classList.remove("is-feeding"), motion.matches ? 240 : 1000);
        if (motion.matches) return;
        const model = copy(link, {width:rect.width, height:rect.height, left, top:line.top + line.height / 2 - rect.height});
        model.remove();
        const count = Math.max(7, Math.min(16, Math.round(rect.width / 19)));
        for (let i = 0; i < count; i++) {
            const strip = model.cloneNode(true);
            strip.style.clipPath = "inset(0 " + ((count-i-1)*100/count+.12) + "% 0 " + (i*100/count) + "%)";
            strip.style.transformOrigin = ((i+.5)*100/count)+"% 100%";
            document.body.append(strip);
            fragments.add(strip);
            const side = (i + .5) / count - .5;
            const dx = Math.round(side * 41), dy = 65 + Math.random() * 42;
            const size = Math.min(12, rect.width / count * .73);
            const center = (i + .5) * rect.width / count;
            const square = "inset(" + (rect.height - size) / 2 + "px " + (rect.width - center - size / 2) +
                "px " + (rect.height - size) / 2 + "px " + (center - size / 2) + "px)";
            const slice = strip.style.clipPath;
            const fall = strip.animate([
                { transform:"translateY(0)", opacity:.94, clipPath:slice },
                { transform:"translateY(24px)", opacity:1, clipPath:slice, offset:.31 },
                { transform:"translate("+ dx +"px,"+ dy +"px)", opacity:.88, clipPath:square, backgroundColor:"#888" }
            ], {duration:520+Math.random()*170, delay:i*9, fill:"both", easing:"cubic-bezier(.38,0,.7,.76)"});
            fall.onfinish = () => {
                if (fragments.delete(strip) && !document.hidden && index.open && !motion.matches) {
                    window.NewHorizonBackgroundCubes?.releasePaperCube(left + center + dx,
                        line.top + line.height / 2 - rect.height / 2 + dy, size);
                }
                strip.remove();
            };
        }
    }
    function end(drop = false) {
        if (!drag) return;
        const {link, sheet, id, x, y} = drag;
        drag = null;
        if (sheet) {
            const line = slot.getBoundingClientRect();
            if (drop && x >= line.left && x <= line.right && y >= line.top - 6 && y <= line.bottom + 80) feed(link,x);
            sheet.remove();
            link.classList.remove("is-lifted");
        }
        index.classList.remove("is-shredding");
        if (link.hasPointerCapture(id)) link.releasePointerCapture(id);
    }
    list.addEventListener("pointerdown", event => {
        if (!event.isPrimary || event.button !== 0) return;
        suppress = false;
        const link = event.target.closest("a");
        if (!link || drag || (event.pointerType === "touch" && !event.target.closest(".archive-grip"))) return;
        drag = {id:event.pointerId, link, startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY};
    });
    window.addEventListener("pointermove", event => {
        if (!drag || drag.id !== event.pointerId) return;
        drag.x = event.clientX; drag.y = event.clientY;
        if (!drag.sheet) {
            if (Math.hypot(drag.x-drag.startX,drag.y-drag.startY)<7) return;
            suppress = true;
            const rect = drag.link.getBoundingClientRect();
            drag.sheet = copy(drag.link, rect);
            drag.link.setPointerCapture(drag.id);
            drag.link.classList.add("is-lifted");
            index.classList.add("is-shredding");
        }
        const dx = drag.x-drag.startX, dy=drag.y-drag.startY;
        drag.sheet.style.transform = "translate("+dx+"px,"+dy+"px) rotate("+Math.max(-4, Math.min(4,dx*.025))+"deg)";
        const line = slot.getBoundingClientRect();
        if (dy>8 && drag.y>=line.top + line.height/2 && drag.x>=line.left && drag.x<=line.right) {
            feed(drag.link, drag.x);
            end();
        }
    }, {passive:true});
    window.addEventListener("pointerup", event => { if (drag?.id===event.pointerId) { drag.x=event.clientX;drag.y=event.clientY;end(true); } });
    window.addEventListener("pointercancel", event => { if (drag?.id===event.pointerId) end(); });
    list.addEventListener("lostpointercapture", event => { if (event.target === drag?.link && drag.id === event.pointerId) end(); });
    list.addEventListener("click", event => {
        if (suppress && event.detail) { event.preventDefault(); event.stopImmediatePropagation(); }
        suppress = false;
    },true);
    list.addEventListener("keydown", event => {
        const link=event.target.closest("a");
        if (event.key==="Delete" && link) {
            event.preventDefault();
            if (!event.repeat) { const b=link.getBoundingClientRect();feed(link,b.left+b.width/2); }
        }
    });
    function clear() { end(); fragments.forEach(el=>el.remove()); fragments.clear(); }
    window.addEventListener("keydown", event => { if (drag && event.key==="Escape") end(); }, true);
    index.addEventListener("toggle", () => { if (!index.open) clear(); });
    index.querySelector("input").addEventListener("input",clear);
    window.addEventListener("section-shown",clear);
    document.addEventListener("visibilitychange", () => { if (document.hidden) clear(); });
    window.addEventListener("blur", clear);
}

