CREATE TABLE "deals" (
  "deal_id" int NOT NULL AUTO_INCREMENT,
  "opportunity_id" int NOT NULL,
  "deal_value" decimal(12,2) NOT NULL,
  "product" varchar(255) DEFAULT NULL,
  "closed_by" int DEFAULT NULL,
  "closed_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("deal_id"),
  KEY "idx_opportunity_id" ("opportunity_id"),
  KEY "idx_closed_by" ("closed_by"),
  KEY "idx_closed_at" ("closed_at"),
  CONSTRAINT "deals_ibfk_1" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities" ("opportunity_id") ON DELETE CASCADE,
  CONSTRAINT "deals_ibfk_2" FOREIGN KEY ("closed_by") REFERENCES "employees" ("emp_id") ON DELETE SET NULL
)
