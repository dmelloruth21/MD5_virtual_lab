// ==========================================
// MEMBER 1 - MD5 PREPROCESSING
// ==========================================

/**
 * Preprocesses a message according to the MD5 specification.
 *
 * Steps:
 * 1. Convert message to UTF-8 bytes
 * 2. Add MD5 padding
 * 3. Append original message length as 64-bit little-endian
 * 4. Divide into 512-bit (64-byte) blocks
 * 5. Convert every block into 16 x 32-bit words
 *
 * @param {string} message - Input message
 * @returns {number[][]} Array of blocks.
 * Each block contains exactly 16 unsigned 32-bit words.
 */
function preprocess(message) {

    // ------------------------------------------
    // STEP 1: Convert input message to UTF-8 bytes
    // ------------------------------------------

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    // Convert Uint8Array to normal array because
    // we need to append padding bytes.
    const bytes = Array.from(messageBytes);


    // ------------------------------------------
    // STEP 2: Store original message length
    // ------------------------------------------

    // MD5 stores the original message length in bits.
    // BigInt is used because MD5 uses a 64-bit length field.
    const originalBitLength = BigInt(bytes.length) * 8n;


    // ------------------------------------------
    // STEP 3: MD5 Padding
    // ------------------------------------------

    // Append a single '1' bit.
    //
    // Since we are working with complete bytes,
    // binary 10000000 = hexadecimal 0x80.
    bytes.push(0x80);

    // Add 0 bytes until the length becomes
    // 56 bytes modulo 64.
    //
    // The remaining 8 bytes of the 64-byte block
    // are reserved for the original message length.
    while (bytes.length % 64 !== 56) {
        bytes.push(0x00);
    }


    // ------------------------------------------
    // STEP 4: Append original message length
    // ------------------------------------------

    // MD5 requires the 64-bit message length
    // to be stored in LITTLE-ENDIAN order.
    for (let i = 0; i < 8; i++) {

        const lengthByte =
            Number(
                (originalBitLength >> BigInt(i * 8)) & 0xFFn
            );

        bytes.push(lengthByte);
    }


    // ------------------------------------------
    // STEP 5: Divide into 512-bit blocks
    // ------------------------------------------

    // 512 bits = 64 bytes.
    const blocks = [];

    for (let blockStart = 0;
         blockStart < bytes.length;
         blockStart += 64) {

        const words = [];


        // --------------------------------------
        // STEP 6: Convert each block into
        // 16 x 32-bit words
        // --------------------------------------

        // Every four bytes form one 32-bit word.
        // MD5 uses LITTLE-ENDIAN byte ordering.

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

        // Every block contains exactly 16 words.
        blocks.push(words);
    }


    // ------------------------------------------
    // RETURN RESULT
    // ------------------------------------------

    return blocks;
}


// ==========================================
// EXPORT
// ==========================================

// Allows other members' JavaScript files to use:
//
// import { preprocess } from "./script.js";
//
export { preprocess };
