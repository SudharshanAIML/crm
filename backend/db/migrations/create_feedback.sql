CREATE TABLE "feedback" (
  "feedback_id" int NOT NULL AUTO_INCREMENT,
  "contact_id" int NOT NULL,
  "rating" int NOT NULL,
  "comment" text,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("feedback_id"),
  KEY "idx_contact_id" ("contact_id"),
  KEY "idx_rating" ("rating"),
  CONSTRAINT "feedback_ibfk_1" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("contact_id") ON DELETE CASCADE,
  CONSTRAINT "feedback_chk_1" CHECK ((`rating` between 1 and 10))
)