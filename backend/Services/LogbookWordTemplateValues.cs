using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>
/// Üniversite Word şablonundaki {{Tag}} alanlarına karşılık gelen sözlük üretir (MiniWord).
/// </summary>
public static class LogbookWordTemplateValues
{
    /// <summary>
    /// Kaydırma / şişkin satır yüksekliği yapan görünmez kontrol karakterleri ve çoklu boşlukları giderir.
    /// </summary>
    private static string SanitizeWordInline(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        var sb = new StringBuilder(text.Length);
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

    /// <summary>MiniWord çıktısı için tek satır metin temizliği (portal üzerine yazım dahil).</summary>
    public static string SanitizeWordTemplateText(string? text) => SanitizeWordInline(text);

    /// <summary>
    /// <see cref="TraineeJobOwnWords"/> için: satır sonları korunur (MiniWord bunları <c>w:br</c> yapar).
    /// Uzun kelimesiz dizilerde Word satır kırılımı <see cref="ApplyTraineeJobOwnWordsWrapForMiniWord"/> ile export öncesinde uygulanır.
    /// </summary>
    public static string SanitizeTraineeJobOwnWordsForWord(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";

        var normalized = text.ReplaceLineEndings("\n");
        var lines = normalized.Split('\n');
        var sb = new StringBuilder(normalized.Length);
        for (var i = 0; i < lines.Length; i++)
        {
            if (i > 0) sb.Append('\n');
            sb.Append(SanitizeTraineeJobOwnWordsLine(lines[i]));
        }

        return sb.ToString().Trim();
    }

    /// <summary>
    /// MiniWord birleştirmeden hemen önce çağrılır; boşluksuz uzun dizeler Word'de taşmasın diye U+200B eklenir (portala yazılmaz).
    /// </summary>
    public static void ApplyTraineeJobOwnWordsWrapForMiniWord(Dictionary<string, object> values)
    {
        if (!values.TryGetValue("TraineeJobOwnWords", out var raw))
            return;

        var s = raw?.ToString();
        if (string.IsNullOrWhiteSpace(s) || s == "—")
            return;

        values["TraineeJobOwnWords"] = InsertWordWrapOpportunities(s);
    }

    private static string SanitizeTraineeJobOwnWordsLine(string line)
    {
        var sb = new StringBuilder(line.Length);
        foreach (var ch in line)
        {
            if (ch == '\r') continue;
            if (char.IsControl(ch))
                sb.Append(' ');
            else
                sb.Append(ch);
        }

        return Regex.Replace(sb.ToString().Trim(), @"[ \t]+", " ");
    }

    /// <summary>
    /// Word, boşluksuz uzun tokenları varsayılan olarak kırmaz; ZWSP görünmez ve geçerli kırılma noktasıdır.
    /// </summary>
    private static string InsertWordWrapOpportunities(string text, int maxNonWhitespaceRun = 48)
    {
        if (string.IsNullOrEmpty(text) || maxNonWhitespaceRun < 12)
            return text;

        var sb = new StringBuilder(text.Length + text.Length / maxNonWhitespaceRun);
        var runNonWs = 0;
        foreach (var rune in text.EnumerateRunes())
        {
            sb.Append(rune.ToString());

            if (rune.Value == '\n')
            {
                runNonWs = 0;
                continue;
            }

            if (Rune.IsWhiteSpace(rune))
            {
                runNonWs = 0;
                continue;
            }

            runNonWs++;
            if (runNonWs < maxNonWhitespaceRun)
                continue;

            sb.Append('\u200b');
            runNonWs = 0;
        }

        return sb.ToString();
    }

    private static string DashTraineeJobOwnWords(string? text)
    {
        var s = SanitizeTraineeJobOwnWordsForWord(text);
        return string.IsNullOrEmpty(s) ? "—" : s;
    }

    public static void PatchInternshipDerivedFields(
        Dictionary<string, object> values,
        DateTime? start,
        DateTime? end)
    {
        string internshipYear = "—";
        if (start.HasValue)
            internshipYear = start.Value.Year.ToString(CultureInfo.InvariantCulture);
        else if (end.HasValue)
            internshipYear = end.Value.Year.ToString(CultureInfo.InvariantCulture);

        string workingDaysText = "—";
        string calendarDaysText = "—";
        if (start.HasValue && end.HasValue)
        {
            workingDaysText =
                CountInclusiveWeekdays(start.Value, end.Value).ToString(CultureInfo.InvariantCulture);
            calendarDaysText =
                CountInclusiveCalendarDays(start.Value, end.Value).ToString(CultureInfo.InvariantCulture);
        }

        var internshipStartStr = FormatIsoDateUtc(start);
        var internshipEndStr = FormatIsoDateUtc(end);

        values["InternshipStartDate"] = internshipStartStr;
        values["InternshipEndDate"] = internshipEndStr;
        values["BeginningDate"] = internshipStartStr;
        values["EndingDate"] = internshipEndStr;
        values["InternshipYear"] = internshipYear;
        values["InternshipWorkingDays"] = workingDaysText;
        values["NumberOfWorkingDays"] = workingDaysText;
        values["InternshipCalendarDays"] = calendarDaysText;
        values["NumberOfCalendarDays"] = calendarDaysText;
    }

    /// <summary>Şablondaki süpervizör imza satırı birleşik metinlerini günceller.</summary>
    public static void RefreshAcceptanceSignatoryLines(Dictionary<string, object> values)
    {
        var nameObj = values.GetValueOrDefault("SupervisorName");
        var titleObj = values.GetValueOrDefault("SupervisorTitle");
        var name = nameObj?.ToString();
        var title = titleObj?.ToString();
        var line = FormatSupervisorSignatoryLine(name, title);
        values["AcceptanceSignatoryDeptManagerLine"] = line;
        values["AcceptanceSignatoryDivisionManagerLine"] = line;
        var cleaned = SanitizeWordInline(name);
        values["SupervisorSignNote"] = string.IsNullOrEmpty(cleaned) ? "—" : cleaned;
    }

    /// <param name="company">Aktif staj şirketi (yoksa ilgili metin alanlarında "—")</param>
    /// <param name="placement">Onaylı/devam eden başvuru (trainee/supervisor ünvanları için)</param>
    /// <param name="companySupervisorUser"><paramref name="placement"/>.CompanySupervisorUserId ile eşleşen kullanıcı adı</param>
    public static Dictionary<string, object> Build(
        User student,
        Company? company,
        Application? placement,
        User? companySupervisorUser,
        IReadOnlyList<LogbookEntry> entries)
    {
        var ordered = entries.OrderBy(e => e.Date).ToList();
        var totalHours = ordered.Sum(e => e.HoursWorked);

        var textBlock = new StringBuilder();
        foreach (var e in ordered)
        {
            var line = SanitizeWordInline(e.Description);
            textBlock.AppendLine($"{e.Date:yyyy-MM-dd} | {e.HoursWorked} h | {line}");
        }

        var tableRows = ordered
            .Select((e, i) => new Dictionary<string, object>
            {
                ["Day"] = i + 1,
                ["EntryDate"] = e.Date.ToString("yyyy-MM-dd"),
                ["HoursWorked"] = e.HoursWorked,
                ["Description"] = SanitizeWordInline(e.Description)
            })
            .ToList();

        var fieldsOfWork = SanitizeWordInline(company?.FieldsOfWork);
        if (string.IsNullOrEmpty(fieldsOfWork))
            fieldsOfWork = SanitizeWordInline(company?.Sector);

        var companyAddress = SanitizeWordInline(company?.Address);
        if (string.IsNullOrEmpty(companyAddress))
            companyAddress = SanitizeWordInline(company?.Location);

        var semesterText = student.CurrentSemester.HasValue
            ? student.CurrentSemester.Value.ToString(CultureInfo.InvariantCulture)
            : "—";

        var start = placement?.InternshipStartDate;
        var end = placement?.InternshipEndDate;
        string internshipYear = "—";
        if (start.HasValue)
            internshipYear = start.Value.Year.ToString(CultureInfo.InvariantCulture);
        else if (end.HasValue)
            internshipYear = end.Value.Year.ToString(CultureInfo.InvariantCulture);

        string workingDaysText = "—";
        string calendarDaysText = "—";
        if (start.HasValue && end.HasValue)
        {
            workingDaysText = CountInclusiveWeekdays(start.Value, end.Value).ToString(CultureInfo.InvariantCulture);
            calendarDaysText = CountInclusiveCalendarDays(start.Value, end.Value).ToString(CultureInfo.InvariantCulture);
        }

        var internshipStartStr = FormatIsoDateUtc(start);
        var internshipEndStr = FormatIsoDateUtc(end);

        var supervisorPrintedName = DashIfEmpty(companySupervisorUser?.Name);

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
            ["StudentEmail"] = SanitizeWordInline(student.Email),
            ["CompanyName"] = SanitizeWordInline(company?.Name) is { Length: > 0 } cn ? cn : "—",
            ["CompanyFieldsOfWork"] = string.IsNullOrEmpty(fieldsOfWork) ? "—" : fieldsOfWork,
            ["CompanyAddress"] = string.IsNullOrEmpty(companyAddress) ? "—" : companyAddress,
            ["CompanyTelephone"] = DashIfEmpty(company?.Phone),
            ["CompanyFax"] = DashIfEmpty(company?.Fax),
            ["CompanyEmail"] = DashIfEmpty(company?.ContactEmail),
            ["CompanyWebsite"] = DashIfEmpty(company?.Website),
            ["TraineeJobTitle"] = DashIfEmpty(placement?.TraineeJobTitle),
            ["TraineeJobOwnWords"] = DashTraineeJobOwnWords(placement?.TraineeJobOwnWords),
            ["SupervisorOverallPerformanceObservations"] =
                DashIfEmpty(placement?.SupervisorOverallPerformanceObservations),
            ["SupervisorSuggestionsToUniversityAboutTrainee"] =
                DashIfEmpty(placement?.SupervisorSuggestionsToUniversityAboutTrainee),
            ["SupervisorTitle"] = DashIfEmpty(placement?.SupervisorTitle),
            ["TraineeDepartmentOrDivision"] = DashIfEmpty(placement?.TraineeDepartmentOrDivision),
            ["SupervisorDepartmentOrDivision"] = DashIfEmpty(placement?.SupervisorDepartmentOrDivision),
            ["SupervisorSpecialty"] = DashIfEmpty(placement?.SupervisorSpecialty),
            ["SupervisorAcademicDegrees"] = DashIfEmpty(placement?.SupervisorAcademicDegrees),
            ["SupervisorGraduatedUniversity"] = DashIfEmpty(placement?.SupervisorGraduatedUniversity),
            ["SupervisorGraduationYear"] = DashIfEmpty(placement?.SupervisorGraduationYear),
            ["SupervisorYearsInCompany"] = DashIfEmpty(placement?.SupervisorYearsInCompany),
            ["SupervisorYearsExperience"] = DashIfEmpty(placement?.SupervisorYearsExperience),
            ["SupervisorEvalPo1"] = FormatPoScore(placement?.SupervisorEvalPo1),
            ["SupervisorEvalPo2"] = FormatPoScore(placement?.SupervisorEvalPo2),
            ["SupervisorEvalPo3"] = FormatPoScore(placement?.SupervisorEvalPo3),
            ["SupervisorEvalPo4"] = FormatPoScore(placement?.SupervisorEvalPo4),
            ["SupervisorEvalPo5"] = FormatPoScore(placement?.SupervisorEvalPo5),
            ["SupervisorEvalPo6"] = FormatPoScore(placement?.SupervisorEvalPo6),
            ["SupervisorEvalPo7"] = FormatPoScore(placement?.SupervisorEvalPo7),
            ["SupervisorEvalPo8"] = FormatPoScore(placement?.SupervisorEvalPo8),
            ["SupervisorEvalPo9"] = FormatPoScore(placement?.SupervisorEvalPo9),
            ["SupervisorEvalPo10"] = FormatPoScore(placement?.SupervisorEvalPo10),
            ["SupervisorEvalPo11"] = FormatPoScore(placement?.SupervisorEvalPo11),
            ["TraineeSummerSelfEval1"] = FormatPoScore(placement?.TraineeSummerSelfEval1),
            ["TraineeSummerSelfEval2"] = FormatPoScore(placement?.TraineeSummerSelfEval2),
            ["TraineeSummerSelfEval3"] = FormatPoScore(placement?.TraineeSummerSelfEval3),
            ["TraineeSummerSelfEval4"] = FormatPoScore(placement?.TraineeSummerSelfEval4),
            ["TraineeSummerSelfEval5"] = FormatPoScore(placement?.TraineeSummerSelfEval5),
            ["TraineeSummerSelfEval6"] = FormatPoScore(placement?.TraineeSummerSelfEval6),
            ["TraineeSummerSelfEval7"] = FormatPoScore(placement?.TraineeSummerSelfEval7),
            ["TraineeSummerSelfEval8"] = FormatPoScore(placement?.TraineeSummerSelfEval8),
            ["TraineeSummerSelfEval9"] = FormatPoScore(placement?.TraineeSummerSelfEval9),
            ["TraineeSummerSelfEval10"] = FormatPoScore(placement?.TraineeSummerSelfEval10),
            ["TraineeSummerSelfEval11"] = FormatPoScore(placement?.TraineeSummerSelfEval11),
            ["TraineeSummerSelfEval12"] = FormatPoScore(placement?.TraineeSummerSelfEval12),
            ["InternshipStartDate"] = internshipStartStr,
            ["InternshipEndDate"] = internshipEndStr,
            ["BeginningDate"] = internshipStartStr,
            ["EndingDate"] = internshipEndStr,
            ["InternshipYear"] = internshipYear,
            ["InternshipWorkingDays"] = workingDaysText,
            ["NumberOfWorkingDays"] = workingDaysText,
            ["InternshipCalendarDays"] = calendarDaysText,
            ["NumberOfCalendarDays"] = calendarDaysText,
            ["SupervisorName"] = supervisorPrintedName,
            ["SupervisorEmail"] = DashIfEmpty(companySupervisorUser?.Email),
            ["AcceptanceSignatoryDeptManagerLine"] =
                FormatSupervisorSignatoryLine(companySupervisorUser?.Name, placement?.SupervisorTitle),
            ["AcceptanceSignatoryDivisionManagerLine"] =
                FormatSupervisorSignatoryLine(companySupervisorUser?.Name, placement?.SupervisorTitle),
            ["AcceptanceLetterSubmittedDate"] = FormatIsoDateUtc(placement?.AcceptanceLetterSubmittedAt),
            ["AcceptanceLetterVerifiedDate"] = FormatIsoDateUtc(placement?.AcceptanceLetterVerifiedAt),
            // İmza satırı tarihleri: öğrenci yalnızca şablon indirip fiziksel imzalıyorsa sistem tarihi yazılmaz (elle).
            ["StudentSignatureDate"] = "—",
            ["TraineeSupervisorSignatureDate"] = "—",
            ["StudentSignatureDateSlash"] = FormatDdMmYyyySlashes(null),
            ["TraineeSupervisorSignatureDateSlash"] = FormatDdMmYyyySlashes(null),
            ["ExportDate"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm 'UTC'"),
            ["TotalHours"] = totalHours,
            ["SupervisorSignNote"] = supervisorPrintedName,
            ["LogbookEntries"] = textBlock.ToString().TrimEnd(),
            ["LogbookTable"] = tableRows
        };

        foreach (var (prefix, score) in new (string Prefix, int? Score)[]
             {
                 ("SupervisorEvalPo1", placement?.SupervisorEvalPo1),
                 ("SupervisorEvalPo2", placement?.SupervisorEvalPo2),
                 ("SupervisorEvalPo3", placement?.SupervisorEvalPo3),
                 ("SupervisorEvalPo4", placement?.SupervisorEvalPo4),
                 ("SupervisorEvalPo5", placement?.SupervisorEvalPo5),
                 ("SupervisorEvalPo6", placement?.SupervisorEvalPo6),
                 ("SupervisorEvalPo7", placement?.SupervisorEvalPo7),
                 ("SupervisorEvalPo8", placement?.SupervisorEvalPo8),
                 ("SupervisorEvalPo9", placement?.SupervisorEvalPo9),
                 ("SupervisorEvalPo10", placement?.SupervisorEvalPo10),
                 ("SupervisorEvalPo11", placement?.SupervisorEvalPo11),
                 ("TraineeSummerSelfEval1", placement?.TraineeSummerSelfEval1),
                 ("TraineeSummerSelfEval2", placement?.TraineeSummerSelfEval2),
                 ("TraineeSummerSelfEval3", placement?.TraineeSummerSelfEval3),
                 ("TraineeSummerSelfEval4", placement?.TraineeSummerSelfEval4),
                 ("TraineeSummerSelfEval5", placement?.TraineeSummerSelfEval5),
                 ("TraineeSummerSelfEval6", placement?.TraineeSummerSelfEval6),
                 ("TraineeSummerSelfEval7", placement?.TraineeSummerSelfEval7),
                 ("TraineeSummerSelfEval8", placement?.TraineeSummerSelfEval8),
                 ("TraineeSummerSelfEval9", placement?.TraineeSummerSelfEval9),
                 ("TraineeSummerSelfEval10", placement?.TraineeSummerSelfEval10),
                 ("TraineeSummerSelfEval11", placement?.TraineeSummerSelfEval11),
                 ("TraineeSummerSelfEval12", placement?.TraineeSummerSelfEval12),
             })
            AddRatingScaleColumnMarks(values, prefix, score);

        AddShortRatingScaleAliases(values);

        return values;
    }

    /// <summary>Uzun isimlerin kısa takması — Word’de yazması kolay; uzun etiketlerle aynı çıktı.</summary>
    private static void AddShortRatingScaleAliases(Dictionary<string, object> values)
    {
        for (var po = 1; po <= 11; po++)
        {
            var longP = $"SupervisorEvalPo{po}";
            for (var col = 4; col >= 0; col--)
                values[$"SP{po}_{col}"] = values[$"{longP}_Col{col}"];
            values[$"SP{po}"] = values[longP];
        }

        for (var row = 1; row <= 12; row++)
        {
            var longT = $"TraineeSummerSelfEval{row}";
            for (var col = 4; col >= 0; col--)
                values[$"TS{row}_{col}"] = values[$"{longT}_Col{col}"];
            values[$"TS{row}"] = values[longT];
        }
    }

    private static string FormatIsoDateUtc(DateTime? utcDate)
    {
        if (!utcDate.HasValue) return "—";
        return utcDate.Value.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    /// <summary>İmza satırı için gg / aa / yyyy (Yoksa — / — / —).</summary>
    private static string FormatDdMmYyyySlashes(DateTime? utcDate)
    {
        if (!utcDate.HasValue)
            return "— / — / —";
        var d = utcDate.Value.Date;
        return $"{d.Day:00} / {d.Month:00} / {d.Year}";
    }

    /// <summary>Acceptance letter imza satırı: süpervizör adı + ünvan (birim müdürü satırı için).</summary>
    private static string FormatSupervisorSignatoryLine(string? supervisorName, string? supervisorTitle)
    {
        var name = SanitizeWordInline(supervisorName);
        var title = SanitizeWordInline(supervisorTitle);
        if (string.IsNullOrEmpty(name))
            return "—";
        if (string.IsNullOrEmpty(title))
            return name;
        return $"{name} — {title}";
    }

    private static object FormatPoScore(int? score)
    {
        if (score is >= 0 and <= 4)
            return score.Value;
        return "—";
    }

    /// <summary>
    /// Tablo başlığı 4 | 3 | 2 | 1 | 0 ise her hücreye bir yer tutucu koy: seçilen puanda ✓, diğerleri boş.
    /// Örn. {{SupervisorEvalPo1_Col4}} … {{SupervisorEvalPo1_Col0}}
    /// </summary>
    private static void AddRatingScaleColumnMarks(Dictionary<string, object> target, string baseKey, int? score)
    {
        var valid = score is >= 0 and <= 4;
        var chosen = valid ? score!.Value : (int?)null;

        for (var mark = 4; mark >= 0; mark--)
            target[$"{baseKey}_Col{mark}"] = chosen == mark ? "\u2713" : "";
    }

    private static int CountInclusiveWeekdays(DateTime startUtc, DateTime endUtc)
    {
        var s = startUtc.Date;
        var e = endUtc.Date;
        if (e < s) return 0;
        var n = 0;
        for (var d = s; d <= e; d = d.AddDays(1))
        {
            if (d.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                n++;
        }

        return n;
    }

    private static int CountInclusiveCalendarDays(DateTime startUtc, DateTime endUtc)
    {
        var s = startUtc.Date;
        var e = endUtc.Date;
        if (e < s) return 0;
        return (int)(e - s).TotalDays + 1;
    }
}
