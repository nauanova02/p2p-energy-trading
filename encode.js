const Web3 = require('web3');
const web3 = new Web3();

const energyAmount = 100;  // Energy amount to list for sale
const pricePerUnit = web3.utils.toWei('5', 'ether');  // Price per unit in Wei (5 ETH)

const data = web3.eth.abi.encodeFunctionCall({
  name: 'listEnergyForSale',
  type: 'function',
  inputs: [{
    type: 'uint256',
    name: 'energyAmount'
  }, {
    type: 'uint256',
    name: 'pricePerUnit'
  }]
}, [energyAmount, pricePerUnit]);

console.log(data);  // The ABI-encoded data you need to use in Postman
