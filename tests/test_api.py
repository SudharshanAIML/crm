import unittest
import json
from app import create_app
from app.models import db, Customer, Contact, Lead, Opportunity
from datetime import datetime

class CRMTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test client and initialize database."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
    
    def tearDown(self):
        """Clean up after tests."""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint."""
        response = self.client.get('/api/dashboard/stats')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('total_customers', data)
        self.assertIn('total_leads', data)
        self.assertIn('total_opportunities', data)
    
    def test_create_customer(self):
        """Test creating a customer."""
        customer_data = {
            'name': 'Test Company',
            'email': 'test@example.com',
            'phone': '555-0000',
            'company': 'Test Corp',
            'address': '123 Test St'
        }
        response = self.client.post('/api/customers',
                                   data=json.dumps(customer_data),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Company')
        self.assertEqual(data['email'], 'test@example.com')
    
    def test_get_customers(self):
        """Test getting list of customers."""
        response = self.client.get('/api/customers')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_create_lead(self):
        """Test creating a lead."""
        lead_data = {
            'name': 'Test Lead',
            'email': 'lead@example.com',
            'phone': '555-1111',
            'source': 'website',
            'status': 'new',
            'notes': 'Test notes'
        }
        response = self.client.post('/api/leads',
                                   data=json.dumps(lead_data),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Lead')
        self.assertEqual(data['status'], 'new')
    
    def test_get_leads(self):
        """Test getting list of leads."""
        response = self.client.get('/api/leads')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_create_opportunity(self):
        """Test creating an opportunity."""
        # First create a customer
        with self.app.app_context():
            customer = Customer(name='Test Customer', email='customer@example.com')
            db.session.add(customer)
            db.session.commit()
            customer_id = customer.id
        
        opportunity_data = {
            'customer_id': customer_id,
            'title': 'Test Opportunity',
            'description': 'Test description',
            'value': 10000,
            'stage': 'prospecting',
            'probability': 25
        }
        response = self.client.post('/api/opportunities',
                                   data=json.dumps(opportunity_data),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['title'], 'Test Opportunity')
        self.assertEqual(data['value'], 10000)
    
    def test_update_customer(self):
        """Test updating a customer."""
        # First create a customer
        with self.app.app_context():
            customer = Customer(name='Original Name', email='original@example.com')
            db.session.add(customer)
            db.session.commit()
            customer_id = customer.id
        
        # Update the customer
        update_data = {
            'name': 'Updated Name',
            'email': 'original@example.com'
        }
        response = self.client.put(f'/api/customers/{customer_id}',
                                  data=json.dumps(update_data),
                                  content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Updated Name')
    
    def test_delete_customer(self):
        """Test deleting a customer."""
        # First create a customer
        with self.app.app_context():
            customer = Customer(name='To Delete', email='delete@example.com')
            db.session.add(customer)
            db.session.commit()
            customer_id = customer.id
        
        # Delete the customer
        response = self.client.delete(f'/api/customers/{customer_id}')
        self.assertEqual(response.status_code, 204)
        
        # Verify it's deleted
        response = self.client.get(f'/api/customers/{customer_id}')
        self.assertEqual(response.status_code, 404)

if __name__ == '__main__':
    unittest.main()
