/* ===========================
   世界观 Target Cursor
   与 Crosshair
=========================== */

let initialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeWorldviewTargetCursor() {
    if (initialized) {
        return;
    }

    const cursor =
        document.getElementById(
            "worldview-target-cursor"
        );

    const crosshair =
        document.getElementById(
            "worldview-crosshair"
        );

    const worldviewSection =
        document.getElementById(
            "worldview-section"
        );

    if (
        !cursor ||
        !crosshair ||
        !worldviewSection
    ) {
        console.warn(
            "世界观目标光标初始化失败：缺少必要元素。"
        );

        return;
    }

    const finePointerQuery =
        window.matchMedia(
            "(min-width: 769px) and (hover: hover) and (pointer: fine)"
        );

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    const worldviewCanvas = document.getElementById("worldview-canvas");
    const horizontal = crosshair.querySelector(".worldview-crosshair-horizontal");
    const vertical = crosshair.querySelector(".worldview-crosshair-vertical");
    const turbulence = [...crosshair.querySelectorAll("feTurbulence")];
    const displacement = [...crosshair.querySelectorAll("feDisplacementMap")];
    let pointerInside = false;
    let pointerKnown = false;
    let lastPointerAt = 0;
    let crosshairX = 0;
    let crosshairY = 0;
    let pulseStartedAt = 0;
    let pulseEndsAt = 0;
    let pulseStrength = 0;
    let lineAnimations = [];

    let enabled =
        false;

    let suspended =
        false;

    let targetObject =
        null;

    let targetCamera =
        null;

    let targetCanvas =
        null;

    let lastTargetObject =
        null;

    let pointerX =
        -100;

    let pointerY =
        -100;

    let currentX =
        -100;

    let currentY =
        -100;

    let currentWidth =
        26;

    let currentHeight =
        26;

    let targetX =
        -100;

    let targetY =
        -100;

    let targetWidth =
        26;

    let targetHeight =
        26;

    let animationFrameId =
        null;

    const box =
        new THREE.Box3();

    const point =
        new THREE.Vector3();

    const corners = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3()
    ];


    /* ===========================
       工具
    =========================== */

    function lerp(
        start,
        end,
        amount
    ) {
        return start +
            (
                end -
                start
            ) *
            amount;
    }

    function canRun() {
        return (
            enabled &&
            finePointerQuery.matches &&
            pointerInside &&
            !document.hidden &&
            !worldviewSection.matches(".is-core-establishing, .is-core-restoring, .is-core-exiting")
        );
    }

    function resetCrosshair() {
        lineAnimations.forEach(animation => animation.cancel());
        lineAnimations = [];
        pulseEndsAt = 0;
        displacement.forEach(node => node.setAttribute("scale", "0"));
        crosshair.classList.remove("is-releasing");
    }

    function hidePointer() {
        pointerInside = false;
        cursor.classList.remove("is-active", "is-locked");
        document.body.classList.remove("is-worldview-cursor-active");
        resetCrosshair();
        stopAnimation();
    }


    /* ===========================
       启用
    =========================== */

    function enableCursor() {
        enabled =
            true;
        suspended = false;
        pointerInside = false;
    }


    /* ===========================
       禁用
    =========================== */

    function disableCursor() {
        enabled =
            false;

        suspended =
            false;

        targetObject =
            null;

        targetCamera =
            null;

        targetCanvas =
            null;

        lastTargetObject =
            null;

        hidePointer();

        cursor.classList.remove(
            "is-active",
            "is-locked",
            "is-suspended"
        );

        document.body.classList.remove(
            "is-worldview-cursor-active"
        );

        stopAnimation();
    }


    /* ===========================
       鼠标移动
    =========================== */

    function handlePointerMove(
        event
    ) {
        if (!enabled || !finePointerQuery.matches || event.pointerType === "touch") {
            return;
        }

        // 目录范围只决定何时启用光标；十字线保留 fixed/inset:0 的全视口长度。
        const rect = worldviewSection.getBoundingClientRect();
        const wasInside = pointerInside;
        pointerInside = event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom &&
            (event.target === worldviewCanvas || worldviewSection.contains(event.target));
        if (!pointerInside) {
            hidePointer();
            return;
        }

        if (!canRun()) {
            hidePointer();
            return;
        }

        pointerX =
            event.clientX;

        pointerY =
            event.clientY;

        if (!wasInside) {
            crosshairX = pointerX;
            crosshairY = pointerY;
            currentX = pointerX - 13;
            currentY = pointerY - 13;
            currentWidth = currentHeight = 26;
            cursor.style.setProperty("--target-cursor-x", `${currentX}px`);
            cursor.style.setProperty("--target-cursor-y", `${currentY}px`);
            cursor.style.setProperty("--target-cursor-width", "26px");
            cursor.style.setProperty("--target-cursor-height", "26px");
            crosshair.style.setProperty("--crosshair-x", `${crosshairX}px`);
            crosshair.style.setProperty("--crosshair-y", `${crosshairY}px`);
        }
        pointerKnown = true;
        cursor.classList.add("is-active");
        cursor.classList.toggle("is-locked", !!targetObject && !suspended);
        document.body.classList.add("is-worldview-cursor-active");
        const now = performance.now();
        if (!wasInside || (now - lastPointerAt > 700 && now > pulseEndsAt)) {
            releaseCrosshair();
        }
        lastPointerAt = now;

        if (!targetObject) {
            setFreeCursorTarget();
        }
        startAnimation();
    }

    function setFreeCursorTarget() {
        targetWidth =
            26;

        targetHeight =
            26;

        targetX =
            pointerX -
            targetWidth /
            2;

        targetY =
            pointerY -
            targetHeight /
            2;

        cursor.classList.remove(
            "is-locked"
        );
    }


    /* ===========================
       锁定目标
    =========================== */

    function handleTarget(
        event
    ) {
        const detail =
            event.detail;

        if (
            !enabled ||
            !detail?.object ||
            !detail?.camera ||
            !detail?.canvas
        ) {
            return;
        }

        targetObject =
            detail.object;

        targetCamera =
            detail.camera;

        targetCanvas =
            detail.canvas;

        cursor.classList.toggle("is-locked", canRun() && !suspended);

        if (
            targetObject !==
            lastTargetObject
        ) {
            lastTargetObject =
                targetObject;

            releaseCrosshair();
        }
    }


    /* ===========================
       清除目标
    =========================== */

    function clearTarget() {
        targetObject =
            null;

        targetCamera =
            null;

        targetCanvas =
            null;

        lastTargetObject =
            null;

        cursor.classList.remove(
            "is-locked"
        );

        setFreeCursorTarget();
    }


    /* ===========================
       计算 3D 对象屏幕边界
    =========================== */

    function updateLockedTarget() {
        if (
            !targetObject ||
            !targetCamera ||
            !targetCanvas
        ) {
            return;
        }

        box.setFromObject(
            targetObject
        );

        if (box.isEmpty()) {
            clearTarget();
            return;
        }

        const min =
            box.min;

        const max =
            box.max;

        corners[0].set(
            min.x,
            min.y,
            min.z
        );

        corners[1].set(
            max.x,
            min.y,
            min.z
        );

        corners[2].set(
            min.x,
            max.y,
            min.z
        );

        corners[3].set(
            max.x,
            max.y,
            min.z
        );

        corners[4].set(
            min.x,
            min.y,
            max.z
        );

        corners[5].set(
            max.x,
            min.y,
            max.z
        );

        corners[6].set(
            min.x,
            max.y,
            max.z
        );

        corners[7].set(
            max.x,
            max.y,
            max.z
        );

        const canvasRect =
            targetCanvas
                .getBoundingClientRect();

        let left =
            Infinity;

        let top =
            Infinity;

        let right =
            -Infinity;

        let bottom =
            -Infinity;

        corners.forEach(
            corner => {
                point.copy(
                    corner
                );

                point.project(
                    targetCamera
                );

                const screenX =
                    canvasRect.left +
                    (
                        point.x +
                        1
                    ) /
                    2 *
                    canvasRect.width;

                const screenY =
                    canvasRect.top +
                    (
                        1 -
                        point.y
                    ) /
                    2 *
                    canvasRect.height;

                left =
                    Math.min(
                        left,
                        screenX
                    );

                top =
                    Math.min(
                        top,
                        screenY
                    );

                right =
                    Math.max(
                        right,
                        screenX
                    );

                bottom =
                    Math.max(
                        bottom,
                        screenY
                    );
            }
        );

        const padding =
            9;

        targetX =
            left -
            padding;

        targetY =
            top -
            padding;

        targetWidth =
            Math.max(
                24,
                right -
                left +
                padding *
                2
            );

        targetHeight =
            Math.max(
                24,
                bottom -
                top +
                padding *
                2
            );
    }


    /* ===========================
       Crosshair 释放
    =========================== */

    function releaseCrosshair() {
        if (
            !canRun() || suspended || reducedMotionQuery.matches || !horizontal || !vertical
        ) {
            return;
        }
        resetCrosshair();
        pulseStartedAt = performance.now();
        pulseEndsAt = pulseStartedAt + 1180;
        pulseStrength = targetObject ? 22 : 9;
        crosshair.classList.add("is-releasing");
        lineAnimations = [horizontal, vertical].map((line, index) => {
            const filter = `url(#worldview-crosshair-noise-${index ? "y" : "x"})`;
            return line.animate([
                { opacity: 0, filter: `${filter} blur(1.5px)`, offset: 0 },
                { opacity: 0.72, filter: `${filter} blur(0px)`, offset: 0.13 },
                { opacity: 0.6, filter: `${filter} blur(0px)`, offset: 0.43 },
                { opacity: 0, filter: `${filter} blur(3.5px)`, offset: 1 }
            ], { duration: 1180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        });
        lineAnimations[0].onfinish = () => {
            pulseEndsAt = 0;
            crosshair.classList.remove("is-releasing");
            displacement.forEach(node => node.setAttribute("scale", "0"));
        };
        startAnimation();
    }


    /* ===========================
       暂停与恢复
    =========================== */

    function suspendCursor() {
        suspended =
            true;

        resetCrosshair();
        stopAnimation();

        cursor.classList.add(
            "is-suspended"
        );
    }

    function resumeCursor() {
        suspended =
            false;

        cursor.classList.remove(
            "is-suspended"
        );

        if (!targetObject) setFreeCursorTarget();
        if (canRun()) startAnimation();
    }


    /* ===========================
       动画
    =========================== */

    function animate() {
        if (!canRun() || suspended) {
            animationFrameId =
                null;

            return;
        }

        if (
            targetObject &&
            !suspended
        ) {
            updateLockedTarget();
        } else if (
            !targetObject
        ) {
            setFreeCursorTarget();
        }

        currentX =
            lerp(
                currentX,
                targetX,
                reducedMotionQuery.matches ? 1 : 0.2
            );

        currentY =
            lerp(
                currentY,
                targetY,
                reducedMotionQuery.matches ? 1 : 0.2
            );

        currentWidth =
            lerp(
                currentWidth,
                targetWidth,
                reducedMotionQuery.matches ? 1 : 0.18
            );

        currentHeight =
            lerp(
                currentHeight,
                targetHeight,
                reducedMotionQuery.matches ? 1 : 0.18
            );

        cursor.style.setProperty(
            "--target-cursor-x",
            `${currentX}px`
        );

        cursor.style.setProperty(
            "--target-cursor-y",
            `${currentY}px`
        );

        cursor.style.setProperty(
            "--target-cursor-width",
            `${currentWidth}px`
        );

        cursor.style.setProperty(
            "--target-cursor-height",
            `${currentHeight}px`
        );

        const now = performance.now();
        if (pulseEndsAt > now) {
            const followX = targetObject ? targetX + targetWidth / 2 : pointerX;
            const followY = targetObject ? targetY + targetHeight / 2 : pointerY;
            crosshairX = lerp(crosshairX, followX, 0.15);
            crosshairY = lerp(crosshairY, followY, 0.15);
            crosshair.style.setProperty("--crosshair-x", `${crosshairX}px`);
            crosshair.style.setProperty("--crosshair-y", `${crosshairY}px`);
            const progress = Math.min(1, (now - pulseStartedAt) / 430);
            turbulence.forEach(node => node.setAttribute("baseFrequency", String(Math.max(0.000001, (1 - progress) * 0.085))));
            displacement.forEach(node => node.setAttribute("scale", String(pulseStrength * Math.pow(1 - progress, 2))));
        }

        // No perpetual free-cursor loop: targets keep tracking their 3D orbit, idle pointers stop.
        const unsettled = Math.abs(currentX - targetX) + Math.abs(currentY - targetY) +
            Math.abs(currentWidth - targetWidth) + Math.abs(currentHeight - targetHeight) > 0.1;
        if (!targetObject && !unsettled && now >= pulseEndsAt) {
            animationFrameId = null;
            return;
        }

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }

    function startAnimation() {
        if (
            !canRun() || suspended ||
            animationFrameId !==
            null
        ) {
            return;
        }

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }

    function stopAnimation() {
        if (
            animationFrameId ===
            null
        ) {
            return;
        }

        window.cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId =
            null;
    }


    /* ===========================
       事件绑定
    =========================== */

    window.addEventListener(
        "pointermove",
        handlePointerMove,
        {
            capture: true,
            passive:
                true
        }
    );

    window.addEventListener(
        "worldview-core-show",
        enableCursor
    );

    window.addEventListener(
        "worldview-core-hide",
        disableCursor
    );

    window.addEventListener(
        "worldview-cursor-target",
        handleTarget
    );

    window.addEventListener(
        "worldview-cursor-clear",
        clearTarget
    );

    window.addEventListener(
        "worldview-cursor-suspend",
        suspendCursor
    );

    window.addEventListener(
        "worldview-cursor-resume",
        resumeCursor
    );

    worldviewCanvas?.addEventListener("pointerleave", hidePointer);
    document.documentElement.addEventListener("pointerleave", hidePointer);
    window.addEventListener("blur", hidePointer);
    window.addEventListener("pagehide", hidePointer);
    window.addEventListener("resize", hidePointer);
    window.addEventListener("scroll", hidePointer, { passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) hidePointer(); });
    finePointerQuery.addEventListener("change", () => {
        hidePointer();
        document.body.classList.remove("is-worldview-cursor-active");
    });
    reducedMotionQuery.addEventListener("change", () => {
        resetCrosshair();
        if (pointerKnown && canRun()) startAnimation();
    });

    initialized =
        true;
}
