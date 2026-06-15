using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Configuration;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;

namespace InternshipManagement.API.Controllers
{
    // Kullanıcı profil ve ayarlar API'si
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly NotificationService _notificationService;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public UsersController(
            AppDbContext db,
            NotificationService notificationService,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _notificationService = notificationService;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        // GET api/users/{id} - Kullanıcı id ile profil bilgisi getir (şifre hariç)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            // Kullanıcı kendi profilini, admin veya koordinatör portalı ise herkesin profilini görebilir
            if (currentUser.Id != id && currentUser.Role != "admin" &&
                !await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

            if (user == null)
                return NotFound();

            return Ok(BuildProfileResponse(user));
        }

        // PATCH api/users/{id} - Profil güncelle (ad, e-posta, öğrenci no, bölüm, dönem, fotoğraf)
        [HttpPatch("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateProfileRequest request, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound();

            // Başka kullanıcı: koordinatör yalnızca öğrenci bölümünü; admin tüm alanları
            if (currentUser.Id != id)
            {
                if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                {
                    if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
                        return Forbid();
                    if (user.Role != "student")
                        return Forbid();

                    var changed = false;

                    if (request.Department != null && !string.IsNullOrWhiteSpace(request.Department))
                    {
                        var allowedDepts = await StudentDepartmentOptions.GetAllowedAsync(_db, cancellationToken);
                        var canonicalDept = StudentDepartmentOptions.Canonicalize(request.Department, allowedDepts);
                        if (canonicalDept == null)
                            return BadRequest(new { message = "Bu bölüm listede yok. Önce bölüm listesini koordinatör panelinde güncelleyin." });

                        user.Department = canonicalDept;
                        changed = true;
                    }

                    if (request.AdvisorUserId != null)
                    {
                        var advisorError = await TryApplyAdvisorUserIdAsync(request.AdvisorUserId, user, cancellationToken);
                        if (advisorError != null)
                            return BadRequest(new { message = advisorError });

                        changed = true;
                    }

                    if (!changed)
                    {
                        return BadRequest(new { message = "Provide department or advisorUserId (use empty string to clear advisor)." });
                    }

                    await _db.SaveChangesAsync(cancellationToken);
                    return Ok(BuildProfileResponse(user));
                }

                if (currentUser.Role != "admin")
                    return Forbid();
            }

            var previousEligibilityStatus = user.EligibilityStatus;
            var previousTranscriptVerifiedAt = user.TranscriptVerifiedAt;

            // Gönderilen alanları güncelle (null olanları atla)
            if (request.Name != null) user.Name = request.Name;
            if (request.Department != null)
            {
                if (user.Role == "student")
                {
                    var allowed = await StudentDepartmentOptions.GetAllowedAsync(_db, cancellationToken);
                    var canonical = StudentDepartmentOptions.Canonicalize(request.Department, allowed);
                    if (canonical == null)
                        return BadRequest(new { message = "Bölüm geçersiz veya listede yok." });
                    user.Department = canonical;
                }
                else
                {
                    user.Department = request.Department;
                }
            }
            if (request.CurrentSemester.HasValue) user.CurrentSemester = request.CurrentSemester;
            if (request.Cgpa.HasValue) user.Cgpa = request.Cgpa;
            if (request.HomeAddress != null)
                user.HomeAddress = string.IsNullOrWhiteSpace(request.HomeAddress) ? null : request.HomeAddress.Trim();
            if (request.HomeTelephone != null)
                user.HomeTelephone = string.IsNullOrWhiteSpace(request.HomeTelephone) ? null : request.HomeTelephone.Trim();
            if (request.MobileTelephone != null)
                user.MobileTelephone = string.IsNullOrWhiteSpace(request.MobileTelephone) ? null : request.MobileTelephone.Trim();
            if (request.AddressNorthCyprus != null)
                user.AddressNorthCyprus = string.IsNullOrWhiteSpace(request.AddressNorthCyprus)
                    ? null
                    : request.AddressNorthCyprus.Trim();
            if (request.Photo != null) user.Photo = request.Photo;
            if (request.EligibilityStatus != null) user.EligibilityStatus = request.EligibilityStatus;
            if (request.PassedThirdYearCourses.HasValue) user.PassedThirdYearCourses = request.PassedThirdYearCourses;
            if (request.RequiredThirdYearCourses.HasValue) user.RequiredThirdYearCourses = request.RequiredThirdYearCourses;
            if (request.TranscriptVerifiedAt.HasValue) user.TranscriptVerifiedAt = request.TranscriptVerifiedAt;

            if (request.ThirdYearCourseGradesJson != null)
            {
                var raw = request.ThirdYearCourseGradesJson.Trim();
                if (string.IsNullOrEmpty(raw))
                    user.ThirdYearCourseGradesJson = null;
                else
                {
                    if (raw.Length > 32000)
                        return BadRequest(new { message = "Course grades payload is too large." });
                    try
                    {
                        JsonSerializer.Deserialize<Dictionary<string, string>>(raw);
                    }
                    catch (JsonException)
                    {
                        return BadRequest(new { message = "thirdYearCourseGradesJson must be a JSON object of courseCode → grade strings." });
                    }

                    user.ThirdYearCourseGradesJson = raw;
                }
            }

            // E-posta değiştiriliyorsa başka kullanıcıda kullanılmıyor mu kontrol et
            if (request.Email != null)
            {
                var emailTaken = await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id, cancellationToken);
                if (emailTaken)
                    return BadRequest(new { message = "This email is already used by another account." });
                user.Email = request.Email;
            }

            if (request.StudentId != null) user.StudentId = request.StudentId;

            if (request.AdvisorUserId != null && user.Role == "student" && currentUser.Role == "admin")
            {
                var advisorError = await TryApplyAdvisorUserIdAsync(request.AdvisorUserId, user, cancellationToken);
                if (advisorError != null)
                    return BadRequest(new { message = advisorError });
            }

            await _db.SaveChangesAsync(cancellationToken);

            var transcriptJustVerified =
                user.Role == "student" &&
                user.EligibilityStatus == "eligible" &&
                user.TranscriptVerifiedAt.HasValue &&
                (previousEligibilityStatus != "eligible" || previousTranscriptVerifiedAt != user.TranscriptVerifiedAt);

            if (transcriptJustVerified)
            {
                await _notificationService.CreateNotificationAsync(
                    user.Id,
                    "Transcript Eligibility Approved",
                    $"You passed {user.PassedThirdYearCourses ?? 0} out of {user.RequiredThirdYearCourses ?? 5} required courses and can now apply.",
                    "success",
                    "transcript",
                    user.Id,
                    cancellationToken);

                await _notificationService.CreateNotificationsForRoleAsync(
                    "coordinator",
                    "Transcript Eligibility Updated",
                    $"{user.Name} completed transcript verification with status: {user.EligibilityStatus}.",
                    user.EligibilityStatus == "eligible" ? "success" : "warning",
                    "transcript",
                    user.Id,
                    cancellationToken);
            }

            return Ok(BuildProfileResponse(user));
        }

        // POST api/users/{id}/change-password - Şifre değiştir (mevcut şifre + yeni şifre)
        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordRequest request, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            // Şifre değişimi yalnızca hesap sahibi tarafından yapılabilir.
            // Admin başkasının şifresini bu uçtan değiştiremez (ayrı admin akışı kullanılmalı).
            if (currentUser.Id != id)
                return Forbid();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound();

            // Mevcut şifre doğru mu kontrol et
            if (user.Password != request.CurrentPassword)
                return BadRequest(new { message = "Current password is incorrect." });

            // Yeni şifre en az 6 karakter olmalı
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                return BadRequest(new { message = "New password must be at least 6 characters." });

            user.Password = request.NewPassword;
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new { message = "Password updated." });
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }

        private static object BuildProfileResponse(User user)
        {
            return new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                currentSemester = user.CurrentSemester,
                cgpa = user.Cgpa,
                homeAddress = user.HomeAddress,
                homeTelephone = user.HomeTelephone,
                mobileTelephone = user.MobileTelephone,
                addressNorthCyprus = user.AddressNorthCyprus,
                photo = user.Photo,
                eligibilityStatus = user.EligibilityStatus,
                passedThirdYearCourses = user.PassedThirdYearCourses,
                requiredThirdYearCourses = user.RequiredThirdYearCourses,
                transcriptVerifiedAt = user.TranscriptVerifiedAt,
                thirdYearCourseGradesJson = user.ThirdYearCourseGradesJson,
                permissions = user.Permissions ?? System.Array.Empty<string>(),
                companyId = user.CompanyId,
                companyMembershipTier = user.CompanyMembershipTier,
                managedByCompanyUserId = user.ManagedByCompanyUserId,
                advisorUserId = user.AdvisorUserId
            };
        }

        /// <returns>Hata iletisi ya da başarı için null.</returns>
        private async Task<string?> TryApplyAdvisorUserIdAsync(string advisorField, User student, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(advisorField))
            {
                student.AdvisorUserId = null;
                return null;
            }

            var advisor = await _db.Users.FirstOrDefaultAsync(
                u => u.Id == advisorField.Trim() && u.Role == "advisor",
                cancellationToken);

            if (advisor == null)
                return "The selected advisor could not be found.";

            student.AdvisorUserId = advisor.Id;
            return null;
        }
    }

    // Profil güncelleme isteği body'si (hepsi opsiyonel)
    public class UpdateProfileRequest
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? StudentId { get; set; }
        public string? Department { get; set; }
        public int? CurrentSemester { get; set; }
        public double? Cgpa { get; set; }
        public string? HomeAddress { get; set; }
        public string? HomeTelephone { get; set; }
        public string? MobileTelephone { get; set; }
        public string? AddressNorthCyprus { get; set; }
        public string? Photo { get; set; }
        public string? EligibilityStatus { get; set; }
        public int? PassedThirdYearCourses { get; set; }
        public int? RequiredThirdYearCourses { get; set; }
        public DateTime? TranscriptVerifiedAt { get; set; }

        /// <summary>Transcript uygunluk ekranından: {"CMPE313":"A", ...} JSON.</summary>
        public string? ThirdYearCourseGradesJson { get; set; }

        /// <summary>Öğrenci için atanacak danışman (Role=advisor); boş string danışmanı temizler. Koordinatör veya admin.</summary>
        public string? AdvisorUserId { get; set; }
    }

    // Şifre değiştirme isteği body'si
    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
