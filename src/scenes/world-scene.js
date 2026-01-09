import { WORLD_ASSET_KEYS } from '../assets/asset-keys.js';
import { SCENE_KEYS } from './scene-keys.js';
import { Player } from '../world/player.js';
import { Control } from '../utils/control.js';
import { DIRECTION } from '../common/direction.js';
import { TILED_COLLISION_LAYER_ALPHA, TILE_SIZE } from '../config.js';
import { DATA_MANAGER_STORE_KEYS, dataManager } from '../utils/data-manager.js';
import { getTargetPosition } from '../utils/grid.js';
import { DialogUi } from '../world/dialog-ui.js';
import { NPC } from '../world/npc.js';
import { DataUtils } from '../utils/data.js';

const SIGN_PROPERTY = Object.freeze({
  MESSAGE: 'message',
  REDIRECT_TO_APPLICATION: 'redirect_to_application',
});

const TILED_NPC_PROPERTY = Object.freeze({
  MOVEMENT_PATTERN: 'movement_pattern',
  FRAME: 'frame',
  ID: 'ID',
});

export class WorldScene extends Phaser.Scene {
  #player;
  #control;
  #encounterLayer;
  #signEncountered;
  #signLayer;
  #eventLayer;
  #triggeredEvents;
  #dialogUi;
  #npcs;
  #npcPlayerIsInteractingWith;
  #isInteractingWithSign;
  #waitInput;
  #lastNpcEventHandledIndex;
  #isProcessingNpcEvent;
  #currentChoice;
  #currentNpcChoiceOptions;
  #showDialog;

  constructor() {
    super({
      key: SCENE_KEYS.WORLD_SCENE,
    });
  }

  init() {
    console.log(`[${WorldScene.name}:init] invoked`);
    this.#npcPlayerIsInteractingWith = undefined;
    this.#isInteractingWithSign = false;
    this.#lastNpcEventHandledIndex = -1;
    this.#isProcessingNpcEvent = false;
    this.#waitInput = false;
    this.#currentChoice = 0;
    this.#currentNpcChoiceOptions = [];
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
    const collisionTiles = map.addTilesetImage('collision', WORLD_ASSET_KEYS.WORLD_COLLISION);
    if (!collisionTiles) {
      console.log(`[${WorldScene.name}:create] encountered error while creating collision tiles from tiled`);
      return;
    }
    const collisionLayer = map.createLayer('Collision', collisionTiles, 0, 0);
    if (!collisionLayer) {
      console.log(`[${WorldScene.name}:create] encountered error while creating collision layer using data from tiled`);
      return;
    }
    collisionLayer.setAlpha(TILED_COLLISION_LAYER_ALPHA).setDepth(2);

    this.#signLayer = map.getObjectLayer('Sign');
    if (!this.#signLayer) {
      console.log(`[${WorldScene.name}:create] encountered error while creating sign layer using data from tiled`);
      return;
    }

    console.log(this.#signLayer);

    this.#eventLayer = map.getObjectLayer('Events');
    if (this.#eventLayer) {
      console.log(`[${WorldScene.name}:create] event layer found:`, this.#eventLayer);
    }

    this.#createNPCs(map);

    this.#player = new Player({
      scene: this,
      position: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION),
      direction: dataManager.store.get(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION),
      collisionLayer: collisionLayer,
      spriteGridMovementFinishedCallback: () => {
        this.#handlePlayerMovementUpdate();
      },
      otherCharactersToCheckForCollision: this.#npcs,
    });
    this.cameras.main.startFollow(this.#player.sprite);

    this.#npcs.forEach((npc) => {
      npc.addCharacterCollision(this.#player);
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

    this.#control  = new Control(this);
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
    
      const direction = this.#control.getDirectionKeyJustPressed();
      
      if (direction === DIRECTION.UP) {
        this.#currentChoice = Math.max(0, this.#currentChoice - 1);
        this.#dialogUi.updateChoiceSelection(this.#currentChoice);
      }
      
      else if (direction === DIRECTION.DOWN) {
        this.#currentChoice = Math.min(this.#currentNpcChoiceOptions.length - 1, this.#currentChoice + 1);
        this.#dialogUi.updateChoiceSelection(this.#currentChoice);
      }

      if (this.#control.wasSpaceKeyPressed() || this.#control.wasEnterKeyPressed()) {
        if (this.#currentNpcChoiceOptions.length === 0) return;

        const selectedChoice = this.#currentNpcChoiceOptions[this.#currentChoice];
        console.log(`Player chose: "${selectedChoice.text}"`);
        
        this.#waitInput = false;
        this.#dialogUi.clearChoices();
        this.#dialogUi.hideDialogModal();

        if (selectedChoice.nextEventIndex === 0) {
          if (this.#isInteractingWithSign) {
            this.#isInteractingWithSign = false;
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
        
        else if (selectedChoice.nextEventIndex === 1) {
          if (this.#isInteractingWithSign) {
            this.#isInteractingWithSign = false;
          }
          if (this.#npcPlayerIsInteractingWith) {
            this.#npcPlayerIsInteractingWith.isTalkingToPlayer = false;
            this.#npcPlayerIsInteractingWith = undefined;
          }
          return;
        }
        
        if (selectedChoice.nextEventIndex !== undefined) {
          this.#lastNpcEventHandledIndex = selectedChoice.nextEventIndex - 1;
        }
        this.#handleNpcInteraction();
        return;
      }
      return; 
    }

    const selectedDirection = this.#control.getDirectionKeyPressedDown();
    const wasSpaceKeyPressed = this.#control.wasSpaceKeyPressed();
    if (selectedDirection !== DIRECTION.NONE && !this.#isPlayerInputLocked()) {
      this.#player.moveCharacter(selectedDirection);
    }

    if (wasSpaceKeyPressed && !this.#player.isMoving) {
      this.#handlePlayerInteraction();
    }

    if (this.#control.wasEnterKeyPressed() && !this.#player.isMoving) {
      console.log('Enter key pressed - checking for interaction');
    }

    this.#player.update(time);
    this.#npcs.forEach((npc) => {
      npc.update(time);
    });
  }

  #handlePlayerInteraction() {
    if (this.#dialogUi.isAnimationPlaying) {
      this.#dialogUi.skipTextAnimation();
      return;
    }

    if (this.#dialogUi.isVisible && !this.#dialogUi.moreMessagesToShow) {
      if (this.#npcPlayerIsInteractingWith) {

        const currentEvent = this.#npcPlayerIsInteractingWith.events[this.#lastNpcEventHandledIndex];
        if (currentEvent.type === 'MESSAGE' && currentEvent.data.isEnd) {
            this.#dialogUi.hideDialogModal();
            this.#npcPlayerIsInteractingWith.isTalkingToPlayer = false;
            this.#npcPlayerIsInteractingWith = undefined;
            this.#lastNpcEventHandledIndex = -1;
            return;
        }

        this.#handleNpcInteraction();
      }
      if (this.#showDialog) {
        this.#dialogUi.hideDialogModal();
        this.#showDialog = false;
        return;
      }
      if (this.#isInteractingWithSign) {
        this.#isInteractingWithSign = false;
        this.#dialogUi.hideDialogModal();
      }
      return;
    }

    if (this.#dialogUi.isVisible && this.#dialogUi.moreMessagesToShow) {
      this.#dialogUi.showNextMessage();
      return;
    }

    console.log('start of interaction check');
    const { x, y } = this.#player.sprite;
    const targetPosition = getTargetPosition({ x, y }, this.#player.direction);

    
    console.log('Player position:', { x, y });
    console.log('Target position:', targetPosition);
    console.log('Sign objects:', this.#signLayer.objects);

    // check for sign, and display appropriate message if player is not facing up
    const nearbySign = this.#signLayer.objects.find((object) => {
      if (!object.x || !object.y) {
        console.log('object missing x or y value');
        return false;
      }

      // get object positions (x, y)
      const objectTileX = Math.round(object.x / TILE_SIZE) * TILE_SIZE;
      const objectTileY = Math.round(object.y / TILE_SIZE) * TILE_SIZE;
      
      console.log('Checking object at:', { x: objectTileX, y: objectTileY }, 'against target:', targetPosition);
      return objectTileX === targetPosition.x && objectTileY - TILE_SIZE === targetPosition.y;
    });

    console.log('Nearby sign found:', nearbySign);

    if (nearbySign) {
      const props = nearbySign.properties || [];
      console.log('Sign properties:', props);

      const shouldRedirect = props.find((prop) => prop.name === SIGN_PROPERTY.REDIRECT_TO_APPLICATION)?.value === true;
      console.log('Should show redirect choice:', shouldRedirect);

      if (shouldRedirect) {
        this.#isInteractingWithSign = true;
        this.#waitInput = true;
        this.#currentChoice = 0;
        this.#currentNpcChoiceOptions = [
          { text: 'Yes', nextEventIndex: 0 },
          { text: 'No', nextEventIndex: 1 },
        ];
        this.#dialogUi.showDialogModal(['Would you like to play the mini-game?']);
        this.time.delayedCall(800, () => {
          this.#dialogUi.showChoices(this.#currentNpcChoiceOptions, this.#currentChoice);
        });
      }
      
      return;
    }

    let nearbyNpc = this.#npcs.find((npc) => {
      const npcTileX = Math.round(npc.sprite.x / TILE_SIZE) * TILE_SIZE;
      const npcTileY = Math.round(npc.sprite.y / TILE_SIZE) * TILE_SIZE;
      return npcTileX === targetPosition.x && npcTileY === targetPosition.y;
    });
    
    if (!nearbyNpc) {
      const targetPosition2 = getTargetPosition(targetPosition, this.#player.direction);
      
      nearbyNpc = this.#npcs.find((npc) => {
        const npcTileX = Math.round(npc.sprite.x / TILE_SIZE) * TILE_SIZE;
        const npcTileY = Math.round(npc.sprite.y / TILE_SIZE) * TILE_SIZE;
        return npcTileX === targetPosition2.x && npcTileY === targetPosition2.y;
      });
    }

    if (nearbyNpc) {
      console.log('Nearby NPC found:', nearbyNpc);
      nearbyNpc.facePlayer(this.#player.direction);
      nearbyNpc.isTalkingToPlayer = true;
      this.#npcPlayerIsInteractingWith = nearbyNpc;
      this.#handleNpcInteraction();
      return;
    }

    console.log('No NPC found at target position');
  }

  #handlePlayerMovementUpdate() {
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION, {
      x: this.#player.sprite.x,
      y: this.#player.sprite.y,
    });
    
    dataManager.store.set(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION, this.#player.direction);

    this.#checkEventZones();

    if (!this.#encounterLayer) {
      return;
    }

    const isInEncounterZone =
      this.#encounterLayer.getTileAtWorldXY(this.#player.sprite.x, this.#player.sprite.y, true).index !== -1;
    if (!isInEncounterZone) {
      return;
    }

    console.log(`[${WorldScene.name}:handlePlayerMovementUpdate] player is in an encounter zone`);
    this.#signEncountered = Math.random() < 0.2;
    if (this.#signEncountered) {
      this.cameras.main.fadeOut(2000);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE_KEYS.APPLICATION_SCENE);
      });
    }
  }


  #isPlayerInputLocked() {
    return (
      this.#dialogUi.isVisible ||
      this.#control.isInputLocked ||
      this.#isProcessingNpcEvent ||
      this.#waitInput
    );
  }

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

      npc.addCharacterCollision(this.#player);
      this.#npcs.push(npc);
    });
  }

  #handleNpcInteraction() {
    if (this.#isProcessingNpcEvent || !this.#npcPlayerIsInteractingWith) {
      return;
    }
    const eventsToProcess = this.#npcPlayerIsInteractingWith.events;
    const isMoveEventsToProcess = eventsToProcess.length - 1 !== this.#lastNpcEventHandledIndex;

    if (!isMoveEventsToProcess) {
      this.#npcPlayerIsInteractingWith = undefined; 
      this.#lastNpcEventHandledIndex = -1; 

      this.#dialogUi.hideDialogModal();

      return;
    }

    this.#lastNpcEventHandledIndex += 1;
    const eventToHandle = this.#npcPlayerIsInteractingWith.events[this.#lastNpcEventHandledIndex];
    const eventType = eventToHandle.type;

    switch (eventType) {
      case 'MESSAGE': {
        this.#dialogUi.showDialogModal(eventToHandle.data.messages);
        break;
      }
      case 'CHOICE': {
        this.#dialogUi.showDialogModal([eventToHandle.data.prompt || '']);
        this.#waitInput = true;
        this.#currentNpcChoiceOptions = eventToHandle.data.choices || [];
        this.#currentChoice = 0;
        this.time.delayedCall(800, () => {
          if (this.#waitInput) {
            this.#dialogUi.showChoices(this.#currentNpcChoiceOptions, this.#currentChoice);
          }
        });
        break;
      }
      case 'SCENE_FADE_IN_AND_OUT':
        this.#isProcessingNpcEvent = true;
        this.cameras.main.fadeOut(eventToHandle.data.fadeOutDuration, 0, 0, 0, (fadeOutCamera, fadeOutProgress) => {
          if (fadeOutProgress !== 1) {
            return;
          }
          this.time.delayedCall(eventToHandle.data.waitDuration, () => {
            this.cameras.main.fadeIn(eventToHandle.data.fadeInDuration, 0, 0, 0, (fadeInCamera, fadeInProgress) => {
              if (fadeInProgress !== 1) {
                return;
              }
              this.#isProcessingNpcEvent = false;
              this.#handleNpcInteraction();
            });
          });
        });
        break;

      default: {
        console.warn(`Unhandled NPC event type: ${eventType}`);
      }
    }
  }

  #checkEventZones() {
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

    console.log(`[${WorldScene.name}:checkEventZones] Triggered event ${eventId}`);
    this.#triggeredEvents.add(eventId);
    this.#triggerEventCutscene(eventId);
  }

  #triggerEventCutscene(eventId) {
    switch (eventId) {
      case 1:
        this.#EventScene1();
        break;
      case 2:
        this.#EventScene2();
        break;
      default:
        console.log(`[${WorldScene.name}:triggerEventCutscene] Unknown event ID: ${eventId}`);
    }
  }

  #EventScene1() {
    console.log(`[${WorldScene.name}:EventScene1] Starting event 1 cutscene`);
    
    // Show emergence message after flash
    this.#showDialog = true;
    this.#dialogUi.showDialogModal([
      "Hello, I noticed you seem a bit frazzled. What happened ?"
    ]);
                  
    this.#control.lockPlayerInput = false;
    console.log(`[${WorldScene.name}:EventScene1] Cutscene complete, player can now dismiss dialog`); 
    
    this.time.delayedCall(2000 , () => {
      this.#dialogUi.hideDialogModal();
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
          
          newNPC.addCharacterCollision(this.#player);
          this.#player.addCharacterCollision(newNPC);
          
          // Start hidden and transparent
          newNPC.sprite.setVisible(false);
          newNPC.sprite.setAlpha(0);
          newNPC.sprite.setScale(0.8);
          this.#npcs.push(newNPC);
          
          console.log(`[${WorldScene.name}:EventScene1] New NPC created at (${X}, ${Y})`);
          
          // Fade camera back in
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
                  console.log(`[${WorldScene.name}:EventScene1] Cutscene complete, player can now dismiss dialog`);
                });
              }
            });
          });
        });
      });
    });
  }

  #EventScene2() {
    console.log(`[${WorldScene.name}:EventScene2] Starting event 2 cutscene`);
    this.#control.lockPlayerInput = true;
    this.#showDialog = true;

    // End Scene dialog
    this.#dialogUi.showDialogModal([
      'Congratulations!',
      'You have completed this area.',
      'Are you ready to move to the next stage?'
    ]);
    
    // change to another scene
    this.time.delayedCall(3000, () => {
      this.#dialogUi.hideDialogModal();
      this.#showDialog = false;
      this.cameras.main.fadeOut(1500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        console.log(`[${WorldScene.name}:playEvent2Cutscene] Transitioning to next stage`);
        this.scene.start(SCENE_KEYS.MINI_GAME_SCENE);
      });
    });
  }
}
