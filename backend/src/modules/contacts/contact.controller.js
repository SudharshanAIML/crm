import * as contactService from "./contact.service.js";

/**
 * @desc   Create a new Lead (Employee action)
 * @route  POST /contacts
 * @access Employee
 */
export const createContact = async (req, res, next) => {
  try {
    // Use static company_id = 1 for now (default company)
    // In production, this should come from the authenticated user's company
    const DEFAULT_COMPANY_ID = 1;
    
    const data = {
      ...req.body,
      company_id: req.body.company_id || req.user?.companyId || DEFAULT_COMPANY_ID,
      assigned_emp_id: req.body.assigned_emp_id || req.user?.empId,
    };
    
    const contactId = await contactService.createLead(data);
    res.status(201).json({
      message: "Lead created and email sent successfully",
      contactId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get contacts by status (with optional filtering)
 * @route  GET /contacts?status=MQL&limit=50&offset=0
 * @access Employee
 */
export const getContactsByStatus = async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    // Use static company_id = 1 for now (default company)
    const DEFAULT_COMPANY_ID = 1;
    const companyId = req.user?.companyId || DEFAULT_COMPANY_ID;

    const contacts = await contactService.getContactsByStatus(
      companyId,
      status,
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get contact by ID
 * @route  GET /contacts/:id
 * @access Employee
 */
export const getContactById = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    res.json(contact);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update contact details
 * @route  PATCH /contacts/:id
 * @access Employee
 */
export const updateContact = async (req, res, next) => {
  try {
    await contactService.updateContact(req.params.id, req.body);
    res.json({ message: "Contact updated successfully" });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc   Internal endpoint for marketing automation
 *         Handles LEAD → MQL automatically
 * @route  POST /contacts/internal/lead-activity
 * @access Internal (Tracking Server)
 */
export const handleLeadActivity = async (req, res, next) => {
  try {
    await contactService.processLeadActivity(req.body);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Promote LEAD → MQL (Employee action)
 * @route  PATCH /contacts/:id/promote-mql
 * @access Employee
 */
export const promoteToMQL = async (req, res, next) => {
  try {
    await contactService.promoteToMQL(
      req.params.id,
      req.user.empId
    );

    res.json({ message: "Contact promoted to MQL successfully" });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc   Promote MQL → SQL (Employee action)
 * @route  PATCH /contacts/:id/promote-sql
 * @access Employee
 */
export const promoteToSQL = async (req, res, next) => {
  try {
    await contactService.promoteToSQL(
      req.params.id,
      req.user.empId // injected by auth middleware
    );

    res.json({ message: "Contact promoted to SQL successfully" });
  } catch (error) {
    next(error);
  }
};



/**
 * @desc   Promote SQL → Opportunity (Employee action)
 * @route  PATCH /contacts/:id/opportunity
 * @access Employee
 */

export const convertToOpportunity = async (req, res, next) => {
  try {
    const { expectedValue } = req.body;

    if (!expectedValue) {
      return res.status(400).json({
        message: "expectedValue is required",
      });
    }

    await contactService.convertToOpportunity(
      req.params.id,
      req.user.empId,
      expectedValue
    );

    res.json({
      message: "Contact converted to Opportunity successfully",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc   Close Opportunity → Customer
 * @route  POST /opportunities/:id/close
 * @access Employee
 */
export const closeDeal = async (req, res, next) => {
  try {
    const { dealValue, productName } = req.body;

    if (!dealValue) {
      return res.status(400).json({
        message: "dealValue is required",
      });
    }

    await contactService.closeDeal(
      req.params.id,   // contactId
      req.user.empId,
      dealValue,
      productName
    );

    res.json({
      message: "Deal closed and customer created successfully",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc   Convert Customer → Evangelist
 * @route  POST /contacts/:id/evangelist
 * @access System (or Admin)
 */
export const convertToEvangelist = async (req, res, next) => {
  try {
    await contactService.convertToEvangelist(req.params.id);

    res.json({
      message: "Customer converted to Evangelist successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all contacts with employee info (Admin)
 * @route  GET /contacts/admin/all
 * @access Admin
 */
export const getAllContactsAdmin = async (req, res, next) => {
  try {
    const { status, temperature, assignedEmpId, search, limit = 100, offset = 0 } = req.query;
    const DEFAULT_COMPANY_ID = 1;
    const companyId = req.user?.companyId || DEFAULT_COMPANY_ID;

    const contacts = await contactService.getAllContactsWithEmployeeInfo(
      companyId,
      {
        status,
        temperature,
        assignedEmpId: assignedEmpId ? parseInt(assignedEmpId) : null,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    );
    
    res.json(contacts);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get contact financial data (opportunities and deals)
 * @route  GET /contacts/:id/financials
 * @access Employee
 */
export const getContactFinancials = async (req, res, next) => {
  try {
    const financials = await contactService.getContactFinancials(req.params.id);
    res.json(financials);
  } catch (error) {
    next(error);
  }
};
