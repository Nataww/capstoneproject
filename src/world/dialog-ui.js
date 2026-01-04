import Phaser from '../lib/phaser.js';
import { UI_ASSET_KEYS } from '../assets/asset-keys.js';
import { FONT_NAME } from '../assets/font-keys.js';

const UI_TEXT_STYLE = Object.freeze({
  fontFamily: FONT_NAME,
  color: 'black',
  fontSize: '32px',
  wordWrap: { width: 0 },
});

export class DialogUi {
  #scene;
  #padding;
  #width;
  #height;
  #container;
  #panel;
  #isVisible;
  #userInputCursor;
  #userInputCursorTween;
  #uiText;
  #textAnimationPlaying;
  #messagesToShow;
  #currentTextAnimationEvent;
  #currentMessageBeingAnimated;
  #choicesText;
  #choiceButtons;
  #showingChoices;
  #currentChoices;

  constructor(scene, width) {
    this.#scene = scene;
    this.#padding = 90;
    this.#width = width ? Math.max(0, width - this.#padding * 2) : 0;
    this.#height = 124;
    this.#textAnimationPlaying = false;
    this.#messagesToShow = [];
    this.#currentTextAnimationEvent = undefined;
    this.#currentMessageBeingAnimated = '';
    this.#choicesText = null;
    this.#choiceButtons = [];
    this.#showingChoices = false;
    this.#currentChoices = [];

    // Create panel and container with placeholder size; we'll resize when showing
    this.#panel = this.#scene.add
      .rectangle(0, 0, Math.max(16, this.#width), this.#height, 0xede4f3, 0.9)
      .setOrigin(0)
      .setStrokeStyle(8, 0x905ac2, 1);
    this.#container = this.#scene.add.container(0, 0, [this.#panel]);
    this.#uiText = this.#scene.add
      .text(18 + 12, 12, '', UI_TEXT_STYLE)
      .setOrigin(0, 0);
    this.#uiText.setStyle({ wordWrap: { width: Math.max(16, this.#width - 18) } });
    this.#container.add(this.#uiText);
    this.#createPlayerInputCursor();
    this.hideDialogModal();
  }

  #resizeToCamera() {
    const cam = this.#scene.cameras.main;
    const visibleWidth = cam.worldView.width || cam.width || 1280;
    this.#width = Math.max(16, visibleWidth - this.#padding * 2);

    this.#panel.setSize(this.#width, this.#height);
    this.#uiText.setStyle({ wordWrap: { width: Math.max(16, this.#width - 18) } });
    if (this.#userInputCursor) {
      const y = this.#height - 24;
      this.#userInputCursor.setPosition(this.#width - 16, y);

      if (this.#userInputCursorTween && this.#userInputCursorTween.isPlaying()) {
        this.#userInputCursorTween.restart();
      }
    }
  }

  get isVisible() {
    return this.#isVisible;
  }

  get isAnimationPlaying() {
    return this.#textAnimationPlaying;
  }

  get moreMessagesToShow() {
    return this.#messagesToShow.length > 0;
  }

  get showingChoices() {
    return this.#showingChoices;
  }

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  showDialogModal(messages) {
    this.#messagesToShow = [...messages];

    this.#resizeToCamera();

    const { x, bottom } = this.#scene.cameras.main.worldView;
    const startX = x + this.#padding;
    const startY = bottom - this.#height - this.#padding / 4;

    this.#container.setPosition(startX, startY);
    this.#userInputCursorTween.restart();
    this.#container.setAlpha(1);
    this.#isVisible = true;

    this.showNextMessage();
  }
  
  showNextMessage() {
    if (this.#messagesToShow.length === 0) {
      return;
    }

    this.#uiText.setText('').setAlpha(1);
    this.#currentMessageBeingAnimated = this.#messagesToShow.shift() || '';
    this.#currentTextAnimationEvent = this.#animateText(this.#uiText, this.#currentMessageBeingAnimated, {
      delay: 50,
      callback: () => {
        this.#textAnimationPlaying = false;
        this.#currentTextAnimationEvent = undefined;
      },
    });
    this.#textAnimationPlaying = true;
  }

  hideDialogModal() {
    this.#container.setAlpha(0);
    this.#userInputCursorTween.pause();
    this.#isVisible = false;
    this.clearChoices();
  }

  showChoices(choices, currentSelection = 0) {
    if (this.#showingChoices) {
      this.clearChoices();
    }
    this.#currentChoices = choices;
    
    const padding = 12;
    const choicesText = choices
      .map((choice, index) => {
        const prefix = currentSelection === index ? '▶ ' : '  ';
        return prefix + choice.text;
      })
      .join('\n');

    this.#choicesText = this.#scene.add.text(
      padding + 12,
      this.#height - 60,
      choicesText,
      {
        fontFamily: FONT_NAME,
        fontSize: '24px',
        color: 'black',
        wordWrap: { width: this.#width - padding * 3 },
      }
    ).setOrigin(0, 0);

    this.#container.add(this.#choicesText);
    this.#showingChoices = true;
  }

  updateChoiceSelection(currentSelection) {
    if (this.#choicesText && this.#currentChoices.length > 0) {
      const choicesText = this.#currentChoices
        .map((choice, index) => {
          const prefix = currentSelection === index ? '▶ ' : '  ';
          return prefix + choice.text;
        })
        .join('\n');
      this.#choicesText.setText(choicesText);
    }
  }

  clearChoices() {
    if (this.#choicesText) {
      this.#choicesText.destroy();
      this.#choicesText = null;
    }
    this.#choiceButtons.forEach(({ rect, text }) => {
      rect.destroy();
      text.destroy();
    });
    this.#choiceButtons = [];
    this.#currentChoices = [];
    this.#showingChoices = false;
  }

  #createPlayerInputCursor() {
    const y = this.#height - 24;
    if (this.#scene.textures.exists(UI_ASSET_KEYS.CURSOR)) {
      this.#userInputCursor = this.#scene.add.image(this.#width - 16, y, UI_ASSET_KEYS.CURSOR);
      this.#userInputCursor.setAngle(90).setScale(4.5, 2);
      console.debug('[DialogUi] using image cursor asset');
    } 
    
    else {
      this.#userInputCursor = this.#scene.add.text(this.#width - 16, y, '▶', {
        fontSize: '28px',
        color: 'black',
      }).setOrigin(0.5, 0.5);
      console.debug('[DialogUi] cursor image not found — using text fallback');
    }

    this.#userInputCursorTween = this.#scene.add.tween({
      delay: 0,
      duration: 500,
      repeat: -1,
      y: {
        from: y,
        start: y,
        to: y + 6,
      },
      targets: this.#userInputCursor,
    });
    this.#userInputCursorTween.pause();
    this.#container.add(this.#userInputCursor);
  }

  skipTextAnimation() {
    if (this.#textAnimationPlaying && this.#currentTextAnimationEvent) {
      this.#currentTextAnimationEvent.remove();
      this.#uiText.setText(this.#currentMessageBeingAnimated);
      this.#textAnimationPlaying = false;
      this.#currentTextAnimationEvent = undefined;
    }
  }

  #animateText(target, text, config) {
    const length = text.length;
    let i = 0;
    return this.#scene.time.addEvent({
      callback: () => {
        target.text += text[i];
        ++i;
        if (i === length - 1 && config?.callback) {
          config.callback();
        }
      },
      repeat: length - 1,
      delay: 25,
    });
  }
}
