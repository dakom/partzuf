import {Entity, init_entities} from "./entity";

export const create_world = () => {
    const entities = init_entities();
    const world = {entities};

    return world;
}
