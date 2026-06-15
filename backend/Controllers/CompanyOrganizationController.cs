using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

namespace InternshipManagement.API.Controllers;

/// <summary>Şirket portalı: kendi şirket kaydı (logbook Word / liste bilgileri).</summary>
[ApiController]
[Route("api/company/organization")]
public class CompanyOrganizationController : ControllerBase
{
    private const string AuthCookieName = "internship_auth_user_id";
    private readonly AppDbContext _db;

    public CompanyOrganizationController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Şirket kullanıcısı için bağlı şirket kartını döndürür (staff salt okunur).</summary>
    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!CompanyPortalAccess.IsCompanyUser(user) || string.IsNullOrWhiteSpace(user.CompanyId))
            return Forbid();

        var company = await _db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == user.CompanyId, cancellationToken);
        if (company == null)
            return NotFound(new { message = "Company not found." });

        return Ok(ToResponse(company));
    }

    /// <summary>Ana şirket hesabı şirket kaydını günceller (onay/rating değişmez).</summary>
    [HttpPatch]
    public async Task<IActionResult> PatchMine(
        [FromBody] CompanyOrganizationPatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!CompanyPortalAccess.IsCompanyPrimary(user) || string.IsNullOrWhiteSpace(user.CompanyId))
            return Forbid();

        if (request.IsEmpty())
            return BadRequest(new { message = "At least one field must be provided." });

        var company = await _db.Companies
            .FirstOrDefaultAsync(c => c.Id == user.CompanyId, cancellationToken);
        if (company == null)
            return NotFound(new { message = "Company not found." });

        if (request.Name != null)
        {
            var trimmedName = request.Name.Trim();
            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { message = "Company name cannot be empty." });

            var nameTaken = await _db.Companies.AnyAsync(
                c => c.Id != company.Id &&
                     c.Name.ToLower() == trimmedName.ToLower(),
                cancellationToken);
            if (nameTaken)
                return BadRequest(new { message = "Another company already uses this name." });

            company.Name = trimmedName;
        }

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

        return Ok(ToResponse(company));
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
            return null;
        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    private static object ToResponse(Company company)
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
            averageRating = company.AverageRating,
            approved = company.Approved
        };
    }
}

public class CompanyOrganizationPatchRequest
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

    public bool IsEmpty() =>
        Name == null &&
        Sector == null &&
        Address == null &&
        Location == null &&
        FieldsOfWork == null &&
        Description == null &&
        Phone == null &&
        Fax == null &&
        ContactEmail == null &&
        Website == null &&
        !PositionsOffered.HasValue;
}
