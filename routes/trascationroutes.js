import { Router } from 'express';
import { getBlockchainData} from '../controllers/transcationController.js';

const router = Router();
router.get('/blockchain', getBlockchainData);

export default router;
