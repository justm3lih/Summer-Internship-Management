using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

namespace InternshipManagement.API.Controllers
{
    // Dosya yükleme/indirme. Gerçek dosyalar diskte uploads/ klasöründe saklanır,
    // metadata UploadedFiles tablosunda tutulur. URL formatı: /api/files/{id}
    [ApiController]
    [Route("api/files")]
    public class FilesController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private const long MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx", ".txt"
        };

        private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            "cv", "motivation_letter", "transcript", "logbook", "report", "acceptance_letter",
            "training_report_figure", "other"
        };

        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public FilesController(
            AppDbContext db,
            IWebHostEnvironment env,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _env = env;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<IActionResult> Upload(
            [FromForm] IFormFile? file,
            [FromForm] string? category,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { message = $"File is too large. Max size is {MaxFileSizeBytes / (1024 * 1024)} MB." });

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
                return BadRequest(new { message = "File type is not allowed." });

            var normalizedCategory = string.IsNullOrWhiteSpace(category) ? "other" : category.Trim().ToLowerInvariant();
            if (!AllowedCategories.Contains(normalizedCategory))
                return BadRequest(new { message = "Invalid file category." });

            if (normalizedCategory == "acceptance_letter" &&
                string.Equals(currentUser.Role, "student", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message =
                        "acceptance_letter uploads from students are not supported. Download the Word template and submit the signed document according to department procedures."
                });
            }

            if (normalizedCategory == "training_report_figure")
            {
                if (!string.Equals(currentUser.Role, "student", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = "Only students may upload training report figures." });
                }

                if (!extension.Equals(".png", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = "Training report figures must be PNG files." });
                }
            }

            var uploadsRoot = GetUploadsRoot();
            Directory.CreateDirectory(uploadsRoot);

            var storedFileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var diskPath = Path.Combine(uploadsRoot, storedFileName);

            try
            {
                await using var stream = System.IO.File.Create(diskPath);
                await file.CopyToAsync(stream, cancellationToken);
            }
            catch
            {
                if (System.IO.File.Exists(diskPath))
                {
                    try { System.IO.File.Delete(diskPath); } catch { }
                }
                throw;
            }

            var uploaded = new UploadedFile
            {
                OwnerId = currentUser.Id,
                OriginalName = SanitizeOriginalName(file.FileName),
                StoredFileName = storedFileName,
                ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                SizeBytes = file.Length,
                Category = normalizedCategory
            };

            _db.UploadedFiles.Add(uploaded);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                id = uploaded.Id,
                url = $"/api/files/{uploaded.Id}",
                originalName = uploaded.OriginalName,
                contentType = uploaded.ContentType,
                sizeBytes = uploaded.SizeBytes,
                category = uploaded.Category
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Download(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var meta = await _db.UploadedFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
            if (meta == null)
                return NotFound(new { message = "File not found." });

            if (!await CanUserAccessFileAsync(currentUser, meta, cancellationToken))
                return Forbid();

            var diskPath = Path.Combine(GetUploadsRoot(), meta.StoredFileName);
            if (!System.IO.File.Exists(diskPath))
                return NotFound(new { message = "File missing on disk." });

            var fileStream = System.IO.File.OpenRead(diskPath);
            return File(fileStream, meta.ContentType, meta.OriginalName);
        }

        // Metadata-only (URL kontrolü için kullanılabilir)
        [HttpGet("{id}/info")]
        public async Task<IActionResult> Info(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var meta = await _db.UploadedFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
            if (meta == null)
                return NotFound(new { message = "File not found." });

            if (!await CanUserAccessFileAsync(currentUser, meta, cancellationToken))
                return Forbid();

            return Ok(new
            {
                id = meta.Id,
                originalName = meta.OriginalName,
                contentType = meta.ContentType,
                sizeBytes = meta.SizeBytes,
                category = meta.Category,
                uploadedAt = meta.CreatedAt
            });
        }

        private string GetUploadsRoot()
        {
            return Path.Combine(_env.ContentRootPath, "uploads");
        }

        private static string SanitizeOriginalName(string name)
        {
            var safe = Path.GetFileName(name);
            if (string.IsNullOrWhiteSpace(safe)) return "file";
            return safe.Length > 200 ? safe[..200] : safe;
        }

        private async Task<bool> CanUserAccessFileAsync(User user, UploadedFile meta, CancellationToken cancellationToken)
        {
            // Sahibi her zaman erişebilir
            if (meta.OwnerId == user.Id) return true;

            // Admin tüm dosyaları görür
            if (user.Role == "admin") return true;

            if (string.Equals(meta.Category, "training_report_figure", StringComparison.OrdinalIgnoreCase))
            {
                if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(user, cancellationToken))
                    return false;
                return Permissions.Has(user, Permissions.CoordReportsReview) ||
                       Permissions.Has(user, Permissions.TrainingReportReview);
            }

            // Coordinator portal: başvuru veya logbook'a bağlı dosyaları görebilir
            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(user, cancellationToken))
            {
                var url = $"/api/files/{meta.Id}";
                var attachedToApplication = await _db.Applications.AnyAsync(
                    a => a.CvUrl == url || a.MotivationLetterUrl == url || a.TranscriptUrl == url ||
                         a.AcceptanceLetterUrl == url,
                    cancellationToken);
                if (attachedToApplication) return true;

                var attachedToLogbook = await _db.LogbookEntries.AnyAsync(
                    e => e.Attachments != null && e.Attachments.Contains(url),
                    cancellationToken);
                if (attachedToLogbook) return true;
            }

            // Şirket: kendi başvurularına ve aktif stajyerlerinin logbook ek dosyalarına erişebilir
            if (user.Role == "company")
            {
                Company? company = null;
                if (!string.IsNullOrWhiteSpace(user.CompanyId))
                {
                    company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == user.CompanyId, cancellationToken);
                }
                if (company != null)
                {
                    var url = $"/api/files/{meta.Id}";

                    var ownsApplicationFile = await CompanyPortalAccess.FilterApplicationsForCompanyUser(
                            _db.Applications.AsNoTracking(),
                            user)
                        .AnyAsync(
                            a => a.CvUrl == url || a.MotivationLetterUrl == url || a.TranscriptUrl == url ||
                                 a.AcceptanceLetterUrl == url,
                            cancellationToken);
                    if (ownsApplicationFile) return true;

                    var activeAppsQuery = _db.Applications.Where(a =>
                        a.CompanyId == company.Id &&
                        (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"));
                    var isPrimary = CompanyPortalAccess.IsCompanyPrimary(user);
                    if (!isPrimary)
                        activeAppsQuery = activeAppsQuery.Where(a => a.CompanySupervisorUserId == user.Id);

                    var activeStudentIds = await activeAppsQuery
                        .Select(a => a.StudentId)
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    if (activeStudentIds.Count > 0)
                    {
                        var ownsLogbookFile = await _db.LogbookEntries.AnyAsync(
                            e => activeStudentIds.Contains(e.StudentId) &&
                                 e.Attachments != null && e.Attachments.Contains(url),
                            cancellationToken);
                        if (ownsLogbookFile) return true;
                    }
                }
            }

            return false;
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
        }
    }
}
