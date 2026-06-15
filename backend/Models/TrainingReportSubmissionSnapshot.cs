using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models;

/// <summary>Onaya gönderim anlık görüntüsü; rapor başına en fazla 2 kayıt tutulur.</summary>
public class TrainingReportSubmissionSnapshot
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string TrainingReportId { get; set; } = string.Empty;

    [ForeignKey(nameof(TrainingReportId))]
    public TrainingReport? TrainingReport { get; set; }

    [Required]
    public string PayloadJson { get; set; } = "{}";

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
