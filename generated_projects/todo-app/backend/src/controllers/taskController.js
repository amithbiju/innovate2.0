const crypto = require('crypto');
const { readTasks, writeTasks } = require('../config/db');

// @desc    Get all tasks with optional filtering and sorting
// @route   GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, sortBy, sortOrder } = req.query;
    let tasks = readTasks();

    // Filter by status
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    // Sort
    if (sortBy) {
      const order = sortOrder === 'asc' ? 1 : -1;
      tasks.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1 * order;
        if (a[sortBy] > b[sortBy]) return 1 * order;
        return 0;
      });
    }

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message,
    });
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const tasks = readTasks();
    const task = tasks.find((t) => t._id === req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message,
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, status, category, dueDate } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: ['Title is required'],
      });
    }

    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: ['Title cannot exceed 100 characters'],
      });
    }

    const now = new Date().toISOString();
    const task = {
      _id: crypto.randomUUID(),
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'Open',
      category: category ? category.trim() : '',
      dueDate: dueDate || null,
      createdAt: now,
      updatedAt: now,
    };

    const tasks = readTasks();
    tasks.push(task);
    writeTasks(tasks);

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message,
    });
  }
};

// @desc    Update existing task
// @route   PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const tasks = readTasks();
    const index = tasks.findIndex((t) => t._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const updatedTask = {
      ...tasks[index],
      ...req.body,
      _id: tasks[index]._id, // prevent ID overwrite
      updatedAt: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    writeTasks(tasks);

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const tasks = readTasks();
    const index = tasks.findIndex((t) => t._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    tasks.splice(index, 1);
    writeTasks(tasks);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message,
    });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
