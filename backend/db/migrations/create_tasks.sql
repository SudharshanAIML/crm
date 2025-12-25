CREATE TABLE tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    emp_id INT NOT NULL,
    contact_id INT,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    task_type ENUM('FOLLOW_UP', 'CALL', 'MEETING', 'EMAIL', 'DEMO', 'DEADLINE', 'REMINDER', 'OTHER') NOT NULL DEFAULT 'FOLLOW_UP',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    
    due_date DATE NOT NULL,
    due_time TIME,
    duration_minutes INT DEFAULT 30,
    
    is_all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(company_id),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)
);

-- Index for faster calendar queries
CREATE INDEX idx_tasks_emp_date ON tasks(emp_id, due_date);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_status ON tasks(status);
