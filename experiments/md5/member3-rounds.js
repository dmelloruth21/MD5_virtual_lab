'use strict';

const { S, K, F, G, H, I, leftRotate } = require('./member2-functions');

/**
 * processBlock
 *
 * Applies the MD5 compression function to one 512-bit block and returns the
 * updated state.
 *
 * @param {number[]} block
 *   Array of 16 unsigned 32-bit integers (little-endian words from the
 *   current 64-byte message chunk).
 *
 * @param {{A: number, B: number, C: number, D: number}} state
 *   Current MD5 running state (four 32-bit words).
 *
 * @returns {{A: number, B: number, C: number, D: number}}
 *   Updated state after applying all 64 compression operations.
 */
function processBlock(block, state) {
    // Working copies — forced unsigned 32-bit with >>> 0
    let a = state.A >>> 0;
    let b = state.B >>> 0;
    let c = state.C >>> 0;
    let d = state.D >>> 0;

    for (let i = 0; i < 64; i++) {
        let auxFunc; // result of the auxiliary bitwise function for this round
        let g;       // message-block word index for this step

        if (i < 16) {
            // Round 1: auxiliary function F,  g = i
            auxFunc = F(b, c, d);
            g = i;
        } else if (i < 32) {
            // Round 2: auxiliary function G,  g = (5*i + 1) % 16
            auxFunc = G(b, c, d);
            g = (5 * i + 1) % 16;
        } else if (i < 48) {
            // Round 3: auxiliary function H,  g = (3*i + 5) % 16
            auxFunc = H(b, c, d);
            g = (3 * i + 5) % 16;
        } else {
            // Round 4: auxiliary function I,  g = (7*i) % 16
            auxFunc = I(b, c, d);
            g = (7 * i) % 16;
        }

        // MD5 core step:
        //   temp = d
        //   d    = c
        //   c    = b
        //   b    = b + leftRotate((auxFunc + a + K[i] + block[g]) mod 2^32, S[i])
        //   a    = temp
        const temp = d;
        d = c;
        c = b;
        const sum = (auxFunc + a + K[i] + block[g]) >>> 0;
        b = (b + leftRotate(sum, S[i])) >>> 0;
        a = temp;
    }

    // Feed-forward: add compressed chunk back into the running state (mod 2^32)
    return {
        A: (state.A + a) >>> 0,
        B: (state.B + b) >>> 0,
        C: (state.C + c) >>> 0,
        D: (state.D + d) >>> 0,
    };
}

module.exports = { processBlock };
