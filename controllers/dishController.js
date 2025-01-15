import Dish from '../models/Dish.js';
import Ingredient from '../models/Ingredient.js';
import Blockchain from '../blockchain/blockchain.js';
import crypto from 'crypto';

const foodQualityBlockchain = new Blockchain();

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

export const addDish = async (req, res) => {
  try {
    const { name, price, ingredientBlockchainIds } = req.body;

    if (!name || !price || !ingredientBlockchainIds || ingredientBlockchainIds.length === 0) {
      return res.status(400).json({ message: 'Invalid dish data.' });
    }
    const ingredients = await Ingredient.find({ blockchainId: { $in: ingredientBlockchainIds } });
    if (ingredients.length !== ingredientBlockchainIds.length) {
      return res.status(404).json({ message: 'Some ingredients not found.' });
    }

    let totalQualityScore = 0;
    let totalFreshnessScore = 0;
    for (let ingredient of ingredients) {
      const blockchainData = await foodQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);
      const qualityScore = blockchainData?.qualityScore || 0;
      totalQualityScore += qualityScore;
      const freshnessScore = calculateFreshnessScore(ingredient.expiryDate);
      totalFreshnessScore += freshnessScore;
    }
    const averageQualityScore = totalQualityScore / ingredients.length;
    const averageFreshnessScore = totalFreshnessScore / ingredients.length;
    const overallScore = (averageQualityScore + averageFreshnessScore) / 2;

    const newDish = new Dish({
      name,
      price,
      qualityScore: overallScore,
      ingredients: ingredientBlockchainIds,
      blockchainId: crypto.randomBytes(16).toString('hex'),
    });

    await newDish.save();

    const transaction = {
      name: newDish.name,
      price: newDish.price,
      ingredients: newDish.ingredients,
      qualityScore: newDish.qualityScore,
      blockchainId: newDish.blockchainId,  
      timestamp: Date.now(),
    };

    await foodQualityBlockchain.createNewTransaction(transaction);
    await foodQualityBlockchain.addBlock();

    res.status(201).json({ message: 'Dish added successfully and recorded on the blockchain!',
       dish: newDish,
       blockchainTransaction: transaction,
       });
  } catch (err) {
    console.error('Error adding dish:', err);
    res.status(500).json({ message: 'Error adding dish.' });
  }
};

export const getDishes = async (req, res) => {
  try {
    const dishes = await Dish.find();
    const dishesWithIngredients = [];

    for (let dish of dishes) {
      const ingredients = await Ingredient.find({ blockchainId: { $in: dish.ingredients } });
      const ingredientsWithScores = await Promise.all(
        ingredients.map(async (ingredient) => {
          const blockchainData = await foodQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);

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

      dishesWithIngredients.push({
        ...dish.toObject(),
        qualityScore: overallScore,
        ingredients: ingredientsWithScores,
      });
    }

    res.status(200).json(dishesWithIngredients);
  } catch (err) {     
    console.error('Error fetching dishes:', err);     
    res.status(500).json({ message: 'Error fetching dishes.' });   
}
};

export const updateDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { name, price, ingredientBlockchainIds } = req.body;

    const dish = await Dish.findOne({ blockchainId: dishId });
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found.' });
    }

    let updatedFields = [];
    const previousState = {
      name: dish.name,
      price: dish.price,
      ingredients: dish.ingredients,
    };

    if (name && name !== dish.name) {
      dish.name = name;
      updatedFields.push('name');
    }

    if (price && price !== dish.price) {
      dish.price = price;
      updatedFields.push('price');
    }

    if (ingredientBlockchainIds && JSON.stringify(ingredientBlockchainIds) !== JSON.stringify(dish.ingredients)) {
      dish.ingredients = ingredientBlockchainIds;
      updatedFields.push('ingredients');
    }

    if (updatedFields.length > 0) {
      await dish.save();

      const ingredients = await Ingredient.find({ blockchainId: { $in: dish.ingredients } });

      let totalQualityScore = 0;
      let totalFreshnessScore = 0;

      for (let ingredient of ingredients) {
        const blockchainData = await foodQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);

        totalQualityScore += blockchainData?.qualityScore || 0;
        totalFreshnessScore += calculateFreshnessScore(ingredient.expiryDate);
      }

      const averageQualityScore = totalQualityScore / ingredients.length;
      const averageFreshnessScore = totalFreshnessScore / ingredients.length;
      dish.qualityScore = (averageQualityScore + averageFreshnessScore) / 2;

      const blockchainData = {
        blockchainId: dish.blockchainId,
        action: 'update',
        name: dish.name,
        price: dish.price,
        ingredients: dish.ingredients,
        qualityScore: dish.qualityScore,
        updatedFields,
        previousState,
        timestamp: Date.now(),
      };

      await foodQualityBlockchain.updateTransactionHistory(blockchainData);

      res.status(200).json({
        message: 'Dish updated successfully',
        dish,
        blockchainTransaction: blockchainData,
      });
    } else {
      res.status(200).json({
        message: 'No changes detected for the dish.',
      });
    }
  } catch (err) {
    console.error('Error updating dish:', err);
    res.status(500).json({ message: 'Error updating dish.' });
  }
};

export const deleteDish = async (req, res) => {
  try {
    const { dishId } = req.params;

    const dish = await Dish.findOneAndDelete({ blockchainId: dishId });
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found.' });
    }

    const blockchainData = {
      blockchainId: dish.blockchainId,
      action: 'delete',
      timestamp: Date.now(),
    };

    await foodQualityBlockchain.createNewTransaction(blockchainData);
    await foodQualityBlockchain.addBlock();

    res.status(200).json({
      message: 'Dish deleted successfully from database and blockchain.',
      dish,
    });
  } catch (err) {
    console.error('Error deleting dish:', err);
    res.status(500).json({ message: 'Error deleting dish.' });
  }
};

export const getDishHistory = async (req, res) => {
  try {
    const { dishId } = req.params;

    const dish = await Dish.findOne({ blockchainId: dishId });
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found.' });
    }

    const dishStateHistory = await foodQualityBlockchain.getTransactionByBlockchainId(dish.blockchainId);

    const ingredients = await Ingredient.find({ blockchainId: { $in: dish.ingredients } });
    const ingredientHistories = await Promise.all(ingredients.map(async (ingredient) => {
      const ingredientHistory = await foodQualityBlockchain.getTransactionByBlockchainId(ingredient.blockchainId);
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
    const dishQualityScore = (averageQualityScore + averageFreshnessScore) / 2;

    const currentDishState = {
      name: dish.name,
      price: dish.price,
      ingredients: dish.ingredients,
      blockchainId: dish.blockchainId,
      timestamp: Date.now(),
      qualityScore: dishQualityScore, 
    };

    const updatedFields = [];
    if (dishStateHistory.name !== currentDishState.name) updatedFields.push("name");
    if (dishStateHistory.price !== currentDishState.price) updatedFields.push("price");
    if (JSON.stringify(dishStateHistory.ingredients) !== JSON.stringify(currentDishState.ingredients)) updatedFields.push("ingredients");

    const formattedHistory = {
      message: "Dish updated successfully",
      dish: currentDishState,
      blockchainTransaction: {
        ...currentDishState,
        action: "update",
        qualityScore: dishQualityScore,
        updatedFields,
        previousState: {
          name: dishStateHistory.name,
          price: dishStateHistory.price,
          ingredients: dishStateHistory.ingredients,
        },
        timestamp: Date.now(),
      },
      ingredientHistories: ingredientHistories.filter(history => history !== null),
    };

    res.status(200).json(formattedHistory);
  } catch (err) {
    console.error('Error fetching dish history:', err);
    res.status(500).json({ message: 'Error fetching dish history.' });
  }
};