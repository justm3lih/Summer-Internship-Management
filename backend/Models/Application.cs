using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    public class Application
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Status { get; set; } = "pending"; // "not_applied", "pending", "approved", "rejected", "ongoing", "completed"

        public DateTime AppliedDate { get; set; } = DateTime.UtcNow;

        /// <summary>Üniversite koordinatörünün yerleşimi onayladığı an (UTC). Şirket onayından bağımsız.</summary>
        public DateTime? CoordinatorPlacementApprovedAt { get; set; }

        /// <summary>Şirketin stajyeri kabul ettiği an (UTC). Koordinatör onayından bağımsız.</summary>
        public DateTime? CompanyPlacementApprovedAt { get; set; }

        // Document URLs
        public string? CvUrl { get; set; }
        public string? MotivationLetterUrl { get; set; }
        public string? TranscriptUrl { get; set; }

        public string? CoordinatorComments { get; set; }
        public string? CompanyComments { get; set; }

        // Foreign Keys
        [Required]
        public string StudentId { get; set; } = string.Empty; // Refers to User.Id
        [ForeignKey("StudentId")]
        public User? Student { get; set; }

        [Required]
        public string CompanyId { get; set; } = string.Empty;
        [ForeignKey("CompanyId")]
        public Company? Company { get; set; }

        /// <summary>
        /// Şirket içi süpervizör/koordinatör kullanıcı (User.Id, Role=company). Null ise yalnızca ana şirket hesabı tüm stajyerleri görür; staff kullanıcıları bu başvuruyu görmez.
        /// </summary>
        public string? CompanySupervisorUserId { get; set; }

        /// <summary>Word şablonu: staj başlangıç (UTC tarih, saat yok).</summary>
        public DateTime? InternshipStartDate { get; set; }

        /// <summary>Word şablonu: staj bitiş (UTC tarih).</summary>
        public DateTime? InternshipEndDate { get; set; }

        /// <summary>Logbook Word: stajyerin iş/unvan tanımı.</summary>
        public string? TraineeJobTitle { get; set; }

        /// <summary>Logbook Word — “Trainee’s Job Details”: stajyerin işi kendi cümleleriyle (Daily Work Log bölümü).</summary>
        [MaxLength(8000)]
        public string? TraineeJobOwnWords { get; set; }

        /// <summary>Logbook Word: şirket süpervizörünün ünvanı.</summary>
        public string? SupervisorTitle { get; set; }

        /// <summary>Word: şirkette çalıştığı birim (HR onay paragrafı “department/division”).</summary>
        public string? TraineeDepartmentOrDivision { get; set; }

        /// <summary>Word: süpervizörün şirketteki birimi.</summary>
        public string? SupervisorDepartmentOrDivision { get; set; }

        /// <summary>Word: süpervizör uzmanlık alanı.</summary>
        public string? SupervisorSpecialty { get; set; }

        /// <summary>Word: akademik dereceler (serbest metin).</summary>
        public string? SupervisorAcademicDegrees { get; set; }

        /// <summary>Word: mezun olunan üniversite.</summary>
        public string? SupervisorGraduatedUniversity { get; set; }

        /// <summary>Word: mezuniyet yılı veya kısa metin.</summary>
        public string? SupervisorGraduationYear { get; set; }

        /// <summary>Word: şirkette çalışma süresi (örn. “5 years”).</summary>
        public string? SupervisorYearsInCompany { get; set; }

        /// <summary>Word: toplam mesleki deneyim (serbest metin).</summary>
        public string? SupervisorYearsExperience { get; set; }

        /// <summary>Logbook Word — süpervizör: genel performans ve staj süresine ilişkin görüşler (koordinatöre gönderim sonrası doldurulur).</summary>
        [MaxLength(8000)]
        public string? SupervisorOverallPerformanceObservations { get; set; }

        /// <summary>Logbook Word — süpervizör: CIU’ya öğrenciye ilişkin öneriler.</summary>
        [MaxLength(8000)]
        public string? SupervisorSuggestionsToUniversityAboutTrainee { get; set; }

        /// <summary>Trainee's Evaluation — Program Outcomes 0–4 (null = seçilmedi).</summary>
        public int? SupervisorEvalPo1 { get; set; }
        public int? SupervisorEvalPo2 { get; set; }
        public int? SupervisorEvalPo3 { get; set; }
        public int? SupervisorEvalPo4 { get; set; }
        public int? SupervisorEvalPo5 { get; set; }
        public int? SupervisorEvalPo6 { get; set; }
        public int? SupervisorEvalPo7 { get; set; }
        public int? SupervisorEvalPo8 { get; set; }
        public int? SupervisorEvalPo9 { get; set; }
        public int? SupervisorEvalPo10 { get; set; }
        public int? SupervisorEvalPo11 { get; set; }

        /// <summary>Summer training self-eval (trainee): 12 madde (UI/Word numarası 1–12 ardışık); şablonda TraineeSummerSelfEval1…12.</summary>
        public int? TraineeSummerSelfEval1 { get; set; }
        public int? TraineeSummerSelfEval2 { get; set; }
        public int? TraineeSummerSelfEval3 { get; set; }
        public int? TraineeSummerSelfEval4 { get; set; }
        public int? TraineeSummerSelfEval5 { get; set; }
        public int? TraineeSummerSelfEval6 { get; set; }
        public int? TraineeSummerSelfEval7 { get; set; }
        public int? TraineeSummerSelfEval8 { get; set; }
        public int? TraineeSummerSelfEval9 { get; set; }
        public int? TraineeSummerSelfEval10 { get; set; }
        public int? TraineeSummerSelfEval11 { get; set; }
        public int? TraineeSummerSelfEval12 { get; set; }

        /// <summary>Öğrenci günlük logbook kayıtlarını bitirip şirket yetkilisine değerlendirmesi için gönderdiği an.</summary>
        public DateTime? LogbookSubmittedToSupervisorAt { get; set; }

        /// <summary>Şirket yetkilisi logbook değerlendirmesini (PO & Observations) tamamlayıp öğrenciye gönderdiği an.</summary>
        public DateTime? SupervisorEvaluationCompletedAt { get; set; }

        /// <summary>Öğrenci staj + logbook + self eval sürecini tamamlayıp son onayı için üniversite koordinatörüne gönderdiği an.</summary>
        public DateTime? LogbookSubmittedForCoordinatorReviewAt { get; set; }

        /// <summary>Üniversite koordinatörünün staj logbook'unu tam haliyle inceleyip son onayı verdiği an.</summary>
        public DateTime? LogbookVerifiedByCoordinatorAt { get; set; }

        /// <summary>Summer training acceptance letter (imzalı tarama/PDF); öğrenci yükler — <c>/api/files/{{id}}</c>.</summary>
        public string? AcceptanceLetterUrl { get; set; }

        /// <summary>Öğrencinin acceptance letter dosyasını sisteme son yüklediği an (UTC).</summary>
        public DateTime? AcceptanceLetterSubmittedAt { get; set; }

        /// <summary>Koordinatör imzalı belgeyi kontrol edip onayladığında set edilir; logbook kapısı.</summary>
        public DateTime? AcceptanceLetterVerifiedAt { get; set; }

        /// <summary>Koordinatör reddi veya not metni.</summary>
        [MaxLength(2000)]
        public string? AcceptanceLetterCoordinatorComments { get; set; }

        /// <summary>
        /// Öğrencinin acceptance letter Word şablonundaki alanları portaldan girdiği JSON (MiniWord anahtarlarıyla uyumlu).
        /// </summary>
        public string? AcceptanceLetterPortalJson { get; set; }

        /// <summary>SWEN300 training report (staj completed sonrası).</summary>
        public TrainingReport? TrainingReport { get; set; }
    }
}
