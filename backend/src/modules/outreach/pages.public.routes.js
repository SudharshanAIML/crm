/**
 * Public Routes for Outreach Pages
 * These routes are accessible without authentication
 * for viewing published pages and submitting forms
 */
import { Router } from "express";
import * as pagesController from "./pages.controller.js";
import * as formResponsesController from "./formResponses.controller.js";

const router = Router();

/**
 * @route   GET /public/p/:slug
 * @desc    Get published page by slug (simplified route)
 * @access  Public
 */
router.get(
  "/p/:slug",
  pagesController.getPublicPageBySlug
);

/**
 * @route   POST /public/p/:slug/submit
 * @desc    Submit form response to a page
 * @access  Public
 */
router.post(
  "/p/:slug/submit",
  formResponsesController.submitFormBySlug
);

/**
 * @route   GET /public/pages/:companyId/:pageSlug
 * @desc    Get published page by company and slug
 * @access  Public
 */
router.get(
  "/pages/:companyId/:pageSlug",
  pagesController.getPublicPage
);

/**
 * @route   GET /public/pages/t/:token
 * @desc    Get page by personalized access token
 * @access  Public
 */
router.get(
  "/pages/t/:token",
  pagesController.getPageByToken
);

/**
 * @route   POST /public/pages/:pageId/forms/:componentId/submit
 * @desc    Submit form response
 * @access  Public
 */
router.post(
  "/pages/:pageId/forms/:componentId/submit",
  formResponsesController.submitForm
);

export default router;
