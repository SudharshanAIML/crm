CREATE TABLE "opportunities" (
"opportunity_id" int NOT NULL AUTO_INCREMENT,
"contact_id" int NOT NULL,
"emp_id" int DEFAULT NULL,
"expected_value" decimal(12,2) NOT NULL,
"probability" int DEFAULT NULL,
"status" enum('OPEN','WON','LOST') DEFAULT 'OPEN',
"reason" text,
"created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY ("opportunity_id"),
KEY "idx_contact_id" ("contact_id"),
KEY "idx_status" ("status"),
KEY "idx_emp_id" ("emp_id"),
CONSTRAINT "opportunities_ibfk_1" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("contact_id") ON DELETE CASCADE,
CONSTRAINT "opportunities_ibfk_2" FOREIGN KEY ("emp_id") REFERENCES "employees" ("emp_id") ON DELETE SET NULL,
CONSTRAINT "opportunities_chk_1" CHECK ((`probability` between 0 and 100))
)