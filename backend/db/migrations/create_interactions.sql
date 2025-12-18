CREATE TABLE interactions (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    emp_id INT,

    type ENUM('CALL', 'MEETING', 'EMAIL', 'DEMO'),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);
