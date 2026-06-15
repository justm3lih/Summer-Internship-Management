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
        /// Demo yeniden yüklenmez — sıfırdan veri girmek için.
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
        /// Admin kullanıcıları ve <see cref="AppSetting"/> kayıtları kalır; diğer tüm iş verisi silinir,
        /// ardından varsayılan demo kullanıcıları, şirketler ve örnek başvurular yeniden oluşturulur.
        /// </summary>
        public static async Task ResetDemoKeepingAdminAndReseedAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            await ClearOperationalDataKeepingAdminsAsync(db, cancellationToken);

            await EnsureSeedDemoUsersAsync(db, cancellationToken);
            await EnsureDemoStudentAdvisorLinkAsync(db, cancellationToken);
            await EnsureSeedCompaniesAsync(db, cancellationToken);
            await EnsureSeedApplicationsAsync(db, cancellationToken);
            await BackfillDefaultPermissionsAsync(db, cancellationToken);
            await BackfillCompanyIdsAsync(db, cancellationToken);
            await BackfillCompanyMembershipTierAsync(db, cancellationToken);
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

            await AddIfMissingAsync(new User
            {
                Email = "advisor@university.edu",
                Name = "Sam Advisor",
                Role = "advisor",
                Password = "advisor123",
                Permissions = System.Array.Empty<string>()
            });

            await AddIfMissingAsync(new User
            {
                Email = "student@university.edu",
                Name = "John Doe",
                Role = "student",
                Password = "student123",
                StudentId = "2021001",
                Department = "Computer Science",
                CurrentSemester = 7,
                EligibilityStatus = "eligible",
                PassedThirdYearCourses = 6,
                RequiredThirdYearCourses = 5,
                TranscriptVerifiedAt = DateTime.UtcNow.AddDays(-14)
            });

            await AddIfMissingAsync(new User
            {
                Email = "coordinator@university.edu",
                Name = "Jane Coordinator",
                Role = "coordinator",
                Password = "coordinator123",
                Permissions = Permissions.CoordinatorAll
            });

            await AddIfMissingAsync(new User
            {
                Email = "student2@university.edu",
                Name = "Jane Smith",
                Role = "student",
                Password = "student123",
                StudentId = "2021002",
                Department = "Computer Science",
                CurrentSemester = 7,
                EligibilityStatus = "eligible",
                PassedThirdYearCourses = 5,
                RequiredThirdYearCourses = 5,
                TranscriptVerifiedAt = DateTime.UtcNow.AddDays(-10)
            });

            await AddIfMissingAsync(new User
            {
                Email = "company@tech.com",
                Name = "Tech Solutions Inc.",
                Role = "company",
                Password = "company123",
                CompanyMembershipTier = CompanyPortalAccess.TierPrimary,
                Permissions = Permissions.CompanyAll
            });
        }

        /// <summary>Demo hesap john@ kullanıcısına atanmış advisor yoksa Sam Advisor bağlar.</summary>
        private static async Task EnsureDemoStudentAdvisorLinkAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var advisor = await db.Users.AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Role == "advisor" &&
                         u.Email == "advisor@university.edu",
                    cancellationToken);
            if (advisor == null)
                return;

            var demoStudent = await db.Users.FirstOrDefaultAsync(
                u => u.Role == "student" && u.Email == "student@university.edu",
                cancellationToken);

            if (demoStudent == null || !string.IsNullOrWhiteSpace(demoStudent.AdvisorUserId))
                return;

            demoStudent.AdvisorUserId = advisor.Id;
            await db.SaveChangesAsync(cancellationToken);
        }

        /// <summary>Hiç admin yoksa varsayılan demo admin ekler (sıfır kullanıcı seed akışı için).</summary>
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

        /// <summary>Gerekli örnek kullanıcıları, şirketleri ve başvuruları ekler.</summary>
        public static async Task EnsureSeedUsersAsync(AppDbContext db, CancellationToken cancellationToken = default)
        {
            if (!await db.Users.AnyAsync(cancellationToken))
            {
                await EnsureSeedDemoUsersAsync(db, cancellationToken);
                await EnsureSeedDefaultAdminIfMissingAsync(db, cancellationToken);
            }

            await EnsureDemoStudentAdvisorLinkAsync(db, cancellationToken);

            await EnsureSeedCompaniesAsync(db, cancellationToken);
            await EnsureSeedApplicationsAsync(db, cancellationToken);
            await BackfillDefaultPermissionsAsync(db, cancellationToken);
            await BackfillCompanyIdsAsync(db, cancellationToken);
            await BackfillCompanyMembershipTierAsync(db, cancellationToken);
            await EnsureSummerLetterCoordinatorPermissionAsync(db, cancellationToken);
            await EnsureSeedKnowledgeBaseAsync(db, cancellationToken);
        }

        /// <summary>Eski kurulumları günceller: yaz staj mektubu onay anahtarı portal kullanıcılarına eklenir.</summary>
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

        // CompanyId alanı eklendikten sonra: company rolündeki kullanıcıların ad eşleşmesiyle
        // şirket id'sini doldurur. Yeni kayıtlar register sırasında zaten id atar; bu metot
        // mevcut DB'leri ve seed verisini geriye dönük uyumlu hale getirir.
        private static async Task BackfillCompanyIdsAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var orphanCompanyUsers = await db.Users
                .Where(u => u.Role == "company" && string.IsNullOrEmpty(u.CompanyId))
                .ToListAsync(cancellationToken);

            if (orphanCompanyUsers.Count == 0)
                return;

            var companies = await db.Companies.ToListAsync(cancellationToken);
            var byName = companies
                .GroupBy(c => c.Name)
                .Where(g => g.Count() == 1)
                .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

            var changed = false;
            foreach (var user in orphanCompanyUsers)
            {
                if (byName.TryGetValue(user.Name, out var companyId))
                {
                    user.CompanyId = companyId;
                    changed = true;
                }
            }

            if (changed)
                await db.SaveChangesAsync(cancellationToken);
        }

        /// <summary>Mevcut şirket kullanıcılarına primary/staff tier atar (migration sonrası).</summary>
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

        // Migration'dan sonra var olan coordinator/company kullanıcılarının
        // yetki alanı boşsa, o role ait tüm yetkileri ata (bir kerelik upgrade).
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
                .Where(u => u.Role == "student")
                .OrderBy(u => u.StudentId)
                .Take(2)
                .ToListAsync(cancellationToken);

            var techSolutions = await db.Companies.FirstOrDefaultAsync(
                c => c.Name == "Tech Solutions Inc.",
                cancellationToken);

            if (students.Count == 0 || techSolutions == null)
                return;

            var applications = new List<Application>
            {
                new Application
                {
                    StudentId = students[0].Id,
                    CompanyId = techSolutions.Id,
                    Status = "pending",
                    AppliedDate = DateTime.UtcNow.AddDays(-5),
                    CvUrl = "/documents/sample-cv.pdf",
                    MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                    TranscriptUrl = "/documents/sample-transcript.pdf"
                }
            };

            if (students.Count > 1)
            {
                applications.Add(new Application
                {
                    StudentId = students[1].Id,
                    CompanyId = techSolutions.Id,
                    Status = "completed",
                    AppliedDate = DateTime.UtcNow.AddDays(-90),
                    CoordinatorPlacementApprovedAt = DateTime.UtcNow.AddDays(-85),
                    CompanyPlacementApprovedAt = DateTime.UtcNow.AddDays(-84),
                    InternshipStartDate = DateTime.UtcNow.AddDays(-60),
                    InternshipEndDate = DateTime.UtcNow.AddDays(-3),
                    CvUrl = "/documents/sample-cv.pdf",
                    MotivationLetterUrl = "/documents/sample-motivation-letter.pdf",
                    TranscriptUrl = "/documents/sample-transcript.pdf",
                    CoordinatorComments = "Student meets the internship eligibility requirements.",
                    CompanyComments = "Application reviewed positively by the company.",
                    AcceptanceLetterUrl = "/documents/demo-summer-acceptance-letter.pdf",
                    AcceptanceLetterSubmittedAt = DateTime.UtcNow.AddDays(-12),
                    AcceptanceLetterVerifiedAt = DateTime.UtcNow.AddDays(-11)
                });
            }

            db.Applications.AddRange(applications);
            await db.SaveChangesAsync(cancellationToken);
        }

        private static async Task EnsureSeedKnowledgeBaseAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            // Remove previous system seeded rules so we can update them with system-integrated descriptions
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
