using System.Text.Json;
using System.Text.Json.Serialization;

namespace InternshipManagement.API.Services;

public sealed class TrainingReportDynamicSectionDto
{
    [JsonPropertyName("outlineNumber")]
    public string OutlineNumber { get; set; } = "";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("body")]
    public string Body { get; set; } = "";
}

/// <summary>Portal JSON gövdesi — Word {{Rpt*}} birleştirmesi için.</summary>
public sealed class TrainingReportContentDto
{
    [JsonPropertyName("introduction")]
    public string Introduction { get; set; } = "";

    [JsonPropertyName("introductionSections")]
    public List<TrainingReportDynamicSectionDto> IntroductionSections { get; set; } = new();

    [JsonPropertyName("companyIntro")]
    public string CompanyIntro { get; set; } = "";

    [JsonPropertyName("company21")]
    public string Company21 { get; set; } = "";

    [JsonPropertyName("company22")]
    public string Company22 { get; set; } = "";

    [JsonPropertyName("companySections")]
    public List<TrainingReportDynamicSectionDto> CompanySections { get; set; } = new();

    [JsonPropertyName("workExperienceIntro")]
    public string WorkExperienceIntro { get; set; } = "";

    [JsonPropertyName("problemDefinition")]
    public string ProblemDefinition { get; set; } = "";

    [JsonPropertyName("workDoneIntro")]
    public string WorkDoneIntro { get; set; } = "";

    [JsonPropertyName("task1Title")]
    public string Task1Title { get; set; } = "Task1";

    [JsonPropertyName("task1Body")]
    public string Task1Body { get; set; } = "";

    [JsonPropertyName("task2Title")]
    public string Task2Title { get; set; } = "Task2";

    [JsonPropertyName("task2Body")]
    public string Task2Body { get; set; } = "";

    [JsonPropertyName("workExperienceSections")]
    public List<TrainingReportDynamicSectionDto> WorkExperienceSections { get; set; } = new();

    [JsonPropertyName("limitations")]
    public string Limitations { get; set; } = "";

    [JsonPropertyName("recentTopics")]
    public string RecentTopics { get; set; } = "";

    [JsonPropertyName("conclusion")]
    public string Conclusion { get; set; } = "";

    [JsonPropertyName("conclusionSections")]
    public List<TrainingReportDynamicSectionDto> ConclusionSections { get; set; } = new();

    [JsonPropertyName("appendix")]
    public string Appendix { get; set; } = "";

    [JsonPropertyName("references")]
    public List<string> References { get; set; } = new();

    public static TrainingReportContentDto ParseOrEmpty(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new TrainingReportContentDto();
        try
        {
            return JsonSerializer.Deserialize<TrainingReportContentDto>(json)
                   ?? new TrainingReportContentDto();
        }
        catch
        {
            return new TrainingReportContentDto();
        }
    }

    public static string Serialize(TrainingReportContentDto dto) =>
        JsonSerializer.Serialize(dto, new JsonSerializerOptions { WriteIndented = false });
}
