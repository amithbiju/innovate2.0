# Node.js/Express.js MVP Backend

A simple REST API backend built with Node.js, Express.js, and MongoDB.

## Features

- RESTful API endpoints
- MongoDB database integration with Mongoose
- CORS enabled
- Environment configuration
- Error handling

## Project Structure

```
├── config/
│   └── db.js          # Database connection
├── controllers/
│   └── itemController.js
├── models/
│   └── Item.js        # Mongoose model
├── routes/
│   ├── index.js       # Root routes
│   └── items.js       # Item routes
├── middleware/
├── .env               # Environment variables
├── server.js          # Main server file
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mvp_db
```

3. Make sure MongoDB is running locally or update `MONGODB_URI` to use MongoDB Atlas.

4. Start the server:
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## API Endpoints

### Root
- `GET /` - Welcome message
- `GET /health` - Health check

### Items
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

## Example Requests

### Create Item
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Task 1","description":"First task","status":"pending","priority":"high"}'
```

### Get All Items
```bash
curl http://localhost:5000/api/items
```

## Item Schema

```javascript
{
  name: String (required, max 100 chars),
  description: String (required, max 500 chars),
  status: 'pending' | 'in_progress' | 'completed',
  priority: 'low' | 'medium' | 'high',
  createdAt: Date,
  updatedAt: Date
}
```
