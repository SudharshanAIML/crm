#!/bin/bash
# filepath: /home/susan/Desktop/projects/crm/backend/test-api.sh
# =====================================================
# CRM API Endpoint Test Script
# =====================================================
# Usage: ./test-api.sh [BASE_URL]
# Example: ./test-api.sh http://localhost:3000
# =====================================================

BASE_URL="${1:-http://localhost:3000}"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBJZCI6MSwiY29tcGFueUlkIjoxLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjYxMzQ0MjAsImV4cCI6MTc2NjIyMDgyMH0.kh5KPIor_bp2gpIhZBogZrmmoeFXue2AK3sjAkpQIuk"
COMPANY_ID=""
EMPLOYEE_ID=""
CONTACT_ID=""
TRACKING_TOKEN=""
SESSION_ID=""
OPPORTUNITY_ID=""
DEAL_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

# Helper function to print test results
print_result() {
  local status=$1
  local endpoint=$2
  local response=$3
  
  if [ $status -ge 200 ] && [ $status -lt 300 ]; then
    echo -e "${GREEN}✓ PASS${NC} [$status] $endpoint"
  elif [ $status -ge 400 ] && [ $status -lt 500 ]; then
    echo -e "${YELLOW}⚠ CLIENT ERROR${NC} [$status] $endpoint"
  else
    echo -e "${RED}✗ FAIL${NC} [$status] $endpoint"
  fi
  
  if [ "$VERBOSE" = "true" ]; then
    echo "  Response: $response"
  fi
}

# Helper function to make requests
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth=$4
  
  local headers="-H 'Content-Type: application/json'"
  
  if [ -n "$auth" ] && [ -n "$TOKEN" ]; then
    headers="$headers -H 'Authorization: Bearer $TOKEN'"
  fi
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  print_result $http_code "$method $endpoint" "$body"
  echo "$body"
}

# Helper to extract JSON value
extract_json_value() {
  local json=$1
  local key=$2
  echo "$json" | grep -o "\"$key\":[^,}]*" | sed 's/"'"$key"'"://' | tr -d '"' | head -1
}

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🧪 CRM API Endpoint Test Suite                          ║"
echo "║                                                           ║"
echo "║   Base URL: $BASE_URL                              "
echo "║   Started at: $(date)                              "
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# =====================================================
# 1. HEALTH CHECK ENDPOINTS
# =====================================================
print_header "1. HEALTH CHECK ENDPOINTS"

echo "Testing: GET /"
make_request "GET" "/"

echo ""
echo "Testing: GET /api/health"
make_request "GET" "/api/health"

# =====================================================
# 2. AUTHENTICATION ENDPOINTS
# =====================================================
print_header "2. AUTHENTICATION ENDPOINTS"

echo "Testing: POST /api/auth/google (requires valid Google token)"
echo -e "${YELLOW}⚠ SKIP${NC} - Requires valid Google OAuth token"
# Uncomment and add a valid token to test:
# make_request "POST" "/api/auth/google" '{"token": "YOUR_GOOGLE_TOKEN"}'

# For testing purposes, we'll create a mock JWT token
# In production, this would come from Google OAuth
echo -e "${YELLOW}ℹ Note: Using mock authorization for testing${NC}"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBJZCI6MSwiY29tcGFueUlkIjoxLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjYxMzQ0MjAsImV4cCI6MTc2NjIyMDgyMH0.kh5KPIor_bp2gpIhZBogZrmmoeFXue2AK3sjAkpQIuk"

# =====================================================
# 3. COMPANY ENDPOINTS
# =====================================================
print_header "3. COMPANY ENDPOINTS"

echo "Testing: POST /api/companies (Create Company)"
result=$(make_request "POST" "/api/companies" '{
  "company_name": "Test Company",
  "domain": "testcompany.com",
  "no_of_employees": 50,
  "email": "contact@testcompany.com",
  "phone": "+1234567890",
  "country": "USA"
}' "auth")
COMPANY_ID=$(echo "$result" | grep -o '"companyId":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "  → Created Company ID: $COMPANY_ID"

echo ""
echo "Testing: GET /api/companies (List Companies)"
make_request "GET" "/api/companies" "" "auth"

echo ""
echo "Testing: GET /api/companies/search?q=test (Search Companies)"
make_request "GET" "/api/companies/search?q=test" "" "auth"

echo ""
echo "Testing: GET /api/companies/$COMPANY_ID (Get Company by ID)"
make_request "GET" "/api/companies/${COMPANY_ID:-1}" "" "auth"

echo ""
echo "Testing: PATCH /api/companies/$COMPANY_ID (Update Company)"
make_request "PATCH" "/api/companies/${COMPANY_ID:-1}" '{
  "no_of_employees": 75
}' "auth"

echo ""
echo "Testing: GET /api/companies/stats (Company Stats)"
make_request "GET" "/api/companies/stats" "" "auth"

# =====================================================
# 4. EMPLOYEE ENDPOINTS
# =====================================================
print_header "4. EMPLOYEE ENDPOINTS"

echo "Testing: POST /api/employees (Create Employee)"
result=$(make_request "POST" "/api/employees" '{
  "company_id": 1,
  "name": "John Doe",
  "email": "john.doe@testcompany.com",
  "phone": "+1234567891",
  "role": "EMPLOYEE"
}' "auth")
EMPLOYEE_ID=$(echo "$result" | grep -o '"empId":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "  → Created Employee ID: $EMPLOYEE_ID"

echo ""
echo "Testing: GET /api/employees/me (Get Current User Profile)"
make_request "GET" "/api/employees/me" "" "auth"

echo ""
echo "Testing: GET /api/employees/$EMPLOYEE_ID (Get Employee by ID)"
make_request "GET" "/api/employees/${EMPLOYEE_ID:-1}" "" "auth"

echo ""
echo "Testing: GET /api/employees/company/$COMPANY_ID (Get Employees by Company)"
make_request "GET" "/api/employees/company/${COMPANY_ID:-1}" "" "auth"

echo ""
echo "Testing: PATCH /api/employees/$EMPLOYEE_ID (Update Employee)"
make_request "PATCH" "/api/employees/${EMPLOYEE_ID:-1}" '{
  "phone": "+1234567899"
}' "auth"

# =====================================================
# 5. CONTACT/LEAD ENDPOINTS (Core CRM Pipeline)
# =====================================================
print_header "5. CONTACT/LEAD ENDPOINTS (Core CRM Pipeline)"

echo "Testing: POST /api/contacts (Create Lead)"
result=$(make_request "POST" "/api/contacts" '{
  "company_id": 1,
  "name": "Jane Smith",
  "email": "jane.smith@prospect.com",
  "phone": "+1987654321",
  "job_title": "Marketing Manager",
  "source": "Website"
}' "auth")
CONTACT_ID=$(echo "$result" | grep -o '"contactId":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "  → Created Contact ID: $CONTACT_ID"

echo ""
echo "Testing: GET /api/contacts (List Contacts)"
make_request "GET" "/api/contacts" "" "auth"

echo ""
echo "Testing: GET /api/contacts?status=LEAD (List Contacts by Status)"
make_request "GET" "/api/contacts?status=LEAD" "" "auth"

echo ""
echo "Testing: GET /api/contacts/$CONTACT_ID (Get Contact by ID)"
contact_result=$(make_request "GET" "/api/contacts/${CONTACT_ID:-1}" "" "auth")

# Extract actual tracking token from the contact
TRACKING_TOKEN=$(echo "$contact_result" | grep -o '"tracking_token":"[^"]*"' | sed 's/"tracking_token":"\([^"]*\)"/\1/')
echo "  → Extracted Tracking Token: $TRACKING_TOKEN"

echo ""
echo "Testing: POST /api/contacts/internal/lead-activity (Simulate Email Click - LEAD → MQL)"
if [ -n "$TRACKING_TOKEN" ]; then
  make_request "POST" "/api/contacts/internal/lead-activity" "{
    \"contactId\": ${CONTACT_ID:-1},
    \"token\": \"$TRACKING_TOKEN\"
  }"
else
  echo -e "${YELLOW}⚠ SKIP${NC} - No tracking token found for contact"
fi

# =====================================================
# 6. SESSION ENDPOINTS (MQL/SQL Calls)
# =====================================================
print_header "6. SESSION ENDPOINTS (MQL/SQL Calls)"

echo "Testing: POST /api/sessions (Create MQL Session)"
result=$(make_request "POST" "/api/sessions" "{
  \"contactId\": ${CONTACT_ID:-1},
  \"stage\": \"MQL\",
  \"sessionNo\": 1,
  \"rating\": 8,
  \"sessionStatus\": \"CONNECTED\",
  \"remarks\": \"Good conversation, interested in product\"
}" "auth")
SESSION_ID=$(echo "$result" | grep -o '"sessionId":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "  → Created Session ID: $SESSION_ID"

echo ""
echo "Testing: POST /api/sessions (Create 2nd MQL Session)"
make_request "POST" "/api/sessions" "{
  \"contactId\": ${CONTACT_ID:-1},
  \"stage\": \"MQL\",
  \"sessionNo\": 2,
  \"rating\": 9,
  \"sessionStatus\": \"CONNECTED\",
  \"remarks\": \"Scheduled demo\"
}" "auth"

echo ""
echo "Testing: GET /api/sessions/contact/$CONTACT_ID (Get Sessions for Contact)"
make_request "GET" "/api/sessions/contact/${CONTACT_ID:-1}" "" "auth"

echo ""
echo "Testing: GET /api/sessions/contact/$CONTACT_ID/MQL (Get MQL Sessions)"
make_request "GET" "/api/sessions/contact/${CONTACT_ID:-1}/MQL" "" "auth"

echo ""
echo "Testing: PATCH /api/sessions/$SESSION_ID (Update Session)"
make_request "PATCH" "/api/sessions/${SESSION_ID:-1}" '{
  "rating": 9,
  "remarks": "Updated: Very promising lead"
}' "auth"

# =====================================================
# 7. CONTACT PROMOTION ENDPOINTS
# =====================================================
print_header "7. CONTACT PROMOTION ENDPOINTS"

echo "Testing: PATCH /api/contacts/$CONTACT_ID/promote-sql (MQL → SQL)"
make_request "PATCH" "/api/contacts/${CONTACT_ID:-1}/promote-sql" "" "auth"

echo ""
echo "Testing: POST /api/sessions (Create SQL Session)"
make_request "POST" "/api/sessions" "{
  \"contactId\": ${CONTACT_ID:-1},
  \"stage\": \"SQL\",
  \"sessionNo\": 1,
  \"rating\": 8,
  \"sessionStatus\": \"CONNECTED\",
  \"remarks\": \"Sales pitch completed\"
}" "auth"

echo ""
echo "Testing: POST /api/contacts/$CONTACT_ID/opportunity (SQL → Opportunity)"
make_request "POST" "/api/contacts/${CONTACT_ID:-1}/opportunity" '{
  "expectedValue": 15000.00
}' "auth"

# =====================================================
# 8. OPPORTUNITY ENDPOINTS
# =====================================================
print_header "8. OPPORTUNITY ENDPOINTS"

echo "Testing: POST /api/opportunities (Create Opportunity - Alternative method)"
result=$(make_request "POST" "/api/opportunities" "{
  \"contactId\": ${CONTACT_ID:-1},
  \"expectedValue\": 20000.00
}" "auth")
OPPORTUNITY_ID=$(echo "$result" | grep -o '"opportunityId":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "  → Created Opportunity ID: $OPPORTUNITY_ID"

echo ""
echo "Testing: GET /api/opportunities/$OPPORTUNITY_ID (Get Opportunity)"
make_request "GET" "/api/opportunities/${OPPORTUNITY_ID:-1}" "" "auth"

# echo ""
# echo "Testing: POST /api/opportunities/$OPPORTUNITY_ID/won (Mark as WON → Customer)"
# make_request "POST" "/api/opportunities/${OPPORTUNITY_ID:-1}/won" '{
#   "dealValue": 18500.00
# }' "auth"

# Test LOST flow with a new opportunity
echo ""
echo "Testing: POST /api/opportunities/:id/lost (Mark as LOST → Dormant)"
echo -e "${YELLOW}⚠ SKIP${NC} - Would need a new opportunity in OPEN status"

# =====================================================
# 9. DEAL ENDPOINTS
# =====================================================
print_header "9. DEAL ENDPOINTS"

echo "Testing: POST /api/deals (Create Deal)"
result=$(make_request "POST" "/api/deals" "{
  \"opportunityId\": ${OPPORTUNITY_ID:-1},
  \"dealValue\": 18500.00
}" "auth")
DEAL_ID=$(echo "$result" | grep -o '"dealId":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "  → Created Deal ID: $DEAL_ID"

echo ""
echo "Testing: GET /api/deals/$DEAL_ID (Get Deal by ID)"
make_request "GET" "/api/deals/${DEAL_ID:-1}" "" "auth"

echo ""
echo "Testing: GET /api/deals/company/$COMPANY_ID (Get Deals by Company)"
make_request "GET" "/api/deals/company/${COMPANY_ID:-1}" "" "auth"

# =====================================================
# 10. FEEDBACK ENDPOINTS
# =====================================================
print_header "10. FEEDBACK ENDPOINTS"

# echo "Testing: POST /api/feedback (Submit Feedback)"
# make_request "POST" "/api/feedback" "{
#   \"contactId\": ${CONTACT_ID:-1},
#   \"rating\": 9,
#   \"comment\": \"Excellent service, very satisfied with the product!\"
# }" "auth"

# echo ""
# echo "Testing: POST /api/feedback (Submit Another Feedback)"
# make_request "POST" "/api/feedback" "{
#   \"contactId\": ${CONTACT_ID:-1},
#   \"rating\": 10,
#   \"comment\": \"Would definitely recommend to others!\"
# }" "auth"

echo ""
echo "Testing: GET /api/feedback/contact/$CONTACT_ID (Get Feedback for Contact)"
make_request "GET" "/api/feedback/contact/${CONTACT_ID:-1}" "" "auth"

echo ""
echo "Testing: GET /api/feedback/contact/$CONTACT_ID/summary (Get Feedback Summary)"
make_request "GET" "/api/feedback/contact/${CONTACT_ID:-1}/summary" "" "auth"

# =====================================================
# 11. EVANGELIST CONVERSION
# =====================================================
print_header "11. EVANGELIST CONVERSION"

echo "Testing: POST /api/contacts/$CONTACT_ID/evangelist (Customer → Evangelist)"
make_request "POST" "/api/contacts/${CONTACT_ID:-1}/evangelist" "" "auth"

# =====================================================
# 12. EMAIL ENDPOINTS
# =====================================================
print_header "12. EMAIL ENDPOINTS"

echo "Testing: POST /api/emails (Send Custom Email)"
make_request "POST" "/api/emails" "{
  \"contactId\": ${CONTACT_ID:-1},
  \"subject\": \"Thank you for your business!\",
  \"body\": \"<h1>Thank You!</h1><p>We appreciate your partnership.</p>\"
}" "auth"

echo ""
echo "Testing: GET /api/emails/contact/$CONTACT_ID (Get Emails for Contact)"
make_request "GET" "/api/emails/contact/${CONTACT_ID:-1}" "" "auth"

echo ""
echo "Testing: GET /api/track/:token (Email Click Tracking)"
echo -e "${YELLOW}⚠ INFO${NC} - This endpoint redirects, testing with curl -I"
curl -s -I "$BASE_URL/api/track/test-token" | head -5

# =====================================================
# 13. ANALYTICS ENDPOINTS
# =====================================================
print_header "13. ANALYTICS ENDPOINTS"

echo "Testing: GET /api/analytics/dashboard (Dashboard Stats)"
make_request "GET" "/api/analytics/dashboard" "" "auth"

echo ""
echo "Testing: GET /api/analytics/funnel (Pipeline Funnel)"
make_request "GET" "/api/analytics/funnel" "" "auth"

echo ""
echo "Testing: GET /api/analytics/performance (Employee Performance)"
make_request "GET" "/api/analytics/performance" "" "auth"

echo ""
echo "Testing: GET /api/analytics/activities (Recent Activities)"
make_request "GET" "/api/analytics/activities" "" "auth"

echo ""
echo "Testing: GET /api/analytics/activities?limit=5 (Recent Activities with Limit)"
make_request "GET" "/api/analytics/activities?limit=5" "" "auth"

# =====================================================
# 14. ERROR HANDLING TESTS
# =====================================================
# print_header "14. ERROR HANDLING TESTS"

# echo "Testing: GET /api/nonexistent (404 Not Found)"
# make_request "GET" "/api/nonexistent"

# echo ""
# echo "Testing: GET /api/contacts/99999 (Contact Not Found)"
# make_request "GET" "/api/contacts/99999" "" "auth"

# echo ""
# echo "Testing: POST /api/contacts (Missing Required Fields)"
# make_request "POST" "/api/contacts" '{
#   "name": "Incomplete Lead"
# }' "auth"

# echo ""
# echo "Testing: POST /api/sessions (Invalid Stage)"
# make_request "POST" "/api/sessions" "{
#   \"contactId\": ${CONTACT_ID:-1},
#   \"stage\": \"INVALID\",
#   \"sessionNo\": 1,
#   \"sessionStatus\": \"CONNECTED\"
# }" "auth"

# echo ""
# echo "Testing: POST /api/feedback (Invalid Rating)"
# make_request "POST" "/api/feedback" "{
#   \"contactId\": ${CONTACT_ID:-1},
#   \"rating\": 15,
#   \"comment\": \"Invalid rating test\"
# }" "auth"

# =====================================================
# CLEANUP (Optional)
# =====================================================
print_header "CLEANUP (Optional - Uncomment to enable)"

# Uncomment these lines to clean up test data:
# echo "Deleting test company..."
# make_request "DELETE" "/api/companies/${COMPANY_ID:-1}" "" "auth"

# echo "Deleting test employee..."
# make_request "DELETE" "/api/employees/${EMPLOYEE_ID:-1}" "" "auth"

# =====================================================
# SUMMARY
# =====================================================
echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ CRM API Test Suite Completed                         ║"
echo "║                                                           ║"
echo "║   Finished at: $(date)                             "
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Note:${NC}"
echo "  - Some tests may fail if the database is not set up"
echo "  - Authentication tests require valid JWT/Google tokens"
echo "  - Set VERBOSE=true before running for detailed output"
echo ""
echo "Usage examples:"
echo "  ./test-api.sh                          # Test localhost:3000"
echo "  ./test-api.sh http://localhost:5000    # Test custom URL"
echo "  VERBOSE=true ./test-api.sh             # Show response bodies"
