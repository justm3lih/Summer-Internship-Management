using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Controllers
{
    // Kullanıcı profil ve ayarlar API'si
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/users/{id} - Kullanıcı id ile profil bilgisi getir (şifre hariç)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken = default)
        {
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

            if (user == null)
                return NotFound();

            // Şifreyi yanıta ekleme
            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                currentSemester = user.CurrentSemester,
                photo = user.Photo,
                eligibilityStatus = user.EligibilityStatus,
                passedThirdYearCourses = user.PassedThirdYearCourses,
                requiredThirdYearCourses = user.RequiredThirdYearCourses,
                transcriptVerifiedAt = user.TranscriptVerifiedAt
            });
        }

        // PATCH api/users/{id} - Profil güncelle (ad, e-posta, öğrenci no, bölüm, dönem, fotoğraf)
        [HttpPatch("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateProfileRequest request, CancellationToken cancellationToken = default)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound();

            // Gönderilen alanları güncelle (null olanları atla)
            if (request.Name != null) user.Name = request.Name;
            if (request.Department != null) user.Department = request.Department;
            if (request.CurrentSemester.HasValue) user.CurrentSemester = request.CurrentSemester;
            if (request.Photo != null) user.Photo = request.Photo;
            if (request.EligibilityStatus != null) user.EligibilityStatus = request.EligibilityStatus;
            if (request.PassedThirdYearCourses.HasValue) user.PassedThirdYearCourses = request.PassedThirdYearCourses;
            if (request.RequiredThirdYearCourses.HasValue) user.RequiredThirdYearCourses = request.RequiredThirdYearCourses;
            if (request.TranscriptVerifiedAt.HasValue) user.TranscriptVerifiedAt = request.TranscriptVerifiedAt;

            // E-posta değiştiriliyorsa başka kullanıcıda kullanılmıyor mu kontrol et
            if (request.Email != null)
            {
                var emailTaken = await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id, cancellationToken);
                if (emailTaken)
                    return BadRequest(new { message = "This email is already used by another account." });
                user.Email = request.Email;
            }

            if (request.StudentId != null) user.StudentId = request.StudentId;

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                role = user.Role,
                studentId = user.StudentId,
                department = user.Department,
                currentSemester = user.CurrentSemester,
                photo = user.Photo,
                eligibilityStatus = user.EligibilityStatus,
                passedThirdYearCourses = user.PassedThirdYearCourses,
                requiredThirdYearCourses = user.RequiredThirdYearCourses,
                transcriptVerifiedAt = user.TranscriptVerifiedAt
            });
        }

        // POST api/users/{id}/change-password - Şifre değiştir (mevcut şifre + yeni şifre)
        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordRequest request, CancellationToken cancellationToken = default)
        {
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
    }

    // Profil güncelleme isteği body'si (hepsi opsiyonel)
    public class UpdateProfileRequest
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? StudentId { get; set; }
        public string? Department { get; set; }
        public int? CurrentSemester { get; set; }
        public string? Photo { get; set; }
        public string? EligibilityStatus { get; set; }
        public int? PassedThirdYearCourses { get; set; }
        public int? RequiredThirdYearCourses { get; set; }
        public DateTime? TranscriptVerifiedAt { get; set; }
    }

    // Şifre değiştirme isteği body'si
    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;  // Mevcut şifre
        public string NewPassword { get; set; } = string.Empty;     // Yeni şifre
    }
}
