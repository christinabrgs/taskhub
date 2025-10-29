# TaskHub – REST API for Task Management

TaskHub is a REST API for managing tasks, tags, and workspaces secured by API key authentication.
 It’s built with Node.js, TypeScript, Express, and PostgreSQL.

------

## Overview

TaskHub organizes tasks within isolated workspaces. Each workspace supports multiple API keys for flexible access. The API includes task management, tagging, filtering, and pagination. 

------

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Validation:** Zod
- **Authentication:** API Key (SHA-256 hashed) - Crypto used for key generation and hashing
- **Testing:** Jest
- **Containerization:** Docker & Docker Compose

------

## Key Design Decisions

### API Key Authentication

**Relationship:** One-to-many (multiple keys per workspace)
 **Reasoning:** Allows separate applications or users to connect with unique credentials.
API keys are hashed with SHA-256 before storage for security.
While key rotation and invalidation weren’t implemented due to time constraints, a more fleshed out design would include invalidation allowing users to revoke keys when needed. 

Additionally, an expire_at field could be used to automatically expire keys after a set period, ensuring that inactive keys don’t remain valid indefinitely and users are forced to generate a new key.

### Pagination

A key-set cursor-based pagination was included for listing the tasks for simplicity and considering time restraints, a more complete build would have used opaque tokens for better security and abstraction over raw IDs.

### Data Validation 

Zod provides type-safe validation and clear error messages for clients.
 It ensures that invalid inputs are caught early and communicated effectively.

## Logging

Structured logs record detailed HTTP request data.

Where operations are idempotent, I used `UPDATE` instead of `DO NOTHING` to retrieve the value beyond the first insert.

### Error Handling

HTTP status codes follow standard semantics:

| Code | Description                     |
| ---- | ------------------------------- |
| 200  | Success                         |
| 201  | Created                         |
| 204  | No Content                      |
| 400  | Bad Request (validation errors) |
| 401  | Unauthorized                    |
| 403  | Forbidden                       |
| 404  | Not Found                       |
| 500  | Internal Server Error           |

Zod error responses specify which fields failed validation.

In a production setting, I would define error constants to ensure consistent error handling across controllers.

------

## Database Schema

**Schema Design:** [View on dbdiagram.io](https://dbdiagram.io/d/69001985357668b732e3b465)

```
workspaces (id, name)
 ├── api_keys (id, workspace_id, key[hashed])
 ├── tasks (id, title, description, status, due_date, workspace_id, created_by, deleted_at)
 ├── tags (id, name, workspace_id) [unique per workspace]
 └── task_tags (tag_id, task_id) [many-to-many]
```

------

## Local Development Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Environment Variables

Create a `.env` file:

```
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=taskhub
DB_PORT=5432
```

### Run Instructions

```
# Clone repository
git clone <repository-url>
cd taskhub

# Install dependencies 
npm install

# Start Database in Docker Container
docker-compose up

# Apply schema
# Option 1: Run SQL in src/db/taskhub.sql
# Option 2: Use pgAdmin (admin@admin.com / admin)

# Start server
npm run dev
```

API available at **http://localhost:5000**
 pgAdmin available at **http://localhost:5050**

------

## Endpoints (Summary)

### Workspaces

- `POST /workspaces` – Create a workspace

  Request Body:

  {
    "name": "My Workspace"
  }

- `POST /workspaces/:wsId/apikeys` – Generate an API key

### Tasks

- `POST /workspaces/:wsId/tasks` – Create a task

  Request Body:
 ```
  {
    "title": "Implement user authentication",
    "description": "Add login and registration endpoints",
    "status": "todo",
    "dueDate": "2024-12-31"
  }
 ```
- `GET /workspaces/:wsId/tasks` – List tasks (supports filters and pagination)

  **Query Parameters:**

  • status: Filter by status (todo, in_progress, done)
  • due_before: Filter tasks due before date (ISO format)
  • q: Search in title/description
  • cursor: Pagination cursor
  • limit: Number of results (max 100, default 10)

- `PATCH /workspaces/:wsId/tasks/:taskId` – Partially update a task

  Request Body:
 ```
  {
    "status": "in_progress",
    "title": "Updated title"
  }`
 ```
- `DELETE /workspaces/:wsId/tasks/:taskId` – Soft delete

- `POST /workspaces/:wsId/tasks/:taskId/tags/:name` – Attach tag to a task

### Tags

- `PUT /workspaces/:wsId/tags/:name` – Create or update a tag (idempotent)

### Stats

- `GET /workspaces/:wsId/stats` – 

------

## Testing

Jest is configured for unit and integration testing. Testing is not yet implemented.

### API Testing Script

A temporary API testing script is available at `test_api.sh` to test all endpoints:

```bash
# Make the script executable
chmod +x test_api.sh

# Run the API tests (ensure server is running on port 5000)
./test_api.sh
```

**What the script tests:**
- Creates a workspace and generates API key
- Creates 6 diverse tasks with different statuses and due dates
- Creates 4 tags (urgent, bug, feature, documentation) and attaches them to tasks
- Tests all CRUD operations for tasks
- Tests filtering, pagination, and search functionality
- Tests tag operations and tag-based filtering
- Tests workspace statistics
- Verifies soft delete functionality

------

## Migrations

If the project evolved toward TypeScript-native queries, I would implement Drizzle, a more modern ORM and migration tool. The API and tooling is very slick and easy to use, and the documentation is top notch.

------

## Future Enhancements
- create seed data
- Implement / Expand testing
- add linting and autocode formating
- Implement invalidation for keys
- Add Drizzle migrations
- Introduce consistent error constants

------

## Deployment Plan (AWS)

For deployment, I would likely use AWS ECS for container management, similar to Docker. I’d also consider Amazon RDS for a managed PostgreSQL database. To monitor API performance and requests, I’d implement Amazon CloudWatch, and potentially use API Gateway for more detailed logging and analytics.

Though this is based off research of different amazon services as I don't yet have direct hands-on experience with AWS Services, ideally I would consult with a more senior engineer to implement a solid plan for deployment.

------

## AI Usage

enjoy my chaotic convos with chatGPT

https://docs.google.com/document/d/19QbxfJYBYMz8zpZb4umo3wmjE7COgOXq3TkbS0LgSg4/edit?usp=sharing
https://docs.google.com/document/d/1fSgciyRmGzzw7PejWfTR-SWhVRxooYBNoY2zakU39CM/edit?usp=sharing

Additionally, I added transcripts of convos with OpenCode in Markdown format to the root directory

##### 
