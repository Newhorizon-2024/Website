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

    let canvasPadY = 0;
    let globeRadius =
        0;

    /* 昼夜交界缓慢绕球体移动，避免与球体旋转完全同步。 */
    const moonStartPhase = 0.14;
    const moonPeriodMs = 44000;
    let moonPhase = moonStartPhase;
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

    let pendingNodeDrag = null;
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

        globeRadius = Math.min(canvasHeight * .365, canvasWidth * .34);
        // 仰视时长轴会转向屏幕上下方。扩展绘图区域，节点仍用原布局坐标。
        canvasPadY = Math.ceil(Math.max(0, globeRadius * 1.66 + 2 - canvasHeight / 2));

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
                    (canvasHeight + 2 * canvasPadY) *
                    pixelRatio
                )
            );

        canvas.style.width =
            `${canvasWidth}px`;

        canvas.style.height =
            `${canvasHeight + 2 * canvasPadY}px`;
        canvas.style.top = `${-canvasPadY}px`;

        context.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            canvasPadY * pixelRatio
        );

        renderGlobe();
    }


    /* ===========================
       绘制球体线段
    =========================== */

    // 经纬网和定位波共用同一组 yaw / pitch。
    const gridLines = [];
    const equator = [];
    function parallel(latitude, longitude, stepLat, stepLon, count) {
        return Array.from({length: count + 1}, (_, i) =>
            latitudeLongitudeToVector(latitude + i * stepLat, longitude + i * stepLon));
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        (lat === 0 ? equator : gridLines).push(parallel(lat, -180, 0, 5, 72));
    }
    for (let lon = -150; lon <= 180; lon += 30) gridLines.push(parallel(-90, lon, 4, 0, 45));

    // 在地平线处裁断线段，在一次 stroke 中绘制同色线条。
    function strokeSurface(lines, color, width, radius, cy, sy, cp, sp) {
        context.beginPath();
        for (const line of lines) {
            let lastX, lastY, lastZ;
            for (const p of line) {
                const x = p.x * cy + p.z * sy, side = -p.x * sy + p.z * cy;
                const y = -(p.y * cp - side * sp), z = p.y * sp + side * cp;
                if (lastZ !== undefined && (z >= 0) !== (lastZ >= 0)) {
                    const t = lastZ / (lastZ - z);
                    const hx = lastX + t * (x - lastX), hy = lastY + t * (y - lastY);
                    if (z >= 0) context.moveTo(hx,hy); else context.lineTo(hx,hy);
                }
                if (z >= 0) {
                    if (lastZ === undefined) context.moveTo(x,y); else context.lineTo(x,y);
                }
                lastX = x; lastY = y; lastZ = z;
            }
        }
        context.strokeStyle = color;
        context.lineWidth = width / radius;
        context.stroke();
    }

    function drawSurface(radius, isEarth) {
        context.save();
        context.scale(radius, radius);
        context.lineJoin = "round";
        const view = [Math.cos(rotationYaw), Math.sin(rotationYaw), Math.cos(rotationPitch), Math.sin(rotationPitch)];
        // 小球保留同一套经纬线，线宽按屏幕可读性缩放。
        const lineScale = isEarth ? 1 : 0.65;
        strokeSurface(gridLines, "rgba(204,216,222,.13)", .8 * lineScale, radius, ...view);
        strokeSurface(equator, "rgba(211,224,230,.23)", .9 * lineScale, radius, ...view);
        context.restore();
    }

    /* ===========================
       绘制球体轮廓
    =========================== */

    function drawGlobeOutline(radius) {
        const gradient = context.createRadialGradient(
            -radius * 0.2, -radius * 0.25, radius * 0.1, 0, 0, radius
        );

        gradient.addColorStop(
            0,
            "rgba(116, 128, 138, 0.23)"
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

        context.arc(0, 0, radius, 0, Math.PI * 2);
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

    // 方向光固定在纹理坐标中，每帧只旋转缓存的明暗盘面。
    const lightDisc = document.createElement("canvas");
    function drawGlobeLighting(radius) {
        const density = canvas.width / canvasWidth;
        const size = Math.max(64, Math.min(768, Math.round(2 * globeRadius * density)));
        if (lightDisc.width !== size || lightDisc.height !== size) {
            lightDisc.width = lightDisc.height = size;
            const pen = lightDisc.getContext("2d");
            const pixels = pen.createImageData(size,size);
            for (let y = 0; y < size; y++) {
                const ny = (2*y+1)/size - 1;
                for (let x = 0; x < size; x++) {
                    const nx = (2*x+1)/size - 1, rr = nx*nx + ny*ny;
                    if (rr >= 1) continue;
                    const nz = Math.sqrt(1-rr);
                    const incidence = nx*.94 + nz*.34;
                    const dawn = clamp((incidence+.17)/.56,0,1);
                    const twilight = dawn*dawn*(3-2*dawn);
                    const lit = Math.max(0,incidence);
                    const grazing = (1-nz)*(1-nz)*lit;
                    const value = 10 + 18*twilight + 26*lit + 32*grazing;
                    const i = 4*(y*size+x);
                    pixels.data[i] = value;
                    pixels.data[i+1] = value + 2 + lit*2;
                    pixels.data[i+2] = value + 4 + lit*5;
                    pixels.data[i+3] = 222 * clamp((1-Math.sqrt(rr))*size*.5,0,1);
                }
            }
            pen.putImageData(pixels,0,0);
        }
        context.save();
        context.rotate(Math.atan2(.62*Math.sin(lightingPhase),Math.cos(lightingPhase)));
        context.drawImage(lightDisc, -radius, -radius, 2 * radius, 2 * radius);
        context.restore();
    }

    // 两个正交单位向量固定在地球坐标系中，决定轨道平面的姿态。
    const orbitAxis = latitudeLongitudeToVector(20, 90);
    const inclination = degreesToRadians(22);
    const orbitQuarter = {
        x: -orbitAxis.y * Math.sin(inclination),
        y: orbitAxis.x * Math.sin(inclination),
        z: Math.cos(inclination)
    };

    function projectLunarOrbit() {
        const u = rotateVector(orbitAxis, rotationYaw, rotationPitch);
        const v = rotateVector(orbitQuarter, rotationYaw, rotationPitch);
        // 在地球坐标中加长第一条轨道轴，拖动时长轴会随轨道平面一起旋转。
        const major = Math.min(globeRadius * 1.55, canvasWidth / 2 - globeRadius * .11 - 2);
        const minor = globeRadius * 1.24;
        const project = phase => {
            const a = major * Math.cos(phase), b = minor * Math.sin(phase);
            return { x: a*u.x + b*v.x, y: -(a*u.y + b*v.y), z: a*u.z + b*v.z };
        };
        const ascending = Math.atan2(-major * u.z, minor * v.z);
        const moon = project(moonPhase);
        return {
            node: project(ascending), quarter: project(ascending + Math.PI / 2),
            moonX: canvasWidth / 2 + moon.x, moonY: canvasHeight / 2 + moon.y,
            moonRadius: globeRadius * (.092 + .012 * moon.z / major),
            inFront: moon.z >= 0
        };
    }

    function drawLunarOrbit(orbit, front) {
        const cx = canvasWidth / 2, cy = canvasHeight / 2;
        context.save();
        if (!front) {
            context.beginPath();
            context.rect(0, -canvasPadY, canvasWidth, canvasHeight + 2 * canvasPadY);
            context.moveTo(cx + globeRadius + 0.5, cy);
            context.arc(cx, cy, globeRadius + 0.5, 0, Math.PI * 2);
            context.clip("evenodd");
        }

        // 两段四分之一圆的贝塞尔投影，即使轨道正好侧对镜头也连续。
        const sign = front ? 1 : -1, k = 4 * (Math.SQRT2 - 1) / 3;
        const x = orbit.node.x * sign, y = orbit.node.y * sign;
        const qx = orbit.quarter.x * sign, qy = orbit.quarter.y * sign;
        context.beginPath();
        context.moveTo(cx + x, cy + y);
        context.bezierCurveTo(cx + x + k*qx, cy + y + k*qy, cx + qx + k*x, cy + qy + k*y, cx + qx, cy + qy);
        context.bezierCurveTo(cx + qx - k*x, cy + qy - k*y, cx - x + k*qx, cy - y + k*qy, cx - x, cy - y);
        context.lineWidth = front ? 1 : 0.85;
        context.strokeStyle = front ? "rgba(209,216,225,0.36)" : "rgba(189,198,207,0.24)";
        context.stroke();

        if (orbit.inFront === front) {
            // 球体共用半透明材质，先遮住月球轮廓内的轨道和后景。
            context.save();
            context.globalCompositeOperation = "destination-out";
            context.fillStyle = "#000";
            context.beginPath();
            context.arc(orbit.moonX, orbit.moonY, orbit.moonRadius, 0, Math.PI * 2);
            context.fill();
            context.restore();
            drawSphere(orbit.moonX, orbit.moonY, orbit.moonRadius, false);
        }
        context.restore();
    }

    function drawAtmosphereRim(r) {
        const angle = Math.atan2(.62 * Math.sin(lightingPhase), Math.cos(lightingPhase));
        const dx = r*Math.cos(angle), dy = r*Math.sin(angle);
        const light = context.createLinearGradient(-dx, -dy, dx, dy);
        light.addColorStop(0,"rgba(164,174,186,.04)");
        light.addColorStop(.65,"rgba(182,196,210,.12)");
        light.addColorStop(1,"rgba(224,235,244,.78)");
        context.save();
        context.beginPath();
        context.arc(0, 0, r + .4, 0, Math.PI * 2);
        context.strokeStyle = light;
        context.lineWidth = Math.max(r === globeRadius ? 1.2 : .7, r * .009);
        context.shadowBlur = Math.max(r === globeRadius ? 4 : 1.5, r * .035);
        context.shadowColor = "rgba(185,211,232,.42)";
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

    function drawSphere(x, y, radius, isEarth) {
        context.save();
        context.translate(x, y);
        drawGlobeOutline(radius);
        drawGlobeLighting(radius);
        drawSurface(radius, isEarth);
        drawAtmosphereRim(radius);
        context.restore();
    }

    function renderGlobe() {
        if (
            canvasWidth <= 0 ||
            canvasHeight <= 0
        ) {
            return;
        }

        context.clearRect(0, -canvasPadY, canvasWidth, canvasHeight + 2 * canvasPadY);

        context.lineWidth =
            1;

        const orbit = projectLunarOrbit();
        drawLunarOrbit(orbit, false);
        drawSphere(canvasWidth / 2, canvasHeight / 2, globeRadius, true);
        drawLunarOrbit(orbit, true);
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

        focusActive = !reducedMotionQuery.matches;
        if (!focusActive) {
            rotationYaw = targetYaw;
            rotationPitch = targetPitch;
            renderGlobe();
        }
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
                    archiveOrigin: scene.element,
                    transitionType: "depth",

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
            moonPhase = normalizeAngle(moonPhase + deltaTime * 2 * Math.PI / moonPeriodMs);
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
       开始拖动
    =========================== */

    function handlePointerDown(event) {
        if (event.button !== 0 || !event.isPrimary || dragging || pendingNodeDrag) return;
        if (event.target.closest(".scenes-current")) return;
        const node = event.target.closest(".scene-node");
        if (node) {
            // 轻点仍交给节点；超过既有拖动阈值后才接管整个地月系。
            pendingNodeDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
            node.setPointerCapture(event.pointerId);
            return;
        }
        beginGlobeDrag(event, event.clientX, event.clientY);
    }

    function beginGlobeDrag(event, startX, startY) {
        event.preventDefault();
        event.stopPropagation();

        dragging =
            true;

        focusActive =
            false;

        activePointerId =
            event.pointerId;

        previousPointerX = startX;
        previousPointerY = startY;

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

        globe.setPointerCapture?.(
            event.pointerId
        );
    }


    /* ===========================
       拖动过程
    =========================== */

    function handlePointerMove(event) {
        if (pendingNodeDrag?.id === event.pointerId) {
            const { x, y } = pendingNodeDrag;
            if (Math.hypot(event.clientX - x, event.clientY - y) <= dragClickThreshold) return;
            pendingNodeDrag = null;
            beginGlobeDrag(event, x, y);
        }
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

        velocityPitch = pitchMovement * .5;
        if (reducedMotionQuery.matches) {
            rotationPitch = clamp(rotationPitch, -Math.PI * .46, Math.PI * .46);
            velocityPitch = velocityYaw = 0;
            renderGlobe();
        }
    }


    /* ===========================
       结束拖动
    =========================== */

    function finishPointerInteraction(
        event = null
    ) {
        if (event?.pointerId === pendingNodeDrag?.id) pendingNodeDrag = null;
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
        pendingNodeDrag = null;
        dragging =
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
    }


    /* ===========================
       Section 状态
    =========================== */

    function updateSectionState() {
        if (isSectionActive() && globeVisible && !document.hidden) {
            if (reducedMotionQuery.matches) {
                stopAnimation();
                if (focusActive) { rotationYaw = targetYaw; rotationPitch = targetPitch; focusActive = false; }
                resizeCanvas();
            } else if (!animationActive) startAnimation();

            return;
        }

        resetInteractionState();
        stopAnimation();
    }

    let globeVisible = !window.IntersectionObserver;
    const visibility = window.IntersectionObserver && new IntersectionObserver(([entry]) => {
        globeVisible = entry.isIntersecting;
        updateSectionState();
    });
    visibility?.observe(globe);
    reducedMotionQuery.addEventListener("change", updateSectionState);
    window.addEventListener("pageshow", updateSectionState);

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
            if (event.target === globe || pendingNodeDrag?.id === event.pointerId) {
                finishPointerInteraction(event);
            }
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
