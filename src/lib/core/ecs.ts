import {Pool, init_pool} from "./pool";
import {Entity, init_entities} from "./entities";
import {fold as oFold, Option, some, none, map as oMap, chain as oChain} from "fp-ts/lib/Option";
import {QueryWrapper} from "./query";

export const init_ecs = <T extends Array<any>>(n_components:T["length"]) => {
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

    type ComponentUpdater = <I extends number>(all_entity_components:Array<[I,T[I]]>) => Array<[I,T[I]]>;
    const update_components = (updater: ComponentUpdater) => (entity:Entity) => {
        const all_entity_components = get_components(entity);
        const components_to_set = updater(all_entity_components);
        set_components (components_to_set) (entity);
    }

    const iter_components_raw = <I extends number>(component_types:Array<I>):Iterable<Array<Option<[Entity, T[I]]>>> => ({
        [Symbol.iterator]: () => {
            let index = 0;

            const pool_iters = 
                component_types
                    //can't verify I at type level, so gotta filter bad values at runtime
                    .filter(n => n >= 0 && n < n_components)
                    .map(c_index => pools[c_index])
                    .map(pool => pool[Symbol.iterator]());

            const next = () => {

                const next_values = pool_iters.map(({next}) => next());

                if(next_values.every(({done}) => done)) {
                    return {done: true, value: undefined}
                }

                const value = next_values.map(({done, value}) => 
                    done 
                        ? none
                        : some(value)
                );

                return {done: false, value};
            }

            return {next}
        }
    });


    //TODO - this is a mess... can definitely simplify
    const iter_components = <I extends number>(component_types:Array<I | QueryWrapper>):Iterable<[Entity, Array<T[I]>]> => ({
        [Symbol.iterator]: () => {
            let index = 0;

            let query_pools = 
                component_types
                    .map(n => ({
                        value: typeof n === "number" ? n : n.index,
                        original: n
                    }))
                    //can't verify I at type level, so gotta filter bad values at runtime
                    .filter(({value}) => value >= 0 && value < n_components)
                    .map(({value, original}) => {
                        return {
                            pool: pools[value],
                            query: original
                        }
                    })
                    .sort((a, b) => b.pool.entities_list.length - a.pool.entities_list.length);

            const longest_pool = query_pools.splice(0, 1)[0];

            const next = () => {
                let keep_going:boolean;
                let entity:Entity;
                let ret_components:Array<T[I]>;
                do { 
                    if(index >= longest_pool.pool.entities_list.length) {
                        return {done: true, value: undefined}
                    }


                    entity = longest_pool.pool.entities_list[index];
                    ret_components = [longest_pool.pool.components_list[index]];
                    index++;
                    keep_going = false;
                    for(let i = 0; i < query_pools.length; i++) {
                        const query_pool = query_pools[i];
                        const idx = query_pool.pool.entities_list.indexOf(entity);
                        const query_n = query_pool.query;
                        if(typeof query_n === "number" || query_n.query_type === "has") {
                            if(idx === -1) {
                                keep_going = true;
                                break;
                            } 
                            ret_components.push(query_pool.pool.components_list[idx]);
                        } else {
                            if(idx !== -1) {
                                keep_going = true;
                                break;
                            }
                        }
                    }
                } while(keep_going);

                return {done: false, value: [entity, ret_components] as [Entity, Array<T[I]>]};
            }

            return {next}
        }
    });
    return {
        create_entity,
        get_components,
        set_components,
        remove_components,
        update_components,
        iter_components_raw,
        iter_components
    }
}