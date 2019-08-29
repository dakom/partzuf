[![Build Status](https://travis-ci.org/dakom/partzuf.svg?branch=master)](https://travis-ci.org/dakom/partzuf)

# Partzuf 

Simple proof-of-concept ECS in JS

Conceptually picks up where [slotmap](https://github.com/dakom/slotmap) left off, but is still more like a proof of concept than a robust solution.

It's inspired by [beach_map](https://github.com/leudz/beach_map) and [EnTT](https://github.com/skypjack/entt)

(and doesn't go near as far as either of those in terms of features or performance)

# Results

The only way it becomes faster than native map is when the following are true:
1. Entities are all aligned and sorted
2. Components are mutated directly

If either of these are not true, then the ECS is significantly slower than using native map.

This could maybe be mitigated via groups, archetypes, etc. - but at the end of the day, JS boxes Array values and it's probably better to stick with C++/Rust/C for this sort of stuff

# Installation

`npm install --save partzuf`

# Usage

Docs can be generated via `npm run doc`, but they're not great.

1. Initialize the ECS. Use typescript and supply every single component type here. The order will de-facto match what you use for ComponentId's later.

```
const ecs = init_ecs<[Label, Audio, Image]>(3);
```

The number is the number of component types

2. Create consts for the indices (not required but makes life much easier)

```
const LABEL = 0;
const AUDIO = 1;
const IMAGE = 2;
```

3. Instantiate entities, add components, iterate over subset of components, etc.

There's no hard limit to systems - you can jump around in whatever components you want (which could be what hurts performance):

```
for (const [entity, [t, r, s]] of ecs.iter_components([TRANSLATION, ROTATION, SCALE])) {
    const local_matrix = fromRotationTranslationScale(r, t, s);
    ecs.set_components([
        [LOCAL_MATRIX, local_matrix],
    ]) (entity);
}
```

See the tests and benchmark for examples 

# Notes on optimization and features

As noted above - there is no group/pack mechanism. Mainly because there's no way of manually aligning data in JS anyway, so if that level of hand-tuned optimization is required - use C++/Rust/C.

There's also a bunch of other features that would be nice to add, but aren't here (like boolean queries).