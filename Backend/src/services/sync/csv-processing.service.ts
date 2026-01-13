import fs from 'fs';
import csv from 'csv-parser';
import { prisma } from '../../lib/prisma';

// Unstop CSV format
export interface UnstopCSVRow {
  'Team ID': string;
  'Team Name': string;
  'Candidate role': string; // 'Team Leader' or 'Team Member'
  "Candidate's Name": string;
  "Candidate's Email": string;
  "Candidate's Mobile": string;
  "Candidate's Gender"?: string;
  "Candidate's Location"?: string;
  'User type'?: string;
  'Domain'?: string;
  'Course'?: string;
  'Specialization'?: string;
  'Course Type'?: string;
  'Course Duration'?: string;
  'Class/Grade'?: string;
  'Year of Graduation'?: string;
  "Candidate's Organisation": string;
  'Registration Time'?: string;
  'Differently Abled'?: string;
  'Work Experience'?: string;
  'Reg. Status': string; // 'Complete' or 'Incomplete'
  'Ref Code'?: string;
  'Resume'?: string;
}

export interface NormalizedTeam {
  unstopTeamId: string;
  teamName: string;
  collegeName: string;
  teamSize: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  leader: {
    fullName: string;
    email: string;
    phone: string;
    degree?: string;
    yearOfStudy?: number;
  };
  members: Array<{
    fullName: string;
    email: string;
    phone: string;
    degree?: string;
    yearOfStudy?: number;
    isLeader: boolean;
  }>;
}

export interface SkippedRow {
  rowNumber: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  reason: string;
}

export interface NormalizeResult {
  teams: NormalizedTeam[];
  skippedRows: SkippedRow[];
}

export class CSVProcessingService {
  /**
   * Parse CSV file and extract team data
   */
  async parseCSV(filePath: string): Promise<UnstopCSVRow[]> {
    return new Promise((resolve, reject) => {
      const results: UnstopCSVRow[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Normalize Unstop CSV data into team structure
   * Groups members by team and extracts leader
   */
  normalizeTeamData(rows: UnstopCSVRow[]): NormalizeResult {
    const teamsMap = new Map<string, NormalizedTeam>();
    const skippedRows: SkippedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      const teamId = row['Team ID'];
      const teamName = row['Team Name'];
      
      // Skip rows without team name (Team ID is always present per user)
      if (!teamName || teamName.trim() === '') {
        console.warn('⚠️ Skipping row without Team Name');
        skippedRows.push({
          rowNumber: i + 2, // +2 because of 0-index and header row
          candidateName: row["Candidate's Name"]?.trim() || 'Unknown',
          candidateEmail: row["Candidate's Email"]?.trim() || 'N/A',
          candidatePhone: row["Candidate's Mobile"]?.trim() || 'N/A',
          reason: 'Missing Team Name',
        });
        continue;
      }

      // Also skip if Team ID is somehow missing
      if (!teamId || teamId.trim() === '') {
        console.warn('⚠️ Skipping row without Team ID');
        skippedRows.push({
          rowNumber: i + 2,
          candidateName: row["Candidate's Name"]?.trim() || 'Unknown',
          candidateEmail: row["Candidate's Email"]?.trim() || 'N/A',
          candidatePhone: row["Candidate's Mobile"]?.trim() || 'N/A',
          reason: 'Missing Team ID',
        });
        continue;
      }

      const isLeader = row['Candidate role']?.toLowerCase() === 'team leader';
      const isComplete = row['Reg. Status']?.toLowerCase() === 'complete';
      const verificationStatus = isComplete ? 'VERIFIED' : 'PENDING';

      const member = {
        fullName: row["Candidate's Name"]?.trim() || 'Unknown',
        email: row["Candidate's Email"]?.trim().toLowerCase() || '',
        phone: this.normalizePhone(row["Candidate's Mobile"] || ''),
        degree: row['Course']?.trim(),
        yearOfStudy: row['Year of Graduation'] ? parseInt(row['Year of Graduation']) : undefined,
        isLeader,
      };

      if (!teamsMap.has(teamId)) {
        teamsMap.set(teamId, {
          unstopTeamId: teamId,
          teamName: teamName.trim(),
          collegeName: row["Candidate's Organisation"]?.trim() || 'Unknown College',
          teamSize: 0,
          verificationStatus: verificationStatus as 'PENDING' | 'VERIFIED' | 'REJECTED',
          leader: isLeader ? { ...member } : ({} as any),
          members: [],
        });
      }

      const team = teamsMap.get(teamId)!;
      team.members.push(member);
      team.teamSize = team.members.length;

      if (isLeader) {
        team.leader = {
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          degree: member.degree,
          yearOfStudy: member.yearOfStudy,
        };
      }
    }

    return {
      teams: Array.from(teamsMap.values()),
      skippedRows,
    };
  }

  /**
   * Import teams into database
   * If replaceAll is true, removes teams not in the current CSV
   */
  async importTeams(teams: NormalizedTeam[], syncJobId: string, replaceAll: boolean = true): Promise<{
    newTeams: number;
    updatedTeams: number;
    removedTeams: number;
    errors: string[];
  }> {
    let newTeams = 0;
    let updatedTeams = 0;
    let removedTeams = 0;
    const errors: string[] = [];

    // Get all team IDs from the CSV
    const csvTeamIds = new Set(teams.map(t => t.unstopTeamId));

    // If replaceAll, delete teams not in the current CSV
    if (replaceAll) {
      const existingTeams = await prisma.team.findMany({
        select: { id: true, unstopTeamId: true, teamName: true },
      });

      for (const existingTeam of existingTeams) {
        if (!csvTeamIds.has(existingTeam.unstopTeamId)) {
          try {
            // Delete related call logs first
            await prisma.callLog.deleteMany({
              where: { teamId: existingTeam.id },
            });
            
            // Delete the team (members will be cascade deleted)
            await prisma.team.delete({
              where: { id: existingTeam.id },
            });
            removedTeams++;
            console.log(`🗑️ Removed team not in CSV: ${existingTeam.teamName}`);
          } catch (error) {
            errors.push(`Failed to remove team ${existingTeam.teamName}: ${error}`);
          }
        }
      }
    }

    for (const teamData of teams) {
      try {
        // Check if team already exists
        const existingTeam = await prisma.team.findUnique({
          where: { unstopTeamId: teamData.unstopTeamId },
          include: { members: true },
        });

        if (existingTeam) {
          // Update existing team
          await prisma.team.update({
            where: { id: existingTeam.id },
            data: {
              teamName: teamData.teamName,
              collegeName: teamData.collegeName,
              teamSize: teamData.teamSize,
              verificationStatus: teamData.verificationStatus,
              lastSyncAt: new Date(),
            },
          });

          // Delete old members and create new ones
          await prisma.teamMember.deleteMany({
            where: { teamId: existingTeam.id },
          });

          await prisma.teamMember.createMany({
            data: teamData.members.map((member) => ({
              teamId: existingTeam.id,
              fullName: member.fullName,
              email: member.email,
              phone: member.phone,
              collegeName: teamData.collegeName,
              degree: member.degree,
              yearOfStudy: member.yearOfStudy,
              isLeader: member.isLeader,
            })),
          });

          updatedTeams++;
        } else {
          // Create new team
          await prisma.team.create({
            data: {
              unstopTeamId: teamData.unstopTeamId,
              teamName: teamData.teamName,
              collegeName: teamData.collegeName,
              teamSize: teamData.teamSize,
              verificationStatus: teamData.verificationStatus,
              lastSyncAt: new Date(),
              members: {
                create: teamData.members.map((member) => ({
                  fullName: member.fullName,
                  email: member.email,
                  phone: member.phone,
                  collegeName: teamData.collegeName,
                  degree: member.degree,
                  yearOfStudy: member.yearOfStudy,
                  isLeader: member.isLeader,
                })),
              },
            },
          });

          newTeams++;
        }
      } catch (error) {
        const errorMsg = `Failed to process team ${teamData.teamName}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Update sync job
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        newRecords: newTeams,
        updatedRecords: updatedTeams,
        failedRecords: errors.length,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { newTeams, updatedTeams, removedTeams, errors };
  }

  /**
   * Helper: Normalize phone number
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with country code, keep it; otherwise add +91 for India
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return '+' + cleaned;
  }
}

export default new CSVProcessingService();
