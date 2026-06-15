using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Configuration;
using InternshipManagement.API.Data;
using InternshipManagement.API.DTOs;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;

namespace InternshipManagement.API.Controllers
{
    // Kimlik doğrulama API'si: giriş ve kayıt
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly NotificationService _notificationService;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public AuthController(
            AppDbContext db,
            NotificationService notificationService,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _notificationService = notificationService;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        // POST api/auth/login - E-posta ve şifre ile giriş
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken = default)
        {
            // Veritabanında bu e-postaya sahip kullanıcıyı bul
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            // Kullanıcı yoksa veya şifre yanlışsa 401 döndür
            if (user == null || user.Password != request.Password)
                return Unauthorized(new { message = "Invalid email or password." });

            var coordinatorPortal = await _coordinatorPortalRoles.IsCoordinatorPortalRoleAsync(user.Role, cancellationToken);

            // Yanıtta şifreyi gönderme; sadece kullanıcı bilgilerini döndür
            var response = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                coordinatorPortal,
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

            // Giriş yapan kullanıcı id'sini cookie olarak sakla (frontend localStorage'a ihtiyaç duymasın)
            Response.Cookies.Append(AuthCookieName, user.Id, new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            return Ok(response);
        }

        // POST api/auth/register - Yeni öğrenci kaydı
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken = default)
        {
            // Bu e-posta zaten kayıtlı mı kontrol et
            if (await _db.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
                return BadRequest(new { message = "This email is already registered." });

            var allowed = await StudentDepartmentOptions.GetAllowedAsync(_db, cancellationToken);
            if (allowed.Count == 0)
                return BadRequest(new { message = "Kayıt için henüz bölüm listesi tanımlı değil. Koordinatöre danışın." });
            var canonicalDept = StudentDepartmentOptions.Canonicalize(request.Department, allowed);
            if (canonicalDept == null)
                return BadRequest(new { message = "Seçilen bölüm geçerli değil. Sayfayı yenileyip tekrar deneyin." });

            // Yeni kullanıcı oluştur (rol her zaman "student")
            var user = new User
            {
                Email = request.Email,
                Name = request.Name,
                Password = request.Password,
                Role = "student",
                StudentId = request.StudentId,
                Department = canonicalDept
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            await _notificationService.CreateNotificationsForRoleAsync(
                "coordinator",
                "New Student Registered",
                $"{user.Name} created a new student account.",
                "info",
                "user",
                user.Id,
                cancellationToken);

            var response = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                coordinatorPortal = false,
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

            // Kayıttan sonra kullanıcıyı otomatik oturum açmış kabul et (cookie yaz)
            Response.Cookies.Append(AuthCookieName, user.Id, new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            return StatusCode(201, response);
        }

        // GET api/auth/me - Aktif cookie'deki kullanıcı bilgisini döndür
        [HttpGet("me")]
        public async Task<IActionResult> Me(CancellationToken cancellationToken = default)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { message = "Not authenticated." });

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            if (user == null)
            {
                Response.Cookies.Delete(AuthCookieName);
                return Unauthorized(new { message = "Not authenticated." });
            }

            var coordinatorPortal = await _coordinatorPortalRoles.IsCoordinatorPortalRoleAsync(user.Role, cancellationToken);

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                coordinatorPortal,
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
            });
        }

        // POST api/auth/logout - Oturum cookie'sini temizle
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete(AuthCookieName);
            return Ok(new { message = "Logged out." });
        }
    }
}
