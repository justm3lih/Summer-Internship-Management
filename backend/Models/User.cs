using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    public class User
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty; // student, coordinator, company, admin, advisor

        public string? Password { get; set; } // Plain text for demo; use hash in production

        // Student specific fields (can be null for others)
        public string? StudentId { get; set; }
        public string? Department { get; set; }
        public int? CurrentSemester { get; set; }

        /// <summary>Logbook Word şablonu: CGPA (örn. 3.45).</summary>
        public double? Cgpa { get; set; }

        public string? HomeAddress { get; set; }
        public string? HomeTelephone { get; set; }
        public string? MobileTelephone { get; set; }
        public string? AddressNorthCyprus { get; set; }

        public string? Photo { get; set; }
        public string? EligibilityStatus { get; set; }
        public int? PassedThirdYearCourses { get; set; }
        public int? RequiredThirdYearCourses { get; set; }
        public DateTime? TranscriptVerifiedAt { get; set; }

        /// <summary>
        /// Transcript uygunluk sayfasından kaydedilen ders kodu → harf notu (JSON). Yaz staj başvuru mektubu tablosundaki Grade ile paylaşılır.
        /// </summary>
        public string? ThirdYearCourseGradesJson { get; set; }

        // Company kullanıcılarının ait oldukları şirketin id'si (sadece "company" rolü için anlamlı)
        public string? CompanyId { get; set; }

        /// <summary>
        /// Şirket portalı: "primary" ana hesap (stajyer ataması yapar), "staff" alt kullanıcı (yalnızca kendine atanan stajyerler).
        /// Null veya boş: geriye dönük uyumluluk için primary kabul edilir.
        /// </summary>
        public string? CompanyMembershipTier { get; set; }

        /// <summary>Staff hesabını oluşturan ana şirket kullanıcısının Id'si (sadece tier=staff için).</summary>
        public string? ManagedByCompanyUserId { get; set; }

        /// <summary>Öğrencinin danışmanı (User.Id, Role advisor). Yaz staj başvuru mektubu bu kullanıcının sırasına düşer.</summary>
        public string? AdvisorUserId { get; set; }

        /// <seealso cref="AdvisorUserId"/>
        [ForeignKey("AdvisorUserId")]
        public User? AdvisorUser { get; set; }

        // Rol içindeki granüler yetkiler (ör. "applications.review", "companies.manage")
        public string[]? Permissions { get; set; }

        // Navigation Properties for Student
        public ICollection<Application>? Applications { get; set; }
        public ICollection<LogbookEntry>? LogbookEntries { get; set; }
        public FinalReport? FinalReport { get; set; }
        public ICollection<Notification>? Notifications { get; set; }
    }
}
