import Phaser from './lib/phaser.js';
import { SCENE_KEYS } from './scenes/scene-keys.js';
import { PreloadScene } from './scenes/preload-scene.js';
import { ConversationScene } from './scenes/conversation-scene.js';
import { WorldScene } from './scenes/world-scene.js';
import { TitleScene } from './scenes/title-scene.js';
import { MiniGameScene } from './scenes/mini-game-scene.js';
import { ApplicationScene } from './scenes/application-scene.js';

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  pixelArt: false,
  scale: {
    parent: 'game-container',
    width: 1024,
    height: 576,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#000000',
});

game.scene.add(SCENE_KEYS.PRELOAD_SCENE, PreloadScene);
game.scene.add(SCENE_KEYS.WORLD_SCENE, WorldScene);
game.scene.add(SCENE_KEYS.CONVERSATION_SCENE, ConversationScene);
game.scene.add(SCENE_KEYS.MINI_GAME_SCENE, MiniGameScene);
game.scene.add(SCENE_KEYS.TITLE_SCENE, TitleScene);
game.scene.add(SCENE_KEYS.APPLICATION_SCENE, ApplicationScene);
game.scene.start(SCENE_KEYS.PRELOAD_SCENE);
