-- =====================================================
-- OUTREACH PAGES - Dynamic Landing Page Builder
-- =====================================================
-- This migration creates tables for the outreach page builder
-- feature that allows employees to create custom landing pages
-- for their contacts.

-- Pages table - stores page metadata
CREATE TABLE IF NOT EXISTS outreach_pages (
    page_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    created_by_emp_id INT NOT NULL,
    
    -- Page metadata
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Page status
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    
    -- SEO & Meta
    meta_title VARCHAR(255),
    meta_description TEXT,
    og_image_url VARCHAR(500),
    
    -- Tracking
    view_count INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    
    -- Indexes
    UNIQUE KEY unique_slug_per_company (company_id, slug),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by_emp_id),
    INDEX idx_company (company_id),
    
    -- Foreign keys
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE
);

-- Page components table - stores the building blocks of each page
-- Uses JSON for flexible component configuration
CREATE TABLE IF NOT EXISTS outreach_page_components (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    
    -- Component type (hero, text, image, form, cta, video, testimonial, etc.)
    component_type VARCHAR(50) NOT NULL,
    
    -- Order of component on the page
    sort_order INT NOT NULL DEFAULT 0,
    
    -- Component configuration stored as JSON for flexibility
    -- This allows each component type to have its own schema
    config JSON NOT NULL,
    
    -- Visibility
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_page_order (page_id, sort_order),
    INDEX idx_component_type (component_type),
    
    -- Foreign key
    FOREIGN KEY (page_id) REFERENCES outreach_pages(page_id) ON DELETE CASCADE
);

-- Form responses table - captures submissions from page forms
CREATE TABLE IF NOT EXISTS outreach_form_responses (
    response_id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    component_id INT NOT NULL,
    
    -- Optional contact association
    contact_id INT NULL,
    
    -- Form data stored as JSON for flexibility
    form_data JSON NOT NULL,
    
    -- Submission metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    
    -- Status for tracking/follow-up
    status ENUM('new', 'viewed', 'contacted', 'converted') DEFAULT 'new',
    viewed_at TIMESTAMP NULL,
    viewed_by_emp_id INT NULL,
    
    -- Notes from employee
    notes TEXT,
    
    -- Indexes
    INDEX idx_page (page_id),
    INDEX idx_component (component_id),
    INDEX idx_contact (contact_id),
    INDEX idx_status (status),
    INDEX idx_submitted (submitted_at),
    
    -- Foreign keys
    FOREIGN KEY (page_id) REFERENCES outreach_pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES outreach_page_components(component_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE SET NULL,
    FOREIGN KEY (viewed_by_emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- Page visits tracking for analytics
CREATE TABLE IF NOT EXISTS outreach_page_visits (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    
    -- Optional contact association (if we can identify them via token)
    contact_id INT NULL,
    
    -- Visit metadata
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    
    -- UTM parameters for campaign tracking
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    
    -- Session tracking
    session_duration_seconds INT DEFAULT 0,
    
    -- Indexes
    INDEX idx_page (page_id),
    INDEX idx_contact (contact_id),
    INDEX idx_visited (visited_at),
    
    -- Foreign keys
    FOREIGN KEY (page_id) REFERENCES outreach_pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE SET NULL
);

-- Page-Contact association for targeted sending
CREATE TABLE IF NOT EXISTS outreach_page_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    contact_id INT NOT NULL,
    
    -- Personalized token for tracking
    access_token VARCHAR(64) NOT NULL,
    
    -- Sending metadata
    sent_at TIMESTAMP NULL,
    sent_by_emp_id INT NULL,
    
    -- Engagement tracking
    first_viewed_at TIMESTAMP NULL,
    last_viewed_at TIMESTAMP NULL,
    view_count INT DEFAULT 0,
    
    -- Conversion tracking
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    UNIQUE KEY unique_page_contact (page_id, contact_id),
    UNIQUE KEY unique_token (access_token),
    INDEX idx_sent (sent_at),
    
    -- Foreign keys
    FOREIGN KEY (page_id) REFERENCES outreach_pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by_emp_id) REFERENCES employees(emp_id) ON DELETE SET NULL
);
