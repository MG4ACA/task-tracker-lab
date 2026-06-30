import { useState } from 'react';
import { createTasks, type Task } from '../api/tasks';

interface Props {
  onTaskAdded: (task: Task) => void;
}

export function AddTaskForm({ onTaskAdded }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError('');
    try {
      const newTask = await createTasks(title, description);
      onTaskAdded(newTask);
      setTitle('');
      setDescription('');
    } catch {
      setError('Failed to create task. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <h3>Add New Task</h3>
      <input
        type="text"
        placeholder="Task title *"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }}
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        style={{ width: '100%', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}
