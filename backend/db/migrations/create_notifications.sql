-- Notifications table for employee notifications
-- Stores all notification types: task reminders, appointment responses, system alerts, etc.

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    emp_id INT NOT NULL,
    
    -- Notification content
    type ENUM(
        'TASK_DUE_SOON',      -- Task due within 24 hours
        'TASK_OVERDUE',       -- Task is overdue
        'TASK_ASSIGNED',      -- New task assigned
        'APPOINTMENT_ACCEPTED', -- Contact accepted appointment
        'APPOINTMENT_RESCHEDULE', -- Contact requested reschedule
        'APPOINTMENT_CANCELLED', -- Contact cancelled
        'NEW_CONTACT',        -- New lead/contact assigned
        'DEAL_WON',           -- Deal marked as won
        'DEAL_LOST',          -- Deal marked as lost
        'SYSTEM'              -- System notifications
    ) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Related entity (polymorphic reference)
    entity_type ENUM('TASK', 'CONTACT', 'DEAL', 'APPOINTMENT', 'SYSTEM') DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Priority for sorting (higher = more important)
    priority INT DEFAULT 5,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    -- Foreign keys
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_notifications_emp_unread ON notifications(emp_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_emp_date ON notifications(emp_id, created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

