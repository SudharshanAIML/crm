import jwt from "jsonwebtoken";
import * as supportChatService from "./supportChat.service.js";
import { db } from "../../config/db.js";

const SESSION_TOKEN_SECRET = process.env.SUPPORT_CHAT_SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_TOKEN_TTL = process.env.SUPPORT_CHAT_SESSION_TOKEN_TTL || "8h";
const SUPPORTED_QUERY_TYPES = new Set(["sql", "mysql", "postgresql", "sqlite", "mongodb", "pandas"]);
const MAX_SQL_LENGTH = 5000;
const MAX_RESULT_ROWS = 200;
const SQL_TIMEOUT_MS = 8000;
const MAX_SESSION_TITLE_LENGTH = 120;
const MAX_SESSION_PREVIEW_LENGTH = 240;

const WRITE_OR_DDL_PATTERN = /\b(insert|update|delete|replace|upsert|merge|alter|drop|truncate|create|rename|grant|revoke|call|execute|prepare|deallocate|set\s+global|set\s+session|lock|unlock)\b/i;
const DANGEROUS_SQL_PATTERN = /\b(union\s+select|into\s+outfile|into\s+dumpfile|load_file\s*\(|benchmark\s*\(|sleep\s*\(|or\s+1\s*=\s*1)\b/i;
const RESTRICTED_SCHEMA_PATTERN = /\b(information_schema|performance_schema|mysql|sys)\b/i;
const ANALYTICS_INTENT_PATTERN = /\b(show|list|count|how many|top|sum|total|average|avg|report|analytics|insight|pipeline|conversion|revenue|deal|customer|contact|task|session|opportunity)\b/i;
const RECOVERABLE_SQL_ERROR_PATTERN = /\b(unknown column|unknown table|doesn't exist|no such column|ambiguous column|you have an error in your sql syntax)\b/i;

const buildGuardrailInstructions = ({ companyId, empId, role }) => {
  return [
    `Tenant isolation is mandatory: only read rows where company_id = ${companyId} whenever that column exists.`,
    `Current user context: emp_id = ${empId}, role = ${role}.`,
    `Important schema mapping for this CRM: "customers" refers to contacts with status = 'CUSTOMER', not a separate customers table.`,
    "When querying deal_value by customer, join deals -> opportunities -> contacts and apply tenant filter on contacts.company_id.",
    "Never expose data from other companies or infer hidden records.",
    "Prefer aggregated summaries unless the user explicitly asks for row-level details.",
    `Never execute any write/DDL statements. If query would exceed ${MAX_RESULT_ROWS} rows, reduce scope or add LIMIT ${MAX_RESULT_ROWS}.`,
  ].join(" ");
};

const normalizeTitle = (value = "") => {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "New chat";
  return normalized.slice(0, MAX_SESSION_TITLE_LENGTH);
};

const isDefaultSessionTitle = (value = "") => {
  return normalizeTitle(value).toLowerCase() === "new chat";
};

const buildTitleFromMessage = (message = "") => {
  return normalizeTitle(String(message || "").slice(0, MAX_SESSION_TITLE_LENGTH));
};

const buildPreviewFromMessage = (message = "") => {
  return String(message || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SESSION_PREVIEW_LENGTH);
};

const createOrRestoreSessionMeta = async ({ companyId, empId, sessionId, queryType, hasDbConnection, fallbackMode, fallbackReason }) => {
  await db.query(
    `
      INSERT INTO assistant_chat_sessions (
        company_id,
        emp_id,
        support_chat_session_id,
        query_type,
        has_db_connection,
        fallback_mode,
        fallback_reason,
        title,
        last_message_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'New chat', NOW())
      ON DUPLICATE KEY UPDATE
        deleted_at = NULL,
        query_type = VALUES(query_type),
        has_db_connection = VALUES(has_db_connection),
        fallback_mode = VALUES(fallback_mode),
        fallback_reason = VALUES(fallback_reason),
        updated_at = CURRENT_TIMESTAMP
    `,
    [companyId, empId, sessionId, queryType, hasDbConnection ? 1 : 0, fallbackMode || null, fallbackReason || null]
  );
};

const getSessionMeta = async ({ companyId, empId, sessionId }) => {
  const [rows] = await db.query(
    `
      SELECT
        support_chat_session_id,
        title,
        query_type,
        has_db_connection,
        fallback_mode,
        fallback_reason,
        created_at,
        updated_at,
        last_message_at,
        last_message_preview
      FROM assistant_chat_sessions
      WHERE company_id = ?
        AND emp_id = ?
        AND support_chat_session_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [companyId, empId, sessionId]
  );

  return rows[0] || null;
};

const touchSessionMetaAfterMessage = async ({ companyId, empId, sessionId, message }) => {
  const current = await getSessionMeta({ companyId, empId, sessionId });
  if (!current) return;

  const preview = buildPreviewFromMessage(message);
  const nextTitle = isDefaultSessionTitle(current.title) ? buildTitleFromMessage(message) : current.title;

  await db.query(
    `
      UPDATE assistant_chat_sessions
      SET
        title = ?,
        last_message_preview = ?,
        last_message_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = ?
        AND emp_id = ?
        AND support_chat_session_id = ?
        AND deleted_at IS NULL
    `,
    [nextTitle, preview || null, companyId, empId, sessionId]
  );
};

const stripSqlComments = (sql = "") => {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim();
};

const normalizeSql = (sql = "") => {
  const withoutComments = stripSqlComments(sql);
  return withoutComments.replace(/\s+/g, " ").trim();
};

const extractGeneratedSql = (assistantResponse) => {
  const direct = String(assistantResponse?.query || "").trim();
  if (direct) return direct;

  const nested = String(assistantResponse?.response?.query || "").trim();
  return nested;
};

const hasTenantScope = (sql, companyId) => {
  const normalized = normalizeSql(sql).toLowerCase();
  const exactValue = String(Number(companyId));

  const directPattern = new RegExp(`\\b(?:[a-z_][a-z0-9_]*\\.)?company_id\\s*=\\s*${exactValue}\\b`, "i");
  return directPattern.test(normalized);
};

const shouldAllowExecutionForMessage = (message) => {
  return ANALYTICS_INTENT_PATTERN.test(String(message || ""));
};

const validateSqlOrThrow = ({ sql, companyId }) => {
  const normalized = normalizeSql(sql);
  if (!normalized) {
    const error = new Error("Assistant did not generate a SQL query.");
    error.statusCode = 422;
    throw error;
  }

  if (normalized.length > MAX_SQL_LENGTH) {
    const error = new Error("Generated SQL is too long and was blocked for safety.");
    error.statusCode = 400;
    throw error;
  }

  if (!/^(select|with)\b/i.test(normalized)) {
    const error = new Error("Only read-only SELECT queries are allowed.");
    error.statusCode = 400;
    throw error;
  }

  // Reject multi-statement payloads. A single trailing semicolon is allowed.
  const trimmed = normalized.replace(/;+$/, "");
  if (trimmed.includes(";")) {
    const error = new Error("Multiple SQL statements are not allowed.");
    error.statusCode = 400;
    throw error;
  }

  if (WRITE_OR_DDL_PATTERN.test(trimmed)) {
    const error = new Error("Unsafe SQL command blocked by guardrails.");
    error.statusCode = 400;
    throw error;
  }

  if (DANGEROUS_SQL_PATTERN.test(trimmed)) {
    const error = new Error("Potentially unsafe SQL pattern blocked by guardrails.");
    error.statusCode = 400;
    throw error;
  }

  if (RESTRICTED_SCHEMA_PATTERN.test(trimmed)) {
    const error = new Error("System-schema access is blocked by guardrails.");
    error.statusCode = 403;
    throw error;
  }

  if (!hasTenantScope(trimmed, companyId)) {
    const error = new Error("Tenant filter is missing. Query must include company_id scope.");
    error.statusCode = 403;
    throw error;
  }

  if (!/\blimit\s+\d+\b/i.test(trimmed) && !/\b(count|sum|avg|min|max)\s*\(/i.test(trimmed)) {
    const error = new Error(`Query blocked: include LIMIT (<= ${MAX_RESULT_ROWS}) for non-aggregate reads.`);
    error.statusCode = 400;
    throw error;
  }

  const limitMatch = trimmed.match(/\blimit\s+(\d+)\b/i);
  if (limitMatch && Number(limitMatch[1]) > MAX_RESULT_ROWS) {
    const error = new Error(`Query blocked: LIMIT cannot exceed ${MAX_RESULT_ROWS}.`);
    error.statusCode = 400;
    throw error;
  }

  return trimmed;
};

const executeSafeSql = async (sql) => {
  const executionPromise = db.query(sql);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const timeoutError = new Error("Query timed out and was blocked by guardrails.");
      timeoutError.statusCode = 408;
      reject(timeoutError);
    }, SQL_TIMEOUT_MS);
  });

  const [rows] = await Promise.race([executionPromise, timeoutPromise]);
  if (Array.isArray(rows) && rows.length > MAX_RESULT_ROWS) {
    return rows.slice(0, MAX_RESULT_ROWS);
  }
  return rows;
};

const isRecoverableSqlExecutionError = (error) => {
  if (!error) return false;
  const mysqlCode = String(error.code || "").toUpperCase();
  if (["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE", "ER_PARSE_ERROR", "ER_NON_UNIQ_ERROR", "ER_BAD_TABLE_ERROR"].includes(mysqlCode)) {
    return true;
  }

  return RECOVERABLE_SQL_ERROR_PATTERN.test(String(error.message || ""));
};

const buildSchemaSnapshot = async () => {
  const [rows] = await db.query(
    `
      SELECT
        c.table_name,
        c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
      WHERE c.table_schema = DATABASE()
        AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name ASC, c.ordinal_position ASC
      LIMIT 1200
    `
  );

  const grouped = new Map();
  for (const row of rows) {
    const table = String(row.table_name || "").trim();
    const column = String(row.column_name || "").trim();
    if (!table || !column) continue;
    if (!grouped.has(table)) grouped.set(table, []);
    const cols = grouped.get(table);
    if (cols.length < 40) cols.push(column);
  }

  return Array.from(grouped.entries())
    .slice(0, 40)
    .map(([table, cols]) => `${table}(${cols.join(", ")})`)
    .join("; ");
};

const buildRepairPrompt = ({ message, failedSql, sqlError, companyId, schemaSnapshot }) => {
  return [
    message,
    "",
    "The previous SQL failed. Regenerate ONLY a corrected read-only SQL query.",
    `Failed SQL: ${failedSql}`,
    `Error: ${sqlError}`,
    `Tenant rule: enforce company_id = ${companyId}.`,
    "Schema snapshot (table(columns)): ",
    schemaSnapshot || "No schema snapshot available.",
  ].join("\n");
};

const signSessionToken = ({ sessionId, companyId, empId, queryType }) => {
  return jwt.sign(
    {
      sid: sessionId,
      cid: companyId,
      eid: empId,
      qt: queryType,
      typ: "assistant_session",
    },
    SESSION_TOKEN_SECRET,
    { expiresIn: SESSION_TOKEN_TTL }
  );
};

const verifySessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, SESSION_TOKEN_SECRET);
    if (decoded?.typ !== "assistant_session" || !decoded?.sid) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const resolveSessionId = (sessionToken, reqUser) => {
  const decoded = verifySessionToken(sessionToken);
  if (!decoded) {
    const error = new Error("Invalid or expired assistant session token");
    error.statusCode = 401;
    throw error;
  }

  if (decoded.cid !== reqUser.companyId || decoded.eid !== reqUser.empId) {
    const error = new Error("Assistant session does not belong to this user");
    error.statusCode = 403;
    throw error;
  }

  return decoded.sid;
};

export const health = async (_req, res, next) => {
  try {
    const status = await supportChatService.health();
    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const [rows] = await db.query(
      `
        SELECT
          support_chat_session_id,
          title,
          query_type,
          has_db_connection,
          fallback_mode,
          fallback_reason,
          created_at,
          updated_at,
          last_message_at,
          last_message_preview
        FROM assistant_chat_sessions
        WHERE company_id = ?
          AND emp_id = ?
          AND deleted_at IS NULL
        ORDER BY COALESCE(last_message_at, created_at) DESC, support_chat_session_id DESC
        LIMIT 200
      `,
      [companyId, empId]
    );

    const sessions = rows.map((row) => ({
      sessionToken: signSessionToken({
        sessionId: row.support_chat_session_id,
        companyId,
        empId,
        queryType: row.query_type || "mysql",
      }),
      title: normalizeTitle(row.title),
      queryType: row.query_type,
      hasDbConnection: Boolean(row.has_db_connection),
      fallbackMode: row.fallback_mode || null,
      fallbackReason: row.fallback_reason || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview || "",
    }));

    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req, res, next) => {
  try {
    const { companyId, empId, role } = req.user;
    const requestedType = String(req.body?.queryType || "mysql").toLowerCase();

    if (!SUPPORTED_QUERY_TYPES.has(requestedType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported queryType",
      });
    }

    const userInstructions = String(req.body?.systemInstructions || "").trim();
    const systemInstructions = [
      buildGuardrailInstructions({ companyId, empId, role }),
      userInstructions,
    ]
      .filter(Boolean)
      .join(" ");

    const session = await supportChatService.createSession({
      queryType: requestedType,
      systemInstructions,
      companyId,
    });

    const sessionToken = signSessionToken({
      sessionId: session.session_id,
      companyId,
      empId,
      queryType: requestedType,
    });

    await createOrRestoreSessionMeta({
      companyId,
      empId,
      sessionId: session.session_id,
      queryType: session.query_type || requestedType,
      hasDbConnection: Boolean(session.has_db_connection),
      fallbackMode: session.fallback_mode || null,
      fallbackReason: session.fallback_reason || null,
    });

    res.status(201).json({
      success: true,
      sessionToken,
      session: {
        queryType: session.query_type,
        createdAt: session.created_at,
        hasDbConnection: Boolean(session.has_db_connection),
        fallbackMode: session.fallback_mode || null,
        fallbackReason: session.fallback_reason || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const session = await supportChatService.getSession(sessionId);
    const meta = await getSessionMeta({
      companyId: req.user.companyId,
      empId: req.user.empId,
      sessionId,
    });

    res.json({
      success: true,
      session: {
        queryType: session.query_type,
        title: meta?.title ? normalizeTitle(meta.title) : "New chat",
        createdAt: session.created_at,
        messageCount: session.message_count,
        hasDbConnection: Boolean(session.has_db_connection),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const history = await supportChatService.getSessionHistory(sessionId);

    res.json({
      success: true,
      sessionToken: req.params.sessionToken,
      messages: history.messages || [],
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const companyId = req.user.companyId;
    const empId = req.user.empId;
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "message is too long" });
    }

    const requestedExecution = Boolean(req.body?.executeQuery);
    const generateInsight = Boolean(req.body?.generateInsight);
    const allowExecution = requestedExecution && shouldAllowExecutionForMessage(message);

    // Step 1: ask support-chat to generate SQL only (never execute upstream).
    const generated = await supportChatService.sendMessage(sessionId, {
      message,
      execute_query: false,
      generate_insight: generateInsight,
      query_result: req.body?.queryResult ?? null,
    });

    if (!allowExecution) {
      await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });
      return res.json({ success: true, response: generated });
    }

    // Step 2: validate generated SQL against hard guardrails.
    const generatedSql = extractGeneratedSql(generated);
    let safeSql = validateSqlOrThrow({ sql: generatedSql, companyId });

    // Step 3: execute locally with timeout + bounded rows.
    let queryResult;
    try {
      queryResult = await executeSafeSql(safeSql);
    } catch (executionError) {
      if (!isRecoverableSqlExecutionError(executionError)) {
        throw executionError;
      }

      const schemaSnapshot = await buildSchemaSnapshot();
      const repairPrompt = buildRepairPrompt({
        message,
        failedSql: safeSql,
        sqlError: executionError.message,
        companyId,
        schemaSnapshot,
      });

      const repaired = await supportChatService.sendMessage(sessionId, {
        message: repairPrompt,
        execute_query: false,
        generate_insight: false,
        query_result: null,
      });

      const repairedSql = extractGeneratedSql(repaired);
      safeSql = validateSqlOrThrow({ sql: repairedSql, companyId });
      queryResult = await executeSafeSql(safeSql);
    }

    // Step 4: ask support-chat to provide a user-facing explanation from safe result.
    const summarized = await supportChatService.sendMessage(sessionId, {
      message,
      execute_query: false,
      generate_insight: generateInsight,
      query_result: queryResult,
    });

    await touchSessionMetaAfterMessage({ companyId, empId, sessionId, message });

    res.json({
      success: true,
      response: {
        ...summarized,
        query: safeSql,
        query_result: queryResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const renameSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    const title = normalizeTitle(req.body?.title || "");

    const [result] = await db.query(
      `
        UPDATE assistant_chat_sessions
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE support_chat_session_id = ?
          AND company_id = ?
          AND emp_id = ?
          AND deleted_at IS NULL
      `,
      [title, sessionId, req.user.companyId, req.user.empId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, session: { title } });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);

    try {
      await supportChatService.deleteSession(sessionId);
    } catch {
      // Ignore upstream delete failures so users can still clear stale sessions from CRM.
    }

    await db.query(
      `
        UPDATE assistant_chat_sessions
        SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
        WHERE support_chat_session_id = ?
          AND company_id = ?
          AND emp_id = ?
          AND deleted_at IS NULL
      `,
      [sessionId, req.user.companyId, req.user.empId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
