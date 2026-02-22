const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

// GET all tasks (with optional query params for filtering and sorting)
router.get('/', getTasks);

// POST create new task
router.post('/', createTask);

// GET single task by ID
router.get('/:id', getTaskById);

// PUT update task by ID
router.put('/:id', updateTask);

// DELETE task by ID
router.delete('/:id', deleteTask);

module.exports = router;
