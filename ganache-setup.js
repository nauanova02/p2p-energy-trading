const Web3 = require('web3');

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:8545'); // Default Ganache RPC URL

// Setup account (replace with one of your Ganache accounts)
const account = '0x522e79b89717Da29d93513553Bf812F2b3849f9B';

// Fetch and display the balance of the account
web3.eth.getBalance(account).then(balance => {
  console.log(`Account balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
}).catch(err => {
  console.error('Error:', err);
});

