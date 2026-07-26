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

/* 获取背景画布 */
const backgroundCanvas =
    document.getElementById("background-3d");

/* 创建场景 */
const scene = new THREE.Scene();

/* 创建透视相机 */
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.z = 100;

/* 创建渲染器 */
const renderer = new THREE.WebGLRenderer({
    alpha: true,
    canvas: backgroundCanvas
});

renderer.setPixelRatio(window.devicePixelRatio);
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

directionalLight.castShadow = true;

scene.add(directionalLight);

/* 环境光 */
const ambientLight =
    new THREE.AmbientLight(
        0x404040
    );

scene.add(ambientLight);


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
   5. 创建方块
=========================== */

/**
 * 创建一个新的背景方块。
 */
function createCube() {
    const cube = new THREE.Mesh(
        cubeGeometry,
        window.material
    );

    const size =
        Math.random() * 10 + 3;

    cube.scale.set(
        size,
        size,
        size
    );

    cube.position.set(
        window.innerWidth / 2
            + Math.random()
            * window.innerWidth,

        window.innerHeight / 2
            + Math.random()
            * window.innerHeight,

        (Math.random() - 0.5) * 100
    );

    cube.castShadow = true;
    cube.receiveShadow = true;

    cube.userData = {
        draggable: false,
        isDragging: false,

        rotationSpeedX:
            Math.random() * 0.01
            - 0.005,

        rotationSpeedY:
            Math.random() * 0.01
            - 0.005,

        speedX:
            Math.random() * 0.2
            + 0.03,

        speedY:
            Math.random() * 0.2
            + 0.03
    };

    scene.add(cube);
    cubes.push(cube);
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
   7. 方块动画
=========================== */

/**
 * 更新并渲染背景方块。
 */
function animate() {
    requestAnimationFrame(animate);

    /*
     * 使用倒序循环。
     * 删除数组元素时不会跳过后续方块。
     */
    for (
        let index = cubes.length - 1;
        index >= 0;
        index -= 1
    ) {
        const cube = cubes[index];
        const speedMultiplier =
            window.globalSpeedMultiplier;

        cube.position.x -=
            cube.userData.speedX
            * speedMultiplier;

        cube.position.y -=
            cube.userData.speedY
            * speedMultiplier;

        cube.rotation.x +=
            cube.userData.rotationSpeedX
            * speedMultiplier;

        cube.rotation.y +=
            cube.userData.rotationSpeedY
            * speedMultiplier;

        const isOutsideHorizontalBoundary =
            cube.position.x
            < -window.innerWidth / 2;

        const isOutsideVerticalBoundary =
            cube.position.y
            < -window.innerHeight / 2;

        if (
            isOutsideHorizontalBoundary
            || isOutsideVerticalBoundary
        ) {
            scene.remove(cube);
            cubes.splice(index, 1);

            createCube();
        }
    }

    renderer.render(
        scene,
        camera
    );
}


/* ===========================
   8. 鼠标交互
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
function handleBackgroundMouseDown(event) {
    mousePosition.x =
        event.clientX
        / window.innerWidth
        * 2
        - 1;

    mousePosition.y =
        -(
            event.clientY
            / window.innerHeight
        )
        * 2
        + 1;

    raycaster.setFromCamera(
        mousePosition,
        camera
    );

    const intersections =
        raycaster.intersectObjects(
            cubes,
            false
        );

    if (intersections.length === 0) {
        return;
    }

    const selectedCube =
        intersections[0].object;

    selectedCube.userData.speedX =
        (Math.random() - 0.5) * 0.6;

    selectedCube.userData.speedY =
        (Math.random() - 0.5) * 0.6;

    /*
     * 保留原有状态字段，
     * 以兼容可能依赖它们的其他脚本。
     */
    selectedCube.userData.draggable = true;
    selectedCube.userData.isDragging = true;
}

window.addEventListener(
    "mousedown",
    handleBackgroundMouseDown
);


/* ===========================
   9. 窗口尺寸适配
=========================== */

/**
 * 更新相机比例和渲染尺寸。
 */
function handleWindowResize() {
    camera.aspect =
        window.innerWidth
        / window.innerHeight;

    camera.updateProjectionMatrix();

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
   10. 启动 Three.js 动画
=========================== */

animate();


/* ===========================
   11. 网站运行时间
=========================== */

/* 网站起始时间 */
const countdownStartDate =
    new Date("2024-06-19T00:00:00");

/* 时间单位 */
const millisecondsPerSecond = 1000;
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

    const currentDate = new Date();

    const elapsedTime =
        currentDate
        - countdownStartDate;

    const days = String(
        Math.floor(
            elapsedTime
            / millisecondsPerDay
        )
    ).padStart(2, "0");

    const hours = String(
        Math.floor(
            elapsedTime
            % millisecondsPerDay
            / millisecondsPerHour
        )
    ).padStart(2, "0");

    const minutes = String(
        Math.floor(
            elapsedTime
            % millisecondsPerHour
            / millisecondsPerMinute
        )
    ).padStart(2, "0");

    const seconds = String(
        Math.floor(
            elapsedTime
            % millisecondsPerMinute
            / millisecondsPerSecond
        )
    ).padStart(2, "0");

    countdownElement.textContent =
        `${days}:${hours}:${minutes}:${seconds}`;
}

/* ===========================
   12. 网站运行时间全局入口
=========================== */

/*
 * 倒计时的显示与定时更新由 overlay.js 控制。
 * main.js 只负责提供时间计算函数。
 */
window.updateCountdown = updateCountdown;
