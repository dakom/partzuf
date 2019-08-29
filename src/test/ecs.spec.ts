import {init_ecs} from "../lib/core/ecs";
import {map as oMap, fold as oFold} from "fp-ts/lib/Option";

const LABEL = (desc: string): string => `[ecs] ${desc}`;

type Label = string;
type Point = {x: number; y: number};
type Toggle = boolean; 

test(LABEL("suite 1"), () => {
    const ecs = init_ecs<[
        Label,
        Point,
        Toggle
    ]>(3);

    const LABEL = 0;
    const POINT = 1;
    const TOGGLE = 2;
    const entity_1 = ecs.create_entity([
        [LABEL, "hello"],
        [TOGGLE, true]
    ]);

    const entity_2 = ecs.create_entity([
        [LABEL, "world"],
        [POINT, {x: 10, y: 42}]
    ]);


    expect([ [entity_1, ["hello", true]] ]).toEqual(
        Array.from(ecs.iter_components([LABEL, TOGGLE])
    ));

    expect([]).toEqual(
        Array.from(ecs.iter_components([LABEL, POINT, TOGGLE])
    ));

    expect([
        [entity_1, ["hello"]],
        [entity_2, ["world"]]
    ]).toEqual(
        Array.from(ecs.iter_components([LABEL])
    ));
});

test(LABEL("suite 2"), () => {
    const ecs = init_ecs<[
        Label,
        Point,
        Toggle
    ]>(3);

    const LABEL = 0;
    const POINT = 1;
    const TOGGLE = 2;
    const entity_1 = ecs.create_entity([
        [LABEL, "hello"],
        [TOGGLE, true]
    ]);

    const entity_2 = ecs.create_entity([
        [LABEL, "world"],
        [POINT, {x: 10, y: 42}]
    ]);


    ecs.remove_components([LABEL]) (entity_1);

    expect([ ]).toEqual(
        Array.from(ecs.iter_components([LABEL, TOGGLE])
    ));

    expect([ 
        [entity_1, [true]]
    ]).toEqual(
        Array.from(ecs.iter_components([TOGGLE])
    ));


    ecs.set_components([
        [LABEL, "wowza"]
    ]) (entity_1);


    expect([ 
        [entity_1, ["wowza", true]]
    ]).toEqual(
        Array.from(ecs.iter_components([LABEL, TOGGLE])
    ));

    expect(2).toBe(ecs.entities_len());

    ecs.remove_entity(entity_1);
    expect(1).toBe(ecs.entities_len());
    expect([]).toEqual(
        Array.from(ecs.iter_components([LABEL, TOGGLE])
    ));
});
