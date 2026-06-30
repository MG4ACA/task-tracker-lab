
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=tasks.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowFrontend");
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/", () => "Hello World!");

// get all tasks
app.MapGet("/api/tasks", async(AppDbContext db) =>
{
    var tasks = await db.Tasks.OrderByDescending(t => t.CreatedAt).ToListAsync();
    return Results.Ok(tasks);
});

// get single task 
app.MapGet("/api/tasks/{id}", async(AppDbContext db, int id) =>{
  var task = await db.Tasks.FindAsync(id);
  if(task == null)
    return Results.NotFound();
  
  return Results.Ok(task);
});

//create single task
app.MapPost("/api/tasks", async( CreateTaskRequest request, AppDbContext db)=>{
  if(string.IsNullOrWhiteSpace(request.Title))
    return Results.BadRequest("Title is required");

  var task = new TaskItem{
    Title = request.Title.Trim(),
    Description = request.Description?.Trim() ?? string.Empty,
    Status = TaskStatus.Todo,
    CreatedAt = DateTime.UtcNow
  
  };

  db.Tasks.Add(task);
  await db.SaveChangesAsync();
  return Results.Created($"/api/tasks/{task.Id}", task);

});

// update task status
app.MapPatch("/api/tasks/{id}/status", async( int id, UpdateStatusRequest request, AppDbContext db) => {
  var task = await db.Tasks.FindAsync(id);
  if (task == null)
    return Results.NotFound();

  task.Status = request.Status;
  await db.SaveChangesAsync();
  return Results.Ok(task);
});

// delete task
app.MapDelete("/api/tasks/{id}", async(AppDbContext db, int id) => {
  var task = await db.Tasks.FindAsync(id);
  if (task == null)
    return Results.NotFound();

  db.Tasks.Remove(task);
  await db.SaveChangesAsync();
  return Results.NoContent();
});

app.Run();

public record CreateTaskRequest(string Title, string? Description);
public record UpdateStatusRequest(TaskStatus Status);
