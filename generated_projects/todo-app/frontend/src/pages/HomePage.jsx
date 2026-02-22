import React from 'react';
import { Container, CssBaseline, Box } from '@mui/material';
import { useTasks } from '../context/TaskContext';
import TaskList from '../components/TaskList';

function HomePage() {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
  } = useTasks();

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'Open' ? 'Completed' : 'Open';
    await updateTask(task._id, { ...task, status: newStatus });
  };

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <TaskList
            tasks={tasks}
            loading={loading}
            error={error}
            onCreate={createTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onToggleStatus={handleToggleStatus}
            onReorder={reorderTasks}
          />
        </Container>
      </Box>
    </>
  );
}

export default HomePage;
