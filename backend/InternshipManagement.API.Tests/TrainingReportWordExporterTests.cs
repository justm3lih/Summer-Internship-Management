using System.IO.Compression;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

using Xunit;

namespace InternshipManagement.API.Tests;

public class TrainingReportWordExporterTests
{
    private static string BackendDirectory =>
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));

    private static string TemplatePath =>
        Path.Combine(BackendDirectory, "Templates", "SWEN300_REPORT_TEMPLATE_2022_v1.docx");

    [Fact]
    public void MergeDocument_WithCiTemplate_ProducesValidDocxWithMergedContent()
    {
        Assert.True(File.Exists(TemplatePath), $"Şablon bulunamadı: {TemplatePath}");

        var templateBytes = File.ReadAllBytes(TemplatePath);

        var company = new Company
        {
            Id = "co-test",
            Name = "Test Company Ltd.",
            Address = "Test Address 1",
            Phone = "+1 555 0100",
            Website = "https://example.test",
        };

        var student = new User
        {
            Id = "st-test",
            Name = "Test Student",
            Email = "test@university.edu",
            Role = "student",
            StudentId = "20998877",
        };

        var application = new Application
        {
            Id = "app-test",
            Status = "completed",
            StudentId = student.Id,
            Student = student,
            CompanyId = company.Id,
            Company = company,
            InternshipStartDate = new DateTime(2025, 6, 15, 0, 0, 0, DateTimeKind.Utc),
            InternshipEndDate = new DateTime(2025, 8, 20, 0, 0, 0, DateTimeKind.Utc),
        };

        var content = new TrainingReportContentDto
        {
            Introduction = "SWEN300 otomatik test — introduction paragrafı.",
            CompanyIntro = "SWEN300 otomatik test — şirket girişi.",
            Company21 = "SWEN300 — 2.1 gövdesi.",
            Company22 = "SWEN300 — 2.2 gövdesi.",
            WorkExperienceIntro = "SWEN300 — work experience giriş.",
            ProblemDefinition = "SWEN300 — problem tanımı.",
            WorkDoneIntro = "SWEN300 — work done giriş.",
            Task1Title = "Test görev 1",
            Task1Body = "SWEN300 — görev 1 gövdesi.",
            Task2Title = "Test görev 2",
            Task2Body = "SWEN300 — görev 2 gövdesi.",
            Limitations = "SWEN300 — limitations.",
            RecentTopics = "SWEN300 — recent topics.",
            Conclusion = "SWEN300 — conclusion.",
            Appendix = "SWEN300 — appendix.",
            References = ["SWEN300 Test Kaynak 2026.", "İkinci örnek kaynak."],
            DynamicSections =
            [
                new TrainingReportDynamicSectionDto
                {
                    OutlineNumber = "3.2.9",
                    Title = "Otomatik test dinamik başlık",
                    Body = "Dinamik bölüm gövdesi.",
                },
            ],
        };

        var scalars = TrainingReportWordExporter.BuildMergeDictionary(application, student, company, content);

        var png = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        using var figStream = new MemoryStream(png);
        var figures = new List<(Stream PngStream, string Caption)>
        {
            (figStream, "Test şekil"),
        };

        var docBytes = TrainingReportWordExporter.MergeDocument(templateBytes, scalars, figures);

        Assert.NotNull(docBytes);
        Assert.True(docBytes.Length > 8000, $"Çıktı çok küçük: {docBytes.Length} bayt");

        using var zip = new ZipArchive(new MemoryStream(docBytes), ZipArchiveMode.Read, leaveOpen: false);
        var entry = zip.GetEntry("word/document.xml");
        Assert.NotNull(entry);

        using var reader = new StreamReader(entry!.Open());
        var xml = reader.ReadToEnd();
        Assert.Contains("SWEN300 otomatik test — introduction", xml, StringComparison.Ordinal);
        Assert.Contains("20998877", xml, StringComparison.Ordinal);
        Assert.Contains("Test Company Ltd.", xml, StringComparison.Ordinal);
        Assert.Contains("Otomatik test dinamik başlık", xml, StringComparison.Ordinal);
    }
}
