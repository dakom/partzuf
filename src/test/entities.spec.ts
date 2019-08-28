import {init_entities, extract_entity_id, extract_entity_version, MAX_VERSION} from "../lib/core/entities";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";

const LABEL = (desc: string): string => `[entities] ${desc}`;

test(LABEL("create"), () => {

    const entities = init_entities();
    let [entity] = entities.create();

    let entity_id = extract_entity_id(entity);
    let entity_version = extract_entity_version(entity);

    expect(0).toBe(entity_id);
    expect(0).toBe(entity_version);

    expect(entity).toBe(entities.get_at_index(entity_id));

    entity = entities.create()[0];

    entity_id = extract_entity_id(entity);
    entity_version = extract_entity_version(entity);

    expect(1).toBe(entity_id);
    expect(0).toBe(entity_version);
    expect(entity).toBe(entities.get_at_index(entity_id));
    
    const all_entities = entities.list_all();

    entity = all_entities[0];
    entity_id = extract_entity_id(entity);
    entity_version = extract_entity_version(entity);
    expect(0).toBe(entity_id);
    expect(0).toBe(entity_version);
    expect(entity).toBe(entities.get_at_index(entity_id));

    entity = all_entities[1];
    entity_id = extract_entity_id(entity);
    entity_version = extract_entity_version(entity);
    expect(1).toBe(entity_id);
    expect(0).toBe(entity_version);
    expect(entity).toBe(entities.get_at_index(entity_id));
});
test(LABEL("remove"), () => {
    const entities = init_entities();

    const [entity_0] = entities.create();
    const [entity_1] = entities.create();
    const [entity_2] = entities.create();
    entities.remove(entity_0);
    entities.remove(entity_2);

    const alive_ids = Uint32Array.from(entities).map(extract_entity_id);

    expect(Uint32Array.from([1])).toEqual(alive_ids);
});

test(LABEL("add, remove, add"), () => {
    const entities = init_entities();

    const [entity_0] = entities.create();
    const [entity_1] = entities.create();
    const [entity_2] = entities.create();
    const [entity_3] = entities.create();
    entities.remove(entity_1);
    entities.remove(entity_2);

    entities.create();
    entities.create();

    const alive_entities = Uint32Array.from(entities);
    const alive_ids = alive_entities.map(extract_entity_id);
    const alive_versions = alive_entities.map(extract_entity_version);

    expect(Uint32Array.from([0, 1,2,3])).toEqual(alive_ids);
    expect(Uint32Array.from([0, 1,1,0])).toEqual(alive_versions);
    expect(alive_entities[0]).toBe(entities.get_at_index(alive_ids[0]));

    //console.log(entities_to_string(alive_entities));

});

//This is correct for now... should be lower though! 
test(LABEL("version spread"), () => {
    const entities = init_entities();

    const tmp_entities = new Array(10).fill(null).map(() => entities.create()[0]);
    const list = entities.list_all();

    tmp_entities.forEach(entities.remove);

    for(let i = 0; i < 100; i++) {
        const [entity] = entities.create();
        entities.remove(entity);
    }

    entities.create();

    const alive_entities = Uint32Array.from(entities);
    const alive_ids = alive_entities.map(extract_entity_id);
    const alive_versions = alive_entities.map(extract_entity_version);

    expect(Uint32Array.from([101])).toEqual(alive_versions);
});

test(LABEL("version wrap"), () => {
    const entities = init_entities();

    const tmp_entities = new Array(10).fill(null).map(() => entities.create()[0]);
    const list = entities.list_all();

    tmp_entities.forEach(entities.remove);

    for(let x = 0; x < 3; x++) {
        for(let y = 0; y < MAX_VERSION+1; y++) {
            const [entity] = entities.create();
            entities.remove(entity);
        }
    }

    entities.create();

    const alive_entities = Uint32Array.from(entities);

    //console.log("len:", entities.list_all().length, "alive:", alive_entities.length);

    const alive_ids = alive_entities.map(extract_entity_id);
    const alive_versions = alive_entities.map(extract_entity_version);

    expect(Uint32Array.from([1])).toEqual(alive_versions);
});

/*

test(LABEL("printout"), () => {

    const entities = init_entities();

    const log = (label:string) => {
        const destroyed_str = entities.destroyed_to_string();
        console.log(
            label 
            + `\n destroyed is ${destroyed_str}`
            + `\n ${entities.list_to_string()}`
        );
    }

    const log_with_entity = (label:string) => (entity:Entity) => {
        log(`${label}: ${entities.entity_to_string(entity)}`);
    }

    const log_with_raw_entity = (label:string) => (entity:Entity) => {
        log(`${label}: ${entities.entity_to_string_raw(entity)}`);
    }

    let E0 = entities.create();
    let E1 = entities.create();
    let E2 = entities.create();
    log("Add 3 entities:");

    entities.remove(E1);
    log("Remove E1");

    let E_tmp = entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    entities.remove(E_tmp);
    log_with_raw_entity(`Remove`) (E_tmp);

    entities.remove(E0);
    log(`Remove E0`);

    entities.remove(E2);
    log(`Remove E2`);

    E_tmp  = entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    E_tmp  = entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    E_tmp  = entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 

    E_tmp  = entities.create();
    log_with_entity(`Add an entity`) (E_tmp); 
});
*/

