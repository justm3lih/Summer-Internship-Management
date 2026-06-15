using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Configuration;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/settings")]
    public class AppSettingsController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        // Varsayılan ayarlar + metadata (yeni alan eklemek için tek yer)
        private static readonly Dictionary<string, string> Defaults = new()
        {
            ["eligibility.requiredCourses"] = "5",
            ["eligibility.semesterStart"] = "5",
            ["eligibility.semesterEnd"] = "8",
            ["application.deadline"] = "",
            ["term.active"] = "Spring",
            ["term.year"] = DateTime.UtcNow.Year.ToString(),
            [StudentDepartmentOptions.Key] = StudentDepartmentOptions.DefaultJson,
        };

        public AppSettingsController(AppDbContext db, ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        // GET /api/settings - Tüm sistem ayarlarını getir
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var stored = await _db.AppSettings.AsNoTracking().ToListAsync(cancellationToken);
            var map = stored.ToDictionary(s => s.Key, s => s.Value ?? string.Empty);

            var merged = Defaults.ToDictionary(
                kvp => kvp.Key,
                kvp => map.TryGetValue(kvp.Key, out var value) ? value : kvp.Value);

            return Ok(merged);
        }

        // GET /api/settings/public - Giriş gerektirmeyen ayarları döner (ör. eligibility eşikleri)
        [HttpGet("public")]
        public async Task<IActionResult> GetPublic(CancellationToken cancellationToken = default)
        {
            var stored = await _db.AppSettings.AsNoTracking().ToListAsync(cancellationToken);
            var map = stored.ToDictionary(s => s.Key, s => s.Value ?? string.Empty);

            var exposed = new[]
            {
                "eligibility.requiredCourses",
                "eligibility.semesterStart",
                "eligibility.semesterEnd",
                "application.deadline",
                "term.active",
                "term.year",
                StudentDepartmentOptions.Key,
            };

            var result = exposed.ToDictionary(
                key => key,
                key => map.TryGetValue(key, out var value) ? value : (Defaults.TryGetValue(key, out var def) ? def : string.Empty));

            return Ok(result);
        }

        // PATCH /api/settings - Bir veya birden fazla ayarı güncelle (sadece admin)
        [HttpPatch]
        public async Task<IActionResult> UpdateSettings(
            [FromBody] Dictionary<string, string?> changes,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "admin")
                return Forbid();

            if (changes == null || changes.Count == 0)
                return BadRequest(new { message = "At least one setting is required." });

            foreach (var change in changes)
            {
                var key = change.Key?.Trim();
                if (string.IsNullOrEmpty(key)) continue;

                var existing = await _db.AppSettings.FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
                if (existing == null)
                {
                    _db.AppSettings.Add(new AppSetting
                    {
                        Key = key,
                        Value = change.Value,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    existing.Value = change.Value;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync(cancellationToken);

            var stored = await _db.AppSettings.AsNoTracking().ToListAsync(cancellationToken);
            var map = stored.ToDictionary(s => s.Key, s => s.Value ?? string.Empty);
            var merged = Defaults.ToDictionary(
                kvp => kvp.Key,
                kvp => map.TryGetValue(kvp.Key, out var value) ? value : kvp.Value);

            return Ok(merged);
        }

        public class UpdateStudentDepartmentsRequest
        {
            public List<string>? Departments { get; set; }
        }

        // PATCH /api/settings/student-departments — koordinatör (veya admin) üyelikte seçilebilir bölüm listesini günceller
        [HttpPatch("student-departments")]
        public async Task<IActionResult> UpdateStudentDepartments(
            [FromBody] UpdateStudentDepartmentsRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isAdmin = currentUser.Role == "admin";
            var isCoord = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken) &&
                Permissions.Has(currentUser, Permissions.CoordStudentsView);
            if (!isAdmin && !isCoord)
                return Forbid();

            if (request?.Departments == null || request.Departments.Count == 0)
                return BadRequest(new { message = "En az bir bölüm adı ekleyin." });

            var list = request.Departments
                .Select(d => d?.Trim() ?? "")
                .Where(s => s.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (list.Count == 0)
                return BadRequest(new { message = "En az bir bölüm adı ekleyin." });

            var json = JsonSerializer.Serialize(list);

            var existing = await _db.AppSettings.FirstOrDefaultAsync(
                s => s.Key == StudentDepartmentOptions.Key,
                cancellationToken);
            if (existing == null)
            {
                _db.AppSettings.Add(new AppSetting
                {
                    Key = StudentDepartmentOptions.Key,
                    Value = json,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.Value = json;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new { departments = list });
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }
    }
}
