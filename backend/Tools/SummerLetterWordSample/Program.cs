using System.Text.Json;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

// Demo summer letter Word (.docx) without DB/API. Default output: %TEMP%/summer_letter_TEST_SAMPLE_<utc>.docx (or pass path as arg).

var templatesDir = Path.GetFullPath(
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "Templates"));
var templateFile = Path.Combine(templatesDir, "SWEN300_APPLICATION_LETTER_2025.docx");
var outPath = args.Length > 0
    ? Path.GetFullPath(args[0])
    : Path.Combine(Path.GetTempPath(), $"summer_letter_TEST_SAMPLE_{DateTime.UtcNow:yyyyMMdd_HHmmss}.docx");

if (!File.Exists(templateFile))
{
    Console.Error.WriteLine("Template missing: " + templateFile);
    return 1;
}

var rows = SummerTrainingCurriculum.DefaultRows.Select((r, i) =>
    new SummerTrainingCurriculum.CourseRow(
        r.Code,
        r.Name,
        i % 4 == 0 ? "Fall 2025"
            : i % 4 == 1 ? "Yes"
                : i % 4 == 2 ? "Spring 2026"
                    : "",
        i % 6 == 0 ? "BB" : i % 6 == 1 ? "*" : "")).ToList();

var letter = new SummerTrainingApplicationLetter
{
    Id = "demo-letter-sample",
    StudentId = "demo-student-sample",
    AcademicPeriodKey = "2026-summer",
    Status = SummerTrainingLetterStatuses.Approved,
    StudentElectronicAcceptanceAt = DateTime.UtcNow.AddDays(-3),
    SubmittedToAdvisorAt = DateTime.UtcNow.AddDays(-2),
    AdvisorApprovedAt = DateTime.UtcNow.AddDays(-1).AddHours(-3),
    AdvisorRejectedAt = null,
    AdvisorComments = "(Test) Advisor comment — sample only.",
    CoordinatorApprovedAt = DateTime.UtcNow.AddHours(-6),
    CoordinatorRejectedAt = null,
    CoordinatorComments = "(Test) Coordinator comment — sample only.",
    CoordinatorApproverName = "Dr. Nesli Sample (Koordinatör)",
    CourseRowsJson = JsonSerializer.Serialize(rows),
};

var student = new User
{
    Id = "demo-student-sample",
    Email = "ali.tester@students.example.edu.tr",
    Name = "Ali Tester Yilmaz",
    Role = "student",
    StudentId = "202401234",
    Department = "Software Engineering",
    CurrentSemester = 6,
    Cgpa = 3.52,
    HomeAddress = "123 Example Street, Lefkosia",
    HomeTelephone = "+90 392 555 0101",
    MobileTelephone = "+90 533 111 2233",
    AddressNorthCyprus = "CIU Campus, KKTC",
};

var advisor = new User
{
    Id = "demo-advisor-sample",
    Role = "advisor",
    Name = "Dr. Mentor Advisor",
    Email = "mentor.advisor@example.edu.tr",
};

var configuredPeriodKey = "2026-summer";
var values = SummerApplicationLetterWordTemplateValues.Build(
    student,
    advisor,
    letter,
    configuredPeriodKey);

var tplBytes = await File.ReadAllBytesAsync(templateFile);
var merged = SummerApplicationLetterWordExporter.MergeTemplate(tplBytes, values);
await File.WriteAllBytesAsync(outPath, merged);

Console.WriteLine("Wrote: " + Path.GetFullPath(outPath));
return 0;
