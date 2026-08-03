/* ===========================
    情报署标志磁吸
=========================== */

export function initializeNhnLogoMagnet() {
    const nhnLogo =
        document.querySelector(
            ".nhn-logo"
        );

    if (!nhnLogo) {
        return;
    }

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    if (!supportsPointerEffects) {
        return;
    }

    /*
     * 鼠标磁吸最大作用距离。
     * 增大该值可扩大鼠标感应范围。
     */
    const magnetDistance = 360;

    /*
     * 图片最大位移距离。
     */
    const magnetOffset = 16;

    /*
     * 图片位移缓动系数。
     * 数值越大，跟随速度越快。
     */
    const interpolationFactor = 0.12;

    let currentX = 0;
    let currentY = 0;

    let targetX = 0;
    let targetY = 0;

    let animationFrame = null;

    function hasActiveMovement() {
        const distanceToTarget =
            Math.hypot(
                targetX - currentX,
                targetY - currentY
            );

        return distanceToTarget > 0.01;
    }

    function animateLogo() {
        currentX +=
            (
                targetX -
                currentX
            ) *
            interpolationFactor;

        currentY +=
            (
                targetY -
                currentY
            ) *
            interpolationFactor;

        nhnLogo.style.transform =
            `translate3d(` +
            `${currentX}px, ` +
            `${currentY}px, 0)`;

        if (hasActiveMovement()) {
            animationFrame =
                window.requestAnimationFrame(
                    animateLogo
                );

            return;
        }

        currentX = targetX;
        currentY = targetY;

        nhnLogo.style.transform =
            `translate3d(` +
            `${currentX}px, ` +
            `${currentY}px, 0)`;

        animationFrame = null;
    }

    function startLogoAnimation() {
        if (animationFrame !== null) {
            return;
        }

        animationFrame =
            window.requestAnimationFrame(
                animateLogo
            );
    }

    function resetLogoPosition() {
        targetX = 0;
        targetY = 0;

        nhnLogo.style.opacity =
            "0.9";

        startLogoAnimation();
    }

    document.addEventListener(
        "mousemove",
        event => {
            const logoRect =
                nhnLogo.getBoundingClientRect();

            const centerX =
                logoRect.left +
                logoRect.width / 2;

            const centerY =
                logoRect.top +
                logoRect.height / 2;

            const deltaX =
                event.clientX -
                centerX;

            const deltaY =
                event.clientY -
                centerY;

            const distance =
                Math.hypot(
                    deltaX,
                    deltaY
                );

            if (
                distance <
                magnetDistance
            ) {
                const strength =
                    1 -
                    distance /
                    magnetDistance;

                targetX =
                    deltaX *
                    (
                        magnetOffset /
                        magnetDistance
                    ) *
                    strength;

                targetY =
                    deltaY *
                    (
                        magnetOffset /
                        magnetDistance
                    ) *
                    strength;

                nhnLogo.style.opacity =
                    "1";
            } else {
                targetX = 0;
                targetY = 0;

                nhnLogo.style.opacity =
                    "0.9";
            }

            startLogoAnimation();
        }
    );

    document.addEventListener(
        "mouseleave",
        resetLogoPosition
    );
}