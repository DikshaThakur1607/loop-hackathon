import { Router } from 'express';
import callLogController from '../controllers/call-log.controller';

const router: Router = Router();

// Get all unverified teams with their call status
router.get('/teams', callLogController.getTeamsWithCallStatus);

// Get call statistics
router.get('/stats', callLogController.getCallStats);

// Lock a team for calling
router.post('/teams/:teamId/lock', callLogController.lockTeam);

// Update call status after calling
router.post('/teams/:teamId/status', callLogController.updateCallStatus);

// Release lock on a team
router.post('/teams/:teamId/release', callLogController.releaseLock);

export default router;
