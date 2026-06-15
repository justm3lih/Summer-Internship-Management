namespace InternshipManagement.API.Models;

/// <summary>
/// Öğrenci acceptance letter Word çıktısı için portal üzerinden yazdığı isteğe bağlı metin alanları (JSON).
/// </summary>
public sealed class AcceptanceLetterPortalOverrides
{
    public string? StudentName { get; set; }
    public string? StudentId { get; set; }
    public string? Department { get; set; }
    public string? CurrentSemester { get; set; }
    public string? Semester { get; set; }
    public string? Cgpa { get; set; }
    public string? HomeAddress { get; set; }
    public string? HomeTelephone { get; set; }
    public string? MobileTelephone { get; set; }
    public string? AddressNorthCyprus { get; set; }
    public string? StudentEmail { get; set; }

    public string? CompanyName { get; set; }
    public string? CompanyFieldsOfWork { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyTelephone { get; set; }
    public string? CompanyFax { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyWebsite { get; set; }

    public string? TraineeJobTitle { get; set; }
    public string? TraineeJobOwnWords { get; set; }

    public string? SupervisorTitle { get; set; }
    public string? TraineeDepartmentOrDivision { get; set; }
    public string? SupervisorDepartmentOrDivision { get; set; }
    public string? SupervisorSpecialty { get; set; }
    public string? SupervisorAcademicDegrees { get; set; }
    public string? SupervisorGraduatedUniversity { get; set; }
    public string? SupervisorGraduationYear { get; set; }
    public string? SupervisorYearsInCompany { get; set; }
    public string? SupervisorYearsExperience { get; set; }

    public string? SupervisorName { get; set; }
    public string? SupervisorEmail { get; set; }

    public string? InternshipStartDate { get; set; }
    public string? InternshipEndDate { get; set; }

    public string? StudentSignatureDateSlash { get; set; }
    public string? TraineeSupervisorSignatureDateSlash { get; set; }
}
