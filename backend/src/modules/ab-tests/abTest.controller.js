import * as abTestService from "./abTest.service.js";

/* =====================================================
   A/B TEST CRUD
===================================================== */

/**
 * @desc   Create a new A/B test
 * @route  POST /api/ab-tests
 */
export const create = async (req, res, next) => {
  try {
    const test = await abTestService.createTest({
      companyId: req.user.companyId,
      empId: req.user.empId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   List A/B tests
 * @route  GET /api/ab-tests
 */
export const list = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const tests = await abTestService.listTests(req.user.companyId, { status, search });
    res.json({ success: true, data: tests });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single A/B test
 * @route  GET /api/ab-tests/:id
 */
export const getById = async (req, res, next) => {
  try {
    const test = await abTestService.getTest(req.params.id, req.user.companyId);
    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update A/B test (DRAFT only)
 * @route  PUT /api/ab-tests/:id
 */
export const update = async (req, res, next) => {
  try {
    const test = await abTestService.updateTest(req.params.id, req.user.companyId, req.body);
    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete A/B test
 * @route  DELETE /api/ab-tests/:id
 */
export const remove = async (req, res, next) => {
  try {
    await abTestService.deleteTest(req.params.id, req.user.companyId);
    res.json({ success: true, message: "A/B test deleted" });
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   SEND
===================================================== */

/**
 * @desc   Send an A/B test to contacts
 * @route  POST /api/ab-tests/:id/send
 * @body   { contactIds: number[] }
 */
export const send = async (req, res, next) => {
  try {
    const { contactIds } = req.body;
    if (!Array.isArray(contactIds) || !contactIds.length) {
      return res.status(400).json({ success: false, message: "contactIds array is required" });
    }
    const result = await abTestService.sendTest(
      req.params.id,
      req.user.companyId,
      req.user.empId,
      contactIds
    );
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === "EMAIL_NOT_CONNECTED") {
      return res.status(400).json({ success: false, message: "Gmail account not connected" });
    }
    next(error);
  }
};

/* =====================================================
   RESULTS / RECIPIENTS
===================================================== */

/**
 * @desc   Get A/B test results with analytics
 * @route  GET /api/ab-tests/:id/results
 */
export const getResults = async (req, res, next) => {
  try {
    const results = await abTestService.getResults(req.params.id, req.user.companyId);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

/* =====================================================
   PUBLIC TRACKING ENDPOINTS (no auth)
===================================================== */

/**
 * @desc   Track email open (1x1 pixel)
 * @route  GET /api/ab-track/open/:token
 * @access Public
 */
export const trackOpen = async (req, res) => {
  try {
    await abTestService.trackOpen(req.params.token);
  } catch {
    // Tracking should never fail visibly
  }

  // Always return the pixel
  const transparentPixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.end(transparentPixel);
};

/**
 * @desc   Track link click + redirect
 * @route  GET /api/ab-track/click/:token
 * @access Public
 */
export const trackClick = async (req, res) => {
  const url = req.query.url;

  try {
    await abTestService.trackClick(req.params.token, url);
  } catch {
    // Tracking should never fail visibly
  }

  // Redirect to the original URL
  const redirectUrl = url || process.env.LANDING_PAGE_URL || "https://example.com";
  res.redirect(redirectUrl);
};
