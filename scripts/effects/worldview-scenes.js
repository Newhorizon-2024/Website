/* ===========================
   世界观 · 场景球体
=========================== */

let worldviewScenesInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeWorldviewScenes() {
    if (worldviewScenesInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "worldview-scenes-section"
        );

    const globe =
        document.getElementById(
            "scenes-globe"
        );

    const canvas =
        document.getElementById(
            "scenes-globe-canvas"
        );

    if (
        !section ||
        !globe ||
        !canvas
    ) {
        return;
    }

    const context =
        canvas.getContext(
            "2d"
        );

    const nodeElements =
        Array.from(
            globe.querySelectorAll(
                ".scene-node"
            )
        );

    const currentButton =
        globe.querySelector(
            ".scenes-current"
        );

    const currentIndexElement =
        globe.querySelector(
            ".scenes-current-index"
        );

    const currentNameElement =
        globe.querySelector(
            ".scenes-current-name"
        );

    const currentCoordinateElement =
        globe.querySelector(
            ".scenes-current-coordinate"
        );

    const currentStatusElement =
        globe.querySelector(
            ".scenes-current-status"
        );

    if (
        !context ||
        nodeElements.length === 0 ||
        !currentButton ||
        !currentIndexElement ||
        !currentNameElement ||
        !currentCoordinateElement ||
        !currentStatusElement
    ) {
        console.warn(
            "场景球体初始化失败：缺少必要元素。"
        );

        return;
    }

    worldviewScenesInitialized =
        true;


    /* ===========================
       场景数据
    =========================== */

    const scenes =
        nodeElements.map(
            (
                element,
                index
            ) => {
                const latitude =
                    Number.parseFloat(
                        element.dataset
                            .latitude ||
                        "0"
                    );

                const longitude =
                    Number.parseFloat(
                        element.dataset
                            .longitude ||
                        "0"
                    );

                return {
                    element,

                    id:
                        element.dataset
                            .sceneId ||
                        `scene-${index}`,

                    name:
                        element.dataset
                            .sceneName ||
                        element.textContent
                            .trim(),

                    latitude:
                        Number.isFinite(
                            latitude
                        )
                            ? latitude
                            : 0,

                    longitude:
                        Number.isFinite(
                            longitude
                        )
                            ? longitude
                            : 0,

                    sectionId:
                        element.dataset
                            .sectionId ||
                        "",

                    vector:
                        latitudeLongitudeToVector(
                            latitude,
                            longitude
                        ),

                    rotatedVector: {
                        x: 0,
                        y: 0,
                        z: 0
                    }
                };
            }
        );


    /* ===========================
       基础状态
    =========================== */

    let canvasWidth =
        0;

    let canvasHeight =
        0;

    let globeRadius =
        0;

    /* 昼夜交界缓慢绕球体移动，避免与球体旋转完全同步。 */
    let lightingPhase =
        -0.72;

    let selectedIndex =
        0;

    let rotationYaw =
        -degreesToRadians(
            scenes[0].longitude
        );

    let rotationPitch =
        degreesToRadians(
            scenes[0].latitude
        );

    let targetYaw =
        rotationYaw;

    let targetPitch =
        rotationPitch;

    let focusActive =
        true;

    let dragging =
        false;

    let pointerInside =
        false;

    let activePointerId =
        null;

    let previousPointerX =
        0;

    let previousPointerY =
        0;

    let totalDragDistance =
        0;

    let suppressClick =
        false;

    let velocityYaw =
        0;

    let velocityPitch =
        0;

    let previousFrameTime =
        performance.now();

    let unavailableFeedbackStartedAt =
        -Infinity;

    const unavailableFeedbackDuration =
        650;

    let animationFrameId =
        null;

    let animationActive =
        false;

    let lenisStoppedByGlobe =
        false;

    const dragClickThreshold =
        7;

    const autoRotationSpeed =
        0.000055;

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    /* ===========================
       数学工具
    =========================== */

    function clamp(
        value,
        minimum,
        maximum
    ) {
        return Math.min(
            maximum,
            Math.max(
                minimum,
                value
            )
        );
    }

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

    function degreesToRadians(
        degrees
    ) {
        return (
            degrees *
            Math.PI /
            180
        );
    }

    function normalizeAngle(
        angle
    ) {
        while (
            angle >
            Math.PI
        ) {
            angle -=
                Math.PI *
                2;
        }

        while (
            angle <
            -Math.PI
        ) {
            angle +=
                Math.PI *
                2;
        }

        return angle;
    }

    function shortestAngleDifference(
        current,
        target
    ) {
        return normalizeAngle(
            target -
            current
        );
    }


    /* ===========================
       经纬度转换为球面坐标
    =========================== */

    function latitudeLongitudeToVector(
        latitude,
        longitude
    ) {
        const latitudeRadians =
            degreesToRadians(
                latitude
            );

        const longitudeRadians =
            degreesToRadians(
                longitude
            );

        const latitudeCosine =
            Math.cos(
                latitudeRadians
            );

        return {
            x:
                latitudeCosine *
                Math.sin(
                    longitudeRadians
                ),

            y:
                Math.sin(
                    latitudeRadians
                ),

            z:
                latitudeCosine *
                Math.cos(
                    longitudeRadians
                )
        };
    }


    /* ===========================
       旋转球面坐标
    =========================== */

    function rotateVector(
        vector,
        yaw,
        pitch
    ) {
        const yawCosine =
            Math.cos(
                yaw
            );

        const yawSine =
            Math.sin(
                yaw
            );

        const pitchCosine =
            Math.cos(
                pitch
            );

        const pitchSine =
            Math.sin(
                pitch
            );

        /*
         * 先绕 Y 轴旋转。
         */
        const yawX =
            vector.x *
                yawCosine +
            vector.z *
                yawSine;

        const yawZ =
            -vector.x *
                yawSine +
            vector.z *
                yawCosine;

        /*
         * 再绕 X 轴旋转。
         */
        const pitchY =
            vector.y *
                pitchCosine -
            yawZ *
                pitchSine;

        const pitchZ =
            vector.y *
                pitchSine +
            yawZ *
                pitchCosine;

        return {
            x:
                yawX,

            y:
                pitchY,

            z:
                pitchZ
        };
    }


    /* ===========================
       Section 是否显示
    =========================== */

    function isSectionActive() {
        return (
            section.classList.contains(
                "is-active"
            ) ||
            section.classList.contains(
                "depth-enter"
            ) ||
            section.classList.contains(
                "slide-enter-left"
            ) ||
            section.classList.contains(
                "slide-enter-right"
            )
        );
    }


    /* ===========================
       Lenis 控制
    =========================== */

    function stopPageScrolling() {
        if (lenisStoppedByGlobe) {
            return;
        }

        if (
            window.lenis &&
            typeof window.lenis.stop ===
                "function"
        ) {
            window.lenis.stop();

            lenisStoppedByGlobe =
                true;
        }
    }

    function restorePageScrolling() {
        if (!lenisStoppedByGlobe) {
            return;
        }

        if (
            window.lenis &&
            typeof window.lenis.start ===
                "function"
        ) {
            window.lenis.start();
        }

        lenisStoppedByGlobe =
            false;
    }


    /* ===========================
       Canvas 尺寸
    =========================== */

    function resizeCanvas() {
        /*
         * clientWidth / clientHeight 读取未受 CSS transform 影响的布局尺寸。
         * Section 入场时存在 scale(0.98)，若使用 getBoundingClientRect()，
         * Canvas 会先按缩小后的尺寸绘制，再在转场结束后突然放大。
         */
        const layoutWidth =
            globe.clientWidth;

        const layoutHeight =
            globe.clientHeight;

        if (
            layoutWidth <= 0 ||
            layoutHeight <= 0
        ) {
            return;
        }

        const pixelRatio =
            Math.min(
                window.devicePixelRatio ||
                    1,
                2
            );

        canvasWidth =
            layoutWidth;

        canvasHeight =
            layoutHeight;

        globeRadius =
            Math.min(
                canvasWidth,
                canvasHeight
            ) *
            0.365;

        canvas.width =
            Math.max(
                1,
                Math.round(
                    canvasWidth *
                    pixelRatio
                )
            );

        canvas.height =
            Math.max(
                1,
                Math.round(
                    canvasHeight *
                    pixelRatio
                )
            );

        canvas.style.width =
            `${canvasWidth}px`;

        canvas.style.height =
            `${canvasHeight}px`;

        context.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        renderGlobe();
    }


    /* ===========================
       绘制球体线段
    =========================== */

    function drawProjectedSegment(
        firstPoint,
        secondPoint,
        baseOpacity
    ) {
        const centerX =
            canvasWidth /
            2;

        const centerY =
            canvasHeight /
            2;

        const averageDepth =
            (
                firstPoint.z +
                secondPoint.z
            ) /
            2;

        const depthOpacity =
            clamp(
                (
                    averageDepth +
                    1
                ) /
                2,
                0,
                1
            );

        const opacity =
            baseOpacity *
            (
                0.18 +
                depthOpacity *
                0.82
            );

        context.strokeStyle =
            `rgba(
                238,
                238,
                238,
                ${opacity}
            )`;

        context.beginPath();

        context.moveTo(
            centerX +
                firstPoint.x *
                globeRadius,
            centerY -
                firstPoint.y *
                globeRadius
        );

        context.lineTo(
            centerX +
                secondPoint.x *
                globeRadius,
            centerY -
                secondPoint.y *
                globeRadius
        );

        context.stroke();
    }


    /* ===========================
       绘制纬线
    =========================== */

    function drawLatitudeLines() {
        const latitudeValues = [
            -60,
            -30,
            0,
            30,
            60
        ];

        latitudeValues.forEach(
            latitude => {
                let previousPoint =
                    null;

                for (
                    let longitude = -180;
                    longitude <= 180;
                    longitude += 5
                ) {
                    const vector =
                        latitudeLongitudeToVector(
                            latitude,
                            longitude
                        );

                    const rotated =
                        rotateVector(
                            vector,
                            rotationYaw,
                            rotationPitch
                        );

                    if (previousPoint) {
                        drawProjectedSegment(
                            previousPoint,
                            rotated,
                            latitude === 0
                                ? 0.12
                                : 0.065
                        );
                    }

                    previousPoint =
                        rotated;
                }
            }
        );
    }


    /* ===========================
       绘制经线
    =========================== */

    function drawLongitudeLines() {
        for (
            let longitude = -150;
            longitude <= 180;
            longitude += 30
        ) {
            let previousPoint =
                null;

            for (
                let latitude = -90;
                latitude <= 90;
                latitude += 4
            ) {
                const vector =
                    latitudeLongitudeToVector(
                        latitude,
                        longitude
                    );

                const rotated =
                    rotateVector(
                        vector,
                        rotationYaw,
                        rotationPitch
                    );

                if (previousPoint) {
                    drawProjectedSegment(
                        previousPoint,
                        rotated,
                        0.065
                    );
                }

                previousPoint =
                    rotated;
            }
        }
    }


    /* ===========================
       绘制球体轮廓
    =========================== */

    function drawGlobeOutline() {
        const centerX =
            canvasWidth /
            2;

        const centerY =
            canvasHeight /
            2;

        const gradient =
            context.createRadialGradient(
                centerX -
                    globeRadius *
                    0.2,
                centerY -
                    globeRadius *
                    0.25,
                globeRadius *
                    0.1,
                centerX,
                centerY,
                globeRadius
            );

        gradient.addColorStop(
            0,
            "rgba(255, 255, 255, 0.035)"
        );

        gradient.addColorStop(
            0.7,
            "rgba(255, 255, 255, 0.008)"
        );

        gradient.addColorStop(
            1,
            "rgba(255, 255, 255, 0)"
        );

        context.fillStyle =
            gradient;

        context.beginPath();

        context.arc(
            centerX,
            centerY,
            globeRadius,
            0,
            Math.PI *
                2
        );

        context.fill();

        context.strokeStyle =
            "rgba(238, 238, 238, 0.13)";

        context.lineWidth =
            1;

        context.stroke();
    }


    /* ===========================
       昼夜光照与大气边缘
    =========================== */

    function drawGlobeLighting() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const lightX = Math.cos(lightingPhase);
        const lightY = Math.sin(lightingPhase) * 0.62;

        context.save();
        context.beginPath();
        context.arc(
            centerX,
            centerY,
            globeRadius,
            0,
            Math.PI * 2
        );
        context.clip();

        const dayNightGradient =
            context.createLinearGradient(
                centerX - lightX * globeRadius,
                centerY - lightY * globeRadius,
                centerX + lightX * globeRadius,
                centerY + lightY * globeRadius
            );

        dayNightGradient.addColorStop(
            0,
            "rgba(0, 0, 0, 0.52)"
        );
        dayNightGradient.addColorStop(
            0.42,
            "rgba(4, 7, 12, 0.25)"
        );
        dayNightGradient.addColorStop(
            0.57,
            "rgba(150, 182, 215, 0.018)"
        );
        dayNightGradient.addColorStop(
            1,
            "rgba(210, 228, 244, 0.075)"
        );

        context.fillStyle =
            dayNightGradient;
        context.fillRect(
            centerX - globeRadius,
            centerY - globeRadius,
            globeRadius * 2,
            globeRadius * 2
        );

        const daylightGlow =
            context.createRadialGradient(
                centerX + lightX * globeRadius * 0.42,
                centerY + lightY * globeRadius * 0.42,
                0,
                centerX + lightX * globeRadius * 0.42,
                centerY + lightY * globeRadius * 0.42,
                globeRadius * 0.95
            );

        daylightGlow.addColorStop(
            0,
            "rgba(211, 231, 248, 0.07)"
        );
        daylightGlow.addColorStop(
            0.58,
            "rgba(112, 151, 188, 0.025)"
        );
        daylightGlow.addColorStop(
            1,
            "rgba(0, 0, 0, 0)"
        );

        context.fillStyle =
            daylightGlow;
        context.fillRect(
            centerX - globeRadius,
            centerY - globeRadius,
            globeRadius * 2,
            globeRadius * 2
        );
        context.restore();
    }

    function drawAtmosphereRim() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const rimGradient =
            context.createLinearGradient(
                centerX - globeRadius,
                centerY,
                centerX + globeRadius,
                centerY
            );

        rimGradient.addColorStop(
            0,
            "rgba(92, 126, 158, 0.025)"
        );
        rimGradient.addColorStop(
            0.5,
            "rgba(190, 219, 242, 0.12)"
        );
        rimGradient.addColorStop(
            1,
            "rgba(116, 164, 202, 0.045)"
        );

        context.save();
        context.beginPath();
        context.arc(
            centerX,
            centerY,
            globeRadius + 0.75,
            0,
            Math.PI * 2
        );
        context.strokeStyle =
            rimGradient;
        context.lineWidth =
            Math.max(
                1.5,
                globeRadius * 0.012
            );
        context.shadowBlur =
            Math.max(
                5,
                globeRadius * 0.035
            );
        context.shadowColor =
            "rgba(120, 174, 214, 0.16)";
        context.stroke();
        context.restore();
    }


    /* ===========================
       更新节点位置
    =========================== */

    function updateSceneNodes() {
        const centerX =
            canvasWidth /
            2;

        const centerY =
            canvasHeight /
            2;

        scenes.forEach(
            (
                scene,
                index
            ) => {
                const rotated =
                    rotateVector(
                        scene.vector,
                        rotationYaw,
                        rotationPitch
                    );

                scene.rotatedVector =
                    rotated;

                const depth =
                    clamp(
                        (
                            rotated.z +
                            1
                        ) /
                        2,
                        0,
                        1
                    );

                const perspectiveScale =
                    0.58 +
                    depth *
                    0.66;

                const opacity =
                    0.12 +
                    depth *
                    0.88;

                const screenX =
                    centerX +
                    rotated.x *
                    globeRadius;

                const screenY =
                    centerY -
                    rotated.y *
                    globeRadius;

                scene.element.style.setProperty(
                    "--scene-x",
                    `${screenX}px`
                );

                scene.element.style.setProperty(
                    "--scene-y",
                    `${screenY}px`
                );

                scene.element.style.setProperty(
                    "--scene-scale",
                    perspectiveScale.toFixed(
                        3
                    )
                );

                scene.element.style.setProperty(
                    "--scene-opacity",
                    opacity.toFixed(
                        3
                    )
                );

                scene.element.style.zIndex =
                    String(
                        Math.round(
                            10 +
                            depth *
                            80
                        )
                    );

                scene.element.classList.toggle(
                    "is-behind",
                    rotated.z <
                        -0.18
                );

                scene.element.classList.toggle(
                    "is-selected",
                    index ===
                        selectedIndex
                );
            }
        );
    }


    /* ===========================
       完整渲染
    =========================== */

    function renderGlobe() {
        if (
            canvasWidth <= 0 ||
            canvasHeight <= 0
        ) {
            return;
        }

        context.clearRect(
            0,
            0,
            canvasWidth,
            canvasHeight
        );

        context.lineWidth =
            1;

        drawGlobeOutline();
        drawGlobeLighting();
        drawLongitudeLines();
        drawLatitudeLines();
        drawAtmosphereRim();
        updateSceneNodes();
    }


    /* ===========================
       坐标文字
    =========================== */

    function formatCoordinate(
        latitude,
        longitude
    ) {
        const latitudeDirection =
            latitude >= 0
                ? "N"
                : "S";

        const longitudeDirection =
            longitude >= 0
                ? "E"
                : "W";

        return (
            `${Math.abs(
                latitude
            ).toFixed(4)}° ${latitudeDirection}` +
            " · " +
            `${Math.abs(
                longitude
            ).toFixed(4)}° ${longitudeDirection}`
        );
    }


    /* ===========================
       更新当前场景信息
    =========================== */

    function updateCurrentScene() {
        const scene =
            scenes[
                selectedIndex
            ];

        if (!scene) {
            return;
        }

        const available =
            scene.sectionId.length >
            0;

        currentIndexElement.textContent =
            `${String(
                selectedIndex +
                    1
            ).padStart(
                2,
                "0"
            )} / ${String(
                scenes.length
            ).padStart(
                2,
                "0"
            )}`;

        currentNameElement.textContent =
            scene.name;

        currentCoordinateElement
            .textContent =
            formatCoordinate(
                scene.latitude,
                scene.longitude
            );

        currentStatusElement.textContent =
            available
                ? "进入场景"
                : "尚未开放";

        currentButton.classList.toggle(
            "is-unavailable",
            !available
        );

        currentButton.setAttribute(
            "aria-label",
            available
                ? `打开${scene.name}`
                : `${scene.name}尚未开放`
        );
    }


    /* ===========================
       聚焦指定场景
    =========================== */

    function focusScene(
        index
    ) {
        const scene =
            scenes[
                index
            ];

        if (!scene) {
            return;
        }

        selectedIndex =
            index;

        targetYaw =
            normalizeAngle(
                -degreesToRadians(
                    scene.longitude
                )
            );

        targetPitch =
            clamp(
                degreesToRadians(
                    scene.latitude
                ),
                -Math.PI *
                    0.46,
                Math.PI *
                    0.46
            );

        velocityYaw =
            0;

        velocityPitch =
            0;

        focusActive =
            true;

        updateCurrentScene();
    }


    /* ===========================
       打开选中场景
    =========================== */

    async function openSelectedScene() {
        const scene =
            scenes[
                selectedIndex
            ];

        if (!scene) {
            return false;
        }

        if (!scene.sectionId) {
            unavailableFeedbackStartedAt =
                performance.now();

            console.info(
                `场景“${scene.name}”暂未开放。`
            );

            window.dispatchEvent(
                new CustomEvent(
                    "worldview-scene-unavailable",
                    {
                        detail: {
                            id:
                                scene.id,

                            name:
                                scene.name,

                            category:
                                "scene",

                            sourceElement:
                                scene.element
                        }
                    }
                )
            );

            return false;
        }

        if (
            !document.getElementById(
                scene.sectionId
            )
        ) {
            console.error(
                `未找到场景区块：#${scene.sectionId}`
            );

            return false;
        }

        if (
            typeof window.showSection !==
            "function"
        ) {
            console.error(
                "全局 showSection 尚未初始化。"
            );

            return false;
        }

        resetInteractionState();

        const result =
            await window.showSection(
                scene.sectionId,
                {
                    transitionType:
                        "slide",

                    direction:
                        "forward",

                    scrollMode:
                        "top",

                    historyMode:
                        "push"
                }
            );

        return result !==
            false;
    }


    /* ===========================
       动画循环
    =========================== */

    function animate(
        currentTime
    ) {
        if (
            !animationActive ||
            !isSectionActive()
        ) {
            animationFrameId =
                null;

            return;
        }

        const deltaTime =
            Math.min(
                40,
                currentTime -
                    previousFrameTime
            );

        previousFrameTime =
            currentTime;

        const unavailableProgress =
            clamp(
                (
                    currentTime -
                    unavailableFeedbackStartedAt
                ) /
                    unavailableFeedbackDuration,
                0,
                1
            );

        const unavailableEnvelope =
            unavailableProgress < 0.42
                ? 1 -
                    Math.pow(
                        1 -
                            unavailableProgress /
                                0.42,
                        3
                    )
                : 1 -
                    Math.pow(
                        (
                            unavailableProgress -
                            0.42
                        ) /
                            0.58,
                        2
                    );

        const unavailableSpeed =
            1 -
            Math.max(
                0,
                unavailableEnvelope
            ) *
                0.75;

        if (!reducedMotionQuery.matches) {
            lightingPhase =
                normalizeAngle(
                    lightingPhase +
                    deltaTime * 0.000018
                );
        }

        if (focusActive) {
            const yawDifference =
                shortestAngleDifference(
                    rotationYaw,
                    targetYaw
                );

            const pitchDifference =
                targetPitch -
                rotationPitch;

            rotationYaw +=
                yawDifference *
                0.085;

            rotationPitch +=
                pitchDifference *
                0.085;

            if (
                Math.abs(
                    yawDifference
                ) <
                    0.001 &&
                Math.abs(
                    pitchDifference
                ) <
                    0.001
            ) {
                rotationYaw =
                    targetYaw;

                rotationPitch =
                    targetPitch;

                focusActive =
                    false;
            }
        } else if (!dragging) {
            if (
                !reducedMotionQuery.matches
            ) {
                rotationYaw +=
                    autoRotationSpeed *
                    deltaTime *
                    unavailableSpeed;
            }

            rotationYaw +=
                velocityYaw;

            rotationPitch +=
                velocityPitch;

            velocityYaw *=
                0.94;

            velocityPitch *=
                0.94;
        }

        rotationPitch =
            clamp(
                rotationPitch,
                -Math.PI *
                    0.46,
                Math.PI *
                    0.46
            );

        rotationYaw =
            normalizeAngle(
                rotationYaw
            );

        renderGlobe();

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }

    function startAnimation() {
        animationActive =
            true;

        previousFrameTime =
            performance.now();

        resizeCanvas();

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
        animationActive =
            false;

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
       指针进入与离开
    =========================== */

    function handlePointerEnter() {
        pointerInside =
            true;

        stopPageScrolling();
    }

    function handlePointerLeave() {
        pointerInside =
            false;

        if (!dragging) {
            restorePageScrolling();
        }
    }


    /* ===========================
       开始拖动
    =========================== */

    function handlePointerDown(
        event
    ) {
        if (
            event.button !==
                undefined &&
            event.button !==
                0
        ) {
            return;
        }

        const clickedControl =
            event.target.closest(
                [
                    ".scene-node",
                    ".scenes-current"
                ].join(",")
            );

        if (clickedControl) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        dragging =
            true;

        focusActive =
            false;

        activePointerId =
            event.pointerId;

        previousPointerX =
            event.clientX;

        previousPointerY =
            event.clientY;

        totalDragDistance =
            0;

        suppressClick =
            false;

        velocityYaw =
            0;

        velocityPitch =
            0;

        globe.classList.add(
            "is-dragging"
        );

        document.body.classList.add(
            "is-scenes-globe-dragging"
        );

        stopPageScrolling();

        globe.setPointerCapture?.(
            event.pointerId
        );
    }


    /* ===========================
       拖动过程
    =========================== */

    function handlePointerMove(
        event
    ) {
        if (
            !dragging ||
            event.pointerId !==
                activePointerId
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const deltaX =
            event.clientX -
            previousPointerX;

        const deltaY =
            event.clientY -
            previousPointerY;

        previousPointerX =
            event.clientX;

        previousPointerY =
            event.clientY;

        totalDragDistance +=
            Math.hypot(
                deltaX,
                deltaY
            );

        if (
            totalDragDistance >
            dragClickThreshold
        ) {
            suppressClick =
                true;
        }

        const sensitivity =
            0.006;

        const yawMovement =
            deltaX *
            sensitivity;

        const pitchMovement =
            deltaY *
            sensitivity;

        rotationYaw +=
            yawMovement;

        rotationPitch +=
            pitchMovement;

        velocityYaw =
            yawMovement *
            0.5;

        velocityPitch =
            pitchMovement *
            0.5;
    }


    /* ===========================
       结束拖动
    =========================== */

    function finishPointerInteraction(
        event = null
    ) {
        if (!dragging) {
            return;
        }

        if (
            event &&
            activePointerId !==
                null &&
            event.pointerId !==
                activePointerId
        ) {
            return;
        }

        dragging =
            false;

        globe.classList.remove(
            "is-dragging"
        );

        document.body.classList.remove(
            "is-scenes-globe-dragging"
        );

        if (
            event &&
            globe.hasPointerCapture?.(
                event.pointerId
            )
        ) {
            globe.releasePointerCapture(
                event.pointerId
            );
        }

        activePointerId =
            null;

        if (suppressClick) {
            window.setTimeout(
                () => {
                    suppressClick =
                        false;
                },
                0
            );
        }

        if (!pointerInside) {
            restorePageScrolling();
        }
    }


    /* ===========================
       节点点击
    =========================== */

    function handleSceneClick(
        event,
        index
    ) {
        event.preventDefault();
        event.stopPropagation();

        if (suppressClick) {
            return;
        }

        /*
         * 第一次点击聚焦。
         * 再次点击当前场景则打开。
         */
        if (
            index ===
            selectedIndex &&
            !focusActive
        ) {
            openSelectedScene();

            return;
        }

        focusScene(
            index
        );
    }


    /* ===========================
       键盘控制
    =========================== */

    function handleKeyDown(
        event
    ) {
        if (
            event.key ===
                "ArrowRight" ||
            event.key ===
                "ArrowDown"
        ) {
            event.preventDefault();

            focusScene(
                (
                    selectedIndex +
                    1
                ) %
                scenes.length
            );

            return;
        }

        if (
            event.key ===
                "ArrowLeft" ||
            event.key ===
                "ArrowUp"
        ) {
            event.preventDefault();

            focusScene(
                (
                    selectedIndex -
                    1 +
                    scenes.length
                ) %
                scenes.length
            );

            return;
        }

        if (
            event.key ===
                "Enter" ||
            event.key ===
                " "
        ) {
            event.preventDefault();

            openSelectedScene();
        }
    }


    /* ===========================
       重置交互
    =========================== */

    function resetInteractionState() {
        dragging =
            false;

        pointerInside =
            false;

        activePointerId =
            null;

        totalDragDistance =
            0;

        suppressClick =
            false;

        globe.classList.remove(
            "is-dragging"
        );

        document.body.classList.remove(
            "is-scenes-globe-dragging"
        );

        restorePageScrolling();
    }


    /* ===========================
       Section 状态
    =========================== */

    function updateSectionState() {
        if (isSectionActive()) {
            window.requestAnimationFrame(
                () => {
                    resizeCanvas();
                    startAnimation();
                }
            );

            return;
        }

        resetInteractionState();
        stopAnimation();
    }

    const sectionObserver =
        new MutationObserver(
            updateSectionState
        );

    sectionObserver.observe(
        section,
        {
            attributes:
                true,

            attributeFilter:
                [
                    "class"
                ]
        }
    );


    /* ===========================
       节点事件
    =========================== */

    scenes.forEach(
        (
            scene,
            index
        ) => {
            scene.element.addEventListener(
                "click",
                event => {
                    handleSceneClick(
                        event,
                        index
                    );
                }
            );

            scene.element.addEventListener(
                "dragstart",
                event => {
                    event.preventDefault();
                }
            );
        }
    );


    /* ===========================
       当前信息按钮
    =========================== */

    currentButton.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (
                suppressClick ||
                dragging
            ) {
                return;
            }

            openSelectedScene();
        }
    );


    /* ===========================
       球体事件
    =========================== */

    globe.addEventListener(
        "pointerenter",
        handlePointerEnter
    );

    globe.addEventListener(
        "pointerleave",
        handlePointerLeave
    );

    globe.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    globe.addEventListener(
        "pointermove",
        handlePointerMove
    );

    globe.addEventListener(
        "pointerup",
        event => {
            finishPointerInteraction(
                event
            );
        }
    );

    globe.addEventListener(
        "pointercancel",
        event => {
            finishPointerInteraction(
                event
            );
        }
    );

    globe.addEventListener(
        "lostpointercapture",
        event => {
            finishPointerInteraction(
                event
            );
        }
    );

    globe.addEventListener(
        "dragstart",
        event => {
            event.preventDefault();
        }
    );

    globe.addEventListener(
        "selectstart",
        event => {
            event.preventDefault();
        }
    );

    globe.addEventListener(
        "keydown",
        handleKeyDown
    );


    /* ===========================
       页面级事件
    =========================== */

    window.addEventListener(
        "resize",
        resizeCanvas
    );

    window.addEventListener(
        "blur",
        resetInteractionState
    );

    window.addEventListener(
        "pagehide",
        () => {
            resetInteractionState();
            stopAnimation();
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                resetInteractionState();
                stopAnimation();

                return;
            }

            updateSectionState();
        }
    );


    /* ===========================
       初始状态
    =========================== */

    focusScene(
        0
    );

    updateCurrentScene();
    updateSectionState();
}
