const bip39 = require('bip39');

// Generate a random 12-word mnemonic
const mnemonic = bip39.generateMnemonic();

console.log("Your generated mnemonic is: ", mnemonic);