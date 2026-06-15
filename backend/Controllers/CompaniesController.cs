using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;
using System.Text.Json;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompaniesController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly NotificationService _notificationService;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public CompaniesController(
            AppDbContext db,
            NotificationService notificationService,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _notificationService = notificationService;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        // GET /api/companies - Öğrenci ekranları için onaylı şirketleri döndür
        [HttpGet]
        public async Task<IActionResult> GetApprovedCompanies(CancellationToken cancellationToken = default)
        {
            var activeStatuses = new[] { "approved", "ongoing", "completed" };
            var companies = await _db.Companies
                .AsNoTracking()
                .Where(c => c.Approved)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    Company = c,
                    OccupiedPositions = _db.Applications.Count(a => a.CompanyId == c.Id && activeStatuses.Contains(a.Status))
                })
                .ToListAsync(cancellationToken);

            return Ok(companies.Select(x => ToCompanyResponse(x.Company, false, x.OccupiedPositions)));
        }

        // GET /api/companies/coordinator - Coordinator için tüm şirketleri (onaylı + bekleyen) döndür
        [HttpGet("coordinator")]
        public async Task<IActionResult> GetAllForCoordinator(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isCoordPortal = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);
            if (!isCoordPortal && currentUser.Role != "admin")
                return Forbid();

            if (isCoordPortal &&
                !Permissions.Has(currentUser, Permissions.CoordCompaniesView))
                return Forbid();

            var activeStatuses = new[] { "approved", "ongoing", "completed" };
            var companies = await _db.Companies
                .AsNoTracking()
                .OrderBy(c => c.Approved)
                .ThenBy(c => c.Name)
                .Select(c => new
                {
                    Company = c,
                    OccupiedPositions = _db.Applications.Count(a => a.CompanyId == c.Id && activeStatuses.Contains(a.Status))
                })
                .ToListAsync(cancellationToken);

            var companyIds = companies.Select(x => x.Company.Id).ToList();
            var companyIdsWithPortal = await _db.Users.AsNoTracking()
                .Where(u => u.Role == "company" && u.CompanyId != null && companyIds.Contains(u.CompanyId!))
                .Select(u => u.CompanyId!)
                .Distinct()
                .ToListAsync(cancellationToken);
            var withPortal = companyIdsWithPortal.ToHashSet();

            return Ok(companies.Select(x => ToCompanyResponse(x.Company, withPortal.Contains(x.Company.Id), x.OccupiedPositions)));
        }

        // ... (other methods) ...

        private static object ToCompanyResponse(Company company, bool hasPortalUser = false, int occupiedPositions = 0)
        {
            return new
            {
                id = company.Id,
                name = company.Name,
                sector = company.Sector,
                address = company.Address,
                location = company.Location,
                fieldsOfWork = company.FieldsOfWork,
                description = company.Description,
                phone = company.Phone,
                fax = company.Fax,
                contactEmail = company.ContactEmail,
                website = company.Website,
                positionsOffered = company.PositionsOffered,
                remainingPositions = Math.Max(0, company.PositionsOffered - occupiedPositions),
                averageRating = company.AverageRating,
                approved = company.Approved,
                hasPortalUser
            };
        }

        // POST /api/companies - Yeni şirket ekle
        [HttpPost]
        public async Task<IActionResult> CreateCompany(
            [FromBody] CompanyUpsertRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isCoordPortal = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);
            if (!isCoordPortal && currentUser.Role != "admin")
                return Forbid();

            if (isCoordPortal &&
                !Permissions.Has(currentUser, Permissions.CoordCompaniesAdd))
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Company name is required." });

            var nameTaken = await _db.Companies.AnyAsync(
                c => c.Name.ToLower() == request.Name.Trim().ToLower(),
                cancellationToken);

            if (nameTaken)
                return BadRequest(new { message = "A company with this name already exists." });

            var company = new Company
            {
                Name = request.Name.Trim(),
                Sector = (request.Sector ?? string.Empty).Trim(),
                Address = (request.Address ?? string.Empty).Trim(),
                Location = (request.Location ?? string.Empty).Trim(),
                FieldsOfWork = (request.FieldsOfWork ?? string.Empty).Trim(),
                Description = (request.Description ?? string.Empty).Trim(),
                Phone = (request.Phone ?? string.Empty).Trim(),
                Fax = (request.Fax ?? string.Empty).Trim(),
                ContactEmail = (request.ContactEmail ?? string.Empty).Trim(),
                Website = (request.Website ?? string.Empty).Trim(),
                PositionsOffered = Math.Max(0, request.PositionsOffered ?? 0),
                Approved = request.Approved ?? false
            };

            _db.Companies.Add(company);
            await _db.SaveChangesAsync(cancellationToken);

            return StatusCode(201, ToCompanyResponse(company, false));
        }

        // POST /api/companies/{companyId}/portal-user — Koordinatör/admin, şirket için portal girişi oluşturur
        [HttpPost("{companyId}/portal-user")]
        public async Task<IActionResult> CreateCompanyPortalUser(
            string companyId,
            [FromBody] CreateCompanyPortalUserRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isCoordPortal = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);
            if (!isCoordPortal && currentUser.Role != "admin")
                return Forbid();

            if (currentUser.Role != "admin" && isCoordPortal)
            {
                var can =
                    Permissions.Has(currentUser, Permissions.CoordCompaniesAdd) ||
                    Permissions.Has(currentUser, Permissions.CoordCompaniesEdit);
                if (!can)
                    return Forbid();
            }

            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email, display name, and password are required." });

            if (request.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters." });

            var company = await _db.Companies.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == companyId, cancellationToken);
            if (company == null)
                return NotFound(new { message = "Company not found." });

            var hasPrimaryPortalUser = await _db.Users.AnyAsync(
                u => u.Role == "company" &&
                     u.CompanyId == companyId &&
                     (u.CompanyMembershipTier == null ||
                      u.CompanyMembershipTier == CompanyPortalAccess.TierPrimary),
                cancellationToken);
            if (hasPrimaryPortalUser)
                return BadRequest(new { message = "This company already has a primary portal user." });

            var email = request.Email.Trim();
            if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
                return BadRequest(new { message = "This email is already registered." });

            var user = new User
            {
                Email = email,
                Name = request.Name.Trim(),
                Password = request.Password,
                Role = "company",
                CompanyId = companyId,
                CompanyMembershipTier = CompanyPortalAccess.TierPrimary,
                Permissions = Permissions.CompanyAll
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            await _notificationService.CreateNotificationAsync(
                user.Id,
                "Company portal ready",
                $"Your company account for {company.Name} is ready. Sign in with your email and the password your coordinator set.",
                "info",
                "user",
                user.Id,
                cancellationToken);

            return StatusCode(201, new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                companyId = user.CompanyId
            });
        }

        // PATCH /api/companies/{id} - Şirket bilgisini güncelle
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateCompany(
            string id,
            [FromBody] CompanyUpsertRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isCoordPortal = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);
            if (!isCoordPortal && currentUser.Role != "admin")
                return Forbid();

            if (isCoordPortal &&
                !Permissions.Has(currentUser, Permissions.CoordCompaniesEdit))
                return Forbid();

            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (company == null)
                return NotFound(new { message = "Company not found." });

            if (request.Name != null) company.Name = request.Name.Trim();
            if (request.Sector != null) company.Sector = request.Sector.Trim();
            if (request.Address != null) company.Address = request.Address.Trim();
            if (request.Location != null) company.Location = request.Location.Trim();
            if (request.FieldsOfWork != null) company.FieldsOfWork = request.FieldsOfWork.Trim();
            if (request.Description != null) company.Description = request.Description.Trim();
            if (request.Phone != null) company.Phone = request.Phone.Trim();
            if (request.Fax != null) company.Fax = request.Fax.Trim();
            if (request.ContactEmail != null) company.ContactEmail = request.ContactEmail.Trim();
            if (request.Website != null) company.Website = request.Website.Trim();
            if (request.PositionsOffered.HasValue)
                company.PositionsOffered = Math.Max(0, request.PositionsOffered.Value);

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ToCompanyResponse(company, false));
        }

        // PATCH /api/companies/{id}/approval - Şirketi onayla / onayı kaldır
        [HttpPatch("{id}/approval")]
        public async Task<IActionResult> SetApproval(
            string id,
            [FromBody] CompanyApprovalRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isCoordPortal = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);
            if (!isCoordPortal && currentUser.Role != "admin")
                return Forbid();

            if (isCoordPortal &&
                !Permissions.Has(currentUser, Permissions.CoordCompaniesApprove))
                return Forbid();

            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (company == null)
                return NotFound(new { message = "Company not found." });

            var wasApproved = company.Approved;
            company.Approved = request.Approved;
            await _db.SaveChangesAsync(cancellationToken);

            // If company just got approved, check for any pending student-proposed applications
            if (request.Approved)
            {
                var linkedApps = await _db.Applications
                    .Where(a => a.CompanyId == id && a.Status == "pending")
                    .Include(a => a.Student)
                    .ToListAsync(cancellationToken);

                foreach (var app in linkedApps)
                {
                    // Attempt to parse supervisor info if this was an integrated "Propose and Apply" flow
                    if (!string.IsNullOrWhiteSpace(app.AcceptanceLetterPortalJson))
                    {
                        try
                        {
                            using var doc = JsonDocument.Parse(app.AcceptanceLetterPortalJson);
                            var root = doc.RootElement;
                            if (root.TryGetProperty("supervisorEmail", out var emailProp) && 
                                root.TryGetProperty("supervisorName", out var nameProp))
                            {
                                var supervisorEmail = emailProp.GetString()?.Trim();
                                var supervisorName = nameProp.GetString()?.Trim();

                                if (!string.IsNullOrWhiteSpace(supervisorEmail) && !string.IsNullOrWhiteSpace(supervisorName))
                                {
                                    // 1. Ensure user exists for supervisor
                                    var supervisorUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == supervisorEmail, cancellationToken);
                                    if (supervisorUser == null)
                                    {
                                        supervisorUser = new User
                                        {
                                            Email = supervisorEmail,
                                            Name = supervisorName,
                                            Password = Guid.NewGuid().ToString("N").Substring(0, 8), // Random temp password
                                            Role = "company",
                                            CompanyId = id,
                                            Permissions = Permissions.CompanyAll
                                        };
                                        _db.Users.Add(supervisorUser);
                                        await _db.SaveChangesAsync(cancellationToken);

                                        await _notificationService.CreateNotificationAsync(
                                            supervisorUser.Id,
                                            "Supervisor account created",
                                            $"You have been assigned as a supervisor for {app.Student?.Name ?? "a student"} at {company.Name}. Log in to review their daily logs.",
                                            "info",
                                            "application",
                                            app.Id,
                                            cancellationToken);
                                    }

                                    // 2. Link supervisor to application and auto-approve
                                    app.CompanySupervisorUserId = supervisorUser.Id;
                                    app.Status = "approved"; // Or "ongoing" if today >= start date, but approved is safer
                                    app.AcceptanceLetterVerifiedAt = DateTime.UtcNow;
                                    
                                    await _notificationService.CreateNotificationAsync(
                                        app.StudentId,
                                        "Company and Application Approved",
                                        $"The coordinator approved {company.Name} and your application. Your supervisor is set as {supervisorName}. You can now start your logbook.",
                                        "success",
                                        "application",
                                        app.Id,
                                        cancellationToken);
                                }
                            }
                        }
                        catch (JsonException) { /* Skip if invalid JSON */ }
                    }
                }
                await _db.SaveChangesAsync(cancellationToken);
            }

            if (wasApproved != company.Approved)
            {
                var companyUsers = await _db.Users
                    .Where(u => u.Role == "company" && u.CompanyId == company.Id)
                    .ToListAsync(cancellationToken);

                foreach (var cu in companyUsers)
                {
                    await _notificationService.CreateNotificationAsync(
                        cu.Id,
                        company.Approved ? "Your Company Was Approved" : "Company Approval Revoked",
                        company.Approved
                            ? "Your company is now visible to students for internship applications."
                            : "Your company is no longer visible to students. Please contact the coordinator.",
                        company.Approved ? "success" : "warning",
                        "company",
                        company.Id,
                        cancellationToken);
                }
            }

            return Ok(ToCompanyResponse(company, false));
        }

        // DELETE /api/companies/{id} - Şirketi sil (başvurusu olmayanlar için)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCompany(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var isCoordPortal = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);
            if (!isCoordPortal && currentUser.Role != "admin")
                return Forbid();

            if (isCoordPortal &&
                !Permissions.Has(currentUser, Permissions.CoordCompaniesEdit))
                return Forbid();

            var company = await _db.Companies
                .Include(c => c.Applications)
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

            if (company == null)
                return NotFound(new { message = "Company not found." });

            if (company.Applications != null && company.Applications.Count > 0)
                return BadRequest(new { message = "Cannot delete a company that already has applications." });

            _db.Companies.Remove(company);
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

    public class CreateCompanyPortalUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class CompanyUpsertRequest
    {
        public string? Name { get; set; }
        public string? Sector { get; set; }
        public string? Address { get; set; }
        public string? Location { get; set; }
        public string? FieldsOfWork { get; set; }
        public string? Description { get; set; }
        public string? Phone { get; set; }
        public string? Fax { get; set; }
        public string? ContactEmail { get; set; }
        public string? Website { get; set; }
        public int? PositionsOffered { get; set; }
        public bool? Approved { get; set; }
    }

    public class CompanyApprovalRequest
    {
        public bool Approved { get; set; }
    }
}
