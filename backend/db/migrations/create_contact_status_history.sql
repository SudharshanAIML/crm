CREATE TABLE "contact_status_history" (
  "id" int NOT NULL AUTO_INCREMENT,
  "contact_id" int NOT NULL,
  "old_status" varchar(50) DEFAULT NULL,
  "new_status" varchar(50) NOT NULL,
  "changed_by" int DEFAULT NULL,
  "changed_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "idx_contact_id" ("contact_id"),
  KEY "idx_changed_at" ("changed_at"),
  KEY "changed_by" ("changed_by"),
  CONSTRAINT "contact_status_history_ibfk_1" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("contact_id") ON DELETE CASCADE,
  CONSTRAINT "contact_status_history_ibfk_2" FOREIGN KEY ("changed_by") REFERENCES "employees" ("emp_id") ON DELETE SET NULL
)