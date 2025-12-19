import * as companyRepo from "./company.repo.js";

/* ---------------------------------------------------
   CREATE COMPANY
--------------------------------------------------- */
export const createCompany = async (data) => {
  // Validate required fields
  if (!data.company_name) {
    throw new Error("Company name is required");
  }

  // Check if domain already exists (if provided)
  if (data.domain) {
    const existing = await companyRepo.getByDomain(data.domain);
    if (existing) {
      throw new Error("Company with this domain already exists");
    }
  }

  const companyId = await companyRepo.createCompany(data);
  return companyId;
};

/* ---------------------------------------------------
   GET COMPANY BY ID
--------------------------------------------------- */
export const getCompanyById = async (companyId) => {
  return await companyRepo.getById(companyId);
};

/* ---------------------------------------------------
   GET ALL COMPANIES
--------------------------------------------------- */
export const getAllCompanies = async (limit, offset) => {
  return await companyRepo.getAll(limit, offset);
};

/* ---------------------------------------------------
   UPDATE COMPANY
--------------------------------------------------- */
export const updateCompany = async (companyId, updates) => {
  const company = await companyRepo.getById(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  // Check domain uniqueness if being updated
  if (updates.domain && updates.domain !== company.domain) {
    const existing = await companyRepo.getByDomain(updates.domain);
    if (existing) {
      throw new Error("Company with this domain already exists");
    }
  }

  await companyRepo.updateCompany(companyId, updates);
};

/* ---------------------------------------------------
   DELETE COMPANY
--------------------------------------------------- */
export const deleteCompany = async (companyId) => {
  const company = await companyRepo.getById(companyId);
  if (!company) {
    throw new Error("Company not found");
  }

  await companyRepo.deleteCompany(companyId);
};

/* ---------------------------------------------------
   SEARCH COMPANIES
--------------------------------------------------- */
export const searchCompanies = async (query) => {
  if (!query || query.length < 2) {
    throw new Error("Search query must be at least 2 characters");
  }

  return await companyRepo.search(query);
};

/* ---------------------------------------------------
   GET COMPANY STATS
--------------------------------------------------- */
export const getCompanyStats = async () => {
  const totalCompanies = await companyRepo.countAll();
  return {
    totalCompanies,
  };
};
