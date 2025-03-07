const express = require('express');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const solc = require('solc'); // Import solc for compiling the Solidity contract
const mongoose = require('mongoose'); // Import mongoose for MongoDB

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://samiri4:18dYBlplLdvZkq7X@cluster0.dhrbc.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define a User Schema for MongoDB
const userSchema = new mongoose.Schema({
  userId: String,
  ssnHash: String,
  role: String,
});

const User = mongoose.model('User', userSchema);

// Connect to Ganache or Quorum
const web3 = new Web3('http://localhost:8545'); // Adjust with your RPC URL

// Path to Solidity contract
const contractPath = path.resolve(__dirname, 'contracts', 'our_contract_fourth.sol'); // Adjust the file name accordingly
const source = fs.readFileSync(contractPath, 'utf8');

// Compile the contract
const input = {
  language: 'Solidity',
  sources: {
    'our_contract_fourth.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (!output.contracts || !output.contracts['our_contract_fourth.sol']) {
  console.error('Failed to compile contract');
  process.exit(1);
}

const compiledContract = output.contracts['our_contract_fourth.sol'].EnergyMarket;

// Extract ABI and Bytecode
const abi = compiledContract.abi;
const bytecode = compiledContract.evm.bytecode.object;

// Deployed contract address (replace with actual deployed address)
const contractAddress = '0x72dD29833Bb7Abc617ccc571740a47E25bA40241'; // Replace with your deployed address
const privateKey = '0x7be95f1a4adeddf1285eae12456528eaa625549c9caa00ddea66816513d34a9e'; // Replace with your private key for signing transactions

// Initialize contract instance
const contract = new web3.eth.Contract(abi, contractAddress);

// API Endpoints

// 1. Register a User
app.post('/register', async (req, res) => {
  const { userId, ssnHash, role } = req.body;

  if (!['consumer', 'producer'].includes(role)) {
    return res.status(400).send('Invalid role. Choose "consumer" or "producer".');
  }

  // Check if user is already registered in MongoDB
  const existingUser = await User.findOne({ userId });
  if (existingUser) {
    return res.status(400).send('User already registered.');
  }

  // Save user to MongoDB
  const newUser = new User({ userId, ssnHash, role });
  await newUser.save();

  try {
    const receipt = await contract.methods
      .registerUser(ssnHash, role)
      .send({ from: userId });
    res.status(200).send({ message: 'User registered', txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).send({ error: 'Blockchain registration failed', details: err.message });
  }
});

// 2. List Energy for Sale
app.post('/listEnergy', async (req, res) => {
  const { userId, energyAmount, pricePerUnit } = req.body;

  // Check if user is registered in MongoDB
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(400).send('User not registered.');
  }
  if (user.role !== 'producer') {
    return res.status(400).send('Only producers can list energy.');
  }

  try {
    const receipt = await contract.methods
      .listEnergyForSale(energyAmount, pricePerUnit)
      .send({ from: userId });
    res.status(200).send({ message: 'Energy listed for sale', txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).send({ error: 'Energy listing failed', details: err.message });
  }
});

// 3. Buy Energy
app.post('/buyEnergy', async (req, res) => {
  const { userId, offerId, energyAmount } = req.body;

  // Check if user is registered in MongoDB
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(400).send('User not registered.');
  }
  if (user.role !== 'consumer') {
    return res.status(400).send('Only consumers can buy energy.');
  }

  try {
    const receipt = await contract.methods
      .buyEnergy(offerId, energyAmount)
      .send({ from: userId });
    res.status(200).send({ message: 'Energy purchased', txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).send({ error: 'Energy purchase failed', details: err.message });
  }
});

// 4. Get Contract Balance (optional utility)
app.get('/balance', async (req, res) => {
  try {
    const balance = await web3.eth.getBalance(contractAddress);
    res.status(200).send({ balance: web3.utils.fromWei(balance, 'ether') + ' ETH' });
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch balance', details: err.message });
  }
});

// Start server
const port = 3000;
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
