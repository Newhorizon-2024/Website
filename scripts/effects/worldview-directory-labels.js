/* 世界观触屏目录：标签跟随现有 Three.js 对象，不建立额外动画循环。 */

const SVG_NS = "http://www.w3.org/2000/svg";
const LABEL_HEIGHT = 44;
const DRAG_THRESHOLD = 8;
const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));

export function createWorldviewDirectoryLabels({
    container,
    orbiters,
    camera,
    onOpen,
    onDragStart
}) {
    const media = window.matchMedia(
        "(max-width: 768px), (hover: none), (pointer: coarse)"
    );
    const root = document.createElement("div");
    root.className = "worldview-directory-labels";
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "世界观目录");
    root.hidden = true;

    const lines = document.createElementNS(SVG_NS, "svg");
    lines.classList.add("worldview-directory-labels__lines");
    lines.setAttribute("aria-hidden", "true");
    root.appendChild(lines);

    const hint = document.createElement("p");
    hint.className = "worldview-directory-labels__hint";
    hint.textContent = "轻触名称进入 · 横向拖动旋转";
    root.appendChild(hint);
    container.appendChild(root);

    const backButton = container.querySelector(".worldview-back-button");
    let canOpen = false;
    let gesture = null;
    let suppressPointerClickUntil = 0;

    const records = orbiters.map(group => {
        const name = group.userData.name || "未命名目录";
        const button = document.createElement("button");
        const width = Math.max(64, Array.from(name).length * 16 + 24);
        button.type = "button";
        button.className = "worldview-directory-label";
        button.style.width = `${width}px`;
        button.style.height = `${LABEL_HEIGHT}px`;
        button.dataset.target = group.userData.target || "";
        button.setAttribute("aria-label", group.userData.sectionId
            ? `${name}，打开目录`
            : `${name}，档案尚未开放`);
        if (!group.userData.sectionId) button.dataset.unavailable = "true";
        button.hidden = true;
        button.disabled = true;

        const text = document.createElement("span");
        text.className = "worldview-directory-label__text";
        text.textContent = name;
        button.appendChild(text);
        root.appendChild(button);

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("vector-effect", "non-scaling-stroke");
        lines.appendChild(line);

        const record = {
            group,
            name,
            width,
            button,
            line,
            position: new window.THREE.Vector3(),
            viewPosition: new window.THREE.Vector3(),
            anchorX: 0,
            anchorY: 0,
            x: null,
            y: null,
            visible: false
        };

        button.addEventListener("pointerdown", event => {
            if (!canOpen || !event.isPrimary || event.button !== 0 || gesture) return;
            gesture = {
                record,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                isPrimary: event.isPrimary,
                clientX: event.clientX,
                clientY: event.clientY,
                button: event.button,
                buttons: event.buttons,
                pressure: event.pressure,
                dragging: false
            };
            try { button.setPointerCapture(event.pointerId); } catch {}
        });

        button.addEventListener("lostpointercapture", event => {
            // Transfer to the canvas is intentional after horizontal intent.
            if (gesture?.record === record && gesture.pointerId === event.pointerId && !gesture.dragging && !gesture.cancelled) {
                suppressPointerClickUntil = performance.now() + 500;
                gesture = null;
            }
        });
        button.addEventListener("click", event => {
            if (!canOpen || (event.detail !== 0 && performance.now() < suppressPointerClickUntil)) {
                event.preventDefault();
                return;
            }
            onOpen?.(group);
        });
        return record;
    });

    const releaseLabelCapture = current => {
        try {
            if (current.record.button.hasPointerCapture(current.pointerId)) {
                current.record.button.releasePointerCapture(current.pointerId);
            }
        } catch {}
    };

    // Decide intent before handing the real active pointer to the canvas. No
    // synthetic PointerEvents: the core's window listeners receive this same
    // move after this listener, then own all following capture / release events.
    window.addEventListener("pointermove", event => {
        const current = gesture;
        if (!current || current.pointerId !== event.pointerId || current.dragging || current.cancelled) return;
        const dx = Math.abs(event.clientX - current.clientX);
        const dy = Math.abs(event.clientY - current.clientY);
        const touch = current.pointerType === "touch";
        if (touch && dy >= DRAG_THRESHOLD && dy >= dx * 0.9) {
            current.cancelled = true;
            suppressPointerClickUntil = performance.now() + 500;
            releaseLabelCapture(current);
            return;
        }
        if (touch ? dx < 10 || dx < dy * 1.25 : Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        current.dragging = true;
        suppressPointerClickUntil = performance.now() + 500;
        if (!onDragStart?.(current)) gesture = null;
        releaseLabelCapture(current);
    }, {passive: true});

    const finishPointer = event => {
        const current = gesture;
        if (!current || current.pointerId !== event.pointerId) return;
        gesture = null;
        suppressPointerClickUntil = performance.now() + 500;
        releaseLabelCapture(current);
        const moved = Math.hypot(event.clientX - current.clientX, event.clientY - current.clientY) >= DRAG_THRESHOLD;
        if (!current.dragging && !current.cancelled && !moved && event.type === "pointerup" && canOpen) {
            // Freeze the captured label while tapping; never open a moving cube
            // underneath it or navigate after a cancelled / scrolling gesture.
            onOpen?.(current.record.group);
        }
    };
    window.addEventListener("pointerup", finishPointer);
    window.addEventListener("pointercancel", finishPointer);
    window.addEventListener("blur", () => {
        const current = gesture;
        gesture = null;
        if (current) {
            suppressPointerClickUntil = performance.now() + 500;
            releaseLabelCapture(current);
        }
    });

    const hide = () => {
        root.hidden = true;
        canOpen = false;
        root.dataset.interactive = "false";
        const current = gesture;
        gesture = null;
        if (current) releaseLabelCapture(current);
        records.forEach(record => {
            record.button.disabled = true;
            record.button.hidden = true;
            record.visible = false;
            record.x = null;
            record.y = null;
            record.line.style.display = "none";
        });
    };

    // 先为固定目录顺序寻找邻近的空位，避免公转前后层交换时文本顺序突跳。
    // 标签保持屏幕像素尺寸；只调整文字落点，不改变对象或射线检测。
    const choosePosition = (record, placed, width, height) => {
        const minX = record.width / 2 + 8;
        const maxX = Math.max(minX, width - record.width / 2 - 8);
        const minY = LABEL_HEIGHT / 2 + 8;
        const maxY = Math.max(minY, height - LABEL_HEIGHT / 2 - 34);
        if (gesture?.record === record && !gesture.dragging && record.x !== null) {
            return {
                x: clamp(record.x, minX, maxX),
                y: clamp(record.y, minY, maxY),
                score: 0
            };
        }
        const preferredX = clamp(record.anchorX, minX, maxX);
        const preferredY = clamp(record.anchorY + 26, minY, maxY);
        let best = { x: preferredX, y: preferredY, score: Infinity };

        [0, -52, 52, -104, 104, -156, 156].forEach(offsetY => {
            [0, -74, 74, -148, 148].forEach(offsetX => {
                const x = clamp(preferredX + offsetX, minX, maxX);
                const y = clamp(preferredY + offsetY, minY, maxY);
                let overlap = 0;
                placed.forEach(other => {
                    const overlapX = (record.width + other.width) / 2 + 6 - Math.abs(x - other.x);
                    const overlapY = (LABEL_HEIGHT + (other.height || LABEL_HEIGHT)) / 2 + 4 - Math.abs(y - other.y);
                    if (overlapX > 0 && overlapY > 0) overlap += overlapX * overlapY;
                });
                const continuity = record.x === null
                    ? 0
                    : ((x - record.x) ** 2 + (y - record.y) ** 2) * 0.4;
                const score = overlap * 100000 +
                    (x - preferredX) ** 2 + (y - preferredY) ** 2 + continuity;
                if (score < best.score) best = { x, y, score };
            });
        });
        return best;
    };

    const update = (reveal, interactive) => {
        if (!media.matches || !Number.isFinite(reveal) || reveal <= 0.01) {
            hide();
            return;
        }
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width <= 0 || height <= 0) {
            hide();
            return;
        }
        root.hidden = false;
        root.style.opacity = String(clamp(reveal, 0, 1));
        canOpen = Boolean(interactive) && reveal >= 0.98;
        root.dataset.interactive = String(canOpen);
        lines.setAttribute("viewBox", `0 0 ${width} ${height}`);
        hint.hidden = height < 180;

        const placed = [];
        // 只避让真实返回按钮的当前区域；保留其余底部空间和原有标签寻位规则。
        if (backButton && !backButton.hidden) {
            const bounds = container.getBoundingClientRect();
            const backBounds = backButton.getBoundingClientRect();
            if (bounds.width > 0 && bounds.height > 0 && backBounds.width > 0 && backBounds.height > 0) {
                const scaleX = width / bounds.width;
                const scaleY = height / bounds.height;
                placed.push({
                    x: (backBounds.left - bounds.left + backBounds.width / 2) * scaleX,
                    y: (backBounds.top - bounds.top + backBounds.height / 2) * scaleY,
                    width: backBounds.width * scaleX,
                    height: backBounds.height * scaleY
                });
            }
        }
        const heldRecord = gesture && !gesture.dragging ? gesture.record : null;
        const ordered = heldRecord
            ? [heldRecord, ...records.filter(record => record !== heldRecord)]
            : records;
        ordered.forEach(record => {
            record.group.getWorldPosition(record.position);
            record.viewPosition.copy(record.position).applyMatrix4(camera.matrixWorldInverse);
            record.position.project(camera);
            record.anchorX = (record.position.x * 0.5 + 0.5) * width;
            record.anchorY = (-record.position.y * 0.5 + 0.5) * height;
            // 离开视野或位于相机背后的目录不能留下悬空的可点击名称。
            record.visible = record.viewPosition.z < 0 &&
                record.position.z >= -1 && record.position.z <= 1 &&
                record.anchorX >= -20 && record.anchorX <= width + 20 &&
                record.anchorY >= -20 && record.anchorY <= height + 20;
            record.button.hidden = !record.visible;
            record.button.disabled = !record.visible || !canOpen;
            if (!record.visible) {
                record.x = null;
                record.y = null;
                record.line.style.display = "none";
                return;
            }

            const chosen = choosePosition(record, placed, width, height);
            record.x = chosen.x;
            record.y = chosen.y;
            // 清晰的像素落点，避免依赖额外 CSS transform 动画产生拖尾。
            const left = Math.round((record.x - record.width / 2) * 2) / 2;
            const top = Math.round((record.y - LABEL_HEIGHT / 2) * 2) / 2;
            record.button.style.transform = `translate3d(${left}px, ${top}px, 0)`;
            placed.push({ x: record.x, y: record.y, width: record.width });

            const dx = record.anchorX - record.x;
            const dy = record.anchorY - record.y;
            const distance = Math.hypot(dx, dy);
            record.line.style.display = distance > 20 ? "" : "none";
            if (distance > 20) {
                const ux = dx / distance;
                const uy = dy / distance;
                const textHalfWidth = Math.min(record.width / 2 - 6, Array.from(record.name).length * 6.5 + 5);
                const textEdge = Math.min(
                    textHalfWidth / Math.max(Math.abs(ux), 0.001),
                    10 / Math.max(Math.abs(uy), 0.001)
                );
                record.line.setAttribute("x1", String(record.anchorX - ux * 7));
                record.line.setAttribute("y1", String(record.anchorY - uy * 7));
                record.line.setAttribute("x2", String(record.x + ux * textEdge));
                record.line.setAttribute("y2", String(record.y + uy * textEdge));
            }
        });
    };

    return { update, hide, isEnabled: () => media.matches };
}
