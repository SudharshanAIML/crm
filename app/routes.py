from flask import Blueprint, request, jsonify
from app.models import db, Customer, Contact, Lead, Opportunity
from datetime import datetime

api_bp = Blueprint('api', __name__)

# Customer endpoints
@api_bp.route('/customers', methods=['GET', 'POST'])
def customers():
    if request.method == 'GET':
        search = request.args.get('search', '')
        if search:
            customers = Customer.query.filter(
                (Customer.name.contains(search)) |
                (Customer.email.contains(search)) |
                (Customer.company.contains(search))
            ).all()
        else:
            customers = Customer.query.all()
        return jsonify([c.to_dict() for c in customers])
    
    elif request.method == 'POST':
        data = request.get_json()
        customer = Customer(
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            company=data.get('company'),
            address=data.get('address')
        )
        db.session.add(customer)
        db.session.commit()
        return jsonify(customer.to_dict()), 201

@api_bp.route('/customers/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def customer(id):
    customer = Customer.query.get_or_404(id)
    
    if request.method == 'GET':
        return jsonify(customer.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        customer.name = data.get('name', customer.name)
        customer.email = data.get('email', customer.email)
        customer.phone = data.get('phone', customer.phone)
        customer.company = data.get('company', customer.company)
        customer.address = data.get('address', customer.address)
        customer.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(customer.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(customer)
        db.session.commit()
        return '', 204

# Contact endpoints
@api_bp.route('/contacts', methods=['GET', 'POST'])
def contacts():
    if request.method == 'GET':
        customer_id = request.args.get('customer_id')
        if customer_id:
            contacts = Contact.query.filter_by(customer_id=customer_id).all()
        else:
            contacts = Contact.query.all()
        return jsonify([c.to_dict() for c in contacts])
    
    elif request.method == 'POST':
        data = request.get_json()
        contact = Contact(
            customer_id=data.get('customer_id'),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            position=data.get('position')
        )
        db.session.add(contact)
        db.session.commit()
        return jsonify(contact.to_dict()), 201

@api_bp.route('/contacts/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def contact(id):
    contact = Contact.query.get_or_404(id)
    
    if request.method == 'GET':
        return jsonify(contact.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        contact.customer_id = data.get('customer_id', contact.customer_id)
        contact.first_name = data.get('first_name', contact.first_name)
        contact.last_name = data.get('last_name', contact.last_name)
        contact.email = data.get('email', contact.email)
        contact.phone = data.get('phone', contact.phone)
        contact.position = data.get('position', contact.position)
        contact.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(contact.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(contact)
        db.session.commit()
        return '', 204

# Lead endpoints
@api_bp.route('/leads', methods=['GET', 'POST'])
def leads():
    if request.method == 'GET':
        status = request.args.get('status')
        if status:
            leads = Lead.query.filter_by(status=status).all()
        else:
            leads = Lead.query.all()
        return jsonify([l.to_dict() for l in leads])
    
    elif request.method == 'POST':
        data = request.get_json()
        lead = Lead(
            customer_id=data.get('customer_id'),
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            source=data.get('source'),
            status=data.get('status', 'new'),
            notes=data.get('notes')
        )
        db.session.add(lead)
        db.session.commit()
        return jsonify(lead.to_dict()), 201

@api_bp.route('/leads/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def lead(id):
    lead = Lead.query.get_or_404(id)
    
    if request.method == 'GET':
        return jsonify(lead.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        lead.customer_id = data.get('customer_id', lead.customer_id)
        lead.name = data.get('name', lead.name)
        lead.email = data.get('email', lead.email)
        lead.phone = data.get('phone', lead.phone)
        lead.source = data.get('source', lead.source)
        lead.status = data.get('status', lead.status)
        lead.notes = data.get('notes', lead.notes)
        lead.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(lead.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(lead)
        db.session.commit()
        return '', 204

# Opportunity endpoints
@api_bp.route('/opportunities', methods=['GET', 'POST'])
def opportunities():
    if request.method == 'GET':
        customer_id = request.args.get('customer_id')
        stage = request.args.get('stage')
        query = Opportunity.query
        if customer_id:
            query = query.filter_by(customer_id=customer_id)
        if stage:
            query = query.filter_by(stage=stage)
        opportunities = query.all()
        return jsonify([o.to_dict() for o in opportunities])
    
    elif request.method == 'POST':
        data = request.get_json()
        opportunity = Opportunity(
            customer_id=data.get('customer_id'),
            title=data.get('title'),
            description=data.get('description'),
            value=data.get('value'),
            stage=data.get('stage', 'prospecting'),
            probability=data.get('probability', 10),
            expected_close_date=datetime.fromisoformat(data.get('expected_close_date')).date() if data.get('expected_close_date') else None
        )
        db.session.add(opportunity)
        db.session.commit()
        return jsonify(opportunity.to_dict()), 201

@api_bp.route('/opportunities/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def opportunity(id):
    opportunity = Opportunity.query.get_or_404(id)
    
    if request.method == 'GET':
        return jsonify(opportunity.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        opportunity.customer_id = data.get('customer_id', opportunity.customer_id)
        opportunity.title = data.get('title', opportunity.title)
        opportunity.description = data.get('description', opportunity.description)
        opportunity.value = data.get('value', opportunity.value)
        opportunity.stage = data.get('stage', opportunity.stage)
        opportunity.probability = data.get('probability', opportunity.probability)
        if data.get('expected_close_date'):
            opportunity.expected_close_date = datetime.fromisoformat(data.get('expected_close_date')).date()
        opportunity.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(opportunity.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(opportunity)
        db.session.commit()
        return '', 204

# Dashboard/Statistics endpoint
@api_bp.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    stats = {
        'total_customers': Customer.query.count(),
        'total_contacts': Contact.query.count(),
        'total_leads': Lead.query.count(),
        'active_leads': Lead.query.filter_by(status='new').count() + Lead.query.filter_by(status='contacted').count(),
        'total_opportunities': Opportunity.query.count(),
        'open_opportunities': Opportunity.query.filter(
            Opportunity.stage.in_(['prospecting', 'qualification', 'proposal', 'negotiation'])
        ).count(),
        'total_opportunity_value': db.session.query(db.func.sum(Opportunity.value)).scalar() or 0
    }
    return jsonify(stats)
