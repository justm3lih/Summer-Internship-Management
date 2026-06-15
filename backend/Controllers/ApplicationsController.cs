using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;
using Microsoft.Extensions.Configuration;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationsController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";
        private readonly AppDbContext _db;
        private readonly NotificationService _notificationService;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;
        private readonly IConfiguration _configuration;

        public ApplicationsController(
            AppDbContext db,
            NotificationService notificationService,
            ICoordinatorPortalRoleService coordinatorPortalRoles,
            IConfiguration configuration)
        {
            _db = db;
            _notificationService = notificationService;
            _coordinatorPortalRoles = coordinatorPortalRoles;
            _configuration = configuration;
        }

        /// <summary>
        /// PATCH gövdesinde null = değiştirme; boş string veya anlamlı metin = güncelle (boş → DB null).
        /// </summary>
        private static void ApplyPlacementWordExportOptionalStrings(
            Application application,
            string? traineeJobTitle,
            string? supervisorTitle,
            string? traineeDepartmentOrDivision,
            string? supervisorDepartmentOrDivision,
            string? supervisorSpecialty,
            string? supervisorAcademicDegrees,
            string? supervisorGraduatedUniversity,
            string? supervisorGraduationYear,
            string? supervisorYearsInCompany,
            string? supervisorYearsExperience)
        {
            void Set(string? incoming, Action<string?> assign)
            {
                if (incoming == null) return;
                assign(string.IsNullOrWhiteSpace(incoming) ? null : incoming.Trim());
            }

            Set(traineeJobTitle, v => application.TraineeJobTitle = v);
            Set(supervisorTitle, v => application.SupervisorTitle = v);
            Set(traineeDepartmentOrDivision, v => application.TraineeDepartmentOrDivision = v);
            Set(supervisorDepartmentOrDivision, v => application.SupervisorDepartmentOrDivision = v);
            Set(supervisorSpecialty, v => application.SupervisorSpecialty = v);
            Set(supervisorAcademicDegrees, v => application.SupervisorAcademicDegrees = v);
            Set(supervisorGraduatedUniversity, v => application.SupervisorGraduatedUniversity = v);
            Set(supervisorGraduationYear, v => application.SupervisorGraduationYear = v);
            Set(supervisorYearsInCompany, v => application.SupervisorYearsInCompany = v);
            Set(supervisorYearsExperience, v => application.SupervisorYearsExperience = v);
        }

        private static bool TryNormalizeApplicationLongBody(
            string incoming,
            string fieldDisplayName,
            int maxChars,
            out string? normalized,
            out string? errorMessage)
        {
            normalized = null;
            errorMessage = null;

            var n = incoming.ReplaceLineEndings("\n").TrimEnd();
            while (n.Contains("\n\n\n", StringComparison.Ordinal))
                n = n.Replace("\n\n\n", "\n\n", StringComparison.Ordinal);
            if (n.Length > maxChars)
            {
                errorMessage = $"{fieldDisplayName} must be at most {maxChars} characters.";
                return false;
            }

            normalized = string.IsNullOrWhiteSpace(n) ? null : n.TrimStart();
            return true;
        }

        private static bool TryApplySupervisorLogbookClosingNarratives(
            Application application,
            string? overallObservations,
            string? suggestionsToUniversity,
            out string? errorMessage)
        {
            errorMessage = null;
            if (overallObservations == null && suggestionsToUniversity == null)
                return true;

            if (overallObservations != null)
            {
                if (!TryNormalizeApplicationLongBody(
                        overallObservations,
                        "Supervisor overall performance observations",
                        8000,
                        out var oNorm,
                        out var e1))
                {
                    errorMessage = e1;
                    return false;
                }

                application.SupervisorOverallPerformanceObservations = oNorm;
            }

            if (suggestionsToUniversity != null)
            {
                if (!TryNormalizeApplicationLongBody(
                        suggestionsToUniversity,
                        "Supervisor suggestions to CIU about the trainee",
                        8000,
                        out var sNorm,
                        out var e2))
                {
                    errorMessage = e2;
                    return false;
                }

                application.SupervisorSuggestionsToUniversityAboutTrainee = sNorm;
            }

            return true;
        }

        private static bool TryApplySupervisorProgramOutcomeScores(
            Application application,
            IList<int?>? scores,
            out string? errorMessage)
        {
            errorMessage = null;
            if (scores == null)
                return true;

            if (scores.Count != 11)
            {
                errorMessage = "supervisorProgramOutcomeScores must contain exactly 11 entries (PO1–PO11).";
                return false;
            }

            if (scores.Any(static v => v.HasValue && (v.Value < 0 || v.Value > 4)))
            {
                errorMessage = "Each score must be between 0 and 4 inclusive, or null for not selected.";
                return false;
            }

            application.SupervisorEvalPo1 = scores[0];
            application.SupervisorEvalPo2 = scores[1];
            application.SupervisorEvalPo3 = scores[2];
            application.SupervisorEvalPo4 = scores[3];
            application.SupervisorEvalPo5 = scores[4];
            application.SupervisorEvalPo6 = scores[5];
            application.SupervisorEvalPo7 = scores[6];
            application.SupervisorEvalPo8 = scores[7];
            application.SupervisorEvalPo9 = scores[8];
            application.SupervisorEvalPo10 = scores[9];
            application.SupervisorEvalPo11 = scores[10];
            return true;
        }

        private static bool TryApplyTraineeSummerSelfEvaluationScores(
            Application application,
            IList<int?>? scores,
            out string? errorMessage)
        {
            errorMessage = null;
            if (scores == null)
            {
                errorMessage = "scores are required.";
                return false;
            }

            if (scores.Count != 12)
            {
                errorMessage = "scores must contain exactly 12 entries (summer training self-evaluation form).";
                return false;
            }

            if (scores.Any(static v => v.HasValue && (v.Value < 0 || v.Value > 4)))
            {
                errorMessage = "Each score must be between 0 and 4 inclusive, or null for not selected.";
                return false;
            }

            application.TraineeSummerSelfEval1 = scores[0];
            application.TraineeSummerSelfEval2 = scores[1];
            application.TraineeSummerSelfEval3 = scores[2];
            application.TraineeSummerSelfEval4 = scores[3];
            application.TraineeSummerSelfEval5 = scores[4];
            application.TraineeSummerSelfEval6 = scores[5];
            application.TraineeSummerSelfEval7 = scores[6];
            application.TraineeSummerSelfEval8 = scores[7];
            application.TraineeSummerSelfEval9 = scores[8];
            application.TraineeSummerSelfEval10 = scores[9];
            application.TraineeSummerSelfEval11 = scores[10];
            application.TraineeSummerSelfEval12 = scores[11];
            return true;
        }

        // Coordinator için tüm başvuruları öğrenci ve şirket bilgisiyle getir
        [HttpGet("coordinator")]
        public async Task<IActionResult> GetCoordinatorApplications(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CoordApplicationsView))
                return Forbid();

            var applications = await _db.Applications
                .AsNoTracking()
                .Include(a => a.Student)
                .Include(a => a.Company)
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync(cancellationToken);

            var supervisorMap = await BuildCompanySupervisorNameMapAsync(applications, cancellationToken);
            return Ok(applications.Select(a => ToApplicationResponse(a, supervisorMap)));
        }

        // Öğrencinin kendi başvurularını getir
        [HttpGet("my")]
        public async Task<IActionResult> GetMyApplications(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var applications = await _db.Applications
                .AsNoTracking()
                .Where(a => a.StudentId == currentUser.Id)
                .Include(a => a.Student)
                .Include(a => a.Company)
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync(cancellationToken);

            var supervisorMap = await BuildCompanySupervisorNameMapAsync(applications, cancellationToken);
            return Ok(applications.Select(a => ToApplicationResponse(a, supervisorMap)));
        }

        private sealed record AcceptancePortalGateResult(Application? Application, IActionResult? Error);

        private async Task<AcceptancePortalGateResult> TryGetStudentPlacementForAcceptancePortalAsync(
            string studentId,
            CancellationToken cancellationToken)
        {
            var summerPeriodKey = (_configuration["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();
            if (!await SummerTrainingLettersController.StudentHasApprovedLetterForPeriodAsync(
                    _db,
                    studentId,
                    summerPeriodKey,
                    cancellationToken))
            {
                return new AcceptancePortalGateResult(null,
                    BadRequest(new
                    {
                        message =
                            "Acceptance letter portal unlocks after your application letter is approved by your advisor and the internship coordinator."
                    }));
            }

            var application = await _db.Applications.AsNoTracking()
                .Where(a => a.StudentId == studentId &&
                            (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"))
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null)
            {
                return new AcceptancePortalGateResult(null,
                    BadRequest(new { message = "An approved internship placement is required." }));
            }

            return new AcceptancePortalGateResult(application, null);
        }

        /// <summary>Öğrenci: acceptance letter Word alanları için portaldaki kayıtlı değerler + birleşik önizleme.</summary>
        [HttpGet("my/acceptance-letter-portal")]
        public async Task<IActionResult> GetMyAcceptanceLetterPortal(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await TryGetStudentPlacementForAcceptancePortalAsync(currentUser.Id, cancellationToken);
            if (gate.Error != null)
                return gate.Error;

            var app = gate.Application!;
            var studentEntity = await _db.Users.AsNoTracking()
                .FirstAsync(u => u.Id == currentUser.Id, cancellationToken);

            Company? company = await _db.Companies.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == app.CompanyId, cancellationToken);

            User? supervisor = null;
            if (!string.IsNullOrWhiteSpace(app.CompanySupervisorUserId))
            {
                supervisor = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == app.CompanySupervisorUserId!, cancellationToken);
            }

            var values = LogbookWordTemplateValues.Build(
                studentEntity,
                company,
                app,
                supervisor,
                Array.Empty<LogbookEntry>());
            AcceptanceLetterPortalMerge.Apply(values, app.AcceptanceLetterPortalJson, app);

            var saved = AcceptanceLetterPortalMerge.DeserializePortal(app.AcceptanceLetterPortalJson);

            return Ok(new
            {
                applicationId = app.Id,
                effectivePreview = AcceptanceLetterPortalMerge.BuildPreviewStrings(values),
                savedOverrides = saved
            });
        }

        /// <summary>Öğrenci: acceptance letter portal formunu kaydeder (Word indirmesi bu JSON ile birleştirilir).</summary>
        [HttpPut("my/acceptance-letter-portal")]
        public async Task<IActionResult> PutMyAcceptanceLetterPortal(
            [FromBody] AcceptanceLetterPortalOverrides? body,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await TryGetStudentPlacementForAcceptancePortalAsync(currentUser.Id, cancellationToken);
            if (gate.Error != null)
                return gate.Error;

            if (!AcceptanceLetterPortalMerge.TryValidateForPut(body, out var verr))
                return BadRequest(new { message = verr });

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstAsync(
                    a => a.Id == gate.Application!.Id && a.StudentId == currentUser.Id,
                    cancellationToken);

            application.AcceptanceLetterPortalJson = AcceptanceLetterPortalMerge.SerializeForStorage(body);

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        // Şirket için kendisine gelen başvuruları getir
        [HttpGet("company")]
        public async Task<IActionResult> GetCompanyApplications(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CompanyApplicationsView))
                return Forbid();

            var company = await GetCurrentCompanyAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var applications = await CompanyPortalAccess.FilterApplicationsForCompanyUser(
                    _db.Applications.AsNoTracking(),
                    currentUser)
                .Include(a => a.Student)
                .Include(a => a.Company)
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync(cancellationToken);

            var supervisorMap = await BuildCompanySupervisorNameMapAsync(applications, cancellationToken);
            return Ok(applications.Select(a => ToApplicationResponse(a, supervisorMap)));
        }

        // Şirket dashboard özeti
        [HttpGet("company/dashboard")]
        public async Task<IActionResult> GetCompanyDashboard(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            var company = await GetCurrentCompanyAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var applications = await CompanyPortalAccess.FilterApplicationsForCompanyUser(
                    _db.Applications.AsNoTracking(),
                    currentUser)
                .ToListAsync(cancellationToken);

            var pendingCount = applications.Count(a => a.Status == "pending");
            var activeInternCount = applications.Count(a => a.Status == "approved" || a.Status == "ongoing");
            var completedCount = applications.Count(a => a.Status == "completed");

            var recentActivity = applications
                .OrderByDescending(a => a.AppliedDate)
                .Take(5)
                .Select(a => new
                {
                    id = a.Id,
                    title = a.Status == "pending" ? "New application received" : "Internship status updated",
                    message = $"Application status: {a.Status}",
                    appliedDate = a.AppliedDate
                });

            return Ok(new
            {
                assignedInterns = activeInternCount,
                pendingApplications = pendingCount,
                completedInternships = completedCount,
                recentActivity
            });
        }

        // Coordinator ekranı için öğrenci bazlı sade izleme özeti döndür
        [HttpGet("coordinator/monitoring")]
        public async Task<IActionResult> GetCoordinatorMonitoring(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
                return Forbid();

            var periodKey = (_configuration["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();
            var letterStatusByStudent = await _db.SummerTrainingApplicationLetters.AsNoTracking()
                .Where(l => l.AcademicPeriodKey == periodKey)
                .ToDictionaryAsync(l => l.StudentId, l => l.Status, cancellationToken);

            var students = await _db.Users
                .AsNoTracking()
                .Where(u => u.Role == "student")
                .Include(u => u.Applications!)
                    .ThenInclude(a => a.Company)
                .Include(u => u.Applications!)
                    .ThenInclude(a => a.TrainingReport)
                .Include(u => u.LogbookEntries)
                .OrderBy(u => u.Name)
                .ToListAsync(cancellationToken);

            var allMonitoringApps = students
                .SelectMany(s => s.Applications ?? Enumerable.Empty<Application>())
                .ToList();
            var supervisorMap = await BuildCompanySupervisorNameMapAsync(allMonitoringApps, cancellationToken);

            var monitoringRows = students.Select(student =>
            {
                var latestApplication = student.Applications?
                    .OrderByDescending(a => a.AppliedDate)
                    .FirstOrDefault();

                var appsList = student.Applications?.OrderByDescending(a => a.AppliedDate).ToList() ?? new List<Application>();
                var completedAppForReport = StudentPlacementAnchor.ResolveCompletedApplicationForTrainingReport(appsList);
                var reportStatus = completedAppForReport?.TrainingReport?.Status ?? "not_submitted";

                return new
                {
                    id = student.Id,
                    email = student.Email,
                    name = student.Name,
                    studentId = student.StudentId,
                    department = student.Department,
                    currentSemester = student.CurrentSemester,
                    eligibilityStatus = student.EligibilityStatus ?? "not_eligible",
                    internshipStatus = latestApplication?.Status ?? "not_applied",
                    logbookEntriesCount = student.LogbookEntries?.Count ?? 0,
                    reportStatus = reportStatus,
                    advisorUserId = student.AdvisorUserId,
                    summerTrainingLetterStatus = letterStatusByStudent.TryGetValue(student.Id, out var stLetter)
                        ? stLetter
                        : null,
                    latestApplication = latestApplication == null
                        ? null
                        : ToApplicationResponse(latestApplication, supervisorMap)
                };
            });

            return Ok(monitoringRows);
        }

        // Şirket için aktif stajyerleri ve temel izleme verisini getir
        [HttpGet("company/interns")]
        public async Task<IActionResult> GetCompanyInterns(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CompanyInternsView))
                return Forbid();

            var company = await GetCurrentCompanyAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var applications = await CompanyPortalAccess.FilterApplicationsForCompanyUser(
                    _db.Applications.AsNoTracking(),
                    currentUser)
                .Where(a => a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed")
                .Include(a => a.Student)
                    .ThenInclude(s => s!.LogbookEntries)
                .Include(a => a.TrainingReport)
                .Include(a => a.Company)
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync(cancellationToken);

            var supervisorIds = applications
                .Select(a => a.CompanySupervisorUserId)
                .OfType<string>()
                .Distinct()
                .ToList();
            var supervisorNames = await _db.Users.AsNoTracking()
                .Where(u => supervisorIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);

            var interns = applications.Select(application => new
            {
                id = application.Id,
                studentName = application.Student?.Name ?? "Unknown",
                studentId = application.Student?.StudentId ?? application.StudentId,
                startDate = application.AppliedDate,
                status = application.Status,
                logbookEntries = application.Student?.LogbookEntries?.Count ?? 0,
                reportSubmitted = application.TrainingReport?.SubmittedAt.HasValue ?? false,
                companySupervisorUserId = application.CompanySupervisorUserId,
                companySupervisorName = application.CompanySupervisorUserId != null &&
                                         supervisorNames.TryGetValue(application.CompanySupervisorUserId, out var sn)
                    ? sn
                    : null,
                application = ToApplicationResponse(application, supervisorNames)
            });

            return Ok(interns);
        }

        // Öğrenci yeni başvuru oluşturur
        [HttpPost]
        public async Task<IActionResult> CreateApplication(
            [FromBody] CreateApplicationRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var summerPeriodKey = (_configuration["SummerTraining:CurrentPeriodKey"] ?? "2026-summer").Trim();

            if (!await SummerTrainingLettersController.StudentHasApprovedLetterForPeriodAsync(
                    _db,
                    currentUser.Id,
                    summerPeriodKey,
                    cancellationToken))
            {
                return BadRequest(new
                {
                    message =
                        "Your summer training application letter must be approved by your advisor and the coordinator before you can apply."
                });
            }

            if (string.IsNullOrWhiteSpace(request.CompanyId) && request.ProposedCompany == null)
                return BadRequest(new { message = "Company selection or proposal is required." });

            Company? company;
            if (request.ProposedCompany != null)
            {
                if (string.IsNullOrWhiteSpace(request.ProposedCompany.Name))
                    return BadRequest(new { message = "Proposed company name is required." });

                // Check if name taken
                var exists = await _db.Companies.AnyAsync(c => c.Name.ToLower() == request.ProposedCompany.Name.Trim().ToLower(), cancellationToken);
                if (exists) return BadRequest(new { message = "A company with this name already exists." });

                company = new Company
                {
                    Name = request.ProposedCompany.Name.Trim(),
                    Sector = (request.ProposedCompany.Sector ?? "").Trim(),
                    Location = (request.ProposedCompany.Location ?? "").Trim(),
                    Description = (request.ProposedCompany.Description ?? "").Trim(),
                    Website = (request.ProposedCompany.Website ?? "").Trim(),
                    Approved = false,
                    PositionsOffered = 1 // Default 1 for the proposing student
                };
                _db.Companies.Add(company);
                // Save now to get ID
                await _db.SaveChangesAsync(cancellationToken);
            }
            else
            {
                company = await _db.Companies.FirstOrDefaultAsync(
                    c => c.Id == request.CompanyId && c.Approved,
                    cancellationToken);

                if (company == null)
                    return BadRequest(new { message = "Selected company could not be found or is not approved yet." });

                var activeStatuses = new[] { "approved", "ongoing", "completed" };
                var occupiedCount = await _db.Applications.CountAsync(
                    a => a.CompanyId == company.Id && activeStatuses.Contains(a.Status),
                    cancellationToken);

                if (occupiedCount >= company.PositionsOffered)
                {
                    return BadRequest(new { message = "This company's internship quota is full." });
                }
            }

            var hasActiveApplication = await _db.Applications.AnyAsync(
                a => a.StudentId == currentUser.Id &&
                     (a.Status == "pending" || a.Status == "approved" || a.Status == "ongoing"),
                cancellationToken);

            if (hasActiveApplication)
                return BadRequest(new { message = "You already have an active internship application." });

            if (string.IsNullOrWhiteSpace(request.CvFileId) ||
                string.IsNullOrWhiteSpace(request.MotivationLetterFileId) ||
                string.IsNullOrWhiteSpace(request.TranscriptFileId))
            {
                return BadRequest(new { message = "All application documents are required." });
            }

            var fileIds = new[] { request.CvFileId, request.MotivationLetterFileId, request.TranscriptFileId };
            var ownedFiles = await _db.UploadedFiles
                .Where(f => fileIds.Contains(f.Id) && f.OwnerId == currentUser.Id)
                .Select(f => f.Id)
                .ToListAsync(cancellationToken);

            if (ownedFiles.Count != 3)
                return BadRequest(new { message = "One or more uploaded documents could not be verified." });

            var application = new Application
            {
                StudentId = currentUser.Id,
                CompanyId = company.Id,
                Status = "pending",
                AppliedDate = DateTime.UtcNow,
                CvUrl = $"/api/files/{request.CvFileId}",
                MotivationLetterUrl = $"/api/files/{request.MotivationLetterFileId}",
                TranscriptUrl = $"/api/files/{request.TranscriptFileId}",

                // Mapping internship details (from integrated "Propose and Apply" flow)
                InternshipStartDate = string.IsNullOrWhiteSpace(request.InternshipStartDate) ? null : DateTime.Parse(request.InternshipStartDate).ToUniversalTime(),
                InternshipEndDate = string.IsNullOrWhiteSpace(request.InternshipEndDate) ? null : DateTime.Parse(request.InternshipEndDate).ToUniversalTime(),
                TraineeJobTitle = request.SupervisorTitle, // Approx mapping
                SupervisorTitle = request.SupervisorTitle,
                // We store supervisor name/email for coordinator review; user creation happens on approval
                AcceptanceLetterPortalJson = request.SupervisorName != null ? $"{{\"supervisorName\": \"{request.SupervisorName}\", \"supervisorEmail\": \"{request.SupervisorEmail}\"}}" : null
            };

            _db.Applications.Add(application);
            await _db.SaveChangesAsync(cancellationToken);

            await _db.Entry(application).Reference(a => a.Student).LoadAsync(cancellationToken);
            await _db.Entry(application).Reference(a => a.Company).LoadAsync(cancellationToken);

            await _notificationService.CreateNotificationAsync(
                currentUser.Id,
                "Application Submitted",
                $"Your application to {company.Name} was submitted successfully.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            await _notificationService.CreateNotificationsForRoleAsync(
                "coordinator",
                "New Application Received",
                $"{currentUser.Name} submitted an application to {company.Name}.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            await NotifyCompanyPortalUsersForApplicationAsync(
                company.Id,
                application.CompanySupervisorUserId,
                "New internship application",
                $"{currentUser.Name} applied for an internship at {company.Name}. Review documents in Applications.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            return StatusCode(201, await ToApplicationResponseAsync(application, cancellationToken));
        }

        // Öğrenci pending başvurusunu geri çeker
        [HttpPost("{id}/withdraw")]
        public async Task<IActionResult> WithdrawApplication(string id, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == currentUser.Id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (application.Status != "pending")
                return BadRequest(new { message = "Only pending applications can be withdrawn." });

            application.Status = "rejected";
            application.CoordinatorComments = string.IsNullOrWhiteSpace(application.CoordinatorComments)
                ? "Application withdrawn by the student."
                : application.CoordinatorComments;

            await _db.SaveChangesAsync(cancellationToken);

            var companyName = application.Company?.Name ?? "the company";

            await _notificationService.CreateNotificationAsync(
                currentUser.Id,
                "Application Withdrawn",
                $"You withdrew your application to {companyName}.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            await _notificationService.CreateNotificationsForRoleAsync(
                "coordinator",
                "Application Withdrawn",
                $"{currentUser.Name} withdrew their application to {companyName}.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            if (application.Company != null)
            {
                await NotifyCompanyPortalUsersForApplicationAsync(
                    application.Company.Id,
                    application.CompanySupervisorUserId,
                    "Application withdrawn",
                    $"{currentUser.Name} withdrew their application to {application.Company.Name}.",
                    "info",
                    "application",
                    application.Id,
                    cancellationToken);
            }

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        /// <summary>
        /// Öğrenci acceptance letter dosyası portala bağlanmıyor; imzalı belge fiziksel/ofis süreciyle yürür.
        /// Endpoint geriye dönük uyumluluk için kalır ve her zaman 403 döner.
        /// </summary>
        [HttpPatch("{id}/acceptance-letter")]
        public async Task<IActionResult> SubmitAcceptanceLetter(
            string id,
            [FromBody] SubmitAcceptanceLetterRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            return StatusCode(403, new
            {
                message =
                    "Summer acceptance letter portal uploads are disabled. Download the Word template from My Applications, sign it, and follow your department's instructions. The coordinator verifies your placement here after confirming the signed document."
            });
        }

        /// <summary>Koordinatör: acceptance letter doğrular veya doğrulamayı kaldırır.</summary>
        [HttpPatch("{id}/acceptance-letter-verification")]
        public async Task<IActionResult> VerifyAcceptanceLetter(
            string id,
            [FromBody] VerifyAcceptanceLetterRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CoordApplicationsReview))
                return Forbid();

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (string.IsNullOrWhiteSpace(application.AcceptanceLetterUrl) &&
                string.IsNullOrWhiteSpace(application.AcceptanceLetterPortalJson))
            {
                return BadRequest(new
                {
                    message =
                        "The student has not saved the acceptance letter portal form yet and no legacy upload is on record. Ask them to complete “Acceptance letter (portal)” or follow department procedures."
                });
            }

            if (!InternshipLogbookGate.PlacementStatusAllowsLogbook(application.Status))
                return BadRequest(new { message = "Placement is not active for acceptance verification." });

            application.AcceptanceLetterCoordinatorComments = string.IsNullOrWhiteSpace(request.CoordinatorComments)
                ? null
                : request.CoordinatorComments.Trim();

            application.AcceptanceLetterVerifiedAt = request.Verified ? DateTime.UtcNow : null;

            await _db.SaveChangesAsync(cancellationToken);

            if (application.Student != null)
            {
                await _notificationService.CreateNotificationAsync(
                    application.StudentId,
                    request.Verified ? "Acceptance letter verified" : "Acceptance letter verification cleared",
                    request.Verified
                        ? "The coordinator verified your summer acceptance letter. You can now use the daily logbook."
                        : string.IsNullOrWhiteSpace(application.AcceptanceLetterCoordinatorComments)
                            ? "The coordinator cleared verification on your acceptance letter. Follow department procedures for resubmitting the signed document if needed, or contact the office."
                            : $"Coordinator note: {application.AcceptanceLetterCoordinatorComments}",
                    request.Verified ? "success" : "warning",
                    "application",
                    application.Id,
                    cancellationToken);
            }

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        // Şirket başvuruyu onaylar/reddeder ve yorum ekler
        [HttpPatch("{id}/company-review")]
        public async Task<IActionResult> UpdateCompanyReview(
            string id,
            [FromBody] UpdateCompanyReviewRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (request.Status != null && !Permissions.Has(currentUser, Permissions.CompanyApplicationsReview))
                return Forbid();

            if (request.Status == null &&
                request.CompanyComments != null &&
                !Permissions.Has(currentUser, Permissions.CompanyApplicationsComment))
                return Forbid();

            var placementKeys =
                request.TraineeJobTitle != null || request.SupervisorTitle != null ||
                request.PatchInternshipDates ||
                request.TraineeDepartmentOrDivision != null ||
                request.SupervisorDepartmentOrDivision != null ||
                request.SupervisorSpecialty != null ||
                request.SupervisorAcademicDegrees != null ||
                request.SupervisorGraduatedUniversity != null ||
                request.SupervisorGraduationYear != null ||
                request.SupervisorYearsInCompany != null ||
                request.SupervisorYearsExperience != null ||
                request.SupervisorProgramOutcomeScores != null ||
                request.SupervisorOverallPerformanceObservations != null ||
                request.SupervisorSuggestionsToUniversityAboutTrainee != null;
            if (placementKeys &&
                !Permissions.Has(currentUser, Permissions.CompanyApplicationsReview) &&
                !Permissions.Has(currentUser, Permissions.CompanyApplicationsComment))
                return Forbid();

            var company = await GetCurrentCompanyAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            if (request.Status == null &&
                request.CompanyComments == null &&
                request.TraineeJobTitle == null &&
                request.SupervisorTitle == null &&
                request.TraineeDepartmentOrDivision == null &&
                request.SupervisorDepartmentOrDivision == null &&
                request.SupervisorSpecialty == null &&
                request.SupervisorAcademicDegrees == null &&
                request.SupervisorGraduatedUniversity == null &&
                request.SupervisorGraduationYear == null &&
                request.SupervisorYearsInCompany == null &&
                request.SupervisorYearsExperience == null &&
                request.SupervisorProgramOutcomeScores == null &&
                request.SupervisorOverallPerformanceObservations == null &&
                request.SupervisorSuggestionsToUniversityAboutTrainee == null &&
                !request.PatchInternshipDates)
                return BadRequest(new { message = "At least one field must be provided." });

            if (request.Status != null &&
                request.Status != "approved" &&
                request.Status != "rejected" &&
                request.Status != "ongoing" &&
                request.Status != "completed")
            {
                return BadRequest(new { message = "Only approved, rejected, ongoing or completed statuses are allowed." });
            }

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == company.Id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (!CompanyPortalAccess.CompanyUserCanAccessApplication(currentUser, application))
                return Forbid();

            if (request.Status != null)
            {
                var err = await TryApplyCompanyPlacementStatusAsync(application, request.Status, cancellationToken);
                if (err != null)
                    return BadRequest(new { message = err });
            }

            if (request.CompanyComments != null)
                application.CompanyComments = string.IsNullOrWhiteSpace(request.CompanyComments)
                    ? null
                    : request.CompanyComments.Trim();

            ApplyPlacementWordExportOptionalStrings(
                application,
                request.TraineeJobTitle,
                request.SupervisorTitle,
                request.TraineeDepartmentOrDivision,
                request.SupervisorDepartmentOrDivision,
                request.SupervisorSpecialty,
                request.SupervisorAcademicDegrees,
                request.SupervisorGraduatedUniversity,
                request.SupervisorGraduationYear,
                request.SupervisorYearsInCompany,
                request.SupervisorYearsExperience);

            if (request.PatchInternshipDates)
            {
                if (!InternshipDatePatchHelper.TryApplyPair(
                        application,
                        request.InternshipStartDate,
                        request.InternshipEndDate,
                        out var dateErr))
                    return BadRequest(new { message = dateErr });
            }

            if (request.SupervisorProgramOutcomeScores != null)
            {
                if (!application.LogbookSubmittedToSupervisorAt.HasValue)
                {
                    return BadRequest(new
                    {
                        message =
                            "Program outcome scores can only be saved after the student submits the logbook to the supervisor for evaluation."
                    });
                }

                if (!TryApplySupervisorProgramOutcomeScores(application, request.SupervisorProgramOutcomeScores, out var poErr))
                    return BadRequest(new { message = poErr });
            }

            if (request.SupervisorOverallPerformanceObservations != null ||
                request.SupervisorSuggestionsToUniversityAboutTrainee != null)
            {
                if (!application.LogbookSubmittedToSupervisorAt.HasValue)
                {
                    return BadRequest(new
                    {
                        message =
                            "Supervisor closing observations can only be saved after the student submits the logbook to the supervisor for evaluation."
                    });
                }

                if (!TryApplySupervisorLogbookClosingNarratives(
                        application,
                        request.SupervisorOverallPerformanceObservations,
                        request.SupervisorSuggestionsToUniversityAboutTrainee,
                        out var narErr))
                    return BadRequest(new { message = narErr });
            }

            await _db.SaveChangesAsync(cancellationToken);

            var notifyReview =
                request.Status != null || request.CompanyComments != null;

            if (notifyReview && application.StudentId != null)
            {
                var title = application.Status == "rejected"
                    ? "Company Rejected Your Application"
                    : "Company Reviewed Your Application";

                var message = !string.IsNullOrWhiteSpace(application.CompanyComments)
                    ? application.CompanyComments!
                    : request.Status == "approved" && application.Status == "pending"
                        ? "The company accepted your internship application. The university coordinator must still approve."
                        : $"Company updated your application status to {application.Status}.";

                await _notificationService.CreateNotificationAsync(
                    application.StudentId,
                    title,
                    message,
                    application.Status == "rejected" ? "warning" : "info",
                    "application",
                    application.Id,
                    cancellationToken);
            }

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        /// <summary>Ana şirket hesabı bir başvuruya şirket içi süpervizör (staff) kullanıcısı atar.</summary>
        [HttpPatch("{id}/company-supervisor")]
        public async Task<IActionResult> AssignCompanySupervisor(
            string id,
            [FromBody] AssignCompanySupervisorRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!CompanyPortalAccess.IsCompanyPrimary(currentUser))
                return Forbid();

            var company = await GetCurrentCompanyAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == company.Id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (string.IsNullOrWhiteSpace(request.CompanySupervisorUserId))
            {
                application.CompanySupervisorUserId = null;
            }
            else
            {
                var supervisorId = request.CompanySupervisorUserId.Trim();
                var target = await _db.Users.FirstOrDefaultAsync(u => u.Id == supervisorId, cancellationToken);
                if (target == null ||
                    target.Role != "company" ||
                    target.CompanyId != company.Id ||
                    !CompanyPortalAccess.IsCompanyStaff(target))
                {
                    return BadRequest(new
                    {
                        message = "Supervisor must be a staff account under your company."
                    });
                }

                application.CompanySupervisorUserId = target.Id;
            }

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        /// <summary>Öğrenci: Daily Work Log’daki “Trainee’s Job Details” serbest metni; koordinatöre gönderilene kadar düzenlenebilir.</summary>
        [HttpPatch("{id}/trainee-job-own-words")]
        public async Task<IActionResult> UpdateTraineeJobOwnWords(
            string id,
            [FromBody] TraineeJobOwnWordsPatchRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            if (request == null)
                return BadRequest(new { message = "Request body required." });

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == currentUser.Id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (application.Status != "ongoing" && application.Status != "completed")
            {
                return BadRequest(new
                {
                    message = "Job details can only be edited for an ongoing or completed internship."
                });
            }

            if (application.LogbookSubmittedForCoordinatorReviewAt.HasValue)
            {
                return BadRequest(new
                {
                    message = "Job details cannot be changed after the logbook is submitted for coordinator review."
                });
            }

            var normalized = (request.TraineeJobOwnWords ?? "").ReplaceLineEndings("\n").TrimEnd();
            while (normalized.Contains("\n\n\n", StringComparison.Ordinal))
                normalized = normalized.Replace("\n\n\n", "\n\n", StringComparison.Ordinal);
            if (normalized.Length > 8000)
                return BadRequest(new { message = "Text must be at most 8000 characters." });

            application.TraineeJobOwnWords = string.IsNullOrWhiteSpace(normalized) ? null : normalized.TrimStart();
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        /// <summary>Öğrenci: yaz staj öz-değerlendirme (logbook koordinatöre gönderildikten sonra, 12 madde 0–4).</summary>
        [HttpPatch("{id}/trainee-summer-self-evaluation")]
        public async Task<IActionResult> UpdateTraineeSummerSelfEvaluation(
            string id,
            [FromBody] TraineeSummerSelfEvaluationRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == currentUser.Id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (application.Status != "ongoing" && application.Status != "completed")
            {
                return BadRequest(new
                {
                    message = "Self-evaluation is only available for an ongoing or completed internship."
                });
            }

            // Supervisor evaluation must be completed before student can save their self-assessment
            if (!application.SupervisorEvaluationCompletedAt.HasValue)
            {
                return BadRequest(new
                {
                    message = "Your supervisor must complete their evaluation before you can fill out the self-assessment."
                });
            }

            if (application.LogbookVerifiedByCoordinatorAt.HasValue)
            {
                return BadRequest(new { message = "Logbook is already verified and locked." });
            }

            if (!TryApplyTraineeSummerSelfEvaluationScores(application, request.Scores, out var err))
                return BadRequest(new { message = err });

            await _db.SaveChangesAsync(cancellationToken);

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        // Coordinator başvurunun durumunu ve yorumunu günceller
        [HttpPatch("{id}/coordinator-review")]
        public async Task<IActionResult> UpdateCoordinatorReview(
            string id,
            [FromBody] UpdateCoordinatorReviewRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            if (request.Status != null && !Permissions.Has(currentUser, Permissions.CoordApplicationsReview))
                return Forbid();

            if (request.Status == null &&
                request.CoordinatorComments != null &&
                !Permissions.Has(currentUser, Permissions.CoordApplicationsComment))
                return Forbid();

            var placementKeys =
                request.TraineeJobTitle != null || request.SupervisorTitle != null ||
                request.PatchInternshipDates ||
                request.TraineeDepartmentOrDivision != null ||
                request.SupervisorDepartmentOrDivision != null ||
                request.SupervisorSpecialty != null ||
                request.SupervisorAcademicDegrees != null ||
                request.SupervisorGraduatedUniversity != null ||
                request.SupervisorGraduationYear != null ||
                request.SupervisorYearsInCompany != null ||
                request.SupervisorYearsExperience != null ||
                request.SupervisorProgramOutcomeScores != null ||
                request.SupervisorOverallPerformanceObservations != null ||
                request.SupervisorSuggestionsToUniversityAboutTrainee != null;
            if (placementKeys &&
                !Permissions.Has(currentUser, Permissions.CoordApplicationsReview) &&
                !Permissions.Has(currentUser, Permissions.CoordApplicationsComment))
                return Forbid();

            if (request.Status == null &&
                request.CoordinatorComments == null &&
                request.TraineeJobTitle == null &&
                request.SupervisorTitle == null &&
                request.TraineeDepartmentOrDivision == null &&
                request.SupervisorDepartmentOrDivision == null &&
                request.SupervisorSpecialty == null &&
                request.SupervisorAcademicDegrees == null &&
                request.SupervisorGraduatedUniversity == null &&
                request.SupervisorGraduationYear == null &&
                request.SupervisorYearsInCompany == null &&
                request.SupervisorYearsExperience == null &&
                request.SupervisorProgramOutcomeScores == null &&
                request.SupervisorOverallPerformanceObservations == null &&
                request.SupervisorSuggestionsToUniversityAboutTrainee == null &&
                !request.PatchInternshipDates)
                return BadRequest(new { message = "At least one field must be provided." });

            if (request.Status != null &&
                request.Status != "pending" &&
                request.Status != "approved" &&
                request.Status != "rejected")
            {
                return BadRequest(new { message = "Only pending, approved or rejected statuses are allowed." });
            }

            var application = await _db.Applications
                .Include(a => a.Student)
                .Include(a => a.Company)
                .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (request.Status != null)
            {
                var err = await ApplyCoordinatorPlacementStatusAsync(application, request.Status, cancellationToken);
                if (err != null)
                    return BadRequest(new { message = err });
            }

            if (request.CoordinatorComments != null)
                application.CoordinatorComments = string.IsNullOrWhiteSpace(request.CoordinatorComments)
                    ? null
                    : request.CoordinatorComments.Trim();

            ApplyPlacementWordExportOptionalStrings(
                application,
                request.TraineeJobTitle,
                request.SupervisorTitle,
                request.TraineeDepartmentOrDivision,
                request.SupervisorDepartmentOrDivision,
                request.SupervisorSpecialty,
                request.SupervisorAcademicDegrees,
                request.SupervisorGraduatedUniversity,
                request.SupervisorGraduationYear,
                request.SupervisorYearsInCompany,
                request.SupervisorYearsExperience);

            if (request.PatchInternshipDates)
            {
                if (!InternshipDatePatchHelper.TryApplyPair(
                        application,
                        request.InternshipStartDate,
                        request.InternshipEndDate,
                        out var dateErr))
                    return BadRequest(new { message = dateErr });
            }

            if (request.SupervisorProgramOutcomeScores != null)
            {
                if (!application.LogbookSubmittedToSupervisorAt.HasValue)
                {
                    return BadRequest(new
                    {
                        message =
                            "Program outcome scores can only be saved after the student submits the logbook to the supervisor for evaluation."
                    });
                }

                if (!TryApplySupervisorProgramOutcomeScores(application, request.SupervisorProgramOutcomeScores, out var poCoordErr))
                    return BadRequest(new { message = poCoordErr });
            }

            if (request.SupervisorOverallPerformanceObservations != null ||
                request.SupervisorSuggestionsToUniversityAboutTrainee != null)
            {
                if (!application.LogbookSubmittedToSupervisorAt.HasValue)
                {
                    return BadRequest(new
                    {
                        message =
                            "Supervisor closing observations can only be saved after the student submits the logbook to the supervisor for evaluation."
                    });
                }

                if (!TryApplySupervisorLogbookClosingNarratives(
                        application,
                        request.SupervisorOverallPerformanceObservations,
                        request.SupervisorSuggestionsToUniversityAboutTrainee,
                        out var narCoordErr))
                    return BadRequest(new { message = narCoordErr });
            }

            await _db.SaveChangesAsync(cancellationToken);

            var notifyReview =
                request.Status != null || request.CoordinatorComments != null;

            if (notifyReview && application.StudentId != null)
            {
                var title = application.Status == "rejected"
                    ? "Coordinator Rejected Your Application"
                    : "Coordinator Reviewed Your Application";

                var message = !string.IsNullOrWhiteSpace(application.CoordinatorComments)
                    ? application.CoordinatorComments!
                    : request.Status == "approved" && application.Status == "pending"
                        ? "Your internship coordinator approved the placement. The company must still confirm acceptance."
                        : $"Coordinator updated your application status to {application.Status}.";

                await _notificationService.CreateNotificationAsync(
                    application.StudentId,
                    title,
                    message,
                    application.Status == "rejected" ? "warning" : "success",
                    "application",
                    application.Id,
                    cancellationToken);
            }

            return Ok(await ToApplicationResponseAsync(application, cancellationToken));
        }

        /// <summary>
        /// Koordinatör ve şirket yerleşim onayı birbirinden bağımsız; Application.Status ancak ikisi de onayladığında approved olur.
        /// </summary>
        private async Task<string?> SyncDualPlacementApplicationStatusAsync(Application application, CancellationToken cancellationToken)
        {
            if (application.Status == "rejected" ||
                application.Status == "ongoing" ||
                application.Status == "completed")
                return null;

            if (application.CoordinatorPlacementApprovedAt.HasValue &&
                application.CompanyPlacementApprovedAt.HasValue)
            {
                // Check Quota
                var activeStatuses = new[] { "approved", "ongoing", "completed" };
                var occupiedCount = await _db.Applications.CountAsync(
                    a => a.CompanyId == application.CompanyId && activeStatuses.Contains(a.Status) && a.Id != application.Id,
                    cancellationToken);
                
                var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == application.CompanyId, cancellationToken);
                if (company != null && occupiedCount >= company.PositionsOffered)
                {
                    return "This company's internship quota is full. Placement cannot be approved.";
                }

                application.Status = "approved";
                application.AcceptanceLetterVerifiedAt ??= DateTime.UtcNow;
            }
            else
            {
                application.Status = "pending";
                application.AcceptanceLetterVerifiedAt = null;
            }
            return null;
        }

        private async Task<string?> ApplyCoordinatorPlacementStatusAsync(Application application, string status, CancellationToken cancellationToken)
        {
            switch (status)
            {
                case "approved":
                    application.CoordinatorPlacementApprovedAt = DateTime.UtcNow;
                    return await SyncDualPlacementApplicationStatusAsync(application, cancellationToken);
                case "pending":
                    application.CoordinatorPlacementApprovedAt = null;
                    return await SyncDualPlacementApplicationStatusAsync(application, cancellationToken);
                case "rejected":
                    application.Status = "rejected";
                    application.CoordinatorPlacementApprovedAt = null;
                    application.CompanyPlacementApprovedAt = null;
                    return null;
                default:
                    return "Unsupported status.";
            }
        }

        private async Task<string?> TryApplyCompanyPlacementStatusAsync(Application application, string status, CancellationToken cancellationToken)
        {
            switch (status)
            {
                case "approved":
                    application.CompanyPlacementApprovedAt = DateTime.UtcNow;
                    return await SyncDualPlacementApplicationStatusAsync(application, cancellationToken);
                case "rejected":
                    application.Status = "rejected";
                    application.CoordinatorPlacementApprovedAt = null;
                    application.CompanyPlacementApprovedAt = null;
                    return null;
                case "ongoing":
                    if (application.Status != "approved")
                    {
                        return "The internship can only be marked ongoing from an approved placement (coordinator + company).";
                    }
                    application.Status = "ongoing";
                    return null;
                case "completed":
                    if (application.Status != "approved" && application.Status != "ongoing")
                    {
                        return "The internship can only be marked completed from an approved or ongoing placement.";
                    }
                    application.Status = "completed";
                    return null;
                default:
                    return "Unsupported placement status.";
            }
        }


        /// <summary>Ana şirket portal hesapları ve atanmış süpervizöre aynı içerikli bildirim (yinelenmez).</summary>
        private async Task NotifyCompanyPortalUsersForApplicationAsync(
            string companyId,
            string? companySupervisorUserId,
            string title,
            string message,
            string type,
            string relatedEntityType,
            string relatedEntityId,
            CancellationToken cancellationToken)
        {
            var recipientIds = new HashSet<string>(StringComparer.Ordinal);

            var primaryIds = await _db.Users.AsNoTracking()
                .Where(u => u.Role == "company" &&
                            u.CompanyId == companyId &&
                            (u.CompanyMembershipTier == null ||
                             u.CompanyMembershipTier == CompanyPortalAccess.TierPrimary))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            foreach (var id in primaryIds)
                recipientIds.Add(id);

            if (!string.IsNullOrWhiteSpace(companySupervisorUserId))
                recipientIds.Add(companySupervisorUserId.Trim());

            foreach (var userId in recipientIds)
            {
                await _notificationService.CreateNotificationAsync(
                    userId,
                    title,
                    message,
                    type,
                    relatedEntityType,
                    relatedEntityId,
                    cancellationToken);
            }
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }

        private async Task<Company?> GetCurrentCompanyAsync(User currentUser, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(currentUser.CompanyId))
                return null;
            return await _db.Companies.FirstOrDefaultAsync(c => c.Id == currentUser.CompanyId, cancellationToken);
        }

        private async Task<Dictionary<string, string>> BuildCompanySupervisorNameMapAsync(
            IEnumerable<Application> applications,
            CancellationToken cancellationToken)
        {
            var ids = applications
                .Select(a => a.CompanySupervisorUserId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id!)
                .Distinct()
                .ToList();
            if (ids.Count == 0)
                return new Dictionary<string, string>();

            return await _db.Users.AsNoTracking()
                .Where(u => ids.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);
        }

        private async Task<object> ToApplicationResponseAsync(
            Application application,
            CancellationToken cancellationToken)
        {
            var map = await BuildCompanySupervisorNameMapAsync(new[] { application }, cancellationToken);
            return ToApplicationResponse(application, map);
        }

        private object ToApplicationResponse(
            Application application,
            IReadOnlyDictionary<string, string>? companySupervisorNames = null)
        {
            string? companySupervisorName = null;
            if (!string.IsNullOrWhiteSpace(application.CompanySupervisorUserId) &&
                companySupervisorNames != null &&
                companySupervisorNames.TryGetValue(application.CompanySupervisorUserId!, out var sn))
                companySupervisorName = sn;

            return new
            {
                id = application.Id,
                studentId = application.StudentId,
                companyId = application.CompanyId,
                companySupervisorUserId = application.CompanySupervisorUserId,
                companySupervisorName,
                traineeJobTitle = application.TraineeJobTitle,
                traineeJobOwnWords = application.TraineeJobOwnWords,
                supervisorTitle = application.SupervisorTitle,
                traineeDepartmentOrDivision = application.TraineeDepartmentOrDivision,
                supervisorDepartmentOrDivision = application.SupervisorDepartmentOrDivision,
                supervisorSpecialty = application.SupervisorSpecialty,
                supervisorAcademicDegrees = application.SupervisorAcademicDegrees,
                supervisorGraduatedUniversity = application.SupervisorGraduatedUniversity,
                supervisorGraduationYear = application.SupervisorGraduationYear,
                supervisorYearsInCompany = application.SupervisorYearsInCompany,
                supervisorYearsExperience = application.SupervisorYearsExperience,
                supervisorOverallPerformanceObservations =
                    application.SupervisorOverallPerformanceObservations,
                supervisorSuggestionsToUniversityAboutTrainee =
                    application.SupervisorSuggestionsToUniversityAboutTrainee,
                supervisorProgramOutcomeScores = new int?[]
                {
                    application.SupervisorEvalPo1,
                    application.SupervisorEvalPo2,
                    application.SupervisorEvalPo3,
                    application.SupervisorEvalPo4,
                    application.SupervisorEvalPo5,
                    application.SupervisorEvalPo6,
                    application.SupervisorEvalPo7,
                    application.SupervisorEvalPo8,
                    application.SupervisorEvalPo9,
                    application.SupervisorEvalPo10,
                    application.SupervisorEvalPo11
                },
                traineeSummerSelfEvaluationScores = new int?[]
                {
                    application.TraineeSummerSelfEval1,
                    application.TraineeSummerSelfEval2,
                    application.TraineeSummerSelfEval3,
                    application.TraineeSummerSelfEval4,
                    application.TraineeSummerSelfEval5,
                    application.TraineeSummerSelfEval6,
                    application.TraineeSummerSelfEval7,
                    application.TraineeSummerSelfEval8,
                    application.TraineeSummerSelfEval9,
                    application.TraineeSummerSelfEval10,
                    application.TraineeSummerSelfEval11,
                    application.TraineeSummerSelfEval12
                },
                internshipStartDate = application.InternshipStartDate,
                internshipEndDate = application.InternshipEndDate,
                logbookSubmittedToSupervisorAt = application.LogbookSubmittedToSupervisorAt,
                supervisorEvaluationCompletedAt = application.SupervisorEvaluationCompletedAt,
                logbookSubmittedForCoordinatorReviewAt = application.LogbookSubmittedForCoordinatorReviewAt,
                logbookVerifiedByCoordinatorAt = application.LogbookVerifiedByCoordinatorAt,
                acceptanceLetterUrl = application.AcceptanceLetterUrl,
                acceptanceLetterPortalSaved = !string.IsNullOrWhiteSpace(application.AcceptanceLetterPortalJson),
                acceptanceLetterSubmittedAt = application.AcceptanceLetterSubmittedAt,
                acceptanceLetterVerifiedAt = application.AcceptanceLetterVerifiedAt,
                acceptanceLetterCoordinatorComments = application.AcceptanceLetterCoordinatorComments,
                status = application.Status,
                appliedDate = application.AppliedDate,
                coordinatorPlacementApprovedAt = application.CoordinatorPlacementApprovedAt,
                companyPlacementApprovedAt = application.CompanyPlacementApprovedAt,
                coordinatorComments = application.CoordinatorComments,
                companyComments = application.CompanyComments,
                documents = new
                {
                    cv = application.CvUrl,
                    motivationLetter = application.MotivationLetterUrl,
                    transcript = application.TranscriptUrl
                },
                student = application.Student == null ? null : new
                {
                    id = application.Student.Id,
                    email = application.Student.Email,
                    name = application.Student.Name,
                    role = application.Student.Role,
                    studentId = application.Student.StudentId,
                    department = application.Student.Department,
                    currentSemester = application.Student.CurrentSemester,
                    cgpa = application.Student.Cgpa,
                    homeAddress = application.Student.HomeAddress,
                    homeTelephone = application.Student.HomeTelephone,
                    mobileTelephone = application.Student.MobileTelephone,
                    addressNorthCyprus = application.Student.AddressNorthCyprus,
                    photo = application.Student.Photo,
                    eligibilityStatus = application.Student.EligibilityStatus,
                    passedThirdYearCourses = application.Student.PassedThirdYearCourses,
                    requiredThirdYearCourses = application.Student.RequiredThirdYearCourses,
                    transcriptVerifiedAt = application.Student.TranscriptVerifiedAt
                },
                company = application.Company == null ? null : new
                {
                    id = application.Company.Id,
                    name = application.Company.Name,
                    sector = application.Company.Sector,
                    address = application.Company.Address,
                    location = application.Company.Location,
                    fieldsOfWork = application.Company.FieldsOfWork,
                    description = application.Company.Description,
                    phone = application.Company.Phone,
                    fax = application.Company.Fax,
                    contactEmail = application.Company.ContactEmail,
                    website = application.Company.Website,
                    positionsOffered = application.Company.PositionsOffered,
                    averageRating = application.Company.AverageRating,
                    approved = application.Company.Approved
                }
            };
        }

    }

    public class CreateApplicationRequest
    {
        public string? CompanyId { get; set; }
        public string CvFileId { get; set; } = string.Empty;
        public string MotivationLetterFileId { get; set; } = string.Empty;
        public string TranscriptFileId { get; set; } = string.Empty;

        // Fields for "Propose and Apply" flow
        public ProposedCompanyData? ProposedCompany { get; set; }
        public string? InternshipStartDate { get; set; }
        public string? InternshipEndDate { get; set; }
        public string? SupervisorName { get; set; }
        public string? SupervisorEmail { get; set; }
        public string? SupervisorTitle { get; set; }
    }

    public class ProposedCompanyData
    {
        public string Name { get; set; } = string.Empty;
        public string? Sector { get; set; }
        public string? Location { get; set; }
        public string? Description { get; set; }
        public string? Website { get; set; }
    }

    public class UpdateCoordinatorReviewRequest
    {
        public string? Status { get; set; }
        public string? CoordinatorComments { get; set; }
        public string? TraineeJobTitle { get; set; }
        public string? SupervisorTitle { get; set; }

        public string? TraineeDepartmentOrDivision { get; set; }
        public string? SupervisorDepartmentOrDivision { get; set; }
        public string? SupervisorSpecialty { get; set; }
        public string? SupervisorAcademicDegrees { get; set; }
        public string? SupervisorGraduatedUniversity { get; set; }
        public string? SupervisorGraduationYear { get; set; }
        public string? SupervisorYearsInCompany { get; set; }
        public string? SupervisorYearsExperience { get; set; }

        public List<int?>? SupervisorProgramOutcomeScores { get; set; }

        /// <summary>Öğrenci logbook’u koordinatöre gönderildikten sonra; süpervizör görüşleri (Word merge).</summary>
        public string? SupervisorOverallPerformanceObservations { get; set; }

        /// <summary>Öğrenci logbook’u koordinatöre gönderildikten sonra; üniversiteye öneriler (Word).</summary>
        public string? SupervisorSuggestionsToUniversityAboutTrainee { get; set; }

        /// <summary>True ise <see cref="InternshipStartDate"/> / <see cref="InternshipEndDate"/> uygulanır (boş = sil).</summary>
        public bool PatchInternshipDates { get; set; }

        /// <summary>yyyy-MM-dd veya boş (temizle).</summary>
        public string? InternshipStartDate { get; set; }

        public string? InternshipEndDate { get; set; }
    }

    public class UpdateCompanyReviewRequest
    {
        public string? Status { get; set; }
        public string? CompanyComments { get; set; }
        public string? TraineeJobTitle { get; set; }
        public string? SupervisorTitle { get; set; }

        public string? TraineeDepartmentOrDivision { get; set; }
        public string? SupervisorDepartmentOrDivision { get; set; }
        public string? SupervisorSpecialty { get; set; }
        public string? SupervisorAcademicDegrees { get; set; }
        public string? SupervisorGraduatedUniversity { get; set; }
        public string? SupervisorGraduationYear { get; set; }
        public string? SupervisorYearsInCompany { get; set; }
        public string? SupervisorYearsExperience { get; set; }

        public List<int?>? SupervisorProgramOutcomeScores { get; set; }

        /// <inheritdoc cref="UpdateCoordinatorReviewRequest.SupervisorOverallPerformanceObservations"/>
        public string? SupervisorOverallPerformanceObservations { get; set; }

        /// <inheritdoc cref="UpdateCoordinatorReviewRequest.SupervisorSuggestionsToUniversityAboutTrainee"/>
        public string? SupervisorSuggestionsToUniversityAboutTrainee { get; set; }

        public bool PatchInternshipDates { get; set; }
        public string? InternshipStartDate { get; set; }
        public string? InternshipEndDate { get; set; }
    }

    public class AssignCompanySupervisorRequest
    {
        /// <summary>Staff kullanıcı id'si veya atamayı kaldırmak için null/boş.</summary>
        public string? CompanySupervisorUserId { get; set; }
    }

    public class TraineeSummerSelfEvaluationRequest
    {
        /// <summary>Exactly 12 entries (satır sırası 1–12); each null or 0–4.</summary>
        public List<int?> Scores { get; set; } = null!;
    }

    public class TraineeJobOwnWordsPatchRequest
    {
        /// <summary>Stajyerin iş tanımı (kendi kelimeleriyle). Boş string = alanı temizler.</summary>
        public string? TraineeJobOwnWords { get; set; }
    }

    public class SubmitAcceptanceLetterRequest
    {
        /// <summary>Yüklenen dosyanın id'si (öğrenci sahibi; category acceptance_letter).</summary>
        public string AcceptanceLetterFileId { get; set; } = string.Empty;
    }

    public class VerifyAcceptanceLetterRequest
    {
        public bool Verified { get; set; }
        public string? CoordinatorComments { get; set; }
    }
}
