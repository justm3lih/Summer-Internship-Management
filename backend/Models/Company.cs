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

        /// <summary>Şirket adresi (logbook Word); boşsa Location kullanılabilir.</summary>
        public string Address { get; set; } = string.Empty;

        public string Location { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        /// <summary>Çalışma alanı / iş kolları (Word şablonda Sector yerine veya ek olarak).</summary>
        public string FieldsOfWork { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;
        public string Fax { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string Website { get; set; } = string.Empty;
        
        public int PositionsOffered { get; set; }
        public double? AverageRating { get; set; }
        public bool Approved { get; set; } = false;

        public ICollection<Application>? Applications { get; set; }
    }
}
