const {Web3} = require('web3');

// Use the correct RPC endpoint based on your container port mapping
const web3 = new Web3('http://localhost:22006'); 

// Example function to check the network ID
web3.eth.net.getId()
    .then(networkId => {
        console.log('Connected to network:', networkId);
    })
    .catch(err => {
        console.error('Error connecting to the network:', err);
    });
