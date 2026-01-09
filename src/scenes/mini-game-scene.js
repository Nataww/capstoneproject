import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { MINI_GAME_ASSETS_KEYS } from '../assets/asset-keys.js';
import { Control } from '../utils/data.js';

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
    this.#control = new Control();
  }


  create() {
    console.log(`[${MiniGameScene.name}:create] invoked`);
    const { width, height } = this.scale;

    this.bgImage = this.add.image(width / 2, height / 2, MINI_GAME_ASSETS_KEYS.MINI_GAME_BACKGROUND).setOrigin(0.5).setDisplaySize(width, height).setDepth(-1);

    this.messageText = this.add.text(width / 2, height - 80, '', { fontSize: '24px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    this.player = this.add.sprite(this.scale.width / 2, this.scale.height / 2, MINI_GAME_ASSETS_KEYS.MINI_GAME_CHARACTERS, 0) 
      .setScale(2)  
      .setDepth(10)
      .setOrigin(0.5, 0.5);

    // container for description 
    this.descriptionContainer = this.add.container(40, 18).setDepth(15);
    const descriptionContainerBg = this.add.rectangle(0, 0, 944, 120, 0x1a1a1a).setOrigin(0);
    descriptionContainerBg.setStrokeStyle(3, 0x444444).setAlpha(0.7);
    this.descriptionText = this.add.text(20, 20, '', { fontSize: '20px', color: '#ffffff', wordWrap: { width: 944 - 40 } }).setOrigin(0, 0);
    this.descriptionContainer.add([descriptionContainerBg, this.descriptionText]);

    // balance and labels
    this.balanceRect = this.add.graphics({ x: width / 2, y: height / 2 });
    this.workLabel = this.add.text(this.balanceRect.x - 250, this.balanceRect.y, 'Work', {
        fontSize: '24px', color: '#ff6666', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);
    this.lifeLabel = this.add.text(this.balanceRect.x + 250, this.balanceRect.y, 'Life', {
        fontSize: '24px', color: '#66ff66', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);

    // Centered balance value shown below the balance bar
    this.balanceCenterText = this.add.text(this.balanceRect.x, this.balanceRect.y + 30, `Balance: ${this.balance}%`, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.balanceCenterText.setDepth(12);

    // content box of choices
    this.contentContainer = this.add.container(40, 376);
    this.contentText = this.add.text(20, 20, '', { fontSize: '28px', color: '#ffffff', wordWrap: { width: 864 - 40 } }).setOrigin(0, 0);
    this.contentContainer.add(this.contentText);
    this.contentContainer.setDepth(20);

    this._choiceArea = { x: 40, y: 376, w: 864, h: 160 };

    // Container to hold choice buttons
    this.choiceButtons = [];
    this.choiceContainer = this.add.container(0, 0);
    this.choicesVisible = false;

    // track components to hide / show when showing a message popup
    this._messageHideTargets = [
      this.descContainer,
      this.contentContainer,
      this.choiceContainer,
      this.balanceRect,
      this.balanceCenterText,
      this.messageText,
    ];

    this.scenarios = this.cache.json.get(MINI_GAME_ASSETS_KEYS.MINI_GAME_SCENARIOS) || [];
    if (!this.scenarios.length) {
      console.warn('${MiniGameScene.name}: No scenarios found in the loaded data.');
    }
    this.updatePlayerDirection();

    // Add background music
    this.backgroundMusic = this.sound.add(MINI_GAME_ASSETS_KEYS.MINI_GAME_MUSIC, {
        loop: true, volume: 0.4, mute: false });
    this.backgroundMusic.setRate(0.7);
    this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (!this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
        }
    });

    // Add sound effect
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
    this._prevVisibility = this._prevVisibility || new Map();
    const safeTargets = (this._messageHideTargets || []).filter(Boolean);
    safeTargets.forEach(t => {
      this._prevVisibility.set(t, t.visible);
      t.setVisible(false);
    });
    
    const w = this.scale.width;
    const h = this.scale.height;
    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.4).setOrigin(0).setDepth(1000);
    const popupBg = this.add.rectangle(w / 2, h / 2, 864, boxH, 0x111111).setStrokeStyle(3, 0x444444).setDepth(1001);
    const popupText = this.add.text(w / 2, h / 2, message, { fontSize: '28px', color: '#ffffff', align: 'center', wordWrap: { width: 864 - 40 } }).setOrigin(0.5).setDepth(1002);

    // simple tween for pop-in
    popupBg.alpha = 0;
    popupText.alpha = 0;
    this.tweens.add({ targets: [popupBg, popupText], alpha: 1, duration: 200, ease: 'Cubic.easeOut' });

    // after duration restore previous visibility and destroy popup elements
    this.time.delayedCall(duration, () => {
      safeTargets.forEach(t => {
        const prev = this._prevVisibility.get(t);
        if (typeof prev === 'boolean') t.setVisible(prev);
      });
      overlay.destroy();
      popupBg.destroy();
      popupText.destroy();
    });
  }

  showStartScreen() {
    const w = this.scale.width;
    const h = this.scale.height;
    
    this._startStarted = false;

    // Hide known components so start screen is the only visible UI.
    this._startPrevVisibility = this._startPrevVisibility || new Map();
    const safeTargets = (this._messageHideTargets || []).filter(Boolean);
    safeTargets.forEach(t => {
      try {
        const prev = (typeof t.visible !== 'undefined') ? t.visible : true;
        this._startPrevVisibility.set(t, prev);
        if (typeof t.setVisible === 'function') t.setVisible(false);
        else if (typeof t.visible !== 'undefined') t.visible = false;
      } catch (e) {}
    });

    // translucent overlay so the game content remains visible beneath
    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.35).setOrigin(0).setDepth(1000);

    // center container (slightly transparent panel)
    const boxH = Math.min(420, h - 200);
    const panel = this.add.container(w / 2, h / 2).setDepth(1001);
    const panelBg = this.add.rectangle(0, 0, 864, boxH, 0x111111).setStrokeStyle(3, 0x444444).setOrigin(0.5);
    panelBg.setAlpha(0.6);
    panel.add(panelBg);

    const title = this.add.text(0, -boxH / 2 + 40, 'Welcome', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    panel.add(title);

    // Game rules text
    const rules = [
      'Game Rules:',
        '1) The scenario will be presented by a description and choices.',
        '2) Each choice will affect work / life points and overall balance.',
        '3) Simply press the choice button to make your selection.',
        '4) Keep in balance to achieve the best outcome!',
    ];

    const rulesX = -864 / 2 + 30;
    let ry = -boxH / 2 + 70;
    const ruleStyle = { fontSize: '18px', color: '#ffffff', wordWrap: { width: 864 - 80 } };
    rules.forEach((line) => {
      const t = this.add.text(rulesX, ry, line, ruleStyle).setOrigin(0, 0);
      panel.add(t);
      ry += 40;
    });

    // Start Game button
    const startBg = this.add.rectangle(0, boxH / 2 - 70, 220, 52, 0x2a6fbd).setOrigin(0.5).setStrokeStyle(2, 0xffffff);
    const startText = this.add.text(startBg.x, startBg.y, 'Start Game', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    startBg.setInteractive({ useHandCursor: true });

    const startHandler = () => {
      if (this._startStarted) return;
      this._startStarted = true;

      // restore previous visibility
      safeTargets.forEach(t => {
        const prev = this._startPrevVisibility.get(t);
        if (typeof prev === 'boolean') {
          try {
            if (typeof t.setVisible === 'function') t.setVisible(prev);
            else if (typeof t.visible !== 'undefined') t.visible = prev;
          } catch (e) {}
        }
      });

      // destroy start screen elements
      overlay.destroy();
      panel.destroy();

      // start the first scenario
      this.showScenario();
    }

    startBg.on('pointerdown', startHandler);
    panel.add([startBg, startText]);

    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', startHandler);

    // space bar to start
    const spaceKey = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) : null;
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

    // Arrow triangle
    this.balanceRect.fillStyle(0xffffff, 1);
    this.balanceRect.fillTriangle(pos - 10, -30, pos + 10, -30, pos, -10);
    this.balanceRect.lineStyle(2, 0x222222, 0.8);
    this.balanceRect.strokeTriangle(pos - 10, -30, pos + 10, -30, pos, -10);

    // Position player sprite on the arrow
    if (this.player) {
        this.player.setPosition(this.balanceRect.x + pos, this.balanceRect.y - 58);
    }

    if (this.balanceCenterText) {
        this.balanceCenterText.setText(`Balance: ${this.balance}%`);
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
    const area = this._choiceArea || { x: 40, y: this.scale.height - 200, w: this.scale.width - 80, h: 160 };
    const startX = area.x + 20;
    const startY = area.y + 20;
    const btnWidth = Math.max(area.w - 40, 120);

    scenario.choices.forEach((choice, index) => {
      const cx = startX;
      const cy = startY + index * 64;
      const btnBg = this.add.rectangle(cx, cy, btnWidth, 56, 0x222222).setOrigin(0, 0.5);
      btnBg.setStrokeStyle(3, 0x444444);
      btnBg.setAlpha(0.7);
      const btnText = this.add.text(cx + 16, cy, choice.text, { fontSize: '28px', color: '#ffffff', fontFamily: 'Courier' }).setOrigin(0, 0.5);
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

  makeChoice(choice, scenarioDesc) {
    this.workPoints += choice.work;
    this.lifePoints += choice.life;
    this.score += Math.abs(choice.work) + Math.abs(choice.life);

    if (choice.work >= 0 && choice.life >= 0) this.streak++;
    else this.streak = 0;

    this.level = Math.floor(this.currentScenario / 2) + 1;

    const total = Math.abs(this.workPoints) + Math.abs(this.lifePoints) + 1;
    this.balance = Math.round((Math.max(this.lifePoints, 0) / total) * 100);
    this.balance = Phaser.Math.Clamp(this.balance, 0, 100);
    this.drawBalanceScale();

    // show the increase / decrease of work / life scores
    const changeTexts = [];
    if (choice.work !== 0) {
      const wpChange = choice.work > 0 ? `+${choice.work} Work` : `${choice.work} Work`;
      changeTexts.push(wpChange);
    }
    if (choice.life !== 0) {
      const lpChange = choice.life > 0 ? `+${choice.life} Life` : `${choice.life} Life`;
      changeTexts.push(lpChange);
    }

    // show popup message on left and right side of screen
    const changeMessage = changeTexts.join('          ');
    
    const popUp = this.add.text(this.scale.width / 2, 100, changeMessage, { fontSize: '32px', color: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: popUp, y: 50, alpha: 0, duration: 2000, onComplete: () => popUp.destroy() });

    let message = '';
    if (this.balance < 30) message = 'You need to take rest!';
    else if (this.balance > 70) message = 'Focus more on work?';
    else message = "Well done!";
    this.showPopupMessage(message, 2000);
    this.popupSound.play();

    this.chosenChoices.push(`${scenarioDesc} -> ${choice.text}`);

    // Clear any visible choices and reset toggle
    this.clearChoices();
    this.choicesVisible = false;

    this.currentScenario++;
    this.time.delayedCall(1000, this.showScenario, [], this);
  }

  showEndScreen() {
    const w = this.scale.width;
    const h = this.scale.height;
    console.log('w:', w, 'h:', h);
    const overlay = this.add.rectangle(0, 0, 1024, 576, 0xffffff, 0.9).setOrigin(0).setDepth(1000);

    // centered info box
    const boxH = Math.min(500, h - 150);
    const panel = this.add.container(w / 2, h / 2).setDepth(1001);
    const panelBg = this.add.rectangle(0, 0, 864, boxH, 0x111111).setStrokeStyle(3, 0x444444).setOrigin(0.5);
    panelBg.setAlpha(1);
    panel.add(panelBg);

    // Title
    const title = this.add.text(0, -boxH / 2 + 40, 'Game End', { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    panel.add(title);

    // Stats
    let y = -boxH / 2 + 90;
    const statStyle = { fontSize: '22px', color: '#ffffff' };
    const scoreText = this.add.text(-360, y, `Total Score: ${this.score}`, statStyle).setOrigin(0, 0);
    panel.add(scoreText);

    const questionsText = this.add.text(0, y, `Questions Answered: ${this.currentScenario}`, statStyle).setOrigin(0, 0);
    panel.add(questionsText);
    
    const balanceText = this.add.text(-360, y + 40, `Final Balance: ${this.balance}%`, statStyle).setOrigin(0, 0);
    panel.add(balanceText);

    // if the balance larger than 70 or less than 30, show a message
    let finalMessage = '';
    if (this.balance < 30) finalMessage = 'You should take a quick rest and reschedule with more leisure time!';
    else if (this.balance > 70) finalMessage = 'You are too relaxed! Please study more and focus on work!';
    else finalMessage = "Please keep the good balance between work and life!";

    const messageText = this.add.text(0, y + 150, finalMessage, { fontSize: '24px', color: '#ffff00', fontStyle: 'bold', wordWrap: { width: 864 - 300 } }).setOrigin(0.5);
    panel.add(messageText);

    const btnY = boxH / 2 - 60;
    const btnW = 220;
    const btnH = 48;

    const goWorldBg = this.add.rectangle(0, btnY, btnW, btnH, 0x2a6fbd).setOrigin(0.5).setStrokeStyle(2, 0xffffff);
    const goWorldText = this.add.text(goWorldBg.x, goWorldBg.y, 'Go To World', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    console.log('Go To World button created at:', {
      x: goWorldBg.x - btnW / 2, y: goWorldBg.y - btnH / 2, width: btnW, height: btnH });

    goWorldBg.setInteractive({ useHandCursor: true });
    goWorldBg.on('pointerdown', () => {
      try { this.scene.start(SCENE_KEYS.WORLD_SCENE); } catch (e) { this.scene.start('WORLD_SCENE'); }
    });
    panel.add([goWorldBg, goWorldText]);

    this._endScreen = { overlay, panel, goWorldBg };
  }
}

