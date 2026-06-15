using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;

namespace InternshipManagement.API.Controllers
{
    // Admin kullanıcı yönetim API'si (kullanıcı oluştur, yetki ata, pasifleştir)
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private static readonly HashSet<string> ReservedStaffRoleKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "student", "coordinator", "company", "admin"
        };

        private static readonly Regex StaffRoleKeyRegex = new("^[a-z][a-z0-9_]{1,62}$", RegexOptions.Compiled);

        private readonly AppDbContext _db;
        private readonly NotificationService _notificationService;

        public AdminController(AppDbContext db, NotificationService notificationService)
        {
            _db = db;
            _notificationService = notificationService;
        }

        // GET api/admin/users - Tüm kullanıcıları listele (admin)
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? role,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            var query = _db.Users.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(user => user.Role == role);

            var users = await query
                .OrderBy(user => user.Role)
                .ThenBy(user => user.Name)
                .ToListAsync(cancellationToken);

            return Ok(users.Select(ToUserResponse));
        }

        // GET api/admin/permissions - Rol bazlı izin kataloğu (UI için)
        [HttpGet("permissions")]
        public async Task<IActionResult> GetPermissionCatalog(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            return Ok(new
            {
                coordinator = Permissions.CoordinatorAll,
                company = Permissions.CompanyAll
            });
        }

        // GET api/admin/staff-roles — Özel personel rolleri (koordinatör portalı + coordinator izin kataloğu)
        [HttpGet("staff-roles")]
        public async Task<IActionResult> GetStaffRoleDefinitions(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            var rows = await _db.StaffRoleDefinitions.AsNoTracking()
                .OrderBy(r => r.Label)
                .ToListAsync(cancellationToken);

            return Ok(rows.Select(r => new { id = r.Id, key = r.Key, label = r.Label }));
        }

        // POST api/admin/staff-roles — Yeni rol tanımı
        [HttpPost("staff-roles")]
        public async Task<IActionResult> CreateStaffRoleDefinition(
            [FromBody] CreateStaffRoleDefinitionRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Key) || string.IsNullOrWhiteSpace(request.Label))
                return BadRequest(new { message = "Key and label are required." });

            var key = request.Key.Trim().ToLowerInvariant();
            if (!StaffRoleKeyRegex.IsMatch(key))
                return BadRequest(new
                {
                    message = "Key must start with a letter and contain only lowercase letters, digits and underscores (2–63 chars)."
                });

            if (ReservedStaffRoleKeys.Contains(key))
                return BadRequest(new { message = "This key is reserved for a built-in role." });

            if (await _db.StaffRoleDefinitions.AnyAsync(r => r.Key == key, cancellationToken))
                return BadRequest(new { message = "A role with this key already exists." });

            var entity = new StaffRoleDefinition
            {
                Key = key,
                Label = request.Label.Trim()
            };
            _db.StaffRoleDefinitions.Add(entity);
            await _db.SaveChangesAsync(cancellationToken);

            return StatusCode(201, new { id = entity.Id, key = entity.Key, label = entity.Label });
        }

        // DELETE api/admin/staff-roles/{id}
        [HttpDelete("staff-roles/{id}")]
        public async Task<IActionResult> DeleteStaffRoleDefinition(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            var entity = await _db.StaffRoleDefinitions.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
            if (entity == null)
                return NotFound(new { message = "Role definition not found." });

            var inUse = await _db.Users.AnyAsync(u => u.Role == entity.Key, cancellationToken);
            if (inUse)
                return BadRequest(new { message = "Cannot delete: users still have this role." });

            _db.StaffRoleDefinitions.Remove(entity);
            await _db.SaveChangesAsync(cancellationToken);

            return NoContent();
        }

        // POST api/admin/users - Yeni kullanıcı oluştur
        [HttpPost("users")]
        public async Task<IActionResult> CreateUser(
            [FromBody] CreateUserRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Password) ||
                string.IsNullOrWhiteSpace(request.Role))
                return BadRequest(new { message = "Email, name, password and role are required." });

            if (request.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters." });

            var roleNormalized = request.Role.Trim();
            if (!await IsAssignableAdminCreatedRoleAsync(roleNormalized, cancellationToken))
                return BadRequest(new
                {
                    message = "Role must be coordinator, company, admin, or a custom staff role defined under Staff roles."
                });

            if (await _db.Users.AnyAsync(user => user.Email == request.Email, cancellationToken))
                return BadRequest(new { message = "This email is already registered." });

            string? companyId = null;
            if (roleNormalized == "company")
            {
                if (string.IsNullOrWhiteSpace(request.CompanyId))
                    return BadRequest(new { message = "Company is required for a company user." });

                var companyExists = await _db.Companies.AnyAsync(c => c.Id == request.CompanyId, cancellationToken);
                if (!companyExists)
                    return BadRequest(new { message = "Selected company does not exist." });

                var alreadyLinked = await _db.Users.AnyAsync(
                    u => u.Role == "company" &&
                         u.CompanyId == request.CompanyId &&
                         (u.CompanyMembershipTier == null ||
                          u.CompanyMembershipTier == CompanyPortalAccess.TierPrimary),
                    cancellationToken);
                if (alreadyLinked)
                    return BadRequest(new { message = "This company already has a linked user." });

                companyId = request.CompanyId;
            }

            var permissions = await SanitizePermissionsAsync(roleNormalized, request.Permissions, cancellationToken);

            var user = new User
            {
                Email = request.Email.Trim(),
                Name = request.Name.Trim(),
                Password = request.Password,
                Role = roleNormalized,
                CompanyId = companyId,
                CompanyMembershipTier = roleNormalized == "company" ? CompanyPortalAccess.TierPrimary : null,
                Permissions = permissions
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            await _notificationService.CreateNotificationAsync(
                user.Id,
                "Account Created",
                $"Your {user.Role} account has been created by an administrator.",
                "info",
                "user",
                user.Id,
                cancellationToken);

            return StatusCode(201, ToUserResponse(user));
        }

        // PATCH api/admin/users/{id} - Kullanıcı bilgisi/yetkileri güncelle
        [HttpPatch("users/{id}")]
        public async Task<IActionResult> UpdateUser(
            string id,
            [FromBody] UpdateUserRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (request.Email != null)
            {
                var normalized = request.Email.Trim();
                var emailTaken = await _db.Users.AnyAsync(
                    u => u.Email == normalized && u.Id != id,
                    cancellationToken);
                if (emailTaken)
                    return BadRequest(new { message = "This email is already used by another account." });
                user.Email = normalized;
            }

            if (request.Name != null)
                user.Name = request.Name.Trim();

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                if (request.Password.Length < 6)
                    return BadRequest(new { message = "Password must be at least 6 characters." });
                user.Password = request.Password;
            }

            var permissionsChanged = false;
            if (request.Permissions != null)
            {
                var sanitized = await SanitizePermissionsAsync(user.Role, request.Permissions, cancellationToken);
                var existing = user.Permissions ?? System.Array.Empty<string>();
                if (!existing.OrderBy(p => p).SequenceEqual(sanitized.OrderBy(p => p)))
                {
                    user.Permissions = sanitized;
                    permissionsChanged = true;
                }
            }

            await _db.SaveChangesAsync(cancellationToken);

            if (permissionsChanged)
            {
                await _notificationService.CreateNotificationAsync(
                    user.Id,
                    "Permissions Updated",
                    "Your permissions have been updated by an administrator. Please refresh to see the changes.",
                    "info",
                    "user",
                    user.Id,
                    cancellationToken);
            }

            return Ok(ToUserResponse(user));
        }

        // DELETE api/admin/users/{id} - Kullanıcı sil
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });
            if (currentUser.Role != "admin")
                return Forbid();

            if (currentUser.Id == id)
                return BadRequest(new { message = "You cannot delete your own account." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound(new { message = "User not found." });

            _db.Users.Remove(user);
            await _db.SaveChangesAsync(cancellationToken);

            return NoContent();
        }

        private async Task<bool> IsAssignableAdminCreatedRoleAsync(string role, CancellationToken cancellationToken)
        {
            if (role == "coordinator" || role == "company" || role == "admin" || role == "advisor")
                return true;
            if (role == "student" || string.IsNullOrWhiteSpace(role))
                return false;
            return await _db.StaffRoleDefinitions.AsNoTracking()
                .AnyAsync(r => r.Key == role, cancellationToken);
        }

        private async Task<string[]> SanitizePermissionsAsync(
            string role,
            string[]? requested,
            CancellationToken cancellationToken)
        {
            if (role == "admin")
                return System.Array.Empty<string>();

            var allowed = await RolePermissionCatalog.GetAllowedPermissionKeysAsync(role, _db, cancellationToken);
            if (requested == null || requested.Length == 0)
            {
                // Admin UI often submits an empty list for new company users; portal accounts need a working default.
                if (role == "company")
                    return Permissions.CompanyAll.ToArray();
                return System.Array.Empty<string>();
            }

            return requested.Where(permission => allowed.Contains(permission)).Distinct().ToArray();
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
        }

        private static object ToUserResponse(User user)
        {
            return new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                companyId = user.CompanyId,
                companyMembershipTier = user.CompanyMembershipTier,
                managedByCompanyUserId = user.ManagedByCompanyUserId,
                permissions = user.Permissions ?? System.Array.Empty<string>()
            };
        }
    }

    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "coordinator" | "company" | "admin"
        public string? CompanyId { get; set; }
        public string[]? Permissions { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Email { get; set; }
        public string? Name { get; set; }
        public string? Password { get; set; }
        public string[]? Permissions { get; set; }
    }

    public class CreateStaffRoleDefinitionRequest
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
    }
}
