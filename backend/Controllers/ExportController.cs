using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using MiniSoftware;

namespace InternshipManagement.API.Controllers
{
    /// <summary>Word şablonu ile doldurulmuş dışa aktarımlar (MiniWord).</summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ExportController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly IConfiguration _config;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public ExportController(
            AppDbContext db,
            IWebHostEnvironment env,
            IConfiguration config,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _env = env;
            _config = config;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        /// <summary>
        /// Logbook verisini üniversite .docx şablonu ile doldurup indirir.
        /// Şablon: ContentRoot/Templates/ içinde (appsettings: WordTemplates:LogbookFileName).
        /// </summary>
        [HttpGet("logbook-word")]
        public async Task<IActionResult> DownloadLogbookWord(
            [FromQuery] string? studentId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            string? targetStudentId;
            if (currentUser.Role == "student")
            {
                if (!string.IsNullOrWhiteSpace(studentId) && studentId != currentUser.Id)
                    return Forbid();
                targetStudentId = currentUser.Id;

                var hasActivePlacement = await _db.Applications.AsNoTracking().AnyAsync(
                    a => a.StudentId == targetStudentId &&
                         (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"),
                    cancellationToken);
                var hasVerifiedAcceptance = await _db.Applications.AsNoTracking().AnyAsync(
                    a => a.StudentId == targetStudentId &&
                         (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed") &&
                         a.AcceptanceLetterVerifiedAt != null,
                    cancellationToken);
                if (!hasActivePlacement || !hasVerifiedAcceptance)
                {
                    return BadRequest(new
                    {
                        message =
                            "Word export is available after your internship is approved and the coordinator verifies your signed summer acceptance letter."
                    });
                }
            }
            else
            {
                if (string.IsNullOrWhiteSpace(studentId))
                    return BadRequest(new { message = "studentId is required for this role." });
                targetStudentId = studentId;
            }

            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            {
                if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
                    return Forbid();
            }
            else if (currentUser.Role == "company")
            {
                if (!Permissions.Has(currentUser, Permissions.CompanyLogbookView))
                    return Forbid();
            }
            else if (currentUser.Role != "admin" && currentUser.Role != "student")
                return Forbid();

            var targetExists = await _db.Users.AnyAsync(
                u => u.Id == targetStudentId && u.Role == "student",
                cancellationToken);
            if (!targetExists)
                return NotFound(new { message = "Student not found." });

            if (currentUser.Role == "company" && !await CompanyCanAccessStudentLogbookAsync(
                    currentUser, targetStudentId!, cancellationToken))
                return BadRequest(new { message = "This student is not an active intern of your company." });

            var fileName = _config["WordTemplates:LogbookFileName"] ?? "logbook_template.docx";
            var templatePath = Path.Combine(_env.ContentRootPath, "Templates", fileName);
            if (!System.IO.File.Exists(templatePath))
            {
                return NotFound(new
                {
                    message = "Word template is missing. Copy the university .docx into the /Templates folder and set WordTemplates:LogbookFileName in appsettings. See Templates/PLACEHOLDERS.txt for {{tags}} to use."
                });
            }

            var student = await _db.Users
                .AsNoTracking()
                .FirstAsync(u => u.Id == targetStudentId, cancellationToken);

            var application = await _db.Applications
                .AsNoTracking()
                .Where(a => a.StudentId == targetStudentId &&
                            (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"))
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            Company? company = null;
            if (application != null)
            {
                company = await _db.Companies.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == application.CompanyId, cancellationToken);
            }

            User? companySupervisorUser = null;
            if (!string.IsNullOrWhiteSpace(application?.CompanySupervisorUserId))
            {
                companySupervisorUser = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(
                        u => u.Id == application!.CompanySupervisorUserId,
                        cancellationToken);
            }

            var entries = await _db.LogbookEntries
                .AsNoTracking()
                .Where(e => e.StudentId == targetStudentId)
                .OrderBy(e => e.Date)
                .ToListAsync(cancellationToken);

            var values = LogbookWordTemplateValues.Build(
                student,
                company,
                application,
                companySupervisorUser,
                entries);
            LogbookWordTemplateValues.ApplyTraineeJobOwnWordsWrapForMiniWord(values);
            var templateBytes = await System.IO.File.ReadAllBytesAsync(templatePath, cancellationToken);

            var outStream = new MemoryStream();
            MiniWord.SaveAsByTemplate(outStream, templateBytes, values);
            outStream.Position = 0;

            var safeId = student.StudentId ?? "student";
            foreach (var c in Path.GetInvalidFileNameChars())
                safeId = safeId.Replace(c, '_');
            if (string.IsNullOrWhiteSpace(safeId)) safeId = "student";
            var downloadName = $"logbook_{safeId}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.docx";
            return File(
                outStream.ToArray(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                downloadName);
        }

        /// <summary>
        /// Üniversite yazlık başvuru mektubu .docx şablonunu değiştirmeden indirir (elle doldurmak için).
        /// </summary>
        [HttpGet("summer-application-letter-blank")]
        public async Task<IActionResult> DownloadSummerApplicationLetterBlank(
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await CanDownloadSummerLetterTemplateAsync(currentUser, cancellationToken))
                return Forbid();

            var fileName = _config["WordTemplates:SummerApplicationLetterFileName"] ??
                           "SWEN300_APPLICATION_LETTER_2025.docx";
            var templatePath = Path.Combine(_env.ContentRootPath, "Templates", fileName);
            if (!System.IO.File.Exists(templatePath))
            {
                return NotFound(new
                {
                    message = "Summer letter Word (.docx) template is missing or not converted yet. In backend/Templates you should have SWEN300_APPLICATION_LETTER_2025.docx (open SWEN300_APPLICATION LETTER_2025 (3).doc in Word → Save As that name, overwriting placeholder if needed). Set WordTemplates:SummerApplicationLetterFileName in appsettings. See Templates/PLACEHOLDERS.txt."
                });
            }

            var bytes = await System.IO.File.ReadAllBytesAsync(templatePath, cancellationToken);
            var baseName = Path.GetFileNameWithoutExtension(fileName);
            if (string.IsNullOrWhiteSpace(baseName))
                baseName = "SWEN300_APPLICATION_LETTER_2025";
            var downloadName = $"{baseName}_blank.docx";
            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                downloadName);
        }

        /// <summary>
        /// Aktif yaz dönemi mektubu + öğrenci kaydından dolu Word indirir. Öğrenci: studentId kullanmayın.
        /// Koordinatör / danışman: <c>studentId</c> gerekli.
        /// </summary>
        [HttpGet("summer-application-letter-word")]
        public async Task<IActionResult> DownloadSummerApplicationLetterWord(
            [FromQuery] string? studentId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            string? targetStudentId;
            if (currentUser.Role == "student")
            {
                if (!string.IsNullOrWhiteSpace(studentId) && studentId != currentUser.Id)
                    return Forbid();
                targetStudentId = currentUser.Id;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(studentId))
                    return BadRequest(new { message = "studentId is required for this role." });
                targetStudentId = studentId;
            }

            var authError = await AuthorizeSummerLetterFilledExportAsync(
                currentUser, targetStudentId!, cancellationToken);
            if (authError != null)
                return authError;

            var studentExists = await _db.Users.AnyAsync(
                u => u.Id == targetStudentId && u.Role == "student",
                cancellationToken);
            if (!studentExists)
                return NotFound(new { message = "Student not found." });

            var periodKey =
                (_config["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();

            var letter = await _db.SummerTrainingApplicationLetters
                .AsNoTracking()
                .Include(l => l.Student!)
                    .ThenInclude(s => s!.AdvisorUser)
                .FirstOrDefaultAsync(
                    l => l.StudentId == targetStudentId && l.AcademicPeriodKey == periodKey,
                    cancellationToken);

            if (letter == null)
                return NotFound(new { message = "No summer training letter for this student in the current period." });

            if (currentUser.Role != "admin" &&
                !string.Equals(letter.Status, SummerTrainingLetterStatuses.Approved, StringComparison.Ordinal))
            {
                return BadRequest(new
                {
                    message =
                        "Filled application letter Word is available only after advisor and internship coordinator approval."
                });
            }

            var student = letter.Student ??
                          await _db.Users.AsNoTracking().FirstAsync(u => u.Id == targetStudentId, cancellationToken);
            var advisor = letter.Student?.AdvisorUser;

            var fileName = _config["WordTemplates:SummerApplicationLetterFileName"] ??
                           "SWEN300_APPLICATION_LETTER_2025.docx";
            var templatePath = Path.Combine(_env.ContentRootPath, "Templates", fileName);
            if (!System.IO.File.Exists(templatePath))
            {
                return NotFound(new
                {
                    message = "Summer letter Word (.docx) template is missing or not converted yet. In backend/Templates you should have SWEN300_APPLICATION_LETTER_2025.docx (open SWEN300_APPLICATION LETTER_2025 (3).doc in Word → Save As that name, overwriting placeholder if needed). Set WordTemplates:SummerApplicationLetterFileName in appsettings. See Templates/PLACEHOLDERS.txt."
                });
            }

            var values = SummerApplicationLetterWordTemplateValues.Build(
                student,
                advisor,
                letter,
                periodKey);
            var templateBytes = await System.IO.File.ReadAllBytesAsync(templatePath, cancellationToken);
            var docBytes = SummerApplicationLetterWordExporter.MergeTemplate(templateBytes, values);

            var safeId = student.StudentId ?? "student";
            foreach (var c in Path.GetInvalidFileNameChars())
                safeId = safeId.Replace(c, '_');
            if (string.IsNullOrWhiteSpace(safeId)) safeId = "student";
            var downloadName = $"summer_training_letter_{safeId}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.docx";
            return File(
                docBytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                downloadName);
        }

        /// <summary>
        /// Summer acceptance letter şablonunu olduğu gibi indirir (.docx). İsim: appsettings WordTemplates:SummerAcceptanceLetterFileName.
        /// </summary>
        [HttpGet("summer-acceptance-letter-blank")]
        public async Task<IActionResult> DownloadSummerAcceptanceLetterBlank(
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await CanDownloadSummerLetterTemplateAsync(currentUser, cancellationToken))
                return Forbid();

            if (currentUser.Role == "student")
            {
                var hasPlacement = await _db.Applications.AsNoTracking().AnyAsync(
                    a => a.StudentId == currentUser.Id &&
                         (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"),
                    cancellationToken);
                if (!hasPlacement)
                {
                    return BadRequest(new
                    {
                        message =
                            "Blank acceptance letter Word unlocks after your internship placement is approved, ongoing, or completed."
                    });
                }

                var summerPeriodKey = (_config["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();
                if (!await SummerTrainingLettersController.StudentHasApprovedLetterForPeriodAsync(
                        _db,
                        currentUser.Id,
                        summerPeriodKey,
                        cancellationToken))
                {
                    return BadRequest(new
                    {
                        message =
                            "Blank acceptance letter Word unlocks after your application letter is approved by your advisor and the internship coordinator."
                    });
                }
            }

            var fileName = _config["WordTemplates:SummerAcceptanceLetterFileName"] ??
                           "SWEN300_ACCEPTANCE LETTER_2025.docx";
            var templatePath = Path.Combine(_env.ContentRootPath, "Templates", fileName);
            if (!System.IO.File.Exists(templatePath))
            {
                return NotFound(new
                {
                    message =
                        "Summer acceptance letter template is missing. Save SWEN300_ACCEPTANCE LETTER_2025.docx under backend/Templates and set WordTemplates:SummerAcceptanceLetterFileName if the file name differs. See Templates/PLACEHOLDERS.txt."
                });
            }

            var bytes = await System.IO.File.ReadAllBytesAsync(templatePath, cancellationToken);
            var baseName = Path.GetFileNameWithoutExtension(fileName);
            if (string.IsNullOrWhiteSpace(baseName))
                baseName = "summer_acceptance_letter";
            var downloadName = $"{baseName}_blank.docx";
            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                downloadName);
        }

        /// <summary>
        /// Öğrenci + yerleşim (onaylı başvuru) ile acceptance letter şablonunu doldurur. Öğrenci: studentId göndermeyin.
        /// Koordinatör / danışman: studentId gerekli.
        /// </summary>
        [HttpGet("summer-acceptance-letter-word")]
        public async Task<IActionResult> DownloadSummerAcceptanceLetterWord(
            [FromQuery] string? studentId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            string? targetStudentId;
            if (currentUser.Role == "student")
            {
                if (!string.IsNullOrWhiteSpace(studentId) && studentId != currentUser.Id)
                    return Forbid();
                targetStudentId = currentUser.Id;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(studentId))
                    return BadRequest(new { message = "studentId is required for this role." });
                targetStudentId = studentId;
            }

            var authError = await AuthorizeAcceptanceLetterFilledExportAsync(
                currentUser, targetStudentId!, cancellationToken);
            if (authError != null)
                return authError;

            var summerPeriodKeyAccept = (_config["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();
            if (currentUser.Role != "admin" &&
                !await SummerTrainingLettersController.StudentHasApprovedLetterForPeriodAsync(
                    _db,
                    targetStudentId!,
                    summerPeriodKeyAccept,
                    cancellationToken))
            {
                return BadRequest(new
                {
                    message =
                        "Prefilled acceptance letter Word is available only after that student’s application letter is approved by advisor and internship coordinator."
                });
            }

            var studentExists = await _db.Users.AnyAsync(
                u => u.Id == targetStudentId && u.Role == "student",
                cancellationToken);
            if (!studentExists)
                return NotFound(new { message = "Student not found." });

            var hasPlacement = await _db.Applications.AsNoTracking().AnyAsync(
                a => a.StudentId == targetStudentId &&
                     (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"),
                cancellationToken);
            if (!hasPlacement)
            {
                return BadRequest(new
                {
                    message = "An approved internship placement is required before generating this document."
                });
            }

            var fileName = _config["WordTemplates:SummerAcceptanceLetterFileName"] ??
                           "SWEN300_ACCEPTANCE LETTER_2025.docx";
            var templatePath = Path.Combine(_env.ContentRootPath, "Templates", fileName);
            if (!System.IO.File.Exists(templatePath))
            {
                return NotFound(new
                {
                    message =
                        "Summer acceptance letter template is missing. Save the .docx under backend/Templates. See Templates/PLACEHOLDERS.txt for {{tags}}."
                });
            }

            var student = await _db.Users
                .AsNoTracking()
                .FirstAsync(u => u.Id == targetStudentId, cancellationToken);

            var application = await _db.Applications
                .AsNoTracking()
                .Where(a => a.StudentId == targetStudentId &&
                            (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"))
                .OrderByDescending(a => a.AppliedDate)
                .FirstAsync(cancellationToken);

            Company? company = await _db.Companies.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == application.CompanyId, cancellationToken);

            User? companySupervisorUser = null;
            if (!string.IsNullOrWhiteSpace(application.CompanySupervisorUserId))
            {
                companySupervisorUser = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == application.CompanySupervisorUserId, cancellationToken);
            }

            var values = LogbookWordTemplateValues.Build(
                student,
                company,
                application,
                companySupervisorUser,
                Array.Empty<LogbookEntry>());
            AcceptanceLetterPortalMerge.Apply(values, application.AcceptanceLetterPortalJson, application);
            LogbookWordTemplateValues.ApplyTraineeJobOwnWordsWrapForMiniWord(values);
            var templateBytes = await System.IO.File.ReadAllBytesAsync(templatePath, cancellationToken);

            await using var outStream = new MemoryStream();
            MiniWord.SaveAsByTemplate(outStream, templateBytes, values);
            outStream.Position = 0;

            var safeId = student.StudentId ?? "student";
            foreach (var c in Path.GetInvalidFileNameChars())
                safeId = safeId.Replace(c, '_');
            if (string.IsNullOrWhiteSpace(safeId)) safeId = "student";
            var downloadName = $"summer_acceptance_letter_{safeId}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.docx";
            return File(
                outStream.ToArray(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                downloadName);
        }

        /// <returns><c>null</c> ise yetki tamam; aksi için HTTP sonucu.</returns>
        private async Task<IActionResult?> AuthorizeAcceptanceLetterFilledExportAsync(
            User currentUser,
            string targetStudentId,
            CancellationToken cancellationToken)
        {
            switch (currentUser.Role)
            {
                case "student":
                    return targetStudentId == currentUser.Id ? null : Forbid();
                case "admin":
                    return null;
                case "advisor":
                    var adviseeOk = await _db.Users.AsNoTracking().AnyAsync(
                        u => u.Id == targetStudentId &&
                             u.Role == "student" &&
                             u.AdvisorUserId == currentUser.Id,
                        cancellationToken);
                    return adviseeOk ? null : Forbid();
            }

            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            {
                if (!Permissions.Has(currentUser, Permissions.CoordStudentsView) &&
                    !Permissions.Has(currentUser, Permissions.CoordApplicationsReview))
                    return Forbid();
                return null;
            }

            return Forbid();
        }

        /// <returns><c>null</c> ise yetki tamam; aksi için HTTP sonucu.</returns>
        private async Task<IActionResult?> AuthorizeSummerLetterFilledExportAsync(
            User currentUser,
            string targetStudentId,
            CancellationToken cancellationToken)
        {
            switch (currentUser.Role)
            {
                case "student":
                    return targetStudentId == currentUser.Id ? null : Forbid();
                case "admin":
                    return null;
                case "advisor":
                    var adviseeOk = await _db.Users.AsNoTracking().AnyAsync(
                        u => u.Id == targetStudentId &&
                             u.Role == "student" &&
                             u.AdvisorUserId == currentUser.Id,
                        cancellationToken);
                    return adviseeOk ? null : Forbid();
            }

            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            {
                if (!Permissions.Has(currentUser, Permissions.CoordSummerTrainingLettersReview))
                    return Forbid();
                return null;
            }

            return Forbid();
        }

        private async Task<bool> CanDownloadSummerLetterTemplateAsync(
            User currentUser,
            CancellationToken cancellationToken)
        {
            if (currentUser.Role is "student" or "admin" or "advisor")
                return true;

            if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Permissions.Has(currentUser, Permissions.CoordStudentsView);

            return false;
        }

        private async Task<bool> CompanyCanAccessStudentLogbookAsync(
            User companyUser,
            string studentId,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(companyUser.CompanyId)) return false;

            var isPrimary = CompanyPortalAccess.IsCompanyPrimary(companyUser);
            return await _db.Applications.AnyAsync(
                a => a.CompanyId == companyUser.CompanyId &&
                     a.StudentId == studentId &&
                     (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed") &&
                     a.AcceptanceLetterVerifiedAt != null &&
                     (isPrimary || a.CompanySupervisorUserId == companyUser.Id),
                cancellationToken);
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;
            return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }
    }
}
