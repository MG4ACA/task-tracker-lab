import { useEffect, useState } from 'react';
import { type Task, type TaskStatus, fetchTasks } from './api/tasks';
import { AddTaskForm } from './components/AddTaskForm';
import { TaskCard } from './components/TaskCard';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch(() => setError('Could not connect to backend.'))
      .finally(() => setLoading(false));
  }, []);

  const handleTaskAdded = (newTask: Task) => setTasks(prev => [newTask, ...prev]);
  const handleStatusChange = (id: number, status: TaskStatus) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  const handleDelete = (id: number) =>
    setTasks(prev => prev.filter(t => t.id !== id));

  return (
    <div style={{ maxWidth: '710px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1>Task Tracker</h1>
      <hr />
      <AddTaskForm onTaskAdded={handleTaskAdded} />
      <h3>Tasks ({tasks.length})</h3>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && tasks.length === 0 && <p style={{ color: '#888' }}>No tasks yet.</p>}
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

export default App;
