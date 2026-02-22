# Task Management Backend

A Node.js Express.js backend with MongoDB and Mongoose for a Task Management MVP.

## Features

- RESTful API for task management
- MongoDB database with Mongoose ODM
- CORS enabled for frontend communication
- Query parameter support for filtering and sorting

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Environment:** dotenv

## Project Structure

```
backend/
├── server.js                 # Main entry point
├── src/
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── models/
│   │   └── Task.js          # Task schema
│   ├── controllers/
│   │   └── taskController.js # Business logic
│   └── routes/
│       └── taskRoutes.js    # API routes
├── .env                     # Environment variables
├── .env.example             # Environment template
└── package.json
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI
   ```

3. Start the server:
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Tasks

| Method | Endpoint        | Description                              |
|--------|-----------------|------------------------------------------|
| GET    | /api/tasks      | Get all tasks (with filtering/sorting)   |
| GET    | /api/tasks/:id  | Get a single task by ID                  |
| POST   | /api/tasks      | Create a new task                        |
| PUT    | /api/tasks/:id  | Update an existing task                  |
| DELETE | /api/tasks/:id  | Delete a task                            |

### Query Parameters (GET /api/tasks)

- `status` - Filter by status ('Open' or 'Completed')
- `sortBy` - Field to sort by (e.g., 'dueDate', 'title', 'createdAt')
- `sortOrder` - Sort order ('asc' or 'desc', default: 'desc')

### Examples

```bash
# Get all tasks
GET /api/tasks

# Filter by status
GET /api/tasks?status=Open

# Sort by due date (ascending)
GET /api/tasks?sortBy=dueDate&sortOrder=asc

# Combined filtering and sorting
GET /api/tasks?status=Completed&sortBy=dueDate&sortOrder=desc
```

## Task Schema

```javascript
{
  title: String (required, max 100 chars),
  description: String (max 500 chars),
  status: String (enum: ['Open', 'Completed'], default: 'Open'),
  category: String,
  dueDate: Date,
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```
