using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternshipManagement.API.Models
{
    public class LogbookEntry
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        public double HoursWorked { get; set; }
        public string? SupervisorFeedback { get; set; }
        public string? SupervisorId { get; set; }

        public string[]? Attachments { get; set; }

        // Foreign Key
        [Required]
        public string StudentId { get; set; } = string.Empty; // Refers to User.Id

        [ForeignKey("StudentId")]
        public User? Student { get; set; }
    }
}
