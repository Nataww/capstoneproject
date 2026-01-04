import {
  CHARACTER_ASSET_KEYS,
  PLAYER_ASSET_KEYS,
  UI_ASSET_KEYS,
  WORLD_ASSET_KEYS,
  DATA_ASSET_KEYS,
  MINI_GAME_ASSETS_KEYS,
  TITLE_ASSET_KEYS,
  CONVERSATION_ASSET_KEYS
} from '../assets/asset-keys.js';
import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { DataUtils } from '../utils/data.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({
      key: SCENE_KEYS.PRELOAD_SCENE,
    });
  }
  preload() {
    console.log(`[${PreloadScene.name}:preload] invoked`);

    const imageAssetPath = 'assets/images';

    // conversation assets
    this.load.image(CONVERSATION_ASSET_KEYS.BACKGROUND, `${imageAssetPath}/background-assets/AR_2_resized.jpg`);

    // mini game assets
    this.load.image(MINI_GAME_ASSETS_KEYS.MINI_GAME_BACKGROUND, `${imageAssetPath}/background-assets/AR_2_resized.jpg`);
    this.load.json(MINI_GAME_ASSETS_KEYS.MINI_GAME_SCENARIOS, 'data/scenarios.json');
    this.load.spritesheet(MINI_GAME_ASSETS_KEYS.MINI_GAME_CHARACTERS,`${imageAssetPath}/players-assets/Adam_idle_16x16.png`, { frameWidth: 16, frameHeight: 32 });
    this.load.audio(MINI_GAME_ASSETS_KEYS.MINI_GAME_MUSIC, ['assets/audio/mini-game-music.mp3']); // Campus Sunlight-2.mp3
    this.load.audio(MINI_GAME_ASSETS_KEYS.MINI_GAME_POPUP_SOUND, ['assets/audio/ding.mp3']);

    // player assets
    this.load.image(PLAYER_ASSET_KEYS.PLAYER2, `${imageAssetPath}/characters/character_resized.png`);
    this.load.image(PLAYER_ASSET_KEYS.PLAYER1, `${imageAssetPath}/characters/character1_resized.png`);

    // data assets
    this.load.json(DATA_ASSET_KEYS.ANIMATIONS, 'assets/data/animation.json');
    this.load.json(DATA_ASSET_KEYS.NPCS, 'assets/data/npcs.json');
    this.load.json(DATA_ASSET_KEYS.EVENTS, 'assets/data/event.json');
    this.load.json(DATA_ASSET_KEYS.INTRODUCTION, 'assets/data/introduction.json');
    
    // ui assets
    this.load.image(UI_ASSET_KEYS.CURSOR, `${imageAssetPath}/ui-assets/cursor.png`);
    this.load.image(UI_ASSET_KEYS.DIALOG_PANEL, `${imageAssetPath}/ui-assets/custom-ui_resized.png`);

    // world scene assets
    this.load.image(WORLD_ASSET_KEYS.WORLD_MAP, `${imageAssetPath}/map-assets/new_3.png`);
    this.load.tilemapTiledJSON(WORLD_ASSET_KEYS.WORLD_MAIN_LEVEL, 'assets/data/level_7.json');
    this.load.image(WORLD_ASSET_KEYS.WORLD_COLLISION, `${imageAssetPath}/map-assets/collision_3.png`);
    this.load.image(WORLD_ASSET_KEYS.WORLD_ENCOUNTER, `assets/data/encounter.png`);
    this.load.audio(WORLD_ASSET_KEYS.WORLD_MUSIC, ['assets/audio/world-music.mp3']); // Loyalty_Freak_Music_-_01_-_Go_to_the_Picnicchosic.com_(chosic.com)

    // character assets
    this.load.spritesheet(CHARACTER_ASSET_KEYS.PLAYER, `${imageAssetPath}/players-assets/Adam_run_16x16.png`, {
      frameWidth: 16, frameHeight: 32,});
    this.load.spritesheet(CHARACTER_ASSET_KEYS.NPC, `${imageAssetPath}/players-assets/Amelia_run_16x16.png`, {
      frameWidth: 16, frameHeight: 32,});

    // title scene assets
    this.load.image(TITLE_ASSET_KEYS.BACKGROUND, `${imageAssetPath}/title-assets/background.png`);
    this.load.image(TITLE_ASSET_KEYS.TITLE, `${imageAssetPath}/title-assets/title.png`);
    this.load.image(TITLE_ASSET_KEYS.NEWGAME_BUTTON, `${imageAssetPath}/title-assets/new game.png`);
    this.load.image(TITLE_ASSET_KEYS.CONTINUE_BUTTON, `${imageAssetPath}/title-assets/continue.png`);
    this.load.image(TITLE_ASSET_KEYS.OPTIONS_BUTTON, `${imageAssetPath}/title-assets/option.png`);
  }

  create() {
    console.log(`[${PreloadScene.name}:create] invoked`);
    this.#createAnimations();
    this.scene.start(SCENE_KEYS.TITLE_SCENE);
  }

  #createAnimations() {
    const animations = DataUtils.getAnimations(this);
    animations.forEach((animation) => {
      const frames = animation.frames
      ? this.anims.generateFrameNumbers(animation.assetKey, { frames: animation.frames }) 
      : this.anims.generateFrameNumbers(animation.assetKey);
      this.anims.create({
        key: animation.key,
        frames: frames,
        frameRate: animation.frameRate,
        repeat: animation.repeat,
        delay: animation.delay,
        yoyo: animation.yoyo,
      });
    });
  }
}