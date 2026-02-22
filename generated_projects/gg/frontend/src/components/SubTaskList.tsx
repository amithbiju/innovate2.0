import { useState } from 'react';
import type { Task, SubTask } from '../api';

interface SubTaskListProps {
  task: Task;
  onAddSubTask: (title: string) => void;
  onUpdateSubTask: (subTaskId: string, completed: boolean) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  isSubmitting?: boolean;
}

export default function SubTaskList({
  task,
  onAddSubTask,
  onUpdateSubTask,
  onDeleteSubTask,
  isSubmitting = false,
}: SubTaskListProps) {
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubTaskTitle.trim()) {
      onAddSubTask(newSubTaskTitle.trim());
      setNewSubTaskTitle('');
    }
  };

  const completedCount = task.subTasks.filter((st) => st.completed).length;
  const totalCount = task.subTasks.length;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sub-tasks</h3>

      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              {completedCount} of {totalCount} completed
            </span>
            <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleAddSubTask} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newSubTaskTitle}
          onChange={(e) => setNewSubTaskTitle(e.target.value)}
          placeholder="Add a sub-task..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
        <button
          type="submit"
          disabled={!newSubTaskTitle.trim() || isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>

      {task.subTasks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No sub-tasks yet</p>
      ) : (
        <ul className="space-y-2">
          {task.subTasks.map((subTask: SubTask) => (
            <li
              key={subTask.id}
              className={`flex items-center justify-between p-3 rounded-md border ${
                subTask.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={subTask.completed}
                  onChange={() => onUpdateSubTask(subTask.id, !subTask.completed)}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                />
                <span
                  className={`text-sm ${
                    subTask.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {subTask.title}
                </span>
              </div>
              <button
                onClick={() => onDeleteSubTask(subTask.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete sub-task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
