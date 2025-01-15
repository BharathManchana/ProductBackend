import Blockchain from '../blockchain/blockchain.js';

const foodQualityBlockchain = new Blockchain();

export const getBlockchainData = async (req, res) => {
  try {
    const blockchainData = await foodQualityBlockchain.getAllTransactions();
    const detailedBlockchainData = blockchainData
      .filter(transaction => Object.keys(transaction).length > 0)
      .map(transaction => ({
        blockchainId: transaction.blockchainId,
        name: transaction.name,
        description: transaction.description,
        origin: transaction.origin,
        expiryDate: transaction.expiryDate,
        quantity: transaction.quantity,
        qualityScore: transaction.qualityScore,
        timestamp: transaction.timestamp,
        action: transaction.action || null,
        updatedFields: transaction.updatedFields || [],
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.status(200).json({
      message: 'All blockchain transactions fetched successfully.',
      blockchainData: detailedBlockchainData,
    });
  } catch (err) {
    console.error('Error fetching blockchain data:', err);
    res.status(500).json({ message: 'Error fetching blockchain data.' });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { blockchainId } = req.params;
    const transaction = await foodQualityBlockchain.getTransactionByBlockchainId(blockchainId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found for the given blockchain ID.' });
    }

    res.status(200).json({
      message: 'Transaction data fetched successfully.',
      transaction,
    });
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    res.status(500).json({ message: 'Error fetching transaction data.' });
  }
};
