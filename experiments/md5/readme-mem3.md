# Member 3 — Contribution Documentation

> **Branch:** `member-3`
> **Repository:** [MD5_virtual_lab](https://github.com/dmelloruth21/MD5_virtual_lab)
> **File Owned:** `experiments/md5/member3-rounds.js`

---

## 👤 Member 3 Profile

| Field | Details |
|-------|---------|
| **Role** | MD5 Compression Rounds Developer |
| **Branch** | `member-3` |
| **Primary File** | `experiments/md5/member3-rounds.js` |
| **Dependency** | `experiments/md5/member2-functions.js` (Member 2) |
| **Exports** | `processBlock(block, state)` |

---

## 📁 File Structure (Member 3's Scope)

```
experiments/
└── md5/
    ├── member3-rounds.js   ← Member 3's implementation (THIS FILE)
    ├── readme-mem3.md      ← Member 3's documentation (THIS FILE)
    └── member2-functions.js  ← Dependency (Member 2, DO NOT MODIFY)
```

---

## 🎯 Task Description

Member 3 is responsible for implementing the **64-step compression loop** — the core mathematical engine of the MD5 hashing algorithm.

This is the most computationally intensive part of MD5. Every 512-bit block of the input message passes through this function before producing a final 128-bit (16-byte) hash digest.

---

## 📦 What Member 3 Implemented

### Function: `processBlock(block, state)`

The single exported function that performs MD5's 64 compression operations on one message block.

#### Signature
```js
const { processBlock } = require('./member3-rounds');

processBlock(block, state)
// Returns: { A, B, C, D }
```

#### Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `block` | `number[16]` | 16 unsigned 32-bit integers — one 512-bit message chunk in little-endian word order |
| `state.A` | `number` | 32-bit running hash register A |
| `state.B` | `number` | 32-bit running hash register B |
| `state.C` | `number` | 32-bit running hash register C |
| `state.D` | `number` | 32-bit running hash register D |

#### Return Value

```js
{
  A: number,   // updated 32-bit register A
  B: number,   // updated 32-bit register B
  C: number,   // updated 32-bit register C
  D: number    // updated 32-bit register D
}
```

---

## ⚙️ How It Works — The 4 Rounds

MD5's compression consists of **4 rounds × 16 steps = 64 total steps**.

Each round uses a different **auxiliary bitwise function** and a different formula to pick which word from the message block to mix in.

### Round Summary Table

| Round | Steps | Function Used | Formula for `g` (message word index) | Access Pattern |
|-------|-------|---------------|--------------------------------------|----------------|
| **Round 1** | 0 – 15 | `F(b,c,d)` | `g = i` | Sequential: 0,1,2…15 |
| **Round 2** | 16 – 31 | `G(b,c,d)` | `g = (5×i + 1) mod 16` | 1,6,11,0,5,10,15,4,9,14,3,8,13,2,7,12 |
| **Round 3** | 32 – 47 | `H(b,c,d)` | `g = (3×i + 5) mod 16` | 5,8,11,14,1,4,7,10,13,0,3,6,9,12,15,2 |
| **Round 4** | 48 – 63 | `I(b,c,d)` | `g = (7×i) mod 16` | 0,7,14,5,12,3,10,1,8,15,6,13,4,11,2,9 |

---

### Round 1 — F Function

```
F(b, c, d) = (b AND c) OR (NOT b AND d)
```
A **conditional selector**: for each bit position, if `b` is 1, take the bit from `c`; otherwise take it from `d`.

---

### Round 2 — G Function

```
G(b, c, d) = (b AND d) OR (c AND NOT d)
```
The mirror of F: if `d` is 1, pick from `b`; otherwise pick from `c`.

---

### Round 3 — H Function

```
H(b, c, d) = b XOR c XOR d
```
A **parity function** — output is 1 wherever an odd number of the three inputs are 1.

---

### Round 4 — I Function

```
I(b, c, d) = c XOR (b OR NOT d)
```
Designed so that if bit of `d` is 1, bit of `c` is unchanged; otherwise it is flipped.

---

## 🔁 Core Step Mechanics (Per Iteration)

At every step `i` (0–63), the registers rotate like this:

```
┌─────────────────────────────────────────────────────────────┐
│  temp ← d                                                   │
│  d    ← c                                                   │
│  c    ← b                                                   │
│  sum  ← (auxFunc + a + K[i] + block[g])  mod 2³²           │
│  b    ← b + leftRotate(sum, S[i])         mod 2³²           │
│  a    ← temp                                                │
└─────────────────────────────────────────────────────────────┘
```

In JavaScript (using `>>> 0` for unsigned 32-bit arithmetic):

```js
const temp = d;
d = c;
c = b;
const sum = (auxFunc + a + K[i] + block[g]) >>> 0;
b = (b + leftRotate(sum, S[i])) >>> 0;
a = temp;
```

---

## 🔢 Unsigned 32-bit Arithmetic

JavaScript numbers are 64-bit floats, but MD5 needs strict **32-bit unsigned integer** math.

The `>>> 0` trick (unsigned right-shift by zero) forces any JS number into a Uint32:

| Without `>>> 0` | With `>>> 0` |
|-----------------|--------------|
| Sum can silently exceed 2³² | Result is always mod 2³² |
| Wrong hash output | Correct MD5 behavior |

Member 3 applies `>>> 0` at **every arithmetic step** — including the final feed-forward addition.

---

## 🔄 Feed-Forward Addition

After all 64 steps, the working registers are added back to the **original** state values:

```js
return {
    A: (state.A + a) >>> 0,
    B: (state.B + b) >>> 0,
    C: (state.C + c) >>> 0,
    D: (state.D + d) >>> 0,
};
```

This is the **Merkle–Damgård** strengthening step — it ensures each block's output depends on both the block content and all previous blocks' accumulated state.

---

## 📥 Imports Used (From Member 2)

Member 3 does **not** define any of these — they are imported directly from Member 2:

```js
const { S, K, F, G, H, I, leftRotate } = require('./member2-functions');
```

| Symbol | Description |
|--------|-------------|
| `S[64]` | Left-rotation amounts per step (from RFC 1321 §3.4) |
| `K[64]` | Constants derived from `floor(abs(sin(i+1)) × 2³²)` |
| `F` | Round 1 bitwise function |
| `G` | Round 2 bitwise function |
| `H` | Round 3 bitwise function |
| `I` | Round 4 bitwise function |
| `leftRotate` | Rotates a 32-bit integer left by `n` bits |

---

## 💻 Full Source Code

```js
'use strict';

const { S, K, F, G, H, I, leftRotate } = require('./member2-functions');

function processBlock(block, state) {
    let a = state.A >>> 0;
    let b = state.B >>> 0;
    let c = state.C >>> 0;
    let d = state.D >>> 0;

    for (let i = 0; i < 64; i++) {
        let auxFunc;
        let g;

        if (i < 16) {
            auxFunc = F(b, c, d);   // Round 1
            g = i;
        } else if (i < 32) {
            auxFunc = G(b, c, d);   // Round 2
            g = (5 * i + 1) % 16;
        } else if (i < 48) {
            auxFunc = H(b, c, d);   // Round 3
            g = (3 * i + 5) % 16;
        } else {
            auxFunc = I(b, c, d);   // Round 4
            g = (7 * i) % 16;
        }

        const temp = d;
        d = c;
        c = b;
        const sum = (auxFunc + a + K[i] + block[g]) >>> 0;
        b = (b + leftRotate(sum, S[i])) >>> 0;
        a = temp;
    }

    return {
        A: (state.A + a) >>> 0,
        B: (state.B + b) >>> 0,
        C: (state.C + c) >>> 0,
        D: (state.D + d) >>> 0,
    };
}

module.exports = { processBlock };
```

---

## 🧪 Usage Example

```js
const { processBlock } = require('./member3-rounds');

// MD5 initial state — RFC 1321 §3.3
const initState = {
    A: 0x67452301,
    B: 0xEFCDAB89,
    C: 0x98BADCFE,
    D: 0x10325476,
};

// One 512-bit block as 16 × 32-bit little-endian words (from Member 1)
const block = new Array(16).fill(0);

// Process a single block
const newState = processBlock(block, initState);
console.log(newState); // { A, B, C, D } — updated state

// Multi-block usage (loop provided by Member 1/4)
let state = initState;
for (const blk of allBlocks) {
    state = processBlock(blk, state);
}
// Pass final state to Member 4 for hex conversion
```

---

## 🚫 Out of Scope (Not Member 3's Responsibility)

| Task | Owner |
|------|-------|
| Message padding & length encoding | Member 1 |
| Splitting message into 512-bit blocks | Member 1 |
| Defining `S`, `K`, `F`, `G`, `H`, `I`, `leftRotate` | Member 2 |
| Converting final state to hex string digest | Member 4 |
| UI, integration, CLI, file I/O | Outside scope |

---

## 🗂️ Team Overview

| Member | Branch | File | Responsibility |
|--------|--------|------|----------------|
| Member 1 | `member-1` | `member1-*.js` | Preprocessing, padding, block splitting |
| Member 2 | `member-2` | `member2-functions.js` | Constants (`S`,`K`) and auxiliary functions |
| **Member 3** | **`member-3`** | **`member3-rounds.js`** | **64-step compression loop ← YOU ARE HERE** |
| Member 4 | `member-4` | `member4-*.js` | Final state → hex digest conversion |

---

## 📚 References

| Resource | Link |
|----------|------|
| MD5 Specification | [RFC 1321 — R. Rivest, 1992](https://www.ietf.org/rfc/rfc1321.txt) |
| Algorithm Overview | [Wikipedia — MD5](https://en.wikipedia.org/wiki/MD5) |
| Pseudocode Reference | [MD5 Pseudocode](https://en.wikipedia.org/wiki/MD5#Pseudocode) |
| Repository | [MD5_virtual_lab on GitHub](https://github.com/dmelloruth21/MD5_virtual_lab) |
