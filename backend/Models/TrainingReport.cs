using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models;

/// <summary>SWEN300 summer training report — portal içeriği + dolu Word (.docx) üretimi.</summary>
public class TrainingReport
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ApplicationId { get; set; } = string.Empty;

    [ForeignKey(nameof(ApplicationId))]
    public Application? Application { get; set; }

    [Required]
    public string StudentId { get; set; } = string.Empty;

    [ForeignKey(nameof(StudentId))]
    public User? Student { get; set; }

    /// <summary>draft | submitted | revision_requested | approved</summary>
    [Required]
    public string Status { get; set; } = "draft";

    /// <summary>JSON: metin alanları, dinamik başlıklar, referans dizisi.</summary>
    [Required]
    public string ContentJson { get; set; } = "{}";

    public string? CoordinatorFeedback { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public string? ApprovedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TrainingReportFigure> Figures { get; set; } = new List<TrainingReportFigure>();

    public ICollection<TrainingReportSubmissionSnapshot> SubmissionSnapshots { get; set; } =
        new List<TrainingReportSubmissionSnapshot>();
}
