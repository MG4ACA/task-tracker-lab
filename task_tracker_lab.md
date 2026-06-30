# Task Tracker — Lab Guide
> Style: No code given. Build it yourself. Verify with the Expected Result.
> Reference: Use `task_tracker_project.md` only if you are completely stuck after trying.

---

## Before You Start

**Tools you need open:**
- VS Code
- Terminal (inside VS Code)
- Browser (for testing APIs — use Thunder Client extension or just the address bar for GETs)
- `task_tracker_project.md` — only open this as a last resort

**Rule:** Read the concept. Think about it. Try to write it. Check the expected result. Only look at the reference file if you've genuinely tried and failed twice.

---

# PHASE 1 — Backend

---

## Lab 1 — Scaffold the .NET Project

**What to do:**
Create a new folder called `task-tracker`. Inside it, use the .NET CLI to create a new minimal web API project called `backend`. Open it in VS Code.

**Concept:**
`dotnet new web` creates a minimal ASP.NET Core project — just a `Program.cs` and a `.csproj` file. No controllers, no heavy boilerplate. This is the Minimal API pattern.

**Expected Result:**
- A folder called `backend/` exists inside `task-tracker/`
- Running `dotnet run` inside it starts a server
- Visiting `http://localhost:5000` in your browser returns `Hello World!` or similar
- No errors in the terminal

---

## Lab 2 — Install EF Core and SQLite

**What to do:**
Using the `dotnet add package` command, install two NuGet packages into the `backend` project:
1. The EF Core SQLite provider
2. The EF Core design tools (needed for migrations)

**Concept:**
EF Core is an ORM (Object-Relational Mapper) — it lets you work with a database using C# classes instead of writing raw SQL. SQLite stores the entire database in a single `.db` file on disk — perfect for a small project, no server setup needed.

**Expected Result:**
- Your `backend.csproj` file now contains two new `<PackageReference>` entries
- Running `dotnet build` still succeeds with no errors

---

## Lab 3 — Create the Task Model

**What to do:**
Create a folder called `Models/` inside `backend/`. Inside it, create a file called `TaskItem.cs`.

Define a C# class called `TaskItem` with these properties:
- `Id` — integer, will be the primary key
- `Title` — string (should default to empty string, not null)
- `Description` — string (should default to empty string)
- `Status` — an enum type you also define, with three values: `Todo`, `InProgress`, `Done`. Default should be `Todo`
- `CreatedAt` — DateTime, default to the current UTC time

Also define the `TaskStatus` enum in the same file.

**Concept:**
In C#, a class represents a data structure. EF Core will read this class and automatically create a matching database table — each property becomes a column. The enum maps to an integer in the database (Todo=0, InProgress=1, Done=2).

**Why `TaskItem` not `Task`?**
C# already has a built-in class called `System.Threading.Task`. Naming your class `Task` would cause a naming conflict.

**Expected Result:**
- File `Models/TaskItem.cs` exists
- Running `dotnet build` succeeds with no errors
- The class has exactly 5 properties and the enum has 3 values

---

## Lab 4 — Create the Database Context

**What to do:**
Create a folder called `Data/` inside `backend/`. Create a file `AppDbContext.cs`.

Define a class called `AppDbContext` that:
- Inherits from `DbContext` (from EF Core)
- Has a constructor that accepts `DbContextOptions<AppDbContext>` and passes it to the base class
- Has one property of type `DbSet<TaskItem>` called `Tasks`

**Concept:**
`DbContext` is the EF Core class that represents a session with the database. Think of it as the bridge between your C# code and the SQLite file. `DbSet<TaskItem>` represents the "Tasks" table — you'll query and modify tasks through it.

The constructor pattern (`options` passed to `base`) is how .NET's Dependency Injection system configures the database connection. You'll register it in `Program.cs` next.

**Expected Result:**
- File `Data/AppDbContext.cs` exists
- Running `dotnet build` succeeds
- The class references `TaskItem` from your `Models` namespace

---

## Lab 5 — Register EF Core and Add CORS in Program.cs

**What to do:**
Open `Program.cs`. Before `var app = builder.Build();`, add two registrations:

1. **Register EF Core with SQLite:** Tell the DI container to use `AppDbContext` with a SQLite database stored in a file called `tasks.db`
2. **Register CORS:** Add a CORS policy named `"AllowFrontend"` that allows any origin, any method, and any header

After `var app = builder.Build();`:
3. **Apply CORS:** Use the policy you just registered
4. **Auto-create the database:** Get the `AppDbContext` from the DI container using a scope, and call `EnsureCreated()` on it — this creates the SQLite file and tables automatically on first run

**Concept:**
- `builder.Services.Add...` = register a service so it can be injected anywhere
- `app.Use...` = add middleware to the request pipeline
- `EnsureCreated()` checks if the database exists — if not, it creates it based on your model classes. This means no manual migration commands needed for this project.

**Expected Result:**
- Running `dotnet run` still works with no errors
- A file called `tasks.db` is created in your `backend/` folder after the first run
- No null reference errors or missing service errors

---

## Lab 6 — Build the GET All Tasks Endpoint

**What to do:**
Add a route: `GET /api/tasks`

It should:
- Accept the `AppDbContext` as a parameter (EF Core injects it automatically in Minimal APIs)
- Query all tasks from the database, ordered by `CreatedAt` descending (newest first)
- Return them with a `200 OK` status

Make the handler `async`.

**Concept:**
In Minimal APIs, you use `app.MapGet(route, handler)`. EF Core query methods like `ToListAsync()` are async — always `await` them. The `async` keyword on the handler function tells .NET this function will have awaitable operations inside.

Ordering descending means the most recently created task appears first in the list.

**Expected Result:**
Test: `GET http://localhost:5000/api/tasks`
- Returns `200 OK`
- Body is an empty JSON array `[]` (no tasks yet)
- If you stop and re-run — still `[]`, not an error

---

## Lab 7 — Build the GET Single Task Endpoint

**What to do:**
Add a route: `GET /api/tasks/{id}`

It should:
- Accept an `int id` from the route and the `AppDbContext`
- Find the task with that ID using EF Core
- Return `200 OK` with the task if found
- Return `404 Not Found` if no task with that ID exists

**Concept:**
`{id}` in the route is a route parameter. Minimal APIs automatically parse and inject it as a typed parameter. `FindAsync(id)` is the EF Core shortcut for finding by primary key — more efficient than a full query.

Always check for null before returning — if the client asks for an ID that doesn't exist, `404` is the correct response.

**Expected Result:**
Test: `GET http://localhost:5000/api/tasks/999`
- Returns `404 Not Found`

Test: `GET http://localhost:5000/api/tasks/1` (after you've created a task in Lab 8)
- Returns `200 OK` with the task object

---

## Lab 8 — Build the POST Create Task Endpoint

**What to do:**
Add a route: `POST /api/tasks`

Create a `record` called `CreateTaskRequest` with two properties: `Title` (string) and `Description` (nullable string — `string?`).

The handler should:
- Accept a `CreateTaskRequest` from the request body and the `AppDbContext`
- Validate that `Title` is not null or whitespace — return `400 Bad Request` with a message if it is
- Create a new `TaskItem` with the title (trimmed), description (trimmed, or empty string if null), status set to `Todo`, and `CreatedAt` set to UTC now
- Save it to the database with EF Core
- Return `201 Created` with the new task object and the location header pointing to `/api/tasks/{newId}`

**Concept:**
`record` is a concise C# type for data objects — perfect for API request/response models.

Input validation at the API level is critical — never trust what the client sends. `string.IsNullOrWhiteSpace()` catches null, empty, and whitespace-only strings.

`Results.Created(location, value)` returns HTTP 201 and sets the `Location` header — this is the REST standard for resource creation responses.

**Expected Result:**
Test: `POST http://localhost:5000/api/tasks` with body `{ "title": "Buy groceries" }`
- Returns `201 Created`
- Body contains the full task object with `id`, `title`, `description`, `status: 0`, `createdAt`

Test: `POST http://localhost:5000/api/tasks` with body `{ "title": "" }`
- Returns `400 Bad Request` with your error message

Test: `GET http://localhost:5000/api/tasks`
- Now returns an array with 1 task in it
- The `tasks.db` file in your project folder has data in it (you can inspect it with a SQLite viewer)

---

## Lab 9 — Build the PATCH Update Status Endpoint

**What to do:**
Add a route: `PATCH /api/tasks/{id}/status`

Create a `record` called `UpdateStatusRequest` with one property: `Status` of type `TaskStatus`.

The handler should:
- Find the task by ID — return `404` if not found
- Update only the `Status` property on the found task
- Save changes
- Return `200 OK` with the updated task

**Concept:**
`PATCH` = partial update. You're not replacing the whole task — just changing one field. This is more correct and safer than `PUT` for this operation.

EF Core tracks changes automatically — once you modify a property on a tracked entity (one you fetched from the DB), calling `SaveChangesAsync()` writes only the changed fields.

**Expected Result:**
First create a task (status will be 0 = Todo).

Test: `PATCH http://localhost:5000/api/tasks/1/status` with body `{ "status": 1 }`
- Returns `200 OK`
- The task in the response now has `status: 1`

Test: `GET http://localhost:5000/api/tasks/1`
- Status is still `1` (persisted to DB)

---

## Lab 10 — Build the DELETE Endpoint

**What to do:**
Add a route: `DELETE /api/tasks/{id}`

The handler should:
- Find the task by ID — return `404` if not found
- Remove it from the database
- Return `204 No Content` (no body — this is the REST standard for successful deletes)

**Concept:**
`204 No Content` is the correct status for a successful DELETE — the resource is gone, there's nothing meaningful to return in the body.

**Expected Result:**
Test: `DELETE http://localhost:5000/api/tasks/1`
- Returns `204 No Content`

Test: `GET http://localhost:5000/api/tasks/1`
- Returns `404 Not Found` (it's gone)

Test: `DELETE http://localhost:5000/api/tasks/999`
- Returns `404 Not Found`

---

## Lab 11 — Backend Checkpoint

Before moving to the frontend, run through this full sequence manually. Everything must work:

1. `POST /api/tasks` — create a task called `"Write CV"`
2. `POST /api/tasks` — create a task called `"Prepare interview"`
3. `GET /api/tasks` — see both tasks, newest first
4. `PATCH /api/tasks/1/status` with `{ "status": 1 }` — move first task to In Progress
5. `GET /api/tasks/1` — confirm status is `1`
6. `DELETE /api/tasks/2` — delete the second task
7. `GET /api/tasks` — only one task remains, status is `1`

✅ All 7 steps work without errors = **Phase 1 complete**

---

# PHASE 2 — Frontend (React + Vite + TypeScript)

---

## Lab 12 — Scaffold the React App

**What to do:**
From the `task-tracker/` root folder, use `npm create vite@latest` to create a new project called `frontend` using the React TypeScript template. Install dependencies.

**Concept:**
Vite is a modern build tool — faster than Create React App. The `--template react-ts` flag scaffolds a React project with TypeScript already configured. TypeScript adds type safety — you'll catch errors at write time, not at runtime.

**Expected Result:**
- A `frontend/` folder exists
- Running `npm run dev` inside it starts the dev server at `http://localhost:5173`
- Browser shows the default Vite + React starter page

---

## Lab 13 — Create the API Service Layer

**What to do:**
Create a folder `src/api/` and a file `src/api/tasks.ts`.

In this file, define:
1. A TypeScript type for task status: a union type with values `0 | 1 | 2`
2. A TypeScript `interface` called `Task` with these fields: `id` (number), `title` (string), `description` (string), `status` (your TaskStatus type), `createdAt` (string)
3. A const object called `taskStatusLabel` that maps each status number to a string label ("Todo", "In Progress", "Done")
4. Four async functions:
   - `fetchTasks()` — GET all tasks, returns `Task[]`
   - `createTask(title, description)` — POST new task, returns `Task`
   - `updateTaskStatus(id, status)` — PATCH status, returns `Task`
   - `deleteTask(id)` — DELETE, returns nothing

Each function should use `fetch()` with `async/await`. Each should throw an `Error` if the response is not `ok`.

Use `import.meta.env.VITE_API_URL` for the base URL, with a fallback of `'http://localhost:5000'`.

**Concept:**
Keeping all API calls in one file (a "service layer") means: if the API URL or endpoint changes, you update one file — not every component. This is separation of concerns in practice.

`import.meta.env.VITE_API_URL` reads an environment variable that Vite injects at build time. In development it falls back to localhost. In production the CI/CD pipeline will inject the live Azure URL.

**Expected Result:**
- File `src/api/tasks.ts` exists
- TypeScript shows no red underlines (no type errors)
- Running `npm run dev` still works

---

## Lab 14 — Build the AddTaskForm Component

**What to do:**
Create `src/components/AddTaskForm.tsx`.

This component should:
- Accept one prop: `onTaskAdded` — a callback function that receives a `Task` and returns nothing
- Have local state for: `title` (string), `description` (string), `loading` (boolean), `error` (string)
- Render a `<form>` with: a text input for title (required), a textarea for description, an error message paragraph (only shown when error is not empty), a submit button (disabled when loading, shows "Adding..." text while loading)
- On form submit: prevent default, validate title is not empty, call `createTask()` from your API layer, call `onTaskAdded` with the result, clear the form fields, handle any error by setting the error state

**Concept:**
`onTaskAdded` is a callback prop — the parent component tells this component "when you successfully create a task, call this function." This pattern keeps state in the parent (which owns the task list) while the form component handles its own input state.

The `finally` block in a try/catch/finally runs whether the try succeeded or the catch ran — perfect for resetting `loading` to `false`.

**Expected Result:**
- The form renders with title input, description textarea, and submit button
- Typing in title and submitting calls the API (check Network tab in browser DevTools — F12)
- After submit, the form clears
- If you submit with an empty title, nothing happens (required attribute prevents it)
- If the backend is not running, the error message appears

---

## Lab 15 — Build the TaskCard Component

**What to do:**
Create `src/components/TaskCard.tsx`.

This component should:
- Accept three props: `task` (Task), `onStatusChange` (callback with id and new status), `onDelete` (callback with id)
- Render a card showing: task title (bold), description (if it exists), created date (formatted as a local date string)
- Show a status button that displays the current status label and cycles to the next status when clicked: Todo → In Progress → Done → Todo
- Show a delete button that calls the delete API and then calls `onDelete`
- Give each status a different background colour (your choice — just make them visually distinct)

**Concept:**
The status button clicking pattern: you need a mapping of current status → next status. When clicked, call the API, then call the `onStatusChange` callback so the parent can update its state.

Using callbacks to notify the parent (rather than managing the whole list in this component) keeps this component "dumb" — it receives data and fires events, but doesn't own state.

**Expected Result:**
- Each task shows as a coloured card
- Clicking the status button changes the colour and label immediately
- Clicking delete removes the card from view
- Both changes persist — if you refresh the page, the status/deletion is still reflected (because it was saved to the DB)

---

## Lab 16 — Build App.tsx

**What to do:**
Replace the default `App.tsx` content.

The App component should:
- Have state for: `tasks` (Task array), `loading` (boolean, starts true), `error` (string)
- On mount (using `useEffect` with empty dependency array): call `fetchTasks()`, set the tasks state on success, set error on failure, set loading to false either way
- Render: a heading, a horizontal rule, the `AddTaskForm` component, a task count heading, a loading message (if loading), an error message (if error), a "no tasks" message (if not loading and empty), all TaskCard components (one per task)
- Handle three callbacks:
  - When a task is added: add it to the top of the tasks list
  - When a status changes: update that specific task in the list without refetching everything
  - When a task is deleted: remove it from the list

**Concept:**
`useEffect` with `[]` = run once when the component mounts. This is where you load initial data.

Updating state without refetching: use `.map()` to create a new array where only the changed item is different. Use `.filter()` to create a new array without the deleted item. This is called "optimistic UI update" — you trust that the API call succeeded and update the UI immediately.

**Expected Result:**
- Page loads and shows "Loading..." briefly, then shows task list (or "No tasks yet" if empty)
- AddTaskForm at the top — adding a task appends it to the list without page refresh
- Status button on each card works and persists
- Delete button works and the card disappears
- Refreshing the page shows the same data (it's in SQLite)

---

## Lab 17 — Frontend Checkpoint

Full end-to-end test with both servers running:

1. Add task: "Prepare for interview"
2. Add task: "Build Task Tracker"
3. Add task: "Deploy to Azure"
4. Change "Prepare for interview" to In Progress
5. Change "Build Task Tracker" to Done
6. Delete "Deploy to Azure"
7. **Refresh the page** — verify the data survived the refresh (statuses intact, deleted task gone)
8. Open Network tab (F12) — verify each button click makes an API call and gets a 200/201/204 back

✅ All 8 steps work = **Phase 2 complete**

---

# PHASE 3 — Azure Infrastructure as Code (Bicep)

---

## Lab 18 — Create Azure Account and Login

**What to do:**
1. Go to `portal.azure.com` → Start Free → create account (Microsoft account + credit card for verification, no charges on free tier)
2. Install Azure CLI: `https://learn.microsoft.com/en-us/cli/azure/install-azure-cli`
3. Run `az login` in your terminal — it opens a browser for authentication
4. Run `az account show` to confirm you're logged in

**Expected Result:**
- `az account show` prints your subscription details (name, ID, state: "Enabled")
- No authentication errors

---

## Lab 19 — Write the Bicep IaC File

**What to do:**
Create a folder `infra/` in the `task-tracker/` root. Create `infra/main.bicep`.

Write a Bicep file that defines three resources:

1. **App Service Plan** — the server that will host your .NET API
   - Use SKU name `F1`, tier `Free`
   - Name it something that includes `appName` and `environment` variables

2. **App Service (Web App)** — the actual .NET API app
   - Link it to the App Service Plan using the plan's ID
   - Set .NET framework version to `v8.0`
   - Set an app setting: `ASPNETCORE_ENVIRONMENT` = `Production`

3. **Static Web App** — hosts the React frontend
   - Use the Free SKU
   - Region must be `eastus2` (Static Web Apps have limited region availability)

Also define parameters at the top: `location` (default: the resource group's location), `appName` (default: `task-tracker`), `environment` (default: `prod`).

Add two outputs: `apiUrl` (the App Service's default hostname as an HTTPS URL) and `staticWebAppName` (the Static Web App resource name).

**Concept:**
Bicep is Azure's IaC language. Each `resource` block declares what you want Azure to create. Parameters make the template reusable — you can deploy to `dev`, `staging`, and `prod` by changing one parameter.

The outputs are important — they give you values you need for the CI/CD pipelines (your app's URL, the Static Web App name for deployments).

**Expected Result:**
Run: `az bicep build --file infra/main.bicep`
- No errors
- This validates your Bicep syntax

---

## Lab 20 — Deploy the Infrastructure

**What to do:**
Run two Azure CLI commands:
1. Create a **resource group** called `task-tracker-rg` in the `eastus` region — a resource group is a container that holds all your project's Azure resources
2. Deploy your Bicep file to that resource group

**Expected Result:**
- Both commands run without errors
- Go to `portal.azure.com` → Resource Groups → `task-tracker-rg`
- You should see 3 resources: App Service Plan, App Service, Static Web App
- Clicking the App Service shows a URL like `task-tracker-api-prod.azurewebsites.net`

---

# PHASE 4 — CI/CD with GitHub Actions

---

## Lab 21 — Push Project to GitHub

**What to do:**
1. Create a `.gitignore` file in the `task-tracker/` root that ignores: `node_modules/`, `dist/`, `*.db`, `publish/`, `.env`, `bin/`, `obj/`
2. Initialize a git repo, add all files, commit
3. Create a new public repository on GitHub called `task-tracker`
4. Push your code

**Expected Result:**
- Your code is visible on GitHub
- The `tasks.db` file is NOT in the repository (it's in `.gitignore`)

---

## Lab 22 — Get Azure Credentials for GitHub

**What to do:**
You need two secrets to allow GitHub Actions to deploy to Azure.

**Secret 1 — Backend (Publish Profile):**
Run an Azure CLI command to download the publish profile for your App Service (look up: `az webapp deployment list-publishing-profiles`). This outputs XML — copy all of it.

**Secret 2 — Frontend (Static Web App Token):**
Run an Azure CLI command to get the API token for your Static Web App (look up: `az staticwebapp secrets list`). Copy the token value.

Add both to GitHub:
- Go to your repo → Settings → Secrets and variables → Actions → New repository secret
- Secret 1 name: `AZURE_WEBAPP_PUBLISH_PROFILE`
- Secret 2 name: `AZURE_STATIC_WEB_APPS_API_TOKEN`

**Expected Result:**
- Two secrets appear in your GitHub repo's Secrets list
- Neither secret value is visible after saving (GitHub hides them)

---

## Lab 23 — Write the Backend CI/CD Pipeline

**What to do:**
Create `.github/workflows/backend.yml`.

Write a GitHub Actions workflow that:
- Triggers on push to `main` branch, but only when files in the `backend/` folder change
- Runs on `ubuntu-latest`
- Has one job with these steps in order:
  1. Check out the code
  2. Set up .NET 8
  3. Restore NuGet packages
  4. Build in Release configuration
  5. Publish (output to a `./publish` folder)
  6. Deploy to Azure App Service using the `azure/webapps-deploy` action with your publish profile secret

**Concept:**
The `paths` filter means the pipeline only runs when backend code changes — frontend changes won't trigger an unnecessary backend deploy. Each step in a job runs sequentially. The `secrets` context (`${{ secrets.YOUR_SECRET }}`) injects the GitHub secret securely without exposing it in logs.

**Expected Result:**
Push a small change to any file in `backend/` — go to GitHub → Actions tab — watch the pipeline run. It should show all steps green ✅ within 2-3 minutes.

Test: Visit `https://task-tracker-api-prod.azurewebsites.net/api/tasks` in your browser — returns `[]` (the live API is running on Azure)

---

## Lab 24 — Write the Frontend CI/CD Pipeline

**What to do:**
Create `.github/workflows/frontend.yml`.

Write a GitHub Actions workflow that:
- Triggers on push to `main`, only when files in `frontend/` change
- Runs on `ubuntu-latest`
- Has one job with these steps:
  1. Check out the code
  2. Set up Node.js version 20
  3. Install dependencies with `npm ci` (cleaner than `npm install` for CI)
  4. Build the React app — inject `VITE_API_URL` as an environment variable pointing to your live Azure API URL
  5. Deploy using the `Azure/static-web-apps-deploy` action with your static web app token, setting `app_location` to `./frontend` and `output_location` to `dist`

**Concept:**
`npm ci` is like `npm install` but uses the `package-lock.json` exactly — no version drift between your machine and the CI server.

`VITE_API_URL` is injected as an env variable during build — Vite replaces `import.meta.env.VITE_API_URL` in your code with the actual value at build time. This is how you point the production frontend at the production API URL without hardcoding it.

**Expected Result:**
Push a small change to any file in `frontend/` — watch the pipeline run green ✅.

Go to your Azure portal → Static Web App → get the URL — your React app is live and talking to your live .NET API.

Full end-to-end test on the live URL: add a task, change its status, delete it — all persisted.

---

## Lab 25 — Final Checkpoint

You're done when you can say yes to all of these:

- [ ] `GET https://your-api.azurewebsites.net/api/tasks` returns a JSON array in the browser
- [ ] Your React app URL (Azure Static Web App) loads and shows tasks
- [ ] Adding a task on the live site persists after page refresh
- [ ] Pushing code to GitHub triggers the correct pipeline automatically
- [ ] GitHub Actions shows green ticks for both pipelines
- [ ] Your Azure Portal shows 3 resources in `task-tracker-rg`
- [ ] Your Bicep file is committed to the repo (infrastructure as code = it's version controlled)

✅ All boxes checked = project complete. Screenshot everything.

---

## What to Say in the Interview

> "I built a full-stack Task Tracker and deployed it end-to-end. The backend is a .NET 8 Minimal API with EF Core and SQLite, the frontend is React with Vite and TypeScript. I provisioned the Azure infrastructure — App Service and Static Web App — using Bicep so the infrastructure is version-controlled and reproducible. Deployments happen automatically via GitHub Actions on every push to main, with separate pipelines for frontend and backend triggered only by relevant file changes. The live app is at [your URL]."
