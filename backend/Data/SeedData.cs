using Microsoft.EntityFrameworkCore;
using InternshipManagement.API.Authorization;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

namespace InternshipManagement.API.Data
{
    // Uygulama ilk açıldığında veritabanına örnek kullanıcı eklemek için
    public static class SeedData
    {
        /// <summary>
        /// <see cref="AppSetting"/> kayıtları kalır; admin olmayan tüm kullanıcılar ve bağlı iş verisi silinir.
        /// </summary>
        public static async Task ClearOperationalDataKeepingAdminsAsync(
            AppDbContext db,
            CancellationToken cancellationToken = default)
        {
            db.Notifications.RemoveRange(await db.Notifications.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.LogbookWeeklyApprovals.RemoveRange(await db.LogbookWeeklyApprovals.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.LogbookEntries.RemoveRange(await db.LogbookEntries.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.FinalReports.RemoveRange(await db.FinalReports.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.TrainingReportSubmissionSnapshots.RemoveRange(
                await db.TrainingReportSubmissionSnapshots.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.TrainingReportFigures.RemoveRange(await db.TrainingReportFigures.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.TrainingReports.RemoveRange(await db.TrainingReports.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.Applications.RemoveRange(await db.Applications.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.SummerTrainingApplicationLetters.RemoveRange(
                await db.SummerTrainingApplicationLetters.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.KnowledgeBaseEntries.RemoveRange(await db.KnowledgeBaseEntries.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.UploadedFiles.RemoveRange(await db.UploadedFiles.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.Companies.RemoveRange(await db.Companies.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            db.StaffRoleDefinitions.RemoveRange(await db.StaffRoleDefinitions.ToListAsync(cancellationToken));
            await db.SaveChangesAsync(cancellationToken);

            var nonAdminUsers = await db.Users.Where(u => u.Role != "admin").ToListAsync(cancellationToken);
            db.Users.RemoveRange(nonAdminUsers);
            await db.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Admin kullanıcıları kalır; diğer tüm iş verisi silinir, ardından yeni k@gmail.com vb. veriler yüklenir.
        /// </summary>
        public static async Task ResetDemoKeepingAdminAndReseedAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            await ClearOperationalDataKeepingAdminsAsync(db, cancellationToken);

            await EnsureSeedDemoUsersAsync(db, cancellationToken);
            await EnsureDemoStudentAdvisorLinkAsync(db, cancellationToken);
            await EnsureSeedCompaniesAsync(db, cancellationToken);
            await EnsureSeedApplicationLettersAsync(db, cancellationToken);
            await BackfillCompanyIdsAsync(db, cancellationToken);
            await BackfillCompanyMembershipTierAsync(db, cancellationToken);
            await EnsureSeedApplicationsAsync(db, cancellationToken);
            await BackfillDefaultPermissionsAsync(db, cancellationToken);
            await EnsureSummerLetterCoordinatorPermissionAsync(db, cancellationToken);
            await EnsureSeedDefaultAdminIfMissingAsync(db, cancellationToken);
            await EnsureSeedKnowledgeBaseAsync(db, cancellationToken);
        }

        /// <summary>Öğrenci/koordinatör/şirket demo hesaplarını e-postaya göre yoksa ekler; admin korunur.</summary>
        private static async Task EnsureSeedDemoUsersAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            async Task AddIfMissingAsync(User user)
            {
                var email = user.Email;
                if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
                    return;
                db.Users.Add(user);
                await db.SaveChangesAsync(cancellationToken);
            }

            var commonPassword = "8129588me";

            await AddIfMissingAsync(new User
            {
                Email = "danisman@gmail.com",
                Name = "Ahmet Danışman",
                Role = "advisor",
                Password = commonPassword,
                Permissions = System.Array.Empty<string>()
            });

            await AddIfMissingAsync(new User
            {
                Email = "k@gmail.com",
                Name = "Kemal Koordinatör",
                Role = "coordinator",
                Password = commonPassword,
                Permissions = Permissions.CoordinatorAll
            });

            await AddIfMissingAsync(new User
            {
                Email = "sirket@gmail.com",
                Name = "TEB Şirket",
                Role = "company",
                Password = commonPassword,
                CompanyMembershipTier = CompanyPortalAccess.TierPrimary,
                Permissions = Permissions.CompanyAll
            });

            await AddIfMissingAsync(new User
            {
                Email = "supervisor@gmail.com",
                Name = "Sarp Süpervizör",
                Role = "company",
                Password = commonPassword,
                CompanyMembershipTier = CompanyPortalAccess.TierStaff,
                Permissions = Permissions.CompanyAll
            });

            for (int i = 1; i <= 6; i++)
            {
                await AddIfMissingAsync(new User
                {
                    Email = $"ogr{i}@gmail.com",
                    Name = $"Öğrenci {i}",
                    Role = "student",
                    Password = commonPassword,
                    StudentId = $"202600{i}",
                    Department = i % 2 == 0 ? "Computer Science" : "Software Engineering",
                    CurrentSemester = 7,
                    EligibilityStatus = "eligible",
                    PassedThirdYearCourses = 6,
                    RequiredThirdYearCourses = 5,
                    TranscriptVerifiedAt = DateTime.UtcNow.AddDays(-14)
                });
            }
        }

        private static async Task EnsureSeedApplicationLettersAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            if (await db.SummerTrainingApplicationLetters.AnyAsync(cancellationToken))
                return;

            var students = await db.Users
                .Where(u => u.Role == "student" && u.Email.Contains("@gmail.com"))
                .OrderBy(u => u.Email)
                .ToListAsync(cancellationToken);

            var academicPeriodKey = "2026-summer";
            var targetStudentIndices = new[] { 0, 1, 2, 4, 5 }; // ogr1, ogr2, ogr3, ogr5, ogr6

            foreach (var idx in targetStudentIndices)
            {
                if (idx >= students.Count) continue;
                var student = students[idx];

                db.SummerTrainingApplicationLetters.Add(new SummerTrainingApplicationLetter
                {
                    StudentId = student.Id,
                    AcademicPeriodKey = academicPeriodKey,
                    Status = SummerTrainingLetterStatuses.Approved,
                    StudentElectronicAcceptanceAt = DateTime.UtcNow.AddDays(-89),
                    CreatedUtc = DateTime.UtcNow.AddDays(-90),
                    UpdatedUtc = DateTime.UtcNow.AddDays(-85),
                    SubmittedToAdvisorAt = DateTime.UtcNow.AddDays(-88),
                    AdvisorApprovedAt = DateTime.UtcNow.AddDays(-87),
                    CoordinatorApprovedAt = DateTime.UtcNow.AddDays(-85),
                    CoordinatorApproverName = "Kemal Koordinatör",
                    CourseRowsJson = SummerTrainingCurriculum.DefaultCourseRowsJson()
                });
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task EnsureDemoStudentAdvisorLinkAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var advisor = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Role == "advisor" &&
                         u.Email == "danisman@gmail.com",
                    cancellationToken);
            if (advisor == null)
                return;

            var students = await db.Users
                .Where(u => u.Role == "student" && u.Email.Contains("@gmail.com"))
                .ToListAsync(cancellationToken);

            foreach (var student in students)
            {
                if (string.IsNullOrWhiteSpace(student.AdvisorUserId))
                {
                    student.AdvisorUserId = advisor.Id;
                }
            }
            await db.SaveChangesAsync(cancellationToken);
        }

        public static async Task EnsureSeedDefaultAdminIfMissingAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            if (await db.Users.AnyAsync(u => u.Role == "admin", cancellationToken))
                return;

            db.Users.Add(new User
            {
                Email = "admin@university.edu",
                Name = "Admin User",
                Role = "admin",
                Password = "admin123"
            });
            await db.SaveChangesAsync(cancellationToken);
        }

        public static async Task EnsureSeedUsersAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            await EnsureSeedDemoUsersAsync(db, cancellationToken);
            await EnsureSeedDefaultAdminIfMissingAsync(db, cancellationToken);

            await EnsureDemoStudentAdvisorLinkAsync(db, cancellationToken);

            await EnsureSeedCompaniesAsync(db, cancellationToken);
            await EnsureSeedApplicationLettersAsync(db, cancellationToken);
            await BackfillCompanyIdsAsync(db, cancellationToken);
            await BackfillCompanyMembershipTierAsync(db, cancellationToken);
            await EnsureSeedApplicationsAsync(db, cancellationToken);
            await BackfillDefaultPermissionsAsync(db, cancellationToken);
            await EnsureSummerLetterCoordinatorPermissionAsync(db, cancellationToken);
            await EnsureSeedKnowledgeBaseAsync(db, cancellationToken);
        }

        private static async Task EnsureSummerLetterCoordinatorPermissionAsync(
            AppDbContext db,
            CancellationToken cancellationToken)
        {
            var perm = Permissions.CoordSummerTrainingLettersReview;
            var customPortalKeys = await db.StaffRoleDefinitions.AsNoTracking()
                .Select(r => r.Key)
                .ToListAsync(cancellationToken);

            var users = await db.Users
                .Where(u =>
                    u.Role == "coordinator" ||
                    customPortalKeys.Contains(u.Role))
                .ToListAsync(cancellationToken);

            var changed = false;
            foreach (var user in users)
            {
                if (user.Permissions == null || user.Permissions.Length == 0)
                    continue;
                if (System.Array.Exists(user.Permissions, p => p == perm))
                    continue;
                user.Permissions = user.Permissions.Append(perm).ToArray();
                changed = true;
            }

            if (changed)
                await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task BackfillCompanyIdsAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var company = await db.Companies.FirstOrDefaultAsync(c => c.Name == "TEB", cancellationToken);
            if (company == null)
                return;

            var sirketUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "sirket@gmail.com", cancellationToken);
            var supervisorUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "supervisor@gmail.com", cancellationToken);

            if (sirketUser != null)
            {
                sirketUser.CompanyId = company.Id;
            }

            if (supervisorUser != null)
            {
                supervisorUser.CompanyId = company.Id;
                if (sirketUser != null)
                {
                    supervisorUser.ManagedByCompanyUserId = sirketUser.Id;
                }
            }
            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task BackfillCompanyMembershipTierAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var users = await db.Users
                .Where(u => u.Role == "company" && string.IsNullOrEmpty(u.CompanyMembershipTier))
                .ToListAsync(cancellationToken);

            if (users.Count == 0)
                return;

            foreach (var user in users)
            {
                user.CompanyMembershipTier = string.IsNullOrEmpty(user.ManagedByCompanyUserId)
                    ? CompanyPortalAccess.TierPrimary
                    : CompanyPortalAccess.TierStaff;
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task BackfillDefaultPermissionsAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var customStaffKeys = await db.StaffRoleDefinitions.AsNoTracking()
                .Select(r => r.Key)
                .ToListAsync(cancellationToken);

            var users = await db.Users
                .Where(user => (user.Role == "coordinator" ||
                                user.Role == "company" ||
                                customStaffKeys.Contains(user.Role))
                               && (user.Permissions == null || user.Permissions.Length == 0))
                .ToListAsync(cancellationToken);

            if (users.Count == 0)
                return;

            foreach (var user in users)
            {
                if (user.Role == "coordinator" || customStaffKeys.Contains(user.Role))
                    user.Permissions = Permissions.CoordinatorAll;
                else
                    user.Permissions = Permissions.CompanyAll;
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task EnsureSeedCompaniesAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            if (await db.Companies.AnyAsync(cancellationToken))
                return;

            db.Companies.AddRange(
                new Company
                {
                    Name = "TEB",
                    Sector = "Finance/Banking",
                    Location = "Nicosia",
                    Description = "Türk Ekonomi Bankası.",
                    PositionsOffered = 3, // Limit is 3
                    AverageRating = 4.7,
                    Approved = true
                },
                new Company
                {
                    Name = "Tech Solutions Inc.",
                    Sector = "Technology",
                    Location = "Nicosia",
                    Description = "Enterprise software and system integration company.",
                    PositionsOffered = 5,
                    AverageRating = 4.5,
                    Approved = true
                },
                new Company
                {
                    Name = "Digital Innovations",
                    Sector = "Software",
                    Location = "Limassol",
                    Description = "Startup focused on AI, analytics and product engineering.",
                    PositionsOffered = 3,
                    AverageRating = 4.8,
                    Approved = true
                });

            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task EnsureSeedApplicationsAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            if (await db.Applications.AnyAsync(cancellationToken))
                return;

            var students = await db.Users
                .Where(u => u.Role == "student" && u.Email.Contains("@gmail.com"))
                .OrderBy(u => u.Email)
                .ToListAsync(cancellationToken);

            var teb = await db.Companies.FirstOrDefaultAsync(c => c.Name == "TEB", cancellationToken);
            var supervisor = await db.Users.FirstOrDefaultAsync(u => u.Email == "supervisor@gmail.com", cancellationToken);

            if (students.Count < 5 || teb == null)
                return;

            // Öğrenci 1 (ogr1@gmail.com): Staj tamamen bitmiş, her şey onaylı.
            var app1 = new Application
            {
                StudentId = students[0].Id,
                CompanyId = teb.Id,
                Status = "completed",
                AppliedDate = DateTime.UtcNow.AddDays(-90),
                CoordinatorPlacementApprovedAt = DateTime.UtcNow.AddDays(-85),
                CompanyPlacementApprovedAt = DateTime.UtcNow.AddDays(-84),
                InternshipStartDate = DateTime.UtcNow.AddDays(-60),
                InternshipEndDate = DateTime.UtcNow.AddDays(-20),
                CvUrl = "/documents/sample-cv.pdf",
                MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                TranscriptUrl = "/documents/sample-transcript.pdf",
                CoordinatorComments = "Staj uygunluğu ve yerleşimi koordinatör tarafından onaylandı.",
                CompanyComments = "Ali'nin staj başvurusu TEB tarafından kabul edildi.",
                AcceptanceLetterUrl = "/documents/demo-summer-acceptance-letter.pdf",
                AcceptanceLetterSubmittedAt = DateTime.UtcNow.AddDays(-88),
                AcceptanceLetterVerifiedAt = DateTime.UtcNow.AddDays(-87),
                CompanySupervisorUserId = supervisor?.Id,
                TraineeJobTitle = "Software Developer Intern",
                TraineeJobOwnWords = "Developed Web API endpoints and frontend widgets.",
                SupervisorTitle = "Lead Software Engineer",
                TraineeDepartmentOrDivision = "IT",
                SupervisorDepartmentOrDivision = "Engineering",
                SupervisorSpecialty = "Systems",
                SupervisorAcademicDegrees = "B.Sc.",
                SupervisorGraduatedUniversity = "METU",
                SupervisorGraduationYear = "2014",
                SupervisorYearsInCompany = "6 years",
                SupervisorYearsExperience = "10 years",
                SupervisorOverallPerformanceObservations = "Excellent work on backend APIs.",
                SupervisorSuggestionsToUniversityAboutTrainee = "Continue teaching cloud databases.",
                LogbookSubmittedToSupervisorAt = DateTime.UtcNow.AddDays(-19),
                SupervisorEvaluationCompletedAt = DateTime.UtcNow.AddDays(-18),
                LogbookSubmittedForCoordinatorReviewAt = DateTime.UtcNow.AddDays(-17),
                LogbookVerifiedByCoordinatorAt = DateTime.UtcNow.AddDays(-16),
                SupervisorEvalPo1 = 4, SupervisorEvalPo2 = 4, SupervisorEvalPo3 = 4, SupervisorEvalPo4 = 3, SupervisorEvalPo5 = 4,
                SupervisorEvalPo6 = 4, SupervisorEvalPo7 = 3, SupervisorEvalPo8 = 4, SupervisorEvalPo9 = 4, SupervisorEvalPo10 = 4, SupervisorEvalPo11 = 4,
                TraineeSummerSelfEval1 = 4, TraineeSummerSelfEval2 = 4, TraineeSummerSelfEval3 = 4, TraineeSummerSelfEval4 = 4, TraineeSummerSelfEval5 = 4,
                TraineeSummerSelfEval6 = 4, TraineeSummerSelfEval7 = 4, TraineeSummerSelfEval8 = 4, TraineeSummerSelfEval9 = 4, TraineeSummerSelfEval10 = 4,
                TraineeSummerSelfEval11 = 4, TraineeSummerSelfEval12 = 4
            };

            // Öğrenci 2 (ogr2@gmail.com): Defter onayları tamam, rapor taslak dolduruyor.
            var app2 = new Application
            {
                StudentId = students[1].Id,
                CompanyId = teb.Id,
                Status = "completed",
                AppliedDate = DateTime.UtcNow.AddDays(-90),
                CoordinatorPlacementApprovedAt = DateTime.UtcNow.AddDays(-85),
                CompanyPlacementApprovedAt = DateTime.UtcNow.AddDays(-84),
                InternshipStartDate = DateTime.UtcNow.AddDays(-60),
                InternshipEndDate = DateTime.UtcNow.AddDays(-20),
                CvUrl = "/documents/sample-cv.pdf",
                MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                TranscriptUrl = "/documents/sample-transcript.pdf",
                AcceptanceLetterUrl = "/documents/demo-summer-acceptance-letter.pdf",
                AcceptanceLetterSubmittedAt = DateTime.UtcNow.AddDays(-88),
                AcceptanceLetterVerifiedAt = DateTime.UtcNow.AddDays(-87),
                CompanySupervisorUserId = supervisor?.Id,
                LogbookSubmittedToSupervisorAt = DateTime.UtcNow.AddDays(-19),
                SupervisorEvaluationCompletedAt = DateTime.UtcNow.AddDays(-18),
                LogbookSubmittedForCoordinatorReviewAt = DateTime.UtcNow.AddDays(-17),
                LogbookVerifiedByCoordinatorAt = DateTime.UtcNow.AddDays(-16),
                SupervisorEvalPo1 = 4, SupervisorEvalPo2 = 4, SupervisorEvalPo3 = 4, SupervisorEvalPo4 = 3, SupervisorEvalPo5 = 4,
                SupervisorEvalPo6 = 4, SupervisorEvalPo7 = 3, SupervisorEvalPo8 = 4, SupervisorEvalPo9 = 4, SupervisorEvalPo10 = 4, SupervisorEvalPo11 = 4,
                TraineeSummerSelfEval1 = 4, TraineeSummerSelfEval2 = 4, TraineeSummerSelfEval3 = 4, TraineeSummerSelfEval4 = 4, TraineeSummerSelfEval5 = 4,
                TraineeSummerSelfEval6 = 4, TraineeSummerSelfEval7 = 4, TraineeSummerSelfEval8 = 4, TraineeSummerSelfEval9 = 4, TraineeSummerSelfEval10 = 4,
                TraineeSummerSelfEval11 = 4, TraineeSummerSelfEval12 = 4
            };

            // Öğrenci 3 (ogr3@gmail.com): Staj devam ediyor, logbook doldurma aşamasında.
            var app3 = new Application
            {
                StudentId = students[2].Id,
                CompanyId = teb.Id,
                Status = "ongoing",
                AppliedDate = DateTime.UtcNow.AddDays(-25),
                CoordinatorPlacementApprovedAt = DateTime.UtcNow.AddDays(-22),
                CompanyPlacementApprovedAt = DateTime.UtcNow.AddDays(-21),
                InternshipStartDate = DateTime.UtcNow.AddDays(-15),
                InternshipEndDate = DateTime.UtcNow.AddDays(+15),
                CvUrl = "/documents/sample-cv.pdf",
                MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                TranscriptUrl = "/documents/sample-transcript.pdf",
                AcceptanceLetterUrl = "/documents/demo-summer-acceptance-letter.pdf",
                AcceptanceLetterSubmittedAt = DateTime.UtcNow.AddDays(-24),
                AcceptanceLetterVerifiedAt = DateTime.UtcNow.AddDays(-23),
                CompanySupervisorUserId = supervisor?.Id
            };

            // Öğrenci 4 (ogr4@gmail.com): Yeni kayıt, hiçbir staj kaydı yok. (application eklenmiyor)

            // Öğrenci 5 (ogr5@gmail.com): Defter bitmiş, koordinatör onayını bekliyor.
            var app5 = new Application
            {
                StudentId = students[4].Id,
                CompanyId = teb.Id,
                Status = "ongoing",
                AppliedDate = DateTime.UtcNow.AddDays(-50),
                CoordinatorPlacementApprovedAt = DateTime.UtcNow.AddDays(-48),
                CompanyPlacementApprovedAt = DateTime.UtcNow.AddDays(-47),
                InternshipStartDate = DateTime.UtcNow.AddDays(-45),
                InternshipEndDate = DateTime.UtcNow.AddDays(-10),
                CvUrl = "/documents/sample-cv.pdf",
                MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                TranscriptUrl = "/documents/sample-transcript.pdf",
                AcceptanceLetterUrl = "/documents/demo-summer-acceptance-letter.pdf",
                AcceptanceLetterSubmittedAt = DateTime.UtcNow.AddDays(-49),
                AcceptanceLetterVerifiedAt = DateTime.UtcNow.AddDays(-48),
                CompanySupervisorUserId = supervisor?.Id,
                LogbookSubmittedToSupervisorAt = DateTime.UtcNow.AddDays(-9),
                SupervisorEvaluationCompletedAt = DateTime.UtcNow.AddDays(-8),
                LogbookSubmittedForCoordinatorReviewAt = DateTime.UtcNow.AddDays(-7),
                LogbookVerifiedByCoordinatorAt = null, // Beklemede
                SupervisorEvalPo1 = 4, SupervisorEvalPo2 = 4, SupervisorEvalPo3 = 4, SupervisorEvalPo4 = 3, SupervisorEvalPo5 = 4,
                SupervisorEvalPo6 = 4, SupervisorEvalPo7 = 3, SupervisorEvalPo8 = 4, SupervisorEvalPo9 = 4, SupervisorEvalPo10 = 4, SupervisorEvalPo11 = 4,
                TraineeSummerSelfEval1 = 4, TraineeSummerSelfEval2 = 4, TraineeSummerSelfEval3 = 4, TraineeSummerSelfEval4 = 4, TraineeSummerSelfEval5 = 4,
                TraineeSummerSelfEval6 = 4, TraineeSummerSelfEval7 = 4, TraineeSummerSelfEval8 = 4, TraineeSummerSelfEval9 = 4, TraineeSummerSelfEval10 = 4,
                TraineeSummerSelfEval11 = 4, TraineeSummerSelfEval12 = 4
            };

            // Öğrenci 6 (ogr6@gmail.com): Defter bitmiş, rapor teslim edilmiş onaya yollanmış.
            var app6 = new Application
            {
                StudentId = students[5].Id,
                CompanyId = teb.Id,
                Status = "completed",
                AppliedDate = DateTime.UtcNow.AddDays(-60),
                CoordinatorPlacementApprovedAt = DateTime.UtcNow.AddDays(-58),
                CompanyPlacementApprovedAt = DateTime.UtcNow.AddDays(-57),
                InternshipStartDate = DateTime.UtcNow.AddDays(-55),
                InternshipEndDate = DateTime.UtcNow.AddDays(-25),
                CvUrl = "/documents/sample-cv.pdf",
                MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                TranscriptUrl = "/documents/sample-transcript.pdf",
                AcceptanceLetterUrl = "/documents/demo-summer-acceptance-letter.pdf",
                AcceptanceLetterSubmittedAt = DateTime.UtcNow.AddDays(-59),
                AcceptanceLetterVerifiedAt = DateTime.UtcNow.AddDays(-58),
                CompanySupervisorUserId = supervisor?.Id,
                LogbookSubmittedToSupervisorAt = DateTime.UtcNow.AddDays(-24),
                SupervisorEvaluationCompletedAt = DateTime.UtcNow.AddDays(-23),
                LogbookSubmittedForCoordinatorReviewAt = DateTime.UtcNow.AddDays(-22),
                LogbookVerifiedByCoordinatorAt = DateTime.UtcNow.AddDays(-21),
                SupervisorEvalPo1 = 4, SupervisorEvalPo2 = 4, SupervisorEvalPo3 = 4, SupervisorEvalPo4 = 3, SupervisorEvalPo5 = 4,
                SupervisorEvalPo6 = 4, SupervisorEvalPo7 = 3, SupervisorEvalPo8 = 4, SupervisorEvalPo9 = 4, SupervisorEvalPo10 = 4, SupervisorEvalPo11 = 4,
                TraineeSummerSelfEval1 = 4, TraineeSummerSelfEval2 = 4, TraineeSummerSelfEval3 = 4, TraineeSummerSelfEval4 = 4, TraineeSummerSelfEval5 = 4,
                TraineeSummerSelfEval6 = 4, TraineeSummerSelfEval7 = 4, TraineeSummerSelfEval8 = 4, TraineeSummerSelfEval9 = 4, TraineeSummerSelfEval10 = 4,
                TraineeSummerSelfEval11 = 4, TraineeSummerSelfEval12 = 4
            };

            db.Applications.AddRange(app1, app2, app3, app5, app6);
            await db.SaveChangesAsync(cancellationToken);

            // Logbook Entries
            await AddLogbookEntriesAsync(db, app1.StudentId, app1.InternshipStartDate!.Value, 30, true, supervisor?.Id, cancellationToken);
            await AddLogbookEntriesAsync(db, app2.StudentId, app2.InternshipStartDate!.Value, 30, true, supervisor?.Id, cancellationToken);
            await AddLogbookEntriesAsync(db, app5.StudentId, app5.InternshipStartDate!.Value, 30, true, supervisor?.Id, cancellationToken);
            await AddLogbookEntriesAsync(db, app6.StudentId, app6.InternshipStartDate!.Value, 30, true, supervisor?.Id, cancellationToken);
            
            // Student 3: 15 entries (10 approved, 5 pending)
            await AddLogbookEntriesAsync(db, app3.StudentId, app3.InternshipStartDate!.Value, 15, false, supervisor?.Id, cancellationToken);

            // Training Reports
            await AddTrainingReportAsync(db, app1.Id, app1.StudentId, "approved", cancellationToken);
            await AddTrainingReportAsync(db, app2.Id, app2.StudentId, "draft", cancellationToken);
            await AddTrainingReportAsync(db, app6.Id, app6.StudentId, "submitted", cancellationToken);
        }

        private static async Task AddLogbookEntriesAsync(
            AppDbContext db,
            string studentId,
            DateTime startDate,
            int count,
            bool allApproved,
            string? supervisorId,
            CancellationToken cancellationToken)
        {
            var entries = new List<LogbookEntry>();
            var currentDate = startDate;

            for (int i = 0; i < count; i++)
            {
                if (currentDate.DayOfWeek == DayOfWeek.Sunday)
                {
                    currentDate = currentDate.AddDays(1);
                }

                var isApproved = allApproved || i < 10;
                
                entries.Add(new LogbookEntry
                {
                    StudentId = studentId,
                    Date = currentDate,
                    Description = $"Logbook entry daily activity details for day {i + 1}. We worked on development, resolved system requirements and automated tests.",
                    HoursWorked = 8,
                    SupervisorId = supervisorId,
                    SupervisorApprovedAt = isApproved ? currentDate.AddHours(9) : null,
                    SupervisorApprovedByUserId = isApproved ? supervisorId : null
                });

                currentDate = currentDate.AddDays(1);
            }

            db.LogbookEntries.AddRange(entries);
            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task AddTrainingReportAsync(
            AppDbContext db,
            string applicationId,
            string studentId,
            string status,
            CancellationToken cancellationToken)
        {
            var content = new
            {
                introduction = "This is the introduction section of the training report.",
                companyIntro = "Introduction of TEB bank. Focused on software development and financial systems.",
                company21 = "Details about the organization structure and software engineering departments.",
                company22 = "Hardware configurations and infrastructure details of TEB.",
                workExperienceIntro = "Summary of work done during the internship.",
                problemDefinition = "Developed secure microservices and web application dashboard features.",
                workDoneIntro = "Detailed logs of the daily programming tasks.",
                task1Title = "API Integration",
                task1Body = "Designed and integrated Web API endpoints.",
                task2Title = "Testing and Deployment",
                task2Body = "Wrote automated tests and deployed service containers.",
                limitations = "Time constraints and dependency locks.",
                recentTopics = "Docker, Next.js, and ASP.NET Core.",
                conclusion = "Successful internship experience.",
                appendix = "No additional materials.",
                references = new[] { "CIU Internship Guidelines 2026", "Entity Framework Core Docs" }
            };

            var json = System.Text.Json.JsonSerializer.Serialize(content);
            var coordinator = await db.Users.FirstOrDefaultAsync(u => u.Email == "k@gmail.com", cancellationToken);

            var report = new TrainingReport
            {
                ApplicationId = applicationId,
                StudentId = studentId,
                Status = status,
                ContentJson = json,
                SubmittedAt = status != "draft" ? DateTime.UtcNow.AddDays(-5) : null,
                ApprovedAt = status == "approved" ? DateTime.UtcNow.AddDays(-2) : null,
                ApprovedByUserId = status == "approved" ? coordinator?.Id : null
            };

            db.TrainingReports.Add(report);
            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task EnsureSeedKnowledgeBaseAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var existingSeedEntries = await db.KnowledgeBaseEntries
                .Where(e => e.AuthorName == "System Seeder")
                .ToListAsync(cancellationToken);

            if (existingSeedEntries.Count > 0)
            {
                db.KnowledgeBaseEntries.RemoveRange(existingSeedEntries);
                await db.SaveChangesAsync(cancellationToken);
            }

            var entries = new List<KnowledgeBaseEntry>
            {
                new KnowledgeBaseEntry
                {
                    Title = "Summer Training Coordinators & Contacts",
                    Category = "General",
                    Content = "For CMPE (Computer Engineering) & AI (Artificial Intelligence Engineering) departments, contact:\nDr. Fuat Uyguroglu (fuyguroglu@ciu.edu.tr)\n\nFor SE (Software Engineering) & Information Systems Engineering departments, contact:\nAsst. Prof. Dr. Asad Ali (aali@ciu.edu.tr)\n\nPlease direct any initial eligibility questions to your academic advisor. Once accepted by a company, all enquiries must be addressed to the Summer Training Coordinator.",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Step 1 — Internship Eligibility Requirements",
                    Category = "Eligibility",
                    Content = "To apply for summer training, you must meet the following eligibility requirements:\n1. Registered for at least 5 courses after the 5th semester (excluding free elective courses).\n2. You may not undertake summer training while enrolled in summer school. If you do, your training will be rejected immediately.\n3. The training must consist of exactly 30 full working days. Saturday work counts as a half day and requires an official letter from the company.\n4. The company must employ at least one qualified engineer or scientist.\n5. Your assigned role and scope of work must be software- or hardware-related (e.g. software development, maintenance, installation, testing, quality assurance) and directly related to your major.\n*You can view your real-time eligibility status on your Student Dashboard.*",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Step 2 — Summer Training Application Process",
                    Category = "Application",
                    Content = "To apply to companies:\n1. Go to the **Application Letters** section on your Student Dashboard.\n2. Generate a new Summer Training Application Letter digitally.\n3. Send the letter for digital approval to your academic advisor and coordinator through the system.\n4. Once digitally approved, download the signed letter from the portal and submit it to the companies you wish to apply to.",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Step 3 — Company Acceptance & Placement Approval",
                    Category = "Application",
                    Content = "Once accepted by a company:\n1. Go to the **Applications** section on your Student Dashboard and register your placement details (Company name, start/end dates, and supervisor info).\n2. Upload the Acceptance Letter received from the company.\n3. The placement request will be routed digitally to the coordinator for verification and approval.\n4. Turkish citizens training in Turkey must upload their SGK insurance document ('Staj Sigorta Belgesi') to the system at least 2 weeks before the start of training.",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Steps 4-5 — Starting Your Training & Digital Logbook",
                    Category = "Logbook",
                    Content = "Once your placement is approved by the coordinator and company:\n1. You may begin your summer training on the scheduled start date.\n2. You do not need a physical paper logbook; all entries are created and maintained digitally in this system.\n3. You will gain access to your digital Logbook on your dashboard.",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Log Book Entry Guidelines",
                    Category = "Logbook",
                    Content = "During your training, you must update your logbook regularly:\n1. Navigate to **Student Logbooks** and fill in your daily activity entries in English.\n2. Submit your daily entries. Your company supervisor will review and approve them digitally through this platform.\n3. All logbook entries must be approved digitally by your supervisor to complete your training successfully.",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Course Registration & Report Submission",
                    Category = "Report",
                    Content = "After completing your training:\n1. Register for the appropriate course: CMPE300 (Computer), AIEN300 (AI), SWEN300 (Software), or ISYE300 (Information Systems).\n2. Navigate to the **Training Reports** section in this platform.\n3. Upload your final internship report and any figures/code attachments directly to this platform.\n4. The system will notify your coordinator and evaluator for evaluation.",
                    AuthorName = "System Seeder"
                },
                new KnowledgeBaseEntry
                {
                    Title = "Report Evaluation & Grading",
                    Category = "Report",
                    Content = "The evaluation process consists of the following steps:\n1. Initial Report Submission: Upload your report to the **Training Reports** section.\n2. Evaluation Meeting: The coordinator/evaluator will review your digital submission and schedule a meeting.\n3. Grade Assessment: You will receive your grade digitally in the system:\n   - **Accept**: Satisfactory. Your internship is complete.\n   - **Rewrite (Minor/Major)**: Corrections required. Make corrections and re-upload the revised report.\n   - **Defence**: Oral defence required. Meet your evaluator, then submit final corrections.\n   - **Reject**: Unsatisfactory. Course failed.",
                    AuthorName = "System Seeder"
                }
            };

            db.KnowledgeBaseEntries.AddRange(entries);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
