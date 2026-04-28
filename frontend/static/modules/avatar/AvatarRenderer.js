export class AvatarRenderer {
    constructor(sceneManager, avatarController, audioManager = null) {
        this.sceneManager = sceneManager;
        this.avatarController = avatarController;
        this.audioManager = audioManager;
        this.lastTime = 0;
        this.isRendering = false;
    }

    start() {
        this.isRendering = true;
        this.lastTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRendering = false;
    }

    animate() {
        if (!this.isRendering) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) * 0.001; // Convert to seconds
        this.lastTime = currentTime;
        
        // Update avatar animations
        if (this.avatarController) {
            const volume = this.audioManager ? this.audioManager.getVolumeLevel() : 0;
            this.avatarController.update(deltaTime, volume);
        }
        
        // Update scene
        if (this.sceneManager) {
            this.sceneManager.controls.update();
        }
        
        // Request next frame
        requestAnimationFrame(() => this.animate());
    }

    resize() {
        if (this.sceneManager) {
            const canvas = this.sceneManager.renderer.domElement;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            
            if (canvas.width !== width || canvas.height !== height) {
                this.sceneManager.renderer.setSize(width, height, false);
                this.sceneManager.camera.aspect = width / height;
                this.sceneManager.camera.updateProjectionMatrix();
            }
        }
    }

    dispose() {
        this.stop();
        this.sceneManager = null;
        this.avatarController = null;
    }
}

export function createAvatarRenderer(sceneManager, avatarController) {
    return new AvatarRenderer(sceneManager, avatarController);
}