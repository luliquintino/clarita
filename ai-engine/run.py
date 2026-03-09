import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from src.main import app
from src.config import Config

if __name__ == '__main__':
    app.run(host=Config.FLASK_HOST, port=Config.FLASK_PORT, debug=True)
