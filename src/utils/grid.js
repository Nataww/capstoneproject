import { DIRECTION } from '../common/direction.js';
import { TILE_SIZE } from '../config.js';

export function getTargetPosition(current, direction) {
  const target = { ...current };

  switch (direction) {
    case DIRECTION.DOWN:
      target.y += TILE_SIZE;
      break;
    case DIRECTION.UP:
      target.y -= TILE_SIZE;
      break;
    case DIRECTION.LEFT:
      target.x -= TILE_SIZE;
      break;
    case DIRECTION.RIGHT:
      target.x += TILE_SIZE;
      break;
    case DIRECTION.NONE:
      break;

    default:
      console.warn(`Unexpected error: ${direction}`);
  }

  return target;
}