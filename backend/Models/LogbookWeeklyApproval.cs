using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models;

/// <summary>
/// Şirket süpervizörünün bir öğrenci için ISO haftası (Pazartesi başlangıç UTC) onayı.
/// </summary>
public class LogbookWeeklyApproval
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string StudentId { get; set; } = string.Empty;

    [ForeignKey("StudentId")]
    public User? Student { get; set; }

    /// <summary>Haftanın Pazartesi tarihi (UTC, saat 00:00).</summary>
    [Required]
    public DateTime WeekStartUtc { get; set; }

    public DateTime ApprovedAtUtc { get; set; }

    [Required]
    public string ApprovedByUserId { get; set; } = string.Empty;

    public string? Notes { get; set; }
}
