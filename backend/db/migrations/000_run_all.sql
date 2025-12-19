-- =====================================================
-- CRM Database Schema - Run All Migrations
-- Run this file to create all tables in correct order
-- =====================================================

-- Drop tables if exist (for fresh setup - CAREFUL IN PRODUCTION!)
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS feedback;
-- DROP TABLE IF EXISTS deals;
-- DROP TABLE IF EXISTS opportunities;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS emails;
-- DROP TABLE IF EXISTS contact_status_history;
-- DROP TABLE IF EXISTS interactions;
-- DROP TABLE IF EXISTS contacts;
-- DROP TABLE IF EXISTS employees;
-- DROP TABLE IF EXISTS companies;
-- SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    no_of_employees INT,
    email VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_domain (domain),
    INDEX idx_company_name (company_name)
);

-- =====================================================
-- 2. EMPLOYEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    emp_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role ENUM('ADMIN', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_company_id (company_id),
    INDEX idx_email (email),
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL
);

-- =====================================================
-- 3. CONTACTS TABLE (Leads/MQL/SQL/Opportunity/Customer/Evangelist)
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    assigned_emp_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    job_title VARCHAR(255),
    status ENUM(
        'LEAD',
        'MQL',
        'SQL',
        'OPPORTUNITY',
        'CUSTOMER',
        'EVANGELIST',
        'DORMANT'
    ) DEFAULT 'LEAD',
    source VARCHAR(255),
    interest_score INT DEFAULT 0,
    tracking_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_company_id (company_id),
    INDEX idx_status (status),
    INDEX idx_assigned_emp (assigned_emp_id),
    INDEX idx_tracking_token (tracking_token),
    INDEX idx_email (email),
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- 4. CONTACT STATUS HISTORY (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_changed_at (changed_at),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- 5. SESSIONS TABLE (MQL/SQL Call Sessions - Max 5 per stage)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    emp_id INT,
    stage ENUM('MQL', 'SQL') NOT NULL,
    session_no INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 10),
    session_status ENUM(
        'CONNECTED',
        'NOT_CONNECTED',
        'BAD_TIMING'
    ) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_stage (stage),
    INDEX idx_emp_id (emp_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- 6. OPPORTUNITIES TABLE (SQL → Opportunity stage)
-- =====================================================
CREATE TABLE IF NOT EXISTS opportunities (
    opportunity_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    emp_id INT,
    expected_value DECIMAL(12,2) NOT NULL,
    probability INT CHECK (probability BETWEEN 0 AND 100),
    status ENUM('OPEN', 'WON', 'LOST') DEFAULT 'OPEN',
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_status (status),
    INDEX idx_emp_id (emp_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- 7. DEALS TABLE (Closed Won Opportunities)
-- =====================================================
CREATE TABLE IF NOT EXISTS deals (
    deal_id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    deal_value DECIMAL(12,2) NOT NULL,
    closed_by INT,
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_opportunity_id (opportunity_id),
    INDEX idx_closed_by (closed_by),
    INDEX idx_closed_at (closed_at),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id) ON DELETE CASCADE,
    FOREIGN KEY (closed_by) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- 8. EMAILS TABLE (Marketing Emails with Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS emails (
    email_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    emp_id INT,
    subject VARCHAR(255),
    body TEXT,
    tracking_token VARCHAR(255) UNIQUE,
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMP NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_tracking_token (tracking_token),
    INDEX idx_clicked (clicked),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- 9. FEEDBACK TABLE (Customer Feedback for Evangelist conversion)
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 10),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_rating (rating),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE
);

-- =====================================================
-- 10. INTERACTIONS TABLE (General Interaction Logging)
-- =====================================================
CREATE TABLE IF NOT EXISTS interactions (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    emp_id INT,
    type ENUM('CALL', 'MEETING', 'EMAIL', 'DEMO', 'NOTE') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contact_id (contact_id),
    INDEX idx_type (type),
    INDEX idx_emp_id (emp_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert a test company
-- INSERT INTO companies (company_name, domain, email, country) 
-- VALUES ('Acme Corp', 'acme.com', 'contact@acme.com', 'USA');

-- Insert a test admin employee
-- INSERT INTO employees (company_id, name, email, role) 
-- VALUES (1, 'Admin User', 'admin@acme.com', 'ADMIN');
