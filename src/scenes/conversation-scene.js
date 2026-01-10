import Phaser from '../lib/phaser.js';
import { UI_ASSET_KEYS, CONVERSATION_ASSET_KEYS, PLAYER_ASSET_KEYS } from '../assets/asset-keys.js';
import { DataUtils } from '../utils/data.js';
import { SCENE_KEYS } from './scene-keys.js';
import { Control } from '../utils/control.js';

export class ConversationScene extends Phaser.Scene {
  #control;
  #userInput;
  #cursorTween;
  #mentor;
  #player1;

  constructor() {
    super({
      key: SCENE_KEYS.CONVERSATION_SCENE,
    });
    
    this.data = null;
    this.currentIndex = 0;
    this.text = [];
  }

  create() {
    this.#control = new Control(this);
    console.log(`[${ConversationScene.name}:create] invoked`);

    this.add.image(0, 0, CONVERSATION_ASSET_KEYS.BACKGROUND).setOrigin(0);
    this.add.image(512, 420, UI_ASSET_KEYS.DIALOG_PANEL).setScale(1.9, 1.9).setDepth(1);

    this.#player1= this.add.image(768, 230, PLAYER_ASSET_KEYS.PLAYER2, 0).setScale(0.5);
    this.#mentor = this.add.image(256, 230, PLAYER_ASSET_KEYS.PLAYER1, 0).setScale(0.5);
    
    // Load conversation data
    this.data = DataUtils.getIntroductionData(this, 'introduction');
    this.#displayDialogue();
  }

  update() {
    if (this.#control.getSpaceKeyPressed()) {
      this.currentIndex++;
      this.text.forEach(text => text.destroy());
      this.text = [];
      const dialogues = this.data?.dialogues ?? [];

      if (this.currentIndex >= dialogues.length) {
        if (this.#cursorTween) {
          this.#cursorTween.stop();
        }
        if (this.#userInput) {
          this.#userInput.destroy();
        }
        this.scene.start(SCENE_KEYS.WORLD_SCENE);
        return;
      }

      this.#displayDialogue();
    }
  }

  #displayDialogue() {
    if (this.data) {
      const dialogues = this.data.dialogues;
      if (this.currentIndex < dialogues.length) {
        const dialogue = this.#readDialogue();
        if (dialogue.speaker === 'Mentor') {
          this.#mentor.setAlpha(1);
          this.#player1.setAlpha(0);
        } 
        
        else if (dialogue.speaker === 'Player') {
          this.#player1.setAlpha(1);
          this.#mentor.setAlpha(0);
        }

        this.#getDialogue(dialogue);
        this.#createCursor();
      }
    } else {
      console.error(`[${ConversationScene.name}:#displayDialogue] No conversation data available.`);
    }
  }

  #readDialogue() {
    return this.data.dialogues[this.currentIndex];
  }

  #getDialogue(dialogue) {
    const speakerText = this.add.text(140, 340, dialogue.speaker, {
      fontSize: '32px', color: '#7E3D3F', fontStyle: 'bold'
    }).setDepth(2);
    const dialogueText = this.add.text(140, 390, dialogue.text, {
      fontSize: '28px', color: '#000000', wordWrap: { width: 750 }
    }).setDepth(2);
    this.text.push(speakerText, dialogueText);
  }
  
  #createCursor() {
    if (!this.#userInput) {
      this.#userInput = this.add.image(850, 500, UI_ASSET_KEYS.CURSOR).setScale(4.5, 2);
      console.log(`[${ConversationScene.name}] an cursor assets is created`, this.#userInput);
    }

    this.#cursorTween = this.add.tween({
      delay: 0,
      duration: 500,
      repeat: -1,
      x: {
        from: 850,
        start: 850,
        to: 850 + 10,
      },
      targets: this.#userInput,
    });
    this.#cursorTween.play();
  }
}
