using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.DTOs;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Controllers
{
    // Kimlik doğrulama API'si: giriş ve kayıt
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;

        public AuthController(AppDbContext db)
        {
            _db = db;
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

            // Yanıtta şifreyi gönderme; sadece kullanıcı bilgilerini döndür
            var response = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                currentSemester = user.CurrentSemester,
                photo = user.Photo
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

            // Yeni kullanıcı oluştur (rol her zaman "student")
            var user = new User
            {
                Email = request.Email,
                Name = request.Name,
                Password = request.Password,
                Role = "student",
                StudentId = request.StudentId
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            var response = new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                currentSemester = user.CurrentSemester,
                photo = user.Photo
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

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                currentSemester = user.CurrentSemester,
                photo = user.Photo
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
