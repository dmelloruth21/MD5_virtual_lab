'use strict';

/* ============================================================================
   1. CONSTANTS AND AUXILIARY FUNCTIONS (RFC 1321)
   ============================================================================ */

const S = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
];

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

function F(B, C, D) { return ((B & C) | (~B & D)) >>> 0; }
function G(B, C, D) { return ((B & D) | (C & ~D)) >>> 0; }
function H(B, C, D) { return (B ^ C ^ D) >>> 0; }
function I(B, C, D) { return (C ^ (B | ~D)) >>> 0; }

function leftRotate(x, s) {
    return ((x << s) | (x >>> (32 - s))) >>> 0;
}

function wordToHexLE(word) {
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return result;
}

function wordToHexBE(word) {
    return '0x' + (word >>> 0).toString(16).padStart(8, '0');
}

/* ============================================================================
   2. PREPROCESSING AND PADDING
   ============================================================================ */

function preprocess(message) {
    const encoder = new TextEncoder();
    const rawBytes = Array.from(encoder.encode(message));
    const bitLength = BigInt(rawBytes.length) * 8n;

    const padded = rawBytes.slice();
    padded.push(0x80);

    while (padded.length % 64 !== 56) {
        padded.push(0x00);
    }

    for (let i = 0; i < 8; i++) {
        padded.push(Number((bitLength >> BigInt(i * 8)) & 0xffn));
    }

    const blocks = [];
    for (let offset = 0; offset < padded.length; offset += 64) {
        const words = [];
        for (let w = 0; w < 64; w += 4) {
            const word = (
                padded[offset + w] |
                (padded[offset + w + 1] << 8) |
                (padded[offset + w + 2] << 16) |
                (padded[offset + w + 3] << 24)
            ) >>> 0;
            words.push(word);
        }
        blocks.push(words);
    }

    return { rawBytes, padded, blocks, bitLength: Number(bitLength), totalBlocks: blocks.length };
}

/* ============================================================================
   3. 64-ROUND COMPRESSION FUNCTION
   ============================================================================ */

function processBlockDetailed(block, state) {
    let a = state.A;
    let b = state.B;
    let c = state.C;
    let d = state.D;
    const roundStates = [];

    for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) {
            f = F(b, c, d);
            g = i;
        } else if (i < 32) {
            f = G(b, c, d);
            g = (5 * i + 1) % 16;
        } else if (i < 48) {
            f = H(b, c, d);
            g = (3 * i + 5) % 16;
        } else {
            f = I(b, c, d);
            g = (7 * i) % 16;
        }
        const temp = d;
        d = c;
        c = b;
        const addSum = (a + f + K[i] + block[g]) >>> 0;
        b = (b + leftRotate(addSum, S[i])) >>> 0;
        a = temp;

        if (i === 15 || i === 31 || i === 47 || i === 63) {
            roundStates.push({ round: (i + 1) / 16, A: a >>> 0, B: b >>> 0, C: c >>> 0, D: d >>> 0 });
        }
    }

    return {
        newState: {
            A: (state.A + a) >>> 0,
            B: (state.B + b) >>> 0,
            C: (state.C + c) >>> 0,
            D: (state.D + d) >>> 0
        },
        roundStates
    };
}

/* ============================================================================
   4. MD5 MAIN PIPELINE
   ============================================================================ */

function md5Detailed(message) {
    const prep = preprocess(message);
    let state = { A: 0x67452301, B: 0xefcdab89, C: 0x98badcfe, D: 0x10325476 };
    const blockTraces = [];

    prep.blocks.forEach((block, idx) => {
        const startState = Object.assign({}, state);
        const result = processBlockDetailed(block, state);
        state = result.newState;
        blockTraces.push({ blockIndex: idx, words: block, startState, roundStates: result.roundStates, endState: Object.assign({}, state) });
    });

    const hash = wordToHexLE(state.A) + wordToHexLE(state.B) + wordToHexLE(state.C) + wordToHexLE(state.D);

    return { message, rawBytes: prep.rawBytes, padded: prep.padded, blocks: prep.blocks, bitLength: prep.bitLength, blockTraces, finalState: state, hash };
}

function md5(message) {
    return md5Detailed(message).hash;
}

/* ============================================================================
   5. AVALANCHE EFFECT ANALYSIS
   ============================================================================ */

function hexToBinary128(hexStr) {
    let binStr = '';
    for (let i = 0; i < hexStr.length; i++) {
        binStr += parseInt(hexStr[i], 16).toString(2).padStart(4, '0');
    }
    return binStr;
}

function analyzeAvalanche(msg1, msg2) {
    const hash1 = md5(msg1);
    const hash2 = md5(msg2);
    const bin1 = hexToBinary128(hash1);
    const bin2 = hexToBinary128(hash2);
    let flippedBits = 0;
    const bitComparison = [];

    for (let i = 0; i < 128; i++) {
        const isFlipped = bin1[i] !== bin2[i];
        if (isFlipped) flippedBits++;
        bitComparison.push({ bitIndex: i, registerIndex: Math.floor(i / 32), bit1: bin1[i], bit2: bin2[i], isFlipped });
    }

    let hexFlipped = 0;
    for (let i = 0; i < 32; i++) {
        if (hash1[i] !== hash2[i]) hexFlipped++;
    }

    const percentage = ((flippedBits / 128) * 100).toFixed(2);
    let status = 'Moderate Diffusion';
    if (percentage >= 40 && percentage <= 60) {
        status = 'Ideal Avalanche Diffusion (Near 50%)';
    } else if (percentage > 60) {
        status = 'High Diffusion (above 60%)';
    } else {
        status = 'Low Diffusion (below 40%)';
    }

    return { msg1, msg2, hash1, hash2, flippedBits, percentage, hexFlipped, status, bitComparison };
}

/* ============================================================================
   6. VISUALIZER RENDERER
   ============================================================================ */

function renderVisualizer(details) {
    const visInputMsg = document.getElementById('visInputMsg');
    const visInputStats = document.getElementById('visInputStats');
    if (visInputMsg) {
        visInputMsg.textContent = details.message === '' ? '(empty string "")' : '"' + details.message + '"';
    }
    if (visInputStats) {
        visInputStats.textContent = 'Length: ' + details.message.length + ' characters | ' + details.rawBytes.length + ' bytes | ' + details.bitLength + ' bits';
    }

    const visUtf8Bytes = document.getElementById('visUtf8Bytes');
    if (visUtf8Bytes) {
        if (details.rawBytes.length === 0) {
            visUtf8Bytes.textContent = '(no bytes - empty string input)';
        } else {
            visUtf8Bytes.textContent = details.rawBytes.map(function(b) { return b.toString(16).padStart(2, '0'); }).join(' ');
        }
    }

    const visPaddedBytes = document.getElementById('visPaddedBytes');
    const visPaddingStats = document.getElementById('visPaddingStats');
    if (visPaddedBytes) {
        let html = '';
        const rawLen = details.rawBytes.length;
        const totalLen = details.padded.length;
        details.padded.forEach(function(byte, idx) {
            const hex = byte.toString(16).padStart(2, '0');
            if (idx < rawLen) {
                html += '<span class="pad-original" title="Original byte ' + idx + '">' + hex + '</span> ';
            } else if (idx === rawLen) {
                html += '<span class="pad-start" title="0x80 Pad delimiter">' + hex + '</span> ';
            } else if (idx >= totalLen - 8) {
                html += '<span class="pad-len" title="64-bit LE length byte">' + hex + '</span> ';
            } else {
                html += '<span class="pad-zeros" title="Zero pad byte">' + hex + '</span> ';
            }
            if ((idx + 1) % 16 === 0) html += '\n';
        });
        visPaddedBytes.innerHTML = html.trim();
    }
    if (visPaddingStats) {
        visPaddingStats.textContent = 'Total padded size: ' + details.padded.length + ' bytes (' + (details.padded.length * 8) + ' bits) divided into ' + details.blocks.length + ' block(s).';
    }

    const visBlockContainer = document.getElementById('visBlockContainer');
    if (visBlockContainer) {
        let blockHtml = '';
        details.blocks.forEach(function(block, bIdx) {
            let wordsHtml = '';
            block.forEach(function(word, wIdx) {
                wordsHtml += '<div class="word-box"><span class="word-idx">M[' + wIdx + ']</span><div class="word-hex">' + wordToHexBE(word) + '</div><span style="font-size:10px;color:#a1a1aa;">' + (word >>> 0) + '</span></div>';
            });
            blockHtml += '<div style="margin-bottom:12px;"><h4 style="color:#fbbf24;margin:6px 0;font-size:13px;">Block ' + (bIdx + 1) + ' of ' + details.blocks.length + ' (512 bits / 16 words)</h4><div class="word-grid">' + wordsHtml + '</div></div>';
        });
        visBlockContainer.innerHTML = blockHtml;
    }

    const trace = details.blockTraces[0];
    if (trace && trace.roundStates.length === 4) {
        var rounds = ['visR1State', 'visR2State', 'visR3State', 'visR4State'];
        trace.roundStates.forEach(function(r, i) {
            var el = document.getElementById(rounds[i]);
            if (el) {
                el.textContent = 'A: ' + wordToHexBE(r.A) + '  B: ' + wordToHexBE(r.B) + '  C: ' + wordToHexBE(r.C) + '  D: ' + wordToHexBE(r.D);
            }
        });
    }

    const visFinalRegisters = document.getElementById('visFinalRegisters');
    const visFinalHash = document.getElementById('visFinalHash');
    if (visFinalRegisters) {
        const s = details.finalState;
        visFinalRegisters.innerHTML =
            '<div class="reg-card"><div class="reg-name">Reg A</div><div class="reg-hex">' + wordToHexBE(s.A) + '</div><small style="color:#a1a1aa;">LE: ' + wordToHexLE(s.A) + '</small></div>' +
            '<div class="reg-card"><div class="reg-name">Reg B</div><div class="reg-hex">' + wordToHexBE(s.B) + '</div><small style="color:#a1a1aa;">LE: ' + wordToHexLE(s.B) + '</small></div>' +
            '<div class="reg-card"><div class="reg-name">Reg C</div><div class="reg-hex">' + wordToHexBE(s.C) + '</div><small style="color:#a1a1aa;">LE: ' + wordToHexLE(s.C) + '</small></div>' +
            '<div class="reg-card"><div class="reg-name">Reg D</div><div class="reg-hex">' + wordToHexBE(s.D) + '</div><small style="color:#a1a1aa;">LE: ' + wordToHexLE(s.D) + '</small></div>';
    }
    if (visFinalHash) {
        visFinalHash.textContent = details.hash;
    }
}

/* ============================================================================
   7. QUIZ DATA AND LOADER
   ============================================================================ */

const QUIZ_QUESTIONS = [
    {
        id: "q1",
        type: "mcq-single",
        prompt: "What is the fixed output digest length produced by the MD5 algorithm?",
        options: [
            "128 bits (16 bytes)",
            "160 bits (20 bytes)",
            "256 bits (32 bytes)",
            "512 bits (64 bytes)"
        ],
        answerIndex: 0,
        explanation: "MD5 produces a fixed 128-bit (16-byte) hash digest, conventionally represented as 32 hexadecimal characters."
    },
    {
        id: "q2",
        type: "mcq-single",
        prompt: "What is the message block size processed in each iteration of the MD5 compression function?",
        options: [
            "128 bits",
            "256 bits",
            "512 bits",
            "1024 bits"
        ],
        answerIndex: 2,
        explanation: "MD5 operates on 512-bit (64-byte) message blocks, divided into sixteen 32-bit sub-words M[0] through M[15]."
    },
    {
        id: "q3",
        type: "mcq-single",
        prompt: "In MD5 preprocessing, which single byte is appended immediately following the original message bytes?",
        options: [
            "0x00",
            "0x80",
            "0xFF",
            "0x5A"
        ],
        answerIndex: 1,
        explanation: "A single '1' bit followed by seven '0' bits (hexadecimal byte 0x80) is appended as the padding delimiter."
    },
    {
        id: "q4",
        type: "mcq-single",
        prompt: "How is the original message length encoded during MD5 padding?",
        options: [
            "As a 32-bit big-endian integer",
            "As a 64-bit big-endian integer",
            "As a 64-bit little-endian integer",
            "As a 128-bit little-endian integer"
        ],
        answerIndex: 2,
        explanation: "RFC 1321 specifies that the message length before padding is appended as a 64-bit little-endian integer."
    },
    {
        id: "q5",
        type: "mcq-single",
        prompt: "How many total step operations are executed during the 4 rounds of MD5 block compression?",
        options: [
            "16 operations",
            "32 operations",
            "64 operations",
            "80 operations"
        ],
        answerIndex: 2,
        explanation: "MD5 executes 4 rounds with 16 step operations each, resulting in a total of 64 compression operations per block."
    },
    {
        id: "q6",
        type: "mcq-single",
        prompt: "Which boolean auxiliary function is utilized during Round 1 of MD5 compression?",
        options: [
            "F(B, C, D) = (B AND C) OR ((NOT B) AND D)",
            "G(B, C, D) = (B AND D) OR (C AND (NOT D))",
            "H(B, C, D) = B XOR C XOR D",
            "I(B, C, D) = C XOR (B OR (NOT D))"
        ],
        answerIndex: 0,
        explanation: "Round 1 uses the conditional function F(B, C, D) = (B AND C) OR ((NOT B) AND D), which selects bits from C or D based on B."
    },
    {
        id: "q7",
        type: "mcq-single",
        prompt: "How are the 64 pseudo-random constant words K[i] derived in MD5?",
        options: [
            "Linear Feedback Shift Registers",
            "Integer parts of 2^32 * abs(sin(i + 1)) in radians",
            "Fractional parts of square roots of prime numbers",
            "MD4 state permutations"
        ],
        answerIndex: 1,
        explanation: "Each constant K[i] is defined as floor(2^32 * abs(sin(i + 1))), where i is in radians from 0 to 63."
    },
    {
        id: "q8",
        type: "mcq-single",
        prompt: "What phenomenon ensures that changing a single input bit alters approximately 50 percent of the output digest bits?",
        options: [
            "Birthday Paradox",
            "Avalanche Effect",
            "Padding Oracle",
            "Length Extension"
        ],
        answerIndex: 1,
        explanation: "The Avalanche Effect is a key cryptographic property where a minor input change causes drastic, unpredictable changes across the hash output."
    },
    {
        id: "q9",
        type: "mcq-single",
        prompt: "Why has MD5 been officially deprecated for cryptographic security per RFC 6151?",
        options: [
            "It requires too much RAM to compute",
            "Practical collision attacks allow different inputs to produce identical hashes",
            "It cannot hash messages larger than 1 MB",
            "The digest is too long for modern protocols"
        ],
        answerIndex: 1,
        explanation: "MD5 suffered practical collision attacks (e.g., Wang et al., 2004, and Flame malware), making it vulnerable to forged certificates and collisions."
    },
    {
        id: "q10",
        type: "mcq-single",
        prompt: "Which initial hexadecimal constant is loaded into Register A before MD5 processing begins?",
        options: [
            "0x67452301",
            "0xefcdab89",
            "0x98badcfe",
            "0x10325476"
        ],
        answerIndex: 0,
        explanation: "Register A is initialized with word constant 0x67452301 (A=0x01, 0x23, 0x45, 0x67 in little-endian order)."
    }
];

function loadQuiz(questions) {
    const container = document.getElementById('quizContainer');
    if (!container) return;
    let html = '';
    questions.forEach(function(q) {
        html += '<div class="quiz-card" id="card_' + q.id + '">';
        html += '<div class="quiz-question-title">' + q.prompt + '</div>';
        html += '<div class="quiz-options-group">';
        q.options.forEach(function(opt, idx) {
            html += '<label class="quiz-option-label"><input type="radio" name="' + q.id + '" value="' + idx + '"> ' + opt + '</label>';
        });
        html += '</div>';
        html += '<div class="quiz-explanation" id="exp_' + q.id + '"></div>';
        html += '</div>';
    });
    container.innerHTML = html;
}

/* ============================================================================
   8. DOM CONTROLLER
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    var quizQuestions = QUIZ_QUESTIONS;
    loadQuiz(quizQuestions);

    /* ---- Tab Navigation ---- */
    var navBtns = document.querySelectorAll('.lab-nav-btn');
    var sections = document.querySelectorAll('.lab-section');

    navBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var target = btn.getAttribute('data-tab');
            navBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            sections.forEach(function(sec) {
                if (sec.id === target) {
                    sec.removeAttribute('hidden');
                } else {
                    sec.setAttribute('hidden', '');
                }
            });
        });
    });

    /* ---- Salt State ---- */
    var dynamicSalt = '';

    var md5Input = document.getElementById('md5Input');
    var enableSaltToggle = document.getElementById('enableSaltToggle');
    var saltBadgeToken = document.getElementById('saltBadgeToken');
    var generateHashBtn = document.getElementById('generateHash');
    var clearInputBtn = document.getElementById('clearInput');
    var copyHashBtn = document.getElementById('copyHashBtn');
    var hashOutput = document.getElementById('hashOutput');
    var statCharCount = document.getElementById('statCharCount');
    var statOrigBits = document.getElementById('statOrigBits');
    var statPaddedBytes = document.getElementById('statPaddedBytes');
    var statBlockCount = document.getElementById('statBlockCount');
    var regA = document.getElementById('regA');
    var regB = document.getElementById('regB');
    var regC = document.getElementById('regC');
    var regD = document.getElementById('regD');

    function generateRandomNonce() {
        var randNum = Math.floor(Math.random() * 0xffffffff);
        return '0x' + randNum.toString(16).padStart(8, '0');
    }

    function runSimulation(baseMessage) {
        var finalMessage = baseMessage;
        if (enableSaltToggle && enableSaltToggle.checked) {
            if (!dynamicSalt) dynamicSalt = generateRandomNonce();
            finalMessage = baseMessage + dynamicSalt;
            if (saltBadgeToken) {
                saltBadgeToken.style.display = 'inline-block';
                saltBadgeToken.textContent = 'SALT NONCE: ' + dynamicSalt;
            }
        } else {
            dynamicSalt = '';
            if (saltBadgeToken) saltBadgeToken.style.display = 'none';
        }

        var details = md5Detailed(finalMessage);

        if (hashOutput) hashOutput.textContent = details.hash;
        if (statCharCount) statCharCount.textContent = details.message.length;
        if (statOrigBits) statOrigBits.textContent = details.bitLength + ' bits';
        if (statPaddedBytes) statPaddedBytes.textContent = details.padded.length + ' bytes (' + (details.padded.length * 8) + ' bits)';
        if (statBlockCount) statBlockCount.textContent = details.blocks.length + ' block(s)';
        if (regA) regA.textContent = wordToHexBE(details.finalState.A);
        if (regB) regB.textContent = wordToHexBE(details.finalState.B);
        if (regC) regC.textContent = wordToHexBE(details.finalState.C);
        if (regD) regD.textContent = wordToHexBE(details.finalState.D);

        renderVisualizer(details);

        var avMsg1 = document.getElementById('avMsg1');
        if (avMsg1 && avMsg1.value !== baseMessage) {
            avMsg1.value = baseMessage;
            updateAvalancheVisualizer();
        }
    }

    if (enableSaltToggle) {
        enableSaltToggle.addEventListener('change', function() {
            if (enableSaltToggle.checked) {
                dynamicSalt = generateRandomNonce();
            } else {
                dynamicSalt = '';
            }
            if (md5Input) runSimulation(md5Input.value);
        });
    }

    if (generateHashBtn && md5Input) {
        generateHashBtn.addEventListener('click', function() { runSimulation(md5Input.value); });
        md5Input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                runSimulation(md5Input.value);
            }
        });
    }

    if (clearInputBtn && md5Input) {
        clearInputBtn.addEventListener('click', function() {
            md5Input.value = '';
            runSimulation('');
            md5Input.focus();
        });
    }

    if (copyHashBtn && hashOutput) {
        copyHashBtn.addEventListener('click', function() {
            var text = hashOutput.textContent.trim();
            if (!text) return;
            var temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            copyHashBtn.textContent = 'Copied!';
            setTimeout(function() { copyHashBtn.textContent = 'Copy Digest'; }, 1800);
        });
    }

    var presetButtons = document.querySelectorAll('.preset-btn[data-preset]');
    presetButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var val = btn.getAttribute('data-preset') || '';
            if (md5Input) {
                md5Input.value = val;
                runSimulation(val);
            }
        });
    });

    /* ---- Avalanche Controls ---- */
    var avMsg1 = document.getElementById('avMsg1');
    var avMsg2 = document.getElementById('avMsg2');
    var btnRunAvalanche = document.getElementById('btnRunAvalanche');
    var btnToggleChar = document.getElementById('btnToggleChar');
    var avHash1 = document.getElementById('avHash1');
    var avHash2 = document.getElementById('avHash2');
    var avFlippedCount = document.getElementById('avFlippedCount');
    var avPercent = document.getElementById('avPercent');
    var avHexFlipped = document.getElementById('avHexFlipped');
    var avStatus = document.getElementById('avStatus');
    var bitMatrixContainer = document.getElementById('bitMatrixContainer');

    function updateAvalancheVisualizer() {
        if (!avMsg1 || !avMsg2) return;
        var res = analyzeAvalanche(avMsg1.value, avMsg2.value);
        if (avHash1) avHash1.textContent = res.hash1;
        if (avHash2) avHash2.textContent = res.hash2;
        if (avFlippedCount) avFlippedCount.textContent = res.flippedBits + ' / 128';
        if (avPercent) avPercent.textContent = res.percentage + '%';
        if (avHexFlipped) avHexFlipped.textContent = res.hexFlipped + ' / 32';
        if (avStatus) avStatus.textContent = res.status;

        if (bitMatrixContainer) {
            bitMatrixContainer.innerHTML = '';
            var regNames = ['Register A', 'Register B', 'Register C', 'Register D'];
            res.bitComparison.forEach(function(item) {
                var cell = document.createElement('div');
                cell.className = 'bit-cell ' + (item.isFlipped ? 'bit-flipped' : 'bit-same');
                cell.textContent = item.isFlipped ? '1' : '0';
                cell.title = 'Bit #' + item.bitIndex + ' (' + regNames[item.registerIndex] + ')\nMsg1 bit: ' + item.bit1 + '\nMsg2 bit: ' + item.bit2 + '\nStatus: ' + (item.isFlipped ? 'FLIPPED' : 'UNCHANGED');
                bitMatrixContainer.appendChild(cell);
            });
        }
    }

    if (btnRunAvalanche) btnRunAvalanche.addEventListener('click', updateAvalancheVisualizer);
    if (avMsg1) avMsg1.addEventListener('input', updateAvalancheVisualizer);
    if (avMsg2) avMsg2.addEventListener('input', updateAvalancheVisualizer);

    if (btnToggleChar && avMsg2) {
        btnToggleChar.addEventListener('click', function() {
            var current = avMsg2.value || 'abc';
            if (current.length === 0) {
                avMsg2.value = 'a';
            } else {
                var lastChar = current[current.length - 1];
                var newChar = String.fromCharCode(lastChar.charCodeAt(0) ^ 1);
                avMsg2.value = current.slice(0, -1) + newChar;
            }
            updateAvalancheVisualizer();
        });
    }

    /* ---- Stage Accordion Toggles ---- */
    var stageToggleBtns = document.querySelectorAll('.stage-toggle');
    stageToggleBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var stageNum = btn.getAttribute('data-stage');
            var body = document.getElementById('stage' + stageNum + 'Body');
            if (body) {
                var isOpen = body.classList.toggle('open');
                btn.classList.toggle('open', isOpen);
            }
        });
    });

    /* ---- Quiz Submit and Retry ---- */
    var submitQuizBtn = document.getElementById('submitQuiz');
    var retryQuizBtn = document.getElementById('retryQuiz');
    var quizResult = document.getElementById('quizResult');

    if (submitQuizBtn && retryQuizBtn && quizResult) {
        submitQuizBtn.addEventListener('click', function() {
            if (quizQuestions.length === 0) {
                quizResult.className = 'quiz-banner show';
                quizResult.textContent = 'Quiz not loaded. Please open via a local server (python -m http.server 8080).';
                return;
            }

            var score = 0;
            var answered = 0;

            quizQuestions.forEach(function(q) {
                var checked = document.querySelector('input[name="' + q.id + '"]:checked');
                var card = document.getElementById('card_' + q.id);
                var exp = document.getElementById('exp_' + q.id);
                if (checked) {
                    answered++;
                    var isCorrect = parseInt(checked.value, 10) === q.answerIndex;
                    if (isCorrect) score++;
                    if (card) {
                        card.classList.remove('correct-card', 'wrong-card');
                        card.classList.add(isCorrect ? 'correct-card' : 'wrong-card');
                    }
                    if (exp) {
                        exp.classList.remove('exp-correct', 'exp-wrong', 'show');
                        exp.textContent = q.explanation;
                        exp.classList.add(isCorrect ? 'exp-correct' : 'exp-wrong', 'show');
                    }
                } else {
                    if (card) card.classList.remove('correct-card', 'wrong-card');
                    if (exp) exp.classList.remove('show');
                }
            });

            if (answered < quizQuestions.length) {
                quizResult.className = 'quiz-banner show';
                quizResult.style.borderColor = '#fbbf24';
                quizResult.textContent = 'Please answer all ' + quizQuestions.length + ' questions before submitting (' + answered + ' / ' + quizQuestions.length + ' answered).';
                return;
            }

            quizResult.className = 'quiz-banner show';
            var pct = Math.round((score / quizQuestions.length) * 100);
            if (score === quizQuestions.length) {
                quizResult.style.borderColor = '#22c55e';
                quizResult.textContent = 'Perfect Score! ' + score + ' / ' + quizQuestions.length + ' (100%) - Outstanding mastery of MD5!';
            } else if (score >= Math.floor(quizQuestions.length * 0.7)) {
                quizResult.style.borderColor = '#3b82f6';
                quizResult.textContent = 'Great Job! Score: ' + score + ' / ' + quizQuestions.length + ' (' + pct + '%) - Strong grasp of MD5 principles.';
            } else {
                quizResult.style.borderColor = '#ef4444';
                quizResult.textContent = 'Score: ' + score + ' / ' + quizQuestions.length + ' (' + pct + '%) - Review the Theory and Visualizer sections to reinforce understanding.';
            }
            retryQuizBtn.style.display = 'inline-block';
        });

        retryQuizBtn.addEventListener('click', function() {
            var radios = document.querySelectorAll('#md5QuizForm input[type="radio"]');
            radios.forEach(function(r) { r.checked = false; });
            quizQuestions.forEach(function(q) {
                var card = document.getElementById('card_' + q.id);
                var exp = document.getElementById('exp_' + q.id);
                if (card) card.classList.remove('correct-card', 'wrong-card');
                if (exp) exp.classList.remove('show', 'exp-correct', 'exp-wrong');
            });
            quizResult.className = 'quiz-banner';
            quizResult.style.borderColor = '';
            retryQuizBtn.style.display = 'none';
        });
    }

    /* ---- Initialize ---- */
    if (md5Input) runSimulation(md5Input.value || 'abc');
    updateAvalancheVisualizer();
});
