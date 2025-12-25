REATE TABLE "employees" (
  "emp_id" int NOT NULL AUTO_INCREMENT,
  "company_id" int DEFAULT '1',
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(50) DEFAULT NULL,
  "role" enum('ADMIN','EMPLOYEE') DEFAULT 'EMPLOYEE',
  "department" varchar(100) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("emp_id"),
  UNIQUE KEY "email" ("email"),
  KEY "idx_company_id" ("company_id"),
  KEY "idx_email" ("email"),
  CONSTRAINT "employees_ibfk_1" FOREIGN KEY ("company_id") REFERENCES "companies" ("company_id") ON DELETE SET NULL
)