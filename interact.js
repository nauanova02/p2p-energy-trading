const Web3 = require('web3');
const path = require('path');
const fs = require('fs');

// Connect to Ganache (local blockchain)
const web3 = new Web3('http://localhost:8545');

// Load ABI
const compiledContractPath = path.resolve(__dirname, 'build', 'contracts', 'EnergyToken.json'); // Make sure ABI is available
const contractABI = JSON.parse(fs.readFileSync(compiledContractPath, 'utf8')).abi;

// Use the contract address you got from deployment
const contractAddress = '0xccfd76493741b4217b2f57a3488d54434bf62f19';
const energyTokenContract = new web3.eth.Contract(contractABI, contractAddress);

// Interact with the Contract
async function interactWithContract() {
  try {
    // Get the list of accounts from Ganache
    const accounts = await web3.eth.getAccounts();
    console.log('Accounts:', accounts);

    // Example interaction: reading the total supply (if your contract has this method)
    const totalSupply = await energyTokenContract.methods.totalSupply().call();
    console.log('Total Supply:', totalSupply);

    // Example: Get the balance of the first account (if applicable)
    const balance = await energyTokenContract.methods.balanceOf(accounts[0]).call();
    console.log('Balance of first account:', balance);

    // Example: Sending a transaction (if your contract has a 'transfer' method)
    // const receipt = await energyTokenContract.methods.transfer(accounts[1], 100).send({ from: accounts[0] });
    // console.log('Transfer successful. Transaction receipt:', receipt);

  } catch (error) {
    console.error('Error interacting with contract:', error);
  }
}

interactWithContract();
