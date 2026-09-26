# Member 3 — MD5 Compression Rounds

> **File:** `experiments/md5/member3-rounds.js`
> **Author:** Member 3
> **Role in project:** Implements the 64-step compression loop (the mathematical heart of MD5)

---

## Table of Contents

1. [Overview](#overview)
2. [Where This Fits in MD5](#where-this-fits-in-md5)
3. [Dependencies — Member 2's Module](#dependencies--member-2s-module)
4. [API Reference](#api-reference)
5. [Algorithm — Step-by-Step](#algorithm--step-by-step)
   - [Initial Setup](#1-initial-setup)
   - [The 64-Step Loop](#2-the-64-step-loop)
   - [Round 1 — F function](#round-1--f-function-steps-0--15)
   - [Round 2 — G function](#round-2--g-function-steps-16--31)
   - [Round 3 — H function](#round-3--h-function-steps-32--47)
   - [Round 4 — I function](#round-4--i-function-steps-48--63)
   - [Core Step Mechanics](#core-step-mechanics)
   - [Feed-Forward Addition](#3-feed-forward-addition)
6. [Unsigned 32-bit Arithmetic](#unsigned-32-bit-arithmetic)
7. [Usage Example](#usage-example)
8. [What This Module Does NOT Do](#what-this-module-does-not-do)
9. [Project Member Responsibilities](#project-member-responsibilities)
10. [References](#references)

---

## Overview

This module is **Member 3's contribution** to a collaborative MD5 implementation.

It exports a single function, `processBlock(block, state)`, which performs
the **64 compression operations** defined in [RFC 1321](https://www.ietf.org/rfc/rfc1321.txt)
on a single 512-bit (64-byte) message block. This is the core computation that
mixes the message data into the hash state across four distinct rounds, each
using a different auxiliary bitwise function.

All constants (`S`, `K`) and auxiliary functions (`F`, `G`, `H`, `I`, `leftRotate`)
are **imported from Member 2's module** and are treated as fully complete. Nothing
from Member 2's work is redefined here.

---

## Where This Fits in MD5

MD5 processes a message in stages:

```
Raw message
    │
    ▼
[Member 1] — Preprocessing & Padding
    │  Pads message to a multiple of 512 bits;
    │  appends original length in the last 64 bits.
    │
    ▼
[Member 1] — Chunk the padded message into 512-bit blocks
    │  Each block becomes an array of 16 × 32-bit little-endian words.
    │
    ▼
[Member 2] — Constants & Auxiliary Functions
    │  Provides: S (shift amounts), K (sine-derived constants),
    │  F, G, H, I (bitwise round functions), leftRotate
    │
    ▼
[Member 3 — THIS FILE] — processBlock(block, state)
    │  Applies 64 compression steps to one block, updating {A, B, C, D}.
    │  Called once per 512-bit block in a loop.
    │
    ▼
[Member 4] — Final Hash Conversion
       Converts the final {A, B, C, D} state into the
       familiar 32-character hexadecimal digest string.
```

---

## Dependencies — Member 2's Module

```js
const { S, K, F, G, H, I, leftRotate } = require('./member2-functions');
```

| Import | Type | Description |
|--------|------|-------------|
| `S` | `number[64]` | Per-step left-rotation amounts (4 groups of 16, defined in RFC 1321 §3.4) |
| `K` | `number[64]` | Per-step additive constants derived from `abs(sin(i+1)) * 2^32` |
| `F(b,c,d)` | function | Round 1 auxiliary: `(b & c) \| (~b & d)` |
| `G(b,c,d)` | function | Round 2 auxiliary: `(b & d) \| (c & ~d)` |
| `H(b,c,d)` | function | Round 3 auxiliary: `b ^ c ^ d` |
| `I(b,c,d)` | function | Round 4 auxiliary: `c ^ (b \| ~d)` |
| `leftRotate(x,n)` | function | Rotates 32-bit integer `x` left by `n` bits |

---

## API Reference

### `processBlock(block, state)`

Applies MD5's 64-step compression to one 512-bit message block and returns
the new accumulated hash state.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `block` | `number[]` | Array of **16 unsigned 32-bit integers** representing one 512-bit chunk of the (padded) message, stored in **little-endian** byte order |
| `state` | `{ A, B, C, D }` | Current MD5 running state — four unsigned 32-bit integers |

#### Returns

`{ A, B, C, D }` — the **updated** state object with the same shape as the input
state, after all 64 compression steps and the feed-forward addition.

#### Export

```js
module.exports = { processBlock };
```

---

## Algorithm — Step-by-Step

### 1. Initial Setup

Working register copies `a`, `b`, `c`, `d` are taken from the incoming state
and immediately coerced to unsigned 32-bit integers:

```js
let a = state.A >>> 0;
let b = state.B >>> 0;
let c = state.C >>> 0;
let d = state.D >>> 0;
```

The `>>> 0` idiom in JavaScript converts any number to an **unsigned 32-bit integer**,
discarding the sign bit. This is essential because JS bitwise operators work on
signed 32-bit integers internally.

---

### 2. The 64-Step Loop

The loop runs `i` from `0` to `63`. Each iteration belongs to one of four rounds
determined by the value of `i`:

| `i` range | Round | Auxiliary fn | Message word index `g` |
|------------|-------|-------------|------------------------|
| 0 – 15 | Round 1 | `F(b,c,d)` | `g = i` |
| 16 – 31 | Round 2 | `G(b,c,d)` | `g = (5×i + 1) mod 16` |
| 32 – 47 | Round 3 | `H(b,c,d)` | `g = (3×i + 5) mod 16` |
| 48 – 63 | Round 4 | `I(b,c,d)` | `g = (7×i) mod 16` |

---

### Round 1 — F function (steps 0 – 15)

```
F(b, c, d) = (b AND c) OR (NOT b AND d)
```

- Acts as a **conditional**: if bit of `b` is 1, choose the bit from `c`; otherwise from `d`.
- Message words are accessed **sequentially**: word 0, 1, 2 … 15.

---

### Round 2 — G function (steps 16 – 31)

```
G(b, c, d) = (b AND d) OR (c AND NOT d)
```

- Mirror of F: if bit of `d` is 1, choose from `b`; otherwise from `c`.
- Message words are accessed in the order determined by `(5i + 1) mod 16`:
  `1, 6, 11, 0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12`

---

### Round 3 — H function (steps 32 – 47)

```
H(b, c, d) = b XOR c XOR d
```

- **Parity function**: output is 1 wherever an odd number of inputs are 1.
- Message word order via `(3i + 5) mod 16`:
  `5, 8, 11, 14, 1, 4, 7, 10, 13, 0, 3, 6, 9, 12, 15, 2`

---

### Round 4 — I function (steps 48 – 63)

```
I(b, c, d) = c XOR (b OR NOT d)
```

- Designed so that if corresponding bit of `d` is 1 the bit of `c` is left unchanged,
  otherwise it is flipped.
- Message word order via `(7i) mod 16`:
  `0, 7, 14, 5, 12, 3, 10, 1, 8, 15, 6, 13, 4, 11, 2, 9`

---

### Core Step Mechanics

Every one of the 64 steps performs this register rotation:

```
temp  ← d
d     ← c
c     ← b
sum   ← (auxFunc + a + K[i] + block[g])  mod 2³²
b     ← b + leftRotate(sum, S[i])         mod 2³²
a     ← temp
```

Visually, the four registers shift around the loop: `d → c → b → (new b)`, and
`a` receives the old `d`. The net effect after 4 steps is that each register
has absorbed one new mix.

In JavaScript:

```js
const temp = d;
d = c;
c = b;
const sum = (auxFunc + a + K[i] + block[g]) >>> 0;
b = (b + leftRotate(sum, S[i])) >>> 0;
a = temp;
```

---

### 3. Feed-Forward Addition

After all 64 steps, the working registers are added back to the **original** state
values (Merkle–Damgård strengthening / Davies–Meyer construction):

```js
return {
    A: (state.A + a) >>> 0,
    B: (state.B + b) >>> 0,
    C: (state.C + c) >>> 0,
    D: (state.D + d) >>> 0,
};
```

This addition is also performed `mod 2³²` (`>>> 0`), which prevents the internal
state from ever growing beyond 32 bits per register.

---

## Unsigned 32-bit Arithmetic

JavaScript's `Number` type is a 64-bit float, but MD5 is defined over 32-bit
unsigned integer arithmetic. The `>>> 0` (unsigned right shift by zero) trick
is the standard JavaScript idiom to enforce this:

| Expression | Effect |
|------------|--------|
| `x >>> 0` | Converts `x` to an unsigned 32-bit integer (Uint32) |
| `(a + b) >>> 0` | Adds two numbers and truncates to 32 bits (mod 2³²) |

Without `>>> 0`, JavaScript sums can silently exceed 2³² and produce incorrect results.

---

## Usage Example

> **Note:** This module only implements `processBlock`. The caller is responsible
> for message padding, chunking, and final digest conversion.

```js
const { processBlock } = require('./member3-rounds');

// MD5 initial hash values (RFC 1321 §3.3) — little-endian word order
const initState = {
    A: 0x67452301,
    B: 0xEFCDAB89,
    C: 0x98BADCFE,
    D: 0x10325476,
};

// A single 512-bit block — 16 × 32-bit words (provided by Member 1 after padding)
const block = new Array(16).fill(0);
// block[0] = first 4 bytes of padded message as a little-endian uint32
// block[14] = original message length (low 32 bits), per RFC 1321

const newState = processBlock(block, initState);

console.log(newState);
// { A: <uint32>, B: <uint32>, C: <uint32>, D: <uint32> }
```

For a multi-block message, call `processBlock` in a loop, passing the returned
state as the input to the next call:

```js
let state = initState;
for (const block of blocks) {   // blocks provided by Member 1
    state = processBlock(block, state);
}
// state is now ready for Member 4's hex-conversion step
```

---

## What This Module Does NOT Do

| Responsibility | Owner |
|----------------|-------|
| Message padding (append `0x80`, zero-fill, length encoding) | Member 1 |
| Chunking padded message into 512-bit blocks | Member 1 |
| Defining `S`, `K`, `F`, `G`, `H`, `I`, `leftRotate` | Member 2 |
| Converting final `{A,B,C,D}` state to hex digest string | Member 4 |
| UI / integration / CLI / file I/O | Outside scope |

---

## Project Member Responsibilities

| Member | File | Responsibility |
|--------|------|----------------|
| Member 1 | `member1-*.js` | Preprocessing, padding, block splitting |
| Member 2 | `member2-functions.js` | Constants (`S`, `K`) and auxiliary functions (`F`,`G`,`H`,`I`,`leftRotate`) |
| **Member 3** | **`member3-rounds.js`** | **64-step compression loop — this file** |
| Member 4 | `member4-*.js` | Final state → hex digest conversion |

---

## References

| Resource | Description |
|----------|-------------|
| [RFC 1321](https://www.ietf.org/rfc/rfc1321.txt) | The original MD5 specification by Ron Rivest (1992) |
| [Wikipedia — MD5](https://en.wikipedia.org/wiki/MD5) | High-level overview with pseudocode |
| [MD5 Pseudocode (Wikipedia)](https://en.wikipedia.org/wiki/MD5#Pseudocode) | Direct reference for round formulas and `g` index expressions |
