import { WORLD_ASSET_KEYS } from '../assets/asset-keys.js';
import { SCENE_KEYS } from './scene-keys.js';
import { Player } from '../world/player.js';
import { Control } from '../utils/control.js';
import { DIRECTION } from '../common/direction.js';
import { TILE_SIZE } from '../config.js';
import { DATA_MANAGER_STORE_KEYS, dataManager } from '../utils/data-manager.js';
import { getPosition } from '../utils/grid.js';
import { DialogUi } from '../world/dialog-ui.js';
import { NPC } from '../world/npc.js';
import { DataUtils } from '../utils/data.js';

// property of sign objects 
const SIGN_PROPERTY = Object.freeze({
  MESSAGE: 'message',
  REDIRECT_TO_APPLICATION: 'redirect_to_application',
});

// property of npc objects 
const TILED_NPC_PROPERTY = Object.freeze({
  MOVEMENT_PATTERN: 'movement_pattern',
  FRAME: 'frame',
  ID: 'ID',
});

export class WorldScene extends Phaser.Scene {
  #player;
  #npcs;
  #control;

  #encounterLayer;
  #signEncountered;
  #signLayer;
  #eventLayer;
  #triggeredEvents;

  #currentNPC;
  #currentSign;
  #currentNPCEvent;
  #currentChoice;
  #waitInput;
  #lastNPCIndex;
  #currentNpcOptions;

  #dialogUi;
  #showDialog;

  constructor() {
    super({
      key: SCENE_KEYS.WORLD_SCENE,
    });
  }

  init() {
    console.log(`[${WorldScene.name}:init] invoked`);
    this.#currentNPC = undefined;
    this.#currentSign = false;
    this.#currentChoice = 0;
    this.#currentNpcOptions = [];
    this.#currentNPCEvent = false;
    this.#waitInput = false;
    this.#lastNPCIndex = -1;
    this.#triggeredEvents = new Set();
    this.#showDialog = false;
  }

  create() {
    console.log(`[${WorldScene.name}:create] invoked`);

    const x = 30 * TILE_SIZE;
    const y = 20 * TILE_SIZE;

    this.cameras.main.setBounds(0, 0, 1280, 2176);
    this.cameras.main.setZoom(1.4);
    this.cameras.main.centerOn(x, y);

    // create map and collision layer
    const map = this.make.tilemap({ key: WORLD_ASSET_KEYS.WORLD_MAIN_LEVEL });
    this.add.image(0, 0, WORLD_ASSET_KEYS.WORLD_MAP, 0).setOrigin(0);

    // get collision tileset
    const collisionTiles = map.addTilesetImage('collision', WORLD_ASSET_KEYS.WORLD_COLLISION);
    if (!collisionTiles) {
      console.log(`[${WorldScene.name}:create] encountered error while creating collision tiles`);
      return;
    }
    const collisionLayer = map.createLayer('Collision', collisionTiles, 0, 0);
    if (!collisionLayer) {
      console.log(`[${WorldScene.name}:create] encountered error while creating collision layer`);
      return;
    }
    collisionLayer.setAlpha(0).setDepth(2);

    // get sign tileset
    this.#signLayer = map.getObjectLayer('Sign');
    if (!this.#signLayer) {
      console.log(`[${WorldScene.name}:create] encountered error while creating sign layer`);
      return;
    }
    console.log('Sign layer objects:', this.#signLayer.objects);

    // get event tileset
    this.#eventLayer = map.getObjectLayer('Events');
    if (this.#eventLayer) {
      console.log(`[${WorldScene.name}:create] encountered error while creating event layer`);
    }

    this.#createNPCs(map);

    this.#player = new Player({
      scene: this,
      position: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION),
      direction: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION),
      collisionLayer: collisionLayer,
      playerMovement: () => {
        this.#updatePlayerMovement();
      },
      checkCollision: this.#npcs,
    });
    this.cameras.main.startFollow(this.#player.sprite);

    this.#npcs.forEach((npc) => {
      npc.addCollision(this.#player);
    });

    // add background music
    this.backgroundMusic = this.sound.add(WORLD_ASSET_KEYS.WORLD_MUSIC, {
      loop: true, volume: 0.4, mute: false });
    this.backgroundMusic.setRate(0.7);
    this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      if (!this.backgroundMusic.isPlaying) {
        this.backgroundMusic.play();
      } 
    });

    this.#control = new Control(this);
    this.#dialogUi = new DialogUi(this, 1200);

    this.cameras.main.fadeIn(1000, 0, 0, 0);
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.GAME_STARTED, true);
  }

  update(time) {
    if (this.#signEncountered) {
      this.#player.update(time);
      return;
    }
    
    if (this.#waitInput) {
    
      const direction = this.#control.getJustDownKey();
      
      if (direction === DIRECTION.UP) {
        this.#currentChoice = Math.max(0, this.#currentChoice - 1);
        this.#dialogUi.updateChoiceSelection(this.#currentChoice);
      }
      
      else if (direction === DIRECTION.DOWN) {
        this.#currentChoice = Math.min(this.#currentNpcOptions.length - 1, this.#currentChoice + 1);
        this.#dialogUi.updateChoiceSelection(this.#currentChoice);
      }
      // get player input for redirect choice
      if (this.#control.getSpaceKeyPressed() || this.#control.getEnterKeyPressed()) {
        if (this.#currentNpcOptions.length === 0) return;

        const selectedChoice = this.#currentNpcOptions[this.#currentChoice];
        console.log(`Player chose: "${selectedChoice.text}"`);
        
        this.#waitInput = false;
        this.#dialogUi.clearChoices();
        this.#dialogUi.hideDialog();

        if (selectedChoice.nextIndex === 0) {
          if (this.#currentSign) {
            this.#currentSign = false;
            this.cameras.main.fadeOut(1000);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
              this.scene.start(SCENE_KEYS.APPLICATION_SCENE);
            });
          } else {
            this.cameras.main.fadeOut(1000);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
              this.scene.start(SCENE_KEYS.MINI_GAME_SCENE);
            });
          }
          return;
        }
        
        else if (selectedChoice.nextIndex === 1) {
          if (this.#currentSign) {
            this.#currentSign = false;
          }
          if (this.#currentNPC) {
            this.#currentNPC.isTalkingToPlayer = false;
            this.#currentNPC = undefined;
          }
          return;
        }
        
        if (selectedChoice.nextIndex !== undefined) {
          this.#lastNPCIndex = selectedChoice.nextIndex - 1;
        }
        this.#updateNpcInteraction();
        return;
      }
      return; 
    }

    if (this.#control.getHoldDownKey() !== DIRECTION.NONE && !this.#isPlayerInputLocked()) {
      this.#player.moveCharacter(this.#control.getHoldDownKey());
    }

    if ((this.#control.getSpaceKeyPressed() || this.#control.getEnterKeyPressed()) && !this.#player.isMoving) {
      this.#updatePlayerInteraction();
    }

    this.#player.update(time);
    this.#npcs.forEach((npc) => {
      npc.update(time);
    });
  }

  #updatePlayerInteraction() {
    if (this.#dialogUi.isAnimationPlaying) {
      this.#dialogUi.skipAnimation();
      return;
    }

    if (this.#dialogUi.isVisible && !this.#dialogUi.moreMessagesToShow) {
      if (this.#currentNPC) {

        const currentEvent = this.#currentNPC.events[this.#lastNPCIndex];
        if (currentEvent.type === 'MESSAGE' && currentEvent.data.isEnd) {
            this.#dialogUi.hideDialog();
            this.#currentNPC.isTalkingToPlayer = false;
            this.#currentNPC = undefined;
            this.#lastNPCIndex = -1;
            return;
        }

        this.#updateNpcInteraction();
      }

      if (this.#showDialog) {
        this.#dialogUi.hideDialog();
        this.#showDialog = false;
        return;
      }

      if (this.#currentSign) {
        this.#currentSign = false;
        this.#dialogUi.hideDialog();
      }
      return;
    }

    if (this.#dialogUi.isVisible && this.#dialogUi.moreMessagesToShow) {
      this.#dialogUi.showNextMessage();
      return;
    }

    const { x, y } = this.#player.sprite;
    const targetPosition = getPosition({ x, y }, this.#player.direction);
    const sign = this.#getSign(targetPosition);
    if (sign) {
      if (this.#redirectApplication(sign)) {
        this.#getRedirectChoice();
      }
      return;
    }

    const npcNearPlayer = this.#getNearNPCPositions(targetPosition);
    if (npcNearPlayer) {
      npcNearPlayer.facePlayer(this.#player.direction);
      npcNearPlayer.isTalkingToPlayer = true;
      this.#currentNPC = npcNearPlayer;
      this.#updateNpcInteraction();
      return;
    }
  }
  // update player movement and provide event check
  #updatePlayerMovement() {
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
      x: this.#player.sprite.x,
      y: this.#player.sprite.y,
    });
    
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION, this.#player.direction);

    this.#checkEvent();

    if (!this.#encounterLayer) return;

    const encounterZone =
      this.#encounterLayer.getTileAtWorldXY(this.#player.sprite.x, this.#player.sprite.y, true).index !== -1;
    if (!encounterZone) return;

    console.log(`[${WorldScene.name}:updatePlayerMovement] Player entered encounter zone`);
    this.#signEncountered = Math.random() < 0.2;
    if (this.#signEncountered) {
      this.cameras.main.fadeOut(2000);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE_KEYS.APPLICATION_SCENE);
      });
    }
  }

  // lock player input
  #isPlayerInputLocked() {
    return (
      this.#dialogUi.isVisible || this.#control.isInputLocked || this.#currentNPCEvent || this.#waitInput
    );
  }

  // create NPC with tilemap
  #createNPCs(map) {
    this.#npcs = [];
    const npcLayers = map.getObjectLayerNames().filter((layerName) => layerName.includes('NPC'));
    
    npcLayers.forEach((layerName) => {
      const layer = map.getObjectLayer(layerName);
      const npcObject = layer.objects.find((obj) => obj.type === 'npc');
      
      if (!npcObject?.x || !npcObject?.y) return;

      const properties = npcObject.properties || [];
      const npcId = properties.find((prop) => prop.name === TILED_NPC_PROPERTY.ID)?.value;
      if (!npcId) return;

      const npcPath = { 0: { x: npcObject.x, y: npcObject.y - TILE_SIZE } };
      layer.objects
        .filter((obj) => obj.type === 'npc_path' && obj.x && obj.y)
        .forEach((obj) => {
          npcPath[parseInt(obj.name, 10)] = { x: obj.x, y: obj.y - TILE_SIZE };
        });

      const npcData = DataUtils.getNpcData(this, npcId);
      const npcMovement = properties.find((prop) => prop.name === TILED_NPC_PROPERTY.MOVEMENT_PATTERN)?.value || 'IDLE';

      const npc = new NPC({
        scene: this,
        position: { x: npcObject.x, y: npcObject.y - TILE_SIZE },
        direction: DIRECTION.DOWN,
        frame: npcData.frame,
        npcPath,
        movementPattern: npcMovement,
        events: npcData.events,
      });

      npc.addCollision(this.#player);
      this.#npcs.push(npc);
    });
  }

  #updateNpcInteraction() {
    if (this.#currentNPCEvent || !this.#currentNPC) {
      return;
    }
    const eventsToProcess = this.#currentNPC.events;
    const isMoveEventsToProcess = eventsToProcess.length - 1 !== this.#lastNPCIndex;

    if (!isMoveEventsToProcess) {
      this.#currentNPC = undefined; 
      this.#lastNPCIndex = -1; 

      this.#dialogUi.hideDialog();

      return;
    }

    this.#lastNPCIndex += 1;
    const eventToHandle = this.#currentNPC.events[this.#lastNPCIndex];
    const eventType = eventToHandle.type;

    switch (eventType) {
      case 'MESSAGE': {
        this.#dialogUi.showDialogModal(eventToHandle.data.messages);
        break;
      }
      case 'CHOICE': {
        this.#dialogUi.showDialogModal([eventToHandle.data.prompt || '']);
        this.#waitInput = true;
        this.#currentNpcOptions = eventToHandle.data.choices || [];
        this.#currentChoice = 0;
        this.time.delayedCall(800, () => {
          if (this.#waitInput) {
            this.#dialogUi.showChoices(this.#currentNpcOptions, this.#currentChoice);
          }
        });
        break;
      }
      case 'SCENE_FADE_IN_AND_OUT':
        this.#currentNPCEvent = true;
        this.cameras.main.fadeOut(eventToHandle.data.fadeOutDuration, 0, 0, 0, (fadeOutCamera, fadeOutProgress) => {
          if (fadeOutProgress !== 1) {
            return;
          }
          this.time.delayedCall(eventToHandle.data.waitDuration, () => {
            this.cameras.main.fadeIn(eventToHandle.data.fadeInDuration, 0, 0, 0, (fadeInCamera, fadeInProgress) => {
              if (fadeInProgress !== 1) {
                return;
              }
              this.#currentNPCEvent = false;
              this.#updateNpcInteraction();
            });
          });
        });
        break;

      default: {
        console.warn(`Unhandled NPC event type: ${eventType}`);
      }
    }
  }

  // check event 
  #checkEvent() {
    if (!this.#eventLayer || this.#isPlayerInputLocked()) {
      return;
    }

    const playerX = this.#player.sprite.x;
    const playerY = this.#player.sprite.y;

    const eventObject = this.#eventLayer.objects.find((obj) => {
      if (!obj.x || !obj.y || !obj.width || !obj.height) {
        return false;
      }

      const inZoneX = playerX >= obj.x && playerX < obj.x + obj.width;
      const inZoneY = playerY >= obj.y - obj.height && playerY < obj.y;
      
      return inZoneX && inZoneY;
    });

    if (!eventObject) {
      return;
    }

    const properties = eventObject.properties || [];
    const eventId = properties.find((prop) => prop.name === 'ID')?.value;

    if (eventId === undefined || this.#triggeredEvents.has(eventId)) {
      return;
    }

    console.log(`[${WorldScene.name}:checkEvent] Triggered event ${eventId}`);
    this.#triggeredEvents.add(eventId);
    this.#triggerEventCutscene(eventId);
  }

  // change based on input of event id
  #triggerEventCutscene(eventId) {
    switch (eventId) {
      case 1:
        this.#EventScene1();
        break;
      case 2:
        this.#EventScene2();
        break;
      default:
        console.log(`[${WorldScene.name}:triggerEventCutscene] Event ID: ${eventId}`);
    }
  }

  // get sign object
  #getSign(targetPosition) {
    if (!this.#signLayer || !Array.isArray(this.#signLayer.objects)) return null;
    return this.#signLayer.objects.find((object) => {
      if (!object.x || !object.y) return false;
      const objectTileX = Math.round(object.x / TILE_SIZE) * TILE_SIZE;
      const objectTileY = Math.round(object.y / TILE_SIZE) * TILE_SIZE;
      return objectTileX === targetPosition.x && objectTileY - TILE_SIZE === targetPosition.y;
    }) || null;
  }

  // redirect to application
  #redirectApplication(signObject) {
    const props = signObject?.properties || [];
    return props.find((prop) => prop.name === SIGN_PROPERTY.REDIRECT_TO_APPLICATION)?.value === true;
  }

  // show redirect choice
  #getRedirectChoice() {
    this.#currentSign = true;
    this.#waitInput = true;
    this.#currentChoice = 0;
    this.#currentNpcOptions = [
      { text: 'Yes', nextIndex: 0 },
      { text: 'No', nextIndex: 1 },
    ];
    this.#dialogUi.showDialogModal(['Would you like to play the mini-game?']);
    this.time.delayedCall(800, () => {
      this.#dialogUi.showChoices(this.#currentNpcOptions, this.#currentChoice);
    });
  }

  // find near npc near target position
  #getNearNPCPositions(targetPosition) {
    let npcNearPlayer = this.#npcs.find((npc) => {
      const npcX = Math.round(npc.sprite.x / TILE_SIZE) * TILE_SIZE;
      const npcY = Math.round(npc.sprite.y / TILE_SIZE) * TILE_SIZE;
      return npcX === targetPosition.x && npcY === targetPosition.y;
    });

    if (!npcNearPlayer) {
      const currentPosition = getPosition(targetPosition, this.#player.direction);
      npcNearPlayer = this.#npcs.find((npc) => {
        const npcX = Math.round(npc.sprite.x / TILE_SIZE) * TILE_SIZE;
        const npcY = Math.round(npc.sprite.y / TILE_SIZE) * TILE_SIZE;
        return npcX === currentPosition.x && npcY === currentPosition.y;
      });
    }
    return npcNearPlayer || null;
  }

  // event 1 for introduction
  #EventScene1() {
    console.log(`[${WorldScene.name}:EventScene1] Starting event 1 cutscene`);
    this.#showDialog = true;
    this.#dialogUi.showDialogModal([
      "Hello, I noticed you seem a bit frazzled. What happened ?"
    ]);
                  
    this.#control.lockPlayerInput = false;
    if (this.#control.lockPlayerInput === false) {
      console.log(`[${WorldScene.name}:EventScene1] locked player input`);
    }

    this.time.delayedCall(2000 , () => {
      this.#dialogUi.hideDialog();
      this.cameras.main.fadeOut(800, 0, 0, 0);
      
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {

        this.time.delayedCall(1000, () => {
          const X = 37 * TILE_SIZE;  // Around x: 576-624
          const Y = 35 * TILE_SIZE;  // Around y: 560-608
          
          const newNPC = new NPC({
            scene: this,
            position: { x: X, y: Y },
            direction: DIRECTION.DOWN,
            frame: 19, 
            npcPath: { 0: { x: X, y: Y } },  
            movementPattern: 'IDLE',
            events: [],
          });
          
          newNPC.addCollision(this.#player);
          this.#player.addCollision(newNPC);
          
          newNPC.sprite.setVisible(false).setAlpha(0).setScale(0.8);
          this.#npcs.push(newNPC);
          
          console.log(`[${WorldScene.name}:EventScene1] New NPC created at (${X}, ${Y})`);
          this.cameras.main.fadeIn(1200, 0, 0, 0);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
            newNPC.sprite.setVisible(true);
            this.tweens.add({
              targets: newNPC.sprite,
              alpha: 1,
              scale: 1,
              duration: 1500,
              onComplete: () => {
                this.cameras.main.flash(300, 255, 255, 255);
                
                this.time.delayedCall(400, () => {
                  this.#showDialog = true;
                  this.#dialogUi.showDialogModal([
                    'Oh you lost your student ID.',
                    'Please do not worry! The academic registry will help you with that.',
                    'You can simply ask AR staff for the detail of renewal.',
                    'They are on Left sides of the map 🗺️'
                  ]);
                  
                  this.#control.lockPlayerInput = false;
                  console.log(`[${WorldScene.name}:EventScene1] Event 1 complete.`);
                });
              }
            });
          });
        });
      });
    });
  }

  // event 2 for ending
  #EventScene2() {
    console.log(`[${WorldScene.name}:EventScene2] Starting event 2 cutscene`);
    this.#control.lockPlayerInput = true;
    this.#showDialog = true;

    // display dialog messages
    this.#dialogUi.showDialogModal([
      'Congratulations!',
      'You have completed this area.',
      'Are you ready to move to the next stage?'
    ]);
    
    // End Game to transit to Title Scene
    this.time.delayedCall(3000, () => {
      this.#dialogUi.hideDialog();
      this.#showDialog = false;
      this.cameras.main.fadeOut(1500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        console.log(`[${WorldScene.name}:EventScene2] Transitioning to Title Scene`);
        this.scene.start(SCENE_KEYS.TITLE_SCENE);
      });
    });
  }
}
