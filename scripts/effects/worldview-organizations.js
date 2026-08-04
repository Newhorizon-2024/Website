/* ===========================
   世界观 · 组织三维轨道
=========================== */

let worldviewOrganizationsInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeWorldviewOrganizations() {
    if (worldviewOrganizationsInitialized) {
        return;
    }

    const section =
        document.getElementById(
            "worldview-organizations-section"
        );

    const orbit =
        document.getElementById(
            "organizations-orbit"
        );

    if (
        !section ||
        !orbit
    ) {
        return;
    }

    const itemElements =
        Array.from(
            orbit.querySelectorAll(
                ".organization-orbit-item"
            )
        );

    const currentButton =
        orbit.querySelector(
            ".organizations-current"
        );

    const currentIndexElement =
        orbit.querySelector(
            ".organizations-current-index"
        );

    const currentNameElement =
        orbit.querySelector(
            ".organizations-current-name"
        );

    const currentStatusElement =
        orbit.querySelector(
            ".organizations-current-status"
        );

    if (
        itemElements.length === 0 ||
        !currentButton ||
        !currentIndexElement ||
        !currentNameElement ||
        !currentStatusElement
    ) {
        console.warn(
            "组织三维轨道初始化失败：缺少必要元素。"
        );

        return;
    }

    worldviewOrganizationsInitialized =
        true;


    /* ===========================
       组织数据
    =========================== */

    const organizations =
        itemElements.map(
            (
                element,
                index
            ) => {
                return {
                    body:
                        element.querySelector(
                            ".organization-card-object"
                        ),

                    element,

                    id:
                        element.dataset
                            .organizationId ||
                        `organization-${index}`,

                    name:
                        element.dataset
                            .organizationName ||
                        element.textContent
                            .trim(),

                    sectionId:
                        element.dataset
                            .sectionId ||
                        ""
                };
            }
        );


    /* ===========================
       基础状态
    =========================== */

    let orbitWidth =
        0;

    let orbitHeight =
        0;

    let orbitCenterX =
        0;

    let orbitCenterY =
        0;

    let radiusX =
        0;

    let radiusY =
        0;

    let depthRadius =
        0;

    let selectedIndex =
        0;

    let rotation =
        0;

    let targetRotation =
        0;

    let rotationalVelocity =
        0;

    let snapping =
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

    let previousPointerTime =
        0;

    let totalDragDistance =
        0;

    let suppressClick =
        false;

    let animationActive =
        false;

    let animationFrameId =
        null;

    let previousFrameTime =
        performance.now();

    let lenisStoppedByOrbit =
        false;

    let wheelLocked =
        false;

    let wheelUnlockTimeout =
        null;


    /* ===========================
       常量
    =========================== */

    const itemCount =
        organizations.length;

    const angleStep =
        Math.PI *
        2 /
        itemCount;

    const dragClickThreshold =
        7;

    const maximumVelocity =
        0.0048;

    const minimumSnapVelocity =
        0.000055;

    const reducedMotionQuery =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    const finePointerQuery =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );

    const mobileQuery =
        window.matchMedia(
            "(max-width: 600px)"
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
        return (
            start +
            (
                end -
                start
            ) *
            amount
        );
    }

    function radiansToDegrees(
        radians
    ) {
        return (
            radians *
            180 /
            Math.PI
        );
    }

    function normalizeIndex(
        index
    ) {
        return (
            (
                index %
                itemCount
            ) +
            itemCount
        ) %
        itemCount;
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
       区块是否活动
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
       获取当前组织
    =========================== */

    function getSelectedOrganization() {
        return (
            organizations[
                selectedIndex
            ] ||
            null
        );
    }


    /* ===========================
       Lenis 控制
    =========================== */

    function stopPageScrolling() {
        if (
            lenisStoppedByOrbit ||
            !finePointerQuery.matches
        ) {
            return;
        }

        if (
            window.lenis &&
            typeof window.lenis.stop ===
                "function"
        ) {
            window.lenis.stop();

            lenisStoppedByOrbit =
                true;
        }
    }

    function restorePageScrolling() {
        if (!lenisStoppedByOrbit) {
            return;
        }

        if (
            window.lenis &&
            typeof window.lenis.start ===
                "function"
        ) {
            window.lenis.start();
        }

        lenisStoppedByOrbit =
            false;
    }


    /* ===========================
       轨道测量
    =========================== */

    function measureOrbit() {
        const rect =
            orbit.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        orbitWidth =
            rect.width;

        orbitHeight =
            rect.height;

        /*
         * 轨道中心保持真正居中。
         * 不再使用之前的 0.485 偏移修正。
         */
        orbitCenterX =
            orbitWidth *
            0.5;

        orbitCenterY =
            orbitHeight *
            (
                mobileQuery.matches
                    ? 0.43
                    : 0.435
            );

        radiusX =
            orbitWidth *
            (
                mobileQuery.matches
                    ? 0.34
                    : 0.315
            );

        radiusY =
            orbitHeight *
            (
                mobileQuery.matches
                    ? 0.105
                    : 0.09
            );

        depthRadius =
            orbitWidth *
            (
                mobileQuery.matches
                    ? 0.13
                    : 0.17
            );

        renderOrbit();
    }


    /* ===========================
       更新当前组织信息
    =========================== */

    function updateCurrentInformation() {
        const organization =
            getSelectedOrganization();

        if (!organization) {
            return;
        }

        const isAvailable =
            organization.sectionId.length >
            0;

        currentIndexElement.textContent =
            `${String(
                selectedIndex +
                    1
            ).padStart(
                2,
                "0"
            )} / ${String(
                itemCount
            ).padStart(
                2,
                "0"
            )}`;

        currentNameElement.textContent =
            organization.name;

        currentStatusElement.textContent =
            isAvailable
                ? "进入档案"
                : "尚未开放";

        currentButton.classList.toggle(
            "is-unavailable",
            !isAvailable
        );

        currentButton.setAttribute(
            "aria-label",
            isAvailable
                ? `打开${organization.name}档案`
                : `${organization.name}尚未开放`
        );
    }


    /* ===========================
       渲染三维轨道
    =========================== */

    function renderOrbit() {
        if (
            orbitWidth <= 0 ||
            orbitHeight <= 0
        ) {
            return;
        }

        organizations.forEach(
            (
                organization,
                index
            ) => {
                /*
                 * itemAngle 为当前卡牌
                 * 在轨道上的空间角度。
                 *
                 * 0：
                 * 位于正前方。
                 *
                 * ±π：
                 * 位于正后方。
                 */
                const itemAngle =
                    normalizeAngle(
                        rotation +
                        index *
                        angleStep
                    );

                const cosine =
                    Math.cos(
                        itemAngle
                    );

                const sine =
                    Math.sin(
                        itemAngle
                    );

                /*
                 * depthValue：
                 *
                 * 正前方 = 1
                 * 正后方 = 0
                 */
                const depthValue =
                    (
                        cosine +
                        1
                    ) /
                    2;

                /*
                 * 横向位置形成公转。
                 */
                const horizontalPosition =
                    orbitCenterX +
                    sine *
                    radiusX;

                /*
                 * 后方略微升高，
                 * 前方略微降低，
                 * 形成椭圆空间轨道。
                 */
                const verticalPosition =
                    orbitCenterY +
                    (
                        0.5 -
                        depthValue
                    ) *
                    radiusY;

                /*
                 * 真正使用 Z 深度，
                 * 而不仅是二维 scale。
                 */
                const depthPosition =
                    (
                        depthValue -
                        0.5
                    ) *
                    depthRadius *
                    2;

                const scale =
                    0.54 +
                    depthValue *
                    0.54;

                const opacity =
                    0.31 +
                    depthValue *
                    0.69;

                const blur =
                    (
                        1 -
                        depthValue
                    ) *
                    5.4;

                /*
                 * 卡牌自身随着轨道改变朝向。
                 *
                 * 正前方显示正面，
                 * 转到后方显示背面。
                 */
                const facingAngle =
                    normalizeAngle(
                        -itemAngle
                    );

                const facingDegrees =
                    radiansToDegrees(
                        facingAngle
                    );

                organization.element.style
                    .setProperty(
                        "--organization-x",
                        `${horizontalPosition.toFixed(
                            2
                        )}px`
                    );

                organization.element.style
                    .setProperty(
                        "--organization-y",
                        `${verticalPosition.toFixed(
                            2
                        )}px`
                    );

                organization.element.style
                    .setProperty(
                        "--organization-z",
                        `${depthPosition.toFixed(
                            2
                        )}px`
                    );

                organization.element.style
                    .setProperty(
                        "--organization-scale",
                        scale.toFixed(
                            4
                        )
                    );

                organization.element.style
                    .setProperty(
                        "--organization-opacity",
                        opacity.toFixed(
                            4
                        )
                    );

                organization.element.style
                    .setProperty(
                        "--organization-blur",
                        `${blur.toFixed(
                            2
                        )}px`
                    );

                organization.element.style
                    .setProperty(
                        "--organization-facing",
                        `${facingDegrees.toFixed(
                            2
                        )}deg`
                    );

                /*
                 * 与轨道角度相关的默认反光位置。
                 */
                organization.element.style
                    .setProperty(
                        "--organization-reflection-x",
                        `${(
                            50 +
                            sine *
                            22
                        ).toFixed(
                            2
                        )}%`
                    );

                organization.element.style
                    .setProperty(
                        "--organization-reflection-y",
                        `${(
                            43 -
                            cosine *
                            8
                        ).toFixed(
                            2
                        )}%`
                    );

                /*
                 * 正面卡牌应位于最上层，
                 * 后方卡牌位于下层。
                 */
                organization.element.style
                    .zIndex =
                    String(
                        Math.round(
                            20 +
                            depthValue *
                            100
                        )
                    );

                const isBehind =
                    depthValue <
                    0.16;

                organization.element.classList.toggle(
                    "is-behind",
                    isBehind
                );

                const isSelected =
                    index ===
                    selectedIndex;

                organization.element.classList.toggle(
                    "is-selected",
                    isSelected
                );

                organization.element.setAttribute(
                    "aria-selected",
                    String(
                        isSelected
                    )
                );

                organization.element.tabIndex =
                    isSelected
                        ? 0
                        : -1;
            }
        );
    }


    /* ===========================
       聚焦组织
    =========================== */

    function focusOrganization(
        index
    ) {
        selectedIndex =
            normalizeIndex(
                index
            );

        /*
         * 令对应卡牌回到角度 0，
         * 即轨道正前方。
         */
        targetRotation =
            normalizeAngle(
                -selectedIndex *
                angleStep
            );

        rotationalVelocity =
            0;

        snapping =
            true;

        updateCurrentInformation();
    }


    /* ===========================
       查找正前方最近的组织
    =========================== */

    function findNearestOrganization() {
        let nearestIndex =
            0;

        let nearestDistance =
            Infinity;

        organizations.forEach(
            (
                organization,
                index
            ) => {
                const itemAngle =
                    normalizeAngle(
                        rotation +
                        index *
                        angleStep
                    );

                const distance =
                    Math.abs(
                        itemAngle
                    );

                if (
                    distance <
                    nearestDistance
                ) {
                    nearestDistance =
                        distance;

                    nearestIndex =
                        index;
                }
            }
        );

        return nearestIndex;
    }


    /* ===========================
       吸附最近项目
    =========================== */

    function snapToNearestOrganization() {
        focusOrganization(
            findNearestOrganization()
        );
    }


    /* ===========================
       打开当前组织
    =========================== */

    async function openSelectedOrganization() {
        const organization =
            getSelectedOrganization();

        if (!organization) {
            return false;
        }

        if (!organization.sectionId) {
            console.info(
                `组织“${organization.name}”暂未开放。`
            );

            window.dispatchEvent(
                new CustomEvent(
                    "worldview-organization-unavailable",
                    {
                        detail: {
                            id:
                                organization.id,

                            name:
                                organization.name
                        }
                    }
                )
            );

            return false;
        }

        const targetSection =
            document.getElementById(
                organization.sectionId
            );

        if (!targetSection) {
            console.error(
                `未找到组织信息页：#${organization.sectionId}`
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
                organization.sectionId,
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
                Math.max(
                    0,
                    currentTime -
                        previousFrameTime
                )
            );

        previousFrameTime =
            currentTime;

        if (snapping) {
            const difference =
                shortestAngleDifference(
                    rotation,
                    targetRotation
                );

            const snapStrength =
                reducedMotionQuery.matches
                    ? 1
                    : 0.115;

            rotation +=
                difference *
                snapStrength;

            if (
                Math.abs(
                    difference
                ) <
                0.0008
            ) {
                rotation =
                    targetRotation;

                snapping =
                    false;
            }
        } else if (!dragging) {
            rotation +=
                rotationalVelocity *
                deltaTime;

            rotationalVelocity *=
                Math.pow(
                    0.91,
                    deltaTime /
                    16.67
                );

            if (
                Math.abs(
                    rotationalVelocity
                ) <
                minimumSnapVelocity
            ) {
                rotationalVelocity =
                    0;

                snapToNearestOrganization();
            }
        }

        rotation =
            normalizeAngle(
                rotation
            );

        renderOrbit();

        animationFrameId =
            window.requestAnimationFrame(
                animate
            );
    }


    /* ===========================
       启动动画
    =========================== */

    function startAnimation() {
        animationActive =
            true;

        previousFrameTime =
            performance.now();

        measureOrbit();

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


    /* ===========================
       停止动画
    =========================== */

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
       Tilted Card 指针效果
    =========================== */

    function updateCardTilt(
        organization,
        event
    ) {
        if (
            !finePointerQuery.matches ||
            reducedMotionQuery.matches ||
            dragging ||
            organization.element
                .classList
                .contains(
                    "is-behind"
                )
        ) {
            return;
        }

        const body =
            organization.body;

        if (!body) {
            return;
        }

        const rect =
            body.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        const relativeX =
            clamp(
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width,
                0,
                1
            );

        const relativeY =
            clamp(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height,
                0,
                1
            );

        const tiltY =
            (
                relativeX -
                0.5
            ) *
            13;

        const tiltX =
            (
                0.5 -
                relativeY
            ) *
            10;

        const shiftX =
            (
                relativeX -
                0.5
            ) *
            7;

        const shiftY =
            (
                relativeY -
                0.5
            ) *
            5;

        organization.element.style
            .setProperty(
                "--organization-tilt-x",
                `${tiltX.toFixed(
                    2
                )}deg`
            );

        organization.element.style
            .setProperty(
                "--organization-tilt-y",
                `${tiltY.toFixed(
                    2
                )}deg`
            );

        organization.element.style
            .setProperty(
                "--organization-shift-x",
                `${shiftX.toFixed(
                    2
                )}px`
            );

        organization.element.style
            .setProperty(
                "--organization-shift-y",
                `${shiftY.toFixed(
                    2
                )}px`
            );

        organization.element.style
            .setProperty(
                "--organization-reflection-x",
                `${(
                    relativeX *
                    100
                ).toFixed(
                    2
                )}%`
            );

        organization.element.style
            .setProperty(
                "--organization-reflection-y",
                `${(
                    relativeY *
                    100
                ).toFixed(
                    2
                )}%`
            );

        organization.element.style
            .setProperty(
                "--organization-reflection-opacity",
                "1"
            );
    }


    /* ===========================
       重置单张卡牌倾斜
    =========================== */

    function resetCardTilt(
        organization
    ) {
        organization.element.style
            .setProperty(
                "--organization-tilt-x",
                "0deg"
            );

        organization.element.style
            .setProperty(
                "--organization-tilt-y",
                "0deg"
            );

        organization.element.style
            .setProperty(
                "--organization-shift-x",
                "0px"
            );

        organization.element.style
            .setProperty(
                "--organization-shift-y",
                "0px"
            );

        organization.element.style
            .setProperty(
                "--organization-reflection-opacity",
                "0"
            );
    }

    function resetAllCardTilts() {
        organizations.forEach(
            resetCardTilt
        );
    }

        /* ===========================
       指针进入轨道
    =========================== */

    function handlePointerEnter() {
        pointerInside =
            true;

        stopPageScrolling();
    }


    /* ===========================
       指针离开轨道
    =========================== */

    function handlePointerLeave() {
        pointerInside =
            false;

        resetAllCardTilts();

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

        if (!isSectionActive()) {
            return;
        }

        /*
         * 中央信息按钮不参与拖拽。
         */
        if (
            event.target.closest(
                ".organizations-current"
            )
        ) {
            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }

        event.stopPropagation();

        dragging =
            true;

        snapping =
            false;

        activePointerId =
            event.pointerId;

        previousPointerX =
            event.clientX;

        previousPointerY =
            event.clientY;

        previousPointerTime =
            performance.now();

        totalDragDistance =
            0;

        suppressClick =
            false;

        rotationalVelocity =
            0;

        orbit.classList.add(
            "is-dragging"
        );

        document.body.classList.add(
            "is-organizations-orbit-dragging"
        );

        resetAllCardTilts();
        stopPageScrolling();

        orbit.setPointerCapture?.(
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

        if (event.cancelable) {
            event.preventDefault();
        }

        event.stopPropagation();

        const currentTime =
            performance.now();

        const deltaTime =
            Math.max(
                1,
                currentTime -
                    previousPointerTime
            );

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

        previousPointerTime =
            currentTime;

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

        /*
         * 横向移动为主要旋转输入。
         * 纵向移动只提供很少的辅助量。
         */
        const movement =
            deltaX +
            deltaY *
            0.14;

        const sensitivity =
            Math.PI /
            Math.max(
                orbitWidth,
                1
            ) *
            (
                mobileQuery.matches
                    ? 1.85
                    : 1.55
            );

        const rotationDelta =
            movement *
            sensitivity;

        rotation +=
            rotationDelta;

        /*
         * 速度单位为：
         * 弧度 / 毫秒。
         */
        rotationalVelocity =
            clamp(
                rotationDelta /
                deltaTime,
                -maximumVelocity,
                maximumVelocity
            );

        rotation =
            normalizeAngle(
                rotation
            );

        renderOrbit();
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

        orbit.classList.remove(
            "is-dragging"
        );

        document.body.classList.remove(
            "is-organizations-orbit-dragging"
        );

        if (
            event &&
            orbit.hasPointerCapture?.(
                event.pointerId
            )
        ) {
            orbit.releasePointerCapture(
                event.pointerId
            );
        }

        activePointerId =
            null;

        /*
         * 小幅拖动直接吸附。
         * 快速甩动则先保留惯性。
         */
        if (
            Math.abs(
                rotationalVelocity
            ) <
            0.00048
        ) {
            snapToNearestOrganization();
        }

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
       卡牌点击
    =========================== */

    function handleItemClick(
        event,
        index
    ) {
        event.preventDefault();
        event.stopPropagation();

        if (
            suppressClick ||
            dragging
        ) {
            return;
        }

        /*
         * 当前卡牌再次点击时进入信息页。
         */
        if (
            index ===
                selectedIndex &&
            !snapping
        ) {
            openSelectedOrganization();

            return;
        }

        focusOrganization(
            index
        );
    }


    /* ===========================
       滚轮切换
    =========================== */

    function handleWheel(
        event
    ) {
        if (!isSectionActive()) {
            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }

        event.stopPropagation();
        event.stopImmediatePropagation();

        stopPageScrolling();

        if (wheelLocked) {
            return;
        }

        const verticalDelta =
            Math.abs(
                event.deltaY
            );

        const horizontalDelta =
            Math.abs(
                event.deltaX
            );

        const primaryDelta =
            verticalDelta >=
            horizontalDelta
                ? event.deltaY
                : event.deltaX;

        if (
            Math.abs(
                primaryDelta
            ) <
            1
        ) {
            return;
        }

        const direction =
            primaryDelta >
            0
                ? 1
                : -1;

        focusOrganization(
            selectedIndex +
                direction
        );

        wheelLocked =
            true;

        if (wheelUnlockTimeout) {
            window.clearTimeout(
                wheelUnlockTimeout
            );
        }

        wheelUnlockTimeout =
            window.setTimeout(
                () => {
                    wheelLocked =
                        false;

                    wheelUnlockTimeout =
                        null;
                },
                260
            );
    }


    /* ===========================
       键盘操作
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
            event.stopPropagation();

            focusOrganization(
                selectedIndex +
                    1
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
            event.stopPropagation();

            focusOrganization(
                selectedIndex -
                    1
            );

            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            event.stopPropagation();

            focusOrganization(
                0
            );

            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            event.stopPropagation();

            focusOrganization(
                itemCount -
                    1
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
            event.stopPropagation();

            openSelectedOrganization();
        }
    }


    /* ===========================
       重置交互状态
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

        rotationalVelocity =
            0;

        orbit.classList.remove(
            "is-dragging"
        );

        document.body.classList.remove(
            "is-organizations-orbit-dragging"
        );

        resetAllCardTilts();
        restorePageScrolling();
    }


    /* ===========================
       Section 状态更新
    =========================== */

    function updateSectionState() {
        if (isSectionActive()) {
            window.requestAnimationFrame(
                () => {
                    window.requestAnimationFrame(
                        () => {
                            measureOrbit();
                            startAnimation();
                        }
                    );
                }
            );

            return;
        }

        resetInteractionState();
        stopAnimation();
    }


    /* ===========================
       系统动态设置变化
    =========================== */

    function handleReducedMotionChange(
        event
    ) {
        resetAllCardTilts();

        if (event.matches) {
            rotationalVelocity =
                0;

            snapping =
                true;

            rotation =
                targetRotation;

            renderOrbit();

            return;
        }

        if (isSectionActive()) {
            startAnimation();
        }
    }


    /* ===========================
       屏幕尺寸变化
    =========================== */

    function handleViewportChange() {
        resetAllCardTilts();

        window.requestAnimationFrame(
            measureOrbit
        );
    }


    /* ===========================
       区块 Class 监听
    =========================== */

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
       卡牌事件
    =========================== */

    organizations.forEach(
        (
            organization,
            index
        ) => {
            organization.element
                .addEventListener(
                    "click",
                    event => {
                        handleItemClick(
                            event,
                            index
                        );
                    }
                );

            organization.element
                .addEventListener(
                    "pointermove",
                    event => {
                        if (!dragging) {
                            updateCardTilt(
                                organization,
                                event
                            );
                        }
                    }
                );

            organization.element
                .addEventListener(
                    "pointerleave",
                    () => {
                        resetCardTilt(
                            organization
                        );
                    }
                );

            organization.element
                .addEventListener(
                    "focus",
                    () => {
                        if (
                            index !==
                            selectedIndex
                        ) {
                            focusOrganization(
                                index
                            );
                        }
                    }
                );

            organization.element
                .addEventListener(
                    "dragstart",
                    event => {
                        event.preventDefault();
                    }
                );
        }
    );


    /* ===========================
       当前组织按钮
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

            openSelectedOrganization();
        }
    );


    /* ===========================
       轨道事件
    =========================== */

    orbit.addEventListener(
        "wheel",
        handleWheel,
        {
            capture:
                true,

            passive:
                false
        }
    );

    orbit.addEventListener(
        "pointerenter",
        handlePointerEnter
    );

    orbit.addEventListener(
        "pointerleave",
        handlePointerLeave
    );

    orbit.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    orbit.addEventListener(
        "pointermove",
        handlePointerMove
    );

    orbit.addEventListener(
        "pointerup",
        event => {
            finishPointerInteraction(
                event
            );
        }
    );

    orbit.addEventListener(
        "pointercancel",
        event => {
            finishPointerInteraction(
                event
            );
        }
    );

    orbit.addEventListener(
        "lostpointercapture",
        event => {
            finishPointerInteraction(
                event
            );
        }
    );

    orbit.addEventListener(
        "keydown",
        handleKeyDown
    );

    orbit.addEventListener(
        "dragstart",
        event => {
            event.preventDefault();
        }
    );

    orbit.addEventListener(
        "selectstart",
        event => {
            if (event.cancelable) {
                event.preventDefault();
            }
        }
    );

    orbit.addEventListener(
        "contextmenu",
        event => {
            if (dragging) {
                event.preventDefault();
            }
        }
    );


    /* ===========================
       页面级事件
    =========================== */

    window.addEventListener(
        "resize",
        handleViewportChange
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

    reducedMotionQuery
        .addEventListener?.(
            "change",
            handleReducedMotionChange
        );

    mobileQuery
        .addEventListener?.(
            "change",
            handleViewportChange
        );


    /* ===========================
       初始状态
    =========================== */

    focusOrganization(
        0
    );

    rotation =
        targetRotation;

    updateCurrentInformation();
    measureOrbit();
    updateSectionState();
}