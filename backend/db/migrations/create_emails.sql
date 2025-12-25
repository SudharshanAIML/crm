CREATE TABLE "emails" (
  "email_id" int NOT NULL AUTO_INCREMENT,
  "contact_id" int NOT NULL,
  "emp_id" int DEFAULT NULL,
  "subject" varchar(255) DEFAULT NULL,
  "body" text,
  "tracking_token" varchar(255) DEFAULT NULL,
  "clicked" tinyint(1) DEFAULT '0',
  "clicked_at" timestamp NULL DEFAULT NULL,
  "sent_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("email_id"),
  UNIQUE KEY "tracking_token" ("tracking_token"),
  KEY "idx_contact_id" ("contact_id"),
  KEY "idx_tracking_token" ("tracking_token"),
  KEY "idx_clicked" ("clicked"),
  KEY "emp_id" ("emp_id"),
  CONSTRAINT "emails_ibfk_1" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("contact_id") ON DELETE CASCADE,
  CONSTRAINT "emails_ibfk_2" FOREIGN KEY ("emp_id") REFERENCES "employees" ("emp_id") ON DELETE SET NULL
)