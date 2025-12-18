CREATE TABLE deals (
    deal_id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT,
    deal_value DECIMAL(12,2),
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (opportunity_id) REFERENCES opportunities(opportunity_id)
);
