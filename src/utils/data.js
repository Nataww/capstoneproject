import { DATA_ASSET_KEYS } from "../assets/asset-keys.js"; 

export class DataUtils {
    
    static getAnimations(scene) {
        const data = scene.cache.json.get(DATA_ASSET_KEYS.ANIMATIONS);
        return data;
    }

    static getNpcData(scene, npcId) {
        const data = scene.cache.json.get(DATA_ASSET_KEYS.NPCS);
        return data[npcId];
    }
    
    static getIntroductionData(scene, introKey) {
        const data = scene.cache.json.get(DATA_ASSET_KEYS.INTRODUCTION);
        return data[introKey];
    }
}