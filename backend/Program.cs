using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Services.Notifications;

var builder = WebApplication.CreateBuilder(args);

// API anahtarları gibi gizli değerler için yerel (gitignored) config dosyası
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

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
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<InternshipManagement.API.Services.ICoordinatorPortalRoleService,
    InternshipManagement.API.Services.CoordinatorPortalRoleService>();
builder.Services.AddSingleton<InternshipManagement.API.Services.PdfImportService>();
builder.Services.AddHttpClient<InternshipManagement.API.Services.Ai.GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

// Uygulama başlarken veritabanını hazırla ve örnek kullanıcıları ekle (seed)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
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
            logger.LogWarning(ex, "PostgreSQL migration failed. Use UseInMemoryDatabase: true in appsettings.Development.json to continue.");
        }
    }

    var resetKeepingAdmins = builder.Configuration.GetValue<bool>("Seed:ResetKeepingAdminsOnStartup");
    if (resetKeepingAdmins)
    {
        SeedData.ClearOperationalDataKeepingAdminsAsync(db).GetAwaiter().GetResult();
        SeedData.EnsureSeedDefaultAdminIfMissingAsync(db).GetAwaiter().GetResult();
        logger.LogWarning(
            "Seed:ResetKeepingAdminsOnStartup was true: operational data cleared; only admin users remain. Set it back to false before the next restart.");
    }
    else
    {
        SeedData.EnsureSeedUsersAsync(db).GetAwaiter().GetResult(); // İlk kurulum / eksik demo verisi
    }

    // Eski veri: yerleşim iki taraftan onaylı ama AcceptanceLetterVerifiedAt boş → günlük kilitli kalıyordu.
    if (!useInMemory)
    {
        try
        {
            var now = DateTime.UtcNow;
            var n = db.Applications
                .Where(a =>
                    (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed") &&
                    a.CoordinatorPlacementApprovedAt != null &&
                    a.CompanyPlacementApprovedAt != null &&
                    a.AcceptanceLetterVerifiedAt == null)
                .ExecuteUpdate(setters => setters.SetProperty(a => a.AcceptanceLetterVerifiedAt, now));
            if (n > 0)
            {
                logger.LogInformation(
                    "Backfilled AcceptanceLetterVerifiedAt on {Count} application(s) with dual placement approval.",
                    n);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "AcceptanceLetterVerifiedAt backfill skipped.");
        }
    }
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
