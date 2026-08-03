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
            "(hover: hover) and (pointer: fine)"
        );

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

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
            !reducedMotionQuery.matches
        );
    }


    /* ===========================
       启用
    =========================== */

    function enableCursor() {
        if (!finePointerQuery.matches) {
            return;
        }

        enabled =
            true;

        document.body.classList.add(
            "is-worldview-cursor-active"
        );

        cursor.classList.add(
            "is-active"
        );

        startAnimation();
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
        if (!enabled) {
            return;
        }

        pointerX =
            event.clientX;

        pointerY =
            event.clientY;

        if (!targetObject) {
            setFreeCursorTarget();
        }
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

        cursor.classList.add(
            "is-locked"
        );

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
            reducedMotionQuery.matches
        ) {
            return;
        }

        updateLockedTarget();

        const centerX =
            targetX +
            targetWidth /
            2;

        const centerY =
            targetY +
            targetHeight /
            2;

        crosshair.style.setProperty(
            "--crosshair-x",
            `${centerX}px`
        );

        crosshair.style.setProperty(
            "--crosshair-y",
            `${centerY}px`
        );

        crosshair.classList.remove(
            "is-releasing"
        );

        void crosshair.offsetWidth;

        crosshair.classList.add(
            "is-releasing"
        );
    }


    /* ===========================
       暂停与恢复
    =========================== */

    function suspendCursor() {
        suspended =
            true;

        clearTarget();

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

        setFreeCursorTarget();
    }


    /* ===========================
       动画
    =========================== */

    function animate() {
        if (!canRun()) {
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
                0.2
            );

        currentY =
            lerp(
                currentY,
                targetY,
                0.2
            );

        currentWidth =
            lerp(
                currentWidth,
                targetWidth,
                0.18
            );

        currentHeight =
            lerp(
                currentHeight,
                targetHeight,
                0.18
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

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }

    function startAnimation() {
        if (
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

    crosshair.addEventListener(
        "animationend",
        () => {
            crosshair.classList.remove(
                "is-releasing"
            );
        }
    );

    initialized =
        true;
}