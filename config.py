# System settings
MAX_ACTIVE_PACKAGES = 2  # Maximum number of packages that can be loaded simultaneously
DEFAULT_MAX_LENGTH = 500  # Default max tokens for response generation
DEFAULT_TEMPERATURE = 0.7  # Default temperature for response generation

# Model settings
MODEL_CACHE_DIR = "./model_cache"  # Directory to cache downloaded models
DEFAULT_MODEL_TYPE = "distilgpt2"  # Default model type for packages

# Web interface settings
APP_TITLE = "Modular AI MVP"
APP_DESCRIPTION = "A modular AI system that dynamically loads specialized knowledge packages"
DEFAULT_PORT = 8501
LOG_LEVEL = "INFO"

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING = True
METRICS_TRACKING_INTERVAL = 5  # seconds
MEMORY_TRACKING_INTERVAL = 2  # seconds

# Package settings
PACKAGES = {
    "frontend": {
        "name": "frontend",
        "domain": "frontend_development",
        "model_path": "distilgpt2",
        "capabilities": ["react", "css", "html", "ui_design"]
    },
    "backend": {
        "name": "backend",
        "domain": "backend_development",
        "model_path": "distilgpt2",
        "capabilities": ["apis", "databases", "authentication", "server_logic"]
    },
    "database": {
        "name": "database",
        "domain": "database_management",
        "model_path": "distilgpt2",
        "capabilities": ["sql", "schema_design", "query_optimization"]
    }
}
