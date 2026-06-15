using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Data;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using InternshipManagement.API.Services.Notifications;

namespace InternshipManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LogbookController : ControllerBase
    {
        private const string AuthCookieName = "internship_auth_user_id";

        /// <summary>Günlük açıklama: boşlukla ayrılmış kelime sayısı (öğrenci/tabanlı geri bildirim).</summary>
        private const int LogbookDescriptionMinWords = 20;

        private const int LogbookDescriptionMaxWords = 150;

        private readonly AppDbContext _db;
        private readonly NotificationService _notificationService;
        private readonly ICoordinatorPortalRoleService _coordinatorPortalRoles;

        public LogbookController(
            AppDbContext db,
            NotificationService notificationService,
            ICoordinatorPortalRoleService coordinatorPortalRoles)
        {
            _db = db;
            _notificationService = notificationService;
            _coordinatorPortalRoles = coordinatorPortalRoles;
        }

        // Öğrencinin kendi logbook kayıtlarını getir
        [HttpGet("my")]
        public async Task<IActionResult> GetMyEntries(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role == "student")
            {
                var gate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
                if (gate != null)
                    return gate;
            }

            var entries = await _db.LogbookEntries
                .AsNoTracking()
                .Where(entry => entry.StudentId == currentUser.Id)
                .OrderByDescending(entry => entry.Date)
                .ToListAsync(cancellationToken);

            var approverIds = entries
                .Select(e => e.SupervisorApprovedByUserId)
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToList();
            var approverNames = await _db.Users.AsNoTracking()
                .Where(u => approverIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);

            return Ok(entries.Select(e => ToLogbookResponse(e,
                e.SupervisorApprovedByUserId != null &&
                approverNames.TryGetValue(e.SupervisorApprovedByUserId, out var n)
                    ? n
                    : null)));
        }

        // Öğrenci yeni logbook kaydı ekler
        [HttpPost]
        public async Task<IActionResult> CreateEntry(
            [FromBody] CreateLogbookEntryRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
            if (gate != null)
                return gate;

            var lockGate = await RequireLogbookNotSubmittedAsync(currentUser.Id, cancellationToken);
            if (lockGate != null)
                return lockGate;

            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(new { message = "Description is required." });

            var descriptionTrimmed = request.Description.Trim();
            var wordErr = ValidateDescriptionWordCount(descriptionTrimmed);
            if (wordErr != null)
                return BadRequest(new { message = wordErr });

            if (request.HoursWorked <= 0)
                return BadRequest(new { message = "Hours worked must be greater than 0." });

            var (attachmentsOk, attachmentUrls) = await TryBuildAttachmentUrlsAsync(currentUser.Id, request.AttachmentFileIds, cancellationToken);
            if (!attachmentsOk)
                return BadRequest(new { message = "One or more attachment files could not be verified." });

            var entry = new LogbookEntry
            {
                StudentId = currentUser.Id,
                Date = ToLogbookUtcDate(request.Date),
                Description = descriptionTrimmed,
                HoursWorked = request.HoursWorked,
                Attachments = attachmentUrls
            };

            _db.LogbookEntries.Add(entry);
            await _db.SaveChangesAsync(cancellationToken);

            await NotifyCompanySupervisorsForStudentLogbookAsync(
                currentUser.Id,
                "New logbook entry",
                $"{currentUser.Name} added a logbook entry for {request.Date:MMM dd, yyyy}.",
                "info",
                entry.Id,
                cancellationToken);

            return StatusCode(201, ToLogbookResponse(entry));
        }

        // Öğrenci kendi logbook kaydını günceller
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateEntry(
            string id,
            [FromBody] UpdateLogbookEntryRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
            if (gate != null)
                return gate;

            var lockGate = await RequireLogbookNotSubmittedAsync(currentUser.Id, cancellationToken);
            if (lockGate != null)
                return lockGate;

            var entry = await _db.LogbookEntries.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
            if (entry == null)
                return NotFound(new { message = "Logbook entry not found." });

            if (entry.StudentId != currentUser.Id)
                return Forbid();

            if (EntryIsLockedForStudent(entry))
                return BadRequest(new { message = "This entry has been approved or reviewed by your supervisor and can no longer be edited." });

            if (request.Description != null)
            {
                if (string.IsNullOrWhiteSpace(request.Description))
                    return BadRequest(new { message = "Description cannot be empty." });
                var trimmed = request.Description.Trim();
                var wordErr = ValidateDescriptionWordCount(trimmed);
                if (wordErr != null)
                    return BadRequest(new { message = wordErr });
                entry.Description = trimmed;
            }

            if (request.HoursWorked.HasValue)
            {
                if (request.HoursWorked.Value <= 0)
                    return BadRequest(new { message = "Hours worked must be greater than 0." });
                entry.HoursWorked = request.HoursWorked.Value;
            }

            if (request.Date.HasValue)
            {
                entry.Date = ToLogbookUtcDate(request.Date.Value);
            }

            if (request.AttachmentFileIds != null)
            {
                var (ok, urls) = await TryBuildAttachmentUrlsAsync(currentUser.Id, request.AttachmentFileIds, cancellationToken);
                if (!ok)
                    return BadRequest(new { message = "One or more attachment files could not be verified." });
                entry.Attachments = urls;
            }

            await _db.SaveChangesAsync(cancellationToken);

            string? approverName = null;
            if (!string.IsNullOrEmpty(entry.SupervisorApprovedByUserId))
            {
                approverName = await _db.Users.AsNoTracking()
                    .Where(u => u.Id == entry.SupervisorApprovedByUserId)
                    .Select(u => u.Name)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            return Ok(ToLogbookResponse(entry, approverName));
        }

        // Öğrenci kendi logbook kaydını siler
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEntry(
            string id,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
            if (gate != null)
                return gate;

            var lockGate = await RequireLogbookNotSubmittedAsync(currentUser.Id, cancellationToken);
            if (lockGate != null)
                return lockGate;

            var entry = await _db.LogbookEntries.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
            if (entry == null)
                return NotFound(new { message = "Logbook entry not found." });

            if (entry.StudentId != currentUser.Id)
                return Forbid();

            if (EntryIsLockedForStudent(entry))
                return BadRequest(new { message = "This entry has been approved or reviewed by your supervisor and can no longer be deleted." });

            _db.LogbookEntries.Remove(entry);
            await _db.SaveChangesAsync(cancellationToken);

            return NoContent();
        }

        /// <summary>
        /// Phase 1: Öğrenci stajını tamamlayıp tüm günlük satırları süpervizör onayından geçirdikten sonra logbook'u şirket yetkilisine değerlendirmesi için iletir.
        /// </summary>
        [HttpPost("submit-to-supervisor")]
        public async Task<IActionResult> SubmitLogbookToSupervisor(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
            if (gate != null)
                return gate;

            var application = await _db.Applications
                .Include(a => a.Company)
                .Where(a => a.StudentId == currentUser.Id &&
                            (a.Status == "ongoing" || a.Status == "completed"))
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null)
                return BadRequest(new { message = "No ongoing or completed internship placement found." });

            if (application.LogbookSubmittedToSupervisorAt.HasValue)
                return BadRequest(new { message = "You already submitted your logbook to the supervisor." });

            var entries = await _db.LogbookEntries
                .Where(e => e.StudentId == currentUser.Id)
                .ToListAsync(cancellationToken);

            if (entries.Count == 0)
                return BadRequest(new { message = "Add at least one logbook entry before submitting." });

            if (entries.Any(e => !e.SupervisorApprovedAt.HasValue))
            {
                return BadRequest(new
                {
                    message = "Every logbook row must be approved by your company supervisor before submitting to the supervisor for final evaluation."
                });
            }

            application.LogbookSubmittedToSupervisorAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            var companyName = application.Company?.Name ?? "their host company";

            await _notificationService.CreateNotificationAsync(
                currentUser.Id,
                "Logbook sent to supervisor",
                "Your logbook was sent to the company supervisor for their evaluation.",
                "success",
                "application",
                application.Id,
                cancellationToken);

            await _notificationService.CreateNotificationsForRoleAsync(
                "company",
                "Logbook requires final evaluation",
                $"{currentUser.Name} completed their daily logbook entries and sent it for your final evaluation.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            return Ok(new
            {
                applicationId = application.Id,
                logbookSubmittedToSupervisorAt = application.LogbookSubmittedToSupervisorAt
            });
        }

        /// <summary>
        /// Phase 3: Öğrenci staj logbook sürecini tamamen bitirip (self eval dahil) son onayı için üniversite koordinatörüne gönderir.
        /// </summary>
        [HttpPost("submit-to-coordinator")]
        public async Task<IActionResult> SubmitLogbookToCoordinator(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "student")
                return Forbid();

            var gate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
            if (gate != null)
                return gate;

            var application = await _db.Applications
                .Include(a => a.Company)
                .Where(a => a.StudentId == currentUser.Id &&
                            (a.Status == "ongoing" || a.Status == "completed"))
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null)
                return BadRequest(new { message = "No ongoing or completed internship placement found." });

            if (!application.LogbookSubmittedToSupervisorAt.HasValue || !application.SupervisorEvaluationCompletedAt.HasValue)
                return BadRequest(new { message = "The company supervisor must complete their evaluation first." });

            if (application.LogbookSubmittedForCoordinatorReviewAt.HasValue)
                return BadRequest(new { message = "You already submitted your logbook to the coordinator." });

            if (!application.TraineeSummerSelfEval1.HasValue ||
                !application.TraineeSummerSelfEval2.HasValue ||
                !application.TraineeSummerSelfEval3.HasValue ||
                !application.TraineeSummerSelfEval4.HasValue ||
                !application.TraineeSummerSelfEval5.HasValue ||
                !application.TraineeSummerSelfEval6.HasValue ||
                !application.TraineeSummerSelfEval7.HasValue ||
                !application.TraineeSummerSelfEval8.HasValue ||
                !application.TraineeSummerSelfEval9.HasValue ||
                !application.TraineeSummerSelfEval10.HasValue ||
                !application.TraineeSummerSelfEval11.HasValue ||
                !application.TraineeSummerSelfEval12.HasValue)
            {
                return BadRequest(new { message = "You must complete your self-assessment scores before submitting the logbook to the coordinator." });
            }

            application.LogbookSubmittedForCoordinatorReviewAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            var companyName = application.Company?.Name ?? "their host company";

            await _notificationService.CreateNotificationAsync(
                currentUser.Id,
                "Logbook submitted to university",
                "Your logbook was sent to the university coordinator for final approval.",
                "success",
                "application",
                application.Id,
                cancellationToken);

            await _notificationService.CreateNotificationsForRoleAsync(
                "coordinator",
                "Logbook submitted for final approval",
                $"{currentUser.Name} finalized their internship logbook and submitted it for university approval.",
                "info",
                "application",
                application.Id,
                cancellationToken);

            return Ok(new
            {
                applicationId = application.Id,
                logbookSubmittedForCoordinatorReviewAt = application.LogbookSubmittedForCoordinatorReviewAt
            });
        }

        /// <summary>
        /// Phase 2: Şirket yetkilisi kendi değerlendirmesini (PO, Observations) bitirir ve logbook'u öğrenciye geri gönderir.
        /// </summary>
        [HttpPatch("{applicationId}/complete-supervisor-evaluation")]
        public async Task<IActionResult> CompleteSupervisorEvaluation(string applicationId, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            var application = await _db.Applications
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (!CompanyPortalAccess.CompanyUserCanAccessApplication(currentUser, application))
                return Forbid();

            if (!application.LogbookSubmittedToSupervisorAt.HasValue)
                return BadRequest(new { message = "Logbook hasn't been sent to you yet." });

            if (application.SupervisorEvaluationCompletedAt.HasValue)
                return BadRequest(new { message = "You already completed your evaluation." });

            var unapprovedEntriesExist = await _db.LogbookEntries.AnyAsync(
                e => e.StudentId == application.StudentId && e.SupervisorApprovedAt == null,
                cancellationToken);

            if (unapprovedEntriesExist)
                return BadRequest(new { message = "You must approve all daily logbook entries before completing the overall evaluation." });

            if (!application.SupervisorEvalPo1.HasValue ||
                !application.SupervisorEvalPo2.HasValue ||
                !application.SupervisorEvalPo3.HasValue ||
                !application.SupervisorEvalPo4.HasValue ||
                !application.SupervisorEvalPo5.HasValue ||
                !application.SupervisorEvalPo6.HasValue ||
                !application.SupervisorEvalPo7.HasValue ||
                !application.SupervisorEvalPo8.HasValue ||
                !application.SupervisorEvalPo9.HasValue ||
                !application.SupervisorEvalPo10.HasValue ||
                !application.SupervisorEvalPo11.HasValue ||
                string.IsNullOrWhiteSpace(application.SupervisorOverallPerformanceObservations))
            {
                return BadRequest(new { message = "You must fill all Program Outcome scores and write your overall observations before completing the evaluation." });
            }

            application.SupervisorEvaluationCompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);

            if (application.Student != null)
            {
                await _notificationService.CreateNotificationAsync(
                    application.StudentId,
                    "Supervisor completed evaluation",
                    "Your supervisor completed the logbook evaluation. You can now do your self-evaluation and send it to the university.",
                    "info",
                    "application",
                    application.Id,
                    cancellationToken);
            }

            return Ok(new
            {
                applicationId = application.Id,
                supervisorEvaluationCompletedAt = application.SupervisorEvaluationCompletedAt
            });
        }

        /// <summary>
        /// Phase 4: Üniversite koordinatörü son aşamada logbook'u onaylar.
        /// </summary>
        [HttpPatch("{applicationId}/verify-logbook")]
        public async Task<IActionResult> VerifyLogbook(string applicationId, CancellationToken cancellationToken = default)
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
                .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            if (!application.LogbookSubmittedForCoordinatorReviewAt.HasValue)
                return BadRequest(new { message = "Student has not submitted the logbook for final approval yet." });

            if (application.LogbookVerifiedByCoordinatorAt.HasValue)
                return BadRequest(new { message = "Logbook is already verified." });

            application.LogbookVerifiedByCoordinatorAt = DateTime.UtcNow;
            application.Status = "completed";
            await _db.SaveChangesAsync(cancellationToken);

            if (application.Student != null)
            {
                await _notificationService.CreateNotificationAsync(
                    application.StudentId,
                    "Logbook approved by university",
                    "The university coordinator approved your final logbook.",
                    "success",
                    "application",
                    application.Id,
                    cancellationToken);
            }

            return Ok(new
            {
                applicationId = application.Id,
                logbookVerifiedByCoordinatorAt = application.LogbookVerifiedByCoordinatorAt
            });
        }

        /// <summary>
        /// Logbook'u öğrenciye geri döndürür (Revizyon/Düzeltme İsteği).
        /// Şirket veya Koordinatör tarafından kullanılabilir.
        /// </summary>
        [HttpPatch("{applicationId}/return-logbook")]
        public async Task<IActionResult> ReturnLogbook(string applicationId, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            var application = await _db.Applications
                .Include(a => a.Student)
                .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

            if (application == null)
                return NotFound(new { message = "Application not found." });

            bool isCompany = currentUser.Role == "company";
            bool isCoordinator = await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken);

            if (!isCompany && !isCoordinator)
                return Forbid();

            if (isCompany)
            {
                if (!CompanyPortalAccess.CompanyUserCanAccessApplication(currentUser, application))
                    return Forbid();

                if (!application.LogbookSubmittedToSupervisorAt.HasValue)
                    return BadRequest(new { message = "Logbook hasn't been sent to you yet." });

                if (application.LogbookSubmittedForCoordinatorReviewAt.HasValue)
                    return BadRequest(new { message = "Logbook has already been submitted to the coordinator." });

                application.LogbookSubmittedToSupervisorAt = null;
                application.SupervisorEvaluationCompletedAt = null;
                await _db.SaveChangesAsync(cancellationToken);

                if (application.Student != null)
                {
                    await _notificationService.CreateNotificationAsync(
                        application.StudentId,
                        "Logbook returned for revision",
                        "Your company supervisor has returned your logbook for revision. You can edit your entries and resubmit.",
                        "warning",
                        "application",
                        application.Id,
                        cancellationToken);
                }

                return Ok(new { message = "Logbook returned to student successfully.", application });
            }
            else
            {
                if (!Permissions.Has(currentUser, Permissions.CoordApplicationsReview))
                    return Forbid();

                if (!application.LogbookSubmittedForCoordinatorReviewAt.HasValue)
                    return BadRequest(new { message = "Logbook hasn't been submitted to the university yet." });

                if (application.LogbookVerifiedByCoordinatorAt.HasValue)
                    return BadRequest(new { message = "Logbook is already verified." });

                application.LogbookSubmittedForCoordinatorReviewAt = null;
                await _db.SaveChangesAsync(cancellationToken);

                if (application.Student != null)
                {
                    await _notificationService.CreateNotificationAsync(
                        application.StudentId,
                        "Logbook returned for revision",
                        "The university coordinator has returned your logbook for revision. You can edit and resubmit.",
                        "warning",
                        "application",
                        application.Id,
                        cancellationToken);
                }

                return Ok(new { message = "Logbook returned to student successfully.", application });
            }
        }

        /// <summary>
        /// Koordinatör portalı: Tüm öğrencilerin logbook özet listesini getirir.
        /// </summary>
        [HttpGet("coordinator/all")]
        public async Task<IActionResult> GetAllLogbooksForCoordinator(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
                return Forbid();

            // Sadece staj başvurusu olan öğrencileri baz alalım (yerleşim onaylı olsun veya olmasın, logbook yazmış olabilirler)
            var studentIdsWithLogs = await _db.LogbookEntries.AsNoTracking()
                .Select(e => e.StudentId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var studentIdsWithApps = await _db.Applications.AsNoTracking()
                .Select(a => a.StudentId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var allTargetIds = studentIdsWithLogs.Concat(studentIdsWithApps).Distinct().ToList();

            var students = await _db.Users.AsNoTracking()
                .Where(u => allTargetIds.Contains(u.Id) && u.Role == "student")
                .ToListAsync(cancellationToken);

            var apps = await _db.Applications.AsNoTracking()
                .Include(a => a.Company)
                .Where(a => allTargetIds.Contains(a.StudentId))
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync(cancellationToken);

            var entriesCount = await _db.LogbookEntries.AsNoTracking()
                .Where(e => allTargetIds.Contains(e.StudentId))
                .GroupBy(e => e.StudentId)
                .Select(g => new { StudentId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.StudentId, g => g.Count, cancellationToken);

            var results = students.Select(st =>
            {
                var app = apps.FirstOrDefault(a => a.StudentId == st.Id && 
                    (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed"));
                
                // Eğer aktif staj yoksa en son başvurusunu alalım
                app ??= apps.FirstOrDefault(a => a.StudentId == st.Id);

                if (app == null) return null;

                return new
                {
                    studentId = st.Id,
                    studentName = st.Name,
                    studentNumber = st.StudentId,
                    companyName = app?.Company?.Name ?? "—",
                    applicationId = app?.Id,
                    status = app?.Status ?? "not_applied",
                    entryCount = entriesCount.TryGetValue(st.Id, out var count) ? count : 0,
                    submittedToSupervisorAt = app?.LogbookSubmittedToSupervisorAt,
                    supervisorEvaluationCompletedAt = app?.SupervisorEvaluationCompletedAt,
                    submittedToCoordinatorAt = app?.LogbookSubmittedForCoordinatorReviewAt,
                    verifiedByCoordinatorAt = app?.LogbookVerifiedByCoordinatorAt,
                    updatedAt = app?.AppliedDate // Yaklaşık son işlem tarihi
                };
            }).Where(r => r != null)
              .OrderByDescending(r => r!.submittedToCoordinatorAt ?? DateTime.MinValue)
              .ThenByDescending(r => r!.entryCount)
              .ToList();

            return Ok(results);
        }

        // Koordinatör, students.view yetkisiyle bir öğrencinin tüm logbook kayıtlarını listeler

        [HttpGet("coordinator")]
        public async Task<IActionResult> GetCoordinatorLogbookForStudent(
            [FromQuery] string? studentId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (!await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
                return Forbid();

            if (string.IsNullOrWhiteSpace(studentId))
                return BadRequest(new { message = "studentId is required." });

            var resolvedStudent = await _db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => (u.Id == studentId || u.StudentId == studentId) && u.Role == "student", cancellationToken);
            if (resolvedStudent == null)
                return NotFound(new { message = "Student not found." });

            var resolvedStudentId = resolvedStudent.Id;

            var entries = await _db.LogbookEntries
                .AsNoTracking()
                .Where(e => e.StudentId == resolvedStudentId)
                .OrderByDescending(e => e.Date)
                .ToListAsync(cancellationToken);

            var approverIds = entries
                .Select(e => e.SupervisorApprovedByUserId)
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToList();
            var approverNames = await _db.Users.AsNoTracking()
                .Where(u => approverIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);

            return Ok(entries.Select(e => ToLogbookResponse(e,
                e.SupervisorApprovedByUserId != null &&
                approverNames.TryGetValue(e.SupervisorApprovedByUserId, out var cn)
                    ? cn
                    : null)));
        }

        // Şirket, kendi aktif stajyerlerinin logbook kayıtlarını listeler
        [HttpGet("company")]
        public async Task<IActionResult> GetCompanyLogbookEntries(
            [FromQuery] string? studentId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CompanyLogbookView))
                return Forbid();

            var company = await GetCompanyForUserAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var activeApplicationsQuery = _db.Applications
                .Where(a => a.CompanyId == company.Id &&
                            (a.Status == "approved" || a.Status == "ongoing" || a.Status == "completed") &&
                            a.AcceptanceLetterVerifiedAt != null);
            if (CompanyPortalAccess.IsCompanyStaff(currentUser))
                activeApplicationsQuery = activeApplicationsQuery.Where(a => a.CompanySupervisorUserId == currentUser.Id);

            var activeStudentIds = await activeApplicationsQuery
                .Select(a => a.StudentId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (activeStudentIds.Count == 0)
                return Ok(System.Array.Empty<object>());

            IQueryable<LogbookEntry> query = _db.LogbookEntries
                .AsNoTracking()
                .Where(entry => activeStudentIds.Contains(entry.StudentId));

            if (!string.IsNullOrWhiteSpace(studentId))
            {
                var resolvedStudent = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => (u.Id == studentId || u.StudentId == studentId) && u.Role == "student", cancellationToken);
                var resolvedStudentId = resolvedStudent?.Id ?? studentId;
                query = query.Where(entry => entry.StudentId == resolvedStudentId);
            }

            var entries = await query
                .Include(entry => entry.Student)
                .OrderByDescending(entry => entry.Date)
                .ToListAsync(cancellationToken);

            var approverIds = entries
                .Select(e => e.SupervisorApprovedByUserId)
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToList();
            var approverNames = await _db.Users.AsNoTracking()
                .Where(u => approverIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);

            return Ok(entries.Select(entry => ToCompanyLogbookDto(
                entry,
                entry.SupervisorApprovedByUserId != null &&
                approverNames.TryGetValue(entry.SupervisorApprovedByUserId, out var an)
                    ? an
                    : null)));
        }

        // Şirket, kendi stajyerinin logbook kaydına feedback ekler
        [HttpPatch("{id}/feedback")]
        public async Task<IActionResult> AddFeedback(
            string id,
            [FromBody] AddLogbookFeedbackRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CompanyLogbookFeedback))
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.SupervisorFeedback))
                return BadRequest(new { message = "Feedback is required." });

            var company = await GetCompanyForUserAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var entry = await _db.LogbookEntries
                .Include(logbookEntry => logbookEntry.Student)
                .FirstOrDefaultAsync(logbookEntry => logbookEntry.Id == id, cancellationToken);

            if (entry == null)
                return NotFound(new { message = "Logbook entry not found." });

            var application = await _db.Applications
                .Where(a =>
                    a.CompanyId == company.Id &&
                    a.StudentId == entry.StudentId &&
                    (a.Status == "approved" ||
                     a.Status == "ongoing" ||
                     a.Status == "completed") &&
                    a.AcceptanceLetterVerifiedAt != null)
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null)
                return BadRequest(new { message = "This logbook entry does not belong to one of your interns, or the student's acceptance letter is not verified yet." });

            if (!CompanyPortalAccess.CompanyUserCanAccessApplication(currentUser, application))
                return Forbid();

            entry.SupervisorFeedback = request.SupervisorFeedback.Trim();
            entry.SupervisorId = currentUser.Id;
            var now = DateTime.UtcNow;
            entry.SupervisorApprovedAt = now;
            entry.SupervisorApprovedByUserId = currentUser.Id;

            await _db.SaveChangesAsync(cancellationToken);

            await _notificationService.CreateNotificationAsync(
                entry.StudentId,
                "Logbook Feedback Received",
                entry.SupervisorFeedback,
                "info",
                "logbook",
                entry.Id,
                cancellationToken);

            return Ok(ToCompanyLogbookDto(entry, currentUser.Name));
        }

        /// <summary>Şirket süpervizörü günlük satırını onaylar (geri bildirim metni olmadan).</summary>
        [HttpPatch("{id}/supervisor-approve")]
        public async Task<IActionResult> SupervisorApproveEntry(
            string id,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CompanyLogbookFeedback))
                return Forbid();

            var company = await GetCompanyForUserAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var entry = await _db.LogbookEntries
                .Include(e => e.Student)
                .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

            if (entry == null)
                return NotFound(new { message = "Logbook entry not found." });

            var application = await _db.Applications
                .Where(a =>
                    a.CompanyId == company.Id &&
                    a.StudentId == entry.StudentId &&
                    (a.Status == "approved" ||
                     a.Status == "ongoing" ||
                     a.Status == "completed") &&
                    a.AcceptanceLetterVerifiedAt != null)
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null)
                return BadRequest(new { message = "This logbook entry does not belong to one of your interns, or the student's acceptance letter is not verified yet." });

            if (!CompanyPortalAccess.CompanyUserCanAccessApplication(currentUser, application))
                return Forbid();

            var now = DateTime.UtcNow;
            entry.SupervisorApprovedAt = now;
            entry.SupervisorApprovedByUserId = currentUser.Id;
            if (string.IsNullOrWhiteSpace(entry.SupervisorId))
                entry.SupervisorId = currentUser.Id;

            await _db.SaveChangesAsync(cancellationToken);

            await _notificationService.CreateNotificationAsync(
                entry.StudentId,
                "Logbook Entry Approved",
                $"Your supervisor approved your logbook entry for {entry.Date:MMM dd, yyyy}.",
                "success",
                "logbook",
                entry.Id,
                cancellationToken);

            return Ok(ToCompanyLogbookDto(entry, currentUser.Name));
        }

        /// <summary>Öğrenci / koordinatör / şirket haftalık onay kayıtlarını listeler.</summary>
        [HttpGet("weekly-approvals")]
        public async Task<IActionResult> GetWeeklyApprovals(
            [FromQuery] string? studentId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            string? targetStudentId = null;

            if (currentUser.Role == "student")
            {
                var studentGate = await RequireStudentLogbookAccessAsync(currentUser.Id, cancellationToken);
                if (studentGate != null)
                    return studentGate;
                targetStudentId = currentUser.Id;
            }
            else if (await _coordinatorPortalRoles.IsCoordinatorPortalUserAsync(currentUser, cancellationToken))
            {
                if (!Permissions.Has(currentUser, Permissions.CoordStudentsView))
                    return Forbid();
                if (string.IsNullOrWhiteSpace(studentId))
                    return BadRequest(new { message = "studentId is required." });
                targetStudentId = studentId;
            }
            else if (currentUser.Role == "company")
            {
                if (!Permissions.Has(currentUser, Permissions.CompanyLogbookView))
                    return Forbid();
                if (string.IsNullOrWhiteSpace(studentId))
                    return BadRequest(new { message = "studentId is required." });
                targetStudentId = studentId;

                if (!await CompanyCanAccessStudentAsync(currentUser, targetStudentId!, cancellationToken))
                    return BadRequest(new { message = "This student is not an active intern of your company." });
            }
            else if (currentUser.Role == "admin")
            {
                if (string.IsNullOrWhiteSpace(studentId))
                    return BadRequest(new { message = "studentId is required." });
                targetStudentId = studentId;
            }
            else
                return Forbid();

            var studentExists = await _db.Users.AsNoTracking()
                .AnyAsync(u => u.Id == targetStudentId && u.Role == "student", cancellationToken);
            if (!studentExists)
                return NotFound(new { message = "Student not found." });

            var rows = await _db.LogbookWeeklyApprovals.AsNoTracking()
                .Where(a => a.StudentId == targetStudentId)
                .OrderByDescending(a => a.WeekStartUtc)
                .ToListAsync(cancellationToken);

            var approverIds = rows.Select(a => a.ApprovedByUserId).Distinct().ToList();
            var names = await _db.Users.AsNoTracking()
                .Where(u => approverIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name, cancellationToken);

            return Ok(rows.Select(a => new
            {
                id = a.Id,
                studentId = a.StudentId,
                weekStartUtc = a.WeekStartUtc,
                approvedAtUtc = a.ApprovedAtUtc,
                approvedByUserId = a.ApprovedByUserId,
                approvedByName = names.TryGetValue(a.ApprovedByUserId, out var n) ? n : "",
                notes = a.Notes
            }));
        }

        /// <summary>Şirket süpervizörü haftalık "bu hafta tamam" onayı oluşturur veya günceller.</summary>
        [HttpPost("company/weekly-approvals")]
        public async Task<IActionResult> UpsertCompanyWeeklyApproval(
            [FromBody] UpsertWeeklyApprovalRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
                return Unauthorized(new { message = "Not authenticated." });

            if (currentUser.Role != "company")
                return Forbid();

            if (!Permissions.Has(currentUser, Permissions.CompanyLogbookFeedback))
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.StudentId))
                return BadRequest(new { message = "studentId is required." });

            var company = await GetCompanyForUserAsync(currentUser, cancellationToken);
            if (company == null)
                return BadRequest(new { message = "Company profile could not be matched." });

            var application = await _db.Applications
                .Where(a =>
                    a.CompanyId == company.Id &&
                    a.StudentId == request.StudentId.Trim() &&
                    (a.Status == "approved" ||
                     a.Status == "ongoing" ||
                     a.Status == "completed") &&
                    a.AcceptanceLetterVerifiedAt != null)
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null)
                return BadRequest(new { message = "Student is not an active intern of your company, or the acceptance letter is not verified yet." });

            if (!CompanyPortalAccess.CompanyUserCanAccessApplication(currentUser, application))
                return Forbid();

            var weekStart = LogbookWeekHelper.GetUtcWeekStartMonday(request.WeekStart);
            var now = DateTime.UtcNow;

            var existing = await _db.LogbookWeeklyApprovals
                .FirstOrDefaultAsync(
                    a => a.StudentId == request.StudentId.Trim() && a.WeekStartUtc == weekStart,
                    cancellationToken);

            if (existing == null)
            {
                existing = new LogbookWeeklyApproval
                {
                    StudentId = request.StudentId.Trim(),
                    WeekStartUtc = weekStart,
                    ApprovedAtUtc = now,
                    ApprovedByUserId = currentUser.Id,
                    Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes!.Trim()
                };
                _db.LogbookWeeklyApprovals.Add(existing);
            }
            else
            {
                existing.ApprovedAtUtc = now;
                existing.ApprovedByUserId = currentUser.Id;
                existing.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes!.Trim();
            }

            await _db.SaveChangesAsync(cancellationToken);

            await _notificationService.CreateNotificationAsync(
                existing.StudentId,
                "Weekly Logbook Approved",
                $"Your supervisor marked the week of {weekStart:MMM dd, yyyy} as reviewed.",
                "success",
                "logbook_week",
                existing.Id,
                cancellationToken);

            var approverName = currentUser.Name;
            return Ok(new
            {
                id = existing.Id,
                studentId = existing.StudentId,
                weekStartUtc = existing.WeekStartUtc,
                approvedAtUtc = existing.ApprovedAtUtc,
                approvedByUserId = existing.ApprovedByUserId,
                approvedByName = approverName,
                notes = existing.Notes
            });
        }

        private async Task<bool> CompanyCanAccessStudentAsync(
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

        /// <summary>Yerleşim onayı + koordinatörün acceptance letter doğrulaması olmadan öğrenci günlük logbook kullanamaz.</summary>
        private async Task<IActionResult?> RequireStudentLogbookAccessAsync(
            string studentId,
            CancellationToken cancellationToken)
        {
            var hasActivePlacement = await _db.Applications.AsNoTracking().AnyAsync(
                a => a.StudentId == studentId &&
                     (a.Status == "approved" ||
                      a.Status == "ongoing" ||
                      a.Status == "completed"),
                cancellationToken);

            if (!hasActivePlacement)
            {
                return BadRequest(new
                {
                    message = "You need an approved internship placement before using the daily logbook."
                });
            }

            var hasVerifiedAcceptance = await _db.Applications.AsNoTracking().AnyAsync(
                a => a.StudentId == studentId &&
                     (a.Status == "approved" ||
                      a.Status == "ongoing" ||
                      a.Status == "completed") &&
                     a.AcceptanceLetterVerifiedAt != null,
                cancellationToken);

            if (!hasVerifiedAcceptance)
            {
                return BadRequest(new
                {
                    message =
                        "Upload your signed summer acceptance letter from Applications and wait until the coordinator verifies it before using the daily logbook."
                });
            }

            return null;
        }

        private async Task<IActionResult?> RequireLogbookNotSubmittedAsync(
            string studentId,
            CancellationToken cancellationToken)
        {
            var app = await _db.Applications.AsNoTracking().FirstOrDefaultAsync(
                a => a.StudentId == studentId &&
                     (a.Status == "approved" ||
                      a.Status == "ongoing" ||
                      a.Status == "completed"),
                cancellationToken);

            if (app != null && app.LogbookSubmittedToSupervisorAt.HasValue)
            {
                return BadRequest(new
                {
                    message = "You have already submitted your logbook to the supervisor. Entries can no longer be modified."
                });
            }

            return null;
        }

        private static bool EntryIsLockedForStudent(LogbookEntry entry) =>
            entry.SupervisorApprovedAt.HasValue ||
            !string.IsNullOrWhiteSpace(entry.SupervisorFeedback);

        private static int CountWords(string text)
        {
            var trimmed = text.Trim();
            if (trimmed.Length == 0)
                return 0;
            var count = 0;
            var inWord = false;
            foreach (var c in trimmed)
            {
                if (char.IsWhiteSpace(c))
                    inWord = false;
                else if (!inWord)
                {
                    count++;
                    inWord = true;
                }
            }

            return count;
        }

        private string? ValidateDescriptionWordCount(string description)
        {
            var n = CountWords(description);
            if (n < LogbookDescriptionMinWords)
                return $"Description must be at least {LogbookDescriptionMinWords} words (currently {n}).";
            if (n > LogbookDescriptionMaxWords)
                return $"Description must be at most {LogbookDescriptionMaxWords} words (currently {n}).";
            return null;
        }

        private async Task<User?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            if (!Request.Cookies.TryGetValue(AuthCookieName, out var userId) || string.IsNullOrWhiteSpace(userId))
                return null;

            return await _db.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
        }

        // Yüklenmiş dosya id'lerini /api/files/{id} URL'lerine dönüştürür ve ownership doğrulaması yapar.
        // (ok, urls) döner. ok=false ise dosya bulunamadı veya başka kullanıcıya ait.
        private async Task<(bool ok, string[]? urls)> TryBuildAttachmentUrlsAsync(
            string ownerId,
            string[]? fileIds,
            CancellationToken cancellationToken)
        {
            if (fileIds == null || fileIds.Length == 0)
                return (true, null);

            var distinctIds = fileIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToArray();
            if (distinctIds.Length == 0)
                return (true, null);

            var ownedIds = await _db.UploadedFiles
                .Where(file => distinctIds.Contains(file.Id) && file.OwnerId == ownerId)
                .Select(file => file.Id)
                .ToListAsync(cancellationToken);

            if (ownedIds.Count != distinctIds.Length)
                return (false, null);

            return (true, distinctIds.Select(id => $"/api/files/{id}").ToArray());
        }

        /// <summary>
        /// Günlük logbook bildirimi yalnızca atanmış şirket süpervizörüne gider (üniversite koordinatörüne değil).
        /// </summary>
        private async Task NotifyCompanySupervisorsForStudentLogbookAsync(
            string studentId,
            string title,
            string message,
            string type,
            string? relatedEntityId,
            CancellationToken cancellationToken)
        {
            var recipientIds = await ResolveCompanyLogbookNotificationRecipientIdsAsync(studentId, cancellationToken);
            foreach (var userId in recipientIds)
            {
                await _notificationService.CreateNotificationAsync(
                    userId,
                    title,
                    message,
                    type,
                    "logbook",
                    relatedEntityId,
                    cancellationToken);
            }
        }

        /// <summary>
        /// Yalnızca başvuruda atanmış şirket süpervizörüne gider; süpervizör yoksa bildirim oluşturulmaz.
        /// </summary>
        private async Task<List<string>> ResolveCompanyLogbookNotificationRecipientIdsAsync(
            string studentId,
            CancellationToken cancellationToken)
        {
            var application = await _db.Applications
                .AsNoTracking()
                .Where(a => a.StudentId == studentId &&
                            (a.Status == "approved" ||
                             a.Status == "ongoing" ||
                             a.Status == "completed") &&
                            a.AcceptanceLetterVerifiedAt != null)
                .OrderByDescending(a => a.AppliedDate)
                .FirstOrDefaultAsync(cancellationToken);

            if (application == null ||
                string.IsNullOrEmpty(application.CompanySupervisorUserId))
                return new List<string>();

            var supervisor = await _db.Users.AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Id == application.CompanySupervisorUserId &&
                         u.Role == "company" &&
                         u.CompanyId == application.CompanyId,
                    cancellationToken);

            return supervisor != null ? new List<string> { supervisor.Id } : new List<string>();
        }

        // Company kullanıcısının bağlı olduğu şirketi döndürür (CompanyId üzerinden, isim eşleşmesi YOK)
        private async Task<Company?> GetCompanyForUserAsync(User currentUser, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(currentUser.CompanyId))
                return null;
            return await _db.Companies.FirstOrDefaultAsync(c => c.Id == currentUser.CompanyId, cancellationToken);
        }

        /// <summary>PostgreSQL timestamptz (Npgsql) yalnızca UTC yazar; JSON tarihleri Unspecified olur.</summary>
        private static DateTime ToLogbookUtcDate(DateTime d) =>
            DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);

        private static object ToCompanyLogbookDto(LogbookEntry entry, string? supervisorApprovedByName) =>
            new
            {
                id = entry.Id,
                studentId = entry.StudentId,
                studentName = entry.Student?.Name ?? "Unknown",
                date = entry.Date,
                description = entry.Description,
                hoursWorked = entry.HoursWorked,
                attachments = entry.Attachments,
                supervisorFeedback = entry.SupervisorFeedback,
                supervisorId = entry.SupervisorId,
                supervisorApprovedAt = entry.SupervisorApprovedAt,
                supervisorApprovedByUserId = entry.SupervisorApprovedByUserId,
                supervisorApprovedByName
            };

        private static object ToLogbookResponse(LogbookEntry entry, string? supervisorApprovedByName = null)
        {
            return new
            {
                id = entry.Id,
                studentId = entry.StudentId,
                date = entry.Date,
                description = entry.Description,
                hoursWorked = entry.HoursWorked,
                attachments = entry.Attachments,
                supervisorFeedback = entry.SupervisorFeedback,
                supervisorId = entry.SupervisorId,
                supervisorApprovedAt = entry.SupervisorApprovedAt,
                supervisorApprovedByUserId = entry.SupervisorApprovedByUserId,
                supervisorApprovedByName
            };
        }
    }

    public class UpsertWeeklyApprovalRequest
    {
        public string StudentId { get; set; } = string.Empty;
        /// <summary>Hafta içinde herhangi bir gün; sunucu Pazartesi UTC'ye normalize eder.</summary>
        public DateTime WeekStart { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateLogbookEntryRequest
    {
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public double HoursWorked { get; set; }
        public string[]? AttachmentFileIds { get; set; }
    }

    public class AddLogbookFeedbackRequest
    {
        public string SupervisorFeedback { get; set; } = string.Empty;
    }

    public class UpdateLogbookEntryRequest
    {
        public DateTime? Date { get; set; }
        public string? Description { get; set; }
        public double? HoursWorked { get; set; }
        public string[]? AttachmentFileIds { get; set; }
    }
}
