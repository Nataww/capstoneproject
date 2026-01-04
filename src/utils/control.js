import Phaser from '../lib/phaser.js';
import { DIRECTION } from '../common/direction.js';

export class Control {
   // declare variables
    #scene;
    #cursorKeys;
    #enterKey;
    #lockPlayerInput = false;

    constructor(scene) {
        this.#scene = scene;
        this.#cursorKeys = this.#scene.input.keyboard.createCursorKeys();
        this.#enterKey = this.#scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    get isInputLocked() {
        return this.#lockPlayerInput;
    }

    set lockPlayerInput(value) {
        this.#lockPlayerInput = value;
    }

    wasEnterKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#enterKey);
    }

    wasSpaceKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.space);
    }

    wasBackKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.shift);
    }

    getDirectionKeyJustPressed() {
        if (!this.#cursorKeys) return DIRECTION.NONE;

        if (Phaser.Input.Keyboard.JustDown(this.#cursorKeys.left)) {
        return DIRECTION.LEFT;
        }
        else if (Phaser.Input.Keyboard.JustDown(this.#cursorKeys.right)) {
        return DIRECTION.RIGHT;
        }
        else if (Phaser.Input.Keyboard.JustDown(this.#cursorKeys.up)) {
        return DIRECTION.UP;
        }
        else if (Phaser.Input.Keyboard.JustDown(this.#cursorKeys.down)) {
        return DIRECTION.DOWN;
        }

        return DIRECTION.NONE;
    }

    
    getDirectionKeyPressedDown() {
        if (!this.#cursorKeys) return DIRECTION.NONE;

        if (this.#cursorKeys.left.isDown) {
        return DIRECTION.LEFT;
        }
        else if (this.#cursorKeys.right.isDown) {
        return DIRECTION.RIGHT;
        }
        else if (this.#cursorKeys.up.isDown) {
        return DIRECTION.UP;
        }
        else if (this.#cursorKeys.down.isDown) {
        return DIRECTION.DOWN;
        }

        return DIRECTION.NONE;
    }
}