import { Router } from 'express';
import { addProductComponent, getProductComponents, getProductComponentDetails, updateProductComponent, deleteProductComponent, submitRating, getAverageRating } from '../controllers/productComponentController.js';

const router = Router();

router.post('/add', addProductComponent);
router.get('/', getProductComponents);
router.get('/getProductComponentDetails/:productComponentId', getProductComponentDetails);
router.put('/update/:productComponentId', updateProductComponent);
router.delete('/delete/:productComponentId', deleteProductComponent);
router.post('/rate/:productId', submitRating);
router.get('/averageRating/:productId', getAverageRating);

export default router;