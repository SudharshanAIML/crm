/**
 * CRM Event Bus
 *
 * A lightweight, synchronous-safe EventEmitter that decouples CRM domain
 * events from the automation engine.  Every module emits events here; the
 * automation engine subscribes once and evaluates matching workflows.
 *
 * Design goals:
 *  - Zero coupling between feature modules and the automation engine.
 *  - Fire-and-forget: emitters never await or catch; execution is async.
 *  - Namespaced events:  "contact.created", "deal.stage_changed", etc.
 */

import { EventEmitter } from "events";

class CRMEventBus extends EventEmitter {
  constructor() {
    super();
    // High limit — automations may register many listeners
    this.setMaxListeners(200);
  }

  /**
   * Emit a CRM event.  Always includes companyId for tenant isolation.
   *
   * @param {string} eventName  e.g. "contact.created"
   * @param {object} payload    { companyId, entityId, data, empId?, ... }
   */
  emitCRM(eventName, payload) {
    if (!payload || !payload.companyId) {
      console.warn(`[EventBus] Missing companyId in event "${eventName}" — skipped`);
      return;
    }
    // Async emit so emitter is never blocked
    setImmediate(() => {
      try {
        this.emit(eventName, payload);
      } catch (err) {
        console.error(`[EventBus] Error handling "${eventName}":`, err);
      }
    });
  }
}

// Singleton
const eventBus = new CRMEventBus();
export default eventBus;

/* =====================================================
   STANDARD EVENT NAMES (used by modules + engine)
===================================================== */

export const CRM_EVENTS = {
  // Contact lifecycle
  CONTACT_CREATED:       "contact.created",
  CONTACT_UPDATED:       "contact.updated",
  CONTACT_STATUS_CHANGED:"contact.status_changed",

  // Deal / Opportunity
  DEAL_STAGE_CHANGED:    "deal.stage_changed",
  DEAL_WON:              "deal.won",
  DEAL_LOST:             "deal.lost",

  // Sessions
  SESSION_CREATED:       "session.created",

  // Email
  EMAIL_OPENED:          "email.opened",
  EMAIL_CLICKED:         "email.clicked",

  // Feedback
  FEEDBACK_SUBMITTED:    "feedback.submitted",

  // Task
  TASK_CREATED:          "task.created",
};
