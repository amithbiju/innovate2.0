import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { format } from 'date-fns';

function TaskItem({ task, onEdit, onDelete, onToggleStatus }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue =
    new Date(task.dueDate) < new Date() && task.status !== 'Completed';

  const getCategoryColor = (category) => {
    const colors = {
      Work: 'primary',
      Personal: 'secondary',
      Shopping: 'success',
      Health: 'error',
      Other: 'default',
    };
    return colors[category] || 'default';
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        border: isOverdue ? 2 : 1,
        borderColor: isOverdue ? 'error.main' : 'divider',
        cursor: 'grab',
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={1}>
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ mt: 0.5 }}
          >
            <DragIndicatorIcon />
          </IconButton>

          <Box flex={1}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Typography
                variant="h6"
                component="div"
                sx={{
                  textDecoration:
                    task.status === 'Completed' ? 'line-through' : 'none',
                  color:
                    task.status === 'Completed' ? 'text.secondary' : 'text.primary',
                }}
              >
                {task.title}
              </Typography>
              <Box>
                <Tooltip title={task.status === 'Completed' ? 'Mark as Open' : 'Mark as Completed'}>
                  <IconButton
                    size="small"
                    onClick={() => onToggleStatus(task)}
                    color={task.status === 'Completed' ? 'success' : 'default'}
                  >
                    {task.status === 'Completed' ? (
                      <CheckCircleIcon />
                    ) : (
                      <RadioButtonUncheckedIcon />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Task">
                  <IconButton
                    size="small"
                    onClick={() => onEdit(task)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Task">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(task)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {task.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {task.description}
              </Typography>
            )}

            <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
              <Chip
                label={task.category}
                color={getCategoryColor(task.category)}
                size="small"
              />
              <Chip
                label={task.status}
                color={task.status === 'Completed' ? 'success' : 'info'}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}
                size="small"
                color={isOverdue ? 'error' : 'default'}
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default TaskItem;
