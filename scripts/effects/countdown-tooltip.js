/* ===========================
    倒计时 Tooltip
=========================== */

export function initializeCountdownTooltip() {
    const countdownElement =
        document.getElementById(
            "countdown"
        );

    if (!countdownElement) {
        return;
    }

    const tooltip =
        document.createElement("div");

    tooltip.id =
        "age-tooltip";

    tooltip.textContent =
        "New Horizon 的年龄";

    tooltip.style.position =
        "absolute";

    tooltip.style.background =
        "rgba(0, 0, 0, 0.8)";

    tooltip.style.borderRadius =
        "5px";

    tooltip.style.color =
        "#EEEEEE";

    tooltip.style.display =
        "none";

    tooltip.style.fontSize =
        "0.9em";

    tooltip.style.padding =
        "5px 10px";

    tooltip.style.pointerEvents =
        "none";

    tooltip.style.whiteSpace =
        "nowrap";

    tooltip.style.zIndex =
        "1000";

    document.body.appendChild(
        tooltip
    );

    function isCountdownVisible() {
        const countdownStyle =
            window.getComputedStyle(
                countdownElement
            );

        return (
            countdownStyle.opacity !==
                "0" &&
            countdownStyle.display !==
                "none" &&
            countdownStyle.visibility !==
                "hidden"
        );
    }

    function updateTooltipPosition(event) {
        tooltip.style.left =
            `${event.pageX + 10}px`;

        tooltip.style.top =
            `${event.pageY + 10}px`;
    }

    function showTooltip(event) {
        if (!isCountdownVisible()) {
            return;
        }

        updateTooltipPosition(event);

        tooltip.style.display =
            "block";
    }

    function hideTooltip() {
        tooltip.style.display =
            "none";
    }

    countdownElement.addEventListener(
        "mouseenter",
        showTooltip
    );

    countdownElement.addEventListener(
        "mousemove",
        event => {
            if (
                tooltip.style.display ===
                "none"
            ) {
                return;
            }

            updateTooltipPosition(event);
        }
    );

    countdownElement.addEventListener(
        "mouseleave",
        hideTooltip
    );

    countdownElement.addEventListener(
        "click",
        event => {
            if (
                tooltip.style.display ===
                "block"
            ) {
                hideTooltip();
                return;
            }

            showTooltip(event);
        }
    );
}