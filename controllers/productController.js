import Product from '../models/Product.js';
import Ingredient from '../models/ProductComponent.js';
import Blockchain from '../blockchain/blockchain.js';
import crypto from 'crypto';
import { uploadOnCloudinary } from '../Cloudinary/cloudinary.js'; 

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

export const addProduct = async (req, res) => {
  try {
    const { name, price, ingredientBlockchainIds } = req.body;

    if (!name || !price || !ingredientBlockchainIds || ingredientBlockchainIds.length === 0) {
      return res.status(400).json({ message: 'Invalid product data.' });
    }

    const imageLocalPath = req.file?.path || req.files?.image?.[0]?.path;

    if (!imageLocalPath) {
      return res.status(400).json({ message: 'Image upload is mandatory.' });
    }

    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage) {
      return res.status(500).json({ message: 'Failed to upload image.' });
    }

    const imageUrl = uploadedImage?.url;

    const ingredients = await Ingredient.find({ blockchainId: { $in: ingredientBlockchainIds } });
    if (ingredients.length !== ingredientBlockchainIds.length) {
      return res.status(404).json({ message: 'Some ingredients not found.' });
    }

    let totalQualityScore = 0;
    let totalFreshnessScore = 0;

    for (let ingredient of ingredients) {
      const blockchainData = await productQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);
      const qualityScore = blockchainData?.qualityScore || 0;
      totalQualityScore += qualityScore;
      const freshnessScore = calculateFreshnessScore(ingredient.expiryDate);
      totalFreshnessScore += freshnessScore;
    }

    const averageQualityScore = totalQualityScore / ingredients.length;
    const averageFreshnessScore = totalFreshnessScore / ingredients.length;
    const overallScore = (averageQualityScore + averageFreshnessScore) / 2;

    const newProduct = new Product({
      name,
      price,
      qualityScore: overallScore,
      ingredients: ingredientBlockchainIds,
      blockchainId: crypto.randomBytes(16).toString('hex'),
      imageUrl,
    });

    await newProduct.save();

    const transaction = {
      name: newProduct.name,
      price: newProduct.price,
      ingredients: newProduct.ingredients,
      qualityScore: newProduct.qualityScore,
      blockchainId: newProduct.blockchainId,
      timestamp: Date.now(),
    };

    await productQualityBlockchain.createNewTransaction(transaction);
    await productQualityBlockchain.addBlock();

    res.status(201).json({
      message: 'Product added successfully and recorded on the blockchain!',
      product: newProduct,
      blockchainTransaction: transaction,
    });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ message: 'Error adding product.' });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    const productsWithIngredients = [];

    for (let product of products) {
      const ingredients = await Ingredient.find({ blockchainId: { $in: product.ingredients } });
      const ingredientsWithScores = await Promise.all(
        ingredients.map(async (ingredient) => {
          const blockchainData = await productQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);

          if (!blockchainData) {
            console.warn(`Blockchain data not found for ingredient: ${ingredient.name}`);
          }

          const freshnessScore = calculateFreshnessScore(ingredient.expiryDate);
          return {
            ...ingredient.toObject(),
            qualityScore: calculateFreshnessScore(ingredient.expiryDate),
            blockchainTimestamp: blockchainData?.timestamp || 'N/A',
            freshnessScore,
          };
        })
      );

      const totalQualityScore = ingredientsWithScores.reduce(
        (sum, ingredient) => sum + (ingredient.qualityScore || 0),
        0
      );
      const totalFreshnessScore = ingredientsWithScores.reduce(
        (sum, ingredient) => sum + (ingredient.freshnessScore || 0),
        0
      );

      const averageQualityScore = totalQualityScore / ingredientsWithScores.length;
      const averageFreshnessScore = totalFreshnessScore / ingredientsWithScores.length;
      const overallScore = (averageQualityScore + averageFreshnessScore) / 2;

      productsWithIngredients.push({
        ...product.toObject(),
        qualityScore: overallScore,
        ingredients: ingredientsWithScores,
      });
    }

    res.status(200).json(productsWithIngredients);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Error fetching products.' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, price, ingredientBlockchainIds } = req.body;

    const product = await Product.findOne({ blockchainId: productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    let updatedFields = [];
    const previousState = {
      name: product.name,
      price: product.price,
      ingredients: product.ingredients,
    };

    if (name && name !== product.name) {
      product.name = name;
      updatedFields.push('name');
    }

    if (price && price !== product.price) {
      product.price = price;
      updatedFields.push('price');
    }

    if (ingredientBlockchainIds && JSON.stringify(ingredientBlockchainIds) !== JSON.stringify(product.ingredients)) {
      product.ingredients = ingredientBlockchainIds;
      updatedFields.push('ingredients');
    }

    if (updatedFields.length > 0) {
      await product.save();

      const ingredients = await Ingredient.find({ blockchainId: { $in: product.ingredients } });

      let totalQualityScore = 0;
      let totalFreshnessScore = 0;

      for (let ingredient of ingredients) {
        const blockchainData = await productQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);

        totalQualityScore += blockchainData?.qualityScore || 0;
        totalFreshnessScore += calculateFreshnessScore(ingredient.expiryDate);
      }

      const averageQualityScore = totalQualityScore / ingredients.length;
      const averageFreshnessScore = totalFreshnessScore / ingredients.length;
      product.qualityScore = (averageQualityScore + averageFreshnessScore) / 2;

      const blockchainData = {
        blockchainId: product.blockchainId,
        action: 'update',
        name: product.name,
        price: product.price,
        ingredients: product.ingredients,
        qualityScore: product.qualityScore,
        updatedFields,
        previousState,
        timestamp: Date.now(),
      };

      await productQualityBlockchain.updateTransactionHistory(blockchainData);

      res.status(200).json({
        message: 'Product updated successfully',
        product,
        blockchainTransaction: blockchainData,
      });
    } else {
      res.status(200).json({
        message: 'No changes detected for the product.',
      });
    }
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Error updating product.' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOneAndDelete({ blockchainId: productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const blockchainData = {
      blockchainId: product.blockchainId,
      action: 'delete',
      timestamp: Date.now(),
    };

    await productQualityBlockchain.createNewTransaction(blockchainData);
    await productQualityBlockchain.addBlock();

    res.status(200).json({
      message: 'Product deleted successfully from database and blockchain.',
      product,
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Error deleting product.' });
  }
};

export const getProductHistory = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({ blockchainId: productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const productStateHistory = await productQualityBlockchain.getTransactionByBlockchainId(product.blockchainId);

    const ingredients = await Ingredient.find({ blockchainId: { $in: product.ingredients } });
    const ingredientHistories = await Promise.all(ingredients.map(async (ingredient) => {
      const ingredientHistory = await productQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);
      const freshnessScore = calculateFreshnessScore(ingredient.expiryDate);
      const qualityScore = ingredientHistory?.qualityScore || 0;
      return {
        ingredient,
        previousState: ingredientHistory,
        currentState: {
          name: ingredient.name,
          description: ingredient.description,
          origin: ingredient.origin,
          expiryDate: ingredient.expiryDate,
          quantity: ingredient.quantity,
          blockchainId: ingredient.blockchainId,
          createdAt: ingredient.createdAt,
          freshnessScore,
          qualityScore,
        },
      };
    }));

    const totalQualityScore = ingredientHistories.reduce(
      (sum, ingredientHistory) => sum + (ingredientHistory?.currentState?.qualityScore || 0),
      0
    );
    const totalFreshnessScore = ingredientHistories.reduce(
      (sum, ingredientHistory) => sum + (ingredientHistory?.currentState?.freshnessScore || 0),
      0
    );

    const averageQualityScore = totalQualityScore / ingredientHistories.length;
    const averageFreshnessScore = totalFreshnessScore / ingredientHistories.length;
    const productQualityScore = (averageQualityScore + averageFreshnessScore) / 2;

    const currentProductState = {
      name: product.name,
      price: product.price,
      ingredients: product.ingredients,
      blockchainId: product.blockchainId,
      timestamp: Date.now(),
      qualityScore: productQualityScore,
    };

    const updatedFields = [];
    if (productStateHistory.name !== currentProductState.name) updatedFields.push("name");
    if (productStateHistory.price !== currentProductState.price) updatedFields.push("price");
    if (JSON.stringify(productStateHistory.ingredients) !== JSON.stringify(currentProductState.ingredients)) updatedFields.push("ingredients");

    const formattedHistory = {
      message: "Product updated successfully",
      product: currentProductState,
      blockchainTransaction: {
        ...currentProductState,
        action: "update",
        qualityScore: productQualityScore,
        updatedFields,
        previousState: {
          name: productStateHistory.name,
          price: productStateHistory.price,
          ingredients: productStateHistory.ingredients,
        },
        timestamp: Date.now(),
      },
      ingredientHistories: ingredientHistories.filter(history => history !== null),
    };

    res.status(200).json(formattedHistory);
  } catch (err) {
    console.error('Error fetching product history:', err);
    res.status(500).json({ message: 'Error fetching product history.' });
  }
};