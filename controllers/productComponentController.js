import Blockchain from '../blockchain/blockchain.js';
import ProductComponent from '../models/ProductComponent.js';
import crypto from 'crypto';
import Rating from '../models/Rating.js';

const productQualityBlockchain = new Blockchain();

function calculateFreshnessScore(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffInTime = expiry.getTime() - today.getTime();
  const diffInDays = diffInTime / (1000 * 3600 * 24);

  if (diffInDays >= 7) {
    return 10;
  } else if (diffInDays >= 3) {
    return 8;
  } else if (diffInDays >= 1) {
    return 5;
  } else {
    return 1;
  }
}

async function addProductComponent(req, res) {
  try {
    const { name, description, origin, expiryDate, quantity } = req.body;

    const newProductComponent = new ProductComponent({
      name,
      description,
      origin,
      expiryDate,
      quantity,
      blockchainId: crypto.randomBytes(16).toString('hex'),
    });

    await newProductComponent.save();

    const freshnessScore = calculateFreshnessScore(expiryDate);

    const transaction = {
      name: newProductComponent.name,
      description: newProductComponent.description,
      origin: newProductComponent.origin,
      expiryDate: newProductComponent.expiryDate,
      quantity: newProductComponent.quantity,
      blockchainId: newProductComponent.blockchainId,
      qualityScore: freshnessScore,
      timestamp: Date.now(),
    };

    await productQualityBlockchain.createNewTransaction(transaction);
    await productQualityBlockchain.addBlock();

    res.status(201).json({
      message: 'Product component added successfully and recorded on the blockchain!',
      productComponent: newProductComponent,
      blockchainTransaction: transaction,
    });
  } catch (error) {
    console.error('Error adding product component:', error);
    res.status(500).json({ message: 'Error adding product component.' });
  }
}

async function getProductComponents(req, res) {
  try {
    const productComponents = await ProductComponent.find();

    const productComponentsWithQualityScore = await Promise.all(
      productComponents.map(async (productComponent) => {
        const blockchainData = await productQualityBlockchain.getTransactionByBlockchainId(productComponent.blockchainId);

        if (!blockchainData) {
          console.warn(`Blockchain data not found for product component: ${productComponent.name}`);
        }

        return {
          ...productComponent.toObject(),
          qualityScore: blockchainData ? calculateFreshnessScore(productComponent.expiryDate) : 'N/A',
        };
      })
    );

    res.status(200).json(productComponentsWithQualityScore);
  } catch (error) {
    console.error('Error fetching product components:', error);
    res.status(500).json({ message: 'Error fetching product components.' });
  }
}

async function getProductComponentDetails(req, res) {
  try {
    const { productComponentId } = req.params;
    const productComponent = await ProductComponent.findOne({ blockchainId: productComponentId });

    if (!productComponent) {
      return res.status(404).json({ message: 'Product component not found.' });
    }

    const blockchainData = await productQualityBlockchain.getTransactionByBlockchainId(productComponent.blockchainId);

    if (!blockchainData) {
      console.warn(`Blockchain data not found for product component: ${productComponent.name}`);
    }

    res.status(200).json({
      name: productComponent.name,
      description: productComponent.description,
      origin: productComponent.origin,
      expiryDate: productComponent.expiryDate,
      quantity: productComponent.quantity,
      qualityScore: blockchainData ? calculateFreshnessScore(productComponent.expiryDate) : 'N/A',
      blockchainTimestamp: blockchainData?.timestamp || 'N/A',
    });
  } catch (error) {
    console.error('Error fetching product component details:', error);
    res.status(500).json({ message: 'Error fetching product component details.' });
  }
}

async function updateProductComponent(req, res) {
  try {
    const { productComponentId } = req.params;
    const { name, description, origin, expiryDate, quantity } = req.body;

    const productComponent = await ProductComponent.findOne({ blockchainId: productComponentId });

    if (!productComponent) {
      return res.status(404).json({ message: 'Product component not found.' });
    }

    let updatedFields = [];

    if (name && name !== productComponent.name) {
      productComponent.name = name;
      updatedFields.push('name');
    }

    if (description && description !== productComponent.description) {
      productComponent.description = description;
      updatedFields.push('description');
    }

    if (origin && origin !== productComponent.origin) {
      productComponent.origin = origin;
      updatedFields.push('origin');
    }

    if (expiryDate && expiryDate !== productComponent.expiryDate) {
      productComponent.expiryDate = expiryDate;
      updatedFields.push('expiryDate');
    }

    if (quantity && quantity !== productComponent.quantity) {
      productComponent.quantity = quantity;
      updatedFields.push('quantity');
    }

    if (updatedFields.length > 0) {
      await productComponent.save();

      const freshnessScore = calculateFreshnessScore(expiryDate);
      const blockchainData = await productQualityBlockchain.getTransactionByBlockchainId(productComponent.blockchainId);

      if (blockchainData) {
        blockchainData.qualityScore = freshnessScore;
        blockchainData.timestamp = Date.now();
        blockchainData.updatedFields = updatedFields;

        await productQualityBlockchain.updateTransactionHistory(blockchainData);

        res.status(200).json({
          message: 'Product component updated successfully',
          productComponent,
          blockchainTransaction: blockchainData,
        });
      } else {
        res.status(404).json({
          message: 'Blockchain data not found for the product component.',
        });
      }
    } else {
      res.status(200).json({
        message: 'No changes detected for the product component.',
      });
    }
  } catch (error) {
    console.error('Error updating product component:', error);
    res.status(500).json({ message: 'Error updating product component.' });
  }
}

async function deleteProductComponent(req, res) {
  try {
    const { productComponentId } = req.params;
    const productComponent = await ProductComponent.findOneAndDelete({ blockchainId: productComponentId });

    if (!productComponent) {
      return res.status(404).json({ message: 'Product component not found.' });
    }

    const blockchainData = {
      blockchainId: productComponent.blockchainId,
      action: 'delete',
      timestamp: Date.now(),
    };

    await productQualityBlockchain.createNewTransaction(blockchainData);
    await productQualityBlockchain.addBlock();

    res.status(200).json({
      message: 'Product component deleted successfully from database and blockchain.',
      productComponent,
    });
  } catch (error) {
    console.error('Error deleting product component:', error);
    res.status(500).json({ message: 'Error deleting product component.' });
  }
}

async function submitRating(req, res) {
  try {
    const { productId } = req.params;
    const { productQuality, taste, componentQuality } = req.body;

    if (
      !Number.isInteger(productQuality) ||
      productQuality < 1 || productQuality > 10 ||
      !Number.isInteger(taste) ||
      taste < 1 || taste > 10 ||
      !Number.isInteger(componentQuality) ||
      componentQuality < 1 || componentQuality > 10
    ) {
      return res.status(400).json({ message: 'Ratings must be integers between 1 and 10.' });
    }

    const newRating = new Rating({
      productId,
      productQuality,
      taste,
      componentQuality,
    });

    await newRating.save();

    res.status(201).json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: 'Error submitting rating.' });
  }
}

async function getAverageRating(req, res) {
  try {
    const { productId } = req.params;

    const ratings = await Rating.find({ productId });

    if (ratings.length === 0) {
      return res.status(404).json({ message: 'No ratings found for this product.' });
    }

    const averageProductQuality = ratings.reduce((acc, rating) => acc + rating.productQuality, 0) / ratings.length;
    const averageTaste = ratings.reduce((acc, rating) => acc + rating.taste, 0) / ratings.length;
    const averageComponentQuality = ratings.reduce((acc, rating) => acc + rating.componentQuality, 0) / ratings.length;

    const percentageProductQuality = (averageProductQuality / 10) * 100;
    const percentageTaste = (averageTaste / 10) * 100;
    const correctPercentage = (averageComponentQuality / 10) * 100;

    res.status(200).json({
      averageProductQuality: percentageProductQuality.toFixed(2),
      averageTaste: percentageTaste.toFixed(2),
      averageComponentQuality: averageComponentQuality.toFixed(2),
      correctPercentage: correctPercentage.toFixed(2),
    });
  } catch (error) {
    console.error('Error calculating average rating:', error);
    res.status(500).json({ message: 'Error calculating average rating.' });
  }
}

export { addProductComponent, getProductComponents, getProductComponentDetails, updateProductComponent, deleteProductComponent, submitRating, getAverageRating };