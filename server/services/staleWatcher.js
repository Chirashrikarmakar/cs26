const cron = require('node-cron');
const OAQIssue = require('../models/OAQIssue');

const THRESHOLD_DAYS = Number(process.env.STALE_THRESHOLD_DAYS) || 1;

async function scanAndEscalate(io) {
  const thresholdMs = THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - thresholdMs);

  let candidates;
  try {
    candidates = await OAQIssue.find({
      status: 'Open',
      lastActivityAt: { $lt: cutoff },
      staleFlaggedAt: null,
      communityReplies: { $size: 0 }
    }).select('_id issueId queryText raisedBy lastActivityAt');
  } catch (err) {
    console.warn('[STALE] scan query failed:', err.message);
    return 0;
  }

  let escalated = 0;
  for (const issue of candidates) {
    try {
      await OAQIssue.findByIdAndUpdate(issue._id, {
        priority: 'HIGH',
        escalated: true,
        escalationReason: 'STALE',
        staleFlaggedAt: new Date()
      });
      if (io) {
        const daysSince = Math.max(1, Math.floor((Date.now() - new Date(issue.lastActivityAt)) / (24 * 60 * 60 * 1000)));
        io.to('mentors').emit('issue:stale-escalated', {
          issueId: issue._id,
          issueNumber: issue.issueId,
          queryText: issue.queryText,
          daysSince
        });
        io.emit('issue:stale-escalated', {
          issueId: issue._id,
          issueNumber: issue.issueId,
          queryText: issue.queryText,
          daysSince
        });
      }
      escalated += 1;
    } catch (err) {
      console.warn(`[STALE] failed to escalate ${issue._id}:`, err.message);
    }
  }

  if (escalated > 0) {
    console.log(`[STALE] escalated ${escalated} unanswered query(ies) to HIGH/STALE`);
  }
  return escalated;
}

function start(io) {
  cron.schedule('7 * * * *', () => {
    scanAndEscalate(io).catch(err => console.warn('[STALE] cron error:', err.message));
  });
  setTimeout(() => {
    scanAndEscalate(io).catch(err => console.warn('[STALE] boot scan error:', err.message));
  }, 5000);
  console.log(`[STALE] watcher started (threshold: ${THRESHOLD_DAYS} day(s), runs hourly at :07)`);
}

module.exports = { start, scanAndEscalate };
