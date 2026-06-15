using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models;

public class TrainingReportFigure
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string TrainingReportId { get; set; } = string.Empty;

    [ForeignKey(nameof(TrainingReportId))]
    public TrainingReport? TrainingReport { get; set; }

    /// <summary><see cref="UploadedFile.Id"/> — PNG, category training_report_figure.</summary>
    [Required]
    public string FileId { get; set; } = string.Empty;

    [Required]
    public string Caption { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
