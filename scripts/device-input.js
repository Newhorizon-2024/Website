export const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const mobileDevice = appleMobile || navigator.userAgentData?.mobile === true ||
    /Android|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && matchMedia("(pointer: coarse)").matches);

export function readPad() {
    try {
        const pads = Array.from(navigator.getGamepads?.() || []).filter(pad => pad?.connected);
        return pads.find(pad => pad.mapping === "standard") ||
            pads.find(pad => !pad.mapping && pad.axes.length >= 2 && pad.buttons.length >= 4);
    } catch {
        return null;
    }
}
