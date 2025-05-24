import streamlit as st
import time

# Assuming config.py, modular_ai_mvp.py, and packages.py are in the same directory
import config
from modular_ai_mvp import ModularAIMVP
from packages import create_frontend_package, create_backend_package, create_database_package

# --- Page Configuration ---
st.set_page_config(
    page_title=config.APP_TITLE,
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Initialize AI System ---
@st.cache_resource # Cache the system for the session
def initialize_system():
    """Initializes and returns the ModularAIMVP system."""
    system = ModularAIMVP(max_active_packages=config.MAX_ACTIVE_PACKAGES)
    
    # Register packages
    # These could also be dynamically discovered or configured in a more advanced setup
    system.register_package(create_frontend_package())
    system.register_package(create_backend_package())
    system.register_package(create_database_package())
    
    return system

mvp_system = initialize_system()

# --- Session State Initialization ---
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": "Hello! How can I assist you today with your development tasks?"}]
if "system_status" not in st.session_state:
    st.session_state.system_status = mvp_system.get_system_status()

# --- UI Rendering ---

# --- Sidebar ---
with st.sidebar:
    st.title("🛠️ System Control")
    st.markdown(config.APP_DESCRIPTION)
    st.divider()

    st.subheader("System Status")
    status = st.session_state.system_status # Use status from session state for display
    
    # Active Packages
    active_pkg_names = [details['name'] for details in status.get('active_package_details', {}).values()]
    st.metric(label="Active Packages", value=f"{status.get('active_packages_count', 0)} / {status.get('max_active_packages', config.MAX_ACTIVE_PACKAGES)}")
    if active_pkg_names:
        st.caption("Loaded: " + ", ".join(active_pkg_names))
    else:
        st.caption("No packages currently active.")

    # Performance Metrics
    perf_metrics = status.get('performance_metrics', {})
    st.metric(label="Requests Processed", value=perf_metrics.get('requests_processed', 0))
    st.metric(label="Avg. Response Time", value=f"{perf_metrics.get('average_response_time', 0):.2f} s")
    st.metric(label="Memory Usage (Sim.)", value=f"{status.get('current_memory_usage_mb', 0):.1f} MB")
    st.metric(label="Package Swaps", value=perf_metrics.get('package_swaps', 0))
    
    st.divider()
    if st.button("🔄 Reset Conversation & System State"):
        mvp_system.reset_conversation()
        mvp_system.unload_all_packages() # Also unload packages for a full reset
        st.session_state.messages = [{"role": "assistant", "content": "Conversation and system state have been reset."}]
        st.session_state.system_status = mvp_system.get_system_status() # Update status
        st.rerun()

    st.divider()
    st.caption(f"Modular AI MVP v0.1.0")


# --- Main Chat Interface ---
st.title(config.APP_TITLE + " 🧠")

# Display chat messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Handle user input
if prompt := st.chat_input("What can I help you build or analyze?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response_text = ""
        
        # Simulate thinking indicator
        with st.spinner("Thinking... (determining package, loading, generating response)"):
            # Process request with the MVP system
            ai_response = mvp_system.process_request(prompt)
            full_response_text = ai_response.get("response", "Sorry, I encountered an error.")
            packages_used = ai_response.get("packages_used", [])
            processing_time = ai_response.get("processing_time_seconds", 0)

        message_placeholder.markdown(full_response_text)
        
        # Optionally display package info and processing time with the response
        if packages_used:
            st.caption(f"🛠️ Packages used: {', '.join(packages_used)} | ⏱️ Time: {processing_time:.2f}s")

    st.session_state.messages.append({"role": "assistant", "content": full_response_text})
    
    # Update system status in session state after processing
    st.session_state.system_status = mvp_system.get_system_status()
    st.rerun() # Rerun to update sidebar immediately

# To run this app: streamlit run app.py
