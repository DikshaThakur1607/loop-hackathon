import { Router } from 'express';
import multer from 'multer';
import teamController from '../controllers/team.controller';

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Routes

/**
 * POST /api/teams/upload-csv
 * Upload and process registration CSV
 */
router.post('/upload-csv', upload.single('file'), teamController.uploadCSV.bind(teamController));

/**
 * GET /api/teams/verified
 * Get list of verified teams with leader details
 */
router.get('/verified', teamController.getVerifiedTeams.bind(teamController));

/**
 * GET /api/teams/unverified
 * Get list of unverified teams with leader details
 */
router.get('/unverified', teamController.getUnverifiedTeams.bind(teamController));

/**
 * GET /api/teams/unverified/phone-numbers
 * Get phone numbers of unverified team leaders for calling
 */
router.get('/unverified/phone-numbers', teamController.getUnverifiedPhoneNumbers.bind(teamController));

/**
 * GET /api/teams/unverified/all-contacts
 * Get all contacts (leaders + members) from unverified teams
 */
router.get('/unverified/all-contacts', teamController.getUnverifiedAllContacts.bind(teamController));

/**
 * POST /api/teams/send-verification-reminders
 * Send bulk verification reminder emails to all unverified team members
 */
router.post('/send-verification-reminders', teamController.sendVerificationReminders.bind(teamController));

/**
 * POST /api/teams/send-custom-email
 * Send custom bulk email with user-provided template
 */
router.post('/send-custom-email', teamController.sendCustomEmail.bind(teamController));

/**
 * POST /api/teams/send-custom-email-recipients
 * Send custom email to specific recipients (for skipped rows / no team name)
 */
router.post('/send-custom-email-recipients', teamController.sendCustomEmailToRecipients.bind(teamController));

/**
 * GET /api/teams/email-templates
 * Get available email templates
 */
router.get('/email-templates', teamController.getEmailTemplates.bind(teamController));

/**
 * GET /api/teams/email-stats
 * Get email statistics grouped by subject
 */
router.get('/email-stats', teamController.getEmailStats.bind(teamController));

/**
 * GET /api/teams/email-recipient-counts
 * Get recipient counts for each email filter
 */
router.get('/email-recipient-counts', teamController.getEmailRecipientCounts.bind(teamController));

/**
 * GET /api/teams/export
 * Export teams to CSV (query param: status=PENDING|VERIFIED|REJECTED)
 */
router.get('/export', teamController.exportTeams.bind(teamController));

/**
 * GET /api/teams/stats
 * Get team statistics
 */
router.get('/stats', teamController.getTeamStats.bind(teamController));

/**
 * PATCH /api/teams/:teamId/verify
 * Manually verify a team
 */
router.patch('/:teamId/verify', teamController.verifyTeam.bind(teamController));

export default router;
