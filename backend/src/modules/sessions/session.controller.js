import * as sessionService from "./session.service.js";

/**
 * @desc   Create a new session (MQL or SQL)
 * @route  POST /sessions
 * @access Employee
 */
export const createSession = async (req, res, next) => {
  try {
    const {
      contactId,
      stage,
      sessionNo,
      rating,
      sessionStatus,
      remarks,
    } = req.body;

    if (!contactId || !stage || !sessionNo || !sessionStatus) {
      return res.status(400).json({
        message:
          "contactId, stage, sessionNo, and sessionStatus are required",
      });
    }

    await sessionService.createSession({
      contactId,
      empId: req.user.empId, // injected by auth middleware
      stage,
      sessionNo,
      rating,
      sessionStatus,
      remarks,
    });

    res.status(201).json({
      message: "Session created successfully",
      sessionId: sessionNo.session_id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all sessions for a contact
 * @route  GET /sessions/contact/:contactId
 * @access Employee
 */
export const getSessionsByContact = async (req, res, next) => {
  try {
    const sessions = await sessionService.getSessionsByContact(
      req.params.contactId
    );

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get sessions for a contact by stage (MQL / SQL)
 * @route  GET /sessions/contact/:contactId/:stage
 * @access Employee
 */
export const getSessionsByStage = async (req, res, next) => {
  try {
    const { contactId, stage } = req.params;

    if (!["MQL", "SQL"].includes(stage)) {
      return res.status(400).json({
        message: "Stage must be MQL or SQL",
      });
    }

    const sessions = await sessionService.getSessionsByStage(
      contactId,
      stage
    );

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update a session (rating / status / remarks)
 * @route  PATCH /sessions/:id
 * @access Employee
 */
export const updateSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    await sessionService.updateSession(sessionId, req.body);

    res.json({
      message: "Session updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete a session
 * @route  DELETE /sessions/:id
 * @access Employee / Admin
 */
export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    await sessionService.deleteSession(sessionId);

    res.json({
      message: "Session deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
