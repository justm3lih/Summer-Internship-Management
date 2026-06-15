using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

public static class AcceptanceLetterPortalMerge
{
    private static readonly JsonSerializerOptions ReadOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    private static readonly JsonSerializerOptions WriteOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static AcceptanceLetterPortalOverrides? DeserializePortal(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<AcceptanceLetterPortalOverrides>(json, ReadOpts);
        }
        catch
        {
            return null;
        }
    }

    public static AcceptanceLetterPortalOverrides? Normalize(AcceptanceLetterPortalOverrides? o)
    {
        if (o == null) return null;
        var n = new AcceptanceLetterPortalOverrides();
        foreach (var prop in typeof(AcceptanceLetterPortalOverrides).GetProperties(
                     BindingFlags.Public | BindingFlags.Instance))
        {
            var raw = prop.GetValue(o) as string;
            if (string.IsNullOrWhiteSpace(raw))
                prop.SetValue(n, null);
            else
                prop.SetValue(n, raw.Trim());
        }

        return n;
    }

    public static string? SerializeForStorage(AcceptanceLetterPortalOverrides? o)
    {
        var normalized = Normalize(o);
        if (normalized == null || IsEffectivelyEmpty(normalized)) return null;
        return JsonSerializer.Serialize(normalized, WriteOpts);
    }

    private static bool IsEffectivelyEmpty(AcceptanceLetterPortalOverrides o)
    {
        foreach (var prop in typeof(AcceptanceLetterPortalOverrides).GetProperties(
                     BindingFlags.Public | BindingFlags.Instance))
        {
            if (prop.GetValue(o) is string s && !string.IsNullOrWhiteSpace(s))
                return false;
        }

        return true;
    }

    private static DateTime? TryParsePortalIsoDate(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var t = s.Trim();
        if (DateTime.TryParseExact(
                t,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var d))
            return DateTime.SpecifyKind(d, DateTimeKind.Utc);

        if (DateTime.TryParse(t, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var d2))
            return DateTime.SpecifyKind(d2.Date, DateTimeKind.Utc);

        return null;
    }

    /// <summary>
    /// Öğrenci portal kaydı varsa şablon değerlerinin üzerine yazar; tarih alanları yeniden hesaplanır.
    /// </summary>
    public static void Apply(Dictionary<string, object> values, string? portalJson, Application? placement)
    {
        var o = DeserializePortal(portalJson);
        if (o == null) return;

        var portalStart = TryParsePortalIsoDate(o.InternshipStartDate);
        var portalEnd = TryParsePortalIsoDate(o.InternshipEndDate);
        var effectiveStart = portalStart ?? placement?.InternshipStartDate;
        var effectiveEnd = portalEnd ?? placement?.InternshipEndDate;
        LogbookWordTemplateValues.PatchInternshipDerivedFields(values, effectiveStart, effectiveEnd);

        ApplyStringPropertyOverrides(values, o);
        LogbookWordTemplateValues.RefreshAcceptanceSignatoryLines(values);
    }

    private static void ApplyStringPropertyOverrides(Dictionary<string, object> values,
        AcceptanceLetterPortalOverrides o)
    {
        foreach (var prop in typeof(AcceptanceLetterPortalOverrides).GetProperties(
                     BindingFlags.Public | BindingFlags.Instance))
        {
            if (prop.Name is nameof(AcceptanceLetterPortalOverrides.InternshipStartDate)
                or nameof(AcceptanceLetterPortalOverrides.InternshipEndDate))
                continue;

            var raw = prop.GetValue(o) as string;
            if (string.IsNullOrWhiteSpace(raw)) continue;

            var sanitized = prop.Name == nameof(AcceptanceLetterPortalOverrides.TraineeJobOwnWords)
                ? LogbookWordTemplateValues.SanitizeTraineeJobOwnWordsForWord(raw)
                : LogbookWordTemplateValues.SanitizeWordTemplateText(raw);
            if (string.IsNullOrEmpty(sanitized)) continue;

            values[prop.Name] = sanitized;
        }
    }

    public static Dictionary<string, string> BuildPreviewStrings(Dictionary<string, object> values)
    {
        var preview = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kvp in values)
        {
            if (kvp.Value is System.Collections.IEnumerable && kvp.Value is not string)
                continue;
            preview[kvp.Key] = Convert.ToString(kvp.Value, CultureInfo.InvariantCulture) ?? "";
        }

        return preview;
    }

    public static bool TryValidateForPut(AcceptanceLetterPortalOverrides? body, out string? errorMessage)
    {
        errorMessage = null;
        if (body?.TraineeJobOwnWords != null && body.TraineeJobOwnWords.Length > 8000)
        {
            errorMessage = "Trainee job details must be at most 8000 characters.";
            return false;
        }

        return true;
    }
}
