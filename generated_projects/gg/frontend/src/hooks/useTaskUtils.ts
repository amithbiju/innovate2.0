export const useTaskUtils = () => {
  const isOverdue = (dueDate: string, completed: boolean): boolean => {
    if (completed) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < now;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSubTaskProgress = (subTasks: { completed: boolean }[]): number => {
    if (subTasks.length === 0) return 0;
    const completed = subTasks.filter((st) => st.completed).length;
    return Math.round((completed / subTasks.length) * 100);
  };

  return {
    isOverdue,
    formatDate,
    getPriorityColor,
    getSubTaskProgress,
  };
};
