using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>
/// Yazlık başvuru mektubu .docx etiketleri (MiniWord SaveAsByTemplate).
/// </summary>
public static class SummerApplicationLetterWordTemplateValues
{
    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    private static string SanitizeWordInline(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        var sb = new System.Text.StringBuilder(text.Length);
        foreach (var ch in text.ReplaceLineEndings(" "))
        {
            if (char.IsControl(ch))
                sb.Append(' ');
            else
                sb.Append(ch);
        }

        return Regex.Replace(sb.ToString().Trim(), @"\s+", " ");
    }

    private static string DashIfEmpty(string? text)
    {
        var s = SanitizeWordInline(text);
        return string.IsNullOrEmpty(s) ? "—" : s;
    }

    private static string FormatCgpa(double? cgpa)
    {
        if (!cgpa.HasValue) return "—";
        return cgpa.Value.ToString("0.##", CultureInfo.InvariantCulture);
    }

    private static string IsoOrDash(DateTime? utc)
    {
        if (!utc.HasValue) return "—";
        return utc.Value.ToUniversalTime().ToString("yyyy-MM-dd HH:mm 'UTC'");
    }


    /// <summary>
    /// Gösterilebilir akademik yıl etiketi (örn. 2026-summer → Summer 2026).
    /// </summary>
    public static string FormatAcademicPeriodLabel(string academicPeriodKey)
    {
        var k = academicPeriodKey.Trim();
        var m = Regex.Match(k, @"^(\d{4})[\-_](?<s>spring|summer|fall|winter)\s*$", RegexOptions.IgnoreCase);
        if (m.Success)
        {
            var year = m.Groups[1].Value;
            var sea = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(m.Groups["s"].Value.ToLowerInvariant());
            return $"{sea} {year}";
        }

        return string.IsNullOrEmpty(k) ? "—" : k;
    }

    public static Dictionary<string, object> Build(
        User student,
        User? advisor,
        SummerTrainingApplicationLetter letter,
        string configuredPeriodKey)
    {
        List<SummerTrainingCurriculum.CourseRow> rows;
        try
        {
            rows = JsonSerializer.Deserialize<List<SummerTrainingCurriculum.CourseRow>>(
                       letter.CourseRowsJson,
                       JsonOptions)
                   ?? SummerTrainingCurriculum.DefaultRows.ToList();
        }
        catch
        {
            rows = SummerTrainingCurriculum.DefaultRows.ToList();
        }

        rows = rows.Select(SummerTrainingCurriculum.WithNormalizedRegistered).ToList();

        var courseTable = rows.Select(r => new Dictionary<string, object>
        {
            ["Code"] = SanitizeWordInline(r.Code),
            ["Name"] = SanitizeWordInline(r.Name),
            ["Registered"] = DashIfEmpty(r.Registered),
            ["Grade"] = DashIfEmpty(r.Grade),
        }).ToList();

        var semesterText = student.CurrentSemester.HasValue
            ? student.CurrentSemester.Value.ToString(CultureInfo.InvariantCulture)
            : "—";

        var advisorName = SanitizeWordInline(advisor?.Name);

        var values = new Dictionary<string, object>
        {
            ["StudentName"] = SanitizeWordInline(student.Name),
            ["StudentId"] = SanitizeWordInline(student.StudentId),
            ["Department"] = DashIfEmpty(student.Department),
            ["CurrentSemester"] = semesterText,
            ["Semester"] = semesterText,
            ["Cgpa"] = FormatCgpa(student.Cgpa),
            ["HomeAddress"] = DashIfEmpty(student.HomeAddress),
            ["HomeTelephone"] = DashIfEmpty(student.HomeTelephone),
            ["MobileTelephone"] = DashIfEmpty(student.MobileTelephone),
            ["AddressNorthCyprus"] = DashIfEmpty(student.AddressNorthCyprus),
            ["StudentEmail"] = DashIfEmpty(student.Email),
            ["AdvisorName"] = string.IsNullOrEmpty(advisorName) ? "—" : advisorName,
            ["AcademicPeriodKey"] = DashIfEmpty(letter.AcademicPeriodKey),
            ["AcademicPeriodLabel"] = FormatAcademicPeriodLabel(letter.AcademicPeriodKey),
            ["ConfiguredSummerPeriodKey"] = DashIfEmpty(configuredPeriodKey.Trim()),
            ["LetterStatus"] = SanitizeWordInline(letter.Status),
            ["StudentElectronicAcceptanceAt"] = IsoOrDash(letter.StudentElectronicAcceptanceAt),
            ["ElectronicAcceptanceMark"] = letter.StudentElectronicAcceptanceAt.HasValue ? "\u2713" : "",
            ["SubmittedToAdvisorAt"] = IsoOrDash(letter.SubmittedToAdvisorAt),
            ["AdvisorApprovedAt"] = IsoOrDash(letter.AdvisorApprovedAt),
            ["AdvisorRejectedAt"] = IsoOrDash(letter.AdvisorRejectedAt),
            ["AdvisorComments"] = DashIfEmpty(letter.AdvisorComments),
            ["CoordinatorApprovedAt"] = IsoOrDash(letter.CoordinatorApprovedAt),
            ["CoordinatorRejectedAt"] = IsoOrDash(letter.CoordinatorRejectedAt),
            ["CoordinatorComments"] = DashIfEmpty(letter.CoordinatorComments),
            ["CoordinatorName"] = DashIfEmpty(letter.CoordinatorApproverName),
            ["ExportDate"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture),
            ["CourseTable"] = courseTable,
        };

        return values;
    }
}
