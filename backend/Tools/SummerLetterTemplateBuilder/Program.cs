using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

// Produces an editable plain .docx (no inheritance from locked logbook). See PLACEHOLDERS.txt.

var outPath =
    args.FirstOrDefault()
    ?? Path.GetFullPath(
        Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "Templates",
            "SWEN300_APPLICATION_LETTER_2025.docx"));

var dir = Path.GetDirectoryName(outPath);
if (string.IsNullOrEmpty(dir))
    throw new InvalidOperationException("Invalid output path.");
Directory.CreateDirectory(dir);
if (File.Exists(outPath))
    File.Delete(outPath);

using var wd = WordprocessingDocument.Create(outPath, WordprocessingDocumentType.Document);
var mainPart = wd.AddMainDocumentPart();
EnsureStyles(mainPart);

var body = new Body();

static Paragraph P(string literal)
{
    var p = new Paragraph();
    var r = new Run();
    var t = new Text(literal) { Space = SpaceProcessingModeValues.Preserve };
    r.Append(t);
    p.Append(r);
    return p;
}

body.Append(P("Summer training application letter — EDITABLE template"));
body.Append(P("You can delete this line. Type {{YourTag}} placeholders as normal text; keep each placeholder in one run (do not split with formatting)."));

body.Append(P("Student name: {{StudentName}}"));
body.Append(P("Student number: {{StudentId}}"));
body.Append(P("Email: {{StudentEmail}}"));
body.Append(P("Department: {{Department}} | Semester: {{Semester}} | CGPA: {{Cgpa}}"));
body.Append(P("Home address: {{HomeAddress}} | Mobile: {{MobileTelephone}}"));
body.Append(P("Advisor: {{AdvisorName}}"));
body.Append(P("Period (key): {{AcademicPeriodKey}} | Period (label): {{AcademicPeriodLabel}}"));

body.Append(P("Letter status: {{LetterStatus}}"));
body.Append(P("Electronic acceptance: {{ElectronicAcceptanceMark}} at {{StudentElectronicAcceptanceAt}}"));
body.Append(P("Submitted to advisor: {{SubmittedToAdvisorAt}}"));
body.Append(P("Advisor approved/rejected at: {{AdvisorApprovedAt}} / {{AdvisorRejectedAt}}"));
body.Append(P("Coordinator approved/rejected at: {{CoordinatorApprovedAt}} / {{CoordinatorRejectedAt}} — {{CoordinatorName}}"));
body.Append(P("Advisor comments: {{AdvisorComments}}"));
body.Append(P("Coordinator comments: {{CoordinatorComments}}"));

// MiniWord repeats the single DATA row inside the course table body.
body.Append(CreateCourseGrid());

body.Append(P("Printed: {{ExportDate}}"));

body.Append(
    new SectionProperties(
        new PageSize() { Width = (UInt32Value)12240u, Height = (UInt32Value)15840u },
        new PageMargin
        {
            Top = 1440,
            Right = 1440,
            Bottom = 1440,
            Left = 1440,
            Header = 708,
            Footer = 708,
            Gutter = 0,
        }));

mainPart.Document = new Document(body);
mainPart.Document.Save();

Console.WriteLine("Wrote: " + Path.GetFullPath(outPath));

static void EnsureStyles(MainDocumentPart mp)
{
    var sp = mp.AddNewPart<StyleDefinitionsPart>();

    static RunPropertiesDefault RPrDefault()
    {
        var r = new RunPropertiesBaseStyle(new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" });
        var rPrDefault = new RunPropertiesDefault(r);
        return rPrDefault;
    }

    var docDefaults =
        new DocDefaults(
            RPrDefault(),
            new ParagraphPropertiesDefault(new ParagraphPropertiesBaseStyle()));

    var normalStyle = new Style
    {
        Type = StyleValues.Paragraph,
        StyleId = "Normal",
        Default = true,
    };
    normalStyle.Append(new StyleName() { Val = "Normal" });
    normalStyle.Append(new PrimaryStyle());

    var styles = new Styles(docDefaults, normalStyle);

    styles.Save(sp);
}

static Table CreateCourseGrid()
{
    var table = new Table();
    table.Append(
        new TableProperties(
            new TableWidth() { Width = "5000", Type = TableWidthUnitValues.Pct }));

    TableRow HeaderRow(params string[] cells)
    {
        var tr = new TableRow();
        foreach (var c in cells)
        {
            var cell = new TableCell(
                new TableCellProperties(
                    new TableCellWidth() { Type = TableWidthUnitValues.Auto, Width = "0" }),
                P(c));
            tr.Append(cell);
        }

        return tr;
    }

    TableRow MergeRow(params string[] literals)
    {
        var tr = new TableRow();
        foreach (var literal in literals)
        {
            var tc = new TableCell(P(literal));
            tr.Append(tc);
        }

        return tr;
    }

    table.Append(HeaderRow("Course code", "Course name", "REGISTERED?", "GRADE"));
    table.Append(
        MergeRow(
            "{{CourseTable.Code}}",
            "{{CourseTable.Name}}",
            "{{CourseTable.Registered}}",
            "{{CourseTable.Grade}}"));
    return table;
}
