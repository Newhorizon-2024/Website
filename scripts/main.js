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

scene.add(
    directionalLight
);

/* 环境光 */
const ambientLight =
    new THREE.AmbientLight(
        0x404040
    );

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

/**
 * 监听页面显示状态。
 */
function handleVisibilityChange() {
    isPageVisible =
        !document.hidden;
}

document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
);


/* ===========================
   14. 方块与悬赏令动画
=========================== */

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
    if (!isPageVisible) {
        return;
    }

    const speedMultiplier =
        window.globalSpeedMultiplier;

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

        cube.position.x -=
            cube.userData.speedX *
            speedMultiplier;

        cube.position.y -=
            cube.userData.speedY *
            speedMultiplier;

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
            isOutsideHorizontalBoundary ||
            isOutsideVerticalBoundary
        ) {
            resetCube(
                cube
            );
        }
    }

    updateBountyPosters(
        timestamp
    );

    renderer.render(
        scene,
        camera
    );
}


/* ===========================
   15. 鼠标交互
=========================== */

/* 射线检测器 */
const raycaster =
    new THREE.Raycaster();

/* 标准化鼠标坐标 */
const mousePosition =
    new THREE.Vector2();

/**
 * 点击方块时随机改变其移动方向。
 *
 * @param {MouseEvent} event 鼠标事件
 */
function handleBackgroundMouseDown(
    event
) {
    mousePosition.x =
        event.clientX /
        window.innerWidth *
        2 -
        1;

    mousePosition.y =
        -(
            event.clientY /
            window.innerHeight
        ) *
        2 +
        1;

    raycaster.setFromCamera(
        mousePosition,
        camera
    );

    const intersections =
        raycaster.intersectObjects(
            cubes,
            false
        );

    if (
        intersections.length === 0
    ) {
        return;
    }

    const selectedCube =
        intersections[0].object;

    selectedCube.userData.speedX =
        (
            Math.random() -
            0.5
        ) * 0.6;

    selectedCube.userData.speedY =
        (
            Math.random() -
            0.5
        ) * 0.6;

    /*
     * 保留原有状态字段，
     * 兼容其他脚本。
     */
    selectedCube.userData.draggable =
        true;

    selectedCube.userData.isDragging =
        true;
}

window.addEventListener(
    "mousedown",
    handleBackgroundMouseDown
);


/* ===========================
   16. 窗口尺寸适配
=========================== */

/**
 * 更新相机比例和渲染尺寸。
 */
function handleWindowResize() {
    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

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

/**
 * 更新网站运行时间。
 */
function updateCountdown() {
    const countdownElement =
        document.getElementById(
            "countdown"
        );

    if (!countdownElement) {
        return;
    }

    const currentDate =
        new Date();

    const elapsedTime =
        currentDate -
        countdownStartDate;

    const days =
        String(
            Math.floor(
                elapsedTime /
                millisecondsPerDay
            )
        ).padStart(
            2,
            "0"
        );

    const hours =
        String(
            Math.floor(
                elapsedTime %
                millisecondsPerDay /
                millisecondsPerHour
            )
        ).padStart(
            2,
            "0"
        );

    const minutes =
        String(
            Math.floor(
                elapsedTime %
                millisecondsPerHour /
                millisecondsPerMinute
            )
        ).padStart(
            2,
            "0"
        );

    const seconds =
        String(
            Math.floor(
                elapsedTime %
                millisecondsPerMinute /
                millisecondsPerSecond
            )
        ).padStart(
            2,
            "0"
        );

    countdownElement.textContent =
        `${days}:${hours}:${minutes}:${seconds}`;
}


/* ===========================
   19. 网站运行时间全局入口
=========================== */

/*
 * 倒计时显示和定时更新
 * 由overlay.js控制。
 */
window.updateCountdown =
    updateCountdown;
