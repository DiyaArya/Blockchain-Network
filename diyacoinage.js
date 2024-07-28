const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const SHA256 = require('crypto-js/sha256');
const bodyParser = require('body-parser');

class Transaction {
    constructor(sender, recipient, amount) {
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount;
    }
}

class CryptoBlock {
    constructor(index, timestamp, transactions, precedingHash = " ") {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.precedingHash = precedingHash;
        this.hash = this.computeHash();
        this.nonce = 0;
    }

    computeHash() {
        return SHA256(this.index + this.precedingHash + this.timestamp + 
                      JSON.stringify(this.transactions) + this.nonce).toString();
    }

    proofOfWork(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.computeHash();
        }
    }
}

class CryptoBlockchain {
    constructor() {
        this.blockchain = [this.startGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.miningReward = 50;
    }

    startGenesisBlock() {
        return new CryptoBlock(0, "01/01/2020", "Initial block in the chain", "0");
    }

    obtainLatestBlock() {
        return this.blockchain[this.blockchain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        let block = new CryptoBlock(this.obtainLatestBlock().index + 1, Date.now().toString(), this.pendingTransactions, this.obtainLatestBlock().hash);
        block.proofOfWork(this.difficulty);

        console.log('Block successfully mined!');
        this.blockchain.push(block);

        this.pendingTransactions = [];
    }

    createTransaction(transaction) {
        this.pendingTransactions.push(transaction);
    }

    checkChainValidity() {
        for (let i = 1; i < this.blockchain.length; i++) {
            const currentBlock = this.blockchain[i];
            const precedingBlock = this.blockchain[i - 1];

            if (currentBlock.hash !== currentBlock.computeHash()) {
                return false;
            }

            if (currentBlock.precedingHash !== precedingBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(bodyParser.json());

let diyacoinage = new CryptoBlockchain();


app.get('/', (req, res) => {
    res.send('Welcome to the diyacoinage Blockchain Network. Navigate to /blocks to see the blockchain or use Postman/cURL to interact with the API.');
});


app.get('/blocks', (req, res) => {
    res.json(diyacoinage.blockchain);
});

app.post('/transactions', (req, res) => {
    const { sender, recipient, amount } = req.body;
    const transaction = new Transaction(sender, recipient, amount);
    diyacoinage.createTransaction(transaction);
    res.status(201).send('Transaction added successfully');
});

app.post('/mine', (req, res) => {
    const rewardAddress = req.body.rewardAddress;
    diyacoinage.minePendingTransactions(rewardAddress);
    res.status(200).send('Block successfully mined and transactions included');
});

server.listen(3000, () => {
    console.log('Server and blockchain node running on http://localhost:3000');
});
