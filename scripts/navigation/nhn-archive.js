import { initializeArchiveShredder } from "./archive-shredder.js?v=26.11.19.3";

/* Build the directory from published sections and the existing timeline, so draft
 * wheel options and closed folders never become links. */
export function initializeNhnArchiveIndex() {
    const index = document.querySelector(".nhn-archive-index");
    if (!index || index.dataset.ready) return;
    const field = index.querySelector("input");
    const list = index.querySelector(".nhn-index-results");
    const status = index.querySelector("[role='status']");
    const rows = [];
    const seen = new Set();
    const clean = value => (value || "").normalize("NFKC").replace(/["“”]/g, "").toLowerCase().replace(/[’‘]/g, "'").trim();

    function add(id, category, eventId = "") {
        const page = document.getElementById(eventId || id);
        const title = page?.querySelector("h1")?.textContent.trim();
        if (!title || page.dataset.archiveIndex === "omit" || seen.has(page.id)) return;
        seen.add(page.id);
        const subtitle = page.querySelector(".timeline-detail-en, [class$='title-en'], .newworld-subtitle")?.textContent.trim() || "";
        const date = eventId ? page.querySelector("h2")?.textContent.trim() || "" : "";
        const link = document.createElement("a");
        link.href = "#" + id;
        link.dataset.sectionLink = id;
        if (eventId) link.dataset.timelineEvent = eventId;
        const name = document.createElement("span");
        const shortTitle = page.id === "innerworld-section" ? "里世界" : title;
        const unquoted = shortTitle.replace(/^[“"＂]+|[”"＂]+$/gu, "").trim();
        const plainTitle = page.id === "demon-remnants-section" || eventId === "event-detail-5";
        name.textContent = plainTitle ? unquoted : "“" + unquoted + "”";
        const context = document.createElement("small");
        context.textContent = date || category;
        link.append(name, context);
        list.append(link);
        rows.push({ link, terms: clean([title, subtitle, category, date, page.id.replace(/-/g, " ")].join(" ")) });
    }

    add("innerworld-section", "世界观");
    add("power-system-section", "世界观");
    for (const [selector, category] of [[".things-wheel-option", "事物"], [".scene-node", "场景"], ["[data-organization-id]", "组织"]]) {
        for (const item of document.querySelectorAll(selector + "[data-section-id]")) {
            if (item.dataset.sectionId) add(item.dataset.sectionId, category);
        }
    }
    for (const event of document.querySelectorAll("#timeline-section .timeline-item[data-target]")) {
        add("timeline-section", "历史事件", event.dataset.target);
    }

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const summary = index.querySelector("summary");
    const body = document.createElement("div");
    body.className = "nhn-index-body";
    initializeArchiveShredder(index, list);
    body.append(...Array.from(index.children).filter(node => node !== summary));
    index.append(body);
    let transition = null, closing = false;
    function setOpen(open) {
        const height = index.open ? body.getBoundingClientRect().height : 0;
        const opacity = index.open ? Number(getComputedStyle(body).opacity) : 0;
        transition?.cancel();
        closing = !open;
        if (!open && body.contains(document.activeElement)) summary.focus();
        body.inert = !open;
        if (motion.matches) { index.open = open; closing = false; return; }
        index.open = true;
        const anim = body.animate([{height:height+"px", opacity}, {height:(open ? body.scrollHeight : 0)+"px", opacity:Number(open)}],
            {duration:open ? 320 : 215, easing:"cubic-bezier(.22,.68,.23,1)",fill:"both"});
        transition = anim;
        anim.onfinish = () => {
            if (transition !== anim) return;
            index.open = open;
            transition = null; closing = false;
            anim.cancel();
        };
    }
    summary.addEventListener("click", event => { event.preventDefault(); setOpen(!index.open || closing); });
    function filter() {
        const terms = clean(field.value).split(/\s+/).filter(Boolean);
        let count = 0;
        for (const row of rows) {
            const match = terms.every(term => row.terms.includes(term));
            if (match) count++;
            if (row.match === match) continue;
            row.match = match;
            const link = row.link;
            const alpha = link.hidden ? 0 : Number(getComputedStyle(link).opacity);
            row.fade?.cancel();
            link.inert = !match;
            if (!index.open || motion.matches) { link.hidden = !match; continue; }
            link.hidden = false;
            const fade = link.animate([{opacity:alpha},{opacity:Number(match)}], {duration:match ? 180 : 115,easing:"ease-out"});
            row.fade = fade;
            fade.onfinish = () => { if (row.fade === fade) { link.hidden = !row.match; row.fade = null; } };
        }
        status.textContent = count ? count + " 条档案" : "没有匹配的档案";
    }
    field.addEventListener("input", filter);
    index.addEventListener("keydown", event => {
        if (event.isComposing) return;
        if (event.key === "Escape" && index.open) {
            event.preventDefault();
            setOpen(false);
            index.querySelector("summary").focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            const matches = rows.filter(row => row.match);
            if (!matches.length || (event.target !== field && !list.contains(event.target))) return;
            event.preventDefault();
            const pos = matches.findIndex(row => row.link === event.target);
            const next = pos < 0 ? (event.key === "ArrowUp" ? matches.length - 1 : 0)
                : (pos + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
            matches[next].link.focus();
        }
    });
    filter();
    index.dataset.ready = "true";
    index.hidden = false;
}
