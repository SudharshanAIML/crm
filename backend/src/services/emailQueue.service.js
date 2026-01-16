/**
 * Email Queue Service
 * Lightweight in-memory job queue for non-blocking email sending
 * 
 * Features:
 * - Immediate response to API calls
 * - Background processing
 * - Automatic retries with exponential backoff
 * - Concurrent processing with configurable limits
 * - Job status tracking
 */

import * as gmailService from "./gmail.service.js";
import * as emailRepo from "../modules/emails/email.repo.js";

// Queue configuration
const CONFIG = {
  MAX_CONCURRENT: 3,        // Max emails being sent simultaneously
  MAX_RETRIES: 3,           // Max retry attempts per email
  RETRY_DELAYS: [5000, 15000, 30000], // Delay between retries (5s, 15s, 30s)
  QUEUE_CHECK_INTERVAL: 100, // How often to check queue (ms)
  JOB_TIMEOUT: 60000,       // Max time for single email send (60s)
};

// Job statuses
const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// In-memory storage
const jobQueue = [];
const activeJobs = new Map();
const completedJobs = new Map(); // Keep last 100 completed jobs for status checks
let isProcessing = false;
let processingPromise = null;

/**
 * Generate unique job ID
 */
const generateJobId = () => {
  return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Add email job to queue
 * @returns {string} Job ID for tracking
 */
export const queueEmail = ({
  emailId,
  empId,
  to,
  subject,
  htmlBody,
  cc,
  bcc,
  attachments = [],
  priority = 'normal', // 'high', 'normal', 'low'
}) => {
  const jobId = generateJobId();
  
  const job = {
    id: jobId,
    emailId,
    empId,
    to,
    subject,
    htmlBody,
    cc,
    bcc,
    attachments,
    priority,
    status: JOB_STATUS.PENDING,
    attempts: 0,
    createdAt: Date.now(),
    lastAttemptAt: null,
    completedAt: null,
    error: null,
  };

  // Insert based on priority
  if (priority === 'high') {
    // Find first non-high priority job and insert before it
    const insertIndex = jobQueue.findIndex(j => j.priority !== 'high');
    if (insertIndex === -1) {
      jobQueue.push(job);
    } else {
      jobQueue.splice(insertIndex, 0, job);
    }
  } else if (priority === 'low') {
    jobQueue.push(job);
  } else {
    // Normal priority - insert before low priority jobs
    const insertIndex = jobQueue.findIndex(j => j.priority === 'low');
    if (insertIndex === -1) {
      jobQueue.push(job);
    } else {
      jobQueue.splice(insertIndex, 0, job);
    }
  }

  // Ensure processor is running
  startProcessing();

  console.log(`📬 Email queued: ${jobId} to ${to} (Queue size: ${jobQueue.length})`);
  
  return jobId;
};

/**
 * Get job status
 */
export const getJobStatus = (jobId) => {
  // Check active jobs
  if (activeJobs.has(jobId)) {
    return activeJobs.get(jobId);
  }
  
  // Check completed jobs
  if (completedJobs.has(jobId)) {
    return completedJobs.get(jobId);
  }
  
  // Check queue
  const queuedJob = jobQueue.find(j => j.id === jobId);
  if (queuedJob) {
    return {
      id: queuedJob.id,
      status: queuedJob.status,
      position: jobQueue.indexOf(queuedJob) + 1,
      createdAt: queuedJob.createdAt,
    };
  }
  
  return null;
};

/**
 * Get queue statistics
 */
export const getQueueStats = () => {
  return {
    pending: jobQueue.length,
    processing: activeJobs.size,
    completed: completedJobs.size,
    isProcessing,
  };
};

/**
 * Process a single email job
 */
const processJob = async (job) => {
  job.status = JOB_STATUS.PROCESSING;
  job.attempts++;
  job.lastAttemptAt = Date.now();
  activeJobs.set(job.id, job);

  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email send timeout')), CONFIG.JOB_TIMEOUT);
    });

    // Send email with timeout
    const sendPromise = gmailService.sendEmailViaGmail({
      empId: job.empId,
      to: job.to,
      subject: job.subject,
      htmlBody: job.htmlBody,
      cc: job.cc,
      bcc: job.bcc,
      attachments: job.attachments,
    });

    const result = await Promise.race([sendPromise, timeoutPromise]);

    // Update email record with Gmail message ID
    if (job.emailId && result.messageId) {
      await emailRepo.updateGmailId(job.emailId, result.messageId);
    }

    // Mark as completed
    job.status = JOB_STATUS.COMPLETED;
    job.completedAt = Date.now();
    job.result = result;

    console.log(`✅ Email sent: ${job.id} to ${job.to} (attempt ${job.attempts})`);

    // Move to completed
    activeJobs.delete(job.id);
    addToCompleted(job);

    return true;
  } catch (error) {
    console.error(`❌ Email failed: ${job.id} to ${job.to} (attempt ${job.attempts}):`, error.message);
    
    job.error = error.message;
    activeJobs.delete(job.id);

    // Check if should retry
    if (job.attempts < CONFIG.MAX_RETRIES) {
      // Schedule retry
      const retryDelay = CONFIG.RETRY_DELAYS[job.attempts - 1] || CONFIG.RETRY_DELAYS[CONFIG.RETRY_DELAYS.length - 1];
      job.status = JOB_STATUS.PENDING;
      job.nextRetryAt = Date.now() + retryDelay;
      
      console.log(`🔄 Retry scheduled for ${job.id} in ${retryDelay / 1000}s`);
      
      // Re-add to queue
      setTimeout(() => {
        jobQueue.push(job);
        startProcessing();
      }, retryDelay);
    } else {
      // Max retries exceeded
      job.status = JOB_STATUS.FAILED;
      job.completedAt = Date.now();
      addToCompleted(job);
      
      console.error(`💀 Email permanently failed: ${job.id} to ${job.to} after ${job.attempts} attempts`);
    }

    return false;
  }
};

/**
 * Add job to completed cache (keep last 100)
 */
const addToCompleted = (job) => {
  completedJobs.set(job.id, {
    id: job.id,
    status: job.status,
    emailId: job.emailId,
    to: job.to,
    attempts: job.attempts,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    error: job.error,
  });

  // Cleanup old completed jobs (keep last 100)
  if (completedJobs.size > 100) {
    const oldestKey = completedJobs.keys().next().value;
    completedJobs.delete(oldestKey);
  }
};

/**
 * Main processing loop
 */
const processQueue = async () => {
  while (true) {
    // Check if we have capacity and pending jobs
    if (activeJobs.size >= CONFIG.MAX_CONCURRENT || jobQueue.length === 0) {
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, CONFIG.QUEUE_CHECK_INTERVAL));
      
      // If queue is empty and no active jobs, stop processing
      if (jobQueue.length === 0 && activeJobs.size === 0) {
        isProcessing = false;
        processingPromise = null;
        console.log('📭 Email queue empty, processor stopped');
        return;
      }
      continue;
    }

    // Get next job from queue
    const job = jobQueue.shift();
    if (!job) continue;

    // Process job (don't await - let it run concurrently)
    processJob(job).catch(err => {
      console.error('Unexpected error processing job:', err);
    });
  }
};

/**
 * Start the queue processor if not already running
 */
const startProcessing = () => {
  if (isProcessing) return;
  
  isProcessing = true;
  processingPromise = processQueue();
  console.log('📬 Email queue processor started');
};

/**
 * Graceful shutdown - wait for active jobs
 */
export const shutdown = async () => {
  console.log('🛑 Shutting down email queue...');
  
  // Wait for active jobs to complete (max 30 seconds)
  const maxWait = 30000;
  const startTime = Date.now();
  
  while (activeJobs.size > 0 && Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`⏳ Waiting for ${activeJobs.size} active email(s) to complete...`);
  }
  
  if (activeJobs.size > 0) {
    console.warn(`⚠️ Forced shutdown with ${activeJobs.size} emails still processing`);
  } else {
    console.log('✅ Email queue shutdown complete');
  }
};
