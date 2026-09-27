'use strict';

/**
 * Member 3: MD5 64-Round Compression Engine, State Management & Full MD5 Pipeline
 *
 * Implements:
 * - processBlock(block, state): 64-step core MD5 compression function (4 rounds x 16 steps)
 * - formatHex(state): Little-endian 128-bit hex formatting of registers (A, B, C, D)
 * - md5(message): Complete RFC 1321 MD5 hash generator
 */

let S, K, F, G, H, I, leftRotate;
let preprocess, splitIntoBlocks;

// Environment-aware imports (Node.js vs Browser)
if (typeof require !== 'undefined') {
    const mem2 = require('./member2-functions');
    S = mem2.S;
    K = mem2.K;
    F = mem2.F;
    G = mem2.G;
    H = mem2.H;
    I = mem2.I;
    leftRotate = mem2.leftRotate;

    const mem1 = require('./member1-preprocess');
    preprocess = mem1.preprocess;
    splitIntoBlocks = mem1.splitIntoBlocks;
} else if (typeof window !== 'undefined') {
    if (window.MD5_MEM2) {
        ({ S, K, F, G, H, I, leftRotate } = window.MD5_MEM2);
    }
    if (window.MD5_MEM1) {
        ({ preprocess, splitIntoBlocks } = window.MD5_MEM1);
    }
}

/**
 * RFC 1321 MD5 Initial State Registers (§3.3)
 */
const INIT_STATE = Object.freeze({
    A: 0x67452301,
    B: 0xEFCDAB89,
    C: 0x98BADCFE,
    D: 0x10325476
});

/**
 * processBlock
 * Applies the MD5 compression function to one 512-bit block (16 uint32 words)
 *
 * @param {number[]} block - 16 unsigned 32-bit integers in little-endian order
 * @param {{A: number, B: number, C: number, D: number}} state - Running MD5 state
 * @returns {{A: number, B: number, C: number, D: number}} Updated state
 */
function processBlock(block, state) {
    let a = state.A >>> 0;
    let b = state.B >>> 0;
    let c = state.C >>> 0;
    let d = state.D >>> 0;

    for (let i = 0; i < 64; i++) {
        let auxFunc;
        let g;

        if (i < 16) {
            // Round 1: F(b, c, d), g = i
            auxFunc = F(b, c, d);
            g = i;
        } else if (i < 32) {
            // Round 2: G(b, c, d), g = (5*i + 1) % 16
            auxFunc = G(b, c, d);
            g = (5 * i + 1) % 16;
        } else if (i < 48) {
            // Round 3: H(b, c, d), g = (3*i + 5) % 16
            auxFunc = H(b, c, d);
            g = (3 * i + 5) % 16;
        } else {
            // Round 4: I(b, c, d), g = (7*i) % 16
            auxFunc = I(b, c, d);
            g = (7 * i) % 16;
        }

        // Core step:
        // temp = d
        // d = c
        // c = b
        // b = b + leftRotate((auxFunc + a + K[i] + block[g]) mod 2^32, S[i])
        // a = temp
        const temp = d;
        d = c;
        c = b;
        const sum = (auxFunc + a + K[i] + block[g]) >>> 0;
        b = (b + leftRotate(sum, S[i])) >>> 0;
        a = temp;
    }

    // Feed-forward: add compressed block results back into running state (mod 2^32)
    return {
        A: (state.A + a) >>> 0,
        B: (state.B + b) >>> 0,
        C: (state.C + c) >>> 0,
        D: (state.D + d) >>> 0,
    };
}

/**
 * Converts a 32-bit unsigned integer to a little-endian 8-character hex string
 * @param {number} word
 * @returns {string}
 */
function wordToHexLE(word) {
    let hex = '';
    for (let i = 0; i < 4; i++) {
        const byte = (word >>> (i * 8)) & 0xFF;
        hex += byte.toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * formatHex
 * Converts 128-bit MD5 state registers (A, B, C, D) into a 32-character hex digest.
 *
 * @param {{A: number, B: number, C: number, D: number}} state
 * @returns {string} 32-character hexadecimal string in lowercase
 */
function formatHex(state) {
    return (
        wordToHexLE(state.A) +
        wordToHexLE(state.B) +
        wordToHexLE(state.C) +
        wordToHexLE(state.D)
    );
}

/**
 * md5
 * Complete RFC 1321 MD5 hash calculation for an input message.
 *
 * @param {string|Uint8Array|ArrayBuffer|number[]} message
 * @param {object} [options] - Optional configurations (e.g. step trace callback)
 * @returns {string} 32-character hexadecimal MD5 digest
 */
function md5(message, options = {}) {
    // 1. Preprocessing & padding (Member 1)
    const paddedBytes = preprocess(message);

    // 2. Block segmentation (Member 1)
    const blocks = splitIntoBlocks(paddedBytes);

    // 3. Initialize state registers (RFC 1321 §3.3)
    let state = {
        A: INIT_STATE.A,
        B: INIT_STATE.B,
        C: INIT_STATE.C,
        D: INIT_STATE.D,
    };

    // 4. Process each 512-bit block through 64 rounds (Member 3)
    for (let b = 0; b < blocks.length; b++) {
        const block = blocks[b];
        state = processBlock(block, state);

        if (typeof options.onBlockProcessed === 'function') {
            options.onBlockProcessed(b, block, { ...state });
        }
    }

    // 5. Final 128-bit hex conversion
    return formatHex(state);
}

// Universal module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        INIT_STATE,
        processBlock,
        wordToHexLE,
        formatHex,
        md5
    };
}

if (typeof window !== 'undefined') {
    window.MD5_MEM3 = {
        INIT_STATE,
        processBlock,
        wordToHexLE,
        formatHex,
        md5
    };
    // Expose global md5 helper if desired
    window.md5 = md5;
}
