import { prisma } from '../lib/prisma';
import { Team, TeamMember, CallLog, CallStatus } from '../../generated/prisma/client';

export interface CallLogEntry {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
  callStatus: string;
  calledBy: string | null;
  lockedBy: string | null;
  lockedAt: Date | null;
  notes: string | null;
  lastCalledAt: Date | null;
}

// Lock timeout in minutes (if someone locks a team but doesn't update, release after this time)
const LOCK_TIMEOUT_MINUTES = 5;

type TeamWithMembers = Team & { members: TeamMember[] };

export class CallLogService {
  /**
   * Get all unverified teams with their call status
   */
  async getUnverifiedTeamsWithCallStatus(): Promise<CallLogEntry[]> {
    // First, release any stale locks
    await this.releaseStallLocks();

    const teams: TeamWithMembers[] = await prisma.team.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      include: {
        members: {
          where: { isLeader: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get call logs for these teams
    const teamIds = teams.map((t: TeamWithMembers) => t.id);
    const callLogs: CallLog[] = await prisma.callLog.findMany({
      where: {
        teamId: { in: teamIds },
      },
    });

    const callLogMap = new Map<string, CallLog>(callLogs.map((log: CallLog) => [log.teamId, log]));

    return teams.map((team: TeamWithMembers) => {
      const leader = team.members[0];
      const callLog = callLogMap.get(team.id);

      return {
        teamId: team.id,
        teamName: team.teamName,
        leaderName: leader?.fullName || 'Unknown',
        leaderPhone: leader?.phone || 'N/A',
        leaderEmail: leader?.email || 'N/A',
        callStatus: callLog?.callStatus || 'NOT_CALLED',
        calledBy: callLog?.calledBy || null,
        lockedBy: callLog?.lockedBy || null,
        lockedAt: callLog?.lockedAt || null,
        notes: callLog?.notes || null,
        lastCalledAt: callLog?.lastCalledAt || null,
      };
    });
  }

  /**
   * Lock a team for calling (prevents others from calling same team)
   */
  async lockTeamForCalling(teamId: string, callerName: string): Promise<{ success: boolean; message: string; callLog?: CallLog }> {
    // Check if already locked by someone else
    const existingLog = await prisma.callLog.findUnique({
      where: { teamId },
    });

    if (existingLog?.lockedBy && existingLog.lockedBy !== callerName) {
      // Check if lock is stale
      if (existingLog.lockedAt) {
        const lockAge = (Date.now() - existingLog.lockedAt.getTime()) / 1000 / 60;
        if (lockAge < LOCK_TIMEOUT_MINUTES) {
          return {
            success: false,
            message: `Team is currently being called by ${existingLog.lockedBy}`,
          };
        }
      }
    }

    // Create or update call log with lock
    const callLog = await prisma.callLog.upsert({
      where: { teamId },
      create: {
        teamId,
        callStatus: 'BEING_CALLED',
        lockedBy: callerName,
        lockedAt: new Date(),
      },
      update: {
        callStatus: 'BEING_CALLED',
        lockedBy: callerName,
        lockedAt: new Date(),
      },
    });

    return { success: true, message: 'Team locked for calling', callLog };
  }

  /**
   * Update call status after call is complete
   */
  async updateCallStatus(
    teamId: string,
    status: 'CALLED_WILL_VERIFY' | 'CALLED_NOT_PICKED' | 'CALLED_REJECTED',
    callerName: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; callLog?: CallLog }> {
    const callLog = await prisma.callLog.upsert({
      where: { teamId },
      create: {
        teamId,
        callStatus: status,
        calledBy: callerName,
        notes: notes || null,
        lastCalledAt: new Date(),
        lockedBy: null,
        lockedAt: null,
      },
      update: {
        callStatus: status,
        calledBy: callerName,
        notes: notes || null,
        lastCalledAt: new Date(),
        lockedBy: null,
        lockedAt: null,
      },
    });

    return { success: true, message: 'Call status updated', callLog };
  }

  /**
   * Release lock without updating status (cancel call)
   */
  async releaseLock(teamId: string, callerName: string): Promise<{ success: boolean; message: string }> {
    const existingLog = await prisma.callLog.findUnique({
      where: { teamId },
    });

    if (existingLog?.lockedBy !== callerName) {
      return { success: false, message: 'You do not have the lock on this team' };
    }

    await prisma.callLog.update({
      where: { teamId },
      data: {
        callStatus: existingLog.calledBy ? existingLog.callStatus : 'NOT_CALLED',
        lockedBy: null,
        lockedAt: null,
      },
    });

    return { success: true, message: 'Lock released' };
  }

  /**
   * Release stale locks (called periodically)
   */
  async releaseStallLocks(): Promise<number> {
    const staleTime = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
    
    const result = await prisma.callLog.updateMany({
      where: {
        lockedAt: { lt: staleTime },
        lockedBy: { not: null },
      },
      data: {
        lockedBy: null,
        lockedAt: null,
        callStatus: 'NOT_CALLED', // Reset to not called if lock was stale
      },
    });

    return result.count;
  }

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<{
    total: number;
    notCalled: number;
    willVerify: number;
    notPicked: number;
    rejected: number;
    beingCalled: number;
  }> {
    const stats = await prisma.callLog.groupBy({
      by: ['callStatus'],
      _count: true,
    });

    const statMap = new Map<string, number>(stats.map((s: { callStatus: CallStatus; _count: number }) => [s.callStatus, s._count]));

    // Get total unverified teams
    const totalUnverified = await prisma.team.count({
      where: { verificationStatus: 'PENDING' },
    });

    const calledCount = 
      (statMap.get('CALLED_WILL_VERIFY') || 0) +
      (statMap.get('CALLED_NOT_PICKED') || 0) +
      (statMap.get('CALLED_REJECTED') || 0);

    return {
      total: totalUnverified,
      notCalled: totalUnverified - calledCount - (statMap.get('BEING_CALLED') || 0),
      willVerify: statMap.get('CALLED_WILL_VERIFY') || 0,
      notPicked: statMap.get('CALLED_NOT_PICKED') || 0,
      rejected: statMap.get('CALLED_REJECTED') || 0,
      beingCalled: statMap.get('BEING_CALLED') || 0,
    };
  }
}

export default new CallLogService();
