CREATE TABLE sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    emp_id INT,

    stage ENUM('MQL', 'SQL'),
    mode_of_contact ENUM('CALL', 'EMAIL', 'IN_PERSON', 'MEETING') DEFAULT 'CALL' ,
    session_no INT,

    rating INT CHECK (rating BETWEEN 1 AND 10),  -- UPDATED RANGE

    session_status ENUM(
        'CONNECTED',
        'NOT_CONNECTED',
        'BAD_TIMING'
    ) NOT NULL,  -- NEW COLUMN

    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);
