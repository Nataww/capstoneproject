import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from './scene-keys.js';
import { MINI_GAME_ASSETS_KEYS } from '../assets/asset-keys.js';

export class MiniGameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MINI_GAME_SCENE });
  }

  init() {
    this.workPoints = 50;
    this.lifePoints = 50;
    this.balance = 50;
    this.score = 0;
    this.chosenChoices = [];  
  }


  create() {
    console.log(`[${MiniGameScene.name}:create] invoked`);
    const { width, height } = this.scale;

    this.bgImage = this.add.image(width / 2, height / 2, MINI_GAME_ASSETS_KEYS.MINI_GAME_BACKGROUND).setOrigin(0.5).setDisplaySize(width, height).setDepth(-1);

    this.messageText = this.add.text(width / 2, height - 80, '', { fontSize: '24px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    this.playerSprite = this.add.sprite(this.scale.width / 2, this.scale.height / 2, MINI_GAME_ASSETS_KEYS.MINI_GAME_CHARACTERS, 0) // add frame 0
      .setScale(2)  
      .setDepth(10)
      .setOrigin(0.5, 0.5);

    // Content box for scenario description
    const descBoxW = width - 80;
    const descBoxH = 120;
    console.log('descBoxW:', descBoxW, 'descBoxH:', descBoxH);
    this.descContainer = this.add.container(40, 18);
    const descBoxBg = this.add.rectangle(0, 0, descBoxW, descBoxH, 0x1a1a1a).setOrigin(0);
    descBoxBg.setStrokeStyle(3, 0x444444);
    descBoxBg.setAlpha(0.7);
    this.descText = this.add.text(20, 20, '', { fontSize: '20px', color: '#ffffff', wordWrap: { width: descBoxW - 40 } }).setOrigin(0, 0);
    this.descContainer.add([descBoxBg, this.descText]);
    this.descContainer.setDepth(15);

    // Balance Scale graphics
    this.balanceGraphics = this.add.graphics({ x: width / 2, y: height / 2 });
    
    // label for work or life
    this.workLabel = this.add.text(this.balanceGraphics.x - 250, this.balanceGraphics.y, 'Work', {
        fontSize: '24px', color: '#ff6666', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);
    this.lifeLabel = this.add.text(this.balanceGraphics.x + 250, this.balanceGraphics.y, 'Life', {
        fontSize: '24px', color: '#66ff66', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(12);

    // Centered balance value shown below the balance bar
    this.balanceCenterText = this.add.text(this.balanceGraphics.x, this.balanceGraphics.y + 30, `Balance: ${this.balance}%`, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.balanceCenterText.setDepth(12);

    // content box of choices
    const boxY = height - 200;
    const boxW = width - 80;
    const boxH = 160;
    console.log('boxW:', boxW, 'boxH:', boxH, 'boxY:', boxY);
    this.contentContainer = this.add.container(40, boxY);
    this.contentText = this.add.text(20, 20, '', { fontSize: '28px', color: '#ffffff', wordWrap: { width: boxW - 40 } }).setOrigin(0, 0);
    this.contentContainer.add(this.contentText);
    this.contentContainer.setDepth(20);

    this._choiceArea = { x: 40, y: boxY, w: boxW, h: boxH };

    // Container to hold choice buttons
    this.choiceButtons = [];
    this.choiceContainer = this.add.container(0, 0);
    this.choicesVisible = false;

    // track components to hide / show when showing a message popup
    this._messageHideTargets = [
      this.descContainer,
      this.contentContainer,
      this.choiceContainer,
      this.balanceGraphics,
      this.balanceCenterText,
      this.messageText,
    ];

    // Scenarios loaded from external JSON file
    this.scenarios = this.cache.json.get(MINI_GAME_ASSETS_KEYS.MINI_GAME_SCENARIOS) || [];
    if (!this.scenarios.length) {
      console.warn('No scenarios found in cache `scenarios` — defaulting to empty list.');
    }

    this.updatePlayerDirection();

    // Add background music
    this.backgroundMusic = this.sound.add(MINI_GAME_ASSETS_KEYS.MINI_GAME_MUSIC, {
        loop: true, volume: 0.4, mute: false });

    // Slow it down to half speed
    this.backgroundMusic.setRate(0.7);

    // Start playing after user interaction (required on mobile to avoid autoplay block)
    this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (!this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
        }
    });

    this.popupSound = this.sound.add(MINI_GAME_ASSETS_KEYS.MINI_GAME_POPUP_SOUND, { volume: 0.5 });
    this.drawBalanceScale();

    this.currentScenario = 0;
    this.choiceButtons = [];
    this.showStartScreen();
  }

  // stop the music when changing scenes
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
    const boxW = Math.min(700, w - 120);
    const boxH = 120;
    const popupBg = this.add.rectangle(w / 2, h / 2, boxW, boxH, 0x111111).setStrokeStyle(3, 0x444444).setDepth(1001);
    const popupText = this.add.text(w / 2, h / 2, message, { fontSize: '28px', color: '#ffffff', align: 'center', wordWrap: { width: boxW - 40 } }).setOrigin(0.5).setDepth(1002);

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
    const boxW = Math.min(800, w - 120);
    const boxH = Math.min(420, h - 200);
    const panel = this.add.container(w / 2, h / 2).setDepth(1001);
    const panelBg = this.add.rectangle(0, 0, boxW, boxH, 0x111111).setStrokeStyle(3, 0x444444).setOrigin(0.5);
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

    const rulesX = -boxW / 2 + 30;
    let ry = -boxH / 2 + 70;
    const ruleStyle = { fontSize: '18px', color: '#ffffff', wordWrap: { width: boxW - 80 } };
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
      if (this._startStarted) return; // ignore duplicate triggers
      this._startStarted = true;

      try {
        safeTargets.forEach(t => {
          try {
            const prev = this._startPrevVisibility.get(t);
            if (typeof prev === 'boolean') {
              if (typeof t.setVisible === 'function') t.setVisible(prev);
              else if (typeof t.visible !== 'undefined') t.visible = prev;
            }
          } catch (e) {}
        });
        // background remains visible; nothing to restore for bgImage
      } catch (e) {}

      // remove start UI and begin scenarios
      try { overlay.destroy(); } catch (e) {}
      try { panel.destroy(true); } catch (e) {}

      // detach listeners now that the game is starting
      if (this._startScreen && this._startScreen.spaceKey) {
        try { this._startScreen.spaceKey.off('down', startHandler); } catch (e) {}
      }

      this.showScenario();
    };

    startBg.on('pointerdown', startHandler);
    panel.add([startBg, startText]);

    // allow clicking the overlay to start as well (helps touch users)
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', startHandler);

    // space bar to start
    const spaceKey = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) : null;
    if (spaceKey) spaceKey.once('down', startHandler);

    this._startScreen = { overlay, panel, startBg, startText, spaceKey };
  }

  drawBalanceScale() {
    this.balanceGraphics.clear();

    // Left bar: Work (red)
    this.balanceGraphics.fillStyle(0xff0000, 1);
    this.balanceGraphics.fillRect(-200, -10, 200, 20);

    // Right bar: Life (green)
    this.balanceGraphics.fillStyle(0x00ff00, 1);
    this.balanceGraphics.fillRect(0, -10, 200, 20);

    const pos = (this.balance / 100) * 400 - 200;

    // Arrow triangle
    this.balanceGraphics.fillStyle(0xffffff, 1);
    this.balanceGraphics.fillTriangle(pos - 10, -30, pos + 10, -30, pos, -10);
    this.balanceGraphics.lineStyle(2, 0x222222, 0.8);
    this.balanceGraphics.strokeTriangle(pos - 10, -30, pos + 10, -30, pos, -10);

    // Position player sprite on the arrow
    if (this.playerSprite) {
        this.playerSprite.setPosition(this.balanceGraphics.x + pos, this.balanceGraphics.y - 58);
    }

    if (this.balanceCenterText) {
        this.balanceCenterText.setText(`Balance: ${this.balance}%`);
    }

    this.updatePlayerDirection();
}

  updatePlayerDirection() {
    if (!this.playerSprite) return;

    let frame = 0;

    if (this.balance < 50) frame = 2; // left
    else if (this.balance > 50) frame = 0; // right
    else frame = 3; // front
    
    this.playerSprite.setFrame(frame);
 }

  showScenario() {
    if (this.currentScenario >= this.scenarios.length) {
      this.showEndScreen();
      return;
    }

    const scenario = this.scenarios[this.currentScenario];
    this.descText.setText(scenario.description);
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
    if (this.balance < 30) message = 'Uh-oh, too much work!';
    else if (this.balance > 70) message = 'Enjoying life a bit too much?';
    else message = "You're crushing it!";
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
    const boxW = Math.min(800, w - 100);
    const boxH = Math.min(500, h - 150);
    const panel = this.add.container(w / 2, h / 2).setDepth(1001);
    const panelBg = this.add.rectangle(0, 0, boxW, boxH, 0x111111).setStrokeStyle(3, 0x444444).setOrigin(0.5);
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

    const maxLines = Math.floor((boxH - (y + 80 + boxH / 2)) / 28) || 6;
    if (this.chosenChoices.length > 0) {
      const choicesTitle = this.add.text(-360, y + 80, 'Your Choices:', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0);
      panel.add(choicesTitle);
    }
    else {
      const noChoicesText = this.add.text(-360, y + 80, 'No choices were made.', { fontSize: '20px', color: '#ffffff' }).setOrigin(0, 0);
      panel.add(noChoicesText);
    }
   
    // provide some items to express the work-life balance journey

    // Button area: Restart and Go To World
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

