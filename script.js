/**
 * ============================================================================
 * Cryptography Virtual Laboratory - Experiment 03: MD5 Hash Algorithm
 * ============================================================================
 * Collaborative Implementation by Group 3:
 * - Member 1: Nicole Dabre   (Preprocessing, UTF-8 Encoding, Padding, Block Parsing)
 * - Member 2: Alciya Dodti   (Constants, Auxiliary Functions F,G,H,I, Left Rotation)
 * - Member 3: Larissa Dabreo  (Initial State, 64-Round Compression, formatHex, MD5 Pipeline)
 * - Member 4: Ruth Dmello    (Simulation UI, Avalanche Visualizer, Processing Stages, Quiz)
 * ============================================================================
 */

'use strict';

/* ============================================================================
   1. CONSTANTS & AUXILIARY FUNCTIONS (RFC 1321)
   ============================================================================ */

// Left circular rotation amounts S[0..63] for the 64 operations (RFC 1321 Section 3.4)
const S = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22, // Round 1
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20, // Round 2
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23, // Round 3
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21  // Round 4
];

// Constants table K[0..63] where K[i] = floor(2^32 * abs(sin(i + 1)))
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

// Four non-linear auxiliary boolean functions
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

// 32-bit bitwise circular left rotation
function leftRotate(x, s) {
    return ((x << s) | (x >>> (32 - s))) >>> 0;
}

// Formats a 32-bit unsigned integer into 8 lowercase little-endian hexadecimal characters
function wordToHexLE(word) {
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return result;
}

// Formats a 32-bit unsigned integer into 8 big-endian hex characters (display format)
function wordToHexBE(word) {
    return '0x' + (word >>> 0).toString(16).padStart(8, '0');
}

/* ============================================================================
   2. PREPROCESSING & PADDING (MEMBER 1)
   ============================================================================ */

function preprocess(message) {
    const encoder = new TextEncoder();
    const rawBytes = Array.from(encoder.encode(message));
    const bitLength = BigInt(rawBytes.length) * 8n;

    // Append 0x80 (single '1' bit followed by seven '0' bits)
    const padded = rawBytes.slice();
    padded.push(0x80);

    // Append 0x00 bytes until message length in bytes satisfies length % 64 === 56
    while (padded.length % 64 !== 56) {
        padded.push(0x00);
    }

    // Append original message bit length as 64-bit little-endian integer (8 bytes)
    for (let i = 0; i < 8; i++) {
        padded.push(Number((bitLength >> BigInt(i * 8)) & 0xffn));
    }

    // Divide padded byte stream into 512-bit (64-byte) blocks
    // Each block consists of sixteen 32-bit little-endian words M[0..15]
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

    return {
        rawBytes,
        padded,
        blocks,
        bitLength: Number(bitLength),
        totalBlocks: blocks.length
    };
}

/* ============================================================================
   3. 64-ROUND COMPRESSION FUNCTION (MEMBER 3)
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

        // Capture state snapshots at end of each round (operations 15, 31, 47, 63)
        if (i === 15 || i === 31 || i === 47 || i === 63) {
            roundStates.push({
                round: (i + 1) / 16,
                A: a >>> 0,
                B: b >>> 0,
                C: c >>> 0,
                D: d >>> 0
            });
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
   4. MANUAL MD5 MAIN PIPELINE
   ============================================================================ */

function md5Detailed(message) {
    const prep = preprocess(message);

    // Initial 32-bit register constants (RFC 1321 Section 3.3)
    let state = {
        A: 0x67452301,
        B: 0xefcdab89,
        C: 0x98badcfe,
        D: 0x10325476
    };

    const blockTraces = [];

    prep.blocks.forEach((block, idx) => {
        const startState = { ...state };
        const result = processBlockDetailed(block, state);
        state = result.newState;
        blockTraces.push({
            blockIndex: idx,
            words: block,
            startState,
            roundStates: result.roundStates,
            endState: { ...state }
        });
    });

    // Form final 128-bit digest by serializing registers A, B, C, D in little-endian format
    const hash =
        wordToHexLE(state.A) +
        wordToHexLE(state.B) +
        wordToHexLE(state.C) +
        wordToHexLE(state.D);

    return {
        message,
        rawBytes: prep.rawBytes,
        padded: prep.padded,
        blocks: prep.blocks,
        bitLength: prep.bitLength,
        blockTraces,
        finalState: state,
        hash
    };
}

function md5(message) {
    return md5Detailed(message).hash;
}

// Global exposure for lab access
window.md5 = md5;
window.md5Detailed = md5Detailed;
window.preprocess = preprocess;

/* ============================================================================
   5. AVALANCHE EFFECT & 128-BIT HEATMAP ANALYSIS
   ============================================================================ */

function hexToBinary128(hexStr) {
    let binStr = '';
    for (let i = 0; i < hexStr.length; i++) {
        const nibble = parseInt(hexStr[i], 16);
        binStr += nibble.toString(2).padStart(4, '0');
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
        bitComparison.push({
            bitIndex: i,
            registerIndex: Math.floor(i / 32),
            bit1: bin1[i],
            bit2: bin2[i],
            isFlipped
        });
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
        status = 'High Diffusion (> 60%)';
    } else {
        status = 'Low Diffusion (< 40%)';
    }

    return {
        msg1,
        msg2,
        hash1,
        hash2,
        flippedBits,
        percentage,
        hexFlipped,
        status,
        bitComparison
    };
}

window.analyzeAvalanche = analyzeAvalanche;

/* ============================================================================
   6. UI CONTROLLER, VISUALIZER & QUIZ ENGINE (MEMBER 4)
   ============================================================================ */

function renderVisualizer(details) {
    // Stage 1: Input Message
    const visInputMsg = document.getElementById('visInputMsg');
    const visInputStats = document.getElementById('visInputStats');
    if (visInputMsg) {
        visInputMsg.textContent = details.message === '' ? '(empty string "")' : `"${details.message}"`;
    }
    if (visInputStats) {
        visInputStats.textContent = `Length: ${details.message.length} characters | ${details.rawBytes.length} bytes | ${details.bitLength} bits`;
    }

    // Stage 2: UTF-8 Bytes
    const visUtf8Bytes = document.getElementById('visUtf8Bytes');
    if (visUtf8Bytes) {
        if (details.rawBytes.length === 0) {
            visUtf8Bytes.textContent = '(no bytes - empty string input)';
        } else {
            visUtf8Bytes.textContent = details.rawBytes
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
        }
    }

    // Stage 3: Padding Breakdown
    const visPaddedBytes = document.getElementById('visPaddedBytes');
    const visPaddingStats = document.getElementById('visPaddingStats');
    if (visPaddedBytes) {
        let html = '';
        const rawLen = details.rawBytes.length;
        const totalLen = details.padded.length;

        details.padded.forEach((byte, idx) => {
            const hex = byte.toString(16).padStart(2, '0');
            if (idx < rawLen) {
                html += `<span class="pad-original" title="Original byte ${idx}">${hex}</span> `;
            } else if (idx === rawLen) {
                html += `<span class="pad-start" title="0x80 Pad delimiter">${hex}</span> `;
            } else if (idx >= totalLen - 8) {
                html += `<span class="pad-len" title="64-bit LE length byte">${hex}</span> `;
            } else {
                html += `<span class="pad-zeros" title="Zero pad byte">${hex}</span> `;
            }
            if ((idx + 1) % 16 === 0) html += '\n';
        });
        visPaddedBytes.innerHTML = html.trim();
    }
    if (visPaddingStats) {
        visPaddingStats.textContent = `Total padded size: ${details.padded.length} bytes (${details.padded.length * 8} bits) divided into ${details.blocks.length} block(s).`;
    }

    // Stage 4: 512-bit Block Words M[0..15]
    const visBlockContainer = document.getElementById('visBlockContainer');
    if (visBlockContainer) {
        let blockHtml = '';
        details.blocks.forEach((block, bIdx) => {
            let wordsHtml = '';
            block.forEach((word, wIdx) => {
                wordsHtml += `
                    <div class="word-box">
                        <span class="word-idx">M[${wIdx}]</span>
                        <div class="word-hex">${wordToHexBE(word)}</div>
                        <span style="font-size:10px; color:var(--color-text-muted);">${word >>> 0}</span>
                    </div>
                `;
            });
            blockHtml += `
                <div style="margin-bottom: 12px;">
                    <h4 style="color:#ffda8b; margin:6px 0; font-size:13px;">
                        Block ${bIdx + 1} of ${details.blocks.length} (512 bits / 16 words)
                    </h4>
                    <div class="word-grid">${wordsHtml}</div>
                </div>
            `;
        });
        visBlockContainer.innerHTML = blockHtml;
    }

    // Stage 5: Four Rounds Intermediate States (Block 1)
    const trace = details.blockTraces[0];
    if (trace && trace.roundStates.length === 4) {
        const r1 = trace.roundStates[0];
        const r2 = trace.roundStates[1];
        const r3 = trace.roundStates[2];
        const r4 = trace.roundStates[3];

        const setReg = (id, r) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `<strong>A:</strong> ${wordToHexBE(r.A)} &bull; <strong>B:</strong> ${wordToHexBE(r.B)} &bull; <strong>C:</strong> ${wordToHexBE(r.C)} &bull; <strong>D:</strong> ${wordToHexBE(r.D)}`;
            }
        };

        setReg('visR1State', r1);
        setReg('visR2State', r2);
        setReg('visR3State', r3);
        setReg('visR4State', r4);
    }

    // Stage 6: Final Registers & Output
    const visFinalRegisters = document.getElementById('visFinalRegisters');
    const visFinalHash = document.getElementById('visFinalHash');
    if (visFinalRegisters) {
        const s = details.finalState;
        visFinalRegisters.innerHTML = `
            <div class="register-card"><div class="register-name">Reg A</div><div class="register-hex">${wordToHexBE(s.A)}</div><small style="color:var(--color-text-muted);">LE: ${wordToHexLE(s.A)}</small></div>
            <div class="register-card"><div class="register-name">Reg B</div><div class="register-hex">${wordToHexBE(s.B)}</div><small style="color:var(--color-text-muted);">LE: ${wordToHexLE(s.B)}</small></div>
            <div class="register-card"><div class="register-name">Reg C</div><div class="register-hex">${wordToHexBE(s.C)}</div><small style="color:var(--color-text-muted);">LE: ${wordToHexLE(s.C)}</small></div>
            <div class="register-card"><div class="register-name">Reg D</div><div class="register-hex">${wordToHexBE(s.D)}</div><small style="color:var(--color-text-muted);">LE: ${wordToHexLE(s.D)}</small></div>
        `;
    }
    if (visFinalHash) {
        visFinalHash.textContent = details.hash;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Salt state
    let dynamicSalt = '';

    const md5Input = document.getElementById('md5Input');
    const enableSaltToggle = document.getElementById('enableSaltToggle');
    const saltBadgeToken = document.getElementById('saltBadgeToken');
    const generateHashBtn = document.getElementById('generateHash');
    const clearInputBtn = document.getElementById('clearInput');
    const copyHashBtn = document.getElementById('copyHashBtn');

    const hashOutput = document.getElementById('hashOutput');
    const statCharCount = document.getElementById('statCharCount');
    const statOrigBits = document.getElementById('statOrigBits');
    const statPaddedBytes = document.getElementById('statPaddedBytes');
    const statBlockCount = document.getElementById('statBlockCount');

    const regA = document.getElementById('regA');
    const regB = document.getElementById('regB');
    const regC = document.getElementById('regC');
    const regD = document.getElementById('regD');

    function generateRandomNonce() {
        const randNum = Math.floor(Math.random() * 0xffffffff);
        return '0x' + randNum.toString(16).padStart(8, '0');
    }

    function runSimulation(baseMessage) {
        let finalMessage = baseMessage;
        if (enableSaltToggle && enableSaltToggle.checked) {
            if (!dynamicSalt) dynamicSalt = generateRandomNonce();
            finalMessage = baseMessage + dynamicSalt;
            if (saltBadgeToken) {
                saltBadgeToken.style.display = 'inline-block';
                saltBadgeToken.textContent = `SALT NONCE: ${dynamicSalt}`;
            }
        } else {
            dynamicSalt = '';
            if (saltBadgeToken) {
                saltBadgeToken.style.display = 'none';
            }
        }

        const details = md5Detailed(finalMessage);

        if (hashOutput) hashOutput.textContent = details.hash;
        if (statCharCount) statCharCount.textContent = details.message.length;
        if (statOrigBits) statOrigBits.textContent = `${details.bitLength} bits`;
        if (statPaddedBytes) statPaddedBytes.textContent = `${details.padded.length} bytes (${details.padded.length * 8} bits)`;
        if (statBlockCount) statBlockCount.textContent = `${details.blocks.length} block(s)`;

        if (regA) regA.textContent = wordToHexBE(details.finalState.A);
        if (regB) regB.textContent = wordToHexBE(details.finalState.B);
        if (regC) regC.textContent = wordToHexBE(details.finalState.C);
        if (regD) regD.textContent = wordToHexBE(details.finalState.D);

        renderVisualizer(details);

        // Keep Avalanche Input 1 synced
        const avMsg1 = document.getElementById('avMsg1');
        if (avMsg1 && avMsg1.value !== baseMessage) {
            avMsg1.value = baseMessage;
            updateAvalancheVisualizer();
        }
    }

    if (enableSaltToggle) {
        enableSaltToggle.addEventListener('change', () => {
            if (enableSaltToggle.checked) {
                dynamicSalt = generateRandomNonce();
            } else {
                dynamicSalt = '';
            }
            if (md5Input) runSimulation(md5Input.value);
        });
    }

    if (generateHashBtn && md5Input) {
        generateHashBtn.addEventListener('click', () => {
            runSimulation(md5Input.value);
        });

        md5Input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                runSimulation(md5Input.value);
            }
        });
    }

    if (clearInputBtn && md5Input) {
        clearInputBtn.addEventListener('click', () => {
            md5Input.value = '';
            runSimulation('');
            md5Input.focus();
        });
    }

    if (copyHashBtn && hashOutput) {
        copyHashBtn.addEventListener('click', async () => {
            const text = hashOutput.textContent.trim();
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                copyHashBtn.textContent = 'Copied!';
                setTimeout(() => { copyHashBtn.textContent = 'Copy Digest'; }, 1800);
            } catch {
                const temp = document.createElement('textarea');
                temp.value = text;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
                copyHashBtn.textContent = 'Copied!';
                setTimeout(() => { copyHashBtn.textContent = 'Copy Digest'; }, 1800);
            }
        });
    }

    // Quick Presets
    const presetButtons = document.querySelectorAll('.preset-btn[data-preset]');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-preset') ?? '';
            if (md5Input) {
                md5Input.value = val;
                runSimulation(val);
            }
        });
    });

    // Avalanche Effect Controls & 128-cell Heatmap Matrix
    const avMsg1 = document.getElementById('avMsg1');
    const avMsg2 = document.getElementById('avMsg2');
    const btnRunAvalanche = document.getElementById('btnRunAvalanche');
    const btnToggleChar = document.getElementById('btnToggleChar');
    const avHash1 = document.getElementById('avHash1');
    const avHash2 = document.getElementById('avHash2');
    const avFlippedCount = document.getElementById('avFlippedCount');
    const avPercent = document.getElementById('avPercent');
    const avHexFlipped = document.getElementById('avHexFlipped');
    const avStatus = document.getElementById('avStatus');
    const bitMatrixContainer = document.getElementById('bitMatrixContainer');

    function updateAvalancheVisualizer() {
        if (!avMsg1 || !avMsg2) return;
        const res = analyzeAvalanche(avMsg1.value, avMsg2.value);

        if (avHash1) avHash1.textContent = res.hash1;
        if (avHash2) avHash2.textContent = res.hash2;
        if (avFlippedCount) avFlippedCount.textContent = `${res.flippedBits} / 128`;
        if (avPercent) avPercent.textContent = `${res.percentage}%`;
        if (avHexFlipped) avHexFlipped.textContent = `${res.hexFlipped} / 32`;
        if (avStatus) avStatus.textContent = res.status;

        // Populate 128-cell visual matrix
        if (bitMatrixContainer) {
            bitMatrixContainer.innerHTML = '';
            const regNames = ['Register A', 'Register B', 'Register C', 'Register D'];

            res.bitComparison.forEach(item => {
                const cell = document.createElement('div');
                cell.className = 'bit-cell ' + (item.isFlipped ? 'bit-flipped' : 'bit-same');
                cell.textContent = item.isFlipped ? '1' : '0';
                cell.title = `Bit #${item.bitIndex} (${regNames[item.registerIndex]})\nMsg 1 bit: ${item.bit1}\nMsg 2 bit: ${item.bit2}\nStatus: ${item.isFlipped ? 'FLIPPED (Changed via Avalanche)' : 'UNCHANGED'}`;
                bitMatrixContainer.appendChild(cell);
            });
        }
    }

    if (btnRunAvalanche) {
        btnRunAvalanche.addEventListener('click', updateAvalancheVisualizer);
    }
    if (avMsg1) avMsg1.addEventListener('input', updateAvalancheVisualizer);
    if (avMsg2) avMsg2.addEventListener('input', updateAvalancheVisualizer);

    if (btnToggleChar && avMsg2) {
        btnToggleChar.addEventListener('click', () => {
            const current = avMsg2.value || 'abc';
            if (current.length === 0) {
                avMsg2.value = 'a';
            } else {
                const lastChar = current[current.length - 1];
                const newChar = String.fromCharCode(lastChar.charCodeAt(0) ^ 1);
                avMsg2.value = current.slice(0, -1) + newChar;
            }
            updateAvalancheVisualizer();
        });
    }

    // Visualizer Collapsible Accordion Toggles
    const stageToggleBtns = document.querySelectorAll('.stage-toggle-btn');
    stageToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const stageNum = btn.getAttribute('data-stage');
            const body = document.getElementById(`stage${stageNum}Body`);
            if (body) {
                const isOpen = body.classList.toggle('open');
                btn.classList.toggle('open', isOpen);
            }
        });
    });

    // 10-Question Quiz Evaluation
    const submitQuizBtn = document.getElementById('submitQuiz');
    const retryQuizBtn = document.getElementById('retryQuiz');
    const quizResult = document.getElementById('quizResult');

    const correctAnswers = {
        q1: '128',
        q2: '80',
        q3: '512',
        q4: '64',
        q5: 'avalanche',
        q6: 'func_f',
        q7: 'sine',
        q8: '64bit_le',
        q9: 'little_endian',
        q10: 'collision'
    };

    if (submitQuizBtn && retryQuizBtn && quizResult) {
        submitQuizBtn.addEventListener('click', () => {
            let score = 0;
            let answered = 0;

            for (let i = 1; i <= 10; i++) {
                const qKey = `q${i}`;
                const correctVal = correctAnswers[qKey];
                const checked = document.querySelector(`input[name="${qKey}"]:checked`);
                const card = document.getElementById(`card_${qKey}`);
                const exp = document.getElementById(`exp_${qKey}`);

                if (checked) {
                    answered++;
                    const isCorrect = checked.value === correctVal;
                    if (isCorrect) score++;

                    if (card) {
                        card.classList.remove('correct-card', 'wrong-card');
                        card.classList.add(isCorrect ? 'correct-card' : 'wrong-card');
                    }
                    if (exp) {
                        exp.classList.remove('exp-correct', 'exp-wrong');
                        exp.classList.add(isCorrect ? 'exp-correct' : 'exp-wrong', 'show');
                    }
                } else {
                    if (card) card.classList.remove('correct-card', 'wrong-card');
                    if (exp) exp.classList.remove('show');
                }
            }

            if (answered < 10) {
                quizResult.className = 'quiz-score-banner show';
                quizResult.style.borderColor = '#f5a623';
                quizResult.textContent = `Please answer all 10 questions before submitting (${answered} / 10 answered).`;
                return;
            }

            quizResult.className = 'quiz-score-banner show';
            if (score === 10) {
                quizResult.style.borderColor = '#2ed573';
                quizResult.textContent = `Perfect Score! 10 / 10 (100%) - You have completely mastered the MD5 hash algorithm!`;
            } else if (score >= 7) {
                quizResult.style.borderColor = '#4C8CE8';
                quizResult.textContent = `Great Job! Score: ${score} / 10 (${score * 10}%) - Strong grasp of MD5 principles.`;
            } else {
                quizResult.style.borderColor = '#e74c3c';
                quizResult.textContent = `Score: ${score} / 10 (${score * 10}%) - Review the Theory, Flowchart, and Visualizer to reinforce your understanding.`;
            }

            retryQuizBtn.style.display = 'inline-block';
        });

        retryQuizBtn.addEventListener('click', () => {
            const radios = document.querySelectorAll('#md5QuizForm input[type="radio"]');
            radios.forEach(r => { r.checked = false; });

            for (let i = 1; i <= 10; i++) {
                const card = document.getElementById(`card_q${i}`);
                const exp = document.getElementById(`exp_q${i}`);
                if (card) card.classList.remove('correct-card', 'wrong-card');
                if (exp) exp.classList.remove('show', 'exp-correct', 'exp-wrong');
            }

            quizResult.className = 'quiz-score-banner';
            quizResult.style.display = 'none';
            retryQuizBtn.style.display = 'none';
        });
    }

    // Initialize defaults on page load
    if (md5Input) {
        runSimulation(md5Input.value || 'abc');
    }
    updateAvalancheVisualizer();
});
