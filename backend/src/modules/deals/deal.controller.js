import * as dealService from "./deal.service.js";

/**
 * @desc   Create a Deal (Opportunity already marked as WON)
 * @route  POST /deals
 * @access Employee
 */
export const createDeal = async (req, res, next) => {
  try {
    const { opportunityId, dealValue } = req.body;

    if (!opportunityId || !dealValue) {
      return res.status(400).json({
        message: "opportunityId and dealValue are required",
      });
    }

    const dealId = await dealService.createDeal(
      opportunityId,
      req.user.empId,
      dealValue
    );

    res.status(201).json({
      message: "Deal created successfully",
      dealId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get Deal by ID
 * @route  GET /deals/:id
 * @access Employee
 */
export const getDealById = async (req, res, next) => {
  try {
    const deal = await dealService.getDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    res.json(deal);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all Deals for a Company
 * @route  GET /deals/company/:companyId
 * @access Employee
 */
export const getDealsByCompany = async (req, res, next) => {
  try {
    const deals = await dealService.getDealsByCompany(
      req.params.companyId
    );

    res.json(deals);
  } catch (error) {
    next(error);
  }
};
