import { Router } from 'express';
import { getProducts, addProduct, updateProduct, deleteProduct, getProductHistory } from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.post('/add', addProduct);
router.put('/update/:productId', updateProduct);
router.delete('/delete/:productId', deleteProduct);
router.get('/productHistory/:productId', getProductHistory);

export default router;