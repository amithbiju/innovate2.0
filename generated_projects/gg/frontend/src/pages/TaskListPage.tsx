import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks, useDeleteTask, useToggleTaskComplete, useCreateTask, useUpdateTask } from '../hooks';
import { useAuthStore } from '../store';
import { TaskForm, TaskCard, TaskDetail } from '../components';
import type { Task, CreateTaskRequest, UpdateTaskRequest, CreateSubTaskRequest, UpdateSubTaskRequest } from '../api';
import { subTasksApi } from '../api';

export default function TaskListPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { data: tasks = [], isLoading } = useTasks();
  const deleteMutation = useDeleteTask();
  const toggleMutation = useToggleTaskComplete();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const handleCreateTask = async (data: CreateTaskRequest) => {
    await createMutation.mutateAsync(data);
    setShowCreateModal(false);
  };

  const handleUpdateTask = async (data: UpdateTaskRequest) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask.id, data });
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleComplete = async (id: string) => {
    await toggleMutation.mutateAsync(id);
  };

  const handleAddSubTask = async (title: string) => {
    if (viewingTask) {
      await subTasksApi.create(viewingTask.id, { title } as CreateSubTaskRequest);
    }
  };

  const handleUpdateSubTask = async (subTaskId: string, completed: boolean) => {
    if (viewingTask) {
      await subTasksApi.update(viewingTask.id, subTaskId, { completed } as UpdateSubTaskRequest);
    }
  };

  const handleDeleteSubTask = async (subTaskId: string) => {
    if (viewingTask) {
      if (window.confirm('Delete this sub-task?')) {
        await subTasksApi.delete(viewingTask.id, subTaskId);
      }
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Task Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Completed
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-2 text-gray-600">
              {filter === 'all' ? 'No tasks yet. Create your first task!' : `No ${filter} tasks.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={setEditingTask}
                onDelete={handleDeleteTask}
                onView={setViewingTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Task</h2>
            <TaskForm
              onSubmitCreate={handleCreateTask}
              onSubmitUpdate={() => {}}
              onCancel={() => setShowCreateModal(false)}
              isSubmitting={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Task</h2>
            <TaskForm
              task={editingTask}
              onSubmitCreate={() => {}}
              onSubmitUpdate={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {viewingTask && (
        <TaskDetail
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onAddSubTask={handleAddSubTask}
          onUpdateSubTask={handleUpdateSubTask}
          onDeleteSubTask={handleDeleteSubTask}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
