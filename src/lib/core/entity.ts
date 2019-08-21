import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import {Option} from "fp-ts/lib/Option";
import {Either} from "fp-ts/lib/Either";
import {ErrorType} from "./errors";

/**
 * Aliases to help the type checker. 
 * Unfortunately there is no u32 in JS, so we use number.
 */
export type Entity = number;
export type EntityList = Uint32Array;
export type EntityId = number;
export type EntityVersion  = number;

/**
 * An entity is split into two parts: the ID and the VERSION
 * More specifically, an entity is a 32-bit number.
 * The upper 12 bits are the VERSION and the lower 20 bits are the ID
 */

const N_ID_BITS = 20;
const N_VERSION_BITS = 12;
const ID_MAX= 0xFFFFF;
const ID_MASK = ID_MAX;
const VERSION_MAX= 0xFFF;
const VERSION_MASK= VERSION_MAX << N_ID_BITS; 

/**
 * This is currently only used in one place - checking the end of the recycle list
 * 
 */
const INVALID_ID = ID_MASK;

/**
 * The amount to allocate each time we run out of space, in number of entities
 */
const ALLOC_CAPACITY = 64;


/**
 * Flags for passing to `list()`
 */
export enum EntityListFilter {
    ALIVE = 1,
    DEAD = 2,
}

/**
 * extracts the id from a given entity 
 */
export const extract_entity_id = (entity:Entity):EntityId =>
    entity & ID_MASK;

/**
 * extracts the version from a given entity 
 */
export const extract_entity_version = (entity:Entity):EntityVersion =>
    (entity & VERSION_MASK) >> N_ID_BITS;

/**
 * This is not exported to the library, rather it is called by `world`
 */
export const init_entities = () => {
    //pointer to the last destroyed entity
    let destroyed:Option<EntityId> = O.none;

    //when the cursor hits this, realloc
    let next_capacity_target:number = 0;
    //next spot available for appending
    let append_cursor:number = 0;

    //our list!
    let entities:EntityList = new Uint32Array(0);

    const is_alive = (entity:Entity):boolean => {
        const id = extract_entity_id(entity);
        return id < append_cursor && entities[id] === entity;
    };

    const list_all = ():EntityList => entities.slice(0, append_cursor);

    const list_alive = ():EntityList => 
        list_all().filter((entity:Entity, index:number) => 
            extract_entity_id(entity) === index
        );

    const create = ():Entity => 
        O.fold(
            () => {
                if(append_cursor === next_capacity_target) {
                    next_capacity_target += ALLOC_CAPACITY;
                    const new_entities = new Uint32Array(next_capacity_target);
                    new_entities.set(entities);
                    entities = new_entities;
                }
                const id = append_cursor;
                const version = 0;
                const entity = forge({id, version});
                entities[id] = entity;

                append_cursor++;
                return entity;
            },
            (index:EntityId) => {
                const version = extract_entity_version(entities[index]);
                const destroyed_id = extract_entity_id(entities[index]);
                destroyed = destroyed_id === INVALID_ID ? O.none : O.some(destroyed_id);

                const entity = forge({id: index, version});
                entities[index] = entity;

                return entity;
            }
        ) (destroyed);

    const remove = (entity:Entity):Either<ErrorType, void> => {
        const id = extract_entity_id(entity);

        if (id > append_cursor || entities[id] !== entity) {
            return E.left(ErrorType.NO_ENTITY);
        }
        
        const next_id = O.fold(() => INVALID_ID, (next_id:EntityId) => next_id) (destroyed);

        if(next_id === id) {
            return E.left(ErrorType.EXHAUSTED_ENTITY_REMOVAL);
        }
        const version = extract_entity_version(entity);
        const next_version = version + 1;

        entities[id] = forge({ id: next_id, version: next_version });

        destroyed = O.some(id);

        return E.right(null);
    }

    /**
     * creates an entity out of thin air
     * does not store it
     */
    const forge = ({id, version}:{id: number, version: number}):Entity =>
        (id & ID_MASK) | ((version & VERSION_MAX) << N_ID_BITS); 


    /**
     * Just for debugging
     */
    const destroyed_to_string = ():string => O.fold(
        () => "NONE",
        (id:EntityId) => id === INVALID_ID ? "INVALID" : String(id)
    ) (destroyed);

    /**
     * to string representation of a single entity as (ID|VERSION)
     * 
       If ID == INVALID_ID then it will be INVALID
       If ID > entities.length-1 and !== INVALID_ID then it's ERROR
       If ID !== index in entities then it will be PTR[N]
       Otherwise, it's E[N] where N is EntityId
    */
    const entity_to_string = (entity:Entity):string => {

        const id = extract_entity_id(entity); 

        const get_proper_id_str = () => {
            const ptr_id = extract_entity_id(entities[id]);
            return ptr_id === id ? `E${id}` : `PTR${id}`;
        }

        const id_str = (id === INVALID_ID) ? "INVALID"
            : id > entities.length-1 ? "ERROR"
            : get_proper_id_str();

        return `(${id_str}|V${extract_entity_version(entity)})`;
    }

    const entity_to_string_raw = (entity:Entity):string => {
        return `(E${extract_entity_id(entity)}|V${extract_entity_version(entity)})`;
    }
    /**
     * to string representation of an array of entities 
     */
    const _list_to_string = (formatter: (entity:Entity) => string) => ():string =>
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
        create,
        list_all,
        list_alive,
        is_alive,
        remove,
        destroyed_to_string,
        entity_to_string,
        entity_to_string_raw,
        list_to_string,
        list_to_string_raw,
    } 

}