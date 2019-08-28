[![Build Status](https://travis-ci.org/dakom/partzuf.svg?branch=master)](https://travis-ci.org/dakom/partzuf)

# Partzuf 

Simple ECS in JS

Picks up where [slotmap](https://github.com/dakom/slotmap) left off.

Similarly, it's inspired by [beach_map](https://github.com/leudz/beach_map) and [EnTT](https://github.com/skypjack/entt)

(and doesn't go near as far as either of those in terms of features or performance)

# Installation

`npm install --save partzuf`

# Usage

1. Initialize the ECS. If using typescript, supply every single component type here. The order will de-facto match what you use for ComponentId's later.

```
const ecs = init_ecs<[Label, Audio, Image]>();
```
# Notes on optimization

There is no group/pack mechanism. Mainly because there's no way of inlining data in JS anyway, so if that level of hand-tuned optimization is required - use C++/Rust/C.

