import * as dealRepo from "./deal.repo.js";
import * as opportunityRepo from "../opportunities/opportunity.repo.js";
import * as contactRepo from "../contacts/contact.repo.js";

/* ---------------------------------------------------
   CREATE DEAL (Opportunity → WON → Deal)
--------------------------------------------------- */
export const createDeal = async (
  opportunityId,
  empId,
  dealValue
) => {
  const opportunity =
    await opportunityRepo.getById(opportunityId);

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  if (opportunity.status !== "WON") {
    throw new Error(
      "Deal can only be created for WON opportunities"
    );
  }

  // Ensure deal is not already created
  const existingDeal =
    await dealRepo.getByOpportunityId(opportunityId);

  if (existingDeal) {
    throw new Error("Deal already exists for this opportunity");
  }

  // Create deal (final revenue lock)
  const dealId = await dealRepo.createDeal({
    opportunity_id: opportunityId,
    deal_value: dealValue,
    closed_by: empId,
  });

  return dealId;
};

/* ---------------------------------------------------
   GET DEAL BY ID
--------------------------------------------------- */
export const getDealById = async (dealId) => {
  return await dealRepo.getById(dealId);
};

/* ---------------------------------------------------
   GET DEALS BY COMPANY
--------------------------------------------------- */
export const getDealsByCompany = async (companyId) => {
  return await dealRepo.getByCompany(companyId);
};
