import { Resend } from 'resend';
import { prisma } from '../../lib/prisma';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface BulkEmailParams {
  recipients: Array<{
    email: string;
    name: string;
    teamId?: string;
    memberId?: string;
  }>;
  template: EmailTemplate;
  templateName: string;
}

export interface CustomEmailParams {
  recipients: Array<{
    email: string;
    name: string;
    teamId?: string;
    memberId?: string;
    teamName?: string;
  }>;
  subject: string;
  htmlContent: string;
  templateName?: string;
}

export class CommunicationService {
  /**
   * Send single email using Resend
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    teamId?: string,
    memberId?: string
  ): Promise<void> {
    try {
      const fromEmail = process.env.FROM_EMAIL || 'noreply@loophackathon.com';
      const fromName = process.env.FROM_NAME || 'Loop Hackathon';

      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log communication
      if (teamId) {
        await prisma.communicationLog.create({
          data: {
            teamId,
            memberId,
            type: 'EMAIL',
            templateName: 'custom',
            subject,
            content: htmlContent,
            recipientEmail: to,
            status: 'SENT',
            provider: 'resend',
            sentAt: new Date(),
          },
        });
      }

      console.log(`✅ Email sent to ${to} (ID: ${data?.id})`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      
      if (teamId) {
        await prisma.communicationLog.create({
          data: {
            teamId,
            memberId,
            type: 'EMAIL',
            templateName: 'custom',
            subject,
            content: htmlContent,
            recipientEmail: to,
            status: 'FAILED',
            provider: 'resend',
            failedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
      
      throw error;
    }
  }

  /**
   * Send bulk emails to multiple recipients
   */
  async sendBulkEmails(params: BulkEmailParams): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    console.log(`📧 Sending ${params.recipients.length} emails...`);

    for (const recipient of params.recipients) {
      try {
        await this.sendEmail(
          recipient.email,
          params.template.subject,
          params.template.htmlContent,
          recipient.teamId,
          recipient.memberId
        );
        sent++;
        
        // Small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        failed++;
        errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`✅ Bulk email complete: ${sent} sent, ${failed} failed`);

    return { sent, failed, errors };
  }

  /**
   * Send verification reminder to unverified teams
   */
  async sendVerificationReminderBulk(): Promise<{
    sent: number;
    failed: number;
  }> {
    // Get all unverified team members
    const teams = await prisma.team.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      include: {
        members: true,
      },
    });

    const recipients = teams.flatMap((team) =>
      team.members.map((member) => ({
        email: member.email,
        name: member.fullName,
        teamId: team.id,
        memberId: member.id,
      }))
    );

    const template = this.getVerificationReminderTemplate();

    const result = await this.sendBulkEmails({
      recipients,
      template,
      templateName: 'verification_reminder',
    });

    return {
      sent: result.sent,
      failed: result.failed,
    };
  }

  /**
   * Send custom email with user-provided template
   */
  async sendCustomBulkEmails(params: CustomEmailParams): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    console.log(`📧 Sending custom bulk email to ${params.recipients.length} recipients via Resend...`);

    for (const recipient of params.recipients) {
      try {
        // Replace placeholders in content
        const personalizedContent = this.replacePlaceholders(params.htmlContent, {
          name: recipient.name,
          email: recipient.email,
          teamName: recipient.teamName || '',
        });

        const personalizedSubject = this.replacePlaceholders(params.subject, {
          name: recipient.name,
          email: recipient.email,
          teamName: recipient.teamName || '',
        });

        await this.sendEmail(
          recipient.email,
          personalizedSubject,
          personalizedContent,
          recipient.teamId,
          recipient.memberId
        );
        sent++;
        
        // Delay to avoid rate limiting (Resend free tier: 2 requests/second)
        await this.delay(600);
      } catch (error) {
        failed++;
        errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`✅ Custom bulk email complete: ${sent} sent, ${failed} failed`);

    return { sent, failed, errors };
  }

  /**
   * Replace template placeholders
   */
  private replacePlaceholders(content: string, data: { name: string; email: string; teamName: string }): string {
    return content
      .replace(/\{\{name\}\}/gi, data.name)
      .replace(/\{\{email\}\}/gi, data.email)
      .replace(/\{\{teamName\}\}/gi, data.teamName)
      .replace(/\{\{team_name\}\}/gi, data.teamName);
  }

  /**
   * Get email templates for frontend
   */
  getEmailTemplates(): Array<{ id: string; name: string; subject: string; content: string }> {
    return [
      {
        id: 'verification_reminder',
        name: 'Verification Reminder',
        subject: '⚠️ Action Required: Verify Your Team for Loop Hackathon',
        content: this.getVerificationReminderTemplate().htmlContent,
      },
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: '🎉 Welcome to Loop Hackathon!',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Loop Hackathon</h1>
    </div>
    <div class="content">
      <h2>Welcome, {{name}}! 🎉</h2>
      <p>Congratulations! Your team <strong>{{teamName}}</strong> has been registered for Loop Hackathon.</p>
      <p>We're excited to have you on board!</p>
      <p>Stay tuned for updates and important announcements.</p>
      <p>Best of luck!<br>Loop Hackathon Team</p>
    </div>
    <div class="footer">
      <p>© 2026 Loop Hackathon. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        id: 'deadline_reminder',
        name: 'Deadline Reminder',
        subject: '⏰ Deadline Approaching - Loop Hackathon',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Deadline Reminder</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <div class="alert">
        <strong>⚠️ Important:</strong> The submission deadline is approaching!
      </div>
      <p>Make sure your team <strong>{{teamName}}</strong> submits before the deadline.</p>
      <p>Don't miss out on this opportunity!</p>
      <p>Best of luck!<br>Loop Hackathon Team</p>
    </div>
    <div class="footer">
      <p>© 2026 Loop Hackathon. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
      {
        id: 'custom',
        name: 'Custom Email',
        subject: 'Loop Hackathon Update',
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Loop Hackathon</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Write your custom message here...</p>
      <p>Best regards,<br>Loop Hackathon Team</p>
    </div>
    <div class="footer">
      <p>© 2026 Loop Hackathon. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
      },
    ];
  }

  /**
   * Get verification reminder email template
   */
  getVerificationReminderTemplate(): EmailTemplate {
    return {
      subject: '⚠️ Action Required: Verify Your Team for Loop Hackathon',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Loop Hackathon</h1>
            </div>
            <div class="content">
              <h2>Hi Team! 👋</h2>
              <p>We noticed your team registration for <strong>Loop Hackathon</strong> is still pending verification.</p>
              
              <p><strong>⚡ Action Required:</strong></p>
              <ul>
                <li>Complete your team profile on Unstop</li>
                <li>Ensure all team member details are accurate</li>
                <li>Verify your email addresses</li>
              </ul>

              <p>Once verified, you'll be able to:</p>
              <ul>
                <li>✅ Submit your project</li>
                <li>✅ Access hackathon resources</li>
                <li>✅ Compete for amazing prizes</li>
              </ul>

              <a href="${process.env.FRONTEND_URL || 'https://loophackathon.com'}" class="button">
                Complete Verification →
              </a>

              <p>Need help? Reply to this email and we'll assist you!</p>

              <p>Best regards,<br>
              <strong>Loop Hackathon Team</strong></p>
            </div>
            <div class="footer">
              <p>Loop Hackathon | Going Beyond Infinity</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Loop Hackathon - Action Required

        Hi Team!

        We noticed your team registration for Loop Hackathon is still pending verification.

        Action Required:
        - Complete your team profile on Unstop
        - Ensure all team member details are accurate
        - Verify your email addresses

        Once verified, you'll be able to submit your project and compete for amazing prizes!

        Visit: ${process.env.FRONTEND_URL || 'https://loophackathon.com'}

        Need help? Reply to this email and we'll assist you!

        Best regards,
        Loop Hackathon Team
      `,
    };
  }

  /**
   * Get all communication logs
   */
  async getCommunicationLogs(filter?: {
    teamId?: string;
    type?: 'EMAIL' | 'SMS' | 'WHATSAPP';
    status?: 'QUEUED' | 'SENT' | 'FAILED' | 'DELIVERED' | 'BOUNCED';
  }) {
    return await prisma.communicationLog.findMany({
      where: filter,
      include: {
        team: {
          select: {
            teamName: true,
            unstopTeamId: true,
          },
        },
        member: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        queuedAt: 'desc',
      },
      take: 100,
    });
  }

  /**
   * Helper: Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new CommunicationService();
