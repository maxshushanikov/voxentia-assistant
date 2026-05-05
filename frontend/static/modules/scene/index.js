import { SceneManager, createSceneManager } from './SceneManager.js';
import { SceneLoader, createSceneLoader } from './SceneLoader.js';

export { SceneManager, createSceneManager, SceneLoader, createSceneLoader };

export async function initScene() {
    const sceneManager = new SceneManager();
    await sceneManager.init();
    return sceneManager;
}