import {INVALID_ID, Entity, extract_entity_id} from "./entities";
import {Option, some, none} from "fp-ts/lib/Option";

/**
 * The amount to allocate each time we run out of space, in number of components
 */
const ALLOC_CAPACITY = 64;

export interface Pool<T> extends Iterable<[Entity, T]>{
    realloc_entities: (alloc_amount:number) => void;
    insert: (entity:Entity, data:T) => void;
    remove: (entity:Entity) => void;
    get: (entity:Entity) => Option<T>;
    get_unchecked_id: (id:number) => T;
    has_entity: (entity:Entity) => boolean;
    has_entity_id: (id:number) => boolean;
    components_iter: Iterable<T>;
    entities_iter: Iterable<Entity>;
    len: () => number;
    entities: () => Uint32Array;
    components: () => Array<T>; 
}

export const init_pool = <T>():Pool<T> => {
    let entity_indices = new Uint32Array();
    let entities = new Uint32Array();
    let components = new Array<T>();
    let total = 0;

    const realloc_entities = (alloc_amount:number) => {
        const new_indices= new Uint32Array(alloc_amount);
        new_indices.set(entity_indices);
        new_indices.fill(INVALID_ID, entity_indices.length);
        entity_indices = new_indices;
    }

    const insert = (entity:Entity, data:T) => {
        const entity_id = extract_entity_id(entity);
        if(has_entity(entity)) {
            const index = entity_indices[entity_id];
            components[index] = data;
        } else {
            entity_indices[entity_id] = entities.length;

            const new_entities = new Uint32Array(entities.length + 1);
            new_entities.set(entities);
            new_entities[entities.length] = entity_id;
            entities = new_entities;

            components.push(data);

            total++;
        }
    }

    const has_entity  = (entity:Entity):boolean => {
        const entity_id = extract_entity_id(entity);
        return has_entity_id(entity_id);
    }

    const has_entity_id  = (id:number):boolean => {
        return entities[entity_indices[id]] === id 
    }
    const remove = (entity:Entity) => {
        if(has_entity(entity)) {
            const entity_id = extract_entity_id(entity);
            const index = entity_indices[entity_id];
            entity_indices[entity_id] = INVALID_ID;

            entities[index] = entities[total - 1];
            const new_entities = new Uint32Array(entities.length - 1);
            new_entities.set(entities.slice(0,entities.length-1));
            entities = new_entities;
            [components[index], components[total-1]] = [components[total-1], components[index]];

            components.pop();
            total--;
        }
    }

    const get = (entity:Entity):Option<T> => {
        if(!has_entity(entity)) {
            return none;
        }
        const id = extract_entity_id(entity);
        return some(get_unchecked_id(id));
    }

    const get_unchecked_id = (id:number):T => {
        return components[entities[id]];
    }

    const components_iter:Iterable<T> = {
        [Symbol.iterator]: () => {
            let index = 0;
            const next = () => {
                if(index >= total) {
                    return {done: true, value: undefined}
                }

                return {done: false, value: components[index++]}
            }

            return {next};
        }
    }

    const entities_iter:Iterable<Entity> = {
        [Symbol.iterator]: () => {
            let index = 0;
            const next = () => {
                if(index >= total) {
                    return {done: true, value: undefined}
                }

                return {done: false, value: entities[index++]}
            }

            return {next};
        }
    }


    return {
        has_entity,
        has_entity_id,
        realloc_entities,
        insert,
        remove,
        components_iter,
        entities_iter,
        len: () => total,
        get,
        get_unchecked_id,
        entities: () => entities,
        components: () => components,
        [Symbol.iterator]: () => {
            let index = 0;
            const next = () => {
                if(index >= total) {
                    return {done: true, value: undefined}
                }

                const value:[Entity,T] = [entities[index], components[index]];
                index++;
                return {done: false, value}
            }

            return {next};
        }
    }
}