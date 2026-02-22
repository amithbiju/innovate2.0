import type { Task } from '../api';
import { useTaskUtils } from '../hooks';
import SubTaskList from './SubTaskList';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onAddSubTask: (title: string) => void;
  onUpdateSubTask: (subTaskId: string, completed: boolean) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  isSubmitting?: boolean;
}

export default function TaskDetail({
  task,
  onClose,
  onAddSubTask,
  onUpdateSubTask,
  onDeleteSubTask,
  isSubmitting = false,
}: TaskDetailProps) {
  const { isOverdue, formatDate, getPriorityColor } = useTaskUtils();

  const overdue = isOverdue(task.dueDate, task.completed);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}
            >
              Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                task.completed
                  ? 'bg-green-100 text-green-800'
                  : overdue
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {task.completed ? 'Completed' : overdue ? 'Overdue' : 'Active'}
            </span>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
            <p className="text-gray-900">{formatDate(task.dueDate)}</p>
          </div>

          {task.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Created</h3>
            <p className="text-gray-900 text-sm">{formatDate(task.createdAt)}</p>
          </div>

          <SubTaskList
            task={task}
            onAddSubTask={onAddSubTask}
            onUpdateSubTask={onUpdateSubTask}
            onDeleteSubTask={onDeleteSubTask}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
