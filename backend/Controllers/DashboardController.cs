using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using Microsoft.Extensions.Configuration;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;
        private readonly IConfiguration _configuration;

        public DashboardController(
            AppDbContext db,
            ICoordinatorPortalRoleService coordinatorPortalRoles,
            IConfiguration configuration)
        {
            _db = db;
            _coordinatorPortalRoles = coordinatorPortalRoles;
            _configuration = configuration;
        }

        // Admin dashboard sistem özetini döndür
        [HttpGet("admin")]
        public async Task<IActionResult> GetAdminDashboard(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "admin")
                return Forbid();

            var totalUsers = await _db.Users.CountAsync(cancellationToken);
            var approvedCompanies = await _db.Companies.CountAsync(company => company.Approved, cancellationToken);
            var pendingApplications = await _db.Applications.CountAsync(application => application.Status == "pending", cancellationToken);
            var activeInternships = await _db.Applications.CountAsync(
                application => application.Status == "approved" || application.Status == "ongoing",
                cancellationToken);

            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var eligibilityScans = await _db.Users.CountAsync(
                user => user.TranscriptVerifiedAt.HasValue && user.TranscriptVerifiedAt.Value >= monthStart,
                cancellationToken);

            return Ok(new
            {
                totalUsers,
                eligibilityScans,
                approvedCompanies,
                activeInternships,
                pendingApplications
            });
        }

        // Coordinator dashboard özet sayaçlarını döndür
        [HttpGet("coordinator")]
        public async Task<IActionResult> GetCoordinatorDashboard(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            var students = await _db.Users
                .AsNoTracking()
                .Where(user => user.Role == "student")
                .Include(user => user.Applications!)
                .ToListAsync(cancellationToken);

            var pendingApplications = students
                .SelectMany(student => student.Applications ?? [])
                .Count(application => application.Status == "pending");

            var eligibleStudents = students.Count(student => student.EligibilityStatus == "eligible");
            var eligibleNotApplied = students.Count(student =>
                student.EligibilityStatus == "eligible" &&
                !(student.Applications?.Any() ?? false));

            var latestStatuses = students
                .Select(student => student.Applications?
                    .OrderByDescending(application => application.AppliedDate)
                    .FirstOrDefault()
                    ?.Status)
                .ToList();

            var ongoingInternships = latestStatuses.Count(status => status == "ongoing" || status == "approved");
            var completedInternships = latestStatuses.Count(status => status == "completed");

            return Ok(new
            {
                pendingApplications,
                eligibleNotApplied,
                ongoingInternships,
                completedInternships,
                eligibleStudents,
                totalUpperYearStudents = students.Count
            });
        }

        // Öğrenci dashboard özeti sayaçlarını döndür
        [HttpGet("student")]
        public async Task<IActionResult> GetStudentDashboard(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == currentUser.Id, cancellationToken);

            if (user == null)
                return NotFound(new { message = "User not found." });

            var applications = await _db.Applications
                .AsNoTracking()
                .Where(application => application.StudentId == user.Id)
                .Include(application => application.Company)
                .OrderByDescending(application => application.AppliedDate)
                .ToListAsync(cancellationToken);

            var logbookEntries = await _db.LogbookEntries
                .AsNoTracking()
                .Where(entry => entry.StudentId == user.Id)
                .OrderByDescending(entry => entry.Date)
                .ToListAsync(cancellationToken);


            // Liste zaten AppliedDate azalan; TrainingReportsController ile aynı “aktif yerleşim” kuralı (büyük/küçük harf duyarsız).
            var placementAnchor = StudentPlacementAnchor.ResolvePlacementAnchor(applications);

            var internshipStatus = placementAnchor != null
                ? StudentPlacementAnchor.CanonicalApplicationStatus(placementAnchor.Status)
                : "not_applied";

            var periodKey = (_configuration["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();
            var summerLetter = await _db.SummerTrainingApplicationLetters.AsNoTracking()
                .FirstOrDefaultAsync(
                    l => l.StudentId == user.Id && l.AcademicPeriodKey == periodKey,
                    cancellationToken);

            object? placementSummary = null;
            if (placementAnchor != null)
            {
                var supervisorMapIds = applications
                    .Where(a => !string.IsNullOrWhiteSpace(a.CompanySupervisorUserId))
                    .Select(a => a.CompanySupervisorUserId!)
                    .Distinct()
                    .ToList();
                var supervisorNames = supervisorMapIds.Count == 0
                    ? new Dictionary<string, string>()
                    : await _db.Users.AsNoTracking()
                        .Where(u => supervisorMapIds.Contains(u.Id))
                        .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);

                string? supervisorNm = null;
                if (!string.IsNullOrWhiteSpace(placementAnchor.CompanySupervisorUserId) &&
                    supervisorNames.TryGetValue(placementAnchor.CompanySupervisorUserId!, out var nm))
                    supervisorNm = nm;

                placementSummary = new
                {
                    applicationId = placementAnchor.Id,
                    status = StudentPlacementAnchor.CanonicalApplicationStatus(placementAnchor.Status),
                    companyName = placementAnchor.Company?.Name,
                    companySupervisorAssigned = !string.IsNullOrWhiteSpace(placementAnchor.CompanySupervisorUserId),
                    companySupervisorName = supervisorNm,
                    acceptanceLetterVerified = applications.Any(static a =>
                        StudentPlacementAnchor.IsActivePlacementStatus(a.Status) &&
                        a.AcceptanceLetterVerifiedAt.HasValue),
                    internshipDatesSet = placementAnchor.InternshipStartDate.HasValue &&
                                          placementAnchor.InternshipEndDate.HasValue,
                    coordinatorPlacementApprovedAt = placementAnchor.CoordinatorPlacementApprovedAt,
                    companyPlacementApprovedAt = placementAnchor.CompanyPlacementApprovedAt,
                    logbookSubmittedForCoordinatorReviewAt = placementAnchor.LogbookSubmittedForCoordinatorReviewAt,
                };
            }

            var completedForReport = StudentPlacementAnchor.ResolveCompletedApplicationForTrainingReport(applications);
            var trainingReportEligible = completedForReport != null;
            var summerTrainingReportSubmitted = false;
            var reportsCount = 0;
            if (completedForReport != null)
            {
                var tr = await _db.TrainingReports.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.ApplicationId == completedForReport.Id, cancellationToken);
                if (tr != null)
                {
                    summerTrainingReportSubmitted = 
                        string.Equals(tr.Status, "submitted", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(tr.Status, "approved", StringComparison.OrdinalIgnoreCase);
                    
                    if (tr.SubmittedAt.HasValue)
                    {
                        reportsCount = 1;
                    }
                }
            }

            return Ok(new
            {
                user = new
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
                },
                summerTrainingLetterStatus = summerLetter?.Status,
                placementSummary,
                internshipStatus,
                trainingReportEligible,
                summerTrainingReportSubmitted,
                applicationsCount = applications.Count,
                logbookEntriesCount = logbookEntries.Count,
                reportsCount = reportsCount,
                debugInfo = applications.Select(a => new {
                    id = a.Id,
                    status = a.Status,
                    verifiedAt = a.LogbookVerifiedByCoordinatorAt,
                    submittedToCoordAt = a.LogbookSubmittedForCoordinatorReviewAt,
                    appliedDate = a.AppliedDate
                }).ToList()
            });
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
        }
    }
}
