const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Connect to Ganache or Quorum
const web3 = new Web3('http://localhost:8545');  // Ganache or Quorum RPC URL

// The correct path to your compiled contract file
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

// Ensure we have compiled contracts
if (output.errors) {
  output.errors.forEach(err => console.error(err));
}

if (output.contracts) {
  const compiledContract = output.contracts['our_contract_fourth.sol'];

  // Get the ABI and Bytecode
  const abi = compiledContract.EnergyToken.abi;
  const bytecode = compiledContract.EnergyToken.evm.bytecode.object;

  // We assume that the first account in the Ganache or Quorum node is the deployer
  web3.eth.getAccounts().then(async (accounts) => {
    const deployer = accounts[0]; // The account that will deploy the contract

    // Create a contract instance
    const energyTokenContract = new web3.eth.Contract(abi);

    // Deploy the contract
    energyTokenContract.deploy({
      data: '0x' + bytecode,
      arguments: [1000000]  // Example: initial supply of 1,000,000 tokens (adjust as needed)
    })
    .send({
      from: deployer,
      gas: 4700000,  // Adjust gas limit as needed
      gasPrice: '20000000000'  // Adjust gas price as needed
    })
    .on('transactionHash', (hash) => {
      console.log('Transaction Hash:', hash);
    })
    .on('receipt', (receipt) => {
      console.log('Contract deployed at address:', receipt.contractAddress);
      // Now you can interact with your deployed contract at receipt.contractAddress
    })
    .on('error', (error) => {
      console.error('Error deploying contract:', error);
    });
  });
} else {
  console.log("Compilation failed or no contracts found.");
}