from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # Only enable debug mode in development
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=5000)
