import { Character } from './character.js';
import { CHARACTER_ASSET_KEYS } from '../assets/asset-keys.js';
import { DIRECTION } from '../common/direction.js';

export const NPC_MOVEMENT_PATTERN = Object.freeze({
  IDLE: 'IDLE',
  CLOCKWISE: 'CLOCKWISE',
});

export class NPC extends Character {
  #talkingToPlayer;
  #npcPath;
  #movementPattern;
  #currentPathIndex;
  #events;

  constructor(config) {
    super({
      ...config,
      movementDuration: config.movementDuration || 900,
      assetKey: CHARACTER_ASSET_KEYS.NPC,
      origin: { x: 0, y: 0.2 },
      idleFrameConfig: {
        DOWN: config.frame,
        UP: config.frame + 1,
        NONE: config.frame,
        LEFT: config.frame + 2,
        RIGHT: config.frame + 2,
      },
    });

    this.#talkingToPlayer = false;
    this.#npcPath = config.npcPath;
    this.#currentPathIndex = 0;
    this.#movementPattern = config.movementPattern;
    this._phaserGameObject.setScale(1);
    this.#events = config.events;
  }

  get events() {
    return this.#events;
  }

  get isTalkingToPlayer() {
    return this.#talkingToPlayer;
  }
  
  set isTalkingToPlayer(val) {
    this.#talkingToPlayer = val;
  }

  facePlayer(playerDirection) {
    switch (playerDirection) {
      case DIRECTION.DOWN:
        this._phaserGameObject.setFrame(this._idleFrameConfig.UP).setFlipX(false);
        break;
      case DIRECTION.LEFT:
        this._phaserGameObject.setFrame(this._idleFrameConfig.RIGHT).setFlipX(false);
        break;
      case DIRECTION.RIGHT:
        this._phaserGameObject.setFrame(this._idleFrameConfig.LEFT).setFlipX(true);
        break;
      case DIRECTION.UP:
        this._phaserGameObject.setFrame(this._idleFrameConfig.DOWN).setFlipX(false);
        break;
      case DIRECTION.NONE:
        break;
      default:
        console.warn(`Unexpected error: ${playerDirection}`);
    }
  }

  update(time) {
    if (this._isMoving) {
      return;
    }
    if (this.#talkingToPlayer) {
      return;
    }
    super.update(time);

    if (this.#movementPattern === NPC_MOVEMENT_PATTERN.IDLE) {
      return;
    }

    let characterDirection;
    let nextPosition = this.#npcPath[this.#currentPathIndex + 1];

    if (nextPosition === undefined) {
      nextPosition = this.#npcPath[0];
      this.#currentPathIndex = 0;
    } else {
      this.#currentPathIndex = this.#currentPathIndex + 1;
    }

    if (nextPosition.x > this._phaserGameObject.x) {
      characterDirection = DIRECTION.RIGHT;
    } else if (nextPosition.x < this._phaserGameObject.x) {
      characterDirection = DIRECTION.LEFT;
    } else if (nextPosition.y < this._phaserGameObject.y) {
      characterDirection = DIRECTION.UP;
    } else if (nextPosition.y > this._phaserGameObject.y) {
      characterDirection = DIRECTION.DOWN;
    } else {
      characterDirection = DIRECTION.NONE;
    }
    

    this.moveCharacter(characterDirection);
  }
}
