import { fold as oFold } from "fp-ts/lib/Option";
import { fold as eFold } from "fp-ts/lib/Either";
import {ErrorKind} from "./errors";
import { Entity, init_entities, extract_entity_id } from "./entities";
import { init_pool, Pool } from "./pool";

export interface ECS<T extends Array<any>> {

    /**
     * Create a new entity
     * 
     * @param initial_components - (optional) initial components to set for the entity
     */
    create_entity: <I extends number>(initial_components:Array<[I, T[I]]>) => Entity;

    /**
     * Get all the components for a given entity
     * 
     * @param entity - the target entity
     */
    get_components: (entity:Entity) => Array<[number, T]>;
    /**
     * Set the components for a given entity
     * 
     * @param components - the components to set. A tuple where the first value is the component index, second is the component data
     * @param entity - the entity to set the components for
     */
    set_components: <I extends number>(components: Array<[I, T[I]]>) => (entity:Entity) => void;
    /**
     * Remove the components for a given entity
     * 
     * @param component_types - the components to remove (by index)
     * @param entity - the entity to remove the components for
     */
    remove_components: <I extends number>(component_types:Array<I>) => (entity:Entity) => void; 
    /**
     * Iterate over all entities that have a given set of components
     * The iterator returns a tuple of [Entity, Array<ComponentData>] corresponding to the requested components
     * 
     * @param component_types - the components to iterate over (by index)
     */
    iter_components: <I extends number>(component_types:Array<I>) => Iterable<[Entity, Array<T[I]>]>;

    /**
     * Remove an entity (and all its component data)
     * 
     * @param entity - the entity to remove
     */
    remove_entity: (entity:Entity) => void;

    /**
     * Returns the number of entities
     */
    entities_len: () => number;
}

/**
 * Create an ECS 
 * 
 * @param n_components - the number of components
 */
export const init_ecs = <T extends Array<any>>(n_components:T["length"]):ECS<T> => {
    const entities = init_entities();
    const pools:Array<Pool<T>> = [];

    for(let i = 0; i < n_components; i++) {
        pools.push(init_pool());
    }

    const create_entity = <I extends number>(initial_components:Array<[I, T[I]]>):Entity => {
        const [entity, n_alloc] = entities.create(); 

        if(n_alloc) {
            pools.forEach(pool => pool.realloc_entities(n_alloc));
        }

        set_components (initial_components) (entity);

        return entity;
    }

    const get_components = (entity:Entity):Array<[number, T]> => {
        const ret:Array<[number, T]> = [];

        pools.forEach((pool, c_index) => {
            oFold(
                () => {},
                (data:T) => ret.push([c_index, data])
            ) (pool.get(entity))
        });

        return ret;
    }

    const set_components = <I extends number>(components: Array<[I, T[I]]>) => (entity:Entity) => {
        components.forEach(([c_index, c_data]) => {
            pools[c_index].insert(entity, c_data);
        });
    }

    const remove_components = <I extends number>(component_types:Array<I>) => (entity:Entity) => {
        component_types
            //can't be caught in the typechecker - so filter out invalid values at runtime
            .filter(n => n >= 0 && n < n_components)
            .forEach(c_index => {
                pools[c_index].remove(entity);
            });
    }

    const remove_entity = (entity:Entity) => {
        pools.forEach(pool => pool.remove(entity));
        eFold(
            (e:ErrorKind) => {
                if(e === ErrorKind.EXHAUSTED_KEY_REMOVAL) {
                    throw new Error(e);
                }
            },
            () => {}
        ) (entities.remove(entity));
    }

    const iter_components = <I extends number>(component_types:Array<I>):Iterable<[Entity, Array<T[I]>]> => ({
        [Symbol.iterator]: () => {
            let index = 0;

            let query_pools = 
                component_types
                    //can't verify I at type level, so gotta filter bad values at runtime
                    .filter(n => n >= 0 && n < n_components)
                    .map(n => pools[n])
                    .sort((a, b) => a.len() - b.len());

            const shortest_pool = query_pools.splice(0, 1)[0];

            const n_pools = component_types.length;


            const all_pools = Array(n_pools);

            for(let i = 0; i < n_pools; i++) {
                all_pools[i] = pools[component_types[i]];
            }

            const len = shortest_pool.len();

            const shortest_entities = shortest_pool.entities();

            const next = () => {
                while(index < len) { 
                    const entity = shortest_entities[index++];
                    const id = extract_entity_id(entity);

                    if(query_pools.every(pool => pool.has_entity_id(id))) {
                        const components = all_pools.map(pool => pool.get_unchecked_id(id));
                        return {
                            done: false,
                            value: [entity, components] as [Entity, Array<T[I]>]
                        }
                    } 
                }

                return {done: true, value: undefined}
            }

            return {next}
        }
    });

    return {
        create_entity,
        get_components,
        set_components,
        remove_components,
        iter_components,
        remove_entity,
        entities_len: entities.alive_len
    }
}