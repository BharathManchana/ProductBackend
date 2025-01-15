import { Router } from 'express';
import { getProducts, addProduct, updateProduct, deleteProduct, getProductHistory } from '../controllers/productController.js';
import { upload } from '../Multer/multer.js'; 

const router = Router();

router.get('/', getProducts);
router.post('/add', upload.single('image'), addProduct);
router.put('/update/:productId', upload.single('image'), updateProduct); 
router.delete('/delete/:productId', deleteProduct);
router.get('/productHistory/:productId', getProductHistory);

export default router;