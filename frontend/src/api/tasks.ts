const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5005/api";

export type TaskStatus = 0|1|2;

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  0: "Todo",
  1: "In Progress",
  2: "Done",
};

export async function fetchTasks(): Promise<Task[]>{
  const res = await fetch(`${API_BASE}/tasks`);
  if (!res.ok)
    throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function createTasks(title: string, description: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({title, description})
  })
  if (!res.ok)
    throw new Error("Failed to create task");
    
  return res.json();
}

export async function updateTaskStatus(id: number, status:TaskStatus):Promise<Task>{
  const res  = await fetch(`${API_BASE}/tasks/{id}/status`, {
    method: 'PATCH',
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({status})
  });
  if (!res.ok)
    throw new Error("Failed to update task status");
  return res.json();
}

export async function deleteTask(id: number): Promise<void>{
  const res = await fetch(`${API_BASE}/tasks${id}`, {
    method: 'DELETE',
  });
  if (!res.ok)
    throw new Error("Failed to delete task");
  }
