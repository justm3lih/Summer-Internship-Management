using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;

namespace InternshipManagement.API.Controllers;

/// <summary>SWEN300 summer training report — portal içeriği ve dolu Word indirme.</summary>
[ApiController]
[Route("api/training-reports")]
public class TrainingReportsController : ControllerBase
{
    private const string AuthCookieName = "internship_auth_user_id";

    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;
    private readonly NotificationService _notificationService;

    public TrainingReportsController(
        AppDbContext db,
        IWebHostEnvironment env,
        IConfiguration config,
        ICoordinatorPortalRoleService coordinatorPortalRoles,
        NotificationService notificationService)
    {
        _db = db;
        _env = env;
        _config = config;
        _coordinatorPortalRoles = coordinatorPortalRoles;
        _notificationService = notificationService;
    }

    public static class Statuses
    {
        public const string Draft = "draft";
        public const string Submitted = "submitted";
        public const string RevisionRequested = "revision_requested";
        public const string Approved = "approved";
    }

    /// <summary>Öğrenci completed placement ile rapor oluşturabilir mi?</summary>
    [HttpGet("eligibility")]
    public async Task<IActionResult> GetEligibility(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (user.Role != "student")
            return Ok(new { eligible = false });

        var apps = await _db.Applications.AsNoTracking()
            .Include(a => a.Company)
            .Where(a => a.StudentId == user.Id)
            .OrderByDescending(a => a.AppliedDate)
            .ToListAsync(cancellationToken);

        var app = apps.FirstOrDefault(a => StudentPlacementAnchor.IsActivePlacementStatus(a.Status));
        
        if (app == null)
        {
            return Ok(new
            {
                eligible = false,
                checks = new
                {
                    applicationApproved = false,
                    acceptanceLetterVerified = false,
                    logbookSubmittedToSupervisor = false,
                    supervisorEvaluationDone = false,
                    logbookSubmittedForCoordinator = false,
                    coordinatorLogbookVerified = false
                }
            });
        }

        bool eligible = StudentPlacementAnchor.IsCompletedPlacementStatus(app);

        return Ok(new
        {
            eligible = eligible,
            applicationId = app.Id,
            companyName = app.Company?.Name,
            checks = new
            {
                applicationApproved = app.CoordinatorPlacementApprovedAt.HasValue,
                acceptanceLetterVerified = app.AcceptanceLetterVerifiedAt.HasValue,
                logbookSubmittedToSupervisor = app.LogbookSubmittedToSupervisorAt.HasValue,
                supervisorEvaluationDone = app.SupervisorEvaluationCompletedAt.HasValue,
                logbookSubmittedForCoordinator = app.LogbookSubmittedForCoordinatorReviewAt.HasValue,
                coordinatorLogbookVerified = app.LogbookVerifiedByCoordinatorAt.HasValue
            }
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (user.Role != "student")
            return Forbid();

        var app = await GetCompletedApplicationForStudentAsync(user.Id, cancellationToken);
        if (app == null)
            return BadRequest(new { message = "Training report opens after your internship is marked completed." });

        var report = await _db.TrainingReports
            .Include(r => r.Figures.OrderBy(f => f.SortOrder))
            .FirstOrDefaultAsync(r => r.ApplicationId == app.Id, cancellationToken);

        if (report == null)
        {
            report = new TrainingReport
            {
                ApplicationId = app.Id,
                StudentId = user.Id,
                Status = Statuses.Draft,
                ContentJson = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.TrainingReports.Add(report);
            await _db.SaveChangesAsync(cancellationToken);
            await _db.Entry(report).Collection(r => r.Figures).LoadAsync(cancellationToken);
        }

        return Ok(ToStudentDto(report, app));
    }

    [HttpPut("{id}/content")]
    public async Task<IActionResult> PutContent(
        string id,
        [FromBody] TrainingReportContentBody body,
        CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (user.Role != "student")
            return Forbid();

        var report = await _db.TrainingReports.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report == null || report.StudentId != user.Id)
            return NotFound(new { message = "Report not found." });

        if (!StudentMayEdit(report.Status))
            return BadRequest(new { message = "This report cannot be edited in its current status." });

        var dto = body.Content ?? new TrainingReportContentDto();
        report.ContentJson = TrainingReportContentDto.Serialize(dto);
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var app = await _db.Applications.Include(a => a.Company).FirstAsync(a => a.Id == report.ApplicationId, cancellationToken);
        return Ok(ToStudentDto(report, app));
    }

    public sealed class TrainingReportContentBody
    {
        public TrainingReportContentDto? Content { get; set; }
    }

    [HttpPost("{id}/figures")]
    public async Task<IActionResult> AddFigure(
        string id,
        [FromBody] AddFigureRequest req,
        CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (user.Role != "student")
            return Forbid();

        var report = await _db.TrainingReports.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report == null || report.StudentId != user.Id)
            return NotFound(new { message = "Report not found." });

        if (!StudentMayEdit(report.Status))
            return BadRequest(new { message = "Figures cannot be changed now." });

        if (string.IsNullOrWhiteSpace(req.FileId))
            return BadRequest(new { message = "fileId is required." });

        var fileId = req.FileId.Trim();
        var owned = await _db.UploadedFiles.AnyAsync(
            f => f.Id == fileId && f.OwnerId == user.Id && f.Category == "training_report_figure",
            cancellationToken);
        if (!owned)
            return BadRequest(new { message = "PNG file not found or wrong category." });

        var maxOrder = await _db.TrainingReportFigures.Where(f => f.TrainingReportId == report.Id)
            .Select(f => (int?)f.SortOrder).MaxAsync(cancellationToken) ?? -1;

        var fig = new TrainingReportFigure
        {
            TrainingReportId = report.Id,
            FileId = fileId,
            Caption = string.IsNullOrWhiteSpace(req.Caption) ? "" : req.Caption.Trim(),
            SortOrder = maxOrder + 1,
        };
        _db.TrainingReportFigures.Add(fig);
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var app = await _db.Applications.Include(a => a.Company).FirstAsync(a => a.Id == report.ApplicationId, cancellationToken);
        report = await ReloadReportAsync(report.Id, cancellationToken);
        return Ok(ToStudentDto(report!, app));
    }

    public sealed class AddFigureRequest
    {
        public string? FileId { get; set; }
        public string? Caption { get; set; }
    }

    [HttpDelete("{reportId}/figures/{figureId}")]
    public async Task<IActionResult> DeleteFigure(string reportId, string figureId, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (user.Role != "student")
            return Forbid();

        var report = await _db.TrainingReports.FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken);
        if (report == null || report.StudentId != user.Id)
            return NotFound(new { message = "Report not found." });

        if (!StudentMayEdit(report.Status))
            return BadRequest(new { message = "Figures cannot be changed now." });

        var fig = await _db.TrainingReportFigures.FirstOrDefaultAsync(
            f => f.Id == figureId && f.TrainingReportId == report.Id,
            cancellationToken);
        if (fig == null)
            return NotFound(new { message = "Figure not found." });

        _db.TrainingReportFigures.Remove(fig);
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var app = await _db.Applications.Include(a => a.Company).FirstAsync(a => a.Id == report.ApplicationId, cancellationToken);
        report = await ReloadReportAsync(report.Id, cancellationToken);
        return Ok(ToStudentDto(report!, app));
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(string id, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (user.Role != "student")
            return Forbid();

        var report = await _db.TrainingReports
            .Include(r => r.Figures.OrderBy(f => f.SortOrder))
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report == null || report.StudentId != user.Id)
            return NotFound(new { message = "Report not found." });

        if (report.Status != Statuses.Draft && report.Status != Statuses.RevisionRequested)
            return BadRequest(new { message = "Report is not in a submittable state." });

        report.Status = Statuses.Submitted;
        report.SubmittedAt = DateTime.UtcNow;
        report.CoordinatorFeedback = null;
        report.UpdatedAt = DateTime.UtcNow;

        var snapshot = JsonSerializer.Serialize(new
        {
            report.ContentJson,
            figures = report.Figures.Select(f => new { f.FileId, f.Caption, f.SortOrder }).ToList(),
            submittedAt = report.SubmittedAt,
        });
        _db.TrainingReportSubmissionSnapshots.Add(new TrainingReportSubmissionSnapshot
        {
            TrainingReportId = report.Id,
            PayloadJson = snapshot,
            CreatedUtc = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(cancellationToken);
        await TrimSnapshotsAsync(report.Id, cancellationToken);

        await NotifyReviewersAsync(
            $"{user.Name} submitted a SWEN300 training report.",
            "training-report",
            report.Id,
            cancellationToken);

        var app = await _db.Applications.Include(a => a.Company).FirstAsync(a => a.Id == report.ApplicationId, cancellationToken);
        report = await ReloadReportAsync(report.Id, cancellationToken);
        return Ok(ToStudentDto(report!, app));
    }

    [HttpGet("{id}/export-word")]
    public async Task<IActionResult> ExportWord(string id, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });

        var report = await _db.TrainingReports
            .Include(r => r.Figures.OrderBy(f => f.SortOrder))
            .Include(r => r.Application!)
                .ThenInclude(a => a.Student!)
            .Include(r => r.Application!)
                .ThenInclude(a => a.Company!)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (report == null)
            return NotFound(new { message = "Report not found." });

        if (user.Role == "student")
        {
            if (report.StudentId != user.Id)
                return Forbid();
        }
        else if (!await CanViewOrReviewAsync(user, cancellationToken))
            return Forbid();

        var app = report.Application!;
        var student = report.Application!.Student!;
        var company = report.Application!.Company;
        var content = TrainingReportContentDto.ParseOrEmpty(report.ContentJson);
        var scalars = TrainingReportWordExporter.BuildMergeDictionary(app, student, company, content, report);

        var uploadsRoot = Path.Combine(_env.ContentRootPath, "uploads");
        var figureStreams = new List<(Stream Stream, string Caption)>();
        try
        {
            foreach (var fig in report.Figures.OrderBy(f => f.SortOrder))
            {
                var meta = await _db.UploadedFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == fig.FileId, cancellationToken);
                if (meta == null)
                    continue;
                var diskPath = Path.Combine(uploadsRoot, meta.StoredFileName);
                if (!System.IO.File.Exists(diskPath))
                    continue;
                var fs = System.IO.File.OpenRead(diskPath);
                figureStreams.Add((fs, fig.Caption));
            }

            var templateBytes = await ResolveTemplateBytesAsync(cancellationToken);
            var docBytes = TrainingReportWordExporter.MergeDocument(templateBytes, scalars, figureStreams);

            var safeName = $"SWEN300_training_report_{student.StudentId ?? student.Id}.docx";
            return File(docBytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", safeName);
        }
        finally
        {
            foreach (var (stream, _) in figureStreams)
                await stream.DisposeAsync();
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(string id, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });

        var report = await _db.TrainingReports
            .Include(r => r.Figures.OrderBy(f => f.SortOrder))
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (report == null)
            return NotFound(new { message = "Report not found." });

        // Security check
        if (user.Role == "student")
        {
            if (report.StudentId != user.Id) return Forbid();
        }
        else
        {
            if (!await CanViewOrReviewAsync(user, cancellationToken)) return Forbid();
        }

        var app = await _db.Applications
            .Include(a => a.Company)
            .Include(a => a.Student)
            .FirstAsync(a => a.Id == report.ApplicationId, cancellationToken);

        return Ok(new
        {
            id = report.Id,
            applicationId = report.ApplicationId,
            status = report.Status,
            content = TrainingReportContentDto.ParseOrEmpty(report.ContentJson),
            coordinatorFeedback = report.CoordinatorFeedback,
            submittedAt = report.SubmittedAt,
            approvedAt = report.ApprovedAt,
            updatedAt = report.UpdatedAt,
            studentName = app.Student?.Name,
            studentNumber = app.Student?.StudentId,
            companyName = app.Company?.Name,
            figures = report.Figures.OrderBy(f => f.SortOrder).Select(f => new
            {
                id = f.Id,
                fileId = f.FileId,
                url = $"/api/files/{f.FileId}",
                caption = f.Caption,
                sortOrder = f.SortOrder,
            }),
        });
    }

    [HttpGet("coordinator/pending")]

    [HttpGet("coordinator/all")]
    public async Task<IActionResult> CoordinatorAll(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!await CanViewOrReviewAsync(user, cancellationToken))
            return Forbid();

        var rows = await _db.TrainingReports.AsNoTracking()
            .OrderByDescending(r => r.UpdatedAt)
            .Join(_db.Users.AsNoTracking(), r => r.StudentId, u => u.Id, (r, st) => new { r, st })
            .Join(_db.Applications.AsNoTracking(), x => x.r.ApplicationId, a => a.Id, (x, a) => new { x.r, x.st, a })
            .Join(_db.Companies.AsNoTracking(), x => x.a.CompanyId, c => c.Id, (x, c) => new
            {
                x.r.Id,
                x.r.Status,
                x.r.SubmittedAt,
                x.r.UpdatedAt,
                studentId = x.st.Id,
                studentName = x.st.Name,
                studentNumber = x.st.StudentId,
                companyName = c.Name,
                applicationId = x.a.Id,
            })
            .Take(500)
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    public sealed class RevisionBody
    {
        public string? Feedback { get; set; }
    }

    [HttpPatch("{id}/request-revision")]
    public async Task<IActionResult> RequestRevision(string id, [FromBody] RevisionBody body, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!await CanViewOrReviewAsync(user, cancellationToken))
            return Forbid();

        var report = await _db.TrainingReports.Include(r => r.Application).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report == null)
            return NotFound(new { message = "Report not found." });

        if (report.Status != Statuses.Submitted)
            return BadRequest(new { message = "Revision can only be requested while the report is awaiting review." });

        report.Status = Statuses.RevisionRequested;
        report.CoordinatorFeedback = string.IsNullOrWhiteSpace(body.Feedback) ? null : body.Feedback!.Trim();
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        await _notificationService.CreateNotificationAsync(
            report.StudentId,
            "Training report: revision requested",
            report.CoordinatorFeedback ?? "Please update your SWEN300 training report and submit again.",
            "warning",
            "training-report",
            report.Id,
            cancellationToken);

        return Ok(ToCoordinatorDto(report));
    }

    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> Approve(string id, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!await CanFinalApproveAsync(user, cancellationToken))
            return Forbid();

        var report = await _db.TrainingReports.Include(r => r.Application).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report == null)
            return NotFound(new { message = "Report not found." });

        if (report.Status != Statuses.Submitted)
            return BadRequest(new { message = "Only a submitted report can be approved." });

        report.Status = Statuses.Approved;
        report.ApprovedAt = DateTime.UtcNow;
        report.ApprovedByUserId = user.Id;
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        await _notificationService.CreateNotificationAsync(
            report.StudentId,
            "Training report approved",
            "Your SWEN300 training report has been approved.",
            "success",
            "training-report",
            report.Id,
            cancellationToken);

        return Ok(ToCoordinatorDto(report));
    }

    private async Task<byte[]> ResolveTemplateBytesAsync(CancellationToken cancellationToken)
    {
        var name = (_config["WordTemplates:TrainingReportFileName"] ?? "").Trim();
        if (!string.IsNullOrEmpty(name))
        {
            var path = Path.Combine(_env.ContentRootPath, "Templates", name);
            if (System.IO.File.Exists(path))
            {
                try
                {
                    using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    using var ms = new MemoryStream();
                    await fs.CopyToAsync(ms, cancellationToken);
                    return ms.ToArray();
                }
                catch
                {
                    // Fallback if still locked
                }
            }
        }

        return TrainingReportMinimalTemplate.CreateSkeletonTemplateBytes();
    }

    private static bool StudentMayEdit(string status) =>
        status == Statuses.Draft || status == Statuses.RevisionRequested;

    private async Task<bool> CanViewOrReviewAsync(User user, CancellationToken cancellationToken) =>
        await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(user, cancellationToken) &&
        (Permissions.Has(user, Permissions.CoordReportsReview) ||
         Permissions.Has(user, Permissions.TrainingReportReview));

    private async Task<bool> CanFinalApproveAsync(User user, CancellationToken cancellationToken) =>
        await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(user, cancellationToken) &&
        Permissions.Has(user, Permissions.CoordReportsReview);

    private async Task NotifyReviewersAsync(
        string message,
        string entityType,
        string entityId,
        CancellationToken cancellationToken)
    {
        var coordinatorIds = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "coordinator")
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        var reviewerIds = await _db.Users.AsNoTracking()
            .Where(u =>
                u.Permissions != null &&
                u.Permissions.Contains(Permissions.TrainingReportReview))
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        foreach (var uid in coordinatorIds.Concat(reviewerIds).Distinct())
        {
            await _notificationService.CreateNotificationAsync(
                uid,
                "Training report submitted",
                message,
                "info",
                entityType,
                entityId,
                cancellationToken);
        }
    }

    /// <summary>EF LINQ array Contains uyumu için AsEnumerable (liste küçük).</summary>
    private async Task TrimSnapshotsAsync(string trainingReportId, CancellationToken cancellationToken)
    {
        var ids = await _db.TrainingReportSubmissionSnapshots.AsNoTracking()
            .Where(s => s.TrainingReportId == trainingReportId)
            .OrderByDescending(s => s.CreatedUtc)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        if (ids.Count <= 2)
            return;

        var drop = ids.Skip(2).ToList();
        await _db.TrainingReportSubmissionSnapshots.Where(s => drop.Contains(s.Id))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task<TrainingReport?> ReloadReportAsync(string id, CancellationToken cancellationToken) =>
        await _db.TrainingReports
            .Include(r => r.Figures.OrderBy(f => f.SortOrder))
            .FirstAsync(r => r.Id == id, cancellationToken);

    private async Task<Application?> GetCompletedApplicationForStudentAsync(string studentId, CancellationToken cancellationToken)
    {
        var apps = await _db.Applications.AsNoTracking()
            .Include(a => a.Company)
            .Where(a => a.StudentId == studentId)
            .OrderByDescending(a => a.AppliedDate)
            .ToListAsync(cancellationToken);

        return StudentPlacementAnchor.ResolveCompletedApplicationForTrainingReport(apps);
    }

    private object ToStudentDto(TrainingReport report, Application app) =>
        new
        {
            id = report.Id,
            applicationId = report.ApplicationId,
            status = report.Status,
            content = TrainingReportContentDto.ParseOrEmpty(report.ContentJson),
            coordinatorFeedback = report.CoordinatorFeedback,
            submittedAt = report.SubmittedAt,
            approvedAt = report.ApprovedAt,
            updatedAt = report.UpdatedAt,
            companyName = app.Company?.Name,
            figures = report.Figures.OrderBy(f => f.SortOrder).Select(f => new
            {
                id = f.Id,
                fileId = f.FileId,
                url = $"/api/files/{f.FileId}",
                caption = f.Caption,
                sortOrder = f.SortOrder,
            }),
        };

    private object ToCoordinatorDto(TrainingReport report) =>
        new
        {
            id = report.Id,
            studentId = report.StudentId,
            applicationId = report.ApplicationId,
            status = report.Status,
            coordinatorFeedback = report.CoordinatorFeedback,
            submittedAt = report.SubmittedAt,
            approvedAt = report.ApprovedAt,
            approvedByUserId = report.ApprovedByUserId,
        };

    [HttpPatch("{id}/feedback")]
    public async Task<IActionResult> UpdateFeedback(string id, [FromBody] RevisionBody body, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        if (user == null)
            return Unauthorized(new { message = "Not authenticated." });
        if (!await CanViewOrReviewAsync(user, cancellationToken))
            return Forbid();

        var report = await _db.TrainingReports.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report == null)
            return NotFound(new { message = "Report not found." });

        report.CoordinatorFeedback = string.IsNullOrWhiteSpace(body.Feedback) ? null : body.Feedback!.Trim();
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, feedback = report.CoordinatorFeedback });
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
            return null;
        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }
}
