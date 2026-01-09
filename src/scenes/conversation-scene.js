import Phaser from '../lib/phaser.js';
import { UI_ASSET_KEYS, CONVERSATION_ASSET_KEYS, PLAYER_ASSET_KEYS } from '../assets/asset-keys.js';
import { DataUtils } from '../utils/data.js';
import { SCENE_KEYS } from './scene-keys.js';
import { Control } from '../utils/control.js';

export class ConversationScene extends Phaser.Scene {
  #control;
  #userInputCursor;
  #userInputCursorTween;
  #mentor;
  #player1;

  constructor() {
    super({
      key: SCENE_KEYS.CONVERSATION_SCENE,
    });
    
    this.conversationData = null;
    this.currentDialogueIndex = 0;
    this.dialogueTexts = [];
  }

  create() {
    this.#control = new Control(this);
    console.log(`[${ConversationScene.name}:create] invoked`);

    this.add.image(0, 0, CONVERSATION_ASSET_KEYS.BACKGROUND).setOrigin(0);

    // render players
    this.#player1= this.add.image(768, 230, PLAYER_ASSET_KEYS.PLAYER2, 0).setScale(0.5);
    this.#mentor = this.add.image(256, 230, PLAYER_ASSET_KEYS.PLAYER1, 0).setScale(0.5);

    this.add.image(512, 420, UI_ASSET_KEYS.DIALOG_PANEL).setScale(1.9, 1.9);
    
    const introKey = 'introduction';
    this.conversationData = DataUtils.getIntroductionData(this, introKey);
    this.#displayDialogue();
  }

  update() {
    const SpaceKeyPressed = this.#control.getSpaceKeyPressed();
    if (SpaceKeyPressed) {
      this.currentDialogueIndex++;
      this.dialogueTexts.forEach(text => text.destroy());
      this.dialogueTexts = [];

      const dialogues = this.conversationData?.dialogues ?? [];
      if (this.currentDialogueIndex >= dialogues.length) {
        if (this.#userInputCursorTween) {
          this.#userInputCursorTween.stop();
        }
        if (this.#userInputCursor) {
          this.#userInputCursor.destroy();
        }
        this.scene.start(SCENE_KEYS.WORLD_SCENE);
        return;
      }

      this.#displayDialogue();
    }
  }

  #displayDialogue() {
    if (this.conversationData) {
      const dialogues = this.conversationData.dialogues;
      if (this.currentDialogueIndex < dialogues.length) {
        const dialogue = this.#readDialogue();
        // dim another speaker if needed
        if (dialogue.speaker === 'Mentor') {
          this.#mentor.setAlpha(1);
          this.#player1.setAlpha(0.5);
        } 
        
        else if (dialogue.speaker === 'Player') {
          this.#player1.setAlpha(1);
          this.#mentor.setAlpha(0.5);
        }

        this.#renderDialogue(dialogue);
        this.#createPlayerInputCursor();
      }
    } else {
      console.error(`[${ConversationScene.name}:displayDialogue] conversation data is null or undefined`);
    }
  }

  #readDialogue() {
    return this.conversationData.dialogues[this.currentDialogueIndex];
  }

  #renderDialogue(dialogue) {
    const speakerText = this.add.text(140, 340, dialogue.speaker, {
      fontSize: '32px', color: '#7E3D3F', fontStyle: 'bold'
    });
    const dialogueText = this.add.text(140, 390, dialogue.text, {
      fontSize: '28px', color: '#000000', wordWrap: { width: 750, useAdvancedWrap: true }
    });
    this.dialogueTexts.push(speakerText, dialogueText);
  }
  
  #createPlayerInputCursor() {
    if (this.textures.exists(UI_ASSET_KEYS.CURSOR)) {
      this.#userInputCursor = this.add.image(850, 500, UI_ASSET_KEYS.CURSOR);
      this.#userInputCursor.setScale(4.5, 2);
      console.debug('[ConversationScene] using image cursor asset');
    }

    this.#userInputCursorTween = this.add.tween({
      delay: 0,
      duration: 500,
      repeat: -1,
      x: {
        from: 850,
        start: 850,
        to: 850 + 10,
      },
      targets: this.#userInputCursor,
    });
    this.#userInputCursorTween.play();
  }
}
