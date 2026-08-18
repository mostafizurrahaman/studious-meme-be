import express from 'express';
import { testControllers } from './test.controller';

const router = express();

router.post('/', testControllers.sendTestEmail);

export const testRoutes = router;
