import crypto from "crypto";
import * as contactRepo from "./contact.repo.js";
import * as sessionRepo from "../sessions/session.repo.js";
import * as opportunityRepo from "../opportunities/opportunity.repo.js";
import * as dealRepo from "../deals/deal.repo.js";
import * as feedbackRepo from "../feedback/feedback.repo.js";
import { sendLeadEmail } from "../emails/email.service.js";
import eventBus, { CRM_EVENTS } from "../../services/eventBus.service.js";

/* ---------------------------------------------------
   HELPER: UPDATE CONTACT TEMPERATURE BASED ON RATING
--------------------------------------------------- */
const updateContactTemperature = async (contactId) => {
  const avgRating = await sessionRepo.getOverallAverageRating(contactId);
  
  let temperature = 'COLD';
  if (avgRating >= 8) {
    temperature = 'HOT';
  } else if (avgRating >= 6) {
    temperature = 'WARM';
  }
  
  await contactRepo.updateTemperature(contactId, temperature);
  return temperature;
};

/* ---------------------------------------------------
   CREATE LEAD (Employee)
   Accepts optional status to allow adding contacts directly to any stage
--------------------------------------------------- */
export const createLead = async (data) => {
  // Use provided status or default to "LEAD"
  const status = data.status || "LEAD";
  
  const contactId = await contactRepo.createContact({
    ...data,
    status,
  });

  // Generate tracking token
  const token = crypto.randomUUID();
  await contactRepo.saveTrackingToken(contactId, token);

  // Send personalized email with company branding and employee info
  await sendLeadEmail({
    contactId,
    name: data.name,
    email: data.email,
    token,
    empId: data.assigned_emp_id || null,
    companyId: data.company_id || null,
  });

  // Emit automation event
  eventBus.emitCRM(CRM_EVENTS.CONTACT_CREATED, {
    companyId: data.company_id,
    entityId: contactId,
    empId: data.assigned_emp_id || null,
    data: { ...data, contact_id: contactId, status },
  });

  return contactId;
};

/* ---------------------------------------------------
   GET CONTACT
--------------------------------------------------- */
export const getContactById = async (id) => {
  return await contactRepo.getById(id);
};

/* ---------------------------------------------------
   UPDATE CONTACT
--------------------------------------------------- */
export const updateContact = async (contactId, updates) => {
  const before = await contactRepo.getById(contactId);
  await contactRepo.updateContact(contactId, updates);
  if (before) {
    eventBus.emitCRM(CRM_EVENTS.CONTACT_UPDATED, {
      companyId: before.company_id,
      entityId: contactId,
      empId: before.assigned_emp_id,
      data: { ...before, ...updates, contact_id: contactId },
    });
  }
};

/* ---------------------------------------------------
   CREATE SESSION AND UPDATE TEMPERATURE
--------------------------------------------------- */
export const createSessionAndUpdateTemperature = async (sessionData) => {
  // Create the session
  const sessionId = await sessionRepo.createSession(sessionData);
  
  // Update contact temperature based on new average rating
  await updateContactTemperature(sessionData.contact_id);
  
  return sessionId;
};

/* ---------------------------------------------------
   GET CONTACTS BY STATUS
--------------------------------------------------- */
export const getContactsByStatus = async (companyId, status, limit = 50, offset = 0) => {
  if (status) {
    return await contactRepo.getByStatus(status, companyId);
  }
  return await contactRepo.getAll(companyId, limit, offset);
};

/* ---------------------------------------------------
   SEARCH CONTACTS GLOBALLY (ALL STAGES)
--------------------------------------------------- */
export const searchContacts = async (companyId, searchTerm, limit = 20) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  return await contactRepo.searchContacts(companyId, searchTerm.trim(), limit);
};

/* ---------------------------------------------------
   GET ALL CONTACTS WITH EMPLOYEE INFO (ADMIN)
--------------------------------------------------- */
export const getAllContactsWithEmployeeInfo = async (companyId, filters = {}) => {
  return await contactRepo.getAllWithEmployeeInfo(companyId, filters);
};

/* ---------------------------------------------------
   SYSTEM: LEAD → MQL (Marketing Automation)
--------------------------------------------------- */
export const processLeadActivity = async ({ contactId, token }) => {
  const contact = await contactRepo.getById(contactId);
  if (!contact) return;

  // Security check
  if (contact.tracking_token !== token) return;

  // Increase interest score
  await contactRepo.incrementInterestScore(contactId);

  // Auto promote
  if (contact.status === "LEAD") {
    await contactRepo.updateStatus(contactId, "MQL");
    await contactRepo.insertStatusHistory(
      contactId,
      "LEAD",
      "MQL",
      null // system
    );
    eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
      companyId: contact.company_id,
      entityId: contactId,
      data: { ...contact, contact_id: contactId, status: "MQL", previous_status: "LEAD" },
    });
  }
};

/* ---------------------------------------------------
   EMPLOYEE: LEAD → MQL (Manual Promotion)
--------------------------------------------------- */
export const promoteToMQL = async (contactId, empId) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (contact.status !== "LEAD") {
    throw new Error("Only LEAD can be promoted to MQL");
  }

  await contactRepo.updateStatus(contactId, "MQL");
  await contactRepo.insertStatusHistory(
    contactId,
    "LEAD",
    "MQL",
    empId
  );
  eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
    companyId: contact.company_id,
    entityId: contactId,
    empId,
    data: { ...contact, contact_id: contactId, status: "MQL", previous_status: "LEAD" },
  });
};

/* ---------------------------------------------------
   EMPLOYEE: MQL → SQL
--------------------------------------------------- */
export const promoteToSQL = async (contactId, empId) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact || contact.status !== "MQL") {
    throw new Error("Only MQL can be promoted to SQL");
  }

  const avgRating = await sessionRepo.getAverageRating(
    contactId,
    "MQL"
  );

  if (avgRating < 7) {
    throw new Error("MQL not qualified for SQL -lead should have avgRating >=7 ");
  }

  await contactRepo.updateStatus(contactId, "SQL");
  await contactRepo.insertStatusHistory(
    contactId,
    "MQL",
    "SQL",
    empId
  );
  eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
    companyId: contact.company_id,
    entityId: contactId,
    empId,
    data: { ...contact, contact_id: contactId, status: "SQL", previous_status: "MQL" },
  });
};

/* ---------------------------------------------------
   EMPLOYEE: SQL → OPPORTUNITY
--------------------------------------------------- */
export const convertToOpportunity = async (
  contactId,
  empId,
  expectedValue
) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact || contact.status !== "SQL") {
    throw new Error("Only SQL can be converted to Opportunity");
  }

  await opportunityRepo.createOpportunity({
    contact_id: contactId,
    emp_id: empId,
    expected_value: expectedValue,
  });

  await contactRepo.updateStatus(contactId, "OPPORTUNITY");
  await contactRepo.insertStatusHistory(
    contactId,
    "SQL",
    "OPPORTUNITY",
    empId
  );
  eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
    companyId: contact.company_id,
    entityId: contactId,
    empId,
    data: { ...contact, contact_id: contactId, status: "OPPORTUNITY", previous_status: "SQL", expected_value: expectedValue },
  });
};

/* ---------------------------------------------------
   SYSTEM: OPPORTUNITY → CUSTOMER (Deal Closed)
--------------------------------------------------- */
export const closeDeal = async (contactId, empId, dealValue, productName = null) => {
  // Find the open opportunity for this contact
  const opportunity = await opportunityRepo.getOpenByContact(contactId);

  if (!opportunity || opportunity.status !== "OPEN") {
    throw new Error("No open opportunity found for this contact");
  }

  await dealRepo.createDeal({
    opportunity_id: opportunity.opportunity_id,
    deal_value: dealValue,
    product: productName ? productName.toLowerCase().trim() : null,
    closed_by: empId,
  });

  await opportunityRepo.markWon(opportunity.opportunity_id);

  await contactRepo.updateStatus(
    contactId,
    "CUSTOMER"
  );

  await contactRepo.insertStatusHistory(
    contactId,
    "OPPORTUNITY",
    "CUSTOMER",
    empId
  );
  const closedContact = await contactRepo.getById(contactId);
  eventBus.emitCRM(CRM_EVENTS.DEAL_WON, {
    companyId: closedContact?.company_id,
    entityId: contactId,
    empId,
    data: { ...closedContact, contact_id: contactId, status: "CUSTOMER", deal_value: dealValue, previous_status: "OPPORTUNITY" },
  });
  eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
    companyId: closedContact?.company_id,
    entityId: contactId,
    empId,
    data: { ...closedContact, contact_id: contactId, status: "CUSTOMER", previous_status: "OPPORTUNITY" },
  });
};

/* ---------------------------------------------------
   SYSTEM: CUSTOMER → EVANGELIST
--------------------------------------------------- */
export const convertToEvangelist = async (contactId) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact || contact.status !== "CUSTOMER") {
    throw new Error("Only customers can become evangelists");
  }

  const avgFeedback =
    await feedbackRepo.getAverageRating(contactId);

  if (avgFeedback < 8) {
    throw new Error("Customer not eligible for evangelist");
  }

  await contactRepo.updateStatus(contactId, "EVANGELIST");
  await contactRepo.insertStatusHistory(
    contactId,
    "CUSTOMER",
    "EVANGELIST",
    null // system
  );
  eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
    companyId: contact.company_id,
    entityId: contactId,
    data: { ...contact, contact_id: contactId, status: "EVANGELIST", previous_status: "CUSTOMER" },
  });
};

/* ---------------------------------------------------
   GET CONTACT FINANCIALS (Opportunities & Deals)
--------------------------------------------------- */
export const getContactFinancials = async (contactId) => {
  const [opportunities, deals] = await Promise.all([
    opportunityRepo.getByContactId(contactId),
    dealRepo.getByContactId(contactId),
  ]);

  // Calculate summary statistics
  const totalExpectedValue = opportunities.reduce(
    (sum, opp) => sum + parseFloat(opp.expected_value || 0),
    0
  );
  
  const totalDealValue = deals.reduce(
    (sum, deal) => sum + parseFloat(deal.deal_value || 0),
    0
  );

  const openOpportunities = opportunities.filter(opp => opp.status === 'OPEN');
  const wonOpportunities = opportunities.filter(opp => opp.status === 'WON');
  const lostOpportunities = opportunities.filter(opp => opp.status === 'LOST');

  return {
    opportunities,
    deals,
    summary: {
      totalOpportunities: opportunities.length,
      openOpportunities: openOpportunities.length,
      wonOpportunities: wonOpportunities.length,
      lostOpportunities: lostOpportunities.length,
      totalExpectedValue,
      totalDeals: deals.length,
      totalDealValue,
      conversionRate: opportunities.length > 0 
        ? Math.round((wonOpportunities.length / opportunities.length) * 100) 
        : 0,
    },
  };
};

/* ---------------------------------------------------
   EMPLOYEE: ANY STATUS → DORMANT
--------------------------------------------------- */
export const moveToDormant = async (contactId, empId, reason = null) => {
  const contact = await contactRepo.getById(contactId);

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (contact.status === "DORMANT") {
    throw new Error("Contact is already DORMANT");
  }

  const previousStatus = contact.status;

  await contactRepo.updateStatus(contactId, "DORMANT");
  await contactRepo.insertStatusHistory(
    contactId,
    previousStatus,
    "DORMANT",
    empId
  );
  eventBus.emitCRM(CRM_EVENTS.CONTACT_STATUS_CHANGED, {
    companyId: contact.company_id,
    entityId: contactId,
    empId,
    data: { ...contact, contact_id: contactId, status: "DORMANT", previous_status: previousStatus },
  });
};

// ----------- Bulk CSV utilities ----------
const parseCSV = (buffer) => {
  const text = buffer.toString('utf8');
  const rows = [];
  let cur = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(cur); cur = ''; continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); row = []; cur = ''; }
      while (text[i+1] === '\n' || text[i+1] === '\r') i++;
      continue;
    }
    cur += ch;
  }
  if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.map(r => r.map(c => c.trim()));
};

const toCSV = (rows) => {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  };
  return rows.map(r => r.map(escape).join(',')).join('\n');
};

/**
 * Import contacts from CSV buffer. Returns summary { imported, failed[], createdIds }.
 */
export const importContacts = async (csvBuffer, companyId = 1, options = {}) => {
  const rows = parseCSV(csvBuffer);
  if (!rows || rows.length <= 1) {
    return { imported: 0, failed: [{ row: 0, error: 'Empty or invalid CSV' }] };
  }
  const headers = rows[0].map(h => h.toLowerCase());
  const results = { imported: 0, failed: [], createdIds: [] };
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.every(c => !c)) continue;
    const record = {};
    for (let j = 0; j < headers.length; j++) record[headers[j]] = cols[j] ?? '';
    const name = record.name || `${record.first_name||''} ${record.last_name||''}`.trim();
    const email = (record.email||'').toLowerCase() || null;
    const phone = record.phone || null;
    if (!name || (!email && !phone)) {
      results.failed.push({ row: i+1, error: 'Missing required fields (name and email/phone)' });
      continue;
    }
    try {
      const data = {
        company_id: companyId,
        assigned_emp_id: record.assigned_emp_id ? parseInt(record.assigned_emp_id) : null,
        name,
        email,
        phone,
        job_title: record.job_title || null,
        status: (record.status || 'LEAD').toUpperCase(),
        source: record.source || null,
        temperature: record.temperature || 'COLD',
        interest_score: record.interest_score ? parseInt(record.interest_score) : 0,
      };
      const contactId = await contactRepo.createContact(data);
      results.imported += 1;
      results.createdIds.push(contactId);
    } catch (err) {
      results.failed.push({ row: i+1, error: err.message });
    }
  }
  return results;
};

/**
 * Export contacts as CSV using period/year/month/quarter/status filters.
 */
export const exportContacts = async (companyId = 1, opts = {}) => {
  const period = opts.period || 'monthly';
  const now = new Date();
  let startDate, endDate, includeYearColumn = false;
  if (period === 'monthly') {
    const year = opts.year || now.getFullYear();
    const month = opts.month || (now.getMonth()+1);
    startDate = new Date(year, month-1, 1);
    endDate = new Date(year, month, 0,23,59,59,999);
  } else if (period === 'quarterly') {
    const year = opts.year || now.getFullYear();
    const q = opts.quarter || Math.floor(now.getMonth()/3)+1;
    const startMonth = (q-1)*3+1;
    startDate = new Date(year, startMonth-1,1);
    endDate = new Date(year, startMonth+2,0,23,59,59,999);
  } else if (period === 'yearly') {
    if (opts.year) {
      startDate = new Date(opts.year,0,1);
      endDate = new Date(opts.year,11,31,23,59,59,999);
    } else {
      includeYearColumn = true;
      startDate = new Date(1970,0,1);
      endDate = new Date(now.getFullYear(),11,31,23,59,59,999);
    }
  } else {
    throw new Error('Invalid period');
  }
  const status = opts.status || null;
  const contacts = await contactRepo.getContactsByDateRange(
    companyId,
    startDate.toISOString().slice(0,19).replace('T',' '),
    endDate.toISOString().slice(0,19).replace('T',' '),
    status
  );
  const rows = [];
  const header = ['contact_id','name','email','phone','job_title','status','temperature','source','interest_score','created_at'];
  if (includeYearColumn) header.push('created_year');
  rows.push(header);
  for (const c of contacts) {
    const r = [
      c.contact_id,
      c.name,
      c.email,
      c.phone,
      c.job_title,
      c.status,
      c.temperature,
      c.source,
      c.interest_score,
      c.created_at ? c.created_at.toISOString().slice(0,19).replace('T',' ') : ''
    ];
    if (includeYearColumn) r.push(c.created_at ? c.created_at.getFullYear() : '');
    rows.push(r);
  }
  return toCSV(rows);
};
