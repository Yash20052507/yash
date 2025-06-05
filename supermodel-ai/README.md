# SuperModel AI 🚀

**Tagline:** A modular, self-evolving AI that dynamically loads skill-specific data packs to deliver efficient, focused, and cost-effective outputs.

**Vision:** To create an AI system that mimics human cognitive efficiency by activating only the necessary skills for a task, reducing compute costs, improving performance, and enabling seamless extensibility through a skill pack ecosystem.

## Overview

SuperModel AI is a full-stack application designed to demonstrate a modular AI system. It features a Node.js/Express/TypeScript backend and a React/TypeScript frontend. The core idea is to load "skill packs" (specialized knowledge modules) dynamically to handle user requests efficiently, rather than relying on a single monolithic AI model. This approach aims for cost optimization, better performance for specific tasks, and a flexible, extensible AI framework.

The platform includes user authentication, a marketplace for discovering and acquiring skill packs, a chat interface for interacting with the AI (utilizing selected skill packs), and management features for users and their skill packs.

## Key Features

**Backend:**
*   Node.js/Express server with TypeScript
*   PostgreSQL and MongoDB database integration
*   JWT authentication system
*   AI service integration (e.g., OpenAI for chat and embeddings)
*   Skill pack management (CRUD, content storage, embedding generation via background jobs)
*   Marketplace logic for public skill packs (listing, acquisition, reviews)
*   Chat session management with context and skill pack association
*   WebSocket support for real-time updates (e.g., chat messages, task progress)
*   RESTful API endpoints for all resources
*   Background job processing using BullMQ and Redis for tasks like embedding generation
*   Comprehensive error handling, logging, and rate limiting

**Frontend:**
*   React 18 with TypeScript and Create React App (`react-scripts`)
*   Tailwind CSS for styling with Dark Mode support
*   Chat interface for AI interactions
*   Skill pack marketplace with browsing, filtering, and acquisition
*   User authentication flows (Login, Register)
*   Dashboard for user overview
*   Session management for chat history
*   User profile management (details, API keys, transactions)
*   Management of user-owned/created skill packs
*   Real-time updates via WebSockets
*   Responsive design

## Tech Stack

*   **Backend:** Node.js, Express, TypeScript, PostgreSQL, MongoDB, Redis, Socket.IO, BullMQ, OpenAI API, Pinecone (for vector search - conceptual)
*   **Frontend:** React 18, TypeScript, Create React App (`react-scripts`), Tailwind CSS, Zustand (state management), React Router, Axios, Socket.IO Client
*   **DevOps:** Docker, Docker Compose, Nginx

## Project Structure

The project is organized into two main directories:

*   `backend/`: Contains the Node.js/Express application, including:
    *   `src/`: Source code (controllers, services, models, routes, AI logic, etc.)
    *   `scripts/`: Database migration and seed scripts
    *   `Dockerfile`: For containerizing the backend
*   `frontend/`: Contains the React application, including:
    *   `src/`: Source code (components, pages, store, services, etc.)
    *   `public/`: Static assets
    *   `Dockerfile`: For containerizing the frontend
    *   `nginx.conf`: Nginx configuration for serving the frontend and proxying
*   `docker-compose.yml`: Orchestrates all services (backend, frontend, databases, cache).
*   `.env`: (At project root) Configuration for Docker Compose services.

## Prerequisites

*   Node.js (v18.x or later recommended)
*   npm (v8.x or later) or yarn
*   Docker & Docker Compose (latest versions recommended)
*   Access to a PostgreSQL instance (or run via Docker)
*   Access to a MongoDB instance (or run via Docker)
*   Access to a Redis instance (or run via Docker)
*   Git

## Setup and Running Locally

### 1. Backend Setup

   a. **Navigate to backend directory:**
      ```bash
      cd supermodel-ai/backend
      ```
   b. **Install dependencies:**
      ```bash
      npm install
      ```
   c. **Set up environment variables:**
      Copy `.env.example` to `.env` and fill in your local database URIs, API keys, JWT secret, etc.
      ```bash
      cp .env.example .env
      # Edit .env with your configurations
      ```
   d. **Run database migrations (PostgreSQL):**
      Ensure your PostgreSQL server is running and accessible.
      ```bash
      npm run migrate
      ```
   e. **Seed database (MongoDB & potentially PostgreSQL initial data):**
      Ensure your MongoDB server is running. The seed script connects to MongoDB.
      ```bash
      npm run seed
      ```
   f. **Run the backend server:**
      *   For development with hot-reloading:
          ```bash
          npm run dev
          ```
      *   For production build & run (after `npm run build`):
          ```bash
          npm run build
          npm start
          ```
      The backend will typically run on `http://localhost:5000` (or as configured in `.env`).

### 2. Frontend Setup

   a. **Navigate to frontend directory:**
      ```bash
      cd supermodel-ai/frontend
      # (from project root, or cd ../frontend from backend)
      ```
   b. **Install dependencies:**
      ```bash
      npm install
      ```
   c. **Set up environment variables:**
      Copy `.env.example` to `.env` and adjust if necessary (e.g., `REACT_APP_API_URL` if backend is not on port 5000).
      ```bash
      cp .env.example .env
      # Edit .env if needed
      ```
   d. **Run the frontend development server:**
      ```bash
      npm start
      ```
      The frontend will typically run on `http://localhost:3000`.

## Setup and Running with Docker

This is the recommended way to run the entire application stack.

1.  **Clone the repository (if not already done):**
    ```bash
    # git clone ...
    cd supermodel-ai
    ```
2.  **Set up root environment file:**
    Copy the provided root `.env.example` (if one exists, otherwise create one based on the `docker-compose.yml` needs) to `.env` in the `supermodel-ai` project root.
    ```bash
    cp .env.example .env
    # Or create .env based on the variables in docker-compose.yml
    # Ensure all variables like database passwords, API keys, JWT_SECRET are set.
    ```
    The `supermodel-ai/.env` file should contain configurations like:
    ```env
    # General
    NODE_ENV=development
    COMPOSE_PROJECT_NAME=supermodelai

    # PostgreSQL
    POSTGRES_USER=supermodeladmin
    POSTGRES_PASSWORD=supermodelsecretpassword
    # ... (and other variables as defined in the docker-compose setup step)
    ```

3.  **Build and run services using Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces Docker to rebuild images if Dockerfiles have changed.
    *   `-d`: Runs containers in detached mode.

4.  **Accessing services:**
    *   **Frontend:** `http://localhost` (or `http://localhost:PORT` if `FRONTEND_PORT_HOST` in `.env` is not 80)
    *   **Backend API:** `http://localhost/api` (proxied by Nginx) or directly on its host port if mapped (e.g., `http://localhost:5001/api` if `BACKEND_PORT_HOST` is 5001).
    *   **Databases/Redis:** Typically accessed by the backend service using their service names (e.g., `postgres`, `mongodb`, `redis`) within the Docker network. Host ports are also mapped in `docker-compose.yml` for external tools if needed.

5.  **To stop services:**
    ```bash
    docker-compose down
    ```

6.  **To view logs:**
    ```bash
    docker-compose logs -f backend # Or frontend, postgres, etc.
    ```

7.  **Running Migrations/Seed with Docker (if backend doesn't auto-run on start):**
    You might need to run migrations or seed scripts manually against the Dockerized backend if they are not part of its startup process.
    ```bash
    docker-compose exec backend npm run migrate
    docker-compose exec backend npm run seed
    ```

## Environment Variables

Key environment variables are managed in:
*   `supermodel-ai/backend/.env.example`: Template for backend-specific variables when running locally.
*   `supermodel-ai/frontend/.env.example`: Template for frontend-specific variables (mostly `REACT_APP_*`).
*   `supermodel-ai/.env` (root): **Crucial for Docker Compose.** Defines configurations for all services, including database credentials, API keys, ports, etc. This file is used by `docker-compose.yml`.

**Important variables in `supermodel-ai/.env` (for Docker):**
*   `NODE_ENV`: `development` or `production`.
*   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Credentials for PostgreSQL.
*   `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`: Credentials for MongoDB.
*   `REDIS_PORT`: Redis port.
*   `BACKEND_PORT`, `BACKEND_PORT_HOST`: Backend internal and host-exposed ports.
*   `FRONTEND_PORT_HOST`: Host-exposed port for the frontend (Nginx).
*   `JWT_SECRET`, `JWT_EXPIRATION`: For JWT authentication.
*   `OPENAI_API_KEY`: For OpenAI integration.
*   `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX`: For Pinecone vector database.
*   `CORS_ORIGIN`: Allowed origin for backend CORS policy (e.g., `http://localhost` if frontend is on port 80).

## API Documentation (Overview)

The backend provides a RESTful API. Key endpoint groups include:

*   **Auth (`/api/auth`)**
    *   `POST /register`: Register a new user.
    *   `POST /login`: Log in an existing user, returns JWT.
    *   `GET /me`: Get current authenticated user's details.
*   **Sessions (`/api/sessions`)**
    *   `GET /`: List user's chat sessions.
    *   `POST /`: Create a new chat session.
    *   `GET /{sessionId}`: Get details of a specific session (including messages).
    *   `POST /{sessionId}/messages`: Post a new message to a session (AI responds).
*   **Skill Packs (`/api/skill-packs`)** (User's own packs)
    *   `GET /`: List skill packs created/owned by the user.
    *   `POST /`: Create a new skill pack.
    *   `PUT /{skillPackId}`: Update a skill pack.
    *   `POST /{skillPackId}/content`: Update skill pack content (MongoDB).
    *   `POST /{skillPackId}/generate-embeddings`: Trigger embedding generation task.
*   **Marketplace (`/api/marketplace`)**
    *   `GET /skill-packs`: List public skill packs available for acquisition. (Corrected path)
    *   `GET /skill-packs/{skillPackId}`: Get details of a specific public skill pack. (Corrected path)
    *   `POST /skill-packs/{skillPackId}/acquire`: Acquire a skill pack. (Corrected path)
    *   `POST /skill-packs/{skillPackId}/reviews`: Submit a review for a skill pack. (Corrected path)
*   **Tasks (`/api/tasks`)**
    *   `GET /{taskId}`: Get the status of a background task.
*   **Users (`/api/users`)**
    *   `GET /profile`: Get current user's full profile.
    *   `PUT /profile`: Update user's profile.
    *   `POST /api-keys`: Generate a new API key.

*(This is a basic overview. Consider using tools like Swagger/OpenAPI for detailed, interactive API documentation by integrating them into the backend.)*

## Architecture Highlights

*   **Modular AI Core:** Designed around the concept of loading skill-specific data to the AI, rather than using a monolithic model.
*   **Dynamic Skill Loading:** (Conceptual) The system is built to allow dynamic loading/unloading of skill packs.
*   **Retrieval Augmented Generation (RAG):** (Conceptual for full implementation) Skill pack content, especially when vectorized with Pinecone, enables RAG for providing context to the LLM.
*   **JWT Authentication:** Secure stateless authentication using JSON Web Tokens.
*   **WebSocket Communication:** Real-time updates for chat and potentially other features using Socket.IO.
*   **Background Job Processing:** BullMQ and Redis handle asynchronous tasks like generating embeddings for skill packs.
*   **Microservice-Friendly (Conceptual):** While currently a monolith backend, the separation of concerns could allow future transition to microservices.

## Contributing

Contributions are welcome! Please follow these general guidelines:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Commit your changes with clear, descriptive messages.
4.  Push your branch and submit a pull request.
5.  Ensure your code follows existing style and linting rules.

*(More detailed contribution guidelines can be added later.)*

## License

This project is licensed under the **MIT License**. (A `LICENSE` file can be added to the repository root to formalize this).The project-level `README.md` has been created with the specified content. I've made sure to:
-   Include all requested sections.
-   Update the frontend tech stack to mention Create React App (`react-scripts`).
-   Corrected API paths in the "API Documentation" section for Marketplace to be `/api/marketplace/skill-packs/...` as that's how they were defined in `marketplaceRoutes.ts`.
-   Ensure formatting for code blocks and lists is appropriate for Markdown.

The README now provides a comprehensive overview of the SuperModel AI project, covering its purpose, features, tech stack, setup instructions for both local and Docker environments, environment variable guidance, a basic API overview, architectural highlights, and placeholders for contributing and license information.
