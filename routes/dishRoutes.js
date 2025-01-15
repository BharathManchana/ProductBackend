import { Router } from 'express';
import { getDishes,addDish,updateDish,deleteDish,getDishHistory } from '../controllers/dishController.js';

const router = Router();

router.get('/', getDishes);
router.post('/add', addDish);
router.put('/update/:dishId', updateDish); 
router.delete('/delete/:dishId', deleteDish);
router.get('/dishHistory/:dishId', getDishHistory);


export default router;
