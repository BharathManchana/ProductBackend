import crypto from 'crypto';
import BlockchainModel from '../models/blockchain.js';

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.initBlockchain();
  }

  async initBlockchain() {
    await this.loadBlockchain();
    if (this.chain.length === 0) {
      await this.createGenesisBlock();
    }
  }

  async createGenesisBlock() {
    const block = {
      index: 0,
      timestamp: Date.now(),
      data: [],
      previousHash: '0',
      hash: this.calculateHash(0, '[]', '0'),
    };
    this.chain.push(block);
    await this.saveBlockchain();
  }

  calculateHash(index, data, previousHash) {
    return crypto
      .createHash('sha256')
      .update(index + data + previousHash)
      .digest('hex');
  }

  async createNewTransaction(transaction) {
    this.pendingTransactions.push(transaction);
    return this.pendingTransactions.length - 1;
  }
  

  async addBlock() {
    const previousBlock = this.chain[this.chain.length - 1];
    
    if (this.pendingTransactions.length === 0) {
      console.warn('No transactions to add. Creating an empty block.');
      const newBlock = {
        index: this.chain.length,
        timestamp: Date.now(),
        data: [],
        previousHash: previousBlock.hash,
        hash: this.calculateHash(this.chain.length, '[]', previousBlock.hash),
      };
      this.chain.push(newBlock);
      await this.saveBlockchain();
      await this.loadBlockchain();
      return newBlock;
    }
  
    const newBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      data: [...this.pendingTransactions],
      previousHash: previousBlock.hash,
      hash: this.calculateHash(
        this.chain.length,
        JSON.stringify(this.pendingTransactions),
        previousBlock.hash
      ),
    };
  
    this.chain.push(newBlock);
    this.pendingTransactions = [];
    await this.saveBlockchain();
    await this.loadBlockchain();
    return newBlock;
  }
  
  async getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  getBlockchain() {
    return this.chain.map(block => ({
      ...block,
      data: block.data || [],
    }));
  }

  async getTransactionByBlockchainId(blockchainId) {
    await this.loadBlockchain(); 
    for (let block of this.chain) {
      for (let transaction of block.data) {
        if (transaction.blockchainId === blockchainId) {
          return transaction;
        }
      }
    }
    return null;
  }

  async saveBlockchain() {
    for (let block of this.chain) {
      const existingBlock = await BlockchainModel.findOne({ index: block.index });
      if (existingBlock) {
        await BlockchainModel.updateOne(
          { index: block.index },
          { $set: { ...block, _id: existingBlock._id } }
        );
      } else {
        const newBlock = new BlockchainModel(block);
        await newBlock.save();
      }
    }
  }

  async loadBlockchain() {
    const blocks = await BlockchainModel.find().sort({ index: 1 });
    if (blocks.length > 0) {
      this.chain = blocks.map(block => ({
        ...block.toObject(),
        data: block.data || [],
      }));
    }
  }

  async getAllTransactions() {
    await this.loadBlockchain(); 
    return this.chain.flatMap(block => block.data || []);
  }

  async updateTransactionHistory(transaction) {
    if (!transaction || typeof transaction !== 'object' || !transaction.blockchainId) {
      throw new Error('Invalid transaction data for update');
    }

    const transactionHistory = {
      name: transaction.name || '',
      description: transaction.description || '',
      origin: transaction.origin || '',
      expiryDate: transaction.expiryDate || '',
      quantity: transaction.quantity || 0,
      blockchainId: transaction.blockchainId,
      qualityScore: transaction.qualityScore || 0,
      timestamp: transaction.timestamp || Date.now(),
      action: transaction.action || null,
      updatedFields: transaction.updatedFields || [],
    };

    await this.createNewTransaction(transactionHistory);
    await this.addBlock();
  }
}

export default Blockchain;
