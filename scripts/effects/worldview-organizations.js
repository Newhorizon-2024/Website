/* 世界观 · 组织平面浏览器 */

let worldviewOrganizationsInitialized = false;

export function initializeWorldviewOrganizations() {
    if (worldviewOrganizationsInitialized) return;

    const section = document.getElementById("worldview-organizations-section");
    const browser = document.getElementById("organizations-orbit");
    if (!section || !browser) return;

    const itemElements = Array.from(
        browser.querySelectorAll(".organization-orbit-item")
    );
    const currentButton = browser.querySelector(".organizations-current");
    const currentIndex = browser.querySelector(".organizations-current-index");
    const currentName = browser.querySelector(".organizations-current-name");
    const currentStatus = browser.querySelector(".organizations-current-status");

    if (!itemElements.length || !currentButton || !currentIndex || !currentName || !currentStatus) {
        console.warn("组织浏览器初始化失败：缺少必要元素。");
        return;
    }

    worldviewOrganizationsInitialized = true;

    const organizations = itemElements.map((element, index) => ({
        element,
        id: element.dataset.organizationId || `organization-${index}`,
        name: element.dataset.organizationName || element.textContent.trim(),
        sectionId: element.dataset.sectionId || ""
    }));
    const itemCount = organizations.length;
    let selectedIndex = 0;
    let dragging = false;
    let activePointerId = null;
    let startX = 0;
    let currentX = 0;
    let suppressClick = false;
    let wheelLocked = false;
    let wheelUnlockTimeout = null;
    let lenisStopped = false;

    const normalizeIndex = index => ((index % itemCount) + itemCount) % itemCount;
    const isSectionActive = () => (
        section.classList.contains("is-active") ||
        section.classList.contains("depth-enter") ||
        section.classList.contains("slide-enter-left") ||
        section.classList.contains("slide-enter-right")
    );
    const selectedOrganization = () => organizations[selectedIndex] || null;

    function stopPageScrolling() {
        if (!lenisStopped && window.lenis?.stop) {
            window.lenis.stop();
            lenisStopped = true;
        }
    }

    function restorePageScrolling() {
        if (lenisStopped) window.lenis?.start?.();
        lenisStopped = false;
    }

    function updateInformation() {
        const organization = selectedOrganization();
        if (!organization) return;
        const available = Boolean(organization.sectionId);
        currentIndex.textContent = `${String(selectedIndex + 1).padStart(2, "0")} / ${String(itemCount).padStart(2, "0")}`;
        currentName.textContent = organization.name;
        currentStatus.textContent = available ? "进入档案" : "尚未开放";
        currentButton.classList.toggle("is-unavailable", !available);
        currentButton.setAttribute(
            "aria-label",
            available ? `打开${organization.name}档案` : `${organization.name}尚未开放`
        );
    }

    function renderItems() {
        const itemSpacing = window.innerWidth <= 820
            ? window.innerWidth * 0.68
            : Math.min(window.innerWidth * 0.34, 430);

        organizations.forEach((organization, index) => {
            let offset = index - selectedIndex;
            if (offset > itemCount / 2) offset -= itemCount;
            if (offset < -itemCount / 2) offset += itemCount;
            const selected = index === selectedIndex;
            organization.element.style.setProperty("--organization-offset", String(offset));
            organization.element.style.setProperty(
                "--organization-x",
                `${offset * itemSpacing}px`
            );
            organization.element.classList.toggle("is-selected", selected);
            organization.element.setAttribute("aria-selected", String(selected));
            organization.element.tabIndex = selected ? 0 : -1;
        });
    }

    function focusOrganization(index, moveFocus = false) {
        selectedIndex = normalizeIndex(index);
        renderItems();
        updateInformation();
        if (moveFocus) {
            organizations[selectedIndex].element.focus({ preventScroll: true });
        }
    }

    async function openSelectedOrganization() {
        const organization = selectedOrganization();
        if (!organization) return false;
        if (!organization.sectionId) {
            window.dispatchEvent(new CustomEvent("worldview-organization-unavailable", {
                detail: {
                    id: organization.id,
                    name: organization.name,
                    category: "organization",
                    sourceElement: organization.element
                }
            }));
            return false;
        }
        if (!document.getElementById(organization.sectionId)) {
            console.error(`未找到组织信息页：#${organization.sectionId}`);
            return false;
        }
        if (typeof window.showSection !== "function") {
            console.error("全局 showSection 尚未初始化。");
            return false;
        }
        restorePageScrolling();
        return window.showSection(organization.sectionId, {
            transitionType: "slide",
            direction: "forward",
            scrollMode: "top",
            historyMode: "push"
        });
    }

    function handleWheel(event) {
        if (!isSectionActive()) return;
        event.preventDefault();
        event.stopPropagation();
        stopPageScrolling();
        if (wheelLocked) return;
        const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        if (Math.abs(delta) < 1) return;
        focusOrganization(selectedIndex + (delta > 0 ? 1 : -1));
        wheelLocked = true;
        if (wheelUnlockTimeout) window.clearTimeout(wheelUnlockTimeout);
        wheelUnlockTimeout = window.setTimeout(() => {
            wheelLocked = false;
            wheelUnlockTimeout = null;
        }, 260);
    }

    function handleKeyDown(event) {
        const nextKeys = ["ArrowRight", "ArrowDown"];
        const previousKeys = ["ArrowLeft", "ArrowUp"];
        if (nextKeys.includes(event.key)) {
            event.preventDefault();
            focusOrganization(selectedIndex + 1, true);
        } else if (previousKeys.includes(event.key)) {
            event.preventDefault();
            focusOrganization(selectedIndex - 1, true);
        } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            focusOrganization(event.key === "Home" ? 0 : itemCount - 1, true);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSelectedOrganization();
        }
    }

    function handlePointerDown(event) {
        if (!isSectionActive() || event.button !== 0 || event.target.closest(".organizations-current")) return;
        dragging = true;
        activePointerId = event.pointerId;
        startX = currentX = event.clientX;
        suppressClick = false;
        browser.classList.add("is-dragging");
        stopPageScrolling();
        browser.setPointerCapture?.(event.pointerId);
    }

    function handlePointerMove(event) {
        if (!dragging || event.pointerId !== activePointerId) return;
        currentX = event.clientX;
        const distance = currentX - startX;
        browser.style.setProperty("--organizations-drag-x", `${distance}px`);
        if (Math.abs(distance) > 7) suppressClick = true;
    }

    function finishPointerInteraction(event = null) {
        if (!dragging || (event && event.pointerId !== activePointerId)) return;
        const distance = currentX - startX;
        dragging = false;
        activePointerId = null;
        browser.classList.remove("is-dragging");
        browser.style.removeProperty("--organizations-drag-x");
        if (Math.abs(distance) >= 42) {
            focusOrganization(selectedIndex + (distance < 0 ? 1 : -1));
        }
        if (event && browser.hasPointerCapture?.(event.pointerId)) {
            browser.releasePointerCapture(event.pointerId);
        }
        window.setTimeout(() => { suppressClick = false; }, 0);
        restorePageScrolling();
    }

    function resetInteractionState() {
        dragging = false;
        activePointerId = null;
        suppressClick = false;
        browser.classList.remove("is-dragging");
        browser.style.removeProperty("--organizations-drag-x");
        restorePageScrolling();
    }

    organizations.forEach((organization, index) => {
        organization.element.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (suppressClick || dragging) return;
            if (index === selectedIndex) openSelectedOrganization();
            else focusOrganization(index);
        });
        organization.element.addEventListener("focus", () => {
            if (index !== selectedIndex) focusOrganization(index);
        });
        organization.element.addEventListener("dragstart", event => event.preventDefault());
    });

    currentButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openSelectedOrganization();
    });
    browser.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    browser.addEventListener("pointerdown", handlePointerDown);
    browser.addEventListener("pointermove", handlePointerMove);
    browser.addEventListener("pointerleave", () => {
        if (!dragging) restorePageScrolling();
    });
    browser.addEventListener("pointerup", finishPointerInteraction);
    browser.addEventListener("pointercancel", finishPointerInteraction);
    browser.addEventListener("lostpointercapture", finishPointerInteraction);
    browser.addEventListener("keydown", handleKeyDown);

    const sectionObserver = new MutationObserver(() => {
        if (!isSectionActive()) resetInteractionState();
    });
    sectionObserver.observe(section, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("blur", resetInteractionState);
    window.addEventListener("pagehide", resetInteractionState);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) resetInteractionState();
    });
    window.addEventListener("resize", renderItems);

    focusOrganization(0);
}
