import { Request, Response } from 'express';
import callLogService from '../services/call-log.service';

export class CallLogController {
  /**
   * Get all unverified teams with call status
   */
  async getTeamsWithCallStatus(_req: Request, res: Response): Promise<void> {
    try {
      const teams = await callLogService.getUnverifiedTeamsWithCallStatus();
      res.json({
        success: true,
        count: teams.length,
        teams,
      });
    } catch (error) {
      console.error('Error getting teams with call status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get teams with call status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Lock a team for calling
   */
  async lockTeam(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { callerName } = req.body;

      if (!teamId || !callerName) {
        res.status(400).json({
          success: false,
          message: 'teamId and callerName are required',
        });
        return;
      }

      const result = await callLogService.lockTeamForCalling(teamId as string, callerName as string);
      
      if (!result.success) {
        res.status(409).json(result); // Conflict - someone else has the lock
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Error locking team:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to lock team',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update call status after calling
   */
  async updateCallStatus(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { status, callerName, notes } = req.body;

      if (!teamId || !callerName) {
        res.status(400).json({
          success: false,
          message: 'teamId and callerName are required',
        });
        return;
      }

      if (!['CALLED_WILL_VERIFY', 'CALLED_NOT_PICKED', 'CALLED_REJECTED'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: CALLED_WILL_VERIFY, CALLED_NOT_PICKED, or CALLED_REJECTED',
        });
        return;
      }

      const result = await callLogService.updateCallStatus(teamId as string, status, callerName as string, notes);
      res.json(result);
    } catch (error) {
      console.error('Error updating call status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update call status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Release lock on a team
   */
  async releaseLock(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { callerName } = req.body;

      if (!teamId || !callerName) {
        res.status(400).json({
          success: false,
          message: 'teamId and callerName are required',
        });
        return;
      }

      const result = await callLogService.releaseLock(teamId as string, callerName as string);
      res.json(result);
    } catch (error) {
      console.error('Error releasing lock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release lock',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await callLogService.getCallStats();
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Error getting call stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get call stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new CallLogController();
