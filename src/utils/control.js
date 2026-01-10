import Phaser from '../lib/phaser.js';
import { DIRECTION } from '../common/direction.js';

export class Control {
    // variable declarations
    #scene;
    #cursorKeys;
    #enterKey;
    #backspaceKey;
    #lockPlayerInput = false;

    // initialize variables
    constructor(scene) {
        this.#scene = scene;
        this.#cursorKeys = this.#scene.input.keyboard.createCursorKeys();
        this.#enterKey = this.#scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.#backspaceKey = this.#scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    }

    get isInputLocked() {
        return this.#lockPlayerInput;
    }

    set lockPlayerInput(value) {
        this.#lockPlayerInput = value;
    }

    // get status when press the key
    getEnterKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#enterKey);
    }
    getSpaceKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.space);
    }
    getBackspaceKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#backspaceKey);
    }
    getBackKeyPressed() {
        return Phaser.Input.Keyboard.JustDown(this.#cursorKeys.shift);
    }

    // get status when just down the key
    getJustDownKey() {
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

    // get status when hold down the key
    getHoldDownKey() {
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