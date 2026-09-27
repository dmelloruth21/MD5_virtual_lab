# MD5 Hash Algorithm

## Experiment ID

EXP03

## Experiment Name

MD5 Hash Algorithm

## Description  

This experiment demonstrates the working of the MD5 (Message-Digest Algorithm 5)
hashing algorithm. It accepts a text message as input and generates its
corresponding 128-bit MD5 hash value.

The experiment also demonstrates how changing the input message affects the
resulting hash value.

## Input

- A text message of arbitrary length.

## Output

- A 128-bit MD5 hash.
- The hash is represented as a 32-character lowercase hexadecimal string.

## Working

The MD5 algorithm processes the input message through the following major stages:

1. The input message is converted into UTF-8 bytes.
2. MD5 padding is added to make the message length suitable for processing.
3. The padded message is divided into 512-bit blocks.
4. Each block is divided into sixteen 32-bit words.
5. The MD5 compression function processes each block through 64 operations.
6. Four 32-bit state values are updated during the compression process.
7. The final state is converted into the 128-bit MD5 digest.

The experiment also allows the effect of changing the input message to be
observed by comparing the resulting hash values.

## Implementation

The MD5 implementation is written in JavaScript and is intended to run in
the browser as part of the virtual laboratory.

The implementation is divided into the following logical parts:

- **Preprocessing:** UTF-8 conversion, padding, message length encoding and
  conversion into 32-bit words.
- **MD5 functions and constants:** MD5 logical functions, shift amounts,
  constants and bit rotation.
- **Compression:** Processing of the 512-bit blocks through the 64 MD5
  operations.
- **Final hash generation:** Combining the final state values and converting
  them into the hexadecimal MD5 digest.

## Test Cases

The implementation should be tested using known MD5 input-output pairs.

| Input | Expected MD5 |
|---|---|
| Empty string (`""`) | `d41d8cd98f00b204e9800998ecf8427e` |
| `hello` | `5d41402abc4b2a76b9719d911017c592` |
| `abc` | `900150983cd24fb0d6963f7d28e17f72` |

The simulation also demonstrates the avalanche effect by changing a small part of an input message and observing the resulting change in the MD5 hash.

The experiment should also be tested by making a small change to an input
message and observing that the resulting hash changes significantly.

## Dependencies

- HTML5
- CSS
- JavaScript
- No external libraries are required for the MD5 algorithm.

## Limitations

MD5 is included in this experiment for educational purposes. It is not
considered secure for modern cryptographic applications because practical
collision attacks exist.

The experiment is intended to demonstrate the working of the MD5 hashing
algorithm and the effect of changing the input message.

## Learning Outcomes

After completing this experiment, the learner should be able to:

- Explain the basic purpose of a cryptographic hash function.
- Describe the major stages of the MD5 algorithm.
- Understand MD5 preprocessing and block processing.
- Generate an MD5 hash for a given message.
- Observe the effect of changing an input message on its hash value.

## References

1. RFC 1321 - The MD5 Message-Digest Algorithm.
2. Cryptography Virtual Lab experiment documentation.
