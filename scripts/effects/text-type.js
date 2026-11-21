/* 用一个文字范围遮住尚未打出的部分，换行、复制和无障碍名称始终使用原文。 */
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter() : null;
function letters(text) {
    return segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
}

const tasks = new Map();
const tails = window.Highlight && window.CSS?.highlights ? new Highlight() : null;
const carets = tails ? new Highlight() : null;
if (tails) {
    CSS.highlights.set("nh-type-tail", tails);
    CSS.highlights.set("nh-type-caret", carets);
}
function finish(task) {
    clearTimeout(task.timer);
    tails.delete(task.tail);
    carets.delete(task.cursor);
    tasks.delete(task.element);
    observer.unobserve(task.element);
}
function step(task) {
    clearTimeout(task.timer);
    if (reduced.matches) { finish(task); return; }
    if (!task.visible || document.hidden) return;
    const start = task.offset;
    const char = task.chars[task.index++];
    task.offset += char.length;
    task.tail.setStart(task.node, task.offset);
    task.cursor.setStart(task.node, start);
    task.cursor.setEnd(task.node, task.offset);
    if (task.index === task.chars.length) { finish(task); return; }
    task.timer = setTimeout(() => step(task), /[，。！？…]/u.test(char) ? 105 : 40);
}
const observer = window.IntersectionObserver && tails ? new IntersectionObserver(entries => {
    for (const entry of entries) {
        const task = tasks.get(entry.target);
        if (!task) continue;
        task.visible = entry.isIntersecting;
        if (task.visible) step(task); else clearTimeout(task.timer);
    }
}) : null;

export function observeType(element) {
    if (!observer || reduced.matches || tasks.has(element)) return;
    const node = element.firstChild;
    if (element.childNodes.length !== 1 || node.nodeType !== Node.TEXT_NODE) return;
    const chars = letters(node.data.trim());
    if (!chars.length) return;
    const offset = node.data.length - node.data.trimStart().length;
    const tail = new Range();
    tail.setStart(node, offset);
    tail.setEnd(node, node.data.trimEnd().length);
    const cursor = tail.cloneRange();
    cursor.collapse(true);
    tails.add(tail);
    carets.add(cursor);
    tasks.set(element, { element, node, chars, offset, index: 0, tail, cursor, visible: false, timer: 0 });
    observer.observe(element);
}

function searchPrompt(field) {
    const messages = [field.placeholder, "但是你可以抓住下面这些词条往下拽来解个小闷。",
        "如果你长按世界观目录下中间的方块可能会发现彩蛋。"].map(letters);
    const dwell = [5000, 20000, 10000];
    const index = field.closest("details");
    let timer, visible = false, running = false, message = 0, length = 0, deleting = false;
    function tick() {
        const text = messages[message];
        const hold = dwell[message];
        if (reduced.matches) {
            field.placeholder = text.join("");
            message = (message + 1) % messages.length;
            timer = setTimeout(tick, hold);
            return;
        }
        length += deleting ? -1 : 1;
        field.placeholder = text.slice(0, length).join("") + (length < text.length ? "▏" : "");
        if (length === text.length) {
            deleting = true;
            timer = setTimeout(tick, hold);
        } else {
            if (!length) { deleting = false; message = (message + 1) % messages.length; }
            timer = setTimeout(tick, deleting ? 24 : 55);
        }
    }
    function sync() {
        const play = visible && index.open && !document.hidden && !field.value && document.activeElement !== field;
        if (play === running) return;
        clearTimeout(timer);
        running = play;
        message = length = 0;
        deleting = false;
        if (play) tick(); else field.placeholder = messages[0].join("");
    }
    if (window.IntersectionObserver) {
        new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(field);
    } else visible = true;
    for (const event of ["input", "focus", "blur"]) field.addEventListener(event, sync);
    index.addEventListener("toggle", sync);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", () => { if (running) { clearTimeout(timer); running = false; sync(); } });
    sync();
}

export function initializeTextType() {
    document.querySelectorAll(".creator-description p, .nhn-masthead blockquote, .timeline-text > span").forEach(observeType);
    const field = document.querySelector(".nhn-search-field input");
    if (field) searchPrompt(field);
    document.addEventListener("visibilitychange", () => tasks.forEach(step));
    reduced.addEventListener("change", () => { if (reduced.matches) tasks.forEach(finish); });
}

