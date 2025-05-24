import time
import logging
from collections import OrderedDict

# Assuming config.py and packages.py are in the same directory
import config
from packages import SkillPackage, create_frontend_package, create_backend_package, create_database_package

# Setup basic logging
logging.basicConfig(level=config.LOG_LEVEL)
logger = logging.getLogger(__name__)

class RequestAnalyzer:
    """
    Analyzes user requests to determine the most relevant skill package.
    """
    def __init__(self, packages_config: dict):
        self.packages_config = packages_config
        self.keyword_to_package_map = self._build_keyword_map()

    def _build_keyword_map(self) -> dict:
        """
        Builds a simple keyword to package name mapping from package capabilities.
        """
        keyword_map = {}
        for pkg_name, pkg_details in self.packages_config.items():
            for capa in pkg_details.get("capabilities", []):
                keyword_map[capa.lower()] = pkg_name
            # Add package name and domain as keywords too
            keyword_map[pkg_name.lower()] = pkg_name
            keyword_map[pkg_details["domain"].lower().replace("_", " ")] = pkg_name
        return keyword_map

    defdetermine_package(self, prompt: str) -> list:
        """
        Determines the most relevant package(s) based on keywords in the prompt.
        Returns a list of package names, prioritized by occurrence.
        """
        prompt_lower = prompt.lower()
        detected_packages = {}

        for keyword, pkg_name in self.keyword_to_package_map.items():
            if keyword in prompt_lower:
                detected_packages[pkg_name] = detected_packages.get(pkg_name, 0) + 1
        
        if not detected_packages:
            logger.warning(f"No specific package detected for prompt: '{prompt[:50]}...'. Defaulting or using general logic might be needed.")
            # Simple fallback: if no keywords, maybe try to find a general package or return empty
            return []

        # Sort packages by relevance (number of keyword hits)
        sorted_packages = sorted(detected_packages.keys(), key=lambda pkg: detected_packages[pkg], reverse=True)
        logger.info(f"Determined relevant packages for prompt: {sorted_packages}")
        return sorted_packages

class ModularAIMVP:
    """
    Orchestrates the modular AI system, managing packages, processing requests,
    and monitoring performance.
    """
    def __init__(self, max_active_packages: int = config.MAX_ACTIVE_PACKAGES):
        self.packages = {}  # Stores all registered SkillPackage instances {name: SkillPackage}
        self.active_packages = OrderedDict() # Keeps track of loaded packages and their usage order (for LRU)
        self.max_active_packages = max_active_packages
        self.request_analyzer = RequestAnalyzer(config.PACKAGES)
        self.conversation_history = [] # To store tuples of (user_prompt, ai_response)
        self.start_time = time.time()

        # Performance metrics
        self.performance_metrics = {
            "requests_processed": 0,
            "total_response_time": 0.0,
            "average_response_time": 0.0,
            "package_loads": 0,
            "package_unloads": 0,
            "package_swaps": 0, # When an unload is forced by max_active_packages
            "memory_saved_mb": 0.0 # Theoretical, sum of unloaded package memories
        }
        logger.info("ModularAIMVP system initialized.")

    def register_package(self, package: SkillPackage) -> None:
        """
        Registers a skill package with the system.
        """
        if package.name in self.packages:
            logger.warning(f"Package '{package.name}' is already registered. Skipping.")
            return
        self.packages[package.name] = package
        logger.info(f"Package '{package.name}' (Domain: {package.domain}) registered.")

    def _load_package(self, package_name: str) -> bool:
        """
        Loads a skill package into active memory.
        Manages LRU unloading if max_active_packages is reached.
        """
        if package_name not in self.packages:
            logger.error(f"Attempted to load unregistered package: {package_name}")
            return False

        package_to_load = self.packages[package_name]

        if package_to_load.is_loaded:
            # Move to end of OrderedDict to mark as recently used
            self.active_packages.move_to_end(package_name)
            logger.info(f"Package '{package_name}' is already loaded and marked as recently used.")
            return True

        # Check if we need to unload a package
        if len(self.active_packages) >= self.max_active_packages:
            # Unload the least recently used package (first item in OrderedDict)
            lru_package_name, _ = self.active_packages.popitem(last=False)
            self.packages[lru_package_name].unload()
            self.performance_metrics["package_unloads"] += 1
            self.performance_metrics["package_swaps"] += 1
            self.performance_metrics["memory_saved_mb"] += self.packages[lru_package_name].memory_footprint_mb # before it's zeroed
            logger.info(f"Max active packages reached. Unloaded LRU package: '{lru_package_name}'.")

        logger.info(f"Loading package '{package_name}'...")
        package_to_load.load()
        if package_to_load.is_loaded:
            self.active_packages[package_name] = package_to_load
            self.performance_metrics["package_loads"] += 1
            return True
        else:
            logger.error(f"Failed to load package: {package_name}")
            return False

    def _unload_package(self, package_name: str) -> None:
        """
        Unloads a specific package.
        """
        if package_name in self.active_packages:
            self.packages[package_name].unload()
            del self.active_packages[package_name]
            self.performance_metrics["package_unloads"] += 1
            logger.info(f"Package '{package_name}' unloaded by explicit call.")
        else:
            logger.info(f"Package '{package_name}' not active, no need to unload explicitly.")


    def process_request(self, prompt: str, max_length: int = None, temperature: float = None) -> dict:
        """
        Processes a user request:
        1. Analyzes the prompt to determine the required package(s).
        2. Loads the primary required package if not already loaded (manages LRU).
        3. Generates a response using the package.
        4. Updates performance metrics.
        """
        start_req_time = time.time()
        logger.info(f"Processing request: '{prompt[:100]}...'")
        self.conversation_history.append({"role": "user", "content": prompt})

        determined_package_names = self.request_analyzer.determine_package(prompt)
        
        response_text = "Could not determine a suitable skill package for your request."
        packages_used_in_response = []

        if not determined_package_names:
            # Fallback: Try to use the most recently used active package if any, or a default
            if self.active_packages:
                # Use the most recently used one (last item in OrderedDict)
                # This is a simple heuristic; more sophisticated routing might be needed
                primary_package_name = next(reversed(self.active_packages))
                logger.warning(f"No specific package for prompt. Trying most recently used: {primary_package_name}")
                determined_package_names = [primary_package_name]
            else:
                # Or try loading the first package in config as a default if nothing is active
                if config.PACKAGES:
                    first_pkg_name = list(config.PACKAGES.keys())[0]
                    logger.warning(f"No specific package for prompt and no active packages. Trying default: {first_pkg_name}")
                    determined_package_names = [first_pkg_name]


        if determined_package_names:
            primary_package_name = determined_package_names[0] # Use the most relevant one

            if self._load_package(primary_package_name):
                active_package = self.packages[primary_package_name]
                response_text = active_package.generate_response(prompt, max_length, temperature)
                packages_used_in_response.append(active_package.name)
                # Mark as recently used
                self.active_packages.move_to_end(primary_package_name)
            else:
                response_text = f"Error: Failed to load the required package '{primary_package_name}'."
        else:
             logger.error("Still no package determined after fallback. Cannot process request.")
             response_text = "Unable to process your request as no suitable skill package could be identified or loaded."


        end_req_time = time.time()
        self._update_metrics(start_req_time, end_req_time)
        
        self.conversation_history.append({"role": "assistant", "content": response_text})

        return {
            "response": response_text,
            "packages_used": packages_used_in_response,
            "processing_time_seconds": round(end_req_time - start_req_time, 2)
        }

    def _update_metrics(self, start_time: float, end_time: float) -> None:
        """
        Updates performance tracking metrics.
        """
        self.performance_metrics["requests_processed"] += 1
        processing_time = end_time - start_time
        self.performance_metrics["total_response_time"] += processing_time
        self.performance_metrics["average_response_time"] = (
            self.performance_metrics["total_response_time"] / self.performance_metrics["requests_processed"]
        ) if self.performance_metrics["requests_processed"] > 0 else 0.0
        logger.info(f"Request processed in {processing_time:.2f}s. Avg response time: {self.performance_metrics['average_response_time']:.2f}s.")


    def get_system_status(self) -> dict:
        """
        Returns the current status of the system, including active packages and performance metrics.
        """
        current_memory_usage_mb = sum(pkg.memory_footprint_mb for pkg_name, pkg in self.active_packages.items())
        
        package_statuses = {name: pkg.get_status() for name, pkg in self.packages.items()} # Status for all registered packages
        active_package_details = {name: self.active_packages[name].get_status() for name in self.active_packages}


        return {
            "active_packages_count": len(self.active_packages),
            "max_active_packages": self.max_active_packages,
            "current_memory_usage_mb": round(current_memory_usage_mb, 2),
            "uptime_seconds": round(time.time() - self.start_time, 1),
            "performance_metrics": self.performance_metrics,
            "active_package_details": active_package_details, # Details of only active ones
            "all_package_statuses": package_statuses, # Status of all registered packages
            "conversation_history_length": len(self.conversation_history)
        }

    def reset_conversation(self) -> None:
        """Resets the conversation history."""
        self.conversation_history = []
        logger.info("Conversation history reset.")

    def get_conversation_history(self) -> list:
        """Returns the current conversation history."""
        return self.conversation_history

    def unload_all_packages(self) -> None:
        """Unloads all currently active packages."""
        active_names = list(self.active_packages.keys()) # Avoid issues with changing dict size during iteration
        for package_name in active_names:
            self._unload_package(package_name)
        logger.info("All active packages have been requested to unload.")


# Example Usage (for testing this module directly)
if __name__ == '__main__':
    logger.info("--- Testing Modular AI MVP System ---")

    # 1. Initialize System
    mvp_system = ModularAIMVP(max_active_packages=config.MAX_ACTIVE_PACKAGES)

    # 2. Register Packages (assuming create_..._package functions are available from packages.py)
    frontend_pkg = create_frontend_package()
    backend_pkg = create_backend_package()
    database_pkg = create_database_package()
    
    mvp_system.register_package(frontend_pkg)
    mvp_system.register_package(backend_pkg)
    mvp_system.register_package(database_pkg)

    logger.info(f"Initial system status: {mvp_system.get_system_status()}")

    # 3. Process some requests
    prompts = [
        "Can you help me with a React component for a user login form?", # Frontend
        "I need to design a REST API for managing products in an e-commerce app.", # Backend
        "How do I optimize this SQL query: SELECT * FROM users WHERE age > 30?", # Database
        "What's the best way to handle CSS for responsive design?", # Frontend
        "Tell me about user authentication using JWT with a Node.js backend.", # Backend
        "A general question about AI.", # Should use a fallback or default
    ]

    for i, p in enumerate(prompts):
        logger.info(f"--- Processing Prompt {i+1}: '{p}' ---")
        response_data = mvp_system.process_request(p)
        logger.info(f"Response: {response_data['response']}")
        logger.info(f"Packages Used: {response_data['packages_used']}")
        logger.info(f"Processing Time: {response_data['processing_time_seconds']:.2f}s")
        logger.info(f"System status: {mvp_system.get_system_status()}")
        time.sleep(1) # Brief pause

    # 4. Test unloading all packages
    logger.info("--- Testing Unload All Packages ---")
    mvp_system.unload_all_packages()
    logger.info(f"System status after unloading all: {mvp_system.get_system_status()}")
    
    # 5. Test reset conversation
    logger.info("--- Testing Reset Conversation ---")
    logger.info(f"Conversation length before reset: {len(mvp_system.get_conversation_history())}")
    mvp_system.reset_conversation()
    logger.info(f"Conversation length after reset: {len(mvp_system.get_conversation_history())}")

    logger.info("--- Modular AI MVP System Test Complete ---")
