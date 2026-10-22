/* ===========================
   1. 全局设置
=========================== */

/* 全局动画速度倍率 */
window.globalSpeedMultiplier = 1;


/* ===========================
   2. Three.js 场景
=========================== */

/* 方块集合 */
const cubes = [];
// 拖拽惯性独立于方块原始随机运动，捕获、重抓及回收时只清理这层附加速度。
const backgroundCubeThrows = new Map();
const thrownBackgroundCubes = new Set();
const BACKGROUND_THROW_DAMPING = 3.8;

/* 3D悬赏令集合 */
const bountyPosterObjects = [];

/* 固定随机抽取数量 */
const BOUNTY_POSTER_COUNT = 4;

/* 整体淡入淡出速度 */
const BOUNTY_POSTER_FADE_SPEED = 0.018;

/* 当前整体透明度 */
let bountyPosterOpacity = 0;

/* 目标整体透明度 */
let bountyPosterTargetOpacity = 0;

/* 是否已经初始化悬赏令 */
let bountyPostersInitialized = false;

/* 是否需要继续更新悬赏令 */
let bountyPostersActive = false;

/* 获取背景画布 */
const backgroundCanvas =
    document.getElementById(
        "background-3d"
    );

/*
 * 两层仍共用一个 WebGL 渲染器和一套方块数据。
 * 先渲染前景并复制到透明 2D 画布，再把原画布留给底层；
 * 不另建 GPU 上下文，也不会将方块数量或动画循环翻倍。
 */
const BACKGROUND_CUBE_LAYER = 0;
const FOREGROUND_CUBE_LAYER = 1;
const foregroundCanvas = document.createElement("canvas");
foregroundCanvas.id = "background-3d-foreground";
foregroundCanvas.setAttribute("aria-hidden", "true");
backgroundCanvas.setAttribute("aria-hidden", "true");
const foregroundContext = foregroundCanvas.getContext("2d", { alpha: true });
foregroundCanvas.hidden = !foregroundContext;
document.body.appendChild(foregroundCanvas);

/* 创建场景 */
const scene =
    new THREE.Scene();

/* 3D悬赏令背景组 */
const bountyPosterGroup =
    new THREE.Group();

bountyPosterGroup.visible = false;

scene.add(
    bountyPosterGroup
);

/* 创建透视相机 */
const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth /
            window.innerHeight,
        0.1,
        1000
    );

camera.position.z = 100;

/* 创建渲染器 */
const renderer =
    new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: backgroundCanvas
    });

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        1.5
    )
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

function resizeForegroundCanvas() {
    if (!foregroundContext) return;
    if (foregroundCanvas.width !== backgroundCanvas.width) {
        foregroundCanvas.width = backgroundCanvas.width;
    }
    if (foregroundCanvas.height !== backgroundCanvas.height) {
        foregroundCanvas.height = backgroundCanvas.height;
    }
}

resizeForegroundCanvas();

backgroundCanvas.addEventListener("webglcontextlost", () => {
    foregroundContext?.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height);
});


/* ===========================
   3. Three.js 灯光
=========================== */

/* 平行光 */
const directionalLight =
    new THREE.DirectionalLight(
        0xEEEEEE,
        1
    );

directionalLight.position
    .set(5, 5, 5)
    .normalize();

directionalLight.layers.enable(FOREGROUND_CUBE_LAYER);

scene.add(
    directionalLight
);

/* 环境光 */
const ambientLight =
    new THREE.AmbientLight(
        0x404040
    );

ambientLight.layers.enable(FOREGROUND_CUBE_LAYER);

scene.add(
    ambientLight
);


/* ===========================
   4. 方块材质与几何体
=========================== */

/* 方块几何体 */
const cubeGeometry =
    new THREE.BoxGeometry();

/*
 * 保留为全局属性，
 * 供其他脚本修改方块材质。
 */
window.material =
    new THREE.MeshStandardMaterial({
        color: "#888888",
        opacity: 1,
        transparent: true
    });


/* ===========================
   5. 创建与重置方块
=========================== */

/**
 * 为方块生成随机尺寸、位置和运动参数。
 *
 * 新方块和飞出画面的方块都会调用此函数。
 *
 * @param {THREE.Mesh} cube 方块对象
 */
function resetCube(
    cube
) {
    backgroundCubeThrows.delete(cube);
    thrownBackgroundCubes.delete(cube);
    const size =
        Math.random() * 10 + 3;

    cube.scale.set(
        size,
        size,
        size
    );

    /*
     * 将方块重新放置到画面的右上方区域。
     *
     * 保持原有createCube中的生成范围，
     * 避免优化后改变方块密度和视觉效果。
     */
    cube.position.set(
        window.innerWidth / 2 +
            Math.random() *
            window.innerWidth,

        window.innerHeight / 2 +
            Math.random() *
            window.innerHeight,

        (
            Math.random() -
            0.5
        ) * 100
    );

    /*
     * 重置方块旋转角度，
     * 防止同一个方块长期积累极大的旋转数值。
     */
    cube.rotation.set(
        Math.random() *
            Math.PI *
            2,

        Math.random() *
            Math.PI *
            2,

        Math.random() *
            Math.PI *
            2
    );

    /*
     * 重新随机生成运动和交互状态。
     */
    cube.userData.draggable =
        false;

    cube.userData.isDragging =
        false;

    cube.userData.rotationSpeedX =
        Math.random() *
        0.01 -
        0.005;

    cube.userData.rotationSpeedY =
        Math.random() *
        0.01 -
        0.005;

    cube.userData.speedX =
        Math.random() *
        0.2 +
        0.03;

    cube.userData.speedY =
        Math.random() *
        0.2 +
        0.03;
}

/**
 * 创建一个新的背景方块。
 *
 * 方块只会在网站初始化时创建。
 * 动画运行期间不再销毁和重新创建。
 */
function createCube() {
    const cube =
        new THREE.Mesh(
            cubeGeometry,
            window.material
        );

    /*
     * 先建立userData对象，
     * 再由resetCube填写具体状态。
     */
    cube.userData = {
        draggable: false,
        isDragging: false,
        rotationSpeedX: 0,
        rotationSpeedY: 0,
        speedX: 0,
        speedY: 0
    };

    resetCube(
        cube
    );

    /* 每四个固定分出一个前景方块；重生时保持所属层，随机运动逻辑不变。 */
    cube.layers.set(
        cubes.length % 4 === 3
            ? FOREGROUND_CUBE_LAYER
            : BACKGROUND_CUBE_LAYER
    );

    scene.add(
        cube
    );

    cubes.push(
        cube
    );
}


/* ===========================
   6. 初始化方块
=========================== */

/* 初始方块数量 */
const initialCubeCount = 640;

for (
    let index = 0;
    index < initialCubeCount;
    index += 1
) {
    createCube();
}

/* 只读数量标记，方便验证 480 / 160，而不是重复建立两套方块。 */
backgroundCanvas.dataset.cubeCount = String(
    foregroundContext ? initialCubeCount * 0.75 : initialCubeCount
);
backgroundCanvas.dataset.totalCubeCount = String(initialCubeCount);
foregroundCanvas.dataset.cubeCount = String(
    foregroundContext ? initialCubeCount * 0.25 : 0
);

/*
 * 世界观借用的是这 640 个现有方块，而不是另一批随机副本。
 * native position / quaternion / scale 与 userData 留在原对象上；
 * 过渡只覆盖局部矩阵；原地归还时接续当前位置 / 朝向，保留随机尺寸和速率。
 */
const capturedBackgroundCubes = new Map();
let backgroundCubeDrag = null;
let activeBackgroundLease = null;
const activeBackgroundLeases = new Set();
let backgroundLeaseSequence = 0;
let backgroundFrameSeconds = 1 / 60;
let previousBackgroundFrameAt = null;

const clampCaptureUnit = value => Math.max(0, Math.min(1, value));
const frozenCaptureArray = values => Object.freeze(Array.from(values));

function backgroundLeaseSnapshot(lease) {
    return Object.freeze({
        id: lease.id,
        active: lease.active,
        count: lease.records.length,
        entries: Object.freeze(lease.records.map(record => Object.freeze({
            id: record.id,
            rank: record.rank,
            distance: record.distance,
            originalLayer: record.originalLayer,
            originalLayerMask: record.originalLayerMask,
            layerMask: record.mesh.layers.mask,
            originalRandom: Object.freeze({ ...record.originalRandom }),
            currentRandom: Object.freeze({ ...record.mesh.userData }),
            originalPosition: frozenCaptureArray(record.sourcePosition.toArray()),
            homePosition: frozenCaptureArray(record.mesh.position.toArray()),
            originalQuaternion: frozenCaptureArray(record.sourceQuaternion.toArray()),
            homeQuaternion: frozenCaptureArray(record.mesh.quaternion.toArray()),
            originalScale: frozenCaptureArray(record.sourceScale.toArray()),
            homeScale: frozenCaptureArray(record.mesh.scale.toArray()),
            matrix: frozenCaptureArray(record.mesh.matrix.elements),
            opacity: record.opacity,
            frontMix: record.frontMix,
            visible: record.visible
        })))
    });
}

function claimNearestBackgroundCubes({ x, y, count = 7, group = null, ids = null, maxDistance = Infinity } = {}) {
    if (activeBackgroundLease && (!group || activeBackgroundLease.group !== group)) return null;
    const requestedCount = Math.min(cubes.length, Math.max(0, Math.floor(Number(count) || 0)));
    if (!requestedCount) return null;
    const rect = backgroundCanvas.getBoundingClientRect();
    const centerX = Number.isFinite(x) ? x : rect.left + rect.width / 2;
    const centerY = Number.isFinite(y) ? y : rect.top + rect.height / 2;
    camera.updateMatrixWorld(true);
    const projected = new THREE.Vector3();
    const ranked = cubes.map((mesh, index) => {
        if (capturedBackgroundCubes.has(mesh) || backgroundCubeDrag?.mesh === mesh || (ids && !ids.includes(index))) return null;
        projected.copy(mesh.position).project(camera);
        const screenX = rect.left + (projected.x + 1) * rect.width / 2;
        const screenY = rect.top + (1 - projected.y) * rect.height / 2;
        return { mesh, index, distance: Math.hypot(screenX - centerX, screenY - centerY) };
    }).filter(item => item && item.distance <= maxDistance).sort((a, b) => a.distance - b.distance || a.index - b.index);
    if (!ranked.length) return null;
    const lease = { id: ++backgroundLeaseSequence, group, active: true, records: [] };
    lease.records = ranked.slice(0, requestedCount).map(({ mesh, index, distance }, rank) => {
        backgroundCubeThrows.delete(mesh);
        thrownBackgroundCubes.delete(mesh);
        mesh.updateMatrix();
        const material = mesh.material.clone();
        material.transparent = true;
        // 半透明交接不应以不可见的深度挡住其他背景方块。
        material.depthWrite = false;
        const record = {
            id: index, rank, distance, mesh,
            originalMaterial: mesh.material,
            material,
            originalLayer: mesh.layers.mask & (1 << FOREGROUND_CUBE_LAYER) ? FOREGROUND_CUBE_LAYER : BACKGROUND_CUBE_LAYER,
            originalLayerMask: mesh.layers.mask,
            originalMatrixAutoUpdate: mesh.matrixAutoUpdate,
            originalVisible: mesh.visible,
            originalRandom: Object.freeze({ ...mesh.userData }),
            sourcePosition: mesh.position.clone(),
            sourceQuaternion: mesh.quaternion.clone(),
            sourceScale: mesh.scale.clone(),
            sourceMatrix: mesh.matrix.clone(),
            opacity: 1, frontMix: 0, visible: mesh.visible
        };
        mesh.material = material;
        mesh.matrixAutoUpdate = false;
        if (record.originalLayer === BACKGROUND_CUBE_LAYER) mesh.layers.enable(FOREGROUND_CUBE_LAYER);
        capturedBackgroundCubes.set(mesh, record);
        return record;
    });
    activeBackgroundLeases.add(lease);
    activeBackgroundLease ||= lease;
    const entries = Object.freeze(lease.records.map(record => Object.freeze({
        id: record.id,
        mesh: record.mesh,
        originalLayer: record.originalLayer,
        originalLayerMask: record.originalLayerMask,
        distance: record.distance,
        originalRandom: record.originalRandom,
        sourcePosition: record.sourcePosition.clone(),
        sourceQuaternion: record.sourceQuaternion.clone(),
        sourceScale: record.sourceScale.clone(),
        sourceMatrix: record.sourceMatrix.clone()
    })));
    return Object.freeze({
        id: lease.id,
        entries,
        camera,
        canvas: backgroundCanvas,
        setPose(index, { matrix, opacity = 1, frontMix = 1, visible = true } = {}) {
            const record = lease.records[index];
            if (!lease.active || !record) return false;
            if (matrix) {
                if (!matrix.isMatrix4 || !matrix.elements.every(Number.isFinite)) return false;
                record.mesh.matrix.copy(matrix);
                record.mesh.matrixWorldNeedsUpdate = true;
            }
            record.opacity = clampCaptureUnit(Number.isFinite(opacity) ? opacity : 1);
            record.frontMix = clampCaptureUnit(Number.isFinite(frontMix) ? frontMix : 1);
            record.visible = Boolean(visible);
            record.mesh.visible = record.visible;
            return true;
        },
        getHomeMatrix(index, target = new THREE.Matrix4()) {
            const record = lease.records[index];
            return record ? target.compose(record.mesh.position, record.mesh.quaternion, record.mesh.scale) : null;
        },
        getFrameSeconds() { return backgroundFrameSeconds; },
        present() {
            // 两个画布交接时同帧补绘；不推进漂浮状态，也不另建 RAF / renderer。
            if (!lease.active || document.hidden) return false;
            renderBackgroundLayers();
            return true;
        },
        release({ atCurrent = false } = {}) {
            if (!lease.active) return;
            lease.active = false;
            for (const record of lease.records) {
                const mesh = record.mesh;
                if (atCurrent) {
                    // 接管当前姿态而非回到捕获前的位置。尺寸与运动随机值不重设；
                    // 动画桥已将末帧还原为原尺寸的 native TRS，不丢失 affine 残差。
                    const currentScale = new THREE.Vector3();
                    mesh.matrix.decompose(mesh.position, mesh.quaternion, currentScale);
                    mesh.quaternion.normalize();
                }
                mesh.material = record.originalMaterial;
                mesh.layers.mask = record.originalLayerMask;
                mesh.visible = record.originalVisible;
                mesh.matrixAutoUpdate = record.originalMatrixAutoUpdate;
                mesh.updateMatrix();
                capturedBackgroundCubes.delete(mesh);
                record.material.dispose();
            }
            activeBackgroundLeases.delete(lease);
            if (activeBackgroundLease === lease) activeBackgroundLease = activeBackgroundLeases.values().next().value || null;
        },
        getState() { return backgroundLeaseSnapshot(lease); }
    });
}

/* 仅返回当前借用记录的只读快照，不泄露整个可变背景数组。 */
window.NewHorizonBackgroundCubes = Object.freeze({
    claimNearest: claimNearestBackgroundCubes,
    findNearby({ left, top, right, bottom, margin = 64 }) {
        const rect = backgroundCanvas.getBoundingClientRect();
        camera.updateMatrixWorld(true);
        const point = new THREE.Vector3();
        let best = null;
        cubes.forEach((mesh, id) => {
            if (capturedBackgroundCubes.has(mesh) || backgroundCubeDrag?.mesh === mesh) return;
            point.copy(mesh.position).project(camera);
            if (point.z < -1 || point.z > 1) return;
            const x = rect.left + (point.x + 1) * rect.width / 2;
            const y = rect.top + (1 - point.y) * rect.height / 2;
            if (x < Math.max(-20, left - margin) || x > Math.min(innerWidth + 20, right + margin)
                || y < Math.max(-20, top - margin) || y > Math.min(innerHeight + 20, bottom + margin)) return;
            const distance = Math.hypot(x - (left + right) / 2, y - (top + bottom) / 2);
            if (!best || distance < best.distance) best = { id, screen: { x, y }, distance };
        });
        return best;
    },
    present() {
        if (!document.hidden) renderBackgroundLayers();
    },
    getState(options = {}) {
        const state = {
            totalCount: cubes.length,
            backgroundCount: cubes.filter(mesh => capturedBackgroundCubes.get(mesh)?.originalLayer === BACKGROUND_CUBE_LAYER ||
                (!capturedBackgroundCubes.has(mesh) && (mesh.layers.mask & (1 << BACKGROUND_CUBE_LAYER)) !== 0)).length,
            foregroundCount: cubes.filter(mesh => capturedBackgroundCubes.get(mesh)?.originalLayer === FOREGROUND_CUBE_LAYER ||
                (!capturedBackgroundCubes.has(mesh) && (mesh.layers.mask & (1 << FOREGROUND_CUBE_LAYER)) !== 0)).length,
            claimedCount: capturedBackgroundCubes.size,
            leaseCount: activeBackgroundLeases.size,
            throwCount: backgroundCubeThrows.size,
            throws: Object.freeze(Array.from(backgroundCubeThrows, ([mesh, motion]) => Object.freeze({
                id: cubes.indexOf(mesh),
                velocity: frozenCaptureArray([motion.x, motion.y]),
                screenVelocity: frozenCaptureArray([motion.x / motion.worldPerPixel, -motion.y / motion.worldPerPixel]),
                acceleration: frozenCaptureArray(motion.acceleration)
            }))),
            lease: activeBackgroundLease ? backgroundLeaseSnapshot(activeBackgroundLease) : null,
            drag: backgroundCubeDrag ? Object.freeze({
                id: backgroundCubeDrag.id,
                pointerType: backgroundCubeDrag.pointerType,
                moved: backgroundCubeDrag.moved,
                screen: Object.freeze({ x: backgroundCubeDrag.clientX, y: backgroundCubeDrag.clientY })
            }) : null
        };
        // 完整候选测量只供显式校验；常规快照不复制 640 个方块数据。
        if (options?.candidates) {
            const rect = backgroundCanvas.getBoundingClientRect();
            const center = options.center || options;
            const x = Number.isFinite(center.x) ? center.x : rect.left + rect.width / 2;
            const y = Number.isFinite(center.y) ? center.y : rect.top + rect.height / 2;
            const projected = new THREE.Vector3();
            camera.updateMatrixWorld(true);
            state.center = Object.freeze({ x, y });
            state.candidates = Object.freeze(cubes.map((mesh, id) => {
                // 不读取已覆盖的 matrixWorld，保持与捕获排序的 native 位姿一致。
                projected.copy(mesh.position).project(camera);
                const screenX = rect.left + (projected.x + 1) * rect.width / 2;
                const screenY = rect.top + (1 - projected.y) * rect.height / 2;
                const record = capturedBackgroundCubes.get(mesh);
                return Object.freeze({
                    id,
                    position: frozenCaptureArray(mesh.position.toArray()),
                    rotation: frozenCaptureArray(mesh.rotation.toArray().slice(0, 3)),
                    scale: frozenCaptureArray(mesh.scale.toArray()),
                    claimed: Boolean(record),
                    dragging: backgroundCubeDrag?.mesh === mesh,
                    throwVelocity: backgroundCubeThrows.has(mesh)
                        ? frozenCaptureArray([backgroundCubeThrows.get(mesh).x, backgroundCubeThrows.get(mesh).y]) : null,
                    screen: Object.freeze({ x: screenX, y: screenY }),
                    distance: Math.hypot(screenX - x, screenY - y),
                    originalLayer: record ? record.originalLayer :
                        mesh.layers.mask & (1 << FOREGROUND_CUBE_LAYER) ? FOREGROUND_CUBE_LAYER : BACKGROUND_CUBE_LAYER,
                    random: Object.freeze({ ...mesh.userData })
                });
            }));
        }
        return Object.freeze(state);
    }
});

function prepareCapturedBackgroundLayer(layer) {
    for (const record of capturedBackgroundCubes.values()) {
        if (record.originalMaterial.color) record.material.color.copy(record.originalMaterial.color);
        const layerOpacity = !foregroundContext || record.originalLayer === FOREGROUND_CUBE_LAYER
            ? 1 : layer === FOREGROUND_CUBE_LAYER ? record.frontMix : 1 - record.frontMix;
        record.material.opacity = record.opacity * layerOpacity * record.originalMaterial.opacity;
        record.mesh.visible = record.visible && record.material.opacity > 0.0001;
    }
}


/* ===========================
   7. 3D悬赏令基础工具
=========================== */

/* 悬赏令纹理加载器 */
const bountyTextureLoader =
    new THREE.TextureLoader();

/**
 * 返回指定范围内的随机数。
 *
 * @param {number} minimum 最小值
 * @param {number} maximum 最大值
 * @returns {number} 随机数
 */
function randomBetween(
    minimum,
    maximum
) {
    return (
        Math.random() *
        (
            maximum -
            minimum
        ) +
        minimum
    );
}

/**
 * 将数值限制在指定范围。
 *
 * @param {number} value 当前值
 * @param {number} minimum 最小值
 * @param {number} maximum 最大值
 * @returns {number} 限制后的数值
 */
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

/**
 * 打乱数组。
 *
 * @param {Array} originalArray 原始数组
 * @returns {Array} 打乱后的数组
 */
function shuffleArray(
    originalArray
) {
    const shuffledArray =
        [...originalArray];

    for (
        let index =
            shuffledArray.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex =
            Math.floor(
                Math.random() *
                (index + 1)
            );

        [
            shuffledArray[index],
            shuffledArray[randomIndex]
        ] = [
            shuffledArray[randomIndex],
            shuffledArray[index]
        ];
    }

    return shuffledArray;
}

/**
 * 获取当前相机可见区域尺寸。
 *
 * @returns {{width: number, height: number}}
 */
function getVisibleWorldSize() {
    const cameraDistance =
        Math.abs(
            camera.position.z
        );

    const verticalFieldOfView =
        THREE.MathUtils.degToRad(
            camera.fov
        );

    const visibleHeight =
        2 *
        Math.tan(
            verticalFieldOfView / 2
        ) *
        cameraDistance;

    const visibleWidth =
        visibleHeight *
        camera.aspect;

    return {
        height: visibleHeight,
        width: visibleWidth
    };
}

/**
 * 获取页面中的悬赏令图片地址。
 *
 * @returns {string[]} 图片地址数组
 */
function getBountyPosterSources() {
    const posterElements =
        document.querySelectorAll(
            ".wanted-poster"
        );

    const sourceSet =
        new Set();

    posterElements.forEach(
        posterElement => {
            const source =
                posterElement.currentSrc ||
                posterElement.src;

            if (source) {
                sourceSet.add(source);
            }
        }
    );

    return Array.from(
        sourceSet
    );
}


/* ===========================
   8. 悬赏令纹理处理
=========================== */

/*
 * 三档景深模糊。
 *
 * far：远景模糊
 * middle：中景模糊
 * near：近景虚焦
 */
const BOUNTY_POSTER_BLUR_LEVELS = {
    far: 0,
    middle: 0,
    near: 0
};

/*
 * 景深范围。
 *
 * 相机位于 z = 100。
 * 数值越大，物体越靠近相机。
 */
const BOUNTY_POSTER_DEPTH = {
    farBoundary: -30,
    nearBoundary: 10,
    minimumZ: -65,
    maximumZ: 32
};

/**
 * 将图片绘制为带有高斯模糊的纹理。
 *
 * @param {THREE.Texture} sourceTexture 原始纹理
 * @param {number} blurAmount 模糊像素
 * @returns {THREE.Texture} 处理后的纹理
 */
function createBlurredPosterTexture(
    sourceTexture,
    blurAmount
) {
    /*
     * 模糊为0时直接使用原始纹理，
     * 避免无意义地创建Canvas。
     */
    if (blurAmount <= 0) {
        return sourceTexture;
    }

    const sourceImage =
        sourceTexture.image;

    const imageWidth =
        sourceImage.naturalWidth ||
        sourceImage.videoWidth ||
        sourceImage.width ||
        1;

    const imageHeight =
        sourceImage.naturalHeight ||
        sourceImage.videoHeight ||
        sourceImage.height ||
        1;

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width = imageWidth;
    canvas.height = imageHeight;

    const context =
        canvas.getContext("2d");

    if (!context) {
        return sourceTexture;
    }

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.save();

    context.filter =
        `blur(${blurAmount}px)`;

    /*
     * 向四周扩大绘制范围，
     * 防止模糊边缘被Canvas截断。
     */
    const edgeExpansion =
        Math.ceil(
            blurAmount * 2
        );

    context.drawImage(
        sourceImage,
        -edgeExpansion,
        -edgeExpansion,
        canvas.width +
            edgeExpansion * 2,
        canvas.height +
            edgeExpansion * 2
    );

    context.restore();

    const blurredTexture =
        new THREE.CanvasTexture(
            canvas
        );

    blurredTexture.encoding =
        THREE.sRGBEncoding;

    blurredTexture.minFilter =
        THREE.LinearFilter;

    blurredTexture.magFilter =
        THREE.LinearFilter;

    blurredTexture.generateMipmaps =
        true;

    blurredTexture.needsUpdate =
        true;

    return blurredTexture;
}

/**
 * 为一张悬赏令生成三档景深纹理。
 *
 * @param {THREE.Texture} sourceTexture 原始纹理
 * @returns {{
 *     far: THREE.Texture,
 *     middle: THREE.Texture,
 *     near: THREE.Texture
 * }}
 */
function createPosterDepthTextures(
    sourceTexture
) {
    return {
        far:
            createBlurredPosterTexture(
                sourceTexture,
                BOUNTY_POSTER_BLUR_LEVELS.far
            ),

        middle:
            createBlurredPosterTexture(
                sourceTexture,
                BOUNTY_POSTER_BLUR_LEVELS.middle
            ),

        near:
            createBlurredPosterTexture(
                sourceTexture,
                BOUNTY_POSTER_BLUR_LEVELS.near
            )
    };
}


/* ===========================
   9. 创建3D悬赏令
=========================== */

/**
 * 设置悬赏令正反面的透明度。
 *
 * @param {THREE.Group} poster 悬赏令对象
 * @param {number} opacity 当前透明度
 */
function setBountyPosterOpacity(
    poster,
    opacity
) {
    const finalOpacity =
        clamp(
            opacity,
            0,
            0.125
        );

    poster.userData.frontMaterial.opacity =
        finalOpacity;

    poster.userData.backMaterial.opacity =
        finalOpacity;
}

/**
 * 根据悬赏令深度切换模糊纹理。
 *
 * @param {THREE.Group} poster 悬赏令对象
 */
function updatePosterDepthBlur(
    poster
) {
    const data =
        poster.userData;

    const positionZ =
        poster.position.z;

    let targetTexture =
        data.depthTextures.middle;

    /*
     * 靠近相机时虚焦更明显。
     */
    if (
        positionZ >=
        BOUNTY_POSTER_DEPTH.nearBoundary
    ) {
        targetTexture =
            data.depthTextures.near;
    }

    /*
     * 距离相机较远时轻微模糊。
     */
    else if (
        positionZ <=
        BOUNTY_POSTER_DEPTH.farBoundary
    ) {
        targetTexture =
            data.depthTextures.far;
    }

    if (
        data.frontMaterial.map ===
        targetTexture
    ) {
        return;
    }

    data.frontMaterial.map =
        targetTexture;

    data.frontMaterial.needsUpdate =
        true;
}

/**
 * 根据深度调整悬赏令尺寸。
 *
 * 靠近相机时更大，
 * 远离相机时更小。
 *
 * @param {THREE.Group} poster 悬赏令对象
 */
function updatePosterDepthScale(
    poster
) {
    const depthScale =
        THREE.MathUtils.mapLinear(
            poster.position.z,

            BOUNTY_POSTER_DEPTH.minimumZ,
            BOUNTY_POSTER_DEPTH.maximumZ,

            0.78,
            1.28
        );

    const limitedDepthScale =
        clamp(
            depthScale,
            0.78,
            1.28
        );

    const finalScale =
        poster.userData.baseScale *
        limitedDepthScale;

    poster.scale.set(
        finalScale,
        finalScale,
        finalScale
    );
}

/**
 * 重置悬赏令的位置和运动数据。
 *
 * @param {THREE.Group} poster 悬赏令对象
 * @param {boolean} distributeVertically 是否分布在整个画面
 */
function resetBountyPoster(
    poster,
    distributeVertically = false
) {
    const visibleWorldSize =
        getVisibleWorldSize();

    const halfWidth =
        visibleWorldSize.width / 2;

    const halfHeight =
        visibleWorldSize.height / 2;

    /*
     * 首次创建时分布在整个屏幕，
     * 后续重生时从屏幕顶部进入。
     */
    const positionY =
        distributeVertically
            ? randomBetween(
                -halfHeight * 1.15,
                halfHeight * 1.15
            )
            : randomBetween(
                halfHeight + 20,
                halfHeight + 65
            );

    poster.position.set(
        randomBetween(
            -halfWidth * 1.05,
            halfWidth * 1.05
        ),

        positionY,

        randomBetween(
            BOUNTY_POSTER_DEPTH.minimumZ,
            BOUNTY_POSTER_DEPTH.maximumZ
        )
    );

    poster.rotation.set(
        randomBetween(
            -Math.PI * 0.3,
            Math.PI * 0.3
        ),

        randomBetween(
            -Math.PI,
            Math.PI
        ),

        randomBetween(
            -Math.PI * 0.35,
            Math.PI * 0.35
        )
    );

    /*
     * 每张图片本身的随机尺寸。
     *
     * 这里控制各图片之间的大小差异。
     */
    poster.userData.baseScale =
        randomBetween(
            0.9,
            1.12
        );

    /*
     * 基础移动速度。
     */
    poster.userData.velocityX =
        randomBetween(
            -0.028,
            0.028
        );

    poster.userData.velocityY =
        randomBetween(
            -0.095,
            -0.045
        );

    poster.userData.velocityZ =
        randomBetween(
            -0.012,
            0.012
        );

    /*
     * 三轴旋转速度。
     */
    poster.userData.angularVelocityX =
        randomBetween(
            -0.001,
            0.001
        );

    poster.userData.angularVelocityY =
        randomBetween(
            -0.0025,
            0.0025
        );

    poster.userData.angularVelocityZ =
        randomBetween(
            -0.0008,
            0.0008
        );

    /*
     * 空气扰动的随机相位。
     */
    poster.userData.airPhaseX =
        Math.random() *
        Math.PI *
        2;

    poster.userData.airPhaseY =
        Math.random() *
        Math.PI *
        2;

    poster.userData.airPhaseZ =
        Math.random() *
        Math.PI *
        2;

    /*
     * 空气扰动频率。
     */
    poster.userData.airFrequencyX =
        randomBetween(
            0.35,
            0.85
        );

    poster.userData.airFrequencyY =
        randomBetween(
            0.22,
            0.58
        );

    poster.userData.airFrequencyZ =
        randomBetween(
            0.28,
            0.72
        );

    /*
     * 空气扰动幅度。
     */
    poster.userData.airStrengthX =
        randomBetween(
            0.012,
            0.04
        );

    poster.userData.airStrengthY =
        randomBetween(
            0.002,
            0.012
        );

    poster.userData.airStrengthZ =
        randomBetween(
            0.006,
            0.025
        );

    /*
     * 单张图片的生命周期。
     */
    poster.userData.life =
        distributeVertically
            ? randomBetween(
                0.12,
                0.78
            )
            : 0;

    poster.userData.lifeSpeed =
        randomBetween(
            0.00045,
            0.00082
        );

    /*
     * 单张图片的最高透明度。
     */
    poster.userData.maximumOpacity =
        randomBetween(
            0.42,
            0.72
        );

    updatePosterDepthScale(
        poster
    );

    updatePosterDepthBlur(
        poster
    );

    setBountyPosterOpacity(
        poster,
        0
    );
}

/**
 * 根据正面纹理创建一张3D悬赏令。
 *
 * @param {THREE.Texture} frontTexture 正面纹理
 */
function createBountyPoster(
    frontTexture
) {
    const textureImage =
        frontTexture.image;

    const imageWidth =
        textureImage.naturalWidth ||
        textureImage.width ||
        1;

    const imageHeight =
        textureImage.naturalHeight ||
        textureImage.height ||
        1;

    const aspectRatio =
        imageWidth /
        imageHeight;

    /*
     * 飘落图的基础尺寸。
     *
     * 要调整所有悬赏令的大小，
     * 主要修改这里的两个数值。
     */
    const posterHeight =
        randomBetween(
            128,
            256
        );

    const posterWidth =
        posterHeight *
        aspectRatio;

    const posterGeometry =
        new THREE.PlaneGeometry(
            posterWidth,
            posterHeight,
            1,
            1
        );

    /*
     * 为正面生成近、中、远三档纹理。
     */
    const depthTextures =
        createPosterDepthTextures(
            frontTexture
        );

    /*
     * 正面材质。
     * 默认使用中景纹理。
     */
    const frontMaterial =
        new THREE.MeshBasicMaterial({
            depthWrite: false,
            map: depthTextures.middle,
            opacity: 0,
            side: THREE.FrontSide,
            transparent: true
        });

    /*
     * 背面材质。
     * 直接使用纯色#888888。
     */
    const backMaterial =
        new THREE.MeshBasicMaterial({
            color: "#444444",
            depthWrite: false,
            opacity: 0,
            side: THREE.FrontSide,
            transparent: true
        });

    /*
     * 正面网格。
     */
    const frontMesh =
        new THREE.Mesh(
            posterGeometry,
            frontMaterial
        );

    frontMesh.position.z =
        0.02;

    /*
     * 背面网格。
     */
    const backMesh =
        new THREE.Mesh(
            posterGeometry,
            backMaterial
        );

    backMesh.position.z =
        -0.02;

    backMesh.rotation.y =
        Math.PI;

    /*
     * 使用Group统一控制正反面。
     */
    const poster =
        new THREE.Group();

    poster.add(
        frontMesh
    );

    poster.add(
        backMesh
    );

    /*
     * 保存动画需要使用的数据。
     */
    poster.userData.frontMaterial =
        frontMaterial;

    poster.userData.backMaterial =
        backMaterial;

    poster.userData.depthTextures =
        depthTextures;

    resetBountyPoster(
        poster,
        true
    );

    bountyPosterGroup.add(
        poster
    );

    bountyPosterObjects.push(
        poster
    );
}


/* ===========================
   10. 初始化3D悬赏令
=========================== */

/**
 * 随机抽取固定数量的悬赏令。
 */
function initializeBountyPosters() {
    if (bountyPostersInitialized) {
        return;
    }

    bountyPostersInitialized = true;

    const allSources =
        getBountyPosterSources();

    if (allSources.length === 0) {
        console.warn(
            "页面中没有找到 .wanted-poster 图片。"
        );

        return;
    }

    const selectedSources =
        shuffleArray(
            allSources
        ).slice(
            0,
            Math.min(
                BOUNTY_POSTER_COUNT,
                allSources.length
            )
        );

    selectedSources.forEach(
        source => {
            bountyTextureLoader.load(
                source,

                texture => {
                    texture.encoding =
                        THREE.sRGBEncoding;

                    texture.anisotropy =
                        Math.min(
                            2,
                            renderer
                                .capabilities
                                .getMaxAnisotropy()
                        );

                    texture.minFilter =
                        THREE.LinearFilter;

                    texture.magFilter =
                        THREE.LinearFilter;

                    createBountyPoster(
                        texture
                    );
                },

                undefined,

                error => {
                    console.error(
                        "3D悬赏令纹理加载失败：",
                        source,
                        error
                    );
                }
            );
        }
    );
}


/* ===========================
   11. 悬赏令显示状态
=========================== */

/**
 * 开启悬赏令背景。
 */
function startBountyPosterBackground() {
    initializeBountyPosters();

    bountyPostersActive = true;

    bountyPosterTargetOpacity = 1;

    bountyPosterGroup.visible = true;

    bountyPosterObjects.forEach(
        poster => {
            resetBountyPoster(
                poster,
                true
            );
        }
    );
}

/**
 * 关闭悬赏令背景。
 */
function stopBountyPosterBackground() {
    bountyPosterTargetOpacity = 0;

    /*
     * 保持更新，
     * 直到整体淡出完成。
     */
    bountyPostersActive = true;
}

window.startBountyPosterBackground =
    startBountyPosterBackground;

window.stopBountyPosterBackground =
    stopBountyPosterBackground;


/* ===========================
   12. 悬赏令生命周期与动画
=========================== */

/**
 * 计算单张图片的生命周期透明度。
 *
 * 0.00～0.16：淡入
 * 0.16～0.76：保持
 * 0.76～1.00：淡出
 *
 * @param {number} life 生命周期
 * @returns {number} 当前透明度倍率
 */
function getPosterLifeOpacity(
    life
) {
    if (life < 0.16) {
        return life / 0.16;
    }

    if (life > 0.76) {
        return (
            1 -
            life
        ) / 0.24;
    }

    return 1;
}

/**
 * 更新整个悬赏令背景层的淡入淡出。
 */
function updateBountyPosterFade() {
    if (
        bountyPosterOpacity <
        bountyPosterTargetOpacity
    ) {
        bountyPosterOpacity =
            Math.min(
                bountyPosterTargetOpacity,

                bountyPosterOpacity +
                    BOUNTY_POSTER_FADE_SPEED
            );
    }

    else if (
        bountyPosterOpacity >
        bountyPosterTargetOpacity
    ) {
        bountyPosterOpacity =
            Math.max(
                bountyPosterTargetOpacity,

                bountyPosterOpacity -
                    BOUNTY_POSTER_FADE_SPEED
            );
    }

    if (
        bountyPosterTargetOpacity === 0 &&
        bountyPosterOpacity <= 0.001
    ) {
        bountyPosterOpacity = 0;

        bountyPosterGroup.visible =
            false;

        bountyPostersActive =
            false;
    }
}

/**
 * 更新全部3D悬赏令。
 *
 * @param {number} timestamp 动画时间戳
 */
function updateBountyPosters(
    timestamp
) {
    if (
        !bountyPostersActive &&
        bountyPosterOpacity <= 0
    ) {
        return;
    }

    updateBountyPosterFade();

    if (!bountyPosterGroup.visible) {
        return;
    }

    const elapsedSeconds =
        timestamp * 0.001;

    const visibleWorldSize =
        getVisibleWorldSize();

    const halfHeight =
        visibleWorldSize.height / 2;

    const speedMultiplier =
        window.globalSpeedMultiplier;

    bountyPosterObjects.forEach(
        poster => {
            const data =
                poster.userData;

            /*
             * 推进单张图片的生命周期。
             */
            data.life +=
                data.lifeSpeed *
                speedMultiplier;

            /*
             * 生命周期结束或落出屏幕后重置。
             */
            if (
                data.life >= 1 ||
                poster.position.y <
                    -halfHeight - 80
            ) {
                resetBountyPoster(
                    poster,
                    false
                );

                return;
            }

            /*
             * 基础位置移动。
             */
            poster.position.x +=
                data.velocityX *
                speedMultiplier;

            poster.position.y +=
                data.velocityY *
                speedMultiplier;

            poster.position.z +=
                data.velocityZ *
                speedMultiplier;

            /*
             * 模拟空气流动。
             */
            poster.position.x +=
                Math.sin(
                    elapsedSeconds *
                        data.airFrequencyX +
                        data.airPhaseX
                ) *
                data.airStrengthX *
                speedMultiplier;

            poster.position.y +=
                Math.sin(
                    elapsedSeconds *
                        data.airFrequencyY +
                        data.airPhaseY
                ) *
                data.airStrengthY *
                speedMultiplier;

            poster.position.z +=
                Math.cos(
                    elapsedSeconds *
                        data.airFrequencyZ +
                        data.airPhaseZ
                ) *
                data.airStrengthZ *
                speedMultiplier;

            /*
             * 三轴翻转。
             */
            poster.rotation.x +=
                data.angularVelocityX *
                speedMultiplier;

            poster.rotation.y +=
                data.angularVelocityY *
                speedMultiplier;

            poster.rotation.z +=
                data.angularVelocityZ *
                speedMultiplier;

            /*
             * 到达纵深边界后反向移动，
             * 防止物体无限远离或穿过相机。
             */
            if (
                poster.position.z <=
                    BOUNTY_POSTER_DEPTH.minimumZ ||
                poster.position.z >=
                    BOUNTY_POSTER_DEPTH.maximumZ
            ) {
                data.velocityZ *= -1;

                poster.position.z =
                    clamp(
                        poster.position.z,

                        BOUNTY_POSTER_DEPTH.minimumZ,
                        BOUNTY_POSTER_DEPTH.maximumZ
                    );
            }

            /*
             * 根据当前纵深调整虚焦和尺寸。
             */
            updatePosterDepthBlur(
                poster
            );

            updatePosterDepthScale(
                poster
            );

            /*
             * 计算最终透明度。
             */
            const lifeOpacity =
                getPosterLifeOpacity(
                    data.life
                );

            const finalOpacity =
                lifeOpacity *
                data.maximumOpacity *
                bountyPosterOpacity;

            setBountyPosterOpacity(
                poster,
                finalOpacity
            );
        }
    );
}


/* ===========================
   13. 页面可见状态
=========================== */

/*
 * 页面位于后台标签页时，
 * 暂停Three.js更新和渲染。
 */
let isPageVisible =
    !document.hidden;
let anotherWorldObscuresBackground = false;
window.addEventListener('another-world-visibility-change', event => {
    anotherWorldObscuresBackground = Boolean(event.detail?.hidden);
    if (anotherWorldObscuresBackground) finishBackgroundCubeDrag(true);
    previousBackgroundFrameAt = null;
});

/**
 * 监听页面显示状态。
 */
function handleVisibilityChange() {
    isPageVisible =
        !document.hidden;
    if (!isPageVisible) finishBackgroundCubeDrag(true);
}

document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
);


/* ===========================
   14. 方块与悬赏令动画
=========================== */

/**
 * 原画布最终只保留底层 75% 方块和悬赏令背景贴片。
 * 前景的 25% 在同一帧被复制到 body 末尾的 2D 画布，
 * 保持与底层完全相同的灯光、材质、速度和相机投影。
 */
function renderBackgroundLayers() {
    if (foregroundContext) {
        if (renderer.getContext().isContextLost()) return;
        prepareCapturedBackgroundLayer(FOREGROUND_CUBE_LAYER);
        camera.layers.set(FOREGROUND_CUBE_LAYER);
        renderer.render(scene, camera);
        foregroundContext.globalCompositeOperation = "copy";
        foregroundContext.drawImage(backgroundCanvas, 0, 0);
        prepareCapturedBackgroundLayer(BACKGROUND_CUBE_LAYER);
        camera.layers.set(BACKGROUND_CUBE_LAYER);
    } else {
        // 极少数不支持 2D 画布的环境保留所有方块，不让它们丢失。
        prepareCapturedBackgroundLayer(BACKGROUND_CUBE_LAYER);
        camera.layers.enableAll();
    }
    renderer.render(scene, camera);
}

/**
 * 更新并渲染背景。
 *
 * @param {number} timestamp 动画时间戳
 */
function animate(
    timestamp
) {
    requestAnimationFrame(
        animate
    );

    /*
     * 页面处于后台标签页时，
     * 保留动画循环，但不更新场景，也不执行渲染。
     *
     * 返回页面后会自动恢复，
     * 不会限制前台运行时的最高帧率。
     */
    if (!isPageVisible || anotherWorldObscuresBackground) {
        previousBackgroundFrameAt = null;
        return;
    }

    const backgroundFrameAt = Number.isFinite(timestamp) ? timestamp : performance.now();
    const throwFrameSeconds = previousBackgroundFrameAt === null ? 1 / 60
        : Math.min(1 / 20, Math.max(0, (backgroundFrameAt - previousBackgroundFrameAt) / 1000));
    if (previousBackgroundFrameAt !== null) {
        backgroundFrameSeconds = Math.min(1 / 20, Math.max(1 / 240,
            (backgroundFrameAt - previousBackgroundFrameAt) / 1000));
    }
    previousBackgroundFrameAt = backgroundFrameAt;

    const speedMultiplier =
        window.globalSpeedMultiplier;

    if (backgroundCubeDrag && backgroundInteractionBlocked()) finishBackgroundCubeDrag(true);

    /*
     * 方块不再从数组中删除，
     * 因此可以直接使用正序循环。
     */
    for (
        let index = 0;
        index < cubes.length;
        index += 1
    ) {
        const cube =
            cubes[index];

        if (capturedBackgroundCubes.has(cube)) continue;

        const isBeingDragged = backgroundCubeDrag?.mesh === cube;
        if (!isBeingDragged) {
            cube.position.x -= cube.userData.speedX * speedMultiplier;
            cube.position.y -= cube.userData.speedY * speedMultiplier;
            updateBackgroundCubeThrow(cube, throwFrameSeconds, speedMultiplier);
        }

        cube.rotation.x +=
            cube.userData
                .rotationSpeedX *
            speedMultiplier;

        cube.rotation.y +=
            cube.userData
                .rotationSpeedY *
            speedMultiplier;

        const isOutsideHorizontalBoundary =
            cube.position.x <
            -window.innerWidth / 2;

        const isOutsideVerticalBoundary =
            cube.position.y <
            -window.innerHeight / 2;

        /*
         * 飞出画面后直接重置原方块。
         *
         * 不再执行：
         * scene.remove()
         * cubes.splice()
         * createCube()
         */
        if (
            !isBeingDragged &&
            (thrownBackgroundCubes.has(cube) ? isThrownBackgroundCubeOutside(cube)
                : isOutsideHorizontalBoundary || isOutsideVerticalBoundary)
        ) {
            resetCube(
                cube
            );
        }
    }

    updateBountyPosters(
        timestamp
    );

    renderBackgroundLayers();
}


/* ===========================
   15. 鼠标交互
=========================== */

/* 射线检测器 */
const raycaster =
    new THREE.Raycaster();

/* 两层共用拾取器；不建立额外画布或动画循环。 */
raycaster.layers.enable(FOREGROUND_CUBE_LAYER);

/* 标准化鼠标坐标 */
const mousePosition =
    new THREE.Vector2();

const backgroundDragPoint = new THREE.Vector3();
let suppressedBackgroundClick = null;

function backgroundPointerTime(event) {
    return Number.isFinite(event.timeStamp) && event.timeStamp >= 0 ? event.timeStamp : performance.now();
}

function recordBackgroundDragSample(drag, event) {
    const t = backgroundPointerTime(event);
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    const previous = drag.samples[drag.samples.length - 1];
    // 同时间戳不制造除零尖峰，乱序事件也不能覆写最新采样。
    if (previous && t <= previous.t) return;
    if (!previous || event.clientX !== previous.x || event.clientY !== previous.y) drag.lastMotionAt = t;
    drag.samples.push({ x: event.clientX, y: event.clientY, t });
    while (drag.samples.length > 32 || (drag.samples.length > 2 && drag.samples[1].t < t - 120)) {
        drag.samples.shift();
    }
}

function getBackgroundThrowMotion(drag, event) {
    const now = backgroundPointerTime(event);
    const age = Math.max(0, now - drag.lastMotionAt);
    if (age >= 100 || !Number.isFinite(drag.lastMotionAt)) return null;
    // 使用最后一次实际移动，而不是松手时重复的坐标；停住再松手会自然衰减为零。
    const samples = drag.samples.filter(sample => sample.t >= now - 120 && sample.t <= drag.lastMotionAt);
    const last = samples[samples.length - 1];
    if (!last) return null;
    const before = samples.slice(0, -1).reverse().find(sample => last.t - sample.t >= 12)
        || samples.find(sample => last.t - sample.t >= 4);
    if (!before) return null;
    const dt = (last.t - before.t) / 1000;
    let x = (last.x - before.x) / dt;
    let y = (last.y - before.y) / dt;
    let accelerationX = 0;
    let accelerationY = 0;
    const older = samples.slice(0, samples.indexOf(before)).reverse()
        .find(sample => before.t - sample.t >= 12);
    if (older) {
        const olderDt = (before.t - older.t) / 1000;
        const accelerationDt = (dt + olderDt) / 2;
        accelerationX = (x - (before.x - older.x) / olderDt) / accelerationDt;
        accelerationY = (y - (before.y - older.y) / olderDt) / accelerationDt;
        const acceleration = Math.hypot(accelerationX, accelerationY);
        const accelerationLimit = Math.min(16000, Math.hypot(x, y) * 0.15 / 0.016);
        const limit = acceleration > 0 ? Math.min(1, accelerationLimit / acceleration) : 0;
        accelerationX *= limit;
        accelerationY *= limit;
        x += accelerationX * 0.016;
        y += accelerationY * 0.016;
    }
    // 屏幕速度限制让近处、远处方块都有一致手感，不会因高采样率出现瞬间飞走。
    const speed = Math.hypot(x, y);
    const gain = Math.min(1, 1800 / Math.max(1, speed)) * Math.pow(1 - age / 100, 2)
        * (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0.55 : 1);
    x *= gain;
    y *= gain;
    if (Math.hypot(x, y) < 25) return null;
    const rect = backgroundCanvas.getBoundingClientRect();
    const worldPerPixel = 2 * Math.abs(camera.position.z - drag.mesh.position.z)
        * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, rect.height);
    return { x: x * worldPerPixel, y: -y * worldPerPixel, worldPerPixel,
        acceleration: [accelerationX, accelerationY] };
}

function updateBackgroundCubeThrow(mesh, seconds, speedMultiplier) {
    const motion = backgroundCubeThrows.get(mesh);
    if (!motion) return;
    const dt = seconds * Math.max(0, Number(speedMultiplier) || 0);
    if (!dt) return;
    const decay = Math.exp(-BACKGROUND_THROW_DAMPING * dt);
    const travel = (1 - decay) / BACKGROUND_THROW_DAMPING;
    mesh.position.x += motion.x * travel;
    mesh.position.y += motion.y * travel;
    motion.x *= decay;
    motion.y *= decay;
    if (Math.hypot(motion.x, motion.y) / motion.worldPerPixel < 2) backgroundCubeThrows.delete(mesh);
}

function isThrownBackgroundCubeOutside(mesh) {
    const radius = Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) * Math.sqrt(3) / 2;
    const depth = camera.position.z - mesh.position.z;
    if (depth <= radius) return false;
    const tangentY = Math.tan(camera.fov * Math.PI / 360);
    const tangentX = tangentY * camera.aspect;
    // 以视锥侧平面到包围球的距离判断，宽屏边缘的透视残角也必须完全离屏才回收。
    return Math.abs(mesh.position.x - camera.position.x) - depth * tangentX > radius * Math.hypot(1, tangentX)
        || Math.abs(mesh.position.y - camera.position.y) - depth * tangentY > radius * Math.hypot(1, tangentY);
}

function backgroundInteractionBlocked() {
    return document.hidden || document.body.matches(
        '.locked, .is-section-transitioning, .is-another-world-transitioning, '
        + '.is-another-world-focused, .is-another-world-obscured, '
        + '.creator-lightbox-open, .wanted-lightbox-open'
    );
}

function isBackgroundPointerTarget(target) {
    if (!(target instanceof Element) || target.closest('[inert]')) return false;
    // 只在真正的空白背景拾取；透明前景画布不应让拖拽穿过面板、文字、按钮或世界观画布。
    if (target.closest('#worldview-section, #navbar, #settings-section, .site-panel')) return false;
    return target === document.body || target === document.documentElement
        || target.id === 'content' || target.classList.contains('section');
}

function setBackgroundPointerRay(clientX, clientY) {
    const rect = backgroundCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
    mousePosition.set(
        (clientX - rect.left) / rect.width * 2 - 1,
        -(clientY - rect.top) / rect.height * 2 + 1
    );
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(mousePosition, camera);
    return true;
}

function handleBackgroundPointerDown(event) {
    if (backgroundCubeDrag || event.defaultPrevented || event.button !== 0 || event.isPrimary === false
        || backgroundInteractionBlocked() || !isBackgroundPointerTarget(event.target)
        || !setBackgroundPointerRay(event.clientX, event.clientY)) return;
    scene.updateMatrixWorld(true);
    const hits = raycaster.intersectObjects(cubes.filter(cube => cube.visible
        && cube.material.opacity > 0 && !capturedBackgroundCubes.has(cube)), false);
    // 前景画布最后合成，重叠时优先拾取实际显示在上面的前景方块。
    const hit = (foregroundContext && hits.find(item => item.object.layers.mask & (1 << FOREGROUND_CUBE_LAYER))) || hits[0];
    if (!hit) return;
    const mesh = hit.object;
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -mesh.position.z);
    if (!raycaster.ray.intersectPlane(plane, backgroundDragPoint)) return;
    backgroundCubeThrows.delete(mesh);
    thrownBackgroundCubes.delete(mesh);
    backgroundCubeDrag = {
        id: cubes.indexOf(mesh), mesh, plane,
        offset: mesh.position.clone().sub(backgroundDragPoint),
        pointerId: event.pointerId, pointerType: event.pointerType,
        target: event.target,
        startX: event.clientX, startY: event.clientY,
        clientX: event.clientX, clientY: event.clientY,
        samples: [], lastMotionAt: backgroundPointerTime(event),
        moved: false,
        originalDraggable: mesh.userData.draggable,
        originalIsDragging: mesh.userData.isDragging,
        originalCursor: document.documentElement.style.cursor,
        originalUserSelect: document.documentElement.style.userSelect
    };
    recordBackgroundDragSample(backgroundCubeDrag, event);
    mesh.userData.draggable = true;
    mesh.userData.isDragging = true;
    document.documentElement.style.cursor = 'grabbing';
    document.documentElement.style.userSelect = 'none';
    try { event.target.setPointerCapture(event.pointerId); } catch { /* Window listeners remain available. */ }
    if (event.cancelable) event.preventDefault();
}

function updateBackgroundCubeDrag(event) {
    const drag = backgroundCubeDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (backgroundInteractionBlocked() || capturedBackgroundCubes.has(drag.mesh)) {
        finishBackgroundCubeDrag(true);
        return;
    }
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    // 繁忙帧可能合并多次鼠标移动，保留其原始时间采样，而不是把整帧当作一次跳跃。
    try {
        const coalesced = event.getCoalescedEvents?.() || [];
        const eventAt = backgroundPointerTime(event);
        const count = Math.min(32, coalesced.length);
        // 均匀保留整帧轨迹，避免高回报率鼠标的最后 32 点只覆盖不足 4ms。
        for (let index = 0; index < count; index++) {
            const sample = coalesced[count > 1 ? Math.round(index * (coalesced.length - 1) / (count - 1)) : 0];
            if ((sample.pointerId === undefined || sample.pointerId === drag.pointerId)
                && backgroundPointerTime(sample) <= eventAt) recordBackgroundDragSample(drag, sample);
        }
    } catch { /* 不支持或拒绝访问时仍使用当前 PointerEvent。 */ }
    recordBackgroundDragSample(drag, event);
    const threshold = drag.pointerType === 'touch' ? 7 : 4;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < threshold) return;
    drag.moved = true;
    if (setBackgroundPointerRay(event.clientX, event.clientY)
        && raycaster.ray.intersectPlane(drag.plane, backgroundDragPoint)) {
        // 原纵深平面 + 抓取偏移保证按下不跳位；角度、材质、尺度、线速度和角速度均不重设。
        drag.mesh.position.copy(backgroundDragPoint).add(drag.offset);
    }
    if (event.cancelable) event.preventDefault();
}

function finishBackgroundCubeDrag(cancelled = false, event = null) {
    const drag = backgroundCubeDrag;
    if (!drag) return;
    backgroundCubeDrag = null;
    drag.mesh.userData.draggable = drag.originalDraggable;
    drag.mesh.userData.isDragging = drag.originalIsDragging;
    document.documentElement.style.cursor = drag.originalCursor;
    document.documentElement.style.userSelect = drag.originalUserSelect;
    try {
        if (drag.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    } catch { /* The original section may already have been detached. */ }
    if (drag.moved) {
        const motion = !cancelled && event && !capturedBackgroundCubes.has(drag.mesh)
            ? getBackgroundThrowMotion(drag, event) : null;
        if (motion) {
            backgroundCubeThrows.set(drag.mesh, motion);
            thrownBackgroundCubes.add(drag.mesh);
        }
        suppressedBackgroundClick = { x: drag.clientX, y: drag.clientY, until: performance.now() + 400 };
    } else if (!cancelled) {
        // 原有轻点改变方向功能只在真正的轻点后执行，不污染拖拽前的速度。
        drag.mesh.userData.speedX = (Math.random() - 0.5) * 0.6;
        drag.mesh.userData.speedY = (Math.random() - 0.5) * 0.6;
    }
}

function handleBackgroundPointerUp(event) {
    if (backgroundCubeDrag?.pointerId !== event.pointerId) return;
    updateBackgroundCubeDrag(event);
    finishBackgroundCubeDrag(false, event);
}

function handleBackgroundPointerCancel(event) {
    if (backgroundCubeDrag?.pointerId === event.pointerId) finishBackgroundCubeDrag(true);
}

function guardBackgroundTouchScroll(event) {
    // Pointerdown 时再改 touch-action 已太迟；仅实际命中方块的触摸才阻止页面接管滚动。
    if (backgroundCubeDrag?.pointerType === 'touch') {
        if (event.touches.length > 1) finishBackgroundCubeDrag(true);
        else if (event.cancelable) event.preventDefault();
    }
}

window.addEventListener('pointerdown', handleBackgroundPointerDown, { passive: false });
window.addEventListener('pointermove', updateBackgroundCubeDrag, { capture: true, passive: false });
window.addEventListener('pointerup', handleBackgroundPointerUp, true);
window.addEventListener('pointercancel', handleBackgroundPointerCancel, true);
window.addEventListener('lostpointercapture', handleBackgroundPointerCancel, true);
window.addEventListener('touchstart', guardBackgroundTouchScroll, { capture: true, passive: false });
window.addEventListener('touchmove', guardBackgroundTouchScroll, { capture: true, passive: false });
window.addEventListener('click', event => {
    const click = suppressedBackgroundClick;
    suppressedBackgroundClick = null;
    if (click && event.detail > 0 && performance.now() <= click.until
        && Math.hypot(event.clientX - click.x, event.clientY - click.y) < 8) {
        event.preventDefault();
        event.stopPropagation();
    }
}, true);
window.addEventListener('blur', () => finishBackgroundCubeDrag(true));
window.addEventListener('pagehide', () => finishBackgroundCubeDrag(true));
window.addEventListener('section-shown', () => finishBackgroundCubeDrag(true));
window.addEventListener('wanted-preview-open', () => finishBackgroundCubeDrag(true));
backgroundCanvas.addEventListener('webglcontextlost', () => finishBackgroundCubeDrag(true));


/* ===========================
   16. 窗口尺寸适配
=========================== */

let previousViewportWidth =
    window.innerWidth;

let previousViewportHeight =
    window.innerHeight;

/**
 * 更新相机比例、渲染尺寸和现有方块位置。
 *
 * resize 时先按新旧视口比例映射坐标，避免边界突然
 * 收缩后让大量方块在同一帧被集中 resetCube()。
 */
function handleWindowResize() {
    finishBackgroundCubeDrag(true);
    backgroundCubeThrows.clear();
    thrownBackgroundCubes.clear();
    const nextViewportWidth =
        Math.max(
            1,
            window.innerWidth
        );

    const nextViewportHeight =
        Math.max(
            1,
            window.innerHeight
        );

    const widthRatio =
        nextViewportWidth /
        Math.max(
            1,
            previousViewportWidth
        );

    const heightRatio =
        nextViewportHeight /
        Math.max(
            1,
            previousViewportHeight
        );

    cubes.forEach(
        cube => {
            cube.position.x *=
                widthRatio;

            cube.position.y *=
                heightRatio;
        }
    );

    previousViewportWidth =
        nextViewportWidth;

    previousViewportHeight =
        nextViewportHeight;

    camera.aspect =
        nextViewportWidth /
        nextViewportHeight;

    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            1.5
        )
    );

    renderer.setSize(
        nextViewportWidth,
        nextViewportHeight
    );

    resizeForegroundCanvas();
}

window.addEventListener(
    "resize",
    handleWindowResize
);


/* ===========================
   17. 启动 Three.js 动画
=========================== */

animate();


/* ===========================
   18. 网站运行时间
=========================== */

/* 网站起始时间 */
const countdownStartDate =
    new Date(
        "2024-06-19T00:00:00"
    );

/* 时间单位 */
const millisecondsPerSecond =
    1000;

const millisecondsPerMinute =
    millisecondsPerSecond * 60;

const millisecondsPerHour =
    millisecondsPerMinute * 60;

const millisecondsPerDay =
    millisecondsPerHour * 24;

/* 数字递增只在首次显示及悬停重播时运行，常规定时更新不会覆盖动画。 */
const countdownMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let countdownAnimationFrame = null;
let countdownShown = false;
let countdownDayDigits = 2;

function getCountdownValues() {
    const elapsed = Math.max(0, Date.now() - countdownStartDate.getTime());
    return [
        Math.floor(elapsed / millisecondsPerDay),
        Math.floor(elapsed % millisecondsPerDay / millisecondsPerHour),
        Math.floor(elapsed % millisecondsPerHour / millisecondsPerMinute),
        Math.floor(elapsed % millisecondsPerMinute / millisecondsPerSecond)
    ];
}

function renderCountdown(values) {
    const element = document.getElementById("countdown");
    if (!element) return;
    element.textContent = values.map((value, index) =>
        String(value).padStart(index === 0 ? countdownDayDigits : 2, "0")
    ).join(":");
}

function finishCountdownAnimation() {
    if (countdownAnimationFrame !== null) {
        window.cancelAnimationFrame(countdownAnimationFrame);
        countdownAnimationFrame = null;
    }
    renderCountdown(getCountdownValues());
}

/**
 * 保留原有 window.updateCountdown 入口。
 * animate 只用于显示及悬停，从全零递增至真实的天 / 时 / 分 / 秒。
 */
function updateCountdown(options = {}) {
    const element = document.getElementById("countdown");
    if (!element) return;

    const target = getCountdownValues();
    countdownDayDigits = Math.max(2, String(target[0]).length);
    if (!options.animate) {
        if (countdownAnimationFrame === null) renderCountdown(target);
        return;
    }
    countdownShown = true;
    if (countdownAnimationFrame !== null) return;
    if (countdownMotionQuery.matches || document.hidden) {
        renderCountdown(target);
        return;
    }

    renderCountdown([0, 0, 0, 0]);
    let startedAt = null;
    const animateCount = timestamp => {
        if (startedAt === null) startedAt = timestamp;
        const progress = Math.min(1, (timestamp - startedAt) / 1000);
        const eased = 1 - Math.pow(1 - progress, 3);
        renderCountdown(target.map(value => Math.floor(value * eased)));
        if (progress < 1) {
            countdownAnimationFrame = window.requestAnimationFrame(animateCount);
        } else {
            countdownAnimationFrame = null;
            // 结束时重新读取时间，跨秒或跨分钟仍保持正确。
            renderCountdown(getCountdownValues());
        }
    };
    countdownAnimationFrame = window.requestAnimationFrame(animateCount);
}

const countdownElement = document.getElementById("countdown");
countdownElement?.addEventListener("pointerenter", event => {
    if (!countdownShown || event.pointerType === "touch" || countdownAnimationFrame !== null) return;
    const style = getComputedStyle(countdownElement);
    if (Number(style.opacity) > 0 && style.visibility !== "hidden" && style.display !== "none") {
        updateCountdown({ animate: true });
    }
});

countdownMotionQuery.addEventListener?.("change", event => {
    if (event.matches && countdownShown) finishCountdownAnimation();
});
document.addEventListener("visibilitychange", () => {
    if (countdownShown) finishCountdownAnimation();
});
window.addEventListener("pagehide", () => {
    if (countdownShown) finishCountdownAnimation();
});


/* ===========================
   19. 网站运行时间全局入口
=========================== */

/*
 * 倒计时显示和定时更新
 * 由overlay.js控制。
 */
window.updateCountdown =
    updateCountdown;
