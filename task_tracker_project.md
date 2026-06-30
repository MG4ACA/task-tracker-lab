# Task Tracker — Build & Deploy Guide
> Stack: React + Vite · .NET 8 Minimal API · EF Core + SQLite · Azure · GitHub Actions CI/CD · Azure Bicep (IaC)
> Goal: A live, deployed, full-stack app you can demo and talk about in the interview.

---

## What You're Building

A Task Tracker where users can:
- **View** all tasks
- **Add** a new task (title + description)
- **Update** task status: `Todo` → `In Progress` → `Done`
- **Delete** a task

**Why this works in an interview:**
> *"I built and deployed a full-stack Task Tracker — React frontend on Azure Static Web Apps, .NET 8 Minimal API on Azure App Service, EF Core with SQLite for persistence, and the whole thing provisioned with Azure Bicep IaC and deployed via GitHub Actions on every push to main."*

---

## Folder Structure (Final)

```
task-tracker/
├── backend/                    ← .NET 8 Minimal API
│   ├── Program.cs
│   ├── Models/TaskItem.cs
│   ├── Data/AppDbContext.cs
│   └── backend.csproj
│
├── frontend/                   ← React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/tasks.ts        ← all API calls in one place
│   │   └── components/
│   │       ├── AddTaskForm.tsx
│   │       └── TaskCard.tsx
│   └── package.json
│
├── infra/                      ← Azure Bicep IaC
│   └── main.bicep
│
└── .github/workflows/
    ├── backend.yml             ← CI/CD for .NET API
    └── frontend.yml            ← CI/CD for React
```

---

# PHASE 1 — Backend (.NET 8 API)

## Step 1: Scaffold the Project

```bash
mkdir task-tracker
cd task-tracker
dotnet new web -n backend
cd backend
```

## Step 2: Install EF Core + SQLite

```bash
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
```

## Step 3: Create the Task Model

Create `Models/TaskItem.cs`:

```csharp
namespace TaskTracker.Models;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum TaskStatus
{
    Todo,
    InProgress,
    Done
}
```

> **Why `TaskItem` not `Task`?** C# already has `System.Threading.Task` — naming it `Task` would cause conflicts.

## Step 4: Create the Database Context

Create `Data/AppDbContext.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using TaskTracker.Models;

namespace TaskTracker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // This becomes the "Tasks" table in SQLite
    public DbSet<TaskItem> Tasks { get; set; }
}
```

## Step 5: Build Program.cs

Replace all content in `Program.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using TaskTracker.Data;
using TaskTracker.Models;

var builder = WebApplication.CreateBuilder(args);

// Register EF Core with SQLite — DB file created automatically
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=tasks.db"));

// Allow React frontend to call this API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();
app.UseCors("AllowFrontend");

// Auto-create DB and tables on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// ── GET all tasks ──────────────────────────────────────
app.MapGet("/api/tasks", async (AppDbContext db) =>
{
    var tasks = await db.Tasks
        .OrderByDescending(t => t.CreatedAt)
        .ToListAsync();
    return Results.Ok(tasks);
});

// ── GET one task ───────────────────────────────────────
app.MapGet("/api/tasks/{id}", async (int id, AppDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

// ── POST create task ───────────────────────────────────
app.MapPost("/api/tasks", async (CreateTaskRequest request, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest("Title is required.");

    var task = new TaskItem
    {
        Title = request.Title.Trim(),
        Description = request.Description?.Trim() ?? string.Empty,
        Status = TaskStatus.Todo,
        CreatedAt = DateTime.UtcNow
    };

    db.Tasks.Add(task);
    await db.SaveChangesAsync();

    return Results.Created($"/api/tasks/{task.Id}", task);
});

// ── PATCH update status only ───────────────────────────
app.MapPatch("/api/tasks/{id}/status", async (int id, UpdateStatusRequest request, AppDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    task.Status = request.Status;
    await db.SaveChangesAsync();

    return Results.Ok(task);
});

// ── DELETE task ────────────────────────────────────────
app.MapDelete("/api/tasks/{id}", async (int id, AppDbContext db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();

    db.Tasks.Remove(task);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.Run();

record CreateTaskRequest(string Title, string? Description);
record UpdateStatusRequest(TaskStatus Status);
```

## Step 6: Run and Test

```bash
dotnet run
```

Test with Thunder Client (VS Code extension) or browser:
```
GET    http://localhost:5000/api/tasks
POST   http://localhost:5000/api/tasks        body: { "title": "Buy milk" }
PATCH  http://localhost:5000/api/tasks/1/status  body: { "status": 1 }
DELETE http://localhost:5000/api/tasks/1
```

Status values: `0` = Todo, `1` = InProgress, `2` = Done

---

# PHASE 2 — Frontend (React + Vite + TypeScript)

## Step 7: Scaffold React App

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

## Step 8: API Service Layer — `src/api/tasks.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type TaskStatus = 0 | 1 | 2;

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  0: 'Todo',
  1: 'In Progress',
  2: 'Done',
};

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/api/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(title: string, description: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
}
```

## Step 9: AddTaskForm Component — `src/components/AddTaskForm.tsx`

```tsx
import { useState } from 'react';
import { createTask, Task } from '../api/tasks';

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
      const newTask = await createTask(title, description);
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
```

## Step 10: TaskCard Component — `src/components/TaskCard.tsx`

```tsx
import { Task, TaskStatus, taskStatusLabel, updateTaskStatus, deleteTask } from '../api/tasks';

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
```

## Step 11: App.tsx

```tsx
import { useState, useEffect } from 'react';
import { Task, TaskStatus, fetchTasks } from './api/tasks';
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
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
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
```

## Step 12: Test Full Stack Locally

Run both in separate terminals:
```bash
# Terminal 1 — backend
cd backend && dotnet run

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` — add tasks, change statuses, delete. Everything working = Phase 2 done.

---

# PHASE 3 — Azure IaC with Bicep

## Step 13: Create Azure Free Account

1. Go to **portal.azure.com**
2. Sign in with Microsoft account → Start Free
3. Credit card required but free tier won't charge

## Step 14: Install Azure CLI and Login

```bash
az --version          # check if installed
az login              # opens browser to sign in
```

## Step 15: Write `infra/main.bicep`

```bicep
param location string = resourceGroup().location
param appName string = 'task-tracker'
param environment string = 'prod'

// App Service Plan — Free tier (F1)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${appName}-plan-${environment}'
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
}

// App Service — hosts the .NET API
resource appService 'Microsoft.Web/sites@2022-03-01' = {
  name: '${appName}-api-${environment}'
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      netFrameworkVersion: 'v8.0'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
      ]
    }
  }
}

// Static Web App — hosts the React frontend (Free tier)
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: '${appName}-frontend-${environment}'
  location: 'eastus2'
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output apiUrl string = 'https://${appService.properties.defaultHostName}'
output staticWebAppName string = staticWebApp.name
```

## Step 16: Deploy Infrastructure

```bash
# Create resource group
az group create --name task-tracker-rg --location eastus

# Deploy Bicep — provisions all Azure resources
az deployment group create \
  --resource-group task-tracker-rg \
  --template-file infra/main.bicep
```

---

# PHASE 4 — CI/CD with GitHub Actions

## Step 17: Get Secrets for GitHub Actions

```bash
# Get .NET API publish profile
az webapp deployment list-publishing-profiles \
  --name task-tracker-api-prod \
  --resource-group task-tracker-rg \
  --xml

# Get Static Web App token
az staticwebapp secrets list \
  --name task-tracker-frontend-prod \
  --resource-group task-tracker-rg \
  --query "properties.apiKey"
```

Add both to GitHub → Settings → Secrets → Actions:
- `AZURE_WEBAPP_PUBLISH_PROFILE` → XML output from first command
- `AZURE_STATIC_WEB_APPS_API_TOKEN` → token from second command

## Step 18: `.github/workflows/backend.yml`

```yaml
name: Deploy .NET API

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 8
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - run: dotnet restore ./backend/backend.csproj
      - run: dotnet build ./backend/backend.csproj -c Release --no-restore
      - run: dotnet publish ./backend/backend.csproj -c Release -o ./publish

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'task-tracker-api-prod'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: './publish'
```

## Step 19: `.github/workflows/frontend.yml`

```yaml
name: Deploy React App

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
        working-directory: ./frontend

      - run: npm run build
        working-directory: ./frontend
        env:
          VITE_API_URL: https://task-tracker-api-prod.azurewebsites.net

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: './frontend'
          output_location: 'dist'
```

## Step 20: Push Everything and Watch It Deploy

```bash
git init
git add .
git commit -m "Task Tracker — full stack with IaC and CI/CD"
git remote add origin https://github.com/YOUR_USERNAME/task-tracker.git
git push -u origin main
```

Go to GitHub → **Actions** tab → watch both pipelines go green ✅

---

# Interview Talking Points

**"Walk me through your deployment:"**
> *"I provisioned all Azure infrastructure using Bicep — App Service Plan on free tier for the .NET API, and a Static Web App for React. The Bicep file is version-controlled, so the infrastructure is reproducible. On every push to main, GitHub Actions automatically builds and deploys — the .NET pipeline restores, builds, and publishes; the React pipeline does npm build with the live API URL injected via environment variable, then deploys to Static Web Apps."*

**"Why SQLite instead of Azure SQL?"**
> *"SQLite was a deliberate choice for this project — it's perfectly capable for a portfolio app and removes cloud DB cost and setup complexity. The EF Core abstraction means swapping to Azure SQL is a one-line connection string change. In production at scale I'd use Azure SQL or PostgreSQL."*

**"Why PATCH instead of PUT for status?"**
> *"PATCH is semantically correct for a partial update — only the status field changes. PUT would require the client to send the full task object, which risks accidentally overwriting fields. Using the right verb makes the API contract clearer and more predictable."*

**"How does state management work in the frontend?"**
> *"State lives in App.tsx using useState. On mount, useEffect fires once to load all tasks from the API. After that, each mutation — create, update, delete — calls the API and then updates local state directly without refetching. This keeps the UI responsive while the backend remains the source of truth."*

> [!TIP]
> Take a screenshot of the live URL + the GitHub Actions pipeline showing green ticks. That screenshot is your strongest portfolio evidence.
