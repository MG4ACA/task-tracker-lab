import { deleteTask,type Task,type TaskStatus, taskStatusLabel, updateTaskStatus } from '../api/tasks';

interface Props {
  task: Task;
  onStatusChange: (id: number, status: TaskStatus) => void;
  onDelete: (id: number) => void;
}

const statusColors: Record<TaskStatus, string> = {
  0: '#f0f0f0',
  1: '#fff3cd',
  2: '#d4edda',
};

const nextStatus: Record<TaskStatus, TaskStatus> = {
  0: 1, 1: 2, 2: 0,
};

export function TaskCard({ task, onStatusChange, onDelete }: Props) {
  const handleStatusClick = async () => {
    const next = nextStatus[task.status];
    await updateTaskStatus(task.id, next);
    onStatusChange(task.id, next);
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onDelete(task.id);
  };

  return (
    <div style={{
      background: statusColors[task.status],
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    }}>
      <div>
        <strong>{task.title}</strong>
        {task.description && <p style={{ margin: '4px 0', color: '#555' }}>{task.description}</p>}
        <small style={{ color: '#888' }}>{new Date(task.createdAt).toLocaleDateString()}</small>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleStatusClick} style={{ fontSize: '12px' }}>
          {taskStatusLabel[task.status]} →
        </button>
        <button onClick={handleDelete} style={{ color: 'red', fontSize: '12px' }}>
          Delete
        </button>
      </div>
    </div>
  );
}
