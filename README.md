# CRM Platform - Lead to Evangelist Pipeline

A comprehensive CRM (Customer Relationship Management) backend system that manages the complete customer lifecycle from Lead → MQL → SQL → Opportunity → Customer → Evangelist.

## 🚀 Features

### Core CRM Pipeline
- **Lead Management**: Create and track potential customers
- **Marketing Qualified Lead (MQL)**: Automatic promotion when leads engage with marketing emails
- **Sales Qualified Lead (SQL)**: Manual promotion based on MQL session ratings
- **Opportunity Management**: Track potential deals with expected values
- **Customer Conversion**: Convert opportunities to customers when deals close
- **Evangelist Program**: Convert satisfied customers to evangelists based on feedback

### Key Capabilities
- 📧 **Email Tracking**: Track email opens/clicks for lead engagement
- 📞 **Session Management**: Log up to 5 marketing/sales calls per stage with ratings
- 📊 **Analytics Dashboard**: Pipeline stats, conversion rates, revenue metrics
- 👥 **Employee Management**: Role-based access control (Admin/Employee)
- 🏢 **Multi-Company Support**: Each company manages their own CRM data
- 🔐 **Google OAuth**: Secure authentication with Google
- 📈 **Status History**: Full audit trail of contact status changes

## 📋 CRM Flow

```
LEAD → MQL → SQL → OPPORTUNITY → CUSTOMER → EVANGELIST
  │      │     │        │            │           │
  │      │     │        │            │           └── Avg feedback ≥ 8
  │      │     │        │            └── Deal closes (WON)
  │      │     │        └── Employee sets expected value
  │      │     └── Avg MQL session rating ≥ 7
  │      └── Lead clicks email link (automated)
  └── Employee creates lead, sends marketing email
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Database**: MySQL (Aiven Cloud)
- **Authentication**: JWT + Google OAuth
- **Security**: Helmet, CORS, Rate Limiting

## 📦 Project Structure

```
backend/
├── src/
│   ├── app.js                 # Main application entry
│   ├── config/
│   │   ├── db.js              # Database connection pool
│   │   ├── dbhealthcheck.js   # Health check endpoint
│   │   └── index.js           # Config exports
│   ├── middlewares/
│   │   ├── auth.middleware.js # JWT authentication
│   │   ├── error.middleware.js# Global error handler
│   │   └── role.middleware.js # Role-based authorization
│   ├── modules/
│   │   ├── analytics/         # Dashboard & reporting
│   │   ├── auth/              # Google OAuth
│   │   ├── companies/         # Company CRUD
│   │   ├── contacts/          # Lead/Contact pipeline
│   │   ├── deals/             # Closed deal management
│   │   ├── emails/            # Email tracking
│   │   ├── employees/         # Employee management
│   │   ├── feedback/          # Customer feedback
│   │   ├── opportunities/     # Opportunity management
│   │   └── sessions/          # MQL/SQL call sessions
│   └── utils/
│       ├── constants.js       # Enums and thresholds
│       └── validators.js      # Input validation
├── db/
│   └── migrations/            # SQL schema files
├── .env.example               # Environment template
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL database (local or cloud like Aiven)
- Google Cloud Console project (for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   cd crm/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   # Connect to your MySQL and run:
   mysql -u user -p database < db/migrations/000_run_all.sql
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Google OAuth login |

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List companies |
| POST | `/api/companies` | Create company |
| GET | `/api/companies/:id` | Get company |
| PATCH | `/api/companies/:id` | Update company |
| DELETE | `/api/companies/:id` | Delete company |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/me` | Get current user |
| GET | `/api/employees/:id` | Get employee |
| POST | `/api/employees` | Create employee |
| PATCH | `/api/employees/:id` | Update employee |

### Contacts (CRM Pipeline)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts/:id` | Get contact |
| POST | `/api/contacts` | Create lead |
| PATCH | `/api/contacts/:id/promote-sql` | MQL → SQL |
| POST | `/api/contacts/:id/opportunity` | SQL → Opportunity |
| POST | `/api/contacts/:id/evangelist` | Customer → Evangelist |

### Sessions (MQL/SQL Calls)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/contact/:id` | Get contact sessions |
| GET | `/api/sessions/contact/:id/:stage` | Get sessions by stage |
| PATCH | `/api/sessions/:id` | Update session |

### Opportunities
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/opportunities` | Create opportunity |
| GET | `/api/opportunities/:id` | Get opportunity |
| POST | `/api/opportunities/:id/won` | Mark as WON |
| POST | `/api/opportunities/:id/lost` | Mark as LOST |

### Deals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deals` | Create deal |
| GET | `/api/deals/:id` | Get deal |
| GET | `/api/deals/company/:id` | Get company deals |

### Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback` | Submit feedback |
| GET | `/api/feedback/contact/:id` | Get contact feedback |
| GET | `/api/feedback/contact/:id/summary` | Get feedback summary |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard stats |
| GET | `/api/analytics/funnel` | Pipeline funnel |
| GET | `/api/analytics/performance` | Employee performance |
| GET | `/api/analytics/activities` | Recent activities |

## 🔧 Business Rules

### Session Limits
- Maximum **5 sessions per stage** (MQL and SQL)
- Session rating: 1-10

### Promotion Thresholds
- **MQL → SQL**: Average MQL session rating ≥ 7
- **Customer → Evangelist**: Average feedback rating ≥ 8

### Contact Statuses
- `LEAD` - Initial state
- `MQL` - Marketing Qualified Lead
- `SQL` - Sales Qualified Lead
- `OPPORTUNITY` - Active sales opportunity
- `CUSTOMER` - Closed deal
- `EVANGELIST` - Highly satisfied customer
- `DORMANT` - Lost opportunity

## 🔐 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=mysql://user:pass@host:port/db

# Authentication
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=your-google-client-id

# Security
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_MAX=100
```

## 📄 License

ISC License