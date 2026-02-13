import { Router } from "express";
import * as appointmentController from "./appointment.controller.js";
import { authenticateEmployee } from "../../middlewares/auth.middleware.js";

const router = Router();

/* ---------------------------------------------------
   PUBLIC ROUTES (Token-based authentication)
--------------------------------------------------- */
router.get("/accept/:token", appointmentController.acceptAppointment);

/* ---------------------------------------------------
   EMPLOYEE ROUTES (Session-based authentication)
--------------------------------------------------- */
router.get("/status/:taskId", authenticateEmployee, appointmentController.getAppointmentStatus);
router.put("/status/:taskId", authenticateEmployee, appointmentController.updateAppointmentStatusByEmployee);

export default router;
