import Phaser from '../lib/phaser.js';
import { DIRECTION } from '../common/direction.js';
import { getPosition } from '../utils/grid.js';
import { TILE_SIZE } from '../config.js';

export class Character {
    _scene;
    _direction;
    _isMoving;
    _movementDuration;
    _targetPosition;
    _previoustargetPosition;
    _idleFrameConfig;
    _playerMovement;
    _origin;
    _collisionLayer;
    _checkCollision;

    constructor(config) {
        if(this.constructor === Character) {
            throw new Error("Abstract classes can't be instantiated.");
        }

        this._scene = config.scene;
        this._direction = config.direction;
        this._isMoving = false;
        this._movementDuration = typeof config.movementDuration === 'number' ? config.movementDuration : 600;
        this._targetPosition = { ...config.position };
        this._previoustargetPosition = { ...config.position };
        this._idleFrameConfig = config.idleFrameConfig;
        this._origin = config.origin ? { ...config.origin } : { x: 0, y: 0 };
        this._collisionLayer = config.collisionLayer;
        this._checkCollision = config.checkCollision || [];

        this._phaserGameObject = this._scene.add
        .sprite(config.position.x, config.position.y, config.assetKey, this._getIdleFrame())
        .setOrigin(this._origin.x, this._origin.y);
        this._playerMovement = config.playerMovement;
    }

    get sprite() {
        return this._phaserGameObject;
    }

    get isMoving() {
        return this._isMoving;
    }

    get direction() {
        return this._direction;
    }

    moveCharacter(direction) {
        if (this._isMoving) {
            return;
        }
        this._moveSprite(direction);
    }

    addCollision(character) {
        this._checkCollision.push(character);
    }

    update(time) {
        if (this._isMoving){
            return;
        }

        const idleFrame = this._phaserGameObject.anims.currentAnim?.frames[0].frame.name
        this._phaserGameObject.anims.stop();
        
        if(!idleFrame){
            return;
        }

        switch (this._direction) {
        case DIRECTION.DOWN:
        case DIRECTION.LEFT:
        case DIRECTION.RIGHT:
        case DIRECTION.UP:
            this._phaserGameObject.setFrame(idleFrame);
            break;
        case DIRECTION.NONE:
            break;
        default:
            console.warn(`Unexpected error: ${this._direction}`);
        }
    }
    _getIdleFrame() {
        return this._idleFrameConfig[this._direction];
    }

    _moveSprite(direction) {
        this._direction = direction;
        if(this.isBlockingTile()){
            return;
        }
        this._isMoving = true;
        this.#updateSpritesheetMovement();
    }

    isBlockingTile() {
        if (!this._collisionLayer) {
            return false;
        }
        const targetPosition = {...this._targetPosition};
        const updatePosition = getPosition(targetPosition, this._direction);
        return this.#checkCollisionLayer(updatePosition) || this.#checkPlayerCollision(updatePosition);
    }
    
    #updateSpritesheetMovement() {
        if (this._direction === DIRECTION.NONE) {
            return;
        }
        
        const updatePosition = getPosition(this._phaserGameObject, this._direction);
        this._previoustargetPosition = { ...this._targetPosition };
        this._targetPosition.x = updatePosition.x;
        this._targetPosition.y = updatePosition.y;

        this._scene.add.tween({
            delay: 0, 
            duration: this._movementDuration,
            y:{
                from: this._phaserGameObject.y,
                start: this._phaserGameObject.y,
                to: this._targetPosition.y,
            },
            x:{
                from: this._phaserGameObject.x,
                start: this._phaserGameObject.x,
                to: this._targetPosition.x,
            },
            targets: this._phaserGameObject,
            onComplete: () => {
                this._isMoving = false;
                this._previoustargetPosition = { ...this._targetPosition };
                if (this._playerMovement) {
                    this._playerMovement();
                }
            }
        });

    }

    #checkCollisionLayer(position) {
        if (!this._collisionLayer) {
            return false;
        }
        const { x, y } = position;
        const tile = this._collisionLayer.getTileAtWorldXY(x, y, true);
        return tile.index !== -1;
    }

    #checkPlayerCollision(position) {
        const { x, y } = position;
        if (this._checkCollision.length === 0) {    
        return false;
        }

        const collideCharacter = this._checkCollision.some((character) => {
            const charX = Math.round(character._targetPosition.x / TILE_SIZE) * TILE_SIZE;
            const charY = Math.round(character._targetPosition.y / TILE_SIZE) * TILE_SIZE;
            
            const targetX = Math.round(x / TILE_SIZE) * TILE_SIZE;
            const targetY = Math.round(y / TILE_SIZE) * TILE_SIZE;

            return (charX === targetX && charY === targetY);
        });
        return collideCharacter;
    }
}
