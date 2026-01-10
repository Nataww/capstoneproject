import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { TITLE_ASSET_KEYS, UI_ASSET_KEYS } from '../assets/asset-keys.js';
import { Control } from '../utils/control.js';
import { DIRECTION } from '../common/direction.js';
import { dataManager, DATA_MANAGER_STORE_KEYS } from '../utils/data-manager.js';

const MAIN_MENU_OPTIONS = Object.freeze({
  NEW_GAME: 'NEW_GAME',
  CONTINUE: 'CONTINUE',
  OPTIONS: 'OPTIONS',
});

export class TitleScene extends Phaser.Scene {
  // declare variables
  #userInput;
  #controls;
  #currentOption;
  #currentButton = false;
  #menuButtons = {};

  constructor() {
    super({ key: SCENE_KEYS.TITLE_SCENE });
  }

  create() {
    console.log(`[${TitleScene.name}:create] invoked`);

    this.#currentButton = !!dataManager.store.get(DATA_MANAGER_STORE_KEYS.GAME_STARTED);

    this.#currentOption = MAIN_MENU_OPTIONS.NEW_GAME;

    this.add.image(0, 0, TITLE_ASSET_KEYS.BACKGROUND).setOrigin(0, 0).setScale(0.55);
    this.add.image(512, 150, TITLE_ASSET_KEYS.TITLE).setScale(0.5);

    // create menu buttons
    const newGameBtn = this.add.image(512, 350, TITLE_ASSET_KEYS.NEWGAME_BUTTON)
      .setOrigin(0.5).setScale(0.6);
    const continueBtn = this.add.image(512, 430, TITLE_ASSET_KEYS.CONTINUE_BUTTON)
      .setOrigin(0.5).setScale(0.6).setAlpha(this.#currentButton ? 1 : 0.5);
    const optionsBtn = this.add.image(512, 510, TITLE_ASSET_KEYS.OPTIONS_BUTTON)
      .setOrigin(0.5)
      .setScale(0.6);

    this.#menuButtons = {
      [MAIN_MENU_OPTIONS.NEW_GAME]: { button: newGameBtn, y: 350 },
      [MAIN_MENU_OPTIONS.CONTINUE]: { button: continueBtn, y: 430 },
      [MAIN_MENU_OPTIONS.OPTIONS]: { button: optionsBtn, y: 510 },
    };

    this.#userInput = this.add.image(512 - 180, 350, UI_ASSET_KEYS.CURSOR)
      .setOrigin(0.5)
      .setScale(2.5);

    this.tweens.add({
      targets: this.#userInput,
      x: { from: 512 - 180, to: 512 - 175 },
      duration: 500,
      repeat: -1,
      yoyo: true,
    });

    // handle menu selection
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.#currentOption === MAIN_MENU_OPTIONS.NEW_GAME) {
        dataManager.startNewGame();
        this.scene.start(SCENE_KEYS.CONVERSATION_SCENE);
      } 
      
      else if (this.#currentOption === MAIN_MENU_OPTIONS.CONTINUE) {
        this.scene.start(SCENE_KEYS.WORLD_SCENE);
      } 
      
      else if (this.#currentOption === MAIN_MENU_OPTIONS.OPTIONS) {
        this.scene.start(SCENE_KEYS.WORLD_SCENE);
      }
    });

    this.#controls = new Control(this);
  }

  update() {
    if (this.#controls.isInputLocked) return;

    if (this.#controls.getSpaceKeyPressed()) {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.#controls.lockPlayerInput = true;
      return;
    }

    const direction = this.#controls.getJustDownKey();
    if (direction !== DIRECTION.NONE) {
      this.#moveCursor(direction);
    }
  }

  // move cursor in menu
  #moveCursor(direction) {
    this.#updateSelectedOption(direction);

    const currentButton = this.#menuButtons[this.#currentOption];
    if (currentButton) {
      this.#userInput.setY(currentButton.y);
    }
  }

  // update selected option
  #updateSelectedOption(direction) {
    if (direction === DIRECTION.UP) {
      if (this.#currentOption === MAIN_MENU_OPTIONS.NEW_GAME) return;
      
      else if (this.#currentOption === MAIN_MENU_OPTIONS.OPTIONS) {
        this.#currentOption = this.#currentButton
          ? MAIN_MENU_OPTIONS.CONTINUE
          : MAIN_MENU_OPTIONS.NEW_GAME;
      }
    }

    else if (direction === DIRECTION.DOWN) {
      if (this.#currentOption === MAIN_MENU_OPTIONS.OPTIONS) return;

      if (this.#currentOption === MAIN_MENU_OPTIONS.NEW_GAME) {
        this.#currentOption = this.#currentButton
          ? MAIN_MENU_OPTIONS.CONTINUE
          : MAIN_MENU_OPTIONS.OPTIONS;
      } 
    }
  }
}