from setuptools import setup, find_packages
import os

# Function to read requirements from requirements.txt
def load_requirements(path="requirements.txt"):
    if os.path.exists(path):
        with open(path, "r") as f:
            return [line.strip() for line in f if not line.startswith("#")]
    return []

# Basic project information
NAME = "modular-ai-mvp"
VERSION = "0.1.0" # Initial version
DESCRIPTION = "A Modular AI MVP system with dynamic skill package management."
AUTHOR = "AI MVP Team" # Or your name/handle
EMAIL = "your_email@example.com" # Optional
URL = "https_your_project_repo_url_here" # Optional, e.g., GitHub repo

setup(
    name=NAME,
    version=VERSION,
    description=DESCRIPTION,
    author=AUTHOR,
    author_email=EMAIL,
    url=URL,
    # find_packages() will look for Python packages (directories with __init__.py)
    # For the current flat structure, it might not find much unless we add __init__.py files.
    # We can specify packages manually or adjust structure later if needed.
    # For now, let's assume our main scripts are top-level.
    # If app.py, config.py etc. were inside a 'src' or 'modular_ai_mvp' directory
    # (as a package), find_packages() would be more relevant.
    packages=find_packages(where="."), # Looks for packages in the current directory
    py_modules=["app", "config", "modular_ai_mvp", "packages"], # List top-level .py files if not in a package
    
    # install_requires should ideally be sourced from requirements.txt for consistency
    # For this example, we'll use the function defined above.
    install_requires=load_requirements(),
    
    # Optional: Entry points for command-line scripts
    # entry_points={
    #     "console_scripts": [
    #         "modular-ai-cli=modular_ai_mvp.cli:main", # Example if we had a cli.py
    #     ],
    # },
    
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Operating System :: OS Independent",
        "License :: OSI Approved :: MIT License", # Assuming MIT, update if different
    ],
    python_requires=">=3.8", # Minimum Python version
    keywords="ai, nlp, modular, transformers, streamlit, mvp",
    
    # If you have a LICENSE file
    # license="MIT", 
    
    # For MANIFEST.in to include other files (not strictly needed for this pure Python app)
    # include_package_data=True, 
)

# To build a wheel: python setup.py sdist bdist_wheel
# To install locally for development: pip install -e .
