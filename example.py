import logging
import time

# Assuming config.py, modular_ai_mvp.py and packages.py are in the same directory
import config
from modular_ai_mvp import ModularAIMVP
from packages import create_frontend_package, create_backend_package, create_database_package

# Setup basic logging for the example script
# (The modules themselves also configure logging, this ensures example script output is also formatted)
logging.basicConfig(
    level=config.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_example():
    """
    Demonstrates programmatic usage of the ModularAIMVP system.
    """
    logger.info("--- Starting Modular AI MVP Programmatic Example ---")

    # 1. Initialize the ModularAIMVP System
    # Using the MAX_ACTIVE_PACKAGES from config.py
    mvp_system = ModularAIMVP(max_active_packages=config.MAX_ACTIVE_PACKAGES)
    logger.info(f"ModularAIMVP system initialized with max_active_packages={mvp_system.max_active_packages}")

    # 2. Register Skill Packages
    logger.info("Registering skill packages...")
    frontend_pkg = create_frontend_package()
    backend_pkg = create_backend_package()
    database_pkg = create_database_package()

    mvp_system.register_package(frontend_pkg)
    mvp_system.register_package(backend_pkg)
    mvp_system.register_package(database_pkg)
    logger.info("All skill packages registered.")

    # Display initial system status
    initial_status = mvp_system.get_system_status()
    logger.info(f"Initial System Status: {initial_status['active_packages_count']} active packages, "
                f"Memory: {initial_status['current_memory_usage_mb']:.2f}MB (Simulated)")

    # 3. Define Example Prompts
    example_prompts = [
        {"prompt": "Create a React component for user authentication.", "expected_domain": "frontend"},
        {"prompt": "Design a REST API for a user management system.", "expected_domain": "backend"},
        {"prompt": "How can I optimize this SQL query for better performance on large datasets?", "expected_domain": "database"},
        {"prompt": "I need help with CSS for a responsive navigation bar.", "expected_domain": "frontend"},
        {"prompt": "What are the best practices for securing a Node.js backend application?", "expected_domain": "backend"},
        {"prompt": "A general question about the future of artificial intelligence.", "expected_domain": "any (fallback)"}, # Test fallback
        {"prompt": "Give me some HTML boilerplate.", "expected_domain": "frontend"},
    ]

    # 4. Process Prompts and Display Results
    for i, item in enumerate(example_prompts):
        prompt = item["prompt"]
        logger.info(f"\n--- Processing Prompt {i+1}/{len(example_prompts)} ---")
        logger.info(f"User Request: \"{prompt}\" (Expected Domain: {item['expected_domain']})")

        # Process the request through the system
        response_data = mvp_system.process_request(prompt)

        # Display the AI's response and metadata
        logger.info(f"AI Response: \"{response_data['response']}\"")
        logger.info(f"Packages Used: {response_data['packages_used']}")
        logger.info(f"Processing Time: {response_data['processing_time_seconds']:.2f} seconds")

        # Display current system status after each request
        current_status = mvp_system.get_system_status()
        active_pkg_names = [details['name'] for details in current_status.get('active_package_details', {}).values()]
        logger.info(f"System Status: {current_status['active_packages_count']} active packages ({', '.join(active_pkg_names)}), "
                    f"Memory: {current_status['current_memory_usage_mb']:.2f}MB (Simulated), "
                    f"Total Requests: {current_status['performance_metrics']['requests_processed']}")
        
        time.sleep(0.5) # Small delay to make logs easier to follow

    # 5. Display Final Performance Metrics
    final_status = mvp_system.get_system_status()
    perf_metrics = final_status['performance_metrics']
    logger.info("\n--- Final Performance Metrics ---")
    logger.info(f"Total Requests Processed: {perf_metrics['requests_processed']}")
    logger.info(f"Average Response Time: {perf_metrics['average_response_time']:.2f}s")
    logger.info(f"Total Package Loads: {perf_metrics['package_loads']}")
    logger.info(f"Total Package Unloads: {perf_metrics['package_unloads']}")
    logger.info(f"Total Package Swaps (due to LRU): {perf_metrics['package_swaps']}")
    logger.info(f"Total Simulated Memory Saved by Unloads: {perf_metrics['memory_saved_mb']:.2f}MB")
    logger.info(f"System Uptime: {final_status['uptime_seconds']:.2f}s")

    # 6. Example of unloading all packages
    logger.info("\n--- Unloading all packages ---")
    mvp_system.unload_all_packages()
    status_after_unload = mvp_system.get_system_status()
    logger.info(f"System Status after unload: {status_after_unload['active_packages_count']} active packages, "
                f"Memory: {status_after_unload['current_memory_usage_mb']:.2f}MB (Simulated)")


    logger.info("--- Modular AI MVP Programmatic Example Complete ---")

if __name__ == "__main__":
    # Create model cache directory if it doesn't exist (as packages.py might try to use it)
    import os
    os.makedirs(config.MODEL_CACHE_DIR, exist_ok=True)
    
    run_example()
```
