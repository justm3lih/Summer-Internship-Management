using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/knowledge-base")]
    public class KnowledgeBaseController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private const long MaxPdfSizeBytes = 15 * 1024 * 1024; // 15MB
        private readonly AppDbContext _db;
        private readonly PdfImportService _pdfImporter;
        private readonly ILogger<KnowledgeBaseController> _logger;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public KnowledgeBaseController(
            AppDbContext db,
            PdfImportService pdfImporter,
            ILogger<KnowledgeBaseController> logger,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _pdfImporter = pdfImporter;
            _logger = logger;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        // GET /api/knowledge-base - Tüm kayıtları listele (tüm giriş yapmış kullanıcılar)
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? category,
            [FromQuery] string? search,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            // Coordinator portal rolleri için explicit view yetkisi kontrolü; admin/student/company herkes okuyabilir
            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken) &&
                !Permissions.Has(currentUser, Permissions.CoordKnowledgeView))
                return Forbid();

            IQueryable<KnowledgeBaseEntry> query = _db.KnowledgeBaseEntries.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(category) && category != "all")
            {
                query = query.Where(e => e.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(e =>
                    e.Title.ToLower().Contains(term) ||
                    e.Content.ToLower().Contains(term));
            }

            var entries = await query
                .OrderByDescending(e => e.UpdatedAt)
                .ToListAsync(cancellationToken);

            return Ok(entries.Select(ToResponse));
        }

        // POST /api/knowledge-base - Yeni kayıt oluştur
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] KnowledgeBaseUpsertRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await CanManageAsync(currentUser, cancellationToken))
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Title and content are required." });

            var entry = new KnowledgeBaseEntry
            {
                Title = request.Title.Trim(),
                Content = request.Content.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim(),
                AuthorId = currentUser.Id,
                AuthorName = currentUser.Name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.KnowledgeBaseEntries.Add(entry);
            await _db.SaveChangesAsync(cancellationToken);

            return StatusCode(201, ToResponse(entry));
        }

        // PATCH /api/knowledge-base/{id} - Kayıt güncelle
        [HttpPatch("{id}")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] KnowledgeBaseUpsertRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await CanManageAsync(currentUser, cancellationToken))
                return Forbid();

            var entry = await _db.KnowledgeBaseEntries.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
            if (entry == null)
                return NotFound(new { message = "Knowledge base entry not found." });

            if (request.Title != null) entry.Title = request.Title.Trim();
            if (request.Content != null) entry.Content = request.Content.Trim();
            if (!string.IsNullOrWhiteSpace(request.Category)) entry.Category = request.Category.Trim();

            entry.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(ToResponse(entry));
        }

        // POST /api/knowledge-base/upload-pdf - PDF'ten otomatik KB kayıtları oluştur
        [HttpPost("upload-pdf")]
        [RequestSizeLimit(MaxPdfSizeBytes)]
        public async Task<IActionResult> UploadPdf(
            [FromForm] IFormFile? file,
            [FromForm] string? category,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await CanManageAsync(currentUser, cancellationToken))
                return Forbid();

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "PDF file is required." });

            if (file.Length > MaxPdfSizeBytes)
                return BadRequest(new { message = "PDF is too large (max 15 MB)." });

            var extension = Path.GetExtension(file.FileName ?? string.Empty).ToLowerInvariant();
            var contentType = (file.ContentType ?? string.Empty).ToLowerInvariant();
            if (extension != ".pdf" && contentType != "application/pdf")
                return BadRequest(new { message = "Only PDF files are accepted." });

            var resolvedCategory = string.IsNullOrWhiteSpace(category) ? "General" : category.Trim();
            var fileBaseName = Path.GetFileNameWithoutExtension(file.FileName ?? "Document");
            if (string.IsNullOrWhiteSpace(fileBaseName)) fileBaseName = "Document";

            List<PdfChunk> chunks;
            try
            {
                using var pdfStream = file.OpenReadStream();
                chunks = _pdfImporter.ExtractChunks(pdfStream);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse uploaded PDF for KB import");
                return BadRequest(new { message = "PDF could not be processed. The file might be encrypted or corrupted." });
            }

            if (chunks.Count == 0)
                return BadRequest(new { message = "No text could be extracted from this PDF." });

            var now = DateTime.UtcNow;
            var createdEntries = new List<KnowledgeBaseEntry>(chunks.Count);

            foreach (var chunk in chunks)
            {
                var titleSuffix = chunk.PartNumber.ToString("D2");
                var title = !string.IsNullOrWhiteSpace(chunk.Headline)
                    ? $"{fileBaseName} - {chunk.Headline}"
                    : $"{fileBaseName} - Part {titleSuffix}";

                if (title.Length > 180) title = title.Substring(0, 180);

                var entry = new KnowledgeBaseEntry
                {
                    Title = title,
                    Content = chunk.Content,
                    Category = resolvedCategory,
                    AuthorId = currentUser.Id,
                    AuthorName = currentUser.Name,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _db.KnowledgeBaseEntries.Add(entry);
                createdEntries.Add(entry);
            }

            await _db.SaveChangesAsync(cancellationToken);

            return StatusCode(201, new
            {
                count = createdEntries.Count,
                entries = createdEntries.Select(ToResponse).ToList()
            });
        }

        // DELETE /api/knowledge-base/{id} - Kayıt sil
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await CanManageAsync(currentUser, cancellationToken))
                return Forbid();

            var entry = await _db.KnowledgeBaseEntries.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
            if (entry == null)
                return NotFound(new { message = "Knowledge base entry not found." });

            _db.KnowledgeBaseEntries.Remove(entry);
            await _db.SaveChangesAsync(cancellationToken);

            return NoContent();
        }

        private async Task<bool> CanManageAsync(User user, CancellationToken cancellationToken)
        {
            if (user.Role == "admin") return true;
            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(user, cancellationToken))
                return Permissions.Has(user, Permissions.CoordKnowledgeManage);
            return false;
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }

        private static object ToResponse(KnowledgeBaseEntry entry)
        {
            return new
            {
                id = entry.Id,
                title = entry.Title,
                content = entry.Content,
                category = entry.Category,
                authorId = entry.AuthorId,
                authorName = entry.AuthorName,
                createdAt = entry.CreatedAt,
                updatedAt = entry.UpdatedAt
            };
        }
    }

    public class KnowledgeBaseUpsertRequest
    {
        public string? Title { get; set; }
        public string? Content { get; set; }
        public string? Category { get; set; }
    }
}
