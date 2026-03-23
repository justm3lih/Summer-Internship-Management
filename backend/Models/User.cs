using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

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
        public string Role { get; set; } = string.Empty; // "student", "coordinator", "company", "admin"

        public string? Password { get; set; } // Plain text for demo; use hash in production

        // Student specific fields (can be null for others)
        public string? StudentId { get; set; }
        public string? Department { get; set; }
        public int? CurrentSemester { get; set; }
        public string? Photo { get; set; }

        // Navigation Properties for Student
        public ICollection<Course>? Courses { get; set; }
        public ICollection<Application>? Applications { get; set; }
        public ICollection<LogbookEntry>? LogbookEntries { get; set; }
        public FinalReport? FinalReport { get; set; }
    }
}
