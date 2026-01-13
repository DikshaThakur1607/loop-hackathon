import { prisma } from '../lib/prisma';

export interface TeamFilter {
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submissionStatus?: string;
}

export interface LeaderContact {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  verificationStatus: string;
}

export interface AllTeamContacts {
  teamId: string;
  teamName: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  isLeader: boolean;
}

export class TeamService {
  /**
   * Get teams by verification status
   */
  async getTeamsByStatus(filter: TeamFilter) {
    return await prisma.team.findMany({
      where: {
        verificationStatus: filter.verificationStatus,
      },
      include: {
        members: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get verified teams with leader details only
   */
  async getVerifiedTeamsWithLeaders() {
    const teams = await prisma.team.findMany({
      where: {
        verificationStatus: 'VERIFIED',
      },
      include: {
        members: {
          where: {
            isLeader: true,
          },
        },
      },
      orderBy: {
        teamName: 'asc',
      },
    });

    return teams.map((team) => ({
      teamId: team.id,
      unstopTeamId: team.unstopTeamId,
      teamName: team.teamName,
      collegeName: team.collegeName,
      teamSize: team.teamSize,
      leader: team.members[0] || null,
      verifiedAt: team.verifiedAt,
    }));
  }

  /**
   * Get unverified teams with leader contacts
   */
  async getUnverifiedLeaderContacts(): Promise<LeaderContact[]> {
    const teams = await prisma.team.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      include: {
        members: {
          where: {
            isLeader: true,
          },
        },
      },
    });

    return teams
      .filter((team) => team.members.length > 0)
      .map((team) => ({
        teamId: team.id,
        teamName: team.teamName,
        leaderName: team.members[0]!.fullName,
        leaderEmail: team.members[0]!.email,
        leaderPhone: team.members[0]!.phone,
        verificationStatus: team.verificationStatus,
      }));
  }

  /**
   * Get all contacts (leaders + members) for unverified teams
   */
  async getUnverifiedAllContacts(): Promise<AllTeamContacts[]> {
    const teams = await prisma.team.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      include: {
        members: true,
      },
    });

    const contacts: AllTeamContacts[] = [];

    for (const team of teams) {
      for (const member of team.members) {
        contacts.push({
          teamId: team.id,
          teamName: team.teamName,
          memberName: member.fullName,
          memberEmail: member.email,
          memberPhone: member.phone,
          isLeader: member.isLeader,
        });
      }
    }

    return contacts;
  }

  /**
   * Get all phone numbers from unverified teams (for calling feature)
   */
  async getUnverifiedPhoneNumbers(): Promise<string[]> {
    const contacts = await this.getUnverifiedLeaderContacts();
    return contacts.map((contact) => contact.leaderPhone);
  }

  /**
   * Export teams to CSV format
   */
  async exportTeamsToCSV(filter: TeamFilter): Promise<string> {
    const teams = await this.getTeamsByStatus(filter);

    const headers = [
      'Team ID',
      'Team Name',
      'College',
      'Team Size',
      'Verification Status',
      'Leader Name',
      'Leader Email',
      'Leader Phone',
    ];

    const rows = teams.map((team) => {
      const leader = team.members.find((m) => m.isLeader);
      return [
        team.unstopTeamId,
        team.teamName,
        team.collegeName,
        team.teamSize,
        team.verificationStatus,
        leader?.fullName || 'N/A',
        leader?.email || 'N/A',
        leader?.phone || 'N/A',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Manually verify a team
   */
  async verifyTeam(teamId: string) {
    return await prisma.team.update({
      where: { id: teamId },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Get team statistics
   */
  async getTeamStats() {
    const [total, verified, pending, rejected] = await Promise.all([
      prisma.team.count(),
      prisma.team.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.team.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.team.count({ where: { verificationStatus: 'REJECTED' } }),
    ]);

    return {
      total,
      verified,
      pending,
      rejected,
    };
  }
}

export default new TeamService();
