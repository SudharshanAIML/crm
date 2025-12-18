# CRM System

A comprehensive Customer Relationship Management (CRM) system built with Flask and vanilla JavaScript.

## Features

- **Customer Management**: Create, read, update, and delete customer records
- **Contact Management**: Manage contacts associated with customers
- **Lead Tracking**: Track and manage sales leads with status monitoring
- **Opportunity Management**: Track sales opportunities with stages and probability
- **Dashboard**: View key metrics and statistics at a glance
- **Search & Filter**: Search customers and filter leads by status
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: RESTful API architecture

## Installation

1. Clone the repository:
```bash
git clone https://github.com/SudharshanAIML/crm.git
cd crm
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the application:
```bash
python run.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Start managing your customer relationships!

## Project Structure

```
crm/
├── app/
│   ├── __init__.py          # Flask application factory
│   ├── models.py            # Database models
│   ├── routes.py            # API routes
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css    # Styles
│   │   └── js/
│   │       └── app.js       # Frontend JavaScript
│   └── templates/
│       └── index.html       # Main HTML template
├── config.py                # Configuration
├── run.py                   # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create a new customer
- `GET /api/customers/<id>` - Get customer details
- `PUT /api/customers/<id>` - Update customer
- `DELETE /api/customers/<id>` - Delete customer

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create a new contact
- `GET /api/contacts/<id>` - Get contact details
- `PUT /api/contacts/<id>` - Update contact
- `DELETE /api/contacts/<id>` - Delete contact

### Leads
- `GET /api/leads` - List all leads
- `POST /api/leads` - Create a new lead
- `GET /api/leads/<id>` - Get lead details
- `PUT /api/leads/<id>` - Update lead
- `DELETE /api/leads/<id>` - Delete lead

### Opportunities
- `GET /api/opportunities` - List all opportunities
- `POST /api/opportunities` - Create a new opportunity
- `GET /api/opportunities/<id>` - Get opportunity details
- `PUT /api/opportunities/<id>` - Update opportunity
- `DELETE /api/opportunities/<id>` - Delete opportunity

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Models

### Customer
- Name, Email, Phone, Company, Address
- Relationships: Contacts, Leads, Opportunities

### Contact
- First Name, Last Name, Email, Phone, Position
- Belongs to a Customer

### Lead
- Name, Email, Phone, Source, Status, Notes
- Can be associated with a Customer

### Opportunity
- Title, Description, Value, Stage, Probability, Expected Close Date
- Belongs to a Customer

## License

MIT License - see LICENSE file for details