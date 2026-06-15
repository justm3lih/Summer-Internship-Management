namespace InternshipManagement.API.Services;

/// <summary>SWEN yaz staj başvuru mektubundaki ders tablosu şablonu (kayıt/not hücreleri öğrenci/danışman doldurur).</summary>
public static class SummerTrainingCurriculum
{
    /// <summary>Registered sütunu: derse kayıtlı değil (İngilizce UI).</summary>
    public const string RegisteredNotEnrolled = "Not enrolled";

    /// <summary>Registered: ders geçmişte tamamlandı; şu dönem kayıtlı değil — not Grade hücresinde.</summary>
    public const string RegisteredPreviouslyCompleted = "Previously completed";

    /// <summary>Eski Türkçe arayüzden kalan JSON değerleri okurken İngilizceye eşlenir.</summary>
    private const string RegisteredNotEnrolledLegacyTr = "Kayıtlı değilim";

    public sealed record CourseRow(string Code, string Name, string Registered = "", string Grade = "");

    /// <summary>Kayıtlı / kayıtlı değil metnini tek canonical forma getirir.</summary>
    public static string NormalizeRegistered(string? registered)
    {
        var s = registered?.Trim() ?? "";
        if (string.Equals(s, RegisteredNotEnrolledLegacyTr, StringComparison.Ordinal))
            return RegisteredNotEnrolled;
        return s;
    }

    public static CourseRow WithNormalizedRegistered(CourseRow row) =>
        row with { Registered = NormalizeRegistered(row.Registered) };

    public static readonly IReadOnlyList<CourseRow> DefaultRows = new List<CourseRow>
    {
        new("CMPE313", "Object Oriented Programming"),
        new("CMPE343", "Database Management Systems And Programming-I"),
        new("CMPE351", "Operating Systems"),
        new("SWEN301", "Software Design and Architecture"),
        new("FREEXX2", "Free Elective"),
        new("CMPE332", "Fundamentals of Computer Networks"),
        new("SWEN302", "Software Quality Assurance and Testing"),
        new("FREEXX3", "Free Elective"),
        new("SWENXX2", "Area Elective"),
        new("SWEN304", "Software Process and Management"),
        new("CMPE415", "Artificial Intelligence"),
        new("ENGI401", "Project Management"),
        new("ISYE427", "Introduction to Human-Computer Interaction"),
        new("SWENXX3", "Area Elective"),
        new("CMPE412", "Systems Programming"),
        new("ENGI402", "Capstone Project"),
        new("SWENXX4", "Area Elective"),
        new("INDE232", "Engineering Economy"),
    }.AsReadOnly();

    public static string DefaultCourseRowsJson() =>
        System.Text.Json.JsonSerializer.Serialize(DefaultRows);
}
