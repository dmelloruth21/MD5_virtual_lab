'use strict';

/*
 * MD5 Virtual Lab
 * Integrated implementation
 *
 * Member 1  -> Preprocessing
 * Member 2  -> MD5 constants and helper functions
 * Member 3  -> 64-round compression and MD5 pipeline
 * Member 4  -> Integration and Quiz
 */


/* =========================================================
   MEMBER 1: MD5 PREPROCESSING
   ========================================================= */

function preprocess(message) {
    // Convert the input message into UTF-8 bytes
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(message));

    // Store original message length in bits
    const originalBitLength = BigInt(bytes.length) * 8n;

    // Append the first padding bit: 1
    bytes.push(0x80);

    // Add zero bytes until length is 56 mod 64
    while (bytes.length % 64 !== 56) {
        bytes.push(0x00);
    }

    // Append original length as 64-bit little-endian value
    for (let i = 0; i < 8; i++) {
        const lengthByte =
            Number((originalBitLength >> BigInt(i * 8)) & 0xFFn);

        bytes.push(lengthByte);
    }

    // Divide the padded message into 512-bit blocks
    const blocks = [];

    for (let blockStart = 0; blockStart < bytes.length; blockStart += 64) {

        const words = [];

        // Each block contains sixteen 32-bit words
        for (let i = 0; i < 64; i += 4) {

            const word =
                (
                    bytes[blockStart + i] |
                    (bytes[blockStart + i + 1] << 8) |
                    (bytes[blockStart + i + 2] << 16) |
                    (bytes[blockStart + i + 3] << 24)
                ) >>> 0;

            words.push(word);
        }

        blocks.push(words);
    }

    return blocks;
}


/* =========================================================
   MEMBER 2: MD5 CONSTANTS AND HELPER FUNCTIONS
   ========================================================= */

// MD5 shift amounts
const S = [
    7, 12, 17, 22, 7, 12, 17, 22,
    7, 12, 17, 22, 7, 12, 17, 22,

    5, 9, 14, 20, 5, 9, 14, 20,
    5, 9, 14, 20, 5, 9, 14, 20,

    4, 11, 16, 23, 4, 11, 16, 23,
    4, 11, 16, 23, 4, 11, 16, 23,

    6, 10, 15, 21, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21
];


// MD5 constants
const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,

    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,

    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,

    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
];


// MD5 auxiliary functions

function F(B, C, D) {
    return ((B & C) | (~B & D)) >>> 0;
}

function G(B, C, D) {
    return ((B & D) | (C & ~D)) >>> 0;
}

function H(B, C, D) {
    return (B ^ C ^ D) >>> 0;
}

function I(B, C, D) {
    return (C ^ (B | ~D)) >>> 0;
}


// Left circular rotation
function leftRotate(x, s) {
    return ((x << s) | (x >>> (32 - s))) >>> 0;
}


/* =========================================================
   MEMBER 3: MD5 INITIAL STATE
   ========================================================= */

const INIT_STATE = Object.freeze({
    A: 0x67452301,
    B: 0xEFCDAB89,
    C: 0x98BADCFE,
    D: 0x10325476
});


/* =========================================================
   MEMBER 3: MD5 64-ROUND COMPRESSION
   ========================================================= */

function processBlock(block, state) {

    let a = state.A;
    let b = state.B;
    let c = state.C;
    let d = state.D;

    for (let i = 0; i < 64; i++) {

        let auxFunc;
        let g;

        // Round 1
        if (i < 16) {
            auxFunc = F(b, c, d);
            g = i;
        }

        // Round 2
        else if (i < 32) {
            auxFunc = G(b, c, d);
            g = (5 * i + 1) % 16;
        }

        // Round 3
        else if (i < 48) {
            auxFunc = H(b, c, d);
            g = (3 * i + 5) % 16;
        }

        // Round 4
        else {
            auxFunc = I(b, c, d);
            g = (7 * i) % 16;
        }

        const temp = d;

        d = c;
        c = b;

        const sum =
            (auxFunc + a + K[i] + block[g]) >>> 0;

        b =
            (b + leftRotate(sum, S[i])) >>> 0;

        a = temp;
    }

    // Add the result to the current state
    return {
        A: (state.A + a) >>> 0,
        B: (state.B + b) >>> 0,
        C: (state.C + c) >>> 0,
        D: (state.D + d) >>> 0
    };
}


/* =========================================================
   MEMBER 3: CONVERT STATE TO MD5 HEX FORMAT
   ========================================================= */

function wordToHexLE(word) {

    let hex = "";

    // MD5 uses little-endian byte order
    for (let i = 0; i < 4; i++) {

        hex +=
            ((word >>> (i * 8)) & 0xFF)
                .toString(16)
                .padStart(2, "0");
    }

    return hex;
}


function formatHex(state) {

    return (
        wordToHexLE(state.A) +
        wordToHexLE(state.B) +
        wordToHexLE(state.C) +
        wordToHexLE(state.D)
    );
}


/* =========================================================
   MEMBER 3: COMPLETE MD5 FUNCTION
   ========================================================= */

function md5(message) {

    // Preprocess the message
    const blocks = preprocess(message);

    // Initialize MD5 state
    let state = {
        A: INIT_STATE.A,
        B: INIT_STATE.B,
        C: INIT_STATE.C,
        D: INIT_STATE.D
    };

    // Process every 512-bit block
    for (const block of blocks) {
        state = processBlock(block, state);
    }

    // Return final 128-bit MD5 hash
    return formatHex(state);
}


/* =========================================================
   MAKE MD5 AVAILABLE TO THE WEB PAGE
   ========================================================= */

window.md5 = md5;


/* =========================================================
   QUIZ FUNCTIONALITY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const submitButton =
        document.getElementById("submitQuiz");

    const retryButton =
        document.getElementById("retryQuiz");

    const quizResult =
        document.getElementById("quizResult");


    // If quiz elements are not present, stop here
    if (!submitButton || !retryButton || !quizResult) {
        return;
    }


    submitButton.addEventListener("click", function () {

        const correctAnswers = {
            q1: "128",
            q2: "80",
            q3: "512",
            q4: "64",
            q5: "significant"
        };

        let score = 0;
        const total = 5;


        for (const question in correctAnswers) {

            const selected =
                document.querySelector(
                    `input[name="${question}"]:checked`
                );

            if (selected &&
                selected.value === correctAnswers[question]) {

                score++;
            }
        }


        quizResult.textContent =
            `You scored ${score} out of ${total}.`;


        retryButton.style.display = "inline-block";
    });


    retryButton.addEventListener("click", function () {

        const answers =
            document.querySelectorAll(
                'input[type="radio"]'
            );

        answers.forEach(function (answer) {
            answer.checked = false;
        });


        quizResult.textContent = "";

        retryButton.style.display = "none";
    });

});
