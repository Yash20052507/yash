# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV APP_HOME=/app

# Create a work directory
WORKDIR ${APP_HOME}

# Create a non-root user and group
RUN groupadd -r appgroup && useradd --no-log-init -r -g appgroup appuser

# Create model cache directory and set permissions
RUN mkdir -p ${APP_HOME}/model_cache && chown -R appuser:appgroup ${APP_HOME}/model_cache

# Install system dependencies (if any needed for your packages later, e.g., build-essential for some libs)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && #     apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appgroup ${APP_HOME}

# Switch to the non-root user
USER appuser

# Expose the port Streamlit runs on
EXPOSE 8501

# The command to run when the container starts
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
