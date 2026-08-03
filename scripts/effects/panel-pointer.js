/* ===========================
    全局面板光幕与倾斜
=========================== */

export function initializePanelPointerEffects() {
    const sitePanels =
        document.querySelectorAll(
            ".site-panel"
        );

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    if (
        !supportsPointerEffects ||
        sitePanels.length === 0
    ) {
        return;
    }

    function resetPanelPointerEffect(panel) {
        panel.classList.remove(
            "is-pointer-active"
        );

        panel.style.setProperty(
            "--panel-light-angle",
            "215deg"
        );

        panel.style.setProperty(
            "--panel-light-shift-x",
            "0px"
        );

        panel.style.setProperty(
            "--panel-light-shift-y",
            "0px"
        );

        panel.style.setProperty(
            "--panel-rotate-x",
            "0deg"
        );

        panel.style.setProperty(
            "--panel-rotate-y",
            "0deg"
        );
    }

    sitePanels.forEach(panel => {
        panel.addEventListener(
            "mouseenter",
            () => {
                panel.classList.add(
                    "is-pointer-active"
                );
            }
        );

        panel.addEventListener(
            "mousemove",
            event => {
                const panelRect =
                    panel.getBoundingClientRect();

                if (
                    panelRect.width === 0 ||
                    panelRect.height === 0
                ) {
                    return;
                }

                const horizontalRatio =
                    (
                        event.clientX -
                        panelRect.left
                    ) /
                    panelRect.width;

                const verticalRatio =
                    (
                        event.clientY -
                        panelRect.top
                    ) /
                    panelRect.height;

                /*
                 * 光幕角度：
                 * 以 215deg 为中心，
                 * 左右最大变化约 10deg。
                 */
                const angleOffset =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    20;

                /*
                 * 光幕位置：
                 * 仅产生少量偏移。
                 */
                const lightShiftX =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    8;

                const lightShiftY =
                    (
                        verticalRatio -
                        0.5
                    ) *
                    5;

                /*
                 * 面板倾斜：
                 * 鼠标向上时，上方向外抬起；
                 * 鼠标向右时，右侧向外抬起。
                 */
                const rotateX =
                    (
                        0.5 -
                        verticalRatio
                    ) *
                    3;

                const rotateY =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    3;

                panel.style.setProperty(
                    "--panel-light-angle",
                    `${
                        215 +
                        angleOffset
                    }deg`
                );

                panel.style.setProperty(
                    "--panel-light-shift-x",
                    `${lightShiftX.toFixed(
                        2
                    )}px`
                );

                panel.style.setProperty(
                    "--panel-light-shift-y",
                    `${lightShiftY.toFixed(
                        2
                    )}px`
                );

                panel.style.setProperty(
                    "--panel-rotate-x",
                    `${rotateX.toFixed(
                        2
                    )}deg`
                );

                panel.style.setProperty(
                    "--panel-rotate-y",
                    `${rotateY.toFixed(
                        2
                    )}deg`
                );
            }
        );

        panel.addEventListener(
            "mouseleave",
            () => {
                resetPanelPointerEffect(
                    panel
                );
            }
        );
    });
}