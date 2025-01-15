import { Router } from 'express';
import { getBlockchainData, getTransactionById } from '../controllers/transactionController.js';

const router = Router();
router.get('/blockchain', getBlockchainData); //Used in meal
router.get('/blockchain/:blockchainId', getTransactionById);

export default router;