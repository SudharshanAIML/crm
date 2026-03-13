import jwt from "jsonwebtoken";
import * as supportChatService from "./supportChat.service.js";

const SESSION_TOKEN_SECRET = process.env.SUPPORT_CHAT_SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_TOKEN_TTL = process.env.SUPPORT_CHAT_SESSION_TOKEN_TTL || "8h";
const SUPPORTED_QUERY_TYPES = new Set(["sql", "mysql", "postgresql", "sqlite", "mongodb", "pandas"]);

const buildGuardrailInstructions = ({ companyId, empId, role }) => {
  return [
    `Tenant isolation is mandatory: only read rows where company_id = ${companyId} whenever that column exists.`,
    `Current user context: emp_id = ${empId}, role = ${role}.`,
    `Important schema mapping for this CRM: "customers" refers to contacts with status = 'CUSTOMER', not a separate customers table.`,
    "When querying deal_value by customer, join deals -> opportunities -> contacts and apply tenant filter on contacts.company_id.",
    "Never expose data from other companies or infer hidden records.",
    "Prefer aggregated summaries unless the user explicitly asks for row-level details.",
  ].join(" ");
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

    res.json({
      success: true,
      session: {
        queryType: session.query_type,
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
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "message is too long" });
    }

    const result = await supportChatService.sendMessage(sessionId, {
      message,
      execute_query: Boolean(req.body?.executeQuery),
      generate_insight: Boolean(req.body?.generateInsight),
      query_result: req.body?.queryResult ?? null,
    });

    res.json({ success: true, response: result });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = resolveSessionId(req.params.sessionToken, req.user);
    await supportChatService.deleteSession(sessionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
