export class SceneLoader {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.loaders = new Map();
        this.models = new Map();
    }

    async init() {
        try {
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
            const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
            
            // Setup GLTF loader with Draco compression support
            const gltfLoader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
            gltfLoader.setDRACOLoader(dracoLoader);
            
            this.loaders.set('gltf', gltfLoader);
            
            return this;
        } catch (error) {
            console.error('Failed to initialize scene loader:', error);
            throw error;
        }
    }

    async loadModel(url, name = null) {
        if (!this.loaders.has('gltf')) {
            await this.init();
        }

        const loader = this.loaders.get('gltf');
        
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Enable shadows for all meshes in the model
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    if (name) {
                        this.models.set(name, model);
                    }
                    
                    resolve(model);
                },
                (xhr) => {
                    console.log(`Loading ${url}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    addToScene(object, position = null, rotation = null, scale = null) {
        if (position) {
            object.position.copy(position);
        }
        
        if (rotation) {
            object.rotation.copy(rotation);
        }
        
        if (scale) {
            object.scale.copy(scale);
        }
        
        this.sceneManager.getScene().add(object);
        return object;
    }

    getModel(name) {
        return this.models.get(name);
    }

    removeFromScene(object) {
        this.sceneManager.getScene().remove(object);
    }

    dispose() {
        this.loaders.clear();
        this.models.clear();
        this.sceneManager = null;
    }
}

export function createSceneLoader(sceneManager) {
    return new SceneLoader(sceneManager);
}