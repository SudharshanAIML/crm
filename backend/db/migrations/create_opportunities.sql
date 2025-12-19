CREATE TABLE opportunities (
    opportunity_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    emp_id INT,

    expected_value DECIMAL(12,2),
    probability INT CHECK (probability BETWEEN 0 AND 100),
    status ENUM('OPEN', 'WON', 'LOST') DEFAULT 'OPEN',
    reason TEXT,  -- reason for LOST opportunities
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);
