import Benchmark from "benchmark";
import {
    prep_mock_data, 
    multiply_mat4, 
    fromRotationTranslationScale, 
    Matrix4, 
    Translation, 
    Rotation, 
    Scale, 
    Velocity, 
    Material, 
    Collider, 
    Quaternion,
    ACTIVE, 
    TRANSLATION, 
    ROTATION, 
    SCALE, 
    LOCAL_MATRIX, 
    WORLD_MATRIX, 
    VELOCITY, 
    MATERIAL, 
    COLLIDER, 
    } from "./benchmark-helpers";

/*
 * the idea behind the benchmark is to simulate a real-world situation
 * where data is grouped by entity, and processed according to business-logic
 */

const [ecs, nativemap] = prep_mock_data();

const ecs_bench = () => {

    //TOGGLE IS_ACTIVE
    for (const [entity, [isActive]] of ecs.iter_components([ACTIVE])) {
        ecs.set_components([[ACTIVE, !isActive]]) (entity);
    }

    //UPDATE LOCAL POSITIONS
    for (const [entity, [t, r, s]] of ecs.iter_components([TRANSLATION, ROTATION, SCALE])) {

        const translation = {
            x: t.x + 1,
            y: t.y + 1,
            z: t.z + 1,
        }

        const rotation = {
            x: r.x + 1,
            y: r.y + 1,
            z: r.z + 1,
            w: (r as Quaternion).w + 1,
        }

        const scale = {
            x: s.x + 1,
            y: s.y + 1,
            z: s.z + 1,
        }
        ecs.set_components([
            [TRANSLATION, translation],
            [ROTATION, rotation],
            [SCALE, scale],
        ]) (entity);
    }

    //UPDATE LOCAL MATRIX

    for (const [entity, [t, r, s]] of ecs.iter_components([TRANSLATION, ROTATION, SCALE])) {

        const local_matrix = fromRotationTranslationScale(r, t, s);
        ecs.set_components([
            [LOCAL_MATRIX, local_matrix],
        ]) (entity);
    }

    //UPDATE WORLD MATRIX
    for (const [entity, [local_matrix]] of ecs.iter_components([LOCAL_MATRIX])) {
        const world_matrix = multiply_mat4(local_matrix, local_matrix);
        ecs.set_components([
            [WORLD_MATRIX, world_matrix],
        ]) (entity);
    }
       

    //UPDATE PHYSICS (via mutation)
    for (const [entity, components] of ecs.iter_components([VELOCITY, COLLIDER])) {
        const [velocity,collider]  = components as [Velocity, Collider];

        velocity.x *= 1;
        velocity.y *= 1;
        velocity.z *= 1;

        collider.center.x -= 1;
        collider.center.y -= 1;
        collider.center.z -= 1;
    }

    //Update material 
    for (const [entity, [material]] of ecs.iter_components([MATERIAL])) {
        const new_material = {alpha: !material.alpha, ...material};
        ecs.set_components([
            [MATERIAL, new_material],
        ]) (entity);
    }
}

const nativemap_bench = () => {
    //TOGGLE IS_ACTIVE
    for (const [key, entity] of nativemap.entries()) {
        const { active } = entity; 
        nativemap.set(key, {
            ...entity,
            active: !active,
        });
    }
    //UPDATE LOCAL POSITIONS
    for (const [key, entity] of nativemap.entries()) {
        const {transform} = entity; 
        const { translation: t, rotation: r, scale: s } = transform;
        const translation = {
            x: t.x + 1,
            y: t.y + 1,
            z: t.z + 1,
        }

        const rotation = {
            x: r.x + 1,
            y: r.y + 1,
            z: r.z + 1,
            w: r.w + 1,
        }

        const scale = {
            x: s.x + 1,
            y: s.y + 1,
            z: s.z + 1,
        }


        nativemap.set(key, {
            ...entity,
            transform: {
                ...transform,
                translation, rotation, scale
            },
        });
    }

    //UPDATE LOCAL MATRIX
    for (const [key, entity] of nativemap.entries()) {
        const { transform } = entity; 
        const { translation, rotation, scale } = transform;
        const local_matrix = fromRotationTranslationScale(translation, rotation, scale);

        nativemap.set(key, {
            transform: {
                ...transform,
                localMatrix: local_matrix
            },
            ...entity
        });
    }
       
    //UPDATE WORLD TRANSFORMS
    for (const [key, entity] of nativemap.entries()) {
        const { transform } = entity; 
        const { localMatrix } = transform;

        const worldMatrix = multiply_mat4(localMatrix, localMatrix);
        nativemap.set(key, {
            worldMatrix,
            ...entity
        });
    }

    //UPDATE PHYSICS MUTABLY
    for (const [key, entity] of nativemap.entries()) {
        const { velocity, collider} = entity; 
        velocity.x *= 1;
        velocity.y *= 1;
        velocity.z *= 1;

        collider.center.x -= 1;
        collider.center.y -= 1;
        collider.center.z -= 1;
    }
        //Update material partially, immutably

    for (const [key, entity] of nativemap.entries()) {
        const { material } = entity; 

        const new_material = { alpha: !material.alpha, ...material };

        nativemap.set(key, {
            ...entity,
            material: new_material,
        });
    }
}

const suite = new Benchmark.Suite();

suite
    .add("nativemap", nativemap_bench)
    .add("ecs", ecs_bench)
    .on("start", () => {
        if(nativemap.size !== ecs.entities_len()) {
            throw new Error("internal error - different amount of items!");
        }
        console.log(`running benchmark for ${nativemap.size} entries`);
    })
    .on('cycle', function(event) {
      console.log(String(event.target));
    })
    .on('complete', function() {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run();
