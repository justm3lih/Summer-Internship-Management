using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

namespace InternshipManagement.API.Controllers;

/// <summary>Ana şirket hesabının alt kullanıcı (staff) oluşturma ve listeleme API'si.</summary>
[ApiController]
[Route("api/company/staff")]
public class CompanyStaffController : ControllerBase
{
    private const string AuthCookieName = "internship_auth_user_id";
    private readonly AppDbContext _db;

    public CompanyStaffController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Ana hesaba bağlı şirket içi kullanıcıları listeler (yalnızca primary).</summary>
    [HttpGet]
    public async Task<IActionResult> ListStaff(CancellationToken cancellationToken = default)
    {
        var current = await GetCurrentUserAsync(cancellationToken);
        if (current == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!CompanyPortalAccess.IsCompanyPrimary(current))
            return Forbid();

        var staff = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "company" &&
                        u.CompanyId == current.CompanyId &&
                        u.CompanyMembershipTier == CompanyPortalAccess.TierStaff &&
                        u.ManagedByCompanyUserId == current.Id)
            .OrderBy(u => u.Name)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Name,
                permissions = u.Permissions ?? System.Array.Empty<string>()
            })
            .ToListAsync(cancellationToken);

        return Ok(staff);
    }

    /// <summary>Yeni şirket içi kullanıcı oluşturur (yalnızca primary).</summary>
    [HttpPost]
    public async Task<IActionResult> CreateStaff(
        [FromBody] CreateCompanyStaffRequest request,
        CancellationToken cancellationToken = default)
    {
        var current = await GetCurrentUserAsync(cancellationToken);
        if (current == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!CompanyPortalAccess.IsCompanyPrimary(current))
            return Forbid();

        if (string.IsNullOrWhiteSpace(current.CompanyId))
            return BadRequest(new { message = "Company profile could not be matched." });

        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email, name and password are required." });

        if (request.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        var email = request.Email.Trim();
        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
            return BadRequest(new { message = "This email is already registered." });

        string[] permissions = Permissions.CompanyAll;
        if (request.Permissions != null && request.Permissions.Length > 0)
        {
            var filtered = request.Permissions
                .Where(p => Permissions.CompanyAll.Contains(p))
                .Distinct()
                .ToArray();
            if (filtered.Length > 0)
                permissions = filtered;
        }

        var user = new User
        {
            Email = email,
            Name = request.Name.Trim(),
            Password = request.Password,
            Role = "company",
            CompanyId = current.CompanyId,
            CompanyMembershipTier = CompanyPortalAccess.TierStaff,
            ManagedByCompanyUserId = current.Id,
            Permissions = permissions
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return StatusCode(201, new
        {
            user.Id,
            user.Email,
            user.Name,
            permissions = user.Permissions ?? System.Array.Empty<string>()
        });
    }

    /// <summary>Alt kullanıcıyı siler (yalnızca oluşturan primary).</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteStaff(string id, CancellationToken cancellationToken = default)
    {
        var current = await GetCurrentUserAsync(cancellationToken);
        if (current == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!CompanyPortalAccess.IsCompanyPrimary(current))
            return Forbid();

        var staff = await _db.Users.FirstOrDefaultAsync(
            u => u.Id == id &&
                 u.Role == "company" &&
                 u.CompanyId == current.CompanyId &&
                 u.CompanyMembershipTier == CompanyPortalAccess.TierStaff &&
                 u.ManagedByCompanyUserId == current.Id,
            cancellationToken);

        if (staff == null)
            return NotFound(new { message = "Staff user not found." });

        await _db.Applications
            .Where(a => a.CompanySupervisorUserId == id)
            .ExecuteUpdateAsync(
                s => s.SetProperty(a => a.CompanySupervisorUserId, (string?)null),
                cancellationToken);

        _db.Users.Remove(staff);
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
            return null;
        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }
}

public class CreateCompanyStaffRequest
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    /// <summary>Boş veya null ise tüm şirket yetkileri atanır.</summary>
    public string[]? Permissions { get; set; }
}
