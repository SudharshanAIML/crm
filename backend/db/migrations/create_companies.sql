CREATE TABLE "companies" (
  "company_id" int NOT NULL AUTO_INCREMENT,
  "company_name" varchar(255) NOT NULL,
  "domain" varchar(255) DEFAULT NULL,
  "no_of_employees" int DEFAULT NULL,
  "email" varchar(255) DEFAULT NULL,
  "phone" varchar(50) DEFAULT NULL,
  "country" varchar(100) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("company_id"),
  KEY "idx_domain" ("domain"),
  KEY "idx_company_name" ("company_name")
)