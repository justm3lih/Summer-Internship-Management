using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    /// <summary>Yazılık / summer training başvuru mektubu; danışman ve koordinatör onayından sonra staj başvurusuna izin verilir.</summary>
    public class SummerTrainingApplicationLetter
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string StudentId { get; set; } = string.Empty;

        [ForeignKey("StudentId")]
        public User? Student { get; set; }

        /// <summary>Yapılandırmadaki akademik / yaz dönemi anahtarı (örn. "2026-summer"). Öğrenci başına dönemde tek kayıt.</summary>
        [Required]
        [MaxLength(64)]
        public string AcademicPeriodKey { get; set; } = string.Empty;

        /// <summary>draft → advisor_pending → coordinator_pending → approved; rejected durumlarında öğrenci düzeltebilir.</summary>
        [Required]
        [MaxLength(32)]
        public string Status { get; set; } = "draft";

        /// <summary>Öğrencinin şartlar + elektronik onay zamanı (“imza yerine”).</summary>
        public DateTime? StudentElectronicAcceptanceAt { get; set; }

        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;

        public DateTime? SubmittedToAdvisorAt { get; set; }
        public DateTime? AdvisorApprovedAt { get; set; }
        public DateTime? AdvisorRejectedAt { get; set; }
        public string? AdvisorComments { get; set; }

        public DateTime? CoordinatorApprovedAt { get; set; }
        public DateTime? CoordinatorRejectedAt { get; set; }
        public string? CoordinatorComments { get; set; }

        /// <summary>Koordinatör onayı yapan kullanıcı adının anlık kopyası (Word imza satırı).</summary>
        [MaxLength(256)]
        public string? CoordinatorApproverName { get; set; }

        /// <summary>SWEN müfredat tablosundaki satırlar (JSON).</summary>
        public string CourseRowsJson { get; set; } = "[]";
    }

    public static class SummerTrainingLetterStatuses
    {
        public const string Draft = "draft";
        public const string AdvisorPending = "advisor_pending";
        public const string AdvisorRejected = "advisor_rejected";
        public const string CoordinatorPending = "coordinator_pending";
        public const string CoordinatorRejected = "coordinator_rejected";
        public const string Approved = "approved";
    }
}
