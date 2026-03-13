import { db } from "../../config/db.js";

const SUPPORT_CHAT_BASE_URL = (process.env.SUPPORT_CHAT_BASE_URL || "https://support-chat-6ajp.onrender.com").replace(/\/$/, "");
const SUPPORT_CHAT_API_KEY = process.env.SUPPORT_CHAT_API_KEY || "crm-api-key";

const CRM_TABLE_DESCRIPTIONS = {
  companies: "Company accounts and organization metadata",
  employees: "Internal users with roles and department details",
  contacts: "Core CRM contacts/leads and pipeline stages",
  opportunities: "Potential deals before closure",
  deals: "Closed-won or closed-lost outcomes and revenue",
  sessions: "Sales/marketing interaction sessions with ratings",
  tasks: "Action items and follow-ups assigned to employees",
  feedback: "Customer satisfaction and feedback data",
  emails: "Outbound and tracked email records",
  email_templates: "Reusable templates for email campaigns",
  automations: "Automation definitions and trigger configurations",
  sequences: "Email sequence definitions and performance counters",
  sequence_steps: "Step-by-step templates and schedule delays",
  sequence_enrollments: "Contacts enrolled in active sequences",
  sequence_executions: "Execution logs for each sent/failed step",
  notifications: "In-app notifications for users",
  discuss_channels: "Team chat channels",
  discuss_messages: "Team chat message history",
  discuss_mentions: "Mentions in chat messages",
  outreach_pages: "Public campaign/landing pages",
  outreach_page_components: "Page builder components and layouts",
  outreach_form_responses: "Captured responses from public forms",
  ab_tests: "A/B test experiments and variants",
  ab_test_metrics: "A/B test performance statistics",
  call_logs: "Telephony/call records",
};

const PRIORITY_SCHEMA_TABLES = Object.keys(CRM_TABLE_DESCRIPTIONS);
const MAX_TABLES_IN_SCHEMA_CONTEXT = 40;
const MAX_FIELDS_PER_TABLE = 120;

const mapDbTypeToSupportType = (dbType = "") => {
  const normalized = String(dbType).toLowerCase();
  if (normalized.includes("int")) return "INT";
  if (normalized.includes("decimal") || normalized.includes("numeric") || normalized.includes("float") || normalized.includes("double")) return "DECIMAL";
  if (normalized.includes("bool") || normalized === "tinyint(1)") return "BOOLEAN";
  if (normalized.includes("date") || normalized.includes("time") || normalized.includes("year")) return "DATE";
  if (normalized.includes("json")) return "JSON";
  if (normalized.includes("text") || normalized.includes("char") || normalized.includes("enum") || normalized.includes("set")) return "VARCHAR(255)";
  return "TEXT";
};

const toSqlAlchemyMySqlUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("mysql+pymysql://")) return url;
  if (url.startsWith("mysql://")) return `mysql+pymysql://${url.slice("mysql://".length)}`;
  return url;
};

const stripQueryFromUrl = (url) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0].split("#")[0];
  }
};

const buildSupportChatDbUrl = (sourceUrl) => {
  const converted = stripQueryFromUrl(toSqlAlchemyMySqlUrl(sourceUrl));
  if (!converted) return null;
  return converted;
};

const buildInsecureSupportChatDbUrl = (sourceUrl) => {
  const converted = buildSupportChatDbUrl(sourceUrl);
  if (!converted) return null;

  let parsed;
  try {
    parsed = new URL(converted);
  } catch {
    return `${converted}?ssl_verify=false`;
  }

  parsed.searchParams.set("ssl_verify", "false");

  return parsed.toString();
};

const normalizeErrorDetail = (detail) => {
  if (!detail) return null;

  if (Array.isArray(detail)) {
    const preview = detail.slice(0, 3).map((item) => {
      if (typeof item === "string") return item;
      if (item?.msg && Array.isArray(item?.loc)) {
        return `${item.loc.join(".")}: ${item.msg}`;
      }
      if (item?.msg) return item.msg;
      return JSON.stringify(item);
    });
    const suffix = detail.length > 3 ? ` (+${detail.length - 3} more)` : "";
    return `${preview.join("; ")}${suffix}`;
  }

  if (typeof detail === "object") {
    return detail.message || detail.error || JSON.stringify(detail);
  }

  return String(detail);
};

const supportChatFetch = async (path, options = {}) => {
  const response = await fetch(`${SUPPORT_CHAT_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": SUPPORT_CHAT_API_KEY,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }

  if (!response.ok) {
    const prettyDetail = normalizeErrorDetail(payload?.detail);
    const err = new Error(prettyDetail || payload?.message || "Support Chat API request failed");
    err.statusCode = response.status;
    err.raw = payload;
    throw err;
  }

  return payload;
};

const shouldFallbackToSchemaContext = (error) => {
  const message = String(error?.message || "");
  const status = Number(error?.statusCode || 0);
  if (![400, 422, 500].includes(status)) return false;

  return [
    "Failed to auto-discover schema from db_url",
    "Schema introspection failed",
    "CERTIFICATE_VERIFY_FAILED",
    "ssl",
  ].some((needle) => message.includes(needle));
};

const isCertificateVerifyError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return [
    "certificate_verify_failed",
    "self-signed certificate",
    "unable to get local issuer certificate",
    "tlsv1 alert unknown ca",
  ].some((needle) => message.includes(needle));
};

const getSchemaContext = async (companyId) => {
  const placeholders = PRIORITY_SCHEMA_TABLES.map(() => "?").join(",");
  const [tables] = await db.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
        AND table_name IN (${placeholders})
      ORDER BY table_name ASC
    `,
    PRIORITY_SCHEMA_TABLES
  );

  const [columns] = await db.query(
    `
      SELECT
        table_name,
        column_name,
        column_type,
        column_key,
        is_nullable,
        column_comment
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name IN (${placeholders})
      ORDER BY table_name ASC, ordinal_position ASC
    `,
    PRIORITY_SCHEMA_TABLES
  );

  const columnsByTable = columns.reduce((acc, col) => {
    if (!acc[col.table_name]) acc[col.table_name] = [];
    acc[col.table_name].push(col);
    return acc;
  }, {});

  const schemaContext = [];

  for (const { table_name } of tables) {
    const tableName = String(table_name || "").trim();
    if (!tableName) continue;

    const tableColumns = columnsByTable[tableName] || [];
    const fields = [];

    for (const col of tableColumns) {
      const fieldName = String(col.column_name || "").trim();
      const fieldType = String(mapDbTypeToSupportType(col.column_type) || "").trim();
      if (!fieldName || !fieldType) continue;

      fields.push({
        name: fieldName,
        type: fieldType,
        description: col.column_comment || `${fieldName} from ${tableName}`,
        is_primary_key: col.column_key === "PRI",
      });

      if (fields.length >= MAX_FIELDS_PER_TABLE) break;
    }

    if (fields.length === 0) continue;

    schemaContext.push({
      name: tableName,
      description: CRM_TABLE_DESCRIPTIONS[tableName] || `${tableName} data for CRM operations in company ${companyId}`,
      fields,
    });

    if (schemaContext.length >= MAX_TABLES_IN_SCHEMA_CONTEXT) break;
  }

  if (schemaContext.length > 0) {
    return schemaContext;
  }

  // Safety net: never return an empty schema_context in fallback mode.
  return [
    {
      name: "contacts",
      description: "Core CRM contacts/leads and pipeline stages",
      fields: [
        { name: "contact_id", type: "INT", description: "Primary key", is_primary_key: true },
        { name: "company_id", type: "INT", description: "Tenant/company scope", is_primary_key: false },
        { name: "name", type: "VARCHAR(255)", description: "Contact name", is_primary_key: false },
        { name: "email", type: "VARCHAR(255)", description: "Contact email", is_primary_key: false },
        { name: "status", type: "VARCHAR(255)", description: "Pipeline status", is_primary_key: false },
      ],
    },
  ];
};

const getDefaultInstructions = () => {
  return [
    "You are the analytics assistant for a CRM platform.",
    "Model the complete flow: LEAD -> MQL -> SQL -> OPPORTUNITY -> CUSTOMER -> EVANGELIST and DORMANT fallback.",
    "Prefer read-only SQL with explicit SELECT and safe filters.",
    "When dealing with employee-specific requests, scope by company_id first.",
    "When counting conversions, preserve stage semantics and avoid double-counting contacts.",
    "Schema truth: there is NO customers table. Customer means contacts rows with status = 'CUSTOMER'.",
    "Schema truth: deals has deal_value and opportunity_id; opportunities has opportunity_id and contact_id; contacts has contact_id and company_id.",
    "For tenant-scoped deal analytics, join deals -> opportunities -> contacts and filter contacts.company_id = tenant.",
    "Do not reference non-existent columns like customers.company_id or tables like customers unless they exist in schema_context.",
    "Never generate INSERT/UPDATE/DELETE/DDL statements.",
  ].join(" ");
};

export const health = async () => {
  return supportChatFetch("/health", { method: "GET", headers: {} });
};

export const createSession = async ({ queryType = "mysql", systemInstructions = "", companyId }) => {
  const dbUrl = buildSupportChatDbUrl(process.env.DATABASE_URL);
  const insecureDbUrl = buildInsecureSupportChatDbUrl(process.env.DATABASE_URL);
  const fullInstructions = [getDefaultInstructions(), systemInstructions].filter(Boolean).join(" ");

  // Primary path: let support-chat introspect DB directly when DB URL exists.
  if (dbUrl) {
    let activeDbUrl = dbUrl;

    try {
      return await supportChatFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          query_type: queryType,
          schema_context: [],
          db_url: activeDbUrl,
          system_instructions: fullInstructions,
        }),
      });
    } catch (error) {
      // Certificate-specific retry: keep encryption but skip CA verification when certs are unavailable.
      if (isCertificateVerifyError(error) && insecureDbUrl && insecureDbUrl !== activeDbUrl) {
        try {
          const insecureSession = await supportChatFetch("/sessions", {
            method: "POST",
            body: JSON.stringify({
              query_type: queryType,
              schema_context: [],
              db_url: insecureDbUrl,
              system_instructions: fullInstructions,
            }),
          });

          return {
            ...insecureSession,
            fallback_mode: "ssl_verify_disabled",
            fallback_reason: error.message,
          };
        } catch (insecureError) {
          if (!shouldFallbackToSchemaContext(insecureError)) {
            throw insecureError;
          }
          activeDbUrl = insecureDbUrl;
        }
      }

      if (!shouldFallbackToSchemaContext(error)) {
        throw error;
      }

      const schemaContext = await getSchemaContext(companyId);

      // Retry path: keep db_url and provide explicit schema_context to maximize chances
      // of successful execution even when remote auto-introspection is flaky.
      try {
        const hybrid = await supportChatFetch("/sessions", {
          method: "POST",
          body: JSON.stringify({
            query_type: queryType,
            schema_context: schemaContext,
            db_url: activeDbUrl,
            system_instructions: fullInstructions,
          }),
        });

        return {
          ...hybrid,
          fallback_mode: "schema_context_with_db_url",
          fallback_reason: error.message,
        };
      } catch (hybridError) {
        if (!shouldFallbackToSchemaContext(hybridError)) {
          throw hybridError;
        }
      }

      // Last-resort fallback: query-generation mode only.
      const fallbackInstructions = [
        fullInstructions,
        "Database auto-discovery failed, so operate in query-generation mode using provided schema_context.",
      ].join(" ");

      const fallback = await supportChatFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          query_type: queryType,
          schema_context: schemaContext,
          db_url: null,
          system_instructions: fallbackInstructions,
        }),
      });

      return {
        ...fallback,
        has_db_connection: false,
        fallback_mode: "schema_context",
        fallback_reason: error.message,
      };
    }
  }

  // Query-generation only mode when no DB URL is configured.
  const schemaContext = await getSchemaContext(companyId);
  return supportChatFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({
      query_type: queryType,
      schema_context: schemaContext,
      db_url: null,
      system_instructions: fullInstructions,
    }),
  });
};

export const getSession = async (sessionId) => {
  return supportChatFetch(`/sessions/${sessionId}`, { method: "GET", headers: {} });
};

export const getSessionHistory = async (sessionId) => {
  return supportChatFetch(`/sessions/${sessionId}/history`, { method: "GET", headers: {} });
};

export const deleteSession = async (sessionId) => {
  await supportChatFetch(`/sessions/${sessionId}`, { method: "DELETE", headers: {} });
};

export const sendMessage = async (sessionId, payload) => {
  return supportChatFetch(`/sessions/${sessionId}/chat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
