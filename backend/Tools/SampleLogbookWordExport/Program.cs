using InternshipManagement.API.Models;
using InternshipManagement.API.Services;
using MiniSoftware;

static string FindTemplatesDir()
{
    var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (dir != null)
    {
        var candidate = Path.Combine(dir.FullName, "Templates", "logbook_template.docx");
        if (File.Exists(candidate))
            return Path.Combine(dir.FullName, "Templates");
        dir = dir.Parent;
    }

    throw new InvalidOperationException(
        "Could not find Templates/logbook_template.docx. Run from the backend folder or a parent path that contains it.");
}

static bool TryTakeArg(ref List<string> args, string flag, out string? value)
{
    value = null;
    var i = args.IndexOf(flag);
    if (i < 0 || i >= args.Count - 1)
        return false;
    value = args[i + 1];
    args.RemoveAt(i + 1);
    args.RemoveAt(i);
    return true;
}

var templatesDir = FindTemplatesDir();
var templatePath = Path.Combine(templatesDir, "logbook_template.docx");

// Default: one stable file overwritten each run (easier than hunting timestamped copies).
// Use --timestamped for logbook_TEST_SAMPLE_EXPORT_yyyyMMdd_HHmmss.docx, or --out <path.docx>.
var argsList = Environment.GetCommandLineArgs().Skip(1).ToList();
string outPath;
if (TryTakeArg(ref argsList, "--out", out var customOut) &&
    !string.IsNullOrWhiteSpace(customOut))
{
    outPath = Path.IsPathRooted(customOut)
        ? customOut
        : Path.Combine(Directory.GetCurrentDirectory(), customOut);
}
else if (argsList.Contains("--timestamped") || argsList.Contains("-t"))
{
    outPath = Path.Combine(
        templatesDir,
        $"logbook_TEST_SAMPLE_EXPORT_{DateTime.UtcNow:yyyyMMdd_HHmmss}.docx");
}
else
{
    outPath = Path.Combine(templatesDir, "logbook_TEST_SAMPLE_EXPORT.docx");
}

var tmpTpl = Path.Combine(Path.GetTempPath(), $"logbook_tpl_sample_{Guid.NewGuid():N}.docx");
await using (var src = new FileStream(
                  templatePath,
                  FileMode.Open,
                  FileAccess.Read,
                  FileShare.ReadWrite))
await using (var dst = new FileStream(tmpTpl, FileMode.Create, FileAccess.Write))
{
    await src.CopyToAsync(dst);
}

var templateBytes = await File.ReadAllBytesAsync(tmpTpl);

var runStampUtc = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'");

var student = new User
{
    Id = "sample-student-word-test",
    Email = "ogrenci.demo@universite.edu.tr",
    Name = "Demo Öğrenci Yılmaz",
    Role = "student",
    StudentId = "21904567",
    Department = "Computer Engineering",
    CurrentSemester = 8,
    Cgpa = 3.24,
    HomeAddress = "Kıbrıs örnek adres, sokak no: 12",
    HomeTelephone = "+90 212 000 0000",
    MobileTelephone = "+90 555 010 2030",
    AddressNorthCyprus = "KKTC — Lefkoşa örnek mahalle",
};

var company = new Company
{
    Id = "sample-company-word-test",
    Name = "Demo Yazılım A.Ş.",
    Sector = "Information Technology",
    Address = "Organize Sanayi Bölgesi, Blok 3",
    Location = "İstanbul",
    FieldsOfWork = "Web, mobil ve kurumsal yazılım",
    Phone = "+90 216 111 2233",
    Fax = "+90 216 111 2234",
    ContactEmail = "contact@demoyazilim.example",
    Website = "https://demoyazilim.example",
    Approved = true,
};

var placement = new Application
{
    Id = Guid.NewGuid().ToString(),
    StudentId = student.Id,
    CompanyId = company.Id,
    Status = "ongoing",
    TraineeJobTitle = "Junior Software Developer (trainee)",
    SupervisorTitle = "Senior Engineering Manager",
    TraineeDepartmentOrDivision = "Software Engineering Lab",
    TraineeJobOwnWords =
        $"[TEST EXPORT — {runStampUtc}] "
        + "Bu paragraf sıfırdan üretilen örnek doldurmadır. Angular bileşenleri, ASP.NET REST uçları ve "
        + "PostgreSQL sorguları üzerinde çalışılmış; Git akışı ve kod incelemesine katılım sağlanmıştır.",
    SupervisorDepartmentOrDivision = "Engineering",
    SupervisorSpecialty = "Software architecture",
    SupervisorAcademicDegrees = "M.Sc. Computer Engineering",
    SupervisorGraduatedUniversity = "Example Technical University",
    SupervisorGraduationYear = "2012",
    SupervisorYearsInCompany = "8 years",
    SupervisorYearsExperience = "15 years",
    InternshipStartDate = new DateTime(2026, 6, 2, 0, 0, 0, DateTimeKind.Utc),
    InternshipEndDate = new DateTime(2026, 8, 28, 0, 0, 0, DateTimeKind.Utc),
    LogbookSubmittedForCoordinatorReviewAt = new DateTime(2026, 8, 30, 10, 0, 0, DateTimeKind.Utc),
};

placement.TraineeJobOwnWords +=
    $" Oturum içi başvuru kimliği (örnek): {placement.Id[..8]}…";

placement.SupervisorOverallPerformanceObservations =
    $"[TEST] Genel performans: öğrenci zamanında çıktılar verdi ve ekiple uyum çalıştı. Görev netliği arttırılabilir ({runStampUtc}).";
placement.SupervisorSuggestionsToUniversityAboutTrainee =
    "[TEST] CIU tarafında API tasarımı ve sürümleme konularına bir seçmeli daha vurgulanabilir (örnek öneri metni).";

// Supervisor PO1–PO11 (0–4)
var poScores = new[] { 4, 3, 2, 4, 3, 4, 2, 3, 4, 3, 2 };
placement.SupervisorEvalPo1 = poScores[0];
placement.SupervisorEvalPo2 = poScores[1];
placement.SupervisorEvalPo3 = poScores[2];
placement.SupervisorEvalPo4 = poScores[3];
placement.SupervisorEvalPo5 = poScores[4];
placement.SupervisorEvalPo6 = poScores[5];
placement.SupervisorEvalPo7 = poScores[6];
placement.SupervisorEvalPo8 = poScores[7];
placement.SupervisorEvalPo9 = poScores[8];
placement.SupervisorEvalPo10 = poScores[9];
placement.SupervisorEvalPo11 = poScores[10];

// Trainee summer self-eval 12 rows (UI sıra 1–12 ↔ Eval1–12)
var te = new[] { 3, 2, 4, 3, 1, 2, 4, 3, 2, 4, 3, 2 };
placement.TraineeSummerSelfEval1 = te[0];
placement.TraineeSummerSelfEval2 = te[1];
placement.TraineeSummerSelfEval3 = te[2];
placement.TraineeSummerSelfEval4 = te[3];
placement.TraineeSummerSelfEval5 = te[4];
placement.TraineeSummerSelfEval6 = te[5];
placement.TraineeSummerSelfEval7 = te[6];
placement.TraineeSummerSelfEval8 = te[7];
placement.TraineeSummerSelfEval9 = te[8];
placement.TraineeSummerSelfEval10 = te[9];
placement.TraineeSummerSelfEval11 = te[10];
placement.TraineeSummerSelfEval12 = te[11];

var supervisorUser = new User
{
    Id = "sample-supervisor-1",
    Email = "supervisor@demoyazilim.example",
    Name = "Ayşe Demir (Supervisor)",
    Role = "company",
    CompanyId = company.Id,
};

// Günlük tablo (LogbookTable): staj tarihleri arası HER hafta içi için bir satır — {{NumberOfWorkingDays}} ile aynı mantıkta.
static List<LogbookEntry> BuildWeekdayLogbookDemo(string studentId, Application app)
{
    var list = new List<LogbookEntry>();
    var start = app.InternshipStartDate ?? DateTime.UtcNow.Date;
    var end = app.InternshipEndDate ?? start;
    var s = start.Date;
    var e = end.Date;
    if (e < s)
        return list;

    var blurbs = new[]
    {
        "Oryantasyon ve geliştirme ortamı; repo yapısı ve bağlantı testleri.",
        "Domain model, API sözleşmeleri ve Postman ile uç doğrulama.",
        "Next.js/React formları, istemci doğrulama ve küçük UI düzeltmeleri.",
        "EF Core migration ve logbook/onay akışı ile ilgili backend işleri.",
        "Kod incelemesi, Git akışı ve birim/regresyon testleri.",
        "Rapor taslağı, dokümantasyon ve günlük özeti yazımı.",
    };

    var workDay = 0;
    for (var d = s; d <= e; d = d.AddDays(1))
    {
        if (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            continue;
        workDay++;
        var hours = workDay % 3 == 1 ? 8.0 : workDay % 3 == 2 ? 7.5 : 6.5;
        var body = blurbs[(workDay - 1) % blurbs.Length];
        list.Add(new LogbookEntry
        {
            StudentId = studentId,
            Date = DateTime.SpecifyKind(d, DateTimeKind.Utc),
            HoursWorked = hours,
            Description = $"[İş günü {workDay}] {body} (ÖRNEK TEST VERİSİ)",
        });
    }

    return list;
}

var entries = BuildWeekdayLogbookDemo(student.Id, placement);

var values = LogbookWordTemplateValues.Build(student, company, placement, supervisorUser, entries);
LogbookWordTemplateValues.ApplyTraineeJobOwnWordsWrapForMiniWord(values);

await using var outStream = new MemoryStream();
MiniWord.SaveAsByTemplate(outStream, templateBytes, values);
await File.WriteAllBytesAsync(outPath, outStream.ToArray());

try { File.Delete(tmpTpl); }
catch { /* ignored */ }

Console.WriteLine($"Wrote: {outPath} (LogbookTable = {entries.Count} hafta içi satır, staj aralığına göre)");
Console.WriteLine("Default output overwrites Templates/logbook_TEST_SAMPLE_EXPORT.docx (always fresh).");
Console.WriteLine("Optional: --timestamped or -t for a dated copy; --out <path.docx> for a custom file.");
