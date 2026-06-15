using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace InternshipManagement.API.Services;

/// <summary>
/// CIU şablonu yerleştirilene kadar kullanılan minimal .docx — tüm {{Rpt*}} ve blok işaretleri içerir.
/// </summary>
public static class TrainingReportMinimalTemplate
{
    public static byte[] CreateSkeletonTemplateBytes()
    {
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document))
        {
            var main = doc.AddMainDocumentPart();
            main.Document = new Document(new Body());

            var body = main.Document.Body!;
            foreach (var token in PlaceholderParagraphs())
                body.AppendChild(new Paragraph(new Run(new Text(token) { Space = SpaceProcessingModeValues.Preserve })));

            main.Document.Save();
        }

        return ms.ToArray();
    }

    private static IEnumerable<string> PlaceholderParagraphs()
    {
        yield return "{{RptStudentFirstName}}";
        yield return "{{RptStudentLastName}}";
        yield return "{{RptStudentNumber}}";
        yield return "{{RptReportDay}}/{{RptReportMonth}}/{{RptReportYear}}";
        yield return "{{RptCompanyName}}";
        yield return "{{RptCompanyAddress}}";
        yield return "{{RptTrainingStart}} – {{RptTrainingEnd}}";
        yield return "{{RptCompanyPhone}}";
        yield return "{{RptCompanyWeb}}";
        yield return TrainingReportWordExporter.TocMarker;
        yield return "INTRODUCTION";
        yield return "{{RptIntroduction}}";
        yield return "{{RptIntroductionSections}}";
        yield return "INFORMATION ABOUT THE COMPANY";
        yield return "{{RptCompanyIntro}}";
        yield return "2.1 Aim and Establishment of the Company";
        yield return "{{RptCompany21}}";
        yield return "2.2 Departments and Personnel of the Company";
        yield return "{{RptCompany22}}";
        yield return "{{RptCompanySections}}";
        yield return "WORK EXPERIENCE";
        yield return "{{RptWorkExperienceIntro}}";
        yield return "3.1 Problem Definition";
        yield return "{{RptProblemDefinition}}";
        yield return "3.2 Work Done";
        yield return "{{RptWorkDoneIntro}}";
        yield return "{{RptTask1Title}}";
        yield return "{{RptTask1Body}}";
        yield return "{{RptTask2Title}}";
        yield return "{{RptTask2Body}}";
        yield return "{{RptWorkExperienceSections}}";
        yield return "3.3 Limitations and Experience Gained";
        yield return "{{RptLimitations}}";
        yield return "RECENT TOPICS IN THE CONTEXT OF WORK DONE";
        yield return "{{RptRecentTopics}}";
        yield return "CONCLUSION";
        yield return "{{RptConclusion}}";
        yield return "{{RptConclusionSections}}";
        yield return "REFERENCES";
        yield return "{{RptReferences}}";
        yield return "APPENDIX";
        yield return "{{RptAppendix}}";
        yield return TrainingReportWordExporter.FiguresMarker;
        yield return "Sign-off dates (dd / MM / yyyy UTC)";
        yield return "{{RptStudentSignatureDateSlash}}";
        yield return "{{RptTraineeSupervisorSignatureDateSlash}}";
    }
}
