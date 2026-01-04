import Phaser from '../lib/phaser.js';
import { DIRECTION } from '../common/direction.js';
import { TILE_SIZE } from '../config.js';

const initialState = {
  player: {
    position: {
      x: 37 * TILE_SIZE,
      y: 38 * TILE_SIZE,
    },
    direction: DIRECTION.DOWN,
  },
  gameStarted: false,
};

export const DATA_MANAGER_STORE_KEYS = Object.freeze({
  PLAYER_POSITION: 'PLAYER_POSITION',
  PLAYER_DIRECTION: 'PLAYER_DIRECTION',
  GAME_STARTED: 'GAME_STARTED',
});

class DataManager extends Phaser.Events.EventEmitter {
  #store;

  constructor() {
    super();
    this.#store = new Phaser.Data.DataManager(this);
    this.#updateData(initialState);
  }

  get store() {
    return this.#store;
  }

  startNewGame() {
    const existingData = { ...this.#getObjectData() };
    existingData.player.position = { ...initialState.player.position };
    existingData.player.direction = initialState.player.direction;
    existingData.gameStarted = initialState.gameStarted;

    this.#store.reset();
    this.#updateData(existingData);
  }

  #updateData(data) {
    this.#store.set({
      [DATA_MANAGER_STORE_KEYS.PLAYER_POSITION]: data.player.position,
      [DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION]: data.player.direction,
      [DATA_MANAGER_STORE_KEYS.GAME_STARTED]: data.gameStarted,
    });
  }

  #getObjectData() {
    return {
      player: {
        position: {
          x: this.#store.get(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION).x,
          y: this.#store.get(DATA_MANAGER_STORE_KEYS.PLAYER_POSITION).y,
        },
        direction: this.#store.get(DATA_MANAGER_STORE_KEYS.PLAYER_DIRECTION),
      },
      gameStarted: this.#store.get(DATA_MANAGER_STORE_KEYS.GAME_STARTED)
    };
  }
}

export const dataManager = new DataManager();
