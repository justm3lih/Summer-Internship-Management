using System.Text.Json;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>
/// SWEN yaz staj mektubu ders tablosundaki notlar ile portal staj uygunluğu (passed ≥ N kuralı).
/// N = appsettings <c>eligibility.requiredCourses</c> (varsayılan 5).
/// Sayım: <see cref="SummerTrainingCurriculum.DefaultRows"/> içindeki her ders kodu için Grade, geçen harf notlarından (A…D) ise +1.
/// <c>eligibility.semesterStart</c> / End ayarları şu an satır filtresi olarak kullanılmaz (yalnızca tablodaki şablon satırları).
/// </summary>
public static class ThirdYearEligibilityEvaluator
{
    private static readonly HashSet<string> PassingGrades = new(StringComparer.OrdinalIgnoreCase)
    {
        "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D",
    };

    public static bool IsCourseRowComplete(SummerTrainingCurriculum.CourseRow row)
    {
        var reg = SummerTrainingCurriculum.NormalizeRegistered(row.Registered);
        var g = row.Grade?.Trim() ?? "";

        if (string.Equals(reg, SummerTrainingCurriculum.RegisteredNotEnrolled, StringComparison.Ordinal)
            && string.IsNullOrWhiteSpace(g))
            return true;

        if (reg == "*" && string.Equals(g, "*", StringComparison.Ordinal))
            return true;

        if (!string.IsNullOrWhiteSpace(g) && !string.Equals(g, "*", StringComparison.Ordinal))
            return true;

        return false;
    }

    /// <summary>Müfredattaki her şablon satırı için anlamlı seçim yapılmış mı (not / bu dönem bekliyor / henüz alınmadı).</summary>
    public static bool AllGradesFilled(IReadOnlyList<SummerTrainingCurriculum.CourseRow> rows)
    {
        var byCode = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Code))
            .ToDictionary(r => r.Code.Trim(), r => r, StringComparer.OrdinalIgnoreCase);

        foreach (var template in SummerTrainingCurriculum.DefaultRows)
        {
            if (!byCode.TryGetValue(template.Code, out var row))
                return false;
            if (!IsCourseRowComplete(row))
                return false;
        }

        return true;
    }

    public static int CountPassingGrades(IReadOnlyList<SummerTrainingCurriculum.CourseRow> rows)
    {
        var byCode = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Code))
            .ToDictionary(r => r.Code.Trim(), r => r.Grade?.Trim() ?? "", StringComparer.OrdinalIgnoreCase);

        var n = 0;
        foreach (var template in SummerTrainingCurriculum.DefaultRows)
        {
            if (!byCode.TryGetValue(template.Code, out var g))
                continue;
            if (PassingGrades.Contains(g))
                n++;
        }

        return n;
    }

    public static void ApplyToStudent(User student, IReadOnlyList<SummerTrainingCurriculum.CourseRow> rows, int requiredThreshold)
    {
        var passed = CountPassingGrades(rows);
        student.PassedThirdYearCourses = passed;
        student.RequiredThirdYearCourses = requiredThreshold;
        student.EligibilityStatus = ComputeEligibilityStatus(passed, requiredThreshold);
        student.ThirdYearCourseGradesJson = BuildGradesJson(rows);
        student.TranscriptVerifiedAt = DateTime.UtcNow;
    }

    public static string BuildGradesJson(IReadOnlyList<SummerTrainingCurriculum.CourseRow> rows)
    {
        var byCode = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Code))
            .ToDictionary(r => r.Code.Trim(), r => r.Grade?.Trim() ?? "", StringComparer.OrdinalIgnoreCase);

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var template in SummerTrainingCurriculum.DefaultRows)
        {
            if (byCode.TryGetValue(template.Code, out var g) && !string.IsNullOrWhiteSpace(g))
                dict[template.Code] = g;
        }

        return JsonSerializer.Serialize(dict);
    }

    private static string ComputeEligibilityStatus(int passed, int requiredThreshold)
    {
        if (passed >= requiredThreshold)
            return "eligible";
        if (requiredThreshold > 0 && passed == requiredThreshold - 1)
            return "almost_eligible";
        return "not_eligible";
    }
}
