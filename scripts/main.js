let cubes = [];
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 100;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('background-3d'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
light.castShadow = true;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: '#808080', transparent: true, opacity: 1 });

// 创建方块
function createCube() {
    const cube = new THREE.Mesh(geometry, material);
    const size = Math.random() * 10 + 3;
    cube.scale.set(size, size, size);
    cube.position.x = window.innerWidth / 2 + Math.random() * window.innerWidth;
    cube.position.y = window.innerHeight / 2 + Math.random() * window.innerHeight;
    cube.position.z = (Math.random() - 0.5) * 100;
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData = {
        speedX: Math.random() * 0.2 + 0.03, // 水平速度
        speedY: Math.random() * 0.2 + 0.03, // 垂直速度
        rotationSpeedX: Math.random() * 0.01 - 0.005, // X轴旋转速度
        rotationSpeedY: Math.random() * 0.01 - 0.005 // Y轴旋转速度
    };
    scene.add(cube);
    cubes.push(cube);
}

// 初始化方块数量
for (let i = 0; i < 640; i++) {
    createCube();
}

// 动画逻辑
function animate() {
    requestAnimationFrame(animate);

    cubes.forEach(cube => {
        cube.position.x -= cube.userData.speedX; // 向左移动
        cube.position.y -= cube.userData.speedY; // 向下移动
        cube.rotation.x += cube.userData.rotationSpeedX;
        cube.rotation.y += cube.userData.rotationSpeedY;

        // 如果方块离开视窗范围，重新生成
        if (cube.position.x < -window.innerWidth / 2 || cube.position.y < -window.innerHeight / 2) {
            scene.remove(cube);
            cubes.splice(cubes.indexOf(cube), 1);
            createCube();
        }
    });

    renderer.render(scene, camera);
}

// 启动动画
animate();

// 调整窗口大小
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 倒计时功能
function updateCountdown() {
    const countdownElement = document.getElementById('countdown');
    const startDate = new Date('2024-06-19T00:00:00');
    const now = new Date();
    const elapsedTime = now - startDate;

    const days = String(Math.floor(elapsedTime / (1000 * 60 * 60 * 24))).padStart(2, '0');
    const hours = String(Math.floor((elapsedTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((elapsedTime % (1000 * 60)) / 1000)).padStart(2, '0');

    countdownElement.textContent = `${days}:${hours}:${minutes}:${seconds}`;
}

// 在页面加载时启动倒计时
document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateCountdown, 1000);
});
