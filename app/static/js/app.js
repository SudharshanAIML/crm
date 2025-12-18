const API_BASE = '/api';

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for the section
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'leads':
            loadLeads();
            break;
        case 'opportunities':
            loadOpportunities();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/stats`);
        const stats = await response.json();
        
        document.getElementById('stat-customers').textContent = stats.total_customers;
        document.getElementById('stat-contacts').textContent = stats.total_contacts;
        document.getElementById('stat-leads').textContent = stats.active_leads;
        document.getElementById('stat-opportunities').textContent = stats.open_opportunities;
        document.getElementById('stat-value').textContent = `$${stats.total_opportunity_value.toLocaleString()}`;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Customers
async function loadCustomers(searchTerm = '') {
    try {
        const url = searchTerm ? `${API_BASE}/customers?search=${searchTerm}` : `${API_BASE}/customers`;
        const response = await fetch(url);
        const customers = await response.json();
        
        const container = document.getElementById('customers-list');
        container.innerHTML = '';
        
        customers.forEach(customer => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${customer.name}</h4>
                <p><strong>Email:</strong> ${customer.email}</p>
                <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                <p><strong>Company:</strong> ${customer.company || 'N/A'}</p>
                <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
                <div class="list-item-actions">
                    <button class="btn-edit" onclick="editCustomer(${customer.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteCustomer(${customer.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function searchCustomers() {
    const searchTerm = document.getElementById('customer-search').value;
    loadCustomers(searchTerm);
}

function showCustomerForm(customerId = null) {
    document.getElementById('customer-modal').classList.add('active');
    document.getElementById('customer-form').reset();
    document.getElementById('customer-id').value = '';
    document.getElementById('customer-form-title').textContent = customerId ? 'Edit Customer' : 'Add Customer';
    
    if (customerId) {
        loadCustomerData(customerId);
    }
}

async function loadCustomerData(id) {
    try {
        const response = await fetch(`${API_BASE}/customers/${id}`);
        const customer = await response.json();
        
        document.getElementById('customer-id').value = customer.id;
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-email').value = customer.email;
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-company').value = customer.company || '';
        document.getElementById('customer-address').value = customer.address || '';
    } catch (error) {
        console.error('Error loading customer:', error);
    }
}

function closeCustomerForm() {
    document.getElementById('customer-modal').classList.remove('active');
}

async function saveCustomer(event) {
    event.preventDefault();
    
    const id = document.getElementById('customer-id').value;
    const data = {
        name: document.getElementById('customer-name').value,
        email: document.getElementById('customer-email').value,
        phone: document.getElementById('customer-phone').value,
        company: document.getElementById('customer-company').value,
        address: document.getElementById('customer-address').value
    };
    
    try {
        const url = id ? `${API_BASE}/customers/${id}` : `${API_BASE}/customers`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeCustomerForm();
            loadCustomers();
            loadDashboard();
        }
    } catch (error) {
        console.error('Error saving customer:', error);
    }
}

function editCustomer(id) {
    showCustomerForm(id);
}

async function deleteCustomer(id) {
    if (confirm('Are you sure you want to delete this customer? This will also delete all associated contacts, leads, and opportunities.')) {
        try {
            const response = await fetch(`${API_BASE}/customers/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadCustomers();
                loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
        }
    }
}

// Contacts
async function loadContacts() {
    try {
        const response = await fetch(`${API_BASE}/contacts`);
        const contacts = await response.json();
        
        const container = document.getElementById('contacts-list');
        container.innerHTML = '';
        
        for (const contact of contacts) {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${contact.first_name} ${contact.last_name}</h4>
                <p><strong>Customer:</strong> ${contact.customer_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${contact.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
                <p><strong>Position:</strong> ${contact.position || 'N/A'}</p>
                <div class="list-item-actions">
                    <button class="btn-edit" onclick="editContact(${contact.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteContact(${contact.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

async function showContactForm(contactId = null) {
    document.getElementById('contact-modal').classList.add('active');
    document.getElementById('contact-form').reset();
    document.getElementById('contact-id').value = '';
    document.getElementById('contact-form-title').textContent = contactId ? 'Edit Contact' : 'Add Contact';
    
    // Load customers for dropdown
    await loadCustomerOptions('contact-customer-id');
    
    if (contactId) {
        loadContactData(contactId);
    }
}

async function loadCustomerOptions(selectId) {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        const customers = await response.json();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select a customer</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function loadContactData(id) {
    try {
        const response = await fetch(`${API_BASE}/contacts/${id}`);
        const contact = await response.json();
        
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-customer-id').value = contact.customer_id;
        document.getElementById('contact-first-name').value = contact.first_name;
        document.getElementById('contact-last-name').value = contact.last_name;
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-position').value = contact.position || '';
    } catch (error) {
        console.error('Error loading contact:', error);
    }
}

function closeContactForm() {
    document.getElementById('contact-modal').classList.remove('active');
}

async function saveContact(event) {
    event.preventDefault();
    
    const id = document.getElementById('contact-id').value;
    const data = {
        customer_id: document.getElementById('contact-customer-id').value,
        first_name: document.getElementById('contact-first-name').value,
        last_name: document.getElementById('contact-last-name').value,
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        position: document.getElementById('contact-position').value
    };
    
    try {
        const url = id ? `${API_BASE}/contacts/${id}` : `${API_BASE}/contacts`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeContactForm();
            loadContacts();
            loadDashboard();
        }
    } catch (error) {
        console.error('Error saving contact:', error);
    }
}

function editContact(id) {
    showContactForm(id);
}

async function deleteContact(id) {
    if (confirm('Are you sure you want to delete this contact?')) {
        try {
            const response = await fetch(`${API_BASE}/contacts/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadContacts();
                loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
        }
    }
}

// Leads
async function loadLeads(status = '') {
    try {
        const url = status ? `${API_BASE}/leads?status=${status}` : `${API_BASE}/leads`;
        const response = await fetch(url);
        const leads = await response.json();
        
        const container = document.getElementById('leads-list');
        container.innerHTML = '';
        
        leads.forEach(lead => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${lead.name}</h4>
                <p><strong>Email:</strong> ${lead.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
                <p><strong>Source:</strong> ${lead.source || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="badge badge-${lead.status}">${lead.status}</span></p>
                <p><strong>Notes:</strong> ${lead.notes || 'N/A'}</p>
                <div class="list-item-actions">
                    <button class="btn-edit" onclick="editLead(${lead.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteLead(${lead.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading leads:', error);
    }
}

function filterLeads() {
    const status = document.getElementById('lead-status-filter').value;
    loadLeads(status);
}

function showLeadForm(leadId = null) {
    document.getElementById('lead-modal').classList.add('active');
    document.getElementById('lead-form').reset();
    document.getElementById('lead-id').value = '';
    document.getElementById('lead-form-title').textContent = leadId ? 'Edit Lead' : 'Add Lead';
    
    if (leadId) {
        loadLeadData(leadId);
    }
}

async function loadLeadData(id) {
    try {
        const response = await fetch(`${API_BASE}/leads/${id}`);
        const lead = await response.json();
        
        document.getElementById('lead-id').value = lead.id;
        document.getElementById('lead-name').value = lead.name;
        document.getElementById('lead-email').value = lead.email || '';
        document.getElementById('lead-phone').value = lead.phone || '';
        document.getElementById('lead-source').value = lead.source || '';
        document.getElementById('lead-status').value = lead.status;
        document.getElementById('lead-notes').value = lead.notes || '';
    } catch (error) {
        console.error('Error loading lead:', error);
    }
}

function closeLeadForm() {
    document.getElementById('lead-modal').classList.remove('active');
}

async function saveLead(event) {
    event.preventDefault();
    
    const id = document.getElementById('lead-id').value;
    const data = {
        name: document.getElementById('lead-name').value,
        email: document.getElementById('lead-email').value,
        phone: document.getElementById('lead-phone').value,
        source: document.getElementById('lead-source').value,
        status: document.getElementById('lead-status').value,
        notes: document.getElementById('lead-notes').value
    };
    
    try {
        const url = id ? `${API_BASE}/leads/${id}` : `${API_BASE}/leads`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeLeadForm();
            loadLeads();
            loadDashboard();
        }
    } catch (error) {
        console.error('Error saving lead:', error);
    }
}

function editLead(id) {
    showLeadForm(id);
}

async function deleteLead(id) {
    if (confirm('Are you sure you want to delete this lead?')) {
        try {
            const response = await fetch(`${API_BASE}/leads/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadLeads();
                loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting lead:', error);
        }
    }
}

// Opportunities
async function loadOpportunities() {
    try {
        const response = await fetch(`${API_BASE}/opportunities`);
        const opportunities = await response.json();
        
        const container = document.getElementById('opportunities-list');
        container.innerHTML = '';
        
        for (const opportunity of opportunities) {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${opportunity.title}</h4>
                <p><strong>Customer:</strong> ${opportunity.customer_name || 'N/A'}</p>
                <p><strong>Description:</strong> ${opportunity.description || 'N/A'}</p>
                <p><strong>Value:</strong> $${opportunity.value ? opportunity.value.toLocaleString() : 0}</p>
                <p><strong>Stage:</strong> <span class="badge badge-${opportunity.stage.replace('_', '-')}">${opportunity.stage.replace('_', ' ')}</span></p>
                <p><strong>Probability:</strong> ${opportunity.probability}%</p>
                <p><strong>Expected Close:</strong> ${opportunity.expected_close_date || 'N/A'}</p>
                <div class="list-item-actions">
                    <button class="btn-edit" onclick="editOpportunity(${opportunity.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteOpportunity(${opportunity.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        }
    } catch (error) {
        console.error('Error loading opportunities:', error);
    }
}

async function showOpportunityForm(opportunityId = null) {
    document.getElementById('opportunity-modal').classList.add('active');
    document.getElementById('opportunity-form').reset();
    document.getElementById('opportunity-id').value = '';
    document.getElementById('opportunity-form-title').textContent = opportunityId ? 'Edit Opportunity' : 'Add Opportunity';
    
    // Load customers for dropdown
    await loadCustomerOptions('opportunity-customer-id');
    
    if (opportunityId) {
        loadOpportunityData(opportunityId);
    }
}

async function loadOpportunityData(id) {
    try {
        const response = await fetch(`${API_BASE}/opportunities/${id}`);
        const opportunity = await response.json();
        
        document.getElementById('opportunity-id').value = opportunity.id;
        document.getElementById('opportunity-customer-id').value = opportunity.customer_id;
        document.getElementById('opportunity-title').value = opportunity.title;
        document.getElementById('opportunity-description').value = opportunity.description || '';
        document.getElementById('opportunity-value').value = opportunity.value || '';
        document.getElementById('opportunity-stage').value = opportunity.stage;
        document.getElementById('opportunity-probability').value = opportunity.probability;
        document.getElementById('opportunity-expected-close-date').value = opportunity.expected_close_date || '';
    } catch (error) {
        console.error('Error loading opportunity:', error);
    }
}

function closeOpportunityForm() {
    document.getElementById('opportunity-modal').classList.remove('active');
}

async function saveOpportunity(event) {
    event.preventDefault();
    
    const id = document.getElementById('opportunity-id').value;
    const data = {
        customer_id: document.getElementById('opportunity-customer-id').value,
        title: document.getElementById('opportunity-title').value,
        description: document.getElementById('opportunity-description').value,
        value: parseFloat(document.getElementById('opportunity-value').value) || 0,
        stage: document.getElementById('opportunity-stage').value,
        probability: parseInt(document.getElementById('opportunity-probability').value),
        expected_close_date: document.getElementById('opportunity-expected-close-date').value
    };
    
    try {
        const url = id ? `${API_BASE}/opportunities/${id}` : `${API_BASE}/opportunities`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeOpportunityForm();
            loadOpportunities();
            loadDashboard();
        }
    } catch (error) {
        console.error('Error saving opportunity:', error);
    }
}

function editOpportunity(id) {
    showOpportunityForm(id);
}

async function deleteOpportunity(id) {
    if (confirm('Are you sure you want to delete this opportunity?')) {
        try {
            const response = await fetch(`${API_BASE}/opportunities/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadOpportunities();
                loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting opportunity:', error);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
