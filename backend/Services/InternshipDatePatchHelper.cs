using System.Globalization;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>PATCH gövdelerinde staj tarihlerini güvenli şekilde uygular (UTC gün).</summary>
public static class InternshipDatePatchHelper
{
    /// <summary>
    /// ISO yyyy-MM-dd veya tam ISO tarih. Boş veya null = alanı temizle.
    /// </summary>
    public static bool TryParseUtcDateOnly(string? raw, out DateTime? utcMidnight, out string? error)
    {
        utcMidnight = null;
        error = null;
        if (string.IsNullOrWhiteSpace(raw))
        {
            utcMidnight = null;
            return true;
        }

        var s = raw.Trim();
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
        {
            utcMidnight = DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc);
            return true;
        }

        error = "Internship dates must be valid dates (use yyyy-MM-dd).";
        return false;
    }

    public static bool TryApplyPair(
        Application application,
        string? startRaw,
        string? endRaw,
        out string? error)
    {
        error = null;
        if (!TryParseUtcDateOnly(startRaw, out var start, out error))
            return false;
        if (!TryParseUtcDateOnly(endRaw, out var end, out error))
            return false;

        if (start.HasValue && end.HasValue && end.Value.Date < start.Value.Date)
        {
            error = "Internship end date must be on or after the start date.";
            return false;
        }

        application.InternshipStartDate = start;
        application.InternshipEndDate = end;
        return true;
    }
}
