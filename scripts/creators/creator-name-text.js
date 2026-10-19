/* Native SplitText: one view-triggered rise and an on-demand spring hover lift. */
const RISE_DURATION = 1250;
const LETTER_DELAY = 50;
const STIFFNESS = 180;
const DAMPING = 19;

let initialized = false;

export function initializeCreatorNameText() {
    if (initialized) return;
    const section = document.getElementById("creators-section");
    const headings = [...(section?.querySelectorAll(".creator-name h2") || [])];
    if (!headings.length) return;
    initialized = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const graphemes = typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
    const splitCharacters = text => graphemes
        ? [...graphemes.segment(text)].map(part => part.segment) : Array.from(text);
    const states = [];
    const activeSprings = new Set();
    let hoverFrame = 0;
    let lastFrame = 0;
    let observer = null;

    function resetLift(state) {
        state.pointer.inside = false;
        activeSprings.delete(state);
        for (let index = 0; index < state.chars.length; index += 1) {
            state.springs[index] = { y: 0, velocity: 0 };
            state.chars[index].style.removeProperty("translate");
            state.chars[index].style.removeProperty("will-change");
        }
        if (!activeSprings.size && hoverFrame) {
            cancelAnimationFrame(hoverFrame);
            hoverFrame = 0;
        }
    }

    function complete(state) {
        const firstCompletion = state.heading.dataset.nameTextState !== "complete";
        state.heading.dataset.nameTextState = "complete";
        for (const animation of state.animations) animation.cancel();
        state.animations.length = 0;
        observer?.unobserve(state.heading);
        if (firstCompletion) state.heading.dispatchEvent(new CustomEvent(
            "creator-name-animation-complete", { bubbles: true }
        ));
    }

    function reveal(state) {
        if (state.heading.dataset.nameTextState !== "pending") return;
        if (reduceMotion.matches || typeof state.heading.animate !== "function") {
            complete(state);
            return;
        }
        state.heading.dataset.nameTextState = "entering";
        try {
            state.chars.forEach((character, index) => {
                state.animations.push(character.animate([
                    { opacity: 0, transform: "translate3d(0, 40px, 0)" },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" }
                ], {
                    duration: RISE_DURATION,
                    delay: index * LETTER_DELAY,
                    easing: "cubic-bezier(.16, 1, .3, 1)",
                    fill: "both"
                }));
            });
            Promise.all(state.animations.map(animation => animation.finished))
                .then(() => {
                    if (state.heading.dataset.nameTextState === "entering") complete(state);
                }).catch(() => {
                    // Navigation/reduced-motion cancels intentionally after restoring readable text.
                    if (state.heading.dataset.nameTextState === "entering") complete(state);
                });
        } catch {
            complete(state);
        }
    }

    function measure(state) {
        const box = state.heading.getBoundingClientRect();
        if (!box.width || !box.height) return false;
        // Creator cards have their own scale/translate reveal; use the same local coordinates.
        state.scaleX = box.width / Math.max(1, state.heading.offsetWidth);
        state.scaleY = box.height / Math.max(1, state.heading.offsetHeight);
        state.em = parseFloat(getComputedStyle(state.heading).fontSize) || 16;
        state.centers = state.chars.map((character, index) => {
            const rect = character.getBoundingClientRect();
            return {
                x: (rect.left + rect.width / 2 - box.left) / state.scaleX,
                y: (rect.top + rect.height / 2 - box.top) / state.scaleY - state.springs[index].y
            };
        });
        return true;
    }

    function liftTick(now) {
        hoverFrame = 0;
        const dt = Math.min(0.032, Math.max(0.001, (now - lastFrame) / 1000));
        lastFrame = now;
        for (const state of activeSprings) {
            if (!section.getClientRects().length || document.hidden || reduceMotion.matches) {
                resetLift(state);
                continue;
            }
            let moving = false;
            const radius = state.em * 1.15;
            for (let index = 0; index < state.chars.length; index += 1) {
                const spring = state.springs[index];
                const center = state.pointer.inside && state.centers?.[index];
                let target = 0;
                if (center) {
                    const dx = (center.x - state.pointer.x) / radius;
                    const dy = (center.y - state.pointer.y) / (radius * 1.4);
                    target = -state.em * 0.2 * Math.exp(-(dx * dx + dy * dy) * 0.5);
                }
                spring.velocity += (STIFFNESS * (target - spring.y) - DAMPING * spring.velocity) * dt;
                spring.y += spring.velocity * dt;
                if (Math.abs(target - spring.y) < 0.02 && Math.abs(spring.velocity) < 0.05) {
                    spring.y = target;
                    spring.velocity = 0;
                } else moving = true;
                state.chars[index].style.translate = Math.abs(spring.y) > 0.01
                    ? `0 ${spring.y.toFixed(2)}px` : "";
            }
            if (!moving) {
                activeSprings.delete(state);
                for (const character of state.chars) character.style.removeProperty("will-change");
            }
        }
        if (activeSprings.size) hoverFrame = requestAnimationFrame(liftTick);
    }

    function wake(state) {
        activeSprings.add(state);
        for (const character of state.chars) character.style.willChange = "translate";
        if (!hoverFrame) {
            lastFrame = performance.now();
            hoverFrame = requestAnimationFrame(liftTick);
        }
    }

    function locate(state, event) {
        const box = state.heading.getBoundingClientRect();
        // The enclosing card can keep settling while the pointer remains over its name.
        const scaleX = box.width / Math.max(1, state.heading.offsetWidth);
        const scaleY = box.height / Math.max(1, state.heading.offsetHeight);
        state.pointer.x = (event.clientX - box.left) / Math.max(0.001, scaleX);
        state.pointer.y = (event.clientY - box.top) / Math.max(0.001, scaleY);
    }

    for (const heading of headings) {
        const readable = heading.cloneNode(true);
        readable.querySelectorAll("br").forEach(br => br.replaceWith(" "));
        const label = readable.textContent.replace(/\s+/gu, " ").trim();
        const visual = document.createElement("span");
        visual.className = "creator-name-text__visual";
        visual.setAttribute("aria-hidden", "true");
        visual.append(...heading.childNodes);
        const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        const chars = [];
        for (const node of textNodes) {
            const fragment = document.createDocumentFragment();
            // Preserve real whitespace and Latin word wrapping; CJK graphemes keep natural breaks.
            const parts = [];
            for (const character of splitCharacters(node.textContent)) {
                const kind = /^\s+$/u.test(character) ? "space"
                    : /^[\p{Script=Latin}\p{Number}_-][\p{Mark}\uFE0E\uFE0F]*$/u.test(character) ? "word" : "other";
                const previous = parts.at(-1);
                if (previous?.kind === kind) previous.characters.push(character);
                else parts.push({ kind, characters: [character] });
            }
            for (const part of parts) {
                if (part.kind === "space") {
                    fragment.append(document.createTextNode(part.characters.join("")));
                    continue;
                }
                const isWord = part.kind === "word";
                const owner = isWord ? document.createElement("span") : fragment;
                if (isWord) owner.className = "creator-name-text__word";
                for (const character of part.characters) {
                    const span = document.createElement("span");
                    span.className = "creator-name-text__char";
                    span.textContent = character;
                    chars.push(span);
                    owner.append(span);
                }
                if (isWord) fragment.append(owner);
            }
            node.replaceWith(fragment);
        }
        heading.append(visual);
        heading.classList.add("creator-name-text");
        if (!heading.hasAttribute("aria-label")) heading.setAttribute("aria-label", label);
        heading.dataset.nameTextState = reduceMotion.matches || !("IntersectionObserver" in window)
            ? "complete" : "pending";
        const state = {
            heading, chars, animations: [], centers: null, em: 16, scaleX: 1, scaleY: 1,
            springs: chars.map(() => ({ y: 0, velocity: 0 })),
            pointer: { x: 0, y: 0, inside: false }
        };
        states.push(state);

        const onPointer = event => {
            if (event.pointerType === "touch" || reduceMotion.matches ||
                heading.dataset.nameTextState !== "complete" || document.hidden) return;
            if (!state.centers && !measure(state)) return;
            locate(state, event);
            state.pointer.inside = true;
            wake(state);
        };
        heading.addEventListener("pointerenter", event => {
            state.centers = null;
            onPointer(event);
        });
        heading.addEventListener("pointermove", onPointer);
        heading.addEventListener("pointerleave", () => {
            state.pointer.inside = false;
            if (!reduceMotion.matches && state.springs.some(spring => spring.y || spring.velocity)) wake(state);
        });
        heading.addEventListener("pointercancel", () => resetLift(state));
    }

    if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const state = states.find(item => item.heading === entry.target);
                if (!state) continue;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.1 && !document.hidden) reveal(state);
                else if (state.heading.dataset.nameTextState === "entering") complete(state);
            }
        }, { threshold: 0.1, rootMargin: "-100px" });
        for (const state of states) {
            if (state.heading.dataset.nameTextState === "pending") observer.observe(state.heading);
        }
    }

    function interrupt() {
        for (const state of states) {
            resetLift(state);
            if (state.heading.dataset.nameTextState === "entering") complete(state);
        }
    }

    function invalidateMeasurements() {
        for (const state of states) {
            resetLift(state);
            state.centers = null;
        }
    }

    window.addEventListener("section-shown", event => {
        if (event.detail?.sectionId !== "creators-section") interrupt();
        else invalidateMeasurements();
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) interrupt(); });
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    window.addEventListener("resize", invalidateMeasurements, { passive: true });
    document.fonts?.addEventListener?.("loadingdone", invalidateMeasurements);
    document.fonts?.ready.then(invalidateMeasurements).catch(() => undefined);
    reduceMotion.addEventListener?.("change", () => {
        interrupt();
        if (reduceMotion.matches) for (const state of states) complete(state);
    });
}
