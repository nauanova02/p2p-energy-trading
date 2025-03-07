// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnergyToken {
    string public name = "EnergyToken";
    string public symbol = "ETK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        totalSupply = initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "ERC20: transfer to the zero address");
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "ERC20: allowance exceeded");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == owner, "Only owner can mint tokens");
        require(to != address(0), "ERC20: mint to the zero address");

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract EnergyMarket {
    EnergyToken public energyToken;
    uint256 public tokenPrice = 1 ether;

    struct EnergyOffer {
        uint256 energyAmount;
        uint256 pricePerUnit;
        address producer;
    }

    struct EnergyNegotiation {
        uint256 energyAmount;
        uint256 pricePerUnit;
        address producer;
        address consumer;
        bool isActive;
        uint256 proposedPrice;
    }

    EnergyOffer[] public energyOffers;
    EnergyNegotiation[] public energyNegotiations;

    mapping(address => uint256) public consumerEnergyBalance;
    mapping(address => bytes32) public userHashes;

    event EnergyOffered(uint256 offerId, uint256 energyAmount, uint256 pricePerUnit, address producer);
    event EnergyPurchased(uint256 offerId, uint256 energyAmount, uint256 pricePerUnit, address consumer);
    event TokensPurchased(address buyer, uint256 amount, uint256 ethPaid);
    event TokensSold(address seller, uint256 amount, uint256 ethReceived);
    event UserRegistered(address user, bytes32 ssnHash);

    constructor(uint256 initialSupply) {
        energyToken = new EnergyToken(initialSupply);
    }

    // User registration with SSN (no roles assigned, user can be both a producer and a consumer)
    function registerUser(string memory ssn) public {
        require(userHashes[msg.sender] == 0, "User already registered");

        userHashes[msg.sender] = keccak256(abi.encodePacked(ssn));

        emit UserRegistered(msg.sender, userHashes[msg.sender]);
    }

    // Function to buy tokens (Any registered user can buy tokens)
    function buyTokens() public payable {
        require(userHashes[msg.sender] != 0, "User not registered");
        require(msg.value > 0, "You must send ETH to buy tokens");

        uint256 tokensToMint = msg.value / tokenPrice;
        require(tokensToMint > 0, "Insufficient ETH sent for tokens");

        energyToken.mint(msg.sender, tokensToMint);

        emit TokensPurchased(msg.sender, tokensToMint, msg.value);
    }

    // Function to sell tokens (Any registered user can sell tokens)
    function sellTokens(uint256 tokenAmount) public {
        require(userHashes[msg.sender] != 0, "User not registered");
        require(tokenAmount > 0, "You must specify an amount to sell");
        require(energyToken.balanceOf(msg.sender) >= tokenAmount, "You don't have enough tokens to sell");

        uint256 ethAmount = tokenAmount * tokenPrice;
        require(address(this).balance >= ethAmount, "Contract doesn't have enough ETH to buy tokens");

        energyToken.transferFrom(msg.sender, address(this), tokenAmount);
        payable(msg.sender).transfer(ethAmount);

        emit TokensSold(msg.sender, tokenAmount, ethAmount);
    }

    // Function to list energy for sale (Any registered user can list energy as a producer)
    function listEnergyForSale(uint256 energyAmount, uint256 pricePerUnit) public {
        require(userHashes[msg.sender] != 0, "User not registered");
        require(energyToken.balanceOf(msg.sender) >= energyAmount, "Not enough EnergyTokens to list");

        energyToken.transferFrom(msg.sender, address(this), energyAmount);

        energyOffers.push(EnergyOffer({
            energyAmount: energyAmount,
            pricePerUnit: pricePerUnit,
            producer: msg.sender
        }));

        emit EnergyOffered(energyOffers.length - 1, energyAmount, pricePerUnit, msg.sender);
    }

    // Function to buy energy (Any registered user can buy energy as a consumer)
    function buyEnergy(uint256 offerId, uint256 energyAmount) public {
        require(userHashes[msg.sender] != 0, "User not registered");

        require(offerId < energyOffers.length, "Invalid offer ID");
        EnergyOffer storage offer = energyOffers[offerId];

        require(energyAmount == offer.energyAmount, "You can only buy the full amount");

        uint256 totalPrice = energyAmount * offer.pricePerUnit;
        require(energyToken.balanceOf(msg.sender) >= totalPrice, "Not enough EnergyTokens to buy");

        energyToken.transferFrom(msg.sender, offer.producer, totalPrice);
        consumerEnergyBalance[msg.sender] += energyAmount;

        energyOffers[offerId] = energyOffers[energyOffers.length - 1];
        energyOffers.pop();

        emit EnergyPurchased(offerId, energyAmount, offer.pricePerUnit, msg.sender);
    }

    // Function to start a negotiation (Any registered user can start a negotiation as a consumer)
    function startNegotiation(uint256 offerId) public {
        EnergyOffer storage offer = energyOffers[offerId];
        require(offer.producer != msg.sender, "Producer cannot start negotiation with themselves");

        energyNegotiations.push(EnergyNegotiation({
            energyAmount: offer.energyAmount,
            pricePerUnit: offer.pricePerUnit,
            producer: offer.producer,
            consumer: msg.sender,
            isActive: true,
            proposedPrice: 0
        }));
    }

    // Function for consumers to propose a new price during negotiations
    function proposePrice(uint256 negotiationId, uint256 newPrice) public {
        EnergyNegotiation storage negotiation = energyNegotiations[negotiationId];
        require(negotiation.isActive, "Negotiation is not active");
        require(negotiation.consumer == msg.sender, "Only the consumer can propose a new price");

        negotiation.proposedPrice = newPrice;
    }

    // Function for producers to respond to price proposals
    function respondToProposal(uint256 negotiationId, bool accept) public {
        EnergyNegotiation storage negotiation = energyNegotiations[negotiationId];
        require(negotiation.isActive, "Negotiation is not active");
        require(negotiation.producer == msg.sender, "Only the producer can respond to the proposal");

        if (accept) {
            negotiation.isActive = false;

            uint256 totalPrice = negotiation.energyAmount * negotiation.proposedPrice;
            require(energyToken.balanceOf(negotiation.consumer) >= totalPrice, "Consumer does not have enough tokens");
            energyToken.transferFrom(negotiation.consumer, negotiation.producer, totalPrice);

            consumerEnergyBalance[negotiation.consumer] += negotiation.energyAmount;
        } else {
            negotiation.isActive = false;
        }
    }

    // Function to cancel a negotiation (Any involved user can cancel)
    function cancelNegotiation(uint256 negotiationId) public {
        EnergyNegotiation storage negotiation = energyNegotiations[negotiationId];
        require(negotiation.isActive, "Negotiation is not active");
        require(msg.sender == negotiation.consumer || msg.sender == negotiation.producer, "Only parties involved can cancel");

        negotiation.isActive = false;
    }
}
