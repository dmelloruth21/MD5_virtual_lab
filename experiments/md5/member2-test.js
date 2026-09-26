const {
    S,
    K,
    F,
    G,
    H,
    I,
    leftRotate
} = require("./member2-functions.js");


console.log("=================================");
console.log("      MD5 MEMBER 2 TEST");
console.log("=================================\n");


// Test input values
const B = 0x12345678;
const C = 0xABCDEF01;
const D = 0x0F0F0F0F;


// Test F
console.log(
    "F(B,C,D) =",
    F(B, C, D).toString(16).padStart(8, "0")
);


// Test G
console.log(
    "G(B,C,D) =",
    G(B, C, D).toString(16).padStart(8, "0")
);


// Test H
console.log(
    "H(B,C,D) =",
    H(B, C, D).toString(16).padStart(8, "0")
);


// Test I
console.log(
    "I(B,C,D) =",
    I(B, C, D).toString(16).padStart(8, "0")
);


// Test left rotation
console.log(
    "Left Rotate =",
    leftRotate(B, 7).toString(16).padStart(8, "0")
);


// Check S and K
console.log("\nMD5 CONSTANT CHECK");
console.log("------------------");

console.log("S length =", S.length);
console.log("K length =", K.length);


// Verify lengths
console.log("\nRESULT");

if (S.length === 64) {
    console.log("S array: PASS");
} else {
    console.log("S array: FAIL");
}

if (K.length === 64) {
    console.log("K array: PASS");
} else {
    console.log("K array: FAIL");
}
