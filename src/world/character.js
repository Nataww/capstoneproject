import Phaser from '../lib/phaser.js';
import { DIRECTION } from '../common/direction.js';
import { getTargetPosition } from '../utils/grid.js';

export class Character {
    _scene;
    _direction;
    _isMoving;
    _movementDuration;
    _targetPosition;
    _previoustargetPosition;
    _idleFrameConfig;
    _spriteGridMovementFinishedCallback;
    _origin;
    _collisionLayer;
    _otherCharactersToCheckForCollision;

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
        this._otherCharactersToCheckForCollision = config.otherCharactersToCheckForCollision || [];

        this._phaserGameObject = this._scene.add
        .sprite(config.position.x, config.position.y, config.assetKey, this._getIdleFrame())
        .setOrigin(this._origin.x, this._origin.y);
        this._spriteGridMovementFinishedCallback = config.spriteGridMovementFinishedCallback;
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

    addCharacterCollision(character) {
        this._otherCharactersToCheckForCollision.push(character);
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
        this.#handleSpriteMovement();
    }

    isBlockingTile() {
        if (!this._collisionLayer) {
            return false;
        }
        const targetPosition = {...this._targetPosition};
        const updatePosition = getTargetPosition(targetPosition, this._direction);
        return this.#doesPositionCollideWithCollisionLayer(updatePosition) || this.#doesPositionCollideWithOtherCharacters(updatePosition);
    }
    
    #handleSpriteMovement() {
        if (this._direction === DIRECTION.NONE) {
            return;
        }
        
        const updatePosition = getTargetPosition(this._phaserGameObject, this._direction);
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
                if (this._spriteGridMovementFinishedCallback) {
                    this._spriteGridMovementFinishedCallback();
                }
            }
        });

    }

    #doesPositionCollideWithCollisionLayer(position) {
        if (!this._collisionLayer) {
            return false;
        }
        const { x, y } = position;
        const tile = this._collisionLayer.getTileAtWorldXY(x, y, true);
        return tile.index !== -1; // Ensure the method returns a boolean
    }

    #doesPositionCollideWithOtherCharacters(position) {
        const { x, y } = position;
        if (this._otherCharactersToCheckForCollision.length === 0) {    
        return false;
        }

        const collidesWithACharacter = this._otherCharactersToCheckForCollision.some((character) => {
            return ((character._targetPosition.x === x) && (character._targetPosition.y === y)) || 
            ((character._previoustargetPosition.x === x) && (character._previoustargetPosition.y === y));
        });
        return collidesWithACharacter;
    }
}
