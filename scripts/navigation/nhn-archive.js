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

    function filter() {
        const terms = clean(field.value).split(/\s+/).filter(Boolean);
        let count = 0;
        for (const row of rows) {
            row.link.hidden = !terms.every(term => row.terms.includes(term));
            if (!row.link.hidden) count++;
        }
        status.textContent = count ? count + " 条档案" : "没有匹配的档案";
    }
    field.addEventListener("input", filter);
    index.addEventListener("keydown", event => {
        if (event.isComposing) return;
        if (event.key === "Escape" && index.open) {
            event.preventDefault();
            index.open = false;
            index.querySelector("summary").focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            const matches = rows.filter(row => !row.link.hidden);
            if (!matches.length || (event.target !== field && !list.contains(event.target))) return;
            event.preventDefault();
            const pos = matches.findIndex(row => row.link === event.target);
            const next = pos < 0 ? (event.key === "ArrowUp" ? matches.length - 1 : 0)
                : (pos + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
            matches[next].link.focus();
        }
    });
    initializeArchiveShredder(index, list);
    filter();
    index.dataset.ready = "true";
    index.hidden = false;
}
