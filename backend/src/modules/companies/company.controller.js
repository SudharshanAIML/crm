import * as companyService from "./company.service.js";

/**
 * @desc   Create a new company
 * @route  POST /companies
 * @access Admin
 */
export const createCompany = async (req, res, next) => {
  try {
    const companyId = await companyService.createCompany(req.body);

    res.status(201).json({
      message: "Company created successfully",
      companyId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get company by ID
 * @route  GET /companies/:id
 * @access Employee
 */
export const getCompanyById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all companies
 * @route  GET /companies
 * @access Employee
 */
export const getAllCompanies = async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const companies = await companyService.getAllCompanies(
      parseInt(limit),
      parseInt(offset)
    );

    res.json(companies);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Search companies
 * @route  GET /companies/search
 * @access Employee
 */
export const searchCompanies = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const companies = await companyService.searchCompanies(q);

    res.json(companies);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update company
 * @route  PATCH /companies/:id
 * @access Admin
 */
export const updateCompany = async (req, res, next) => {
  try {
    await companyService.updateCompany(req.params.id, req.body);

    res.json({
      message: "Company updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete company
 * @route  DELETE /companies/:id
 * @access Admin
 */
export const deleteCompany = async (req, res, next) => {
  try {
    await companyService.deleteCompany(req.params.id);

    res.json({
      message: "Company deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get company stats
 * @route  GET /companies/stats
 * @access Admin
 */
export const getCompanyStats = async (req, res, next) => {
  try {
    const stats = await companyService.getCompanyStats();

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get current user's company (for currency/settings)
 * @route  GET /companies/my-company
 * @access Employee
 */
export const getMyCompany = async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(404).json({
        message: "No company associated with this account",
        country: null,
      });
    }

    const company = await companyService.getCompanyById(companyId);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        country: null,
      });
    }

    // Return only necessary fields for currency/settings
    res.json({
      company_id: company.company_id,
      company_name: company.company_name,
      country: company.country,
      domain: company.domain,
    });
  } catch (error) {
    next(error);
  }
};
