import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.lights = [];
    }

    async init() {
        try {
            const { 
                Scene, 
                PerspectiveCamera, 
                WebGLRenderer, 
                Color, 
                AmbientLight, 
                DirectionalLight,
                sRGBEncoding
            } = await import('three');

            const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

            // Initialize three modules for later use
            await this.initThreeModules();

            // Initialize scene
            this.scene = new Scene();
            this.scene.background = new Color(0x202025);

            // Initialize renderer
            const canvas = document.getElementById('scene');
            this.renderer = new WebGLRenderer({ 
                canvas, 
                antialias: true, 
                alpha: true 
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            this.renderer.physicallyCorrectLights = true;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            
            // Set pixel ratio for clarity
            this.renderer.setPixelRatio(window.devicePixelRatio);
            
            // Setup Environment
            const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
            
            // Initialize camera
            this.camera = new PerspectiveCamera(
                35, 
                canvas.clientWidth / canvas.clientHeight, 
                0.1, 
                100
            );
            this.camera.position.set(0, 1.0, 3.5);

            // Initialize controls
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;
            this.controls.maxPolarAngle = Math.PI / 2;
            this.controls.target.set(0, 0.9, 0);

            // Setup lighting
            this.setupLighting();

            // Handle window resize
            this.setupResizeHandler();

            return this;
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            throw error;
        }
    }

    setupLighting() {
        const AmbientLight = this.getThreeModule('AmbientLight');
        const DirectionalLight = this.getThreeModule('DirectionalLight');
        const HemisphereLight = this.getThreeModule('HemisphereLight');

        // Ambient light
        const ambientLight = new AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);

        // Main directional light
        const mainLight = new DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(2, 4, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        this.scene.add(mainLight);
        this.lights.push(mainLight);

        // Fill light
        const fillLight = new DirectionalLight(0x7777bb, 0.3);
        fillLight.position.set(-2, 3, -3);
        this.scene.add(fillLight);
        this.lights.push(fillLight);

        // Rim light
        const rimLight = new DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 2, -5);
        this.scene.add(rimLight);
        this.lights.push(rimLight);

        // Hemisphere light for soft fill
        const hemiLight = new HemisphereLight(0xffffff, 0x444444, 0.5);
        this.scene.add(hemiLight);
        this.lights.push(hemiLight);
    }

    async initThreeModules() {
        if (this.threeModules) return;
        
        const three = await import('three');
        this.threeModules = {
            AmbientLight: three.AmbientLight,
            DirectionalLight: three.DirectionalLight,
            HemisphereLight: three.HemisphereLight,
            Scene: three.Scene,
            PerspectiveCamera: three.PerspectiveCamera,
            WebGLRenderer: three.WebGLRenderer,
            Color: three.Color,
            sRGBEncoding: three.sRGBEncoding
        };
    }

    getThreeModule(name) {
        if (!this.threeModules) {
            throw new Error('Three modules not initialized. Call initThreeModules first.');
        }
        return this.threeModules[name];
    }

    setupResizeHandler() {
        const resize = () => {
            const canvas = this.renderer.domElement;
            const container = canvas.parentElement;
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        };

        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(this.renderer.domElement.parentElement);
        
        this.resizeHandler = resize;
        this.resizeObserver = resizeObserver;
        
        // Initial resize
        setTimeout(resize, 100);
    }

    render() {
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();
    }

    dispose() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        if (this.controls) {
            this.controls.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        // Remove all objects from scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.lights = [];
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }
}

export function createSceneManager() {
    return new SceneManager();
}