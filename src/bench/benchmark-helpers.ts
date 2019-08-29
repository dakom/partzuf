import {ECS, init_ecs} from "../lib/lib";
import * as O from "fp-ts/lib/Option";
import {Option} from "fp-ts/lib/Option";
import {Either} from "fp-ts/lib/Either";
import * as E from "fp-ts/lib/Either";
export type MyECS = ECS<ComponentTypes>;
export type MyNativeMap = Map<any, Entity>;

export const ACTIVE = 0;
export const TRANSLATION = 1;
export const ROTATION = 2;
export const SCALE = 3;
export const LOCAL_MATRIX = 4;
export const VELOCITY = 5;
export const MATERIAL = 6;
export const WORLD_MATRIX = 7;
export const COLLIDER = 8;

const N_ENTITIES = 100;
const SHUFFLE = true;

export const simulate_quick_either = <V>(value:V):V =>
    E.getOrElse(() => null) (E.right(value));

//Prep mock data
export const prep_mock_data = ():[MyECS, MyNativeMap] => {
    let ecs:MyECS;
    let nativemap:MyNativeMap;

    ecs = init_ecs<ComponentTypes>(9);
    nativemap = new Map();

    let ecs_entities = [];
    let nativemap_entities = [];

    for(let i = 0; i < N_ENTITIES; i++) {
        ecs_entities.push(insert_ecs(ecs));
        nativemap_entities.push(insert_nativemap(nativemap));
    }

    if(SHUFFLE) {
        shuffle(ecs_entities);
        shuffle(nativemap_entities);

        for(let i = 0; i < 5; i++) {
            const tmp_ecs_entities = ecs_entities.splice(0,N_ENTITIES/2);
            const tmp_nativemap_entities = nativemap_entities.splice(0,N_ENTITIES/2);

            tmp_ecs_entities.forEach(entity => {
                ecs.remove_entity(entity);
            });
            tmp_nativemap_entities.forEach(entity => {
                nativemap.delete(entity);
            });

            for(let i = 0; i < N_ENTITIES/2; i++) {
                ecs_entities.push(insert_ecs(ecs));
                nativemap_entities.push(insert_nativemap(nativemap));
            }
        }
    }
    return [ecs, nativemap];
}
//https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}


const insert_ecs = (ecs:MyECS) => {
    const entity = ecs.create_entity([
        [ACTIVE, rand_bool()],
        [TRANSLATION, rand_point()],
        [ROTATION, rand_quat()],
        [SCALE, rand_point()],
        [LOCAL_MATRIX, rand_mat4()],
        [VELOCITY, rand_point()],
        [MATERIAL, rand_material()],
        [WORLD_MATRIX, rand_mat4()],
        [COLLIDER, rand_collider()]
    ]);

    return entity;
}

let nativemap_counter = 0;
const insert_nativemap = (nativemap:MyNativeMap) => {
    nativemap.set(nativemap_counter, {
        active: rand_bool(),
        transform: {
            translation: rand_point(),
            rotation: rand_quat(),
            scale: rand_point(),
            localMatrix: rand_mat4(),
        },
        velocity: rand_point(),
        worldMatrix: rand_mat4(),
        material: rand_material(),
        collider: rand_collider()
    });

    return nativemap_counter++;
    
}

const rand_bool = ():boolean => Math.random() < .5 ? true : false;
const rand_num = ():number => Math.random() * 100;

const rand_point = ():Point => ({
    x: rand_num(),
    y: rand_num(),
    z: rand_num(),
});

const rand_quat= ():Quaternion => ({
    x: rand_num(),
    y: rand_num(),
    z: rand_num(),
    w: rand_num(),
});
const rand_mat4 = ():Matrix4=> Float64Array.from([
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
    rand_num(),
]);

const rand_material = ():Material => ({
    shaderId: rand_num(),
    textureId: rand_num(),
    alpha: rand_bool()
});

const rand_collider = ():Collider => ({
    extents: {
        top: rand_num(),
        left: rand_num(),
        bottom: rand_num(),
        right: rand_num(),
    },
    center: rand_point()
})

export type ComponentTypes = [
    boolean,
    Translation,
    Rotation,
    Scale,
    Matrix4,
    Velocity,
    Material,
    Matrix4,
    Collider
];

export type Translation = Point;
export type Rotation = Quaternion;
export type Scale = Point;
export type Velocity = Point;

export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

export type Matrix4 = Float64Array;


export interface Material {
    shaderId: number;
    textureId: number;
    alpha: boolean;
}


export interface Collider {
    extents: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }
    center: Point;
}

export interface Transform {
    translation: Translation;
    rotation: Rotation;
    scale: Scale;
    localMatrix: Matrix4;
}

export interface Entity {
    active: boolean;
    transform: Transform;
    velocity: Velocity;
    material: Material;
    worldMatrix: Matrix4;
    collider: Collider;
}


interface Point {
    x: number;
    y: number;
    z: number;
}

//from gl-matrix
export function fromRotationTranslationScale(q, v, s) {
    const out = new Float64Array(16);
  // Quaternion math
  let x = q[0], y = q[1], z = q[2], w = q[3];
  let x2 = x + x;
  let y2 = y + y;
  let z2 = z + z;
  let xx = x * x2;
  let xy = x * y2;
  let xz = x * z2;
  let yy = y * y2;
  let yz = y * z2;
  let zz = z * z2;
  let wx = w * x2;
  let wy = w * y2;
  let wz = w * z2;
  let sx = s[0];
  let sy = s[1];
  let sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}

export function multiply_mat4(a, b) {
    const out = new Float64Array(16);
  let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  // Cache only the current line of the second matrix
  let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
  return out;
}
