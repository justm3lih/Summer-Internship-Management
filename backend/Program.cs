using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;

var builder = WebApplication.CreateBuilder(args);

// Veritabanı: appsettings'te UseInMemoryDatabase true ise bellek içi DB, değilse PostgreSQL kullan
var useInMemory = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");
if (useInMemory)
{
    // Geliştirme: Bellek içi veritabanı (PostgreSQL kurulumu gerekmez)
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("InternshipDb"));
}
else
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}

// CORS: Frontend (localhost:3000) bu API'ye istek atabilsin diye
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Controller'ları ve OpenAPI (Swagger) servisini ekle
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Uygulama başlarken veritabanını hazırla ve örnek kullanıcıları ekle (seed)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (useInMemory)
    {
        db.Database.EnsureCreated();  // Bellek DB için tabloları oluştur
    }
    else
    {
        try
        {
            db.Database.Migrate();  // PostgreSQL'de bekleyen migration'ları uygula
        }
        catch (Exception ex)
        {
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(ex, "PostgreSQL migration failed. Use UseInMemoryDatabase: true in appsettings.Development.json to continue.");
        }
    }
    SeedData.EnsureSeedUsersAsync(db).GetAwaiter().GetResult();  // Örnek 4 kullanıcı yoksa ekle
}

// Geliştirme ortamında OpenAPI dokümanı aç
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();   // CORS'u etkinleştir (frontend istekleri kabul edilsin)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthorization();
app.MapControllers();  // api/[controller] route'larını tanımla

app.Run();
