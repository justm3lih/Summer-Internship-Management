namespace InternshipManagement.API.Authorization
{
    // Sistem genelindeki yetki anahtarlarını tek yerde tutar
    public static class Permissions
    {
        // Coordinator yetkileri
        public const string CoordApplicationsView = "applications.view";
        public const string CoordApplicationsReview = "applications.review";
        public const string CoordApplicationsComment = "applications.comment";
        public const string CoordApplicationsBulk = "applications.bulk";
        /// <summary>Şirket onayından bağımsız staj başlangıç/bitiş tarihlerini düzeltebilir (Word / kayıt).</summary>
        public const string CoordApplicationsInternshipOverride = "applications.internship.override";
        public const string CoordStudentsView = "students.view";
        public const string CoordCompaniesView = "companies.view";
        public const string CoordCompaniesAdd = "companies.add";
        public const string CoordCompaniesApprove = "companies.approve";
        public const string CoordCompaniesEdit = "companies.edit";
        public const string CoordKnowledgeView = "knowledge.view";
        public const string CoordKnowledgeManage = "knowledge.manage";
        public const string CoordReportsReview = "reports.review";

        /// <summary>Yazlık / SWEN başvuru mektubu: koordinatör onayı (danışmandan sonra).</summary>
        public const string CoordSummerTrainingLettersReview = "summer-letter.review";

        /// <summary>SWEN300 training report: görüntüleme ve revizyon talebi (nihai onay <see cref="CoordReportsReview"/>).</summary>
        public const string TrainingReportReview = "training-report.review";

        // Company yetkileri
        public const string CompanyApplicationsView = "applications.view";
        public const string CompanyApplicationsReview = "applications.review";
        public const string CompanyApplicationsComment = "applications.comment";
        public const string CompanyInternsView = "interns.view";
        public const string CompanyLogbookView = "logbook.view";
        public const string CompanyLogbookFeedback = "logbook.feedback";
        public const string CompanyReportsView = "reports.view";
        public const string CompanyReportsReview = "reports.review";

        // Rol bazlı tüm tanımlı yetkiler
        public static readonly string[] CoordinatorAll = new[]
        {
            CoordApplicationsView,
            CoordApplicationsReview,
            CoordApplicationsComment,
            CoordApplicationsBulk,
            CoordApplicationsInternshipOverride,
            CoordStudentsView,
            CoordCompaniesView,
            CoordCompaniesAdd,
            CoordCompaniesApprove,
            CoordCompaniesEdit,
            CoordKnowledgeView,
            CoordKnowledgeManage,
            CoordReportsReview,
            CoordSummerTrainingLettersReview,
        };

        public static readonly string[] CompanyAll = new[]
        {
            CompanyApplicationsView,
            CompanyApplicationsReview,
            CompanyApplicationsComment,
            CompanyInternsView,
            CompanyLogbookView,
            CompanyLogbookFeedback,
            CompanyReportsView,
            CompanyReportsReview,
        };

        // Rol için geçerli olan yetki kümesini verir (filtreleme/doğrulama için)
        public static string[] GetAllForRole(string role)
        {
            return role switch
            {
                "coordinator" => CoordinatorAll,
                "company" => CompanyAll,
                _ => System.Array.Empty<string>()
            };
        }

        // Bir kullanıcının verilen yetkiye sahip olup olmadığını döner
        public static bool Has(Models.User user, string permission)
        {
            if (user.Role == "admin") return true;
            if (user.Permissions == null || user.Permissions.Length == 0) return false;
            return System.Linq.Enumerable.Contains(user.Permissions, permission);
        }
    }
}
