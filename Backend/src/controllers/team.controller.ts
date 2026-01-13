import { Request, Response } from 'express';
import csvProcessingService from '../services/sync/csv-processing.service';
import teamService from '../services/team.service';
import communicationService from '../services/communication/email.service';
import { prisma } from '../lib/prisma';
import fs from 'fs';

export class TeamController {
  /**
   * Upload and process CSV file
   */
  async uploadCSV(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }

      // Create sync job
      const syncJob = await prisma.syncJob.create({
        data: {
          jobType: 'registration_sync',
          status: 'RUNNING',
        },
      });

      console.log(`🔄 Starting CSV import (Job ID: ${syncJob.id})...`);

      // Parse CSV
      const rows = await csvProcessingService.parseCSV(req.file.path);
      console.log(`📄 Parsed ${rows.length} rows from CSV`);

      // Normalize data
      const { teams, skippedRows } = csvProcessingService.normalizeTeamData(rows);
      console.log(`👥 Normalized ${teams.length} teams`);
      console.log(`⚠️ Skipped ${skippedRows.length} rows without Team ID/Name`);

      // Import into database (replaceAll=true removes teams not in CSV)
      const result = await csvProcessingService.importTeams(teams, syncJob.id, true);

      // Delete uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'CSV processed successfully',
        jobId: syncJob.id,
        stats: {
          totalTeams: teams.length,
          newTeams: result.newTeams,
          updatedTeams: result.updatedTeams,
          removedTeams: result.removedTeams,
          skippedRows: skippedRows.length,
          errors: result.errors.length,
        },
        skippedRows,
        errors: result.errors,
      });
    } catch (error) {
      console.error('❌ CSV upload failed:', error);
      res.status(500).json({
        error: 'Failed to process CSV',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get verified teams list
   */
  async getVerifiedTeams(_req: Request, res: Response): Promise<void> {
    try {
      const teams = await teamService.getVerifiedTeamsWithLeaders();
      res.json({
        success: true,
        count: teams.length,
        teams,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch verified teams',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get unverified teams list
   */
  async getUnverifiedTeams(_req: Request, res: Response): Promise<void> {
    try {
      const leaders = await teamService.getUnverifiedLeaderContacts();
      res.json({
        success: true,
        count: leaders.length,
        teams: leaders,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch unverified teams',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get unverified team phone numbers for calling
   */
  async getUnverifiedPhoneNumbers(_req: Request, res: Response): Promise<void> {
    try {
      const phoneNumbers = await teamService.getUnverifiedPhoneNumbers();
      
      res.json({
        success: true,
        count: phoneNumbers.length,
        phoneNumbers,
        callFeature: {
          description: 'Copy phone numbers to your calling app',
          format: 'tel:' + phoneNumbers[0],
          bulkCallLink: `tel:${phoneNumbers.join(',')}`, // May not work on all platforms
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch phone numbers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all unverified contacts (leaders + members)
   */
  async getUnverifiedAllContacts(_req: Request, res: Response): Promise<void> {
    try {
      const contacts = await teamService.getUnverifiedAllContacts();
      
      res.json({
        success: true,
        count: contacts.length,
        contacts,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch contacts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send bulk verification reminder emails
   */
  async sendVerificationReminders(_req: Request, res: Response): Promise<void> {
    try {
      console.log('📧 Starting bulk verification reminders...');
      
      const result = await communicationService.sendVerificationReminderBulk();
      
      res.json({
        success: true,
        message: 'Verification reminders sent',
        stats: {
          sent: result.sent,
          failed: result.failed,
          total: result.sent + result.failed,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to send verification reminders',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Export teams to CSV
   */
  async exportTeams(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      
      const csvData = await teamService.exportTeamsToCSV({
        verificationStatus: status as 'PENDING' | 'VERIFIED' | 'REJECTED' | undefined,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="teams_${status || 'all'}_${Date.now()}.csv"`
      );
      res.send(csvData);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to export teams',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await teamService.getTeamStats();
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Manually verify a team
   */
  async verifyTeam(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      
      if (!teamId || typeof teamId !== 'string') {
        res.status(400).json({ error: 'Valid team ID is required' });
        return;
      }
      
      const team = await teamService.verifyTeam(teamId);
      
      res.json({
        success: true,
        message: 'Team verified successfully',
        team,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to verify team',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get email templates
   */
  async getEmailTemplates(_req: Request, res: Response): Promise<void> {
    try {
      const templates = communicationService.getEmailTemplates();
      res.json({
        success: true,
        templates,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch email templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send custom bulk email
   */
  async sendCustomEmail(req: Request, res: Response): Promise<void> {
    try {
      const { subject, htmlContent, targetGroup } = req.body;

      if (!subject || !htmlContent) {
        res.status(400).json({ error: 'Subject and HTML content are required' });
        return;
      }

      // Get recipients based on target group
      let recipients: Array<{
        email: string;
        name: string;
        teamId: string;
        memberId: string;
        teamName: string;
      }> = [];

      if (targetGroup === 'unverified_all') {
        // Get all unverified team members (leader + members)
        const teams = await prisma.team.findMany({
          where: { verificationStatus: 'PENDING' },
          include: { members: true },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      } else if (targetGroup === 'unverified_leader') {
        // Get only unverified team leaders
        const teams = await prisma.team.findMany({
          where: { verificationStatus: 'PENDING' },
          include: { 
            members: {
              where: { isLeader: true }
            } 
          },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      } else if (targetGroup === 'verified_all') {
        // Get all verified team members (leader + members)
        const teams = await prisma.team.findMany({
          where: { verificationStatus: 'VERIFIED' },
          include: { members: true },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      } else if (targetGroup === 'verified_leader') {
        // Get only verified team leaders
        const teams = await prisma.team.findMany({
          where: { verificationStatus: 'VERIFIED' },
          include: { 
            members: {
              where: { isLeader: true }
            } 
          },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      } else if (targetGroup === 'unverified') {
        // Legacy: Get all unverified team members
        const teams = await prisma.team.findMany({
          where: { verificationStatus: 'PENDING' },
          include: { members: true },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      } else if (targetGroup === 'verified') {
        // Legacy: Get all verified team members
        const teams = await prisma.team.findMany({
          where: { verificationStatus: 'VERIFIED' },
          include: { members: true },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      } else {
        // Get all team members
        const teams = await prisma.team.findMany({
          include: { members: true },
        });
        recipients = teams.flatMap((team) =>
          team.members.map((member) => ({
            email: member.email,
            name: member.fullName,
            teamId: team.id,
            memberId: member.id,
            teamName: team.teamName,
          }))
        );
      }

      if (recipients.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No recipients found for the selected target group',
        });
        return;
      }

      console.log(`📧 Sending custom email to ${recipients.length} recipients...`);

      const result = await communicationService.sendCustomBulkEmails({
        recipients,
        subject,
        htmlContent,
        templateName: 'custom',
      });

      res.json({
        success: true,
        message: 'Custom emails sent',
        stats: {
          sent: result.sent,
          failed: result.failed,
          total: recipients.length,
        },
        errors: result.errors.slice(0, 10), // Return first 10 errors only
      });
    } catch (error) {
      console.error('❌ Custom email failed:', error);
      res.status(500).json({
        error: 'Failed to send custom emails',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get email statistics grouped by subject
   */
  async getEmailStats(_req: Request, res: Response): Promise<void> {
    try {
      // Get email counts grouped by subject
      const emailStats = await prisma.communicationLog.groupBy({
        by: ['subject'],
        where: {
          type: 'EMAIL',
          status: 'SENT',
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      });

      // Get total counts
      const totalSent = await prisma.communicationLog.count({
        where: { type: 'EMAIL', status: 'SENT' },
      });

      const totalFailed = await prisma.communicationLog.count({
        where: { type: 'EMAIL', status: 'FAILED' },
      });

      // Get recent email history with more details
      const recentEmails = await prisma.communicationLog.findMany({
        where: { type: 'EMAIL' },
        orderBy: { sentAt: 'desc' },
        take: 100,
        select: {
          id: true,
          subject: true,
          recipientEmail: true,
          status: true,
          sentAt: true,
          failedAt: true,
          errorMessage: true,
        },
      });

      // Group stats by subject with sent/failed breakdown
      const subjectStats = emailStats.map((stat) => ({
        subject: stat.subject || 'No Subject',
        sentCount: stat._count.id,
      }));

      res.json({
        success: true,
        stats: {
          totalSent,
          totalFailed,
          bySubject: subjectStats,
          recentEmails: recentEmails.slice(0, 50),
        },
      });
    } catch (error) {
      console.error('❌ Failed to get email stats:', error);
      res.status(500).json({
        error: 'Failed to get email stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get recipient counts for each filter
   */
  async getEmailRecipientCounts(_req: Request, res: Response): Promise<void> {
    try {
      // Unverified teams - all members
      const unverifiedTeams = await prisma.team.findMany({
        where: { verificationStatus: 'PENDING' },
        include: { members: true },
      });
      const unverifiedAllCount = unverifiedTeams.reduce((acc, team) => acc + team.members.length, 0);
      const unverifiedLeaderCount = unverifiedTeams.reduce(
        (acc, team) => acc + team.members.filter((m) => m.isLeader).length,
        0
      );

      // Verified teams - all members
      const verifiedTeams = await prisma.team.findMany({
        where: { verificationStatus: 'VERIFIED' },
        include: { members: true },
      });
      const verifiedAllCount = verifiedTeams.reduce((acc, team) => acc + team.members.length, 0);
      const verifiedLeaderCount = verifiedTeams.reduce(
        (acc, team) => acc + team.members.filter((m) => m.isLeader).length,
        0
      );

      res.json({
        success: true,
        counts: {
          unverified_all: unverifiedAllCount,
          unverified_leader: unverifiedLeaderCount,
          verified_all: verifiedAllCount,
          verified_leader: verifiedLeaderCount,
          all: unverifiedAllCount + verifiedAllCount,
        },
      });
    } catch (error) {
      console.error('❌ Failed to get recipient counts:', error);
      res.status(500).json({
        error: 'Failed to get recipient counts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send email to custom recipients (for skipped rows / no team name)
   */
  async sendCustomEmailToRecipients(req: Request, res: Response): Promise<void> {
    try {
      const { subject, htmlContent, recipients } = req.body;

      if (!subject || !htmlContent) {
        res.status(400).json({ error: 'Subject and HTML content are required' });
        return;
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'Recipients list is required and cannot be empty' });
        return;
      }

      // Format recipients for the email service
      const formattedRecipients = recipients.map((r: { email: string; name: string }) => ({
        email: r.email,
        name: r.name,
        teamName: 'N/A', // No team name for skipped rows
      }));

      console.log(`📧 Sending custom email to ${formattedRecipients.length} custom recipients (no team name)...`);

      const result = await communicationService.sendCustomBulkEmails({
        recipients: formattedRecipients,
        subject,
        htmlContent,
        templateName: 'custom_no_team',
      });

      res.json({
        success: true,
        message: 'Custom emails sent to recipients',
        stats: {
          sent: result.sent,
          failed: result.failed,
          total: formattedRecipients.length,
        },
        errors: result.errors.slice(0, 10),
      });
    } catch (error) {
      console.error('❌ Custom email to recipients failed:', error);
      res.status(500).json({
        error: 'Failed to send custom emails',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new TeamController();
