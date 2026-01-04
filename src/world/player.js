import { CHARACTER_ASSET_KEYS } from '../assets/asset-keys.js';
import { DIRECTION } from '../common/direction.js';
import { Character } from './character.js';

export class Player extends Character {
    constructor(config) {
        super({
            ...config,
            movementDuration: 100,
            assetKey: CHARACTER_ASSET_KEYS.PLAYER,
            origin: { x: 0, y: 0.2 },
            idleFrameConfig: {
                DOWN: 7,
                UP: 1,
                NONE: 7,
                LEFT: 10,
                RIGHT: 4,
            },
        });
    }

    moveCharacter(direction) {
        super.moveCharacter(direction);

        switch (direction) {
            case DIRECTION.DOWN:
            case DIRECTION.LEFT:
            case DIRECTION.RIGHT:
            case DIRECTION.UP:
                if (!this._phaserGameObject.anims.isPlaying || 
                    this._phaserGameObject.anims.currentAnim?.key !== `PLAYER_${this.direction}`
                ) {
                    this._phaserGameObject.play(`PLAYER_${this.direction}`);
                }
                 break;
                 
            case DIRECTION.NONE: {
                this._phaserGameObject.anims.stop();
                break;
            }
            default: 
                console.warn(`Unexpected error: ${direction}`);
            }
        }
}