from flask import Flask, render_template
from flask_cors import CORS
from config import Config
from app.models import db

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Register blueprints
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Root route
    @app.route('/')
    def index():
        return render_template('index.html')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app
