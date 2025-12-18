CREATE TABLE contacts (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    assigned_emp_id INT,

    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),

    job_title VARCHAR(255),  -- NEW: lead's job / role

    status ENUM(
        'LEAD',
        'MQL',
        'SQL',
        'OPPORTUNITY',
        'CUSTOMER',
        'EVANGELIST'
    ) DEFAULT 'LEAD',

    source VARCHAR(255),
    interest_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(company_id),
    FOREIGN KEY (assigned_emp_id) REFERENCES employees(emp_id)
);
