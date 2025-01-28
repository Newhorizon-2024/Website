document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('background-3d');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    light.shadow.bias = -0.002;

    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: '#808080', transparent: true, opacity: 1 });
    const cubes = [];

    function createCube() {
        const cube = new THREE.Mesh(geometry, material);
        const size = Math.random() * 100 + 1;
        cube.scale.set(size, size, size);
        cube.position.x = (Math.random() - 0.5) * 200;
        cube.position.y = (Math.random() - 0.5) * 200;
        cube.position.z = (Math.random() - 0.5) * 200;

        cube.userData = {
            speedX: Math.random() * 0.2 + 0.03,
            speedY: Math.random() * 0.2 + 0.03,
            rotationSpeedX: Math.random() * 0.01 - 0.005,
            rotationSpeedY: Math.random() * 0.01 - 0.005,
        };

        scene.add(cube);
        cubes.push(cube);
    }

    for (let i = 0; i < 64; i++) {
        createCube();
    }

    camera.position.z = 50;

    function animate() {
        requestAnimationFrame(animate);

        cubes.forEach((cube) => {
            cube.position.x += cube.userData.speedX;
            cube.position.y += cube.userData.speedY;
            cube.rotation.x += cube.userData.rotationSpeedX;
            cube.rotation.y += cube.userData.rotationSpeedY;

            if (cube.position.x > 100 || cube.position.y > 100) {
                cube.position.x = (Math.random() - 0.5) * 200;
                cube.position.y = (Math.random() - 0.5) * 200;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
