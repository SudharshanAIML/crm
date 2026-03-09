import * as service from "./emailTemplate.service.js";

/* ---------------------------------------------------
   CREATE TEMPLATE
   POST /api/email-templates
--------------------------------------------------- */
export const create = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const { name, subject, body, category, targetStage } = req.body;

    const template = await service.createTemplate({
      companyId,
      empId,
      name,
      subject,
      body,
      category,
      targetStage,
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   LIST TEMPLATES
   GET /api/email-templates
--------------------------------------------------- */
export const list = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { category, targetStage, search, includeInactive } = req.query;

    const templates = await service.listTemplates(companyId, {
      category,
      targetStage,
      search,
      activeOnly: includeInactive !== "true",
    });

    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   GET SINGLE TEMPLATE
   GET /api/email-templates/:id
--------------------------------------------------- */
export const getById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const template = await service.getTemplate(parseInt(req.params.id), companyId);
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   UPDATE TEMPLATE
   PUT /api/email-templates/:id
--------------------------------------------------- */
export const update = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const templateId = parseInt(req.params.id);
    const updated = await service.updateTemplate(templateId, companyId, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   DELETE TEMPLATE
   DELETE /api/email-templates/:id
--------------------------------------------------- */
export const remove = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    await service.deleteTemplate(parseInt(req.params.id), companyId);
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   DUPLICATE TEMPLATE
   POST /api/email-templates/:id/duplicate
--------------------------------------------------- */
export const duplicate = async (req, res, next) => {
  try {
    const { companyId, empId } = req.user;
    const template = await service.duplicateTemplate(
      parseInt(req.params.id),
      companyId,
      empId
    );
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   PREVIEW TEMPLATE (with interpolated variables)
   POST /api/email-templates/:id/preview
--------------------------------------------------- */
export const preview = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const result = await service.previewTemplate(
      parseInt(req.params.id),
      companyId,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   GET AVAILABLE VARIABLES
   GET /api/email-templates/variables
--------------------------------------------------- */
export const getVariables = async (_req, res, next) => {
  try {
    const variables = service.getVariables();
    res.json({ success: true, data: variables });
  } catch (err) {
    next(err);
  }
};
