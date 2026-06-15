using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;
using InternshipManagement.API.Models;

namespace InternshipManagement.API.Services;

/// <summary>
/// SWEN300 rapor .docx — skaler <c>{{Rpt…}}</c> birleştirme. Varsayılan CIU şablonunda Word içindekiler alanı korunur.
/// İsteğe bağlı <c>{{RPT_TOC_BLOCK}}</c> (minimal/iskelet şablonda) programatik tablolu içindekiler üretir.
/// <c>{{RPT_FIGURES_BLOCK}}</c> PNG gömme için tek paragraf.
/// </summary>
public static class TrainingReportWordExporter
{
    public const string TocMarker = "{{RPT_TOC_BLOCK}}";
    public const string FiguresMarker = "{{RPT_FIGURES_BLOCK}}";

    public static Dictionary<string, object> BuildMergeDictionary(
        Application application,
        User student,
        Company? company,
        TrainingReportContentDto content,
        TrainingReport? report = null)
    {
        SplitName(student.Name, out var first, out var last);
        var now = DateTime.UtcNow;
        var studentSignUtc = report?.SubmittedAt ?? now;
        var studentSlash = FormatSlashDate(studentSignUtc);
        var supervisorSlash = report?.ApprovedAt is { } appr ? FormatSlashDate(appr) : "— / — / —";

        var refLines = (content.References ?? new List<string>())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .ToList();
        var refs = refLines.Count > 0
            ? string.Join("\n\n", refLines.Select((r, i) => $"[{i + 1}]\t{r}"))
            : "—";

        // Legacy dyn variable removed as sections are handled individually in the dictionary below.

        var dict = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["RptStudentFirstName"] = first,
            ["RptStudentLastName"] = last,
            ["RptStudentNumber"] = student.StudentId?.Trim() ?? "—",
            ["RptReportDay"] = now.Day.ToString(),
            ["RptReportMonth"] = now.ToString("MMMM"),
            ["RptReportYear"] = now.Year.ToString(),
            ["RptCompanyName"] = company?.Name?.Trim() ?? "—",
            ["RptCompanyAddress"] = company?.Address?.Trim() ?? "—",
            ["RptTrainingStart"] = FormatDate(application.InternshipStartDate),
            ["RptTrainingEnd"] = FormatDate(application.InternshipEndDate),
            ["RptCompanyPhone"] = company?.Phone?.Trim() ?? "—",
            ["RptCompanyWeb"] = company?.Website?.Trim() ?? "—",
            ["RptIntroduction"] = content.Introduction,
            ["RptIntroductionSections"] = FormatDynamicSections(content.IntroductionSections),
            ["RptCompanyIntro"] = content.CompanyIntro,
            ["RptCompany21"] = content.Company21,
            ["RptCompany22"] = content.Company22,
            ["RptCompanySections"] = FormatDynamicSections(content.CompanySections),
            ["RptWorkExperienceIntro"] = content.WorkExperienceIntro,
            ["RptProblemDefinition"] = content.ProblemDefinition,
            ["RptWorkDoneIntro"] = content.WorkDoneIntro,
            ["RptTask1Title"] = string.IsNullOrWhiteSpace(content.Task1Title) ? "Task1" : content.Task1Title.Trim(),
            ["RptTask1Body"] = content.Task1Body,
            ["RptTask2Title"] = string.IsNullOrWhiteSpace(content.Task2Title) ? "Task2" : content.Task2Title.Trim(),
            ["RptTask2Body"] = content.Task2Body,
            ["RptWorkExperienceSections"] = FormatDynamicSections(content.WorkExperienceSections),
            ["RptDynamicSections"] = FormatDynamicSections(content.WorkExperienceSections), // Legacy compatibility
            ["RptLimitations"] = content.Limitations,
            ["RptRecentTopics"] = content.RecentTopics,
            ["RptConclusion"] = content.Conclusion,
            ["RptConclusionSections"] = FormatDynamicSections(content.ConclusionSections),
            ["RptAppendix"] = content.Appendix,
            ["RptReferences"] = refs,
            ["RptStudentSignatureDateSlash"] = studentSlash,
            ["RptTraineeSupervisorSignatureDateSlash"] = supervisorSlash,
            ["StudentSignatureDateSlash"] = studentSlash,
            ["TraineeSupervisorSignatureDateSlash"] = supervisorSlash,
        };

        return dict;
    }

    public static byte[] MergeDocument(
        byte[] templateBytes,
        Dictionary<string, object> values,
        IReadOnlyList<(Stream PngStream, string Caption)> figures)
    {
        templateBytes = NormalizeDocxZipEntryPaths(templateBytes);

        using var ms = new MemoryStream();
        ms.Write(templateBytes, 0, templateBytes.Length);
        ms.Position = 0;

        var tokens = ScalarTokenMap(values);

        using (var wd = WordprocessingDocument.Open(ms, true))
        {
            ReplaceScalarPlaceholders(wd, tokens);
            var doc = ResolveMainDocument(wd);
            var body = doc?.Body;
            var mainPart = wd.MainDocumentPart;
            if (body != null && mainPart != null)
            {
                EnsureUpdateFieldsOnOpen(mainPart);
                if (BodyContainsMarker(body, TocMarker))
                    ExpandMarkerWithTocTable(body, TocMarker, BuildTocRows(values, figures.Count));
                ExpandFiguresMarker(mainPart, body, FiguresMarker, figures);
            }

            wd.Save();
        }

        ms.Position = 0;
        return ms.ToArray();
    }

    /// <summary>
    /// CIU şablonundaki yer imleri — üçüncü sütunda PAGEREF ile sayfa numarası üretilir (Word alanı).
    /// Portal dinamik alt başlıklarında yer imi olmadığı için sayfa hücresi "—" kalır.
    /// </summary>
    private sealed record TocRow(string Outline, string Title, string? PageBookmark);

    private static List<TocRow> BuildTocRows(Dictionary<string, object> values, int figureCount)
    {
        var rows = new List<TocRow>
        {
            new("1", "INTRODUCTION", "_Toc76721006")
        };

        foreach (var ds in ParseDynamicForToc(Rpt(values, "RptIntroductionSections")))
            rows.Add(ParseDynamicTocRow(ds));

        rows.Add(new("2", "INFORMATION ABOUT THE COMPANY", "_Toc76721007"));
        rows.Add(new("2.1", "Aim and Establishment of the Company", "_Toc76721008"));
        rows.Add(new("2.2", "Departments and Personnel of the Company", "_Toc76721009"));

        foreach (var ds in ParseDynamicForToc(Rpt(values, "RptCompanySections")))
            rows.Add(ParseDynamicTocRow(ds));

        rows.Add(new("3", "WORK EXPERIENCE", "_Toc76721010"));
        rows.Add(new("3.1", "Problem Definition", "_Toc76721011"));
        rows.Add(new("3.2", "Work Done", "_Toc76721012"));
        rows.Add(new("", Rpt(values, "RptTask1Title"), null));
        rows.Add(new("", Rpt(values, "RptTask2Title"), null));

        foreach (var ds in ParseDynamicForToc(Rpt(values, "RptWorkExperienceSections")))
            rows.Add(ParseDynamicTocRow(ds));

        rows.Add(new("3.3", "Limitations and Experience Gained", "_Toc76721015"));
        rows.Add(new("4", "RECENT TOPICS IN THE CONTEXT OF WORK DONE", "_Toc76721016"));
        rows.Add(new("5", "CONCLUSION", "_Toc76721017"));

        foreach (var ds in ParseDynamicForToc(Rpt(values, "RptConclusionSections")))
            rows.Add(ParseDynamicTocRow(ds));

        rows.Add(new("6", "REFERENCES", "_Toc76721018"));
        rows.Add(new("7", "APPENDIX", "_Toc76721019"));
        if (figureCount > 0)
            rows.Add(new("", $"Figures ({figureCount})", null));

        return rows;
    }

    private static TocRow ParseDynamicTocRow(string dsLine)
    {
        var m = Regex.Match(dsLine.Trim(), @"^(\d+(?:\.\d+)*)\s+(.+)$");
        if (!m.Success)
            return new("", dsLine.Trim(), null);
        return new(m.Groups[1].Value, m.Groups[2].Value.Trim(), null);
    }

    private static string Rpt(Dictionary<string, object> values, string key) =>
        values.TryGetValue(key, out var v) ? v?.ToString() ?? "" : "";

    private static IEnumerable<string> ParseDynamicForToc(string dynBlock)
    {
        if (string.IsNullOrWhiteSpace(dynBlock))
            yield break;
        foreach (var raw in dynBlock.Split("\n\n", StringSplitOptions.RemoveEmptyEntries))
        {
            var line = raw.Trim();
            var nl = line.IndexOf('\n');
            if (nl < 0)
                continue;
            var head = line[..nl].Trim();
            yield return head;
        }
    }

    private static string FormatDynamicSections(List<TrainingReportDynamicSectionDto>? items)
    {
        if (items == null || items.Count == 0)
            return "";

        static int[] Parts(string s) =>
            s.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(p => int.TryParse(p, out var n) ? n : 0).ToArray();

        var sorted = items
            .Where(i => !string.IsNullOrWhiteSpace(i.Title))
            .OrderBy(i => Parts(i.OutlineNumber), new OutlineComparer())
            .ToList();

        var sb = new StringBuilder();
        foreach (var i in sorted)
        {
            var num = string.IsNullOrWhiteSpace(i.OutlineNumber) ? "" : i.OutlineNumber.Trim() + " ";
            sb.Append(num).Append(i.Title.Trim()).Append('\n')
                .Append(NormalizeWhitespace(i.Body)).Append("\n\n");
        }

        return sb.ToString().Trim();
    }

    private sealed class OutlineComparer : IComparer<int[]>
    {
        public int Compare(int[]? x, int[]? y)
        {
            x ??= Array.Empty<int>();
            y ??= Array.Empty<int>();
            var n = Math.Max(x.Length, y.Length);
            for (var i = 0; i < n; i++)
            {
                var a = i < x.Length ? x[i] : 0;
                var b = i < y.Length ? y[i] : 0;
                var c = a.CompareTo(b);
                if (c != 0) return c;
            }

            return 0;
        }
    }

    private static bool BodyContainsMarker(Body body, string marker) =>
        body.Descendants<Paragraph>().Any(p => p.InnerText.IndexOf(marker, StringComparison.Ordinal) >= 0);

    private static void EnsureUpdateFieldsOnOpen(MainDocumentPart mainPart)
    {
        var part = mainPart.DocumentSettingsPart ?? mainPart.AddNewPart<DocumentSettingsPart>();
        part.Settings ??= new Settings();
        var ufo = part.Settings.GetFirstChild<UpdateFieldsOnOpen>();
        if (ufo == null)
            part.Settings.PrependChild(new UpdateFieldsOnOpen { Val = true });
        else if (!ufo.Val?.Value ?? false)
            ufo.Val = true;
    }

    private static void ExpandMarkerWithTocTable(Body body, string marker, IReadOnlyList<TocRow> rows)
    {
        var markerPara = body.Descendants<Paragraph>()
            .FirstOrDefault(p => p.InnerText.IndexOf(marker, StringComparison.Ordinal) >= 0);
        if (markerPara == null)
            return;

        var table = BuildTocTable(rows);
        var insertAfter = markerPara.InsertAfterSelf(table)!;
        var hint = new Paragraph(
            new ParagraphProperties(new SpacingBetweenLines { After = "120" }),
            new Run(
                new RunProperties(new Italic()),
                new Text(
                        "Sayfa sütunu Word alanıdır; rakamlar görünmüyorsa Ctrl+A ardından F9 ile alanları güncelleyin. Dinamik alt başlıklar için yer imi olmadığından sayfa gösterilmez (—).")
                    { Space = SpaceProcessingModeValues.Preserve }));
        insertAfter.InsertAfterSelf(hint);
        markerPara.Remove();
    }

    private static Table BuildTocTable(IReadOnlyList<TocRow> rows)
    {
        const string twipsOutline = "900";
        const string twipsTitle = "7660";
        const string twipsPage = "800";

        var table = new Table(
            new TableProperties(
                new TableStyle { Val = "TableGrid" },
                new TableWidth { Width = "9360", Type = TableWidthUnitValues.Dxa }),
            new TableGrid(
                new GridColumn { Width = twipsOutline },
                new GridColumn { Width = twipsTitle },
                new GridColumn { Width = twipsPage }));

        var headerCell = new TableCell(
            new TableCellProperties(
                new GridSpan { Val = 3 },
                new TableCellWidth { Width = "9360", Type = TableWidthUnitValues.Dxa }),
            new Paragraph(
                new ParagraphProperties(new Justification { Val = JustificationValues.Center }),
                new Run(
                    new RunProperties(new Bold()),
                    new Text("TABLE OF CONTENTS") { Space = SpaceProcessingModeValues.Preserve })));
        table.AppendChild(new TableRow(headerCell));

        foreach (var row in rows)
            table.AppendChild(BuildTocDataRow(row, twipsOutline, twipsTitle, twipsPage));

        return table;
    }

    private static TableRow BuildTocDataRow(TocRow row, string wOutline, string wTitle, string wPage)
    {
        return new TableRow(
            TocOutlineCell(row.Outline, wOutline),
            TocTitleCell(row.Title, wTitle),
            TocPageCell(row.PageBookmark, wPage));
    }

    private static TableCell TocOutlineCell(string outline, string width)
    {
        var text = string.IsNullOrWhiteSpace(outline) ? " " : outline.Trim();
        var p = new Paragraph(
            new ParagraphProperties(new Justification { Val = JustificationValues.Center }),
            new Run(new Text(text) { Space = SpaceProcessingModeValues.Preserve }));
        return new TableCell(
            new TableCellProperties(new TableCellWidth { Width = width, Type = TableWidthUnitValues.Dxa }),
            p);
    }

    private static TableCell TocTitleCell(string title, string width)
    {
        var p = new Paragraph(new Run(new Text(title.Trim()) { Space = SpaceProcessingModeValues.Preserve }));
        return new TableCell(
            new TableCellProperties(new TableCellWidth { Width = width, Type = TableWidthUnitValues.Dxa }),
            p);
    }

    private static TableCell TocPageCell(string? bookmark, string width)
    {
        var p = new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Right }));
        if (string.IsNullOrEmpty(bookmark))
        {
            p.AppendChild(new Run(new Text("—") { Space = SpaceProcessingModeValues.Preserve }));
            return new TableCell(
                new TableCellProperties(new TableCellWidth { Width = width, Type = TableWidthUnitValues.Dxa }),
                p);
        }

        var sf = new SimpleField { Instruction = $" PAGEREF {bookmark} \\h " };
        p.AppendChild(sf);

        return new TableCell(
            new TableCellProperties(new TableCellWidth { Width = width, Type = TableWidthUnitValues.Dxa }),
            p);
    }

    private static void ExpandFiguresMarker(
        MainDocumentPart mainPart,
        Body body,
        string marker,
        IReadOnlyList<(Stream PngStream, string Caption)> figures)
    {
        var markerPara = body.Descendants<Paragraph>()
            .FirstOrDefault(p => p.InnerText.IndexOf(marker, StringComparison.Ordinal) >= 0);
        if (markerPara == null)
            return;

        if (figures.Count == 0)
        {
            markerPara.Remove();
            return;
        }

        OpenXmlElement insertAfter = markerPara;
        var figNum = 1;
        foreach (var (stream, caption) in figures)
        {
            stream.Position = 0;
            var drawingPara = CreatePictureParagraph(mainPart, stream, $"Figure{figNum}");
            insertAfter = insertAfter.InsertAfterSelf(drawingPara)!;
            var cap = string.IsNullOrWhiteSpace(caption) ? $"Figure {figNum}" : caption.Trim();
            var capPara = new Paragraph(new Run(new Text($"Figure {figNum}: {cap}") { Space = SpaceProcessingModeValues.Preserve }));
            insertAfter = insertAfter.InsertAfterSelf(capPara)!;
            figNum++;
        }

        markerPara.Remove();
    }

    private static Paragraph CreatePictureParagraph(MainDocumentPart mainPart, Stream pngStream, string name)
    {
        var imagePart = mainPart.AddImagePart(ImagePartType.Png);
        pngStream.Position = 0;
        imagePart.FeedData(pngStream);
        var rid = mainPart.GetIdOfPart(imagePart);

        const long cx = 3600000L;
        const long cy = 3600000L;

        var drawing = new Drawing(
            new DW.Inline(
                new DW.Extent { Cx = cx, Cy = cy },
                new DW.DocProperties { Id = (UInt32Value)1U, Name = name },
                new DW.NonVisualGraphicFrameDrawingProperties(new A.GraphicFrameLocks { NoChangeAspect = true }),
                new A.Graphic(
                    new A.GraphicData(
                            new PIC.Picture(
                                new PIC.NonVisualPictureProperties(
                                    new PIC.NonVisualDrawingProperties { Id = (UInt32Value)0U, Name = name },
                                    new PIC.NonVisualPictureDrawingProperties()),
                                new PIC.BlipFill(
                                    new A.Blip { Embed = rid, CompressionState = A.BlipCompressionValues.Print },
                                    new A.Stretch(new A.FillRectangle())),
                                new PIC.ShapeProperties(
                                    new A.Transform2D(
                                        new A.Offset { X = 0L, Y = 0L },
                                        new A.Extents { Cx = cx, Cy = cy }),
                                    new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle }))
                        )
                        { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" })
            )
            {
                DistanceFromTop = (UInt32Value)0U,
                DistanceFromBottom = (UInt32Value)0U,
                DistanceFromLeft = (UInt32Value)0U,
                DistanceFromRight = (UInt32Value)0U,
                EditId = "0"
            });

        return new Paragraph(new Run(drawing));
    }

    private static Dictionary<string, string> ScalarTokenMap(Dictionary<string, object> values)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in values)
            map[kv.Key] = kv.Value?.ToString() ?? "";
        return map;
    }

    private static Document? ResolveMainDocument(WordprocessingDocument wd) =>
        wd.MainDocumentPart?.RootElement as Document ?? wd.MainDocumentPart?.Document;

    private static void ReplaceScalarPlaceholders(WordprocessingDocument wd, Dictionary<string, string> tokens)
    {
        var mdp = wd.MainDocumentPart;
        var documentRoot = ResolveMainDocument(wd);
        if (mdp == null || documentRoot == null)
            return;

        var ordered = tokens.OrderByDescending(kv => kv.Key.Length).ToList();

        foreach (var paragraph in documentRoot.Descendants<Paragraph>())
            ReplaceMergedParagraphParagraph(paragraph, ordered);

        foreach (var hp in mdp.HeaderParts)
        {
            if (hp.Header == null) continue;
            foreach (var paragraph in hp.Header.Descendants<Paragraph>())
                ReplaceMergedParagraphParagraph(paragraph, ordered);
        }

        foreach (var fp in mdp.FooterParts)
        {
            if (fp.Footer == null) continue;
            foreach (var paragraph in fp.Footer.Descendants<Paragraph>())
                ReplaceMergedParagraphParagraph(paragraph, ordered);
        }
    }

    private static void ReplaceMergedParagraphParagraph(
        Paragraph paragraph,
        List<KeyValuePair<string, string>> orderedTokens)
    {
        var texts = paragraph.Descendants<Text>().ToList();
        if (!texts.Any())
            return;

        var originalMerged = string.Concat(texts.Select(t => t.Text));
        var merged = originalMerged;
        foreach (var (key, value) in orderedTokens)
        {
            var token = "{{" + key + "}}";
            merged = merged.Replace(token, value, StringComparison.Ordinal);
        }

        if (merged == originalMerged)
            return;

        var isReferencesParagraph =
            originalMerged.Contains("{{RptReferences}}", StringComparison.Ordinal);

        var splitIntoParagraphs =
            isReferencesParagraph
            || originalMerged.Contains("{{RptDynamicSections}}", StringComparison.Ordinal);

        // Tek <w:t> içinde \n Word'de paragraf yapmaz; REFERENCES / dinamik bölümler şablondaki madde düzenine uysun diye \n\n → yeni <w:p>.
        // Diğer Rpt alanlarında çoklu <w:p> şablondaki yer imlerini kırabileceğinden yalnızca satır sonu <w:br> kullanılır.
        if (merged.IndexOf('\n') >= 0 || merged.IndexOf('\r') >= 0)
        {
            if (splitIntoParagraphs)
                ReplaceParagraphWithMergedMultiline(paragraph, merged, isReferencesParagraph);
            else
                ReplaceParagraphWithMergedLineBreaksOnly(paragraph, merged);
            return;
        }

        if (isReferencesParagraph)
        {
            ReplaceReferencesParagraphSingle(paragraph, merged);
            return;
        }

        texts[0].Text = merged;
        for (var i = 1; i < texts.Count; i++)
            texts[i].Text = "";
    }

    /// <summary>
    /// Kaynakça tek madde (tek satır) — yine de askılı girinti + sekme durağı uygula (şablonda yoksa bile görünür düzen).
    /// </summary>
    private static void ReplaceReferencesParagraphSingle(Paragraph paragraph, string merged)
    {
        var props = CloneParagraphPropertiesWithBibliographyLayout(
            paragraph.ParagraphProperties?.CloneNode(true) as ParagraphProperties);
        paragraph.RemoveAllChildren();
        paragraph.PrependChild(props);
        paragraph.AppendChild(new Run(new Text(merged) { Space = SpaceProcessingModeValues.Preserve }));
    }

    /// <summary>
    /// CIU gövde şablonu <c>1.\tMetin</c> kullanır; şablonda sekme durağı / askılı girinti tanımı olmadan kaynakça düzgün kırılmaz.
    /// Yer tutucu paragraftaki yazı tipi vb. korunur; yalnızca kaynakça düzeni eklenir.
    /// </summary>
    private static ParagraphProperties CloneParagraphPropertiesWithBibliographyLayout(
        ParagraphProperties? clonedFromTemplate)
    {
        var p = clonedFromTemplate != null
            ? (ParagraphProperties)clonedFromTemplate.CloneNode(true)!
            : new ParagraphProperties();

        foreach (var ind in p.Descendants<Indentation>().ToList())
            ind.Remove();

        p.GetFirstChild<Tabs>()?.Remove();

        const string bibTwips = "720"; // ~1,27 cm / 0,5 in — yaygın kaynakça askılı girinti
        p.AppendChild(new Indentation { Left = bibTwips, Hanging = bibTwips });
        p.AppendChild(new Tabs(new TabStop { Val = TabStopValues.Left, Position = 720 }));

        return p;
    }

    private static void ReplaceParagraphWithMergedLineBreaksOnly(Paragraph paragraph, string merged)
    {
        var paraProps = paragraph.ParagraphProperties?.CloneNode(true) as ParagraphProperties;
        paragraph.RemoveAllChildren();
        if (paraProps != null)
            paragraph.PrependChild(paraProps.CloneNode(true)!);
        AppendBlockLinesAsRuns(paragraph, merged);
    }

    /// <summary>
    /// Çift satır sonunu Word paragraflarına böler; blok içindeki tek satır sonlarını line break yapar.
    /// Böylece REFERENCES listesi şablondaki gibi madde madde düşer (tek paragrafa yapışmaz).
    /// </summary>
    private static void ReplaceParagraphWithMergedMultiline(
        Paragraph paragraph,
        string merged,
        bool useBibliographyParagraphLayout)
    {
        var rawProps = paragraph.ParagraphProperties?.CloneNode(true) as ParagraphProperties;

        var blocks = merged
            .Split(NewParagraphSeparators, StringSplitOptions.None)
            .Select(static b => b.Trim('\r', '\n'))
            .Where(static b => b.Length > 0)
            .ToList();

        paragraph.RemoveAllChildren();

        ParagraphProperties? firstParaProps = useBibliographyParagraphLayout
            ? CloneParagraphPropertiesWithBibliographyLayout(rawProps)
            : rawProps?.CloneNode(true) as ParagraphProperties;
        if (firstParaProps != null)
            paragraph.PrependChild(firstParaProps);

        if (blocks.Count == 0)
        {
            paragraph.AppendChild(new Run(new Text(" ") { Space = SpaceProcessingModeValues.Preserve }));
            return;
        }

        AppendBlockLinesAsRuns(paragraph, blocks[0]);

        OpenXmlElement insertAfter = paragraph;
        for (var bi = 1; bi < blocks.Count; bi++)
        {
            var nextPara = new Paragraph();
            ParagraphProperties? nextProps = useBibliographyParagraphLayout
                ? CloneParagraphPropertiesWithBibliographyLayout(rawProps)
                : rawProps?.CloneNode(true) as ParagraphProperties;
            if (nextProps != null)
                nextPara.PrependChild(nextProps);
            AppendBlockLinesAsRuns(nextPara, blocks[bi]);
            insertAfter = insertAfter.InsertAfterSelf(nextPara)!;
        }
    }

    private static readonly string[] NewParagraphSeparators = ["\r\n\r\n", "\n\n"];

    private static void AppendBlockLinesAsRuns(Paragraph p, string block)
    {
        // Blok içindeki çift \n zaten multiline tarafından ayrıldı. 
        // Burada kalan tek \n'ler <br> gibidir.
        // Ama biz artık HTML destekliyoruz.
        var lines = block.Split(NewLineSeparators, StringSplitOptions.None);
        var first = true;
        foreach (var line in lines)
        {
            if (!first)
                p.AppendChild(new Run(new Break()));
            first = false;
            AppendHtmlAsRuns(p, line);
        }
    }

    private static void AppendHtmlAsRuns(Paragraph p, string html)
    {
        if (string.IsNullOrEmpty(html)) return;

        // Basit HTML parser: <b>, <i>, <strong>, <em>, <br>
        var segments = Regex.Split(html, @"(<[^>]+>)");
        bool bold = false;
        bool italic = false;

        foreach (var seg in segments)
        {
            if (string.IsNullOrEmpty(seg)) continue;

            if (seg.StartsWith("<"))
            {
                var tag = seg.ToLower();
                if (tag == "<b>" || tag == "<strong>") bold = true;
                else if (tag == "</b>" || tag == "</strong>") bold = false;
                else if (tag == "<i>" || tag == "<em>") italic = true;
                else if (tag == "</i>" || tag == "</em>") italic = false;
                else if (tag == "<br>" || tag == "<br/>" || tag == "<br />") p.AppendChild(new Run(new Break()));
                continue;
            }

            // Düz metin - Bold/Italic özelliklerini uygula
            var run = new Run();
            var rp = new RunProperties();
            if (bold) rp.AppendChild(new Bold());
            if (italic) rp.AppendChild(new Italic());
            run.AppendChild(rp);
            run.AppendChild(new Text(WebUtility.HtmlDecode(seg)) { Space = SpaceProcessingModeValues.Preserve });
            p.AppendChild(run);
        }
    }

    private static readonly string[] NewLineSeparators = ["\r\n", "\n"];

    private static byte[] NormalizeDocxZipEntryPaths(byte[] raw)
    {
        using var readMs = new MemoryStream(raw);
        try
        {
            using var read = new ZipArchive(readMs, ZipArchiveMode.Read, leaveOpen: false);
            if (read.Entries.All(e => !e.FullName.Contains('\\')))
                return raw;
        }
        catch (InvalidDataException)
        {
            return raw;
        }

        using var readMs2 = new MemoryStream(raw);
        using var writeMs = new MemoryStream(capacity: raw.Length + 4096);

        using (var read = new ZipArchive(readMs2, ZipArchiveMode.Read))
        using (var write = new ZipArchive(writeMs, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var src in read.Entries)
            {
                var name = src.FullName.Replace('\\', '/').Trim('/');
                if (name.Length == 0)
                    continue;

                using var inp = src.Open();
                var dst = write.CreateEntry(name, CompressionLevel.Optimal);
                using var outp = dst.Open();
                inp.CopyTo(outp);
            }
        }

        return writeMs.ToArray();
    }

    private static void SplitName(string? full, out string first, out string last)
    {
        full = (full ?? "").Trim();
        var i = full.IndexOf(' ');
        if (i < 0)
        {
            first = full;
            last = "";
            return;
        }

        first = full[..i].Trim();
        last = full[(i + 1)..].Trim();
    }

    private static string NormalizeWhitespace(string? s)
    {
        if (string.IsNullOrWhiteSpace(s))
            return "—";
        return s.Trim();
    }

    private static string FormatDate(DateTime? utcDate) =>
        utcDate.HasValue ? utcDate.Value.ToString("yyyy-MM-dd") : "—";

    /// <summary>Gün / ay / yıl (UTC), şablondaki imza satırları için.</summary>
    private static string FormatSlashDate(DateTime utc) =>
        $"{utc.Day:00} / {utc.Month:00} / {utc.Year}";
}
