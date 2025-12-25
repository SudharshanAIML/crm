CREATE TABLE "interactions" (
  "interaction_id" int NOT NULL AUTO_INCREMENT,
  "contact_id" int NOT NULL,
  "emp_id" int DEFAULT NULL,
  "type" enum('CALL','MEETING','EMAIL','DEMO','NOTE') NOT NULL,
  "notes" text,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("interaction_id"),
  KEY "idx_contact_id" ("contact_id"),
  KEY "idx_type" ("type"),
  KEY "idx_emp_id" ("emp_id"),
  CONSTRAINT "interactions_ibfk_1" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("contact_id") ON DELETE CASCADE,
  CONSTRAINT "interactions_ibfk_2" FOREIGN KEY ("emp_id") REFERENCES "employees" ("emp_id") ON DELETE SET NULL
)