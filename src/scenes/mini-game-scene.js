import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { MINI_GAME_ASSETS_KEYS } from '../assets/asset-keys.js';
import { Control } from '../utils/control.js';

export class MiniGameScene extends Phaser.Scene {
  #control;
  
  constructor() {
    super({ key: SCENE_KEYS.MINI_GAME_SCENE });
  }

  init() {
    this.workPoints = 50;
    this.lifePoints = 50;
    this.balance = 50;
    this.score = 0;
    this.chosenChoices = [];  
    this.#control = new Control(this);
  }

  create() {
    console.log(`[${MiniGameScene.name}:create] invoked`);

    this.bgImage = this.add.image(512, 288, MINI_GAME_ASSETS_KEYS.MINI_GAME_BACKGROUND).setOrigin(0.5).setDisplaySize(1024, 576).setDepth(-1);

    this.messageText = this.add.text(512, 208, '', { fontSize: '24px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    this.player = this.add.sprite(512, 288, MINI_GAME_ASSETS_KEYS.MINI_GAME_CHARACTERS, 0) 
      .setScale(2).setDepth(10).setOrigin(0.5, 0.5);

    // description container
    this.descriptionContainer = this.add.container(40, 18).setDepth(15);
    const descriptionContainerBg = this.add.rectangle(0, 0, 944, 120, 0x1a1a1a).setOrigin(0);
    descriptionContainerBg.setStrokeStyle(3, 0x444444).setAlpha(0.7);
    this.descriptionText = this.add.text(20, 20, '', { fontSize: '20px', color: '#ffffff', wordWrap: { width: 944 - 40 } }).setOrigin(0, 0);
    this.descriptionContainer.add([descriptionContainerBg, this.descriptionText]);

    // balance and labels
    this.balanceRect = this.add.graphics({ x: 512, y: 288 });
    this.workLabel = this.add.text(this.balanceRect.x - 250, this.balanceRect.y, 'Work', {
        fontSize: '24px', color: '#ff6666', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);
    this.lifeLabel = this.add.text(this.balanceRect.x + 250, this.balanceRect.y, 'Life', {
        fontSize: '24px', color: '#66ff66', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);

    // balance center text
    this.balanceText = this.add.text(this.balanceRect.x, this.balanceRect.y + 30, `Balance: ${this.balance}%`, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.balanceText.setDepth(12);

    // content box of choices
    this.contentContainer = this.add.container(40, 376);
    this.contentText = this.add.text(20, 20, '', { fontSize: '28px', color: '#ffffff', wordWrap: { width: 864 - 40 } }).setOrigin(0, 0);
    this.contentContainer.add(this.contentText);
    this.contentContainer.setDepth(20);

    // choice buttons 
    this.choiceButtons = [];
    this.choiceContainer = this.add.container(0, 0);
    this.choicesVisible = false;

    // targets to hide when popup message shows
    this.hideMessage = [
      this.descriptionContainer,
      this.contentContainer,
      this.choiceContainer,
      this.balanceRect,
      this.balanceText,
      this.messageText,
    ];

    this.scenarios = this.cache.json.get(MINI_GAME_ASSETS_KEYS.MINI_GAME_SCENARIOS) || [];
    if (!this.scenarios.length) {
      console.warn(`${MiniGameScene.name}: No scenarios found in the JSON data.`);
    }
    this.updatePlayerDirection();

    // background music
    this.backgroundMusic = this.sound.add(MINI_GAME_ASSETS_KEYS.MINI_GAME_MUSIC, {
        loop: true, volume: 0.4, mute: false });
    this.backgroundMusic.setRate(0.7);
    this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (!this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
        }
    });

    // sound effect
    this.popupSound = this.sound.add(MINI_GAME_ASSETS_KEYS.MINI_GAME_POPUP_SOUND, { volume: 0.5 });
    this.drawBalanceScale();

    this.currentScenario = 0;
    this.choiceButtons = [];
    this.showStartScreen();
  }

  shutdown() {
      if (this.backgroundMusic) {
          this.backgroundMusic.stop();
      }
  }

  showPopupMessage(message, duration = 2000) {
    this._popupVisibility = this._popupVisibility || new Map();
    const safeTargets = (this.hideMessage || []).filter(Boolean);
    safeTargets.forEach(t => {
      this._popupVisibility.set(t, t.visible);
      t.setVisible(false);
    });

    const overlay = this.add.rectangle(0, 0, 1024, 576, 0x000000, 0.4).setOrigin(0).setDepth(1000);
    const popupBg = this.add.rectangle(512, 288, 864, 200, 0x111111)
      .setStrokeStyle(3, 0x444444).setDepth(1001).setAlpha(0);
    const popupText = this.add.text(512, 288, message, { 
      fontSize: '28px', color: '#ffffff', align: 'center', wordWrap: { width: 864 - 40 } 
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);

    this.tweens.add({ targets: [popupBg, popupText], alpha: 1, duration: 200, ease: 'Cubic.easeOut' });

    this.time.delayedCall(duration, () => {
      safeTargets.forEach(t => {
        const prevVisibility = this._popupVisibility.get(t);
        if (typeof prevVisibility === 'boolean') t.setVisible(prevVisibility);
      });
      overlay.destroy();
      popupBg.destroy();
      popupText.destroy();
    });
  }

  showStartScreen() {
    const { width: w, height: h } = this.scale;
    this._startStarted = false;

    this.#hideGameUI();

    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.35).setOrigin(0).setDepth(1000);
    const panel = this.#createStartPanel();
    
    const startHandler = () => this.#startGame(overlay, panel);
    const { startBg, startText } = this.#addStartButton(panel, startHandler);
    
    overlay.setInteractive({ useHandCursor: true }).on('pointerdown', startHandler);
    
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (spaceKey) spaceKey.once('down', startHandler);

    this._startScreen = { overlay, panel, startBg, startText, spaceKey };
  }

  drawBalanceScale() {
    this.balanceRect.clear();

    // Left bar: Work (red)
    this.balanceRect.fillStyle(0xff0000, 1);
    this.balanceRect.fillRect(-200, -10, 200, 20);

    // Right bar: Life (green)
    this.balanceRect.fillStyle(0x00ff00, 1);
    this.balanceRect.fillRect(0, -10, 200, 20);

    const pos = (this.balance / 100) * 400 - 200;

    // arrow indicator
    this.balanceRect.fillStyle(0xffffff, 1);
    this.balanceRect.fillTriangle(pos - 10, -30, pos + 10, -30, pos, -10);
    this.balanceRect.lineStyle(2, 0x222222, 0.8);
    this.balanceRect.strokeTriangle(pos - 10, -30, pos + 10, -30, pos, -10);

    // update player position
    if (this.player) {
        this.player.setPosition(this.balanceRect.x + pos, this.balanceRect.y - 58);
    }

    if (this.balanceText) {
        this.balanceText.setText(`Balance: ${this.balance}%`);
    }

    this.updatePlayerDirection();
  }

  updatePlayerDirection() {
    if (!this.player) return;

    let frame = 0;

    if (this.balance < 50) frame = 2; // left
    else if (this.balance > 50) frame = 0; // right
    else frame = 3; // front
    
    this.player.setFrame(frame);
 }

  showScenario() {
    if (this.currentScenario >= this.scenarios.length) {
      this.showEndScreen();
      return;
    }

    const scenario = this.scenarios[this.currentScenario];
    this.descriptionText.setText(scenario.description);
    this.clearChoices();
    this.createChoiceButtons(scenario);
    this.choicesVisible = true;
  }

  createChoiceButtons(scenario) {
    if (!scenario || !scenario.choices) return;
    this.clearChoices();
    const area = { x: 40, y: 376, w: 944, h: 160 };
    const btnWidth = Math.max(area.w - 40, 120);

    scenario.choices.forEach((choice, index) => {
      const btnBg = this.add.rectangle(area.x, area.y + index * 64, btnWidth, 56, 0x222222
      ).setOrigin(0, 0.5).setStrokeStyle(3, 0x444444).setAlpha(0.7);

      const btnText = this.add.text(area.x + 16, area.y + index * 64, choice.text, { fontSize: '28px', color: '#ffffff', fontFamily: 'Courier' }).setOrigin(0, 0.5);
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x2a2a2a));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x222222));
      btnBg.on('pointerdown', () => this.makeChoice(choice, scenario.description));
      this.choiceContainer.add([btnBg, btnText]);
      this.choiceButtons.push(btnBg, btnText);
    });
    this.choiceContainer.setDepth(25);
  }

  clearChoices() {
    if (this.choiceButtons && this.choiceButtons.length) {
      this.choiceButtons.forEach(c => { if (c && c.destroy) c.destroy(); });
      this.choiceButtons.length = 0;
    }
    if (this.choiceContainer) this.choiceContainer.removeAll(true);
  }

  // provide choice selection
  makeChoice(choice, scenarioDesc) {
    this.#updateGameState(choice);
    this.#calculateBalance();
    this.drawBalanceScale();

    this.#showChoiceFeedback(choice);

    const message = this.#getBalanceMessage();
    this.showPopupMessage(message, 2000);

    this.popupSound.play();

    this.chosenChoices.push(`${scenarioDesc} -> ${choice.text}`);
    this.clearChoices();
    this.choicesVisible = false;

    this.currentScenario++;
    this.time.delayedCall(1000, this.showScenario, [], this);
  }

  showEndScreen() {
    const { width: w, height: h } = this.scale;
    const overlay = this.add.rectangle(0, 0, w, h, 0xffffff, 0.9).setOrigin(0).setDepth(1000);

    const panel = this.#createEndPanel();
    const returnButton = this.#addReturnButton(panel);

    this._endScreen = { overlay, panel, returnButton };
  }

  // hide game ui elements
  #hideGameUI() {
    this.visibility = this.visibility || new Map();
    const safeTargets = (this.hideMessage || []).filter(Boolean);
    safeTargets.forEach(t => {
      try {
        const prevVisibility = (typeof t.visible !== 'undefined') ? t.visible : true;
        this.visibility.set(t, prevVisibility);
        if (typeof t.setVisible === 'function') t.setVisible(false);
        else if (typeof t.visible !== 'undefined') t.visible = false;
      } catch (e) {}
    });
  }

  #restoreGameUI() {
    const safeTargets = (this.hideMessage || []).filter(Boolean);
    safeTargets.forEach(t => {
      const prevVisibility = this.visibility.get(t);
      if (typeof prevVisibility === 'boolean') {
        try {
          if (typeof t.setVisible === 'function') t.setVisible(prevVisibility);
          else if (typeof t.visible !== 'undefined') t.visible = prevVisibility;
        } catch (e) {}
      }
    });
  }

  #createStartPanel() {
    const panel = this.add.container(512,288).setDepth(1001);
    const panelBg = this.add.rectangle(0, 0, 864, 376, 0x111111)
      .setStrokeStyle(3, 0x444444).setOrigin(0.5).setAlpha(0.6);
    panel.add(panelBg);

    const title = this.add.text(0, -376 / 2 + 40, 'Welcome', { 
      fontSize: '32px', color: '#ffffff' 
    }).setOrigin(0.5);
    panel.add(title);

    this.#addGameRules(panel);
    return panel;
  }

  #addGameRules(panel) {
    const rules = [
      'Game Rules:',
      '1) The scenario will be presented by a description and choices.',
      '2) Each choice will affect work / life points and overall balance.',
      '3) Simply press the choice button to make your selection.',
      '4) Keep in balance to achieve the best outcome!',
    ];
    
    rules.forEach((rule, index) => { 
      const ruleText = this.add.text(-864 / 2 + 30, -98 + index * 30, rule, { fontSize: '20px', color: '#ffffff', align: 'left' }).setOrigin(0, 0);
      panel.add(ruleText);
    });
  }

  #addStartButton(panel, startHandler) {
    const startBg = this.add.rectangle(0, 376 / 2 - 70, 220, 48, 0x2a6fbd)
      .setOrigin(0.5).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
    const startText = this.add.text(startBg.x, startBg.y, 'Start Game', { 
      fontSize: '20px', color: '#ffffff' 
    }).setOrigin(0.5);

    startBg.on('pointerdown', startHandler);
    panel.add([startBg, startText]);
    
    return { startBg, startText };
  }

  #startGame(overlay, panel) {
    if (this._startStarted) return;
    this._startStarted = true;

    this.#restoreGameUI();
    overlay.destroy();
    panel.destroy();
    this.showScenario();
  }

  #updateGameState(choice) {
    this.workPoints += choice.work;
    this.lifePoints += choice.life;
    this.score += Math.abs(choice.work) + Math.abs(choice.life);

    if (choice.work >= 0 && choice.life >= 0) this.streak++;
    else this.streak = 0;

    this.level = Math.floor(this.currentScenario / 2) + 1;
  }

  #calculateBalance() {
    const total = Math.abs(this.workPoints) + Math.abs(this.lifePoints) + 1;
    this.balance = Math.round((Math.max(this.lifePoints, 0) / total) * 100);
    this.balance = Phaser.Math.Clamp(this.balance, 0, 100);
  }

  #showChoiceFeedback(choice) {
    const changeTexts = [];
    if (choice.work !== 0) {
      changeTexts.push(choice.work > 0 ? `+${choice.work} Work` : `${choice.work} Work`);
    }
    if (choice.life !== 0) {
      changeTexts.push(choice.life > 0 ? `+${choice.life} Life` : `${choice.life} Life`);
    }

    if (changeTexts.length === 0) return;

    const changeMessage = changeTexts.join('          ');
    const popUp = this.add.text(512, 100, changeMessage, { 
      fontSize: '32px', color: '#ffff00', fontStyle: 'bold' 
    }).setOrigin(0.5);
    
    this.tweens.add({ 
      targets: popUp, y: 50, alpha: 0, duration: 2000, 
      onComplete: () => popUp.destroy() 
    });
  }

  #getBalanceMessage() {
    if (this.balance < 30) return 'You need to take rest!';
    if (this.balance > 70) return 'Focus more on work?';
    return 'Well done!';
  }

  #createEndPanel() {
    const panel = this.add.container(512, 288).setDepth(1001);
    const panelBg = this.add.rectangle(0, 0, 864, 376, 0x111111)
      .setStrokeStyle(3, 0x444444).setOrigin(0.5);
    panel.add(panelBg);

    const title = this.add.text(0, -148, 'Game End', { 
      fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    panel.add(title);

    this.#addGameStats(panel);
    return panel;
  }

  #addGameStats(panel) {
    const style = { fontSize: '22px', color: '#ffffff' };

    panel.add(this.add.text(-360, -98, `Total Score: ${this.score}`, style).setOrigin(0, 0));
    panel.add(this.add.text(0, -98, `Questions Answered: ${this.currentScenario}`, style).setOrigin(0, 0));
    panel.add(this.add.text(-360, -58, `Final Balance: ${this.balance}%`, style).setOrigin(0, 0));

    const finalMessage = this.#getFinalMessage();
    const messageText = this.add.text(0, 32, finalMessage, { 
      fontSize: '24px', color: '#ffff00', fontStyle: 'bold', wordWrap: { width: 564} 
    }).setOrigin(0.5);
    panel.add(messageText);
  }

  #getFinalMessage() {
    if (this.balance < 30) return 'You should take a quick rest and reschedule with more leisure time!';
    if (this.balance > 70) return 'You are too relaxed! Please study more and focus on work!';
    return 'Please keep the good balance between work and life!';
  }

  #addReturnButton(panel) {
    const returnButton = this.add.rectangle(0, 128, 220, 48, 0x2a6fbd)
      .setOrigin(0.5).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
    const returnText = this.add.text(0, 128, 'Go To World', { 
      fontSize: '20px', color: '#ffffff'}).setOrigin(0.5);

    returnButton.on('pointerdown', () => this.scene.start(SCENE_KEYS.WORLD_SCENE));
    panel.add([returnButton, returnText]);
    
    return returnButton;
  }
}

