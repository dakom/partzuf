import {init_ecs} from "../lib/core/ecs";
import {not} from "../lib/core/query";
import {map as oMap, fold as oFold} from "fp-ts/lib/Option";

const LABEL = (desc: string): string => `[ecs] ${desc}`;

type Label = string;
type Point = {x: number; y: number};
type Toggle = boolean; 

test(LABEL("various 1"), () => {
    const ecs = init_ecs<[
        Label,
        Point,
        Toggle
    ]>(3);

    const entity_1 = ecs.create_entity([
        [0, "hello"],
        [2, true]
    ]);

    const entity_2 = ecs.create_entity([
        [0, "world"],
        [1, {x: 10, y: 42}]
    ]);
    console.log(
        Array
            .from(ecs.iter_components_raw([0, 2]))
            .map(x => x.map(oFold(() => null, x => x)))
    );

    console.log(Array.from(ecs.iter_components([0, 2])));
    //this seems wrong...
    console.log(Array.from(ecs.iter_components([not(1)])));
    console.log(Array.from(ecs.iter_components([0, 1, 2])));
    console.log(Array.from(ecs.iter_components([0, not(1), 2])));
});
