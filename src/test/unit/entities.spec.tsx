import {create_world, Entity, extract_entity_id, extract_entity_version} from "../../lib/lib";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import { EntityListFilter } from "../../lib/core/entity";

const LABEL = (desc:string):string =>
    `[entities] ${desc}`;

test(LABEL("add"), () => {
    const world = create_world();
    let entity = world.entities.create();

    let entity_id = extract_entity_id(entity);
    let entity_version = extract_entity_version(entity);

    expect(0).toBe(entity_id);
    expect(0).toBe(entity_version);

    entity = world.entities.create();

    entity_id = extract_entity_id(entity);
    entity_version = extract_entity_version(entity);

    expect(1).toBe(entity_id);
    expect(0).toBe(entity_version);
    const all_entities = world.entities.list_all();

    entity_id = extract_entity_id(all_entities[0]);
    entity_version = extract_entity_version(all_entities[0]);
    expect(0).toBe(entity_id);
    expect(0).toBe(entity_version);

    entity_id = extract_entity_id(all_entities[1]);
    entity_version = extract_entity_version(all_entities[1]);
    expect(1).toBe(entity_id);
    expect(0).toBe(entity_version);
});

test(LABEL("remove"), () => {
    const world = create_world();

    const entity_0 = world.entities.create();
    const entity_1 = world.entities.create();
    const entity_2 = world.entities.create();
    world.entities.remove(entity_0);
    world.entities.remove(entity_2);

    const alive_ids = world.entities.list_alive().map(extract_entity_id);

    expect(Uint32Array.from([1])).toEqual(alive_ids);
});

test(LABEL("add, remove, add"), () => {
    const world = create_world();

    const entity_0 = world.entities.create();
    const entity_1 = world.entities.create();
    const entity_2 = world.entities.create();
    const entity_3 = world.entities.create();
    world.entities.remove(entity_1);
    world.entities.remove(entity_2);

    world.entities.create();
    world.entities.create();

    const alive_entities = world.entities.list_alive()
    const alive_ids = alive_entities.map(extract_entity_id);
    const alive_versions = alive_entities.map(extract_entity_version);

    expect(Uint32Array.from([0, 1,2,3])).toEqual(alive_ids);
    expect(Uint32Array.from([0, 1,1,0])).toEqual(alive_versions);

    //console.log(entities_to_string(alive_entities));

});

//This is correct for EnTT - should be lower in shipyard 
test(LABEL("version spread"), () => {
    const world = create_world();

    const entities = new Array(10).fill(null).map(world.entities.create);
    const list = world.entities.list_all();

    entities.forEach(world.entities.remove);

    for(let i = 0; i < 100; i++) {
        const entity = world.entities.create();
        world.entities.remove(entity);
    }

    world.entities.create();

    const alive_entities = world.entities.list_alive()
    const alive_ids = alive_entities.map(extract_entity_id);
    const alive_versions = alive_entities.map(extract_entity_version);

    expect(Uint32Array.from([101])).toEqual(alive_versions);
});

/*

test(LABEL("printout"), () => {
    const world = create_world();

    const log = (label:string) => {
        const destroyed_str = world.entities.destroyed_to_string();
        console.log(
            label 
            + `\n destroyed is ${destroyed_str}`
            + `\n ${world.entities.list_to_string()}`
        );
    }

    const log_with_entity = (label:string) => (entity:Entity) => {
        log(`${label}: ${world.entities.entity_to_string(entity)}`);
    }

    const log_with_raw_entity = (label:string) => (entity:Entity) => {
        log(`${label}: ${world.entities.entity_to_string_raw(entity)}`);
    }

    let E0 = world.entities.create();
    let E1 = world.entities.create();
    let E2 = world.entities.create();
    log("Add 3 entities:");

    world.entities.remove(E1);
    log("Remove E1");

    let E_tmp = world.entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    world.entities.remove(E_tmp);
    log_with_raw_entity(`Remove`) (E_tmp);

    world.entities.remove(E0);
    log(`Remove E0`);

    world.entities.remove(E2);
    log(`Remove E2`);

    E_tmp  = world.entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    E_tmp  = world.entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    E_tmp  = world.entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    E_tmp  = world.entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 
});
*/

