CREATE TABLE emails (
    email_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    emp_id INT,
    subject VARCHAR(255),
    body TEXT,
    tracking_token VARCHAR(255),
    clicked BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);
