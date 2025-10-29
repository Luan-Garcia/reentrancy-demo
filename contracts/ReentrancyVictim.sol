// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReentrancyVictim {
    mapping(address => uint256) public balances;

    // permite depósitos
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // vulnerável — envia ETH antes de zerar o saldo
    function withdraw() public {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Sem saldo");
        (bool success, ) = msg.sender.call{value: bal}("");
        require(success, "Falha ao enviar");
        balances[msg.sender] = 0; // <- linha vulnerável (atrasada)
    }

    // ver saldo do contrato
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
