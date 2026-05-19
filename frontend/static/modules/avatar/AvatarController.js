import { Scene, Group, AnimationMixer, LoopOnce } from 'three';

export class AvatarController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.avatar = null;
        this.mixer = null;
        this.animations = new Map();
        this.currentAnimation = null;
        this.isSpeaking = false;
        this.currentEmotion = 'neutral';
        this.morphMeshes = [];
        this.mouthAlpha = 0;

        // Autonomous Behavior state
        this.blinkTimer = 0;
        this.blinkTarget = 2 + Math.random() * 3;
        this.isBlinking = false;
        this.blinkDuration = 0.15;
    }

    async loadAvatar(modelUrl) {
        try {
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
            const loader = new GLTFLoader();

            return new Promise((resolve, reject) => {
                loader.load(
                    modelUrl,
                    async (gltf) => {
                        // Dispose old avatar if exists
                        if (this.avatar) {
                            this.sceneManager.scene.remove(this.avatar);
                        }

                        this.avatar = gltf.scene;
                        this.avatar.name = 'avatar';
                        this.avatar.position.set(0, 0, 0);
                        this.avatar.scale.set(0.6, 0.6, 0.6);

                        // Set up animations
                        this.mixer = new AnimationMixer(this.avatar);
                        this.animations.clear();

                        if (gltf.animations && gltf.animations.length) {
                            gltf.animations.forEach((clip) => {
                                this.animations.set(clip.name, clip);
                            });
                        }

                        // Find meshes with morph targets
                        this.morphMeshes = [];
                        this.avatar.traverse((child) => {
                            if (child.isMesh && child.morphTargetInfluences) {
                                this.morphMeshes.push(child);
                            }
                        });

                        // Load variations based on gender
                        const isFeminine = modelUrl.includes('feminine');
                        const genderPrefix = isFeminine ? 'F' : 'M';
                        await this.loadVariations(genderPrefix);

                        this.sceneManager.scene.add(this.avatar);
                        
                        // Wait a tiny bit for animations to be ready
                        setTimeout(() => this.playIdleAnimation(), 100);
                        
                        resolve(this.avatar);
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading avatar:', error);
                        reject(error);
                    }
                );
            });
        } catch (error) {
            console.error('Failed to load GLTFLoader:', error);
            throw error;
        }
    }

    async loadVariations(genderPrefix) {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();

        // We know we have 6 variations for each (at least 6 for F, 10 for M)
        const count = genderPrefix === 'F' ? 6 : 10;
        const folder = genderPrefix === 'F' ? 'feminine' : 'masculine';
        const loadPromises = [];

        console.log(`📂 Loading ${count} ${genderPrefix} variations...`);

        for (let i = 1; i <= count; i++) {
            const num = i.toString().padStart(3, '0');
            const url = `/assets/idle/${folder}/${genderPrefix}_Talking_Variations_${num}.glb`;

            loadPromises.push(new Promise((resolve) => {
                loader.load(url, (gltf) => {
                    if (gltf.animations && gltf.animations.length) {
                        gltf.animations.forEach(clip => {
                            // Rename clip to be unique
                            const name = `talk_var_${num}`;
                            this.animations.set(name, clip);
                        });
                    }
                    resolve();
                }, undefined, () => resolve()); // Ignore errors for individual files
            }));
        }

        await Promise.all(loadPromises);
        console.log(`✅ Loaded ${this.animations.size} animations total`);
    }

    playAnimation(name, loop = true) {
        if (!this.mixer || !this.animations.has(name)) {
            // console.warn(`Animation "${name}" not found`);
            return null;
        }

        const clip = this.animations.get(name);
        const action = this.mixer.clipAction(clip);

        // Crossfade for smoothness
        if (this.currentAnimation) {
            action.reset();
            action.setLoop(loop ? 2200 : LoopOnce);
            action.clampWhenFinished = true;
            action.play();
            this.currentAnimation.crossFadeTo(action, 0.5, true);
        } else {
            action.setLoop(loop ? 2200 : LoopOnce);
            action.play();
        }

        this.currentAnimation = action;
        return action;
    }

    stopAnimation() {
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(0.5);
            this.currentAnimation = null;
        }
    }

    playIdleAnimation() {
        let action = this.playAnimation('idle', true) || this.playAnimation('Idle', true);
        if (!action) {
            // Fallback: Use the first available variation at a very slow speed to simulate idle breathing
            const variations = Array.from(this.animations.keys()).filter(k => k.startsWith('talk_var_'));
            if (variations.length > 0) {
                action = this.playAnimation(variations[0], true);
                if (action) action.setEffectiveTimeScale(0.15); // Slow movement for idle
            }
        } else {
            action.setEffectiveTimeScale(1.0);
        }
        return action;
    }

    setEmotion(emotion) {
        this.currentEmotion = emotion;

        const emotionMap = {
            '😊': 'smile',
            '😮': 'surprise',
            '😡': 'angry',
            '😉': 'wink',
            '👍': 'thumbs_up',
            'happy': 'smile',
            'surprise': 'surprise',
            'think': 'thinking',
            'sad': 'sad',
            'laugh': 'laughing',
            'angry': 'angry'
        };

        // If the emotion is a tag like [happy], extract the word
        const cleanEmotion = emotion.replace(/[\[\]]/g, '').toLowerCase();
        const animationName = emotionMap[cleanEmotion] || emotionMap[emotion] || 'idle';
        
        console.log(`🎭 Setting emotion: ${emotion} -> ${animationName}`);
        
        // Try to play the animation
        const action = this.playAnimation(animationName, false);
        
        // If no animation found, we could fall back to morph targets
        if (!action) {
            this.applyMorphEmotion(animationName);
        }
    }

    applyMorphEmotion(emotion) {
        // Fallback: manually adjust morph targets for 2 seconds if no animation exists
        this.morphMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            if (!dict) return;
            
            if (emotion === 'smile') {
                const idx = dict['mouthSmile'] || dict['MouthSmile'];
                if (idx !== undefined) mesh.morphTargetInfluences[idx] = 0.8;
                setTimeout(() => { if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = 0; }, 2000);
            }
        });
    }

    update(deltaTime, volume = 0) {
        const time = performance.now() * 0.001;

        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        // --- 1. Autonomus Blinking ---
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= this.blinkTarget) {
            this.isBlinking = true;
            if (this.blinkTimer >= this.blinkTarget + this.blinkDuration) {
                this.isBlinking = false;
                this.blinkTimer = 0;
                this.blinkTarget = 2 + Math.random() * 4;
            }
        }

        // --- 2. Lip-Sync ---
        const targetMouth = this.isSpeaking ? Math.min(volume * 45, 1.0) : 0;
        this.mouthAlpha += (targetMouth - this.mouthAlpha) * 0.5;

        this.morphMeshes.forEach(mesh => {
            if (!mesh.morphTargetDictionary) return;

            const dict = mesh.morphTargetDictionary;
            const influence = mesh.morphTargetInfluences;

            const mouthIdx = dict['mouthOpen'] || dict['jawOpen'] || dict['viseme_aa'] || dict['MouthOpen'] || dict['JawOpen'] || dict['v_aa'];
            if (mouthIdx !== undefined) influence[mouthIdx] = this.mouthAlpha;

            const blinkIdx = dict['eyeBlinkLeft'] || dict['eyeBlinkRight'] || dict['blink'] || dict['EyeBlinkLeft'];
            if (blinkIdx !== undefined) influence[blinkIdx] = this.isBlinking ? 1.0 : 0.0;
        });

        // Natural sway and T-Pose recovery
        if (this.avatar) {
            if (!this.currentAnimation) {
                this.avatar.position.y = Math.sin(time * 0.5) * 0.01;
                this.avatar.rotation.y = Math.sin(time * 0.3) * 0.05;
                
                // Recovery: If no animation is currently active, force idle
                const hasActiveAction = this.mixer._actions.some(a => a.isRunning());
                if (!hasActiveAction) {
                    this.playIdleAnimation();
                }
            }
        }
    }

    setSpeaking(speaking) {
        if (this.isSpeaking === speaking) return;
        this.isSpeaking = speaking;

        if (speaking) {
            // Pick a random variation
            const variations = Array.from(this.animations.keys()).filter(k => k.startsWith('talk_var_'));
            if (variations.length > 0) {
                const randomVar = variations[Math.floor(Math.random() * variations.length)];
                const action = this.playAnimation(randomVar, true);
                if (action) action.setEffectiveTimeScale(1.0); // Reset speed
            } else {
                const action = this.playAnimation('talking', true);
                if (action) action.setEffectiveTimeScale(1.0);
            }
        } else {
            this.playIdleAnimation();
        }
    }

    dispose() {
        this.stopAnimation();

        if (this.avatar && this.sceneManager.scene) {
            this.sceneManager.scene.remove(this.avatar);
        }

        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.avatar);
        }

        this.avatar = null;
        this.mixer = null;
        this.animations.clear();
        this.currentAnimation = null;
    }
}

export function createAvatarController(sceneManager) {
    return new AvatarController(sceneManager);
}