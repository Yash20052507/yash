# Modular AI MVP 🧠

A proof-of-concept system demonstrating a modular approach to AI, where specialized "Skill Packages" are dynamically loaded and unloaded based on user requests to optimize resource usage.

## ✨ Features

*   **Dynamic Skill Package Management**: Loads and unloads AI skill packages on demand.
*   **Intelligent Request Routing (Simulated)**: Determines the most relevant skill package for a user's query (currently keyword-based).
*   **Specialized AI Domains (Simulated)**: Includes packages for Frontend Development, Backend Development, and Database Management.
    *   Frontend: Handles queries related to React, CSS, HTML, UI design.
    *   Backend: Handles queries related to APIs, server logic, authentication.
    *   Database: Handles queries related to SQL, schema design, query optimization.
*   **Resource Optimization (Simulated)**: Aims to reduce memory footprint by only keeping necessary packages active. Implements a Least Recently Used (LRU) policy for package unloading.
*   **Web Interface**: An interactive chat interface built with Streamlit to test and observe the system.
*   **Performance Monitoring (Simulated)**: Tracks basic metrics like response time, package load/unload events, and simulated memory usage.
*   **Dockerized**: Easy to set up and run using Docker and Docker Compose.

## 📂 Project Structure

```
.
├── modular_ai_mvp/
│   ├── __init__.py
│   ├── app.py                # Streamlit web interface
│   ├── config.py             # System configuration
│   ├── modular_ai_mvp.py     # Core system orchestrator (ModularAIMVP, RequestAnalyzer)
│   └── packages.py           # SkillPackage class and package definitions
├── model_cache/              # Placeholder for downloaded models
├── Dockerfile                # Defines the Docker image
├── docker-compose.yml        # Docker Compose configuration
├── requirements.txt          # Python dependencies
├── setup.py                  # Project setup script (basic)
├── example.py                # Example for programmatic use
└── README.md                 # This file
```

*(Note: `__init__.py` files will be added in a later step to make `modular_ai_mvp` a proper Python package if needed for `setup.py` or imports, but for Streamlit's direct run and Docker, the current structure works.)*

## 🚀 Setup and Running

### Prerequisites

*   Python 3.8+
*   Docker and Docker Compose (for Docker-based setup)

### Option 1: Local Python Environment (Recommended for Development)

1.  **Clone the repository (or create the files locally):**
    ```bash
    # git clone <repository_url> # If you have it in a git repo
    # cd modular-ai-mvp
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Streamlit application:**
    ```bash
    streamlit run app.py
    ```
    The application should open in your web browser (usually at `http://localhost:8501`).

### Option 2: Docker Deployment

1.  **Ensure Docker and Docker Compose are installed.**
2.  **Navigate to the project's root directory (where `Dockerfile` and `docker-compose.yml` are located).**
3.  **Build and run the application using Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    The application will be accessible at `http://localhost:8501`. To stop the application, press `Ctrl+C` in the terminal where Docker Compose is running, then run `docker-compose down`.


## 📝 Important Note on AI Model Simulation

Currently, the AI model loading and response generation within the `SkillPackage` class are **simulated**. This means:
*   No actual large language models (like `distilgpt2`) are downloaded or run by default during the simulated interaction.
*   The "loading" process involves a timed delay and setting a simulated memory footprint.
*   "Response generation" produces canned, template-based answers that indicate which package handled the request.

This simulation is intentional for the MVP stage to:
*   Allow rapid development and testing of the core modular architecture.
*   Keep resource requirements (CPU, RAM, disk space) very low.
*   Focus on the logic of package management, request routing, and the UI.

Future work will involve integrating actual Hugging Face Transformer models. The `MODEL_CACHE_DIR` and `model_path` in `config.py` are placeholders for this.

## 🛠️ Future Enhancements

*   Integrate real Hugging Face Transformer models.
*   Improve the `RequestAnalyzer` with more sophisticated NLP techniques.
*   Add persistent storage for conversation history.
*   Implement more detailed performance monitoring and logging.
*   Expand the number and variety of Skill Packages.
```
