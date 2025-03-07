const path = require('path');
const fs = require('fs');
const solc = require('solc');

// The correct path to your contract file
const contractPath = path.resolve(__dirname, 'contracts', 'our_contract_fourth.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Compile the contract
const input = {
  language: 'Solidity',
  sources: {
    'our_contract_fourth.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for compilation errors
if (output.errors) {
  output.errors.forEach(err => console.error(err));
}

// Ensure we have compiled contracts
if (output.contracts) {
  const compiledContract = output.contracts['our_contract_fourth.sol'];

  // Use JSON.stringify to properly display ABI and bytecode
  console.log('ABI:', JSON.stringify(compiledContract.EnergyToken.abi, null, 2));
  console.log('Bytecode:', compiledContract.EnergyToken.evm.bytecode.object);

  // Export them for later use (deployment)
  module.exports = {
    abi: compiledContract.EnergyToken.abi,
    bytecode: compiledContract.EnergyToken.evm.bytecode.object,
  };
} else {
  console.log("Compilation failed or no contracts found.");
}
