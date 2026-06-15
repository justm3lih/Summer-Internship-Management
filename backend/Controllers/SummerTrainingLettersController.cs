using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;

namespace InternshipManagement.API.Controllers;

/// <summary>SWEN yazlık başvuru mektubu: öğrenci → danışman → koordinatör; onaydan sonra staj başvurusu mümkündür.</summary>
[ApiController]
[Route("api/summer-training-letters")]
public class SummerTrainingLettersController : ControllerBase
{
    private const string AuthCookieName = "internship_auth_user_id";
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly NotificationService _notificationService;
    private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

    public SummerTrainingLettersController(
        AppDbContext db,
        IConfiguration config,
        NotificationService notificationService,
        ICoordinatorPortalRoleService coordinatorPortalRoles)
    {
        _db = db;
        _config = config;
        _notificationService = notificationService;
        _coordinatorPortalRoles = coordinatorPortalRoles;
    }

    private string PeriodKey =>
        (_config["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();

    private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
            return null;

        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    /// <summary>Şablondaki sabit müfredat (öğrenci bu satırların REGISTERED / GRADE hücrelerini doldurur).</summary>
    [HttpGet("curriculum")]
    public IActionResult GetCurriculum()
    {
        var rows = SummerTrainingCurriculum.DefaultRows.Select(r => new { code = r.Code, name = r.Name });
        return Ok(rows);
    }

    /// <summary>Koordinatör: öğrenciye atanacak danışman seçenekleri (Role=advisor).</summary>
    [HttpGet("advisors")]
    public async Task<IActionResult> ListAdvisors(CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            return Forbid();

        if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
            return Forbid();

        var advisors = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "advisor")
            .OrderBy(u => u.Name)
            .Select(u => new { id = u.Id, name = u.Name, email = u.Email })
            .ToListAsync(cancellationToken);

        return Ok(advisors);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetOrCreateMine(CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (currentUser.Role != "student")
            return Forbid();

        var letter = await _db.SummerTrainingApplicationLetters
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .FirstOrDefaultAsync(
                l => l.StudentId == currentUser.Id && l.AcademicPeriodKey == PeriodKey,
                cancellationToken);

        if (letter == null)
        {
            letter = new SummerTrainingApplicationLetter
            {
                StudentId = currentUser.Id,
                AcademicPeriodKey = PeriodKey,
                Status = SummerTrainingLetterStatuses.Draft,
                CourseRowsJson = SummerTrainingCurriculum.DefaultCourseRowsJson(),
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow,
            };

            _db.SummerTrainingApplicationLetters.Add(letter);
            await _db.SaveChangesAsync(cancellationToken);
            await _db.Entry(letter).Reference(l => l.Student).LoadAsync(cancellationToken);
            if (letter.Student != null)
                await _db.Entry(letter.Student).Reference(s => s.AdvisorUser).LoadAsync(cancellationToken);
        }

        return Ok(ToResponse(letter));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> PatchStudentLetter(
        string id,
        [FromBody] PatchSummerLetterCoursesRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (currentUser.Role != "student")
            return Forbid();

        var letter = await _db.SummerTrainingApplicationLetters
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .FirstOrDefaultAsync(l => l.Id == id && l.StudentId == currentUser.Id, cancellationToken);

        if (letter == null)
            return NotFound(new { message = "Letter not found." });

        if (letter.Status == SummerTrainingLetterStatuses.Approved)
            return BadRequest(new { message = "This letter is already approved." });

        if (letter.AcademicPeriodKey != PeriodKey)
            return BadRequest(new { message = "Letter is for another academic period." });

        if (!IsStudentEditableStatus(letter.Status))
            return BadRequest(new { message = "Letter is currently under review." });

        if (request.CourseRows == null)
            return BadRequest(new { message = "courseRows is required." });

        if (!TrySerializeCourseRows(request.CourseRows, out var json, out var err))
            return BadRequest(new { message = err });

        letter.CourseRowsJson = json;
        letter.UpdatedUtc = DateTime.UtcNow;

        var parsedRows = DeserializeRows(json).ToList();
        if (letter.Student != null && ThirdYearEligibilityEvaluator.AllGradesFilled(parsedRows))
        {
            var threshold = await GetRequiredCourseThresholdAsync(cancellationToken);
            var prevEligibility = letter.Student.EligibilityStatus;

            ThirdYearEligibilityEvaluator.ApplyToStudent(letter.Student, parsedRows, threshold);
            await _db.SaveChangesAsync(cancellationToken);

            await NotifyTranscriptEligibilityFromSummerLetterAsync(
                letter.Student,
                prevEligibility,
                cancellationToken);
        }
        else
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(ToResponse(letter));
    }

    [HttpPost("{id}/submit-to-advisor")]
    public async Task<IActionResult> SubmitToAdvisor(
        string id,
        [FromBody] SubmitSummerLetterRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (currentUser.Role != "student")
            return Forbid();

        if (request.AcceptElectronicTerms != true)
            return BadRequest(new { message = "You must accept the electronic terms agreement." });

        var letter = await _db.SummerTrainingApplicationLetters
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .FirstOrDefaultAsync(l => l.Id == id && l.StudentId == currentUser.Id, cancellationToken);

        if (letter == null)
            return NotFound(new { message = "Letter not found." });

        if (letter.AcademicPeriodKey != PeriodKey)
            return BadRequest(new { message = "Letter is for another academic period." });

        if (letter.Status == SummerTrainingLetterStatuses.Approved)
            return BadRequest(new { message = "Letter is already approved." });

        if (!IsStudentEditableStatus(letter.Status))
            return BadRequest(new { message = "Letter cannot be submitted in its current status." });

        if (string.IsNullOrWhiteSpace(letter.Student?.AdvisorUserId))
            return BadRequest(new
            {
                message = "No academic advisor is assigned to your profile yet. Ask the coordinator to assign an advisor.",
            });

        letter.Status = SummerTrainingLetterStatuses.AdvisorPending;
        letter.SubmittedToAdvisorAt = DateTime.UtcNow;
        letter.StudentElectronicAcceptanceAt = DateTime.UtcNow;
        letter.AdvisorComments = null;
        letter.UpdatedUtc = DateTime.UtcNow;
        letter.AdvisorRejectedAt = null;
        letter.CoordinatorRejectedAt = null;
        letter.CoordinatorComments = null;

        await _db.SaveChangesAsync(cancellationToken);

        await _notificationService.CreateNotificationAsync(
            letter.Student!.AdvisorUserId!,
            "Summer training application letter",
            $"{letter.Student.Name} submitted a summer training application letter for your review.",
            "info",
            "summer-letter",
            letter.Id,
            cancellationToken);

        return Ok(ToResponse(letter));
    }

    /// <summary>Danışman: beklemedeki mektup listesi.</summary>
    [HttpGet("advisor/pending")]
    public async Task<IActionResult> GetAdvisorPending(CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (currentUser.Role != "advisor")
            return Forbid();

        var letters = await _db.SummerTrainingApplicationLetters.AsNoTracking()
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .Where(l =>
                l.Status == SummerTrainingLetterStatuses.AdvisorPending &&
                l.Student!.AdvisorUserId == currentUser.Id &&
                l.AcademicPeriodKey == PeriodKey)
            .OrderByDescending(l => l.SubmittedToAdvisorAt)
            .ToListAsync(cancellationToken);

        return Ok(letters.Select(ToQueueSummary));
    }

    [HttpPatch("{id}/advisor-review")]
    public async Task<IActionResult> AdvisorReview(
        string id,
        [FromBody] SummerLetterApproveRejectRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (currentUser.Role != "advisor")
            return Forbid();

        var letter = await _db.SummerTrainingApplicationLetters
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (letter == null)
            return NotFound(new { message = "Letter not found." });

        if (letter.Student?.AdvisorUserId != currentUser.Id || letter.Status != SummerTrainingLetterStatuses.AdvisorPending)
            return BadRequest(new { message = "This letter is not awaiting your approval." });

        if (letter.AcademicPeriodKey != PeriodKey)
            return BadRequest(new { message = "Letter period does not match the active summer training period." });

        letter.UpdatedUtc = DateTime.UtcNow;
        letter.AdvisorComments = string.IsNullOrWhiteSpace(request.Comments) ? null : request.Comments.Trim();

        if (!request.Approve.HasValue)
            return BadRequest(new { message = "approve must be true or false." });

        letter.UpdatedUtc = DateTime.UtcNow;
        letter.AdvisorComments = string.IsNullOrWhiteSpace(request.Comments) ? null : request.Comments.Trim();

        if (request.Approve == true)
        {
            letter.Status = SummerTrainingLetterStatuses.CoordinatorPending;
            letter.AdvisorApprovedAt = DateTime.UtcNow;
            letter.AdvisorRejectedAt = null;
        }
        else
        {
            letter.Status = SummerTrainingLetterStatuses.AdvisorRejected;
            letter.AdvisorRejectedAt = DateTime.UtcNow;
            letter.AdvisorApprovedAt = null;
            letter.SubmittedToAdvisorAt = null;
            letter.StudentElectronicAcceptanceAt = null;
        }

        await _db.SaveChangesAsync(cancellationToken);

        if (letter.Student != null && request.Approve == true)
            await NotifyCoordinatorsAboutLetterAsync(
                $"{letter.Student.Name} submitted their summer training application letter (advisor-approved) for coordinator review.",
                letter.Id,
                cancellationToken);

        if (letter.Student != null)
            await _notificationService.CreateNotificationAsync(
                letter.StudentId,
                request.Approve == true
                    ? "Advisor approved your letter"
                    : "Advisor rejected your letter",
                request.Approve == true
                    ? "Your advisor approved your summer training application letter; it has been forwarded to the coordinator."
                    : string.IsNullOrWhiteSpace(request.Comments)
                        ? "Your advisor rejected your summer training letter. You may update it and resubmit."
                        : $"Your advisor commented: {request.Comments.Trim()}",
                request.Approve == true ? "success" : "warning",
                "summer-letter",
                letter.Id,
                cancellationToken);

        return Ok(ToResponse(letter));
    }

    /// <summary>Koordinatör: danışmandan sonra beklemede.</summary>
    [HttpGet("coordinator/pending")]
    public async Task<IActionResult> GetCoordinatorPending(CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            return Forbid();

        if (!Permissions.Has(currentUser, Permissions.CoordSummerTrainingLettersReview))
            return Forbid();

        var letters = await _db.SummerTrainingApplicationLetters.AsNoTracking()
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .Where(l =>
                l.Status == SummerTrainingLetterStatuses.CoordinatorPending &&
                l.AcademicPeriodKey == PeriodKey)
            .OrderByDescending(l => l.AdvisorApprovedAt)
            .ToListAsync(cancellationToken);

        return Ok(letters.Select(ToQueueSummary));
    }

    [HttpPatch("{id}/coordinator-review")]
    public async Task<IActionResult> CoordinatorReview(
        string id,
        [FromBody] SummerLetterApproveRejectRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        if (currentUser == null)
            return Unauthorized(new { message = "Not authenticated." });

        if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            return Forbid();

        if (!Permissions.Has(currentUser, Permissions.CoordSummerTrainingLettersReview))
            return Forbid();

        var letter = await _db.SummerTrainingApplicationLetters
            .Include(l => l.Student!)
                .ThenInclude(s => s!.AdvisorUser)
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (letter == null)
            return NotFound(new { message = "Letter not found." });

        if (letter.Status != SummerTrainingLetterStatuses.CoordinatorPending)
            return BadRequest(new { message = "This letter is not awaiting coordinator approval." });

        if (letter.AcademicPeriodKey != PeriodKey)
            return BadRequest(new { message = "Letter period does not match the active summer training period." });

        if (!request.Approve.HasValue)
            return BadRequest(new { message = "approve must be true or false." });

        var ranSummerLetterEligibilitySync = false;
        string? prevEligibilityForSummerLetterNotify = null;

        letter.UpdatedUtc = DateTime.UtcNow;
        letter.CoordinatorComments = string.IsNullOrWhiteSpace(request.Comments) ? null : request.Comments.Trim();

        if (request.Approve == true)
        {
            letter.Status = SummerTrainingLetterStatuses.Approved;
            letter.CoordinatorApprovedAt = DateTime.UtcNow;
            letter.CoordinatorRejectedAt = null;
            letter.CoordinatorApproverName = NormalizeStaffDisplayName(currentUser.Name);

            // Öğrenci son kayıttan sonra uygunluk güncellenmemiş olabilir; onay anında tablodan yeniden hesapla.
            if (letter.Student != null)
            {
                var parsedRows = DeserializeRows(letter.CourseRowsJson).ToList();
                if (ThirdYearEligibilityEvaluator.AllGradesFilled(parsedRows))
                {
                    var threshold = await GetRequiredCourseThresholdAsync(cancellationToken);
                    prevEligibilityForSummerLetterNotify = letter.Student.EligibilityStatus;
                    ThirdYearEligibilityEvaluator.ApplyToStudent(letter.Student, parsedRows, threshold);
                    ranSummerLetterEligibilitySync = true;
                }
            }
        }
        else
        {
            letter.Status = SummerTrainingLetterStatuses.CoordinatorRejected;
            letter.CoordinatorRejectedAt = DateTime.UtcNow;
            letter.CoordinatorApprovedAt = null;
            letter.CoordinatorApproverName = null;
            letter.SubmittedToAdvisorAt = null;
            letter.AdvisorApprovedAt = null;
            letter.StudentElectronicAcceptanceAt = null;
        }

        await _db.SaveChangesAsync(cancellationToken);

        if (ranSummerLetterEligibilitySync && letter.Student != null)
        {
            await NotifyTranscriptEligibilityFromSummerLetterAsync(
                letter.Student,
                prevEligibilityForSummerLetterNotify,
                cancellationToken);
        }

        if (letter.Student != null)
            await _notificationService.CreateNotificationAsync(
                letter.StudentId,
                request.Approve == true
                    ? "Coordinator approved your letter"
                    : "Coordinator rejected your letter",
                request.Approve == true
                    ? "You may now apply for internship placement."
                    : string.IsNullOrWhiteSpace(request.Comments)
                        ? "Your summer training letter was rejected by the coordinator. Update it with your advisor and resubmit."
                        : $"Coordinator comment: {request.Comments.Trim()}",
                request.Approve == true ? "success" : "warning",
                "summer-letter",
                letter.Id,
                cancellationToken);

        return Ok(ToResponse(letter));
    }

    internal static async Task<bool> StudentHasApprovedLetterForPeriodAsync(
        AppDbContext db,
        string studentId,
        string periodKey,
        CancellationToken cancellationToken)
        => await db.SummerTrainingApplicationLetters.AsNoTracking()
            .AnyAsync(l =>
                    l.StudentId == studentId &&
                    l.AcademicPeriodKey == periodKey.Trim() &&
                    l.Status == SummerTrainingLetterStatuses.Approved,
                cancellationToken);

    private async Task NotifyCoordinatorsAboutLetterAsync(
        string message,
        string letterId,
        CancellationToken cancellationToken)
    {
        await _notificationService.CreateNotificationsForRoleAsync(
            "coordinator",
            "Summer training application letter",
            message,
            "info",
            "summer-letter",
            letterId,
            cancellationToken);
    }

    private static string? NormalizeStaffDisplayName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var n = name.Trim();
        return n.Length > 256 ? n[..256] : n;
    }

    private static bool IsStudentEditableStatus(string status) =>
        status == SummerTrainingLetterStatuses.Draft ||
        status == SummerTrainingLetterStatuses.AdvisorRejected ||
        status == SummerTrainingLetterStatuses.CoordinatorRejected;

    private async Task<int> GetRequiredCourseThresholdAsync(CancellationToken cancellationToken)
    {
        var row = await _db.AppSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "eligibility.requiredCourses", cancellationToken);
        if (row?.Value != null && int.TryParse(row.Value.Trim(), out var n) && n > 0)
            return n;
        return 5;
    }

    /// <summary>Yaz staj mektubu ders tablosu tam ve kaydedilince UsersController ile aynı bildirim mantığı.</summary>
    private async Task NotifyTranscriptEligibilityFromSummerLetterAsync(
        User user,
        string? previousEligibilityStatus,
        CancellationToken cancellationToken)
    {
        var becameEligible =
            user.Role == "student" &&
            user.EligibilityStatus == "eligible" &&
            previousEligibilityStatus != "eligible";

        if (!becameEligible)
            return;

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

    private static bool TrySerializeCourseRows(IList<CourseRowInput> rows, out string json, out string? error)
    {
        json = "[]";
        error = null;
        if (rows.Count > 120)
        {
            error = "Too many courses.";
            return false;
        }

        var normalized = new List<SummerTrainingCurriculum.CourseRow>();
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.Code) || row.Code.Trim().Length > 32 ||
                string.IsNullOrWhiteSpace(row.Name) || row.Name.Trim().Length > 200)
            {
                error = "Each course must include a valid code (max 32) and name (max 200).";
                return false;
            }

            var rg = SummerTrainingCurriculum.NormalizeRegistered(row.Registered);
            var gd = row.Grade == null ? "" : row.Grade.Trim();
            if (rg.Length > 32 || gd.Length > 32)
            {
                error = "Registered and grade columns must not exceed 32 characters.";
                return false;
            }

            normalized.Add(new SummerTrainingCurriculum.CourseRow(
                row.Code.Trim(),
                row.Name.Trim(),
                rg,
                gd));
        }

        json = JsonSerializer.Serialize(normalized, JsonOptions);
        return true;
    }

    private static IReadOnlyList<SummerTrainingCurriculum.CourseRow> DeserializeRows(string json)
    {
        try
        {
            var rows = JsonSerializer.Deserialize<List<SummerTrainingCurriculum.CourseRow>>(json, JsonOptions)
                       ?? SummerTrainingCurriculum.DefaultRows.ToList();
            return rows.Select(SummerTrainingCurriculum.WithNormalizedRegistered).ToList();
        }
        catch
        {
            return SummerTrainingCurriculum.DefaultRows.ToList();
        }
    }

    private object ToResponse(SummerTrainingApplicationLetter letter)
    {
        var student = letter.Student;
        return new
        {
            id = letter.Id,
            academicPeriodKey = letter.AcademicPeriodKey,
            status = letter.Status,
            studentId = letter.StudentId,
            advisorUserId = student?.AdvisorUserId,
            advisorName = student?.AdvisorUser?.Name,
            submittedToAdvisorAt = letter.SubmittedToAdvisorAt,
            studentElectronicAcceptanceAt = letter.StudentElectronicAcceptanceAt,
            advisorApprovedAt = letter.AdvisorApprovedAt,
            advisorRejectedAt = letter.AdvisorRejectedAt,
            advisorComments = letter.AdvisorComments,
            coordinatorApprovedAt = letter.CoordinatorApprovedAt,
            coordinatorRejectedAt = letter.CoordinatorRejectedAt,
            coordinatorComments = letter.CoordinatorComments,
            coordinatorApproverName = letter.CoordinatorApproverName,
            courseRows = DeserializeRows(letter.CourseRowsJson),
            updatedUtc = letter.UpdatedUtc,
        };
    }

    /// <summary>Danışman/koordinatör kuyruğu: öğrenci özeti + mektuptaki ders tablosu (inceleme için).</summary>
    private static object ToQueueSummary(SummerTrainingApplicationLetter letter)
    {
        var s = letter.Student;
        return new
        {
            id = letter.Id,
            status = letter.Status,
            submittedToAdvisorAt = letter.SubmittedToAdvisorAt,
            advisorApprovedAt = letter.AdvisorApprovedAt,
            courseRows = DeserializeRows(letter.CourseRowsJson),
            student = s == null
                ? null
                : new
                {
                    id = s.Id,
                    name = s.Name,
                    email = s.Email,
                    studentId = s.StudentId,
                    department = s.Department,
                    currentSemester = s.CurrentSemester,
                    cgpa = s.Cgpa,
                    advisorName = s.AdvisorUser?.Name,
                },
        };
    }

}

public sealed class PatchSummerLetterCoursesRequest
{
    public List<CourseRowInput>? CourseRows { get; set; }
}

public sealed class CourseRowInput
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Registered { get; set; }
    public string? Grade { get; set; }
}

public sealed class SubmitSummerLetterRequest
{
    public bool? AcceptElectronicTerms { get; set; }
}

public sealed class SummerLetterApproveRejectRequest
{
    public bool? Approve { get; set; }
    public string? Comments { get; set; }
}
