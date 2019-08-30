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
    insert_ecs,
    insert_nativemap
    } from "./benchmark-helpers";

/*
 * the idea behind the benchmark is to simulate a real-world situation
 * where data is grouped by entity, and processed according to business-logic
 */

const [ecs, nativemap] = prep_mock_data();

const ecs_bench = () => {

    //UPDATE LOCAL POSITIONS
    for (const [entity, [t, r, s]] of ecs.iter_components([TRANSLATION, ROTATION, SCALE])) {

        t.x += 1;
        t.y += 1;
        t.z += 1;

        r.x += 1;
        r.y += 1;
        r.z += 1;
        (r as Quaternion).w += 1;

        s.x += 1;
        s.y += 1;
        s.z += 1;
    }

    //UPDATE LOCAL MATRIX

    for (const [entity, [t, r, s, local_matrix]] of ecs.iter_components([TRANSLATION, ROTATION, SCALE, LOCAL_MATRIX])) {
        fromRotationTranslationScale(r, t, s) (local_matrix);
    }

    //UPDATE WORLD MATRIX
    for (const [entity, [local_matrix, world_matrix]] of ecs.iter_components([LOCAL_MATRIX, WORLD_MATRIX])) {
        multiply_mat4(local_matrix, local_matrix) (world_matrix);
    }
       

    //UPDATE PHYSICS and check if active
    for (const [entity, components] of ecs.iter_components([VELOCITY, COLLIDER, ACTIVE])) {
        const [velocity,collider, active]  = components as [Velocity, Collider, boolean];
        if(active) {
            velocity.x *= 1;
            velocity.y *= 1;
            velocity.z *= 1;

            collider.center.x -= 1;
            collider.center.y -= 1;
            collider.center.z -= 1;
        }
    }

    //Update material 
    for (const [entity, [material]] of ecs.iter_components([MATERIAL])) {
        material.alpha = !material.alpha;
    }
}

const nativemap_bench = () => {
    //UPDATE LOCAL POSITIONS
    for (const entity of nativemap.values()) {
        const {transform} = entity; 
        const { translation: t, rotation: r, scale: s } = transform;

        t.x += 1;
        t.y += 1;
        t.z += 1;

        r.x += 1;
        r.y += 1;
        r.z += 1;
        (r as Quaternion).w += 1;

        s.x += 1;
        s.y += 1;
        s.z += 1;
    }

    //UPDATE LOCAL MATRIX
    for (const entity of nativemap.values()) {
        const { transform} = entity; 
        const { translation: t, rotation: r, scale: s, localMatrix} = transform;

        fromRotationTranslationScale(r, t, s) (localMatrix);
    }
       
    //UPDATE WORLD TRANSFORMS
    for (const entity of nativemap.values()) {
        const { transform, worldMatrix } = entity; 
        const { localMatrix } = transform;

        multiply_mat4(localMatrix, localMatrix) (worldMatrix);
    }

    //UPDATE PHYSICS MUTABLY
    for (const entity of nativemap.values()) {
        const { velocity, collider, active} = entity; 

        if(active) {
            velocity.x *= 1;
            velocity.y *= 1;
            velocity.z *= 1;

            collider.center.x -= 1;
            collider.center.y -= 1;
            collider.center.z -= 1;
        }
    }

    for (const entity of nativemap.values()) {
        const { material } = entity; 

        material.alpha = !material.alpha;
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
