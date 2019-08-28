import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import { Option } from "fp-ts/lib/Option";
import { Either } from "fp-ts/lib/Either";
import {ErrorKind} from "./errors"
/**
 * Aliases to help the type checker.
 * Unfortunately there is no u32 in JS, so we use number.
 */
export type Entity = number;
export type EntityList = Uint32Array;
export type EntityId = number;
export type EntityVersion = number;

/**
 * A entity is 32-bits split into two parts: the ID and the VERSION
 * The upper 12 bits are the VERSION and the lower 20 bits are the ID
 * The >>> 0 is required to treat the number as a u32
 */

export const N_ID_BITS = 20;
export const N_VERSION_BITS = 32 - N_ID_BITS;
export const MAX_ID= 0xfffff;
export const ID_MASK = MAX_ID;
export const MAX_VERSION = 0xfff;
export const VERSION_MASK = (MAX_VERSION << N_ID_BITS) >>> 0;

/**
 * This is currently only used in one place - checking the end of the recycle list
 */
export const INVALID_ID = ID_MASK;

/**
 * The amount to allocate each time we run out of space, in number of entities
 */
const ALLOC_CAPACITY = 64;

/**
 * Flags for passing to `list()`
 */
export enum EntityListFilter {
  ALIVE = 1,
  DEAD = 2
}

/**
 * extracts the id from a given entity
 */
export const extract_entity_id = (entity: Entity): EntityId => entity & ID_MASK;

/**
 * extracts the version from a given entity
 */
export const extract_entity_version = (entity: Entity): EntityVersion =>
  (entity & VERSION_MASK) >>> N_ID_BITS;

 /**
   * creates an entity out of thin air
   * does not store it it
   * The >>> 0 is required to treat the number as an u32
   */
const forge = ({ id, version }: { id: number; version: number }): Entity =>
  (((version << N_ID_BITS) & VERSION_MASK) | (id & ID_MASK)) >>> 0

/**
 * This is not exported to the library, rather it is called by `world`
 */
export const init_entities = (initial_capacity?:number) => {
  //pointer to the last destroyed entity
  let destroyed: Option<EntityId> = O.none;

  //when the cursor hits this, realloc
  let next_capacity_target: number = initial_capacity ? initial_capacity : 0; 
  //next spot available for appending
  let append_cursor: number = 0;

  //our list!
  let entities: EntityList = new Uint32Array(next_capacity_target);

  let alive_len: number = 0;

  const is_alive = (entity: Entity): boolean => {
    const id = extract_entity_id(entity);
    return id < append_cursor && entities[id] === entity;
  };

  const list_all = (): EntityList => entities.slice(0, append_cursor);

  const list_alive = (): EntityList =>
    list_all().filter(
      (entity: Entity, index: number) => extract_entity_id(entity) === index
    );


  /**
   * Returns the entity and the amount that the entity list capacity was grown 
   */
  const create = (): [Entity, number] => {
    alive_len++;

    return O.fold(
      () => {
        let realloc_amount = 0;
        if (append_cursor === next_capacity_target) {
          next_capacity_target += ALLOC_CAPACITY;
          const new_entities = new Uint32Array(next_capacity_target);
          new_entities.set(entities);
          entities = new_entities;
          realloc_amount = next_capacity_target;
        }
        const id = append_cursor;
        const version = 0;
        const entity = forge({ id, version });
        entities[id] = entity;

        append_cursor++;
        return [entity, realloc_amount] as any
      },
      (index: EntityId) => {
        const version = extract_entity_version(entities[index]);
        const destroyed_id = extract_entity_id(entities[index]);
        destroyed = destroyed_id === INVALID_ID ? O.none : O.some(destroyed_id);

        const entity = forge({ id: index, version });
        entities[index] = entity;

        return [entity, 0] as any
      }
    )(destroyed);
  }

  const remove = (entity: Entity): Either<ErrorKind, void> => {
    const id = extract_entity_id(entity);

    if (id > append_cursor || entities[id] !== entity) {
      return E.left(ErrorKind.NO_KEY);
    }

    const next_id = O.fold(() => INVALID_ID, (next_id: EntityId) => next_id)(
      destroyed
    );

    if (next_id === id) {
      return E.left(ErrorKind.EXHAUSTED_KEY_REMOVAL);
    }
    const version = extract_entity_version(entity);

    const next_version = version === MAX_VERSION ? 0 : version + 1;

    entities[id] = forge({ id: next_id, version: next_version });

    destroyed = O.some(id);

    alive_len--;

    return E.right(null);
  };

 

  /**
   * Just for debugging
   */
  const destroyed_to_string = (): string =>
    O.fold(
      () => "NONE",
      (id: EntityId) => (id === INVALID_ID ? "INVALID" : String(id))
    )(destroyed);

  /**
     * to string representation of a single entity as (ID|VERSION)
     * 
       If ID == INVALID_ID then it will be INVALID
       If ID > entities.length-1 and !== INVALID_ID then it's ERROR
       If ID !== index in entities then it will be PTR[N]
       Otherwise, it's E[N] where N is EntityId
    */
  const entity_to_string = (entity: Entity): string => {
    const id = extract_entity_id(entity);

    const get_proper_id_str = () => {
      const ptr_id = extract_entity_id(entities[id]);
      return ptr_id === id ? `E${id}` : `PTR${id}`;
    };

    const id_str =
      id === INVALID_ID
        ? "INVALID"
        : id > entities.length - 1
        ? "ERROR"
        : get_proper_id_str();

    return `(${id_str}|V${extract_entity_version(entity)})`;
  };

  const entity_to_string_raw = (entity: Entity): string => {
    return `(E${extract_entity_id(entity)}|V${extract_entity_version(entity)})`;
  };
  /**
   * to string representation of an array of entities
   */
  const _list_to_string = (
    formatter: (entity: Entity) => string
  ) => (): string =>
    list_all().reduce((acc, curr, index) => {
      const str = formatter(curr);
      return index ? `${acc}, ${str}` : acc + str;
    }, "[") + "]";

  const list_to_string = _list_to_string(entity_to_string);
  const list_to_string_raw = _list_to_string(entity_to_string_raw);

  /**
   * The exports
   */
  return {
    [Symbol.iterator]: () => list_alive()[Symbol.iterator](),
    create,
    list_all,
    is_alive,
    get_at_index: (index:number) => entities[index],
    alive_len: () => alive_len,
    remove,
    destroyed_to_string,
    entity_to_string,
    entity_to_string_raw,
    list_to_string,
    list_to_string_raw
  };
};
