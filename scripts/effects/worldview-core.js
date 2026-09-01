/* ===========================
   世界观核心档案
   Three.js r128 兼容版
=========================== */


/* ===========================
   1. 世界观核心配置
=========================== */

const WORLDVIEW_CORE_CONFIG = {
    coreScale:
        0.25,

    closedEdgeOpacity:
        0.05,

    openEdgeOpacity:
        0.47,

    dragSensitivity:
        0.0045,

    dragFollow:
        0.1,

    inertiaStrength:
        0.0009,

    inertiaDamping:
        0.9
};


/* ===========================
   2. 一级目录配置
=========================== */

const WORLDVIEW_CATEGORIES = [
    {
        name:
            "场景",

        target:
            "scene",

        sectionId:
            "worldview-scenes-section"
    },

    {
        name:
            "本质",

        target:
            "essence",

        sectionId:
            "innerworld-section"
    },

    {
        name:
            "宇宙树",

        target:
            "universe-tree",

        sectionId:
            null
    },

    {
        name:
            "组织",

        target:
            "organizations",

        sectionId:
            "worldview-organizations-section"
    },

    {
        name:
            "事物",

        target:
            "events",

        sectionId:
            "worldview-things-section"
    },

    {
        name:
            "战斗力",

        target:
            "power",

        sectionId:
            "power-system-section"
    }
];


/* ===========================
   3. 基础运行状态
=========================== */

let initialized =
    false;

let active =
    false;

let animationFrameId =
    null;

let canvas =
    null;

let container =
    null;

let scene =
    null;

let camera =
    null;

let renderer =
    null;

let clock =
    null;


/* ===========================
   4. 世界观对象
=========================== */

let observationRoot =
    null;

let coreRoot =
    null;

let orbitRoot =
    null;

let panels =
    [];

let nestedCubes =
    [];

let orbiters =
    [];

let orbiterMeshes =
    [];


/* ===========================
   5. 射线检测
=========================== */

let raycaster =
    null;

let mouse =
    null;

let hoveredCore =
    false;

let hoveredOrbiter =
    null;


/* ===========================
   6. 核心展开状态
=========================== */

let lockedOpen =
    false;

let openness =
    0;

let targetOpenness =
    0;


/* ===========================
   7. 拖动状态
=========================== */

let dragging =
    false;

let moved =
    false;

let lastX =
    0;

let lastY =
    0;


/* ===========================
   8. 实际旋转
=========================== */

let manualRotationX =
    0;

let manualRotationY =
    0;

let manualRotationZ =
    0;


/* ===========================
   9. 目标旋转
=========================== */

let targetManualRotationX =
    0;

let targetManualRotationY =
    0;

let targetManualRotationZ =
    0;


/* ===========================
   10. 拖动惯性
=========================== */

let rotationVelocityX =
    0;

let rotationVelocityY =
    0;

let rotationVelocityZ =
    0;


/* ===========================
   11. 交互状态
=========================== */

let interactionEnabled =
    true;


/* ===========================
   12. 档案空间建立状态
=========================== */

const reducedMotionQuery =
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

let hasCompletedInitialReveal =
    false;

let revealProgress =
    1;

let revealStartProgress =
    0;

let revealStartedAt =
    0;

let revealDuration =
    1100;

let unavailableSignalUntil =
    0;


/* ===========================
   12. 通用工具
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

function easeInOutCubic(
    value
) {
    return value < 0.5
        ? 4 *
            value *
            value *
            value
        : 1 -
            Math.pow(
                -2 *
                    value +
                    2,
                3
            ) /
            2;
}

function smoothstep(
    minimum,
    maximum,
    value
) {
    const normalized =
        clamp(
            (
                value -
                minimum
            ) /
            (
                maximum -
                minimum
            ),
            0,
            1
        );

    return normalized *
        normalized *
        (
            3 -
            2 *
            normalized
        );
}


/* ===========================
   13. 尺寸工具
=========================== */

function getCanvasSize() {
    if (!container) {
        return {
            width:
                1,

            height:
                1
        };
    }

    const rect =
        container.getBoundingClientRect();

    return {
        width:
            Math.max(
                1,
                Math.round(
                    rect.width
                )
            ),

        height:
            Math.max(
                1,
                Math.round(
                    rect.height
                )
            )
    };
}

function resizeWorldviewCore() {
    if (
        !initialized ||
        !renderer ||
        !camera
    ) {
        return;
    }

    const {
        width,
        height
    } =
        getCanvasSize();

    camera.aspect =
        width /
        height;

    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio ||
                1,
            1.5
        )
    );

    renderer.setSize(
        width,
        height,
        false
    );
}


/* ===========================
   14. Canvas 样式
=========================== */

function applyCanvasStyles() {
    if (!canvas) {
        return;
    }

    Object.assign(
        canvas.style,
        {
            cursor:
                "grab",

            display:
                "block",

            height:
                "100%",

            inset:
                "0",

            pointerEvents:
                "auto",

            position:
                "absolute",

            touchAction:
                "none",

            width:
                "100%",

            zIndex:
                "1"
        }
    );
}


/* ===========================
   15. 创建场景
=========================== */

function createScene() {
    const {
        width,
        height
    } =
        getCanvasSize();

    scene =
        new THREE.Scene();

    camera =
        new THREE.PerspectiveCamera(
            45,
            width /
                height,
            0.1,
            500
        );

    camera.position.set(
        0,
        1.5,
        16
    );

    renderer =
        new THREE.WebGLRenderer({
            canvas,

            alpha:
                true,

            antialias:
                true,

            powerPreference:
                "high-performance"
        });

    renderer.setClearColor(
        0x000000,
        0
    );

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio ||
                1,
            1.5
        )
    );

    renderer.setSize(
        width,
        height,
        false
    );

    clock =
        new THREE.Clock(
            false
        );

    raycaster =
        new THREE.Raycaster();

    mouse =
        new THREE.Vector2(
            2,
            2
        );
}


/* ===========================
   16. 创建灯光
=========================== */

function createLights() {
    const directionalLight =
        new THREE.DirectionalLight(
            0xEEEEEE,
            1
        );

    directionalLight.position
        .set(
            5,
            5,
            5
        )
        .normalize();

    scene.add(
        directionalLight
    );

    const ambientLight =
        new THREE.AmbientLight(
            0x404040
        );

    scene.add(
        ambientLight
    );
}


/* ===========================
   17. 创建核心外壳
=========================== */

function createCore() {
    observationRoot =
        new THREE.Group();

    observationRoot.rotation.set(
        -0.28,
        0.55,
        0
    );

    scene.add(
        observationRoot
    );

    coreRoot =
        new THREE.Group();

    coreRoot.scale.setScalar(
        WORLDVIEW_CORE_CONFIG
            .coreScale
    );

    observationRoot.add(
        coreRoot
    );

    const faceSize =
        5.4;

    const half =
        faceSize /
        2;

    const shellMaterial =
        new THREE.MeshStandardMaterial({
            color:
                "#888888",

            opacity:
                1,

            transparent:
                true,

            side:
                THREE.DoubleSide,

            depthWrite:
                true
        });

    const edgeMaterial =
        new THREE.LineBasicMaterial({
            color:
                0xD8D8D8,

            transparent:
                true,

            opacity:
                0.24
        });

    const glassMaterial =
        new THREE.MeshPhysicalMaterial({
            color:
                0xDDDDDD,

            roughness:
                0.06,

            metalness:
                0,

            transmission:
                0.96,

            transparent:
                true,

            opacity:
                0,

            reflectivity:
                0.5,

            side:
                THREE.DoubleSide,

            depthWrite:
                false
        });

    const glowGeometry =
        new THREE.PlaneGeometry(
            0.38,
            0.38
        );

    const glowMaterial =
        new THREE.MeshBasicMaterial({
            color:
                0xFFFFFF,

            side:
                THREE.DoubleSide,

            transparent:
                true,

            opacity:
                0.98,

            depthWrite:
                false
        });

    function createFaceAssembly({
        name,
        position,
        baseRotation,
        direction
    }) {
        const pivot =
            new THREE.Group();

        pivot.position.copy(
            position
        );

        const body =
            new THREE.Group();

        body.rotation.copy(
            baseRotation
        );

        pivot.add(
            body
        );

        const faceGeometry =
            new THREE.PlaneGeometry(
                faceSize,
                faceSize
            );

        const solidMesh =
            new THREE.Mesh(
                faceGeometry,
                shellMaterial.clone()
            );

        body.add(
            solidMesh
        );

        const glassMesh =
            new THREE.Mesh(
                faceGeometry.clone(),
                glassMaterial.clone()
            );

        glassMesh.position.z =
            0.006;

        body.add(
            glassMesh
        );

        const edges =
            new THREE.LineSegments(
                new THREE.EdgesGeometry(
                    faceGeometry
                ),

                edgeMaterial.clone()
            );

        edges.position.z =
            0.01;

        body.add(
            edges
        );

        const glowGroup =
            new THREE.Group();

        glowGroup.position.z =
            0.018;

        const gap =
            0.78;

        for (
            let row = -1;
            row <= 1;
            row += 1
        ) {
            for (
                let column = -1;
                column <= 1;
                column += 1
            ) {
                const glow =
                    new THREE.Mesh(
                        glowGeometry,
                        glowMaterial.clone()
                    );

                glow.position.set(
                    column *
                        gap,

                    row *
                        gap,

                    0
                );

                glow.userData = {
                    phase:
                        Math.random() *
                        Math.PI *
                        2,

                    speed:
                        0.8 +
                        Math.random() *
                        2.2,

                    minimumOpacity:
                        0.34 +
                        Math.random() *
                        0.24,

                    maximumOpacity:
                        0.78 +
                        Math.random() *
                        0.22
                };

                glowGroup.add(
                    glow
                );
            }
        }

        body.add(
            glowGroup
        );

        pivot.userData = {
            name,
            body,
            solidMesh,
            glassMesh,
            edges,
            glowGroup,

            homePosition:
                position.clone(),

            direction:
                direction.clone()
        };

        coreRoot.add(
            pivot
        );

        panels.push(
            pivot
        );
    }

    createFaceAssembly({
        name:
            "front",

        position:
            new THREE.Vector3(
                0,
                0,
                half
            ),

        baseRotation:
            new THREE.Euler(
                0,
                0,
                0
            ),

        direction:
            new THREE.Vector3(
                0,
                0,
                1
            )
    });

    createFaceAssembly({
        name:
            "back",

        position:
            new THREE.Vector3(
                0,
                0,
                -half
            ),

        baseRotation:
            new THREE.Euler(
                0,
                Math.PI,
                0
            ),

        direction:
            new THREE.Vector3(
                0,
                0,
                -1
            )
    });

    createFaceAssembly({
        name:
            "right",

        position:
            new THREE.Vector3(
                half,
                0,
                0
            ),

        baseRotation:
            new THREE.Euler(
                0,
                Math.PI /
                    2,
                0
            ),

        direction:
            new THREE.Vector3(
                1,
                0,
                0
            )
    });

    createFaceAssembly({
        name:
            "left",

        position:
            new THREE.Vector3(
                -half,
                0,
                0
            ),

        baseRotation:
            new THREE.Euler(
                0,
                -Math.PI /
                    2,
                0
            ),

        direction:
            new THREE.Vector3(
                -1,
                0,
                0
            )
    });

    createFaceAssembly({
        name:
            "top",

        position:
            new THREE.Vector3(
                0,
                half,
                0
            ),

        baseRotation:
            new THREE.Euler(
                -Math.PI /
                    2,
                0,
                0
            ),

        direction:
            new THREE.Vector3(
                0,
                1,
                0
            )
    });

    createFaceAssembly({
        name:
            "bottom",

        position:
            new THREE.Vector3(
                0,
                -half,
                0
            ),

        baseRotation:
            new THREE.Euler(
                Math.PI /
                    2,
                0,
                0
            ),

        direction:
            new THREE.Vector3(
                0,
                -1,
                0
            )
    });

    createInnerCore();
}


/* ===========================
   18. 创建核心内部
=========================== */

function createInnerCore() {
    const innerCore =
        new THREE.Group();

    coreRoot.add(
        innerCore
    );

    const singularity =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.14,
                24,
                24
            ),

            new THREE.MeshBasicMaterial({
                color:
                    0xFFFFFF,

                transparent:
                    true,

                opacity:
                    1
            })
        );

    singularity.name =
        "worldview-singularity";

    innerCore.add(
        singularity
    );

    const nestedCubeGroup =
        new THREE.Group();

    nestedCubeGroup.name =
        "worldview-nested-cubes";

    innerCore.add(
        nestedCubeGroup
    );

    for (
        let index = 0;
        index < 7;
        index += 1
    ) {
        const size =
            0.6 +
            index *
            0.48;

        const geometry =
            new THREE.BoxGeometry(
                size,
                size,
                size
            );

        const wire =
            new THREE.LineSegments(
                new THREE.EdgesGeometry(
                    geometry
                ),

                new THREE.LineBasicMaterial({
                    color:
                        0xFFFFFF,

                    transparent:
                        true,

                    opacity:
                        0
                })
            );

        wire.userData = {
            baseOpacity:
                0.52 -
                index *
                0.05,

            speed:
                (
                    index % 2
                        ? -1
                        : 1
                ) *
                (
                    0.15 +
                    index *
                    0.025
                )
        };

        nestedCubeGroup.add(
            wire
        );

        nestedCubes.push(
            wire
        );
    }
}


/* ===========================
   创建目录名称
=========================== */

function makeTextSprite(
    text,
    scale = 1
) {
    const labelCanvas =
        document.createElement(
            "canvas"
        );

    labelCanvas.width =
        512;

    labelCanvas.height =
        192;

    const context =
        labelCanvas.getContext(
            "2d"
        );

    if (!context) {
        return new THREE.Sprite();
    }

    context.clearRect(
        0,
        0,
        labelCanvas.width,
        labelCanvas.height
    );

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    context.font =
        '500 58px Arial, "Microsoft YaHei", sans-serif';

    context.fillStyle =
        "#FFFFFF";

    context.fillText(
        text,
        labelCanvas.width / 2,
        labelCanvas.height / 2
    );

    const texture =
        new THREE.CanvasTexture(
            labelCanvas
        );

    texture.encoding =
        THREE.sRGBEncoding;

    texture.minFilter =
        THREE.LinearFilter;

    texture.magFilter =
        THREE.LinearFilter;

    texture.generateMipmaps =
        false;

    texture.needsUpdate =
        true;

    const material =
        new THREE.SpriteMaterial({
            map:
                texture,

            transparent:
                true,

            opacity:
                0.12,

            /*
             * 不参与深度检测，
             * 保证文字不会被所属方块遮挡。
             */
            depthTest:
                false,

            depthWrite:
                false
        });

    const sprite =
        new THREE.Sprite(
            material
        );

    sprite.scale.set(
        1.72 * scale,
        0.645 * scale,
        1
    );

    /*
     * 同一渲染层级中稍晚绘制。
     */
    sprite.renderOrder =
        20;

    sprite.userData = {
        baseOpacity:
            0,

        hoverOpacity:
            1
    };

    return sprite;
}


/* ===========================
   20. 创建外围目录方块
=========================== */

function createOrbiters() {
    orbitRoot =
        new THREE.Group();

    observationRoot.add(
        orbitRoot
    );

    const cubeGeometry =
        new THREE.BoxGeometry(
            0.92,
            0.92,
            0.92
        );

    WORLDVIEW_CATEGORIES.forEach(
        (
            category,
            index
        ) => {
            const pivot =
                new THREE.Group();

            pivot.rotation.x =
                THREE.MathUtils
                    .randFloat(
                        -0.5,
                        0.5
                    );

            pivot.rotation.z =
                THREE.MathUtils
                    .randFloat(
                        -0.42,
                        0.42
                    );

            pivot.rotation.y =
                index /
                WORLDVIEW_CATEGORIES
                    .length *
                Math.PI *
                2;

            orbitRoot.add(
                pivot
            );

            const group =
                new THREE.Group();

            const radius =
                4.2 +
                (
                    index %
                    2
                ) *
                0.55;

            group.position.x =
                radius;

            pivot.add(
                group
            );

            const material =
                window.material
                    ? window.material
                        .clone()
                    : new THREE
                        .MeshStandardMaterial({
                            color:
                                "#888888",

                            opacity:
                                1,

                            transparent:
                                true
                        });

            const cube =
                new THREE.Mesh(
                    cubeGeometry,
                    material
                );

            cube.userData.parentGroup =
                group;

            cube.userData.name =
                category.name;

            cube.userData.target =
                category.target;

            cube.userData.sectionId =
                category.sectionId;

            group.add(
                cube
            );

            const edges =
                new THREE.LineSegments(
                    new THREE.EdgesGeometry(
                        cubeGeometry
                    ),

                    new THREE.LineBasicMaterial({
                        color:
                            0xAAAAAA,

                        opacity:
                            0.16,

                        transparent:
                            true
                    })
                );

            group.add(
                edges
            );

            const label =
                makeTextSprite(
                    category.name,
                    2
                );

            /*
            * 标签保持在方块几何中心。
            */
            label.position.set(
                0,
                0,
                0
            );

            group.add(
                label
            );

            const baseScale =
                0.96 +
                Math.random() *
                0.08;

            group.scale.setScalar(
                baseScale
            );

            group.userData = {
                baseScale,

                targetScale:
                    baseScale,

                label,
                edges,
                cube,

                name:
                    category.name,

                target:
                    category.target,

                sectionId:
                    category.sectionId,

                orbitSpeed:
                    THREE.MathUtils
                        .randFloat(
                            0.22,
                            0.42
                        ) *
                    (
                        index % 2 ===
                        0
                            ? 1
                            : -1
                    ),

                spinX:
                    THREE.MathUtils
                        .randFloat(
                            -0.42,
                            0.42
                        ),

                spinY:
                    THREE.MathUtils
                        .randFloat(
                            -0.42,
                            0.42
                        ),

                spinZ:
                    THREE.MathUtils
                        .randFloat(
                            -0.3,
                            0.3
                        ),

                phase:
                    Math.random() *
                    Math.PI *
                    2
            };

            orbiters.push({
                pivot,
                group
            });

            orbiterMeshes.push(
                cube
            );
        }
    );
}


/* ===========================
   21. 更新鼠标坐标
=========================== */

function updateMouse(
    event
) {
    const rect =
        canvas.getBoundingClientRect();

    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {
        mouse.set(
            2,
            2
        );

        return;
    }

    mouse.x =
        (
            event.clientX -
            rect.left
        ) /
        rect.width *
        2 -
        1;

    mouse.y =
        -(
            (
                event.clientY -
                rect.top
            ) /
            rect.height
        ) *
        2 +
        1;
}


/* ===========================
   22. 核心可交互对象
=========================== */

function getCoreInteractiveObjects() {
    return panels.flatMap(
        panel => [
            panel.userData
                .solidMesh,

            panel.userData
                .glassMesh
        ]
    );
}


/* ===========================
   23. Target Cursor 事件
=========================== */

function dispatchCursorTarget(
    orbiter
) {
    if (!orbiter) {
        return;
    }

    window.dispatchEvent(
        new CustomEvent(
            "worldview-cursor-target",
            {
                detail: {
                    object:
                        orbiter,

                    name:
                        orbiter
                            .userData
                            .name,

                    target:
                        orbiter
                            .userData
                            .target,

                    sectionId:
                        orbiter
                            .userData
                            .sectionId,

                    camera,
                    canvas,
                    container
                }
            }
        )
    );
}

function dispatchCursorClear() {
    window.dispatchEvent(
        new CustomEvent(
            "worldview-cursor-clear"
        )
    );
}

function dispatchCursorSuspend() {
    window.dispatchEvent(
        new CustomEvent(
            "worldview-cursor-suspend"
        )
    );
}

function dispatchCursorResume() {
    window.dispatchEvent(
        new CustomEvent(
            "worldview-cursor-resume"
        )
    );
}


/* ===========================
   24. 清除方块悬停
=========================== */

function clearHoveredOrbiter() {
    if (!hoveredOrbiter) {
        return;
    }

    const data =
        hoveredOrbiter.userData;

    data.targetScale =
        data.baseScale;

    data.edges.material.opacity =
        0.16;

    hoveredOrbiter =
        null;

    dispatchCursorClear();
}


/* ===========================
   25. 更新悬停状态
=========================== */

function updateHoverState() {
    if (
        !active ||
        !interactionEnabled ||
        dragging
    ) {
        return;
    }

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const orbiterHits =
        raycaster.intersectObjects(
            orbiterMeshes,
            false
        );

    const nextOrbiter =
        orbiterHits.length >
        0
            ? orbiterHits[0]
                .object
                .userData
                .parentGroup
            : null;

    if (
        nextOrbiter !==
        hoveredOrbiter
    ) {
        clearHoveredOrbiter();

        hoveredOrbiter =
            nextOrbiter;

        if (hoveredOrbiter) {
            const data =
                hoveredOrbiter
                    .userData;

            data.targetScale =
                data.baseScale *
                1.08;

            data.edges
                .material
                .opacity =
                0.42;

            dispatchCursorTarget(
                hoveredOrbiter
            );
        }
    }

    const coreHits =
        raycaster.intersectObjects(
            getCoreInteractiveObjects(),
            false
        );

    hoveredCore =
        coreHits.length >
        0;

    if (!lockedOpen) {
        targetOpenness =
            hoveredCore
                ? 0.32
                : 0;
    }

    canvas.style.cursor =
        hoveredCore ||
        hoveredOrbiter
            ? "pointer"
            : "grab";
}


/* ===========================
   26. 打开一级目录目标
=========================== */

function openWorldviewOrbiter(
    orbiter
) {
    if (!orbiter) {
        return false;
    }

    const {
        name,
        target,
        sectionId
    } =
        orbiter.userData;

    if (!sectionId) {
        unavailableSignalUntil =
            performance.now() +
            900;

        orbiter.userData
            .unavailablePulseStartedAt =
            performance.now();

        const canvasRect =
            canvas.getBoundingClientRect();

        const worldPosition =
            new THREE.Vector3();

        orbiter.getWorldPosition(
            worldPosition
        );

        worldPosition.project(
            camera
        );

        window.dispatchEvent(
            new CustomEvent(
                "worldview-orbiter-unavailable",
                {
                    detail: {
                        name,
                        target,
                        category:
                            "directory",
                        anchor: {
                            x:
                                canvasRect.left +
                                (
                                    worldPosition.x +
                                    1
                                ) /
                                2 *
                                canvasRect.width,
                            y:
                                canvasRect.top +
                                (
                                    1 -
                                    worldPosition.y
                                ) /
                                2 *
                                canvasRect.height
                        }
                    }
                }
            )
        );

        console.info(
            `世界观目录“${name}”暂未开放。`
        );

        return false;
    }

    const targetSection =
        document.getElementById(
            sectionId
        );

    if (!targetSection) {
        console.error(
            `未找到世界观目标区块：#${sectionId}`
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

    interactionEnabled =
        false;

    dispatchCursorClear();

    hideWorldviewCore();

    window.showSection(
        sectionId,
        {
            transitionType:
                "slide",

            direction:
                "forward",

            scrollMode:
                "top"
        }
    );

    return true;
}


/* ===========================
   27. 指针移动
=========================== */

function handlePointerMove(
    event
) {
    if (
        !active ||
        !interactionEnabled
    ) {
        return;
    }

    updateMouse(
        event
    );

    if (!dragging) {
        updateHoverState();
        return;
    }

    const deltaX =
        event.clientX -
        lastX;

    const deltaY =
        event.clientY -
        lastY;

    if (
        Math.abs(
            deltaX
        ) +
        Math.abs(
            deltaY
        ) >
        2
    ) {
        moved =
            true;
    }

    if (event.shiftKey) {
        targetManualRotationZ +=
            deltaX *
            WORLDVIEW_CORE_CONFIG
                .dragSensitivity;

        rotationVelocityZ =
            deltaX *
            WORLDVIEW_CORE_CONFIG
                .inertiaStrength;
    } else {
        targetManualRotationY +=
            deltaX *
            WORLDVIEW_CORE_CONFIG
                .dragSensitivity;

        targetManualRotationX +=
            deltaY *
            WORLDVIEW_CORE_CONFIG
                .dragSensitivity;

        rotationVelocityY =
            deltaX *
            WORLDVIEW_CORE_CONFIG
                .inertiaStrength;

        rotationVelocityX =
            deltaY *
            WORLDVIEW_CORE_CONFIG
                .inertiaStrength;
    }

    targetManualRotationX =
        clamp(
            targetManualRotationX,
            -0.9,
            0.9
        );

    lastX =
        event.clientX;

    lastY =
        event.clientY;
}


/* ===========================
   28. 指针按下
=========================== */

function handlePointerDown(
    event
) {
    if (
        !active ||
        !interactionEnabled
    ) {
        return;
    }

    updateMouse(
        event
    );

    updateHoverState();

    dragging =
        true;

    moved =
        false;

    lastX =
        event.clientX;

    lastY =
        event.clientY;

    rotationVelocityX =
        0;

    rotationVelocityY =
        0;

    rotationVelocityZ =
        0;

    canvas.style.cursor =
        "grabbing";

    dispatchCursorSuspend();

    canvas.setPointerCapture?.(
        event.pointerId
    );
}


/* ===========================
   29. 指针松开
=========================== */

function handlePointerUp(
    event
) {
    if (!active) {
        return;
    }

    dragging =
        false;

    if (
        canvas.hasPointerCapture?.(
            event.pointerId
        )
    ) {
        canvas.releasePointerCapture(
            event.pointerId
        );
    }

    dispatchCursorResume();

    if (!interactionEnabled) {
        return;
    }

    if (
        !moved &&
        hoveredOrbiter
    ) {
        const selectedOrbiter =
            hoveredOrbiter;

        openWorldviewOrbiter(
            selectedOrbiter
        );

        return;
    }

    if (
        !moved &&
        hoveredCore
    ) {
        lockedOpen =
            !lockedOpen;

        targetOpenness =
            lockedOpen
                ? 1
                : 0;
    }

    updateHoverState();
}


/* ===========================
   30. 指针离开
=========================== */

function handlePointerLeave() {
    dragging =
        false;

    hoveredCore =
        false;

    mouse.set(
        2,
        2
    );

    clearHoveredOrbiter();

    if (!lockedOpen) {
        targetOpenness =
            0;
    }

    if (canvas) {
        canvas.style.cursor =
            "grab";
    }

    dispatchCursorClear();
}


/* ===========================
   31. 事件绑定
=========================== */

function bindEvents() {
    canvas.addEventListener(
        "pointermove",
        handlePointerMove
    );

    canvas.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    canvas.addEventListener(
        "pointerup",
        handlePointerUp
    );

    canvas.addEventListener(
        "pointercancel",
        handlePointerUp
    );

    canvas.addEventListener(
        "pointerleave",
        handlePointerLeave
    );

    window.addEventListener(
        "resize",
        resizeWorldviewCore
    );
}


/* ===========================
   32. 动画循环
=========================== */

function animate() {
    if (!active) {
        animationFrameId =
            null;

        return;
    }

    animationFrameId =
        window.requestAnimationFrame(
            animate
        );

    const time =
        clock.getElapsedTime();

    if (revealProgress < 1) {
        const elapsed =
            performance.now() -
            revealStartedAt;

        revealProgress =
            revealStartProgress +
            (
                1 -
                revealStartProgress
            ) *
            clamp(
                elapsed /
                revealDuration,
                0,
                1
            );

        if (revealProgress >= 1) {
            revealProgress =
                1;
            interactionEnabled =
                true;
            container?.classList.remove(
                "is-core-establishing",
                "is-core-restoring"
            );
        }
    }

    const easedReveal =
        easeInOutCubic(
            revealProgress
        );

    const coreReveal =
        smoothstep(
            0.06,
            0.56,
            easedReveal
        );

    const orbitReveal =
        smoothstep(
            0.4,
            0.86,
            easedReveal
        );

    const labelReveal =
        smoothstep(
            0.68,
            1,
            easedReveal
        );

    coreRoot.scale.setScalar(
        WORLDVIEW_CORE_CONFIG.coreScale *
        (
            0.92 +
            coreReveal *
            0.08
        )
    );

    orbitRoot.scale.setScalar(
        0.82 +
        orbitReveal *
            0.18
    );

    coreRoot.visible =
        coreReveal >
        0.004;

    orbitRoot.visible =
        orbitReveal >
        0.004;


    /* ===========================
       拖动缓动
    =========================== */

    manualRotationX +=
        (
            targetManualRotationX -
            manualRotationX
        ) *
        WORLDVIEW_CORE_CONFIG
            .dragFollow;

    manualRotationY +=
        (
            targetManualRotationY -
            manualRotationY
        ) *
        WORLDVIEW_CORE_CONFIG
            .dragFollow;

    manualRotationZ +=
        (
            targetManualRotationZ -
            manualRotationZ
        ) *
        WORLDVIEW_CORE_CONFIG
            .dragFollow;


    /* ===========================
       松手惯性
    =========================== */

    if (!dragging) {
        targetManualRotationX +=
            rotationVelocityX;

        targetManualRotationY +=
            rotationVelocityY;

        targetManualRotationZ +=
            rotationVelocityZ;

        rotationVelocityX *=
            WORLDVIEW_CORE_CONFIG
                .inertiaDamping;

        rotationVelocityY *=
            WORLDVIEW_CORE_CONFIG
                .inertiaDamping;

        rotationVelocityZ *=
            WORLDVIEW_CORE_CONFIG
                .inertiaDamping;

        targetManualRotationX =
            clamp(
                targetManualRotationX,
                -0.9,
                0.9
            );
    }


    /* ===========================
       核心展开
    =========================== */

    openness +=
        (
            targetOpenness -
            openness
        ) *
        0.07;

    const eased =
        easeInOutCubic(
            clamp(
                openness,
                0,
                1
            )
        );


    /* ===========================
       一级目录整体旋转
    =========================== */

    observationRoot.rotation.x =
        -0.28 +
        Math.sin(
            time *
            0.24
        ) *
        0.09 +
        manualRotationX;

    observationRoot.rotation.y =
        0.55 +
        time *
        0.12 +
        manualRotationY;

    observationRoot.rotation.z =
        Math.sin(
            time *
            0.18
        ) *
        0.035 +
        manualRotationZ;


    /* ===========================
       中央核心旋转
    =========================== */

    coreRoot.rotation.x =
        Math.sin(
            time *
            0.17
        ) *
        0.28;

    coreRoot.rotation.y =
        time *
        0.13 +
        Math.sin(
            time *
            0.11
        ) *
        0.34;

    coreRoot.rotation.z =
        Math.cos(
            time *
            0.14
        ) *
        0.22;


    /* ===========================
       核心六面板
    =========================== */

    panels.forEach(
        (
            panel,
            index
        ) => {
            const data =
                panel.userData;

            const travel =
                2.5 *
                eased;

            panel.position
                .copy(
                    data.homePosition
                )
                .addScaledVector(
                    data.direction,
                    travel
                );

            data.body.rotation.z =
                -Math.PI /
                2 *
                eased;

            const wave =
                Math.sin(
                    time *
                    1.5 +
                    index *
                    0.8
                ) *
                0.08 *
                eased;

            panel.position
                .addScaledVector(
                    data.direction,
                    wave
                );

            data.solidMesh
                .material
                .color
                .setHex(
                    0x888888
                );

            data.solidMesh
                .material
                .opacity =
                (
                    1 -
                    eased
                ) *
                coreReveal;

            data.solidMesh
                .material
                .depthWrite =
                eased <
                0.5;

            data.glassMesh
                .material
                .opacity =
                eased *
                0.68 *
                coreReveal;

            data.glassMesh
                .material
                .transmission =
                0.42 +
                eased *
                0.5;

            data.edges
                .material
                .opacity =
                THREE.MathUtils
                    .lerp(
                        WORLDVIEW_CORE_CONFIG
                            .closedEdgeOpacity,

                        WORLDVIEW_CORE_CONFIG
                            .openEdgeOpacity,

                        eased
                    );

            data.edges
                .material
                .opacity *=
                coreReveal;

            data.glowGroup
                .children
                .forEach(
                    glow => {
                        const glowData =
                            glow.userData;

                        const pulse =
                            (
                                Math.sin(
                                    time *
                                    glowData.speed +
                                    glowData.phase
                                ) +
                                1
                            ) /
                            2;

                        glow.material.opacity =
                            THREE.MathUtils
                                .lerp(
                                    glowData
                                        .minimumOpacity,

                                    glowData
                                        .maximumOpacity,

                                    pulse
                                ) *
                            coreReveal;

                        glow.scale.setScalar(
                            0.94 +
                            pulse *
                            0.12 +
                            eased *
                            0.12
                        );
                    }
                );
        }
    );


    /* ===========================
       核心内部线框
    =========================== */

    const nestedCubeGroup =
        coreRoot.getObjectByName(
            "worldview-nested-cubes"
        );

    if (nestedCubeGroup) {
        nestedCubeGroup
            .scale
            .setScalar(
                THREE.MathUtils
                    .lerp(
                        0.42,
                        1,
                        eased
                    )
            );
    }

    nestedCubes.forEach(
        wire => {
            wire.rotation.x =
                time *
                wire.userData
                    .speed;

            wire.rotation.y =
                -time *
                wire.userData
                    .speed *
                0.72;

            const visibility =
                THREE.MathUtils
                    .smoothstep(
                        eased,
                        0.12,
                        0.5
                    );

            wire.material.opacity =
                wire.userData
                    .baseOpacity *
                visibility *
                coreReveal;
        }
    );


    /* ===========================
       核心中心点
    =========================== */

    const singularity =
        coreRoot.getObjectByName(
            "worldview-singularity"
        );

    if (singularity) {
        singularity.scale.setScalar(
            0.8 +
            Math.sin(
                time *
                3.2
            ) *
            0.16 +
            eased *
            0.65
        );

        singularity.material.opacity =
            coreReveal;
    }


    /* ===========================
    公转方块
    =========================== */

    orbiters.forEach(
        ({
            pivot,
            group
        }) => {
            const data =
                group.userData;

            const unavailableSpeed =
                performance.now() <
                    unavailableSignalUntil
                    ? 0.25
                    : 1;

            const unavailableElapsed =
                performance.now() -
                (
                    data.unavailablePulseStartedAt ||
                    -1000
                );

            const unavailableProgress =
                clamp(
                    unavailableElapsed /
                    900,
                    0,
                    1
                );

            const unavailableScale =
                unavailableElapsed >= 0 &&
                unavailableElapsed < 900
                    ? 1 -
                        Math.sin(
                            unavailableProgress *
                            Math.PI
                        ) *
                        0.08
                    : 1;

            pivot.rotation.y +=
                data.orbitSpeed *
                0.01 *
                unavailableSpeed *
                orbitReveal;

            group.rotation.x +=
                data.spinX *
                0.01 *
                orbitReveal;

            group.rotation.y +=
                data.spinY *
                0.01 *
                orbitReveal;

            group.rotation.z +=
                data.spinZ *
                0.01 *
                orbitReveal;

            group.position.y =
                Math.sin(
                    time *
                    0.62 +
                    data.phase
                ) *
                0.34;

            data.cube.material.opacity =
                orbitReveal;

            data.edges.material.opacity =
                (
                    hoveredOrbiter ===
                    group
                        ? 0.42
                        : 0.16
                ) *
                orbitReveal;

            const labelTargetOpacity =
                hoveredOrbiter ===
                group
                    ? data.label.userData
                        .hoverOpacity
                    : data.label.userData
                        .baseOpacity;

            data.label.material.opacity =
                THREE.MathUtils.lerp(
                    data.label.material.opacity,
                    labelTargetOpacity *
                        labelReveal,
                    0.12
                );

            const nextScale =
                THREE.MathUtils.lerp(
                    group.scale.x,
                    data.targetScale *
                        unavailableScale,
                    0.1
                );

            group.scale.setScalar(
                nextScale
            );
        }
    );


    /* ===========================
       悬停更新
    =========================== */

    if (
        !dragging &&
        interactionEnabled
    ) {
        updateHoverState();
    }


    /* ===========================
       最终渲染
    =========================== */

    renderer.render(
        scene,
        camera
    );
}


/* ===========================
   33. 初始化
=========================== */

export function initializeWorldviewCore() {
    if (initialized) {
        return true;
    }

    if (!window.THREE) {
        console.error(
            "世界观核心初始化失败：未找到 Three.js。"
        );

        return false;
    }

    canvas =
        document.getElementById(
            "worldview-canvas"
        );

    if (!canvas) {
        console.error(
            "世界观核心初始化失败：未找到 #worldview-canvas。"
        );

        return false;
    }

    container =
        document.getElementById(
            "worldview-section"
        );

    if (!container) {
        console.error(
            "世界观核心初始化失败：未找到 #worldview-section。"
        );

        return false;
    }

    panels =
        [];

    nestedCubes =
        [];

    orbiters =
        [];

    orbiterMeshes =
        [];

    applyCanvasStyles();

    createScene();
    createLights();
    createCore();
    createOrbiters();
    bindEvents();

    initialized =
        true;

    return true;
}


/* ===========================
   34. 显示
=========================== */

export function showWorldviewCore() {
    if (
        !initializeWorldviewCore()
    ) {
        return false;
    }

    active =
        true;

    interactionEnabled =
        false;

    const returning =
        hasCompletedInitialReveal;

    revealStartProgress =
        reducedMotionQuery.matches
            ? 1
            : returning
                ? 0.34
                : 0;

    revealProgress =
        revealStartProgress;

    revealDuration =
        returning
            ? 460
            : 1100;

    revealStartedAt =
        performance.now();

    hasCompletedInitialReveal =
        true;

    if (reducedMotionQuery.matches) {
        interactionEnabled =
            true;
    }

    container.classList.remove(
        "is-core-establishing",
        "is-core-restoring"
    );

    if (!reducedMotionQuery.matches) {
        container.classList.add(
            returning
                ? "is-core-restoring"
                : "is-core-establishing"
        );
    }

    coreRoot.visible =
        false;

    orbitRoot.visible =
        false;

    renderer.clear();

    canvas.hidden =
        false;

    applyCanvasStyles();

    window.dispatchEvent(
        new CustomEvent(
            "worldview-core-show",
            {
                detail: {
                    canvas,
                    container,
                    camera,
                    scene,
                    renderer
                }
            }
        )
    );

    window.requestAnimationFrame(
        () => {
            if (!active) {
                return;
            }

            resizeWorldviewCore();

            if (!clock.running) {
                clock.start();
            }

            if (
                animationFrameId ===
                null
            ) {
                animate();
            }
        }
    );

    return true;
}


/* ===========================
   35. 隐藏
=========================== */

export function hideWorldviewCore() {
    if (!initialized) {
        return;
    }

    window.dispatchEvent(
        new CustomEvent(
            "worldview-core-hide"
        )
    );

    active =
        false;

    interactionEnabled =
        false;

    container?.classList.remove(
        "is-core-establishing",
        "is-core-restoring"
    );

    dragging =
        false;

    moved =
        false;

    hoveredCore =
        false;

    lockedOpen =
        false;

    openness =
        0;

    targetOpenness =
        0;

    targetManualRotationX =
        manualRotationX;

    targetManualRotationY =
        manualRotationY;

    targetManualRotationZ =
        manualRotationZ;

    rotationVelocityX =
        0;

    rotationVelocityY =
        0;

    rotationVelocityZ =
        0;

    clearHoveredOrbiter();

    mouse.set(
        2,
        2
    );

    canvas.style.cursor =
        "grab";

    canvas.hidden =
        true;

    if (clock.running) {
        clock.stop();
    }

    if (
        animationFrameId !==
        null
    ) {
        window.cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId =
            null;
    }
}


/* ===========================
   36. 当前状态
=========================== */

export function isWorldviewCoreActive() {
    return active;
}


/* ===========================
   37. 世界观核心上下文
=========================== */

export function getWorldviewCoreContext() {
    if (!initialized) {
        return null;
    }

    return {
        canvas,
        container,
        scene,
        camera,
        renderer,
        clock,
        observationRoot,
        coreRoot,
        orbitRoot,

        orbiters:
            orbiters.map(
                item =>
                    item.group
            ),

        getHoveredOrbiter() {
            return hoveredOrbiter;
        },

        createMaterial() {
            return window.material
                ? window.material
                    .clone()
                : new THREE
                    .MeshStandardMaterial({
                        color:
                            "#888888",

                        opacity:
                            1,

                        transparent:
                            true
                    });
        },

        createTextSprite:
            makeTextSprite
    };
}


/* ===========================
   38. 恢复世界观 Core
=========================== */

function restoreWorldviewCoreAfterReturn() {
    let attempts =
        0;

    const maximumAttempts =
        20;

    function tryRestore() {
        attempts +=
            1;

        const section =
            document.getElementById(
                "worldview-section"
            );

        if (!section) {
            return;
        }

        const rect =
            section.getBoundingClientRect();

        const visible =
            section.classList.contains(
                "is-active"
            ) ||
            section.classList.contains(
                "slide-enter-left"
            ) ||
            section.classList.contains(
                "slide-enter-right"
            ) ||
            section.classList.contains(
                "depth-enter"
            );

        if (
            visible &&
            rect.width >
                0 &&
            rect.height >
                0
        ) {
            showWorldviewCore();
            return;
        }

        if (
            attempts <
            maximumAttempts
        ) {
            window.requestAnimationFrame(
                tryRestore
            );
        }
    }

    window.requestAnimationFrame(
        tryRestore
    );
}


/* ===========================
   39. 从独立区块返回世界观
=========================== */

window.addEventListener(
    "before-back-to-parent",
    event => {
        if (
            event.detail?.to !==
            "worldview-section"
        ) {
            return;
        }

        restoreWorldviewCoreAfterReturn();
    }
);
