import { Router } from 'express';
import userController from '../controllers/userController.js';  

const { registerUser, authenticateUser } = userController;  

const router = Router();

router.post('/register', registerUser);  
router.post('/login', authenticateUser);  

export default router;
