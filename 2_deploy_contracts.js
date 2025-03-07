//const EnergyToken = artifacts.require("EnergyToken");
const EnergyMarket = artifacts.require("EnergyMarket");

module.exports = async function (deployer) {
  //await deployer.deploy(EnergyToken, 1000000);
  const initialSupply = web3.utils.toWei("1000", "ether");
  //const energyTokenInstance = await EnergyToken.deployed();
  //await deployer.deploy(EnergyMarket, energyTokenInstance.address);
  deployer.deploy(EnergyMarket, initialSupply);
};