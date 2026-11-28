// A drag starting in a layout gap can otherwise select the nearest paragraph.
export function initializeBlankDragGuard() {
    const editable = "input, textarea, select, [contenteditable]:not([contenteditable=false])";
    const elementOf = node => node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    let fromGap = false;
    function textUnderPointer(x, y) {
        const caret = document.caretPositionFromPoint?.(x, y);
        const range = !caret && document.caretRangeFromPoint?.(x, y);
        if (!caret && !range) return true;
        const node = caret?.offsetNode ?? range.startContainer;
        const offset = caret?.offset ?? range.startOffset;
        if (node.nodeType !== Node.TEXT_NODE) return false;
        const glyph = document.createRange();
        for (const i of [offset - 1, offset]) {
            if (i < 0 || i >= node.length) continue;
            glyph.setStart(node, i); glyph.setEnd(node, i + 1);
            for (const rect of glyph.getClientRects()) {
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
            }
        }
        return false;
    }
    document.addEventListener("pointerdown", event => {
        fromGap = event.pointerType === "mouse" && event.button === 0 &&
            !elementOf(event.target)?.closest(editable) && !textUnderPointer(event.clientX, event.clientY);
    }, true);
    for (const type of ["pointerup", "pointercancel", "blur"]) window.addEventListener(type, () => { fromGap = false; });
    document.addEventListener("selectstart", event => {
        if (fromGap && !elementOf(event.target)?.closest(editable)) event.preventDefault();
    }, true);
    document.addEventListener("dragstart", event => {
        if (elementOf(event.target)?.closest(editable)) return;
        const types = event.dataTransfer?.types ?? [];
        if (elementOf(event.target)?.closest('[draggable="true"]')) return;
        const selected = window.getSelection();
        const textDrag = selected && !selected.isCollapsed &&
            (types.includes("text/plain") || event.target.nodeType === Node.TEXT_NODE);
        if (fromGap || (textDrag && !types.includes("text/uri-list"))) event.preventDefault();
    }, true);
}
