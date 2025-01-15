import { Router } from 'express';
import { addIngredient,  getIngredients , getIngredientDetails,updateIngredient,deleteIngredient,submitRating, getAverageRating} from '../controllers/ingredientController.js';

const router = Router();

router.post('/add', addIngredient);
router.get('/', getIngredients);
router.get('/getIngredientDetails/:ingredientId', getIngredientDetails);
router.put('/update/:ingredientId', updateIngredient);
router.delete('/delete/:ingredientId', deleteIngredient); 
router.post('/rate/:dishId', submitRating);
router.get('/averageRating/:dishId', getAverageRating);

export default router;



