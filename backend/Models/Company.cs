using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace InternshipManagement.API.Models
{
    public class Company
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Name { get; set; } = string.Empty;

        public string Sector { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        
        public int PositionsOffered { get; set; }
        public double? AverageRating { get; set; }
        public bool Approved { get; set; } = false;

        public ICollection<Application>? Applications { get; set; }
    }
}
