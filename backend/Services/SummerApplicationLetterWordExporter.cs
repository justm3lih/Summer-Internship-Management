using System.Collections;
using System.IO.Compression;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace InternshipManagement.API.Services;

/// <summary>
/// Yazlık başvuru şablonu (SWEN vb.) iç içe tablolar ve bölük Word etiketleri içerir; MiniWord bu belgede
/// hata vermeden anlamsız çıktı üretebilir. Bu nedenle güvenilir birleştirme Open XML ile yapılır.
/// </summary>
public static class SummerApplicationLetterWordExporter
{
    /// <summary>Şablonu birleştirip .docx baytına yazar.</summary>
    public static byte[] MergeTemplate(byte[] templateBytes, Dictionary<string, object> values) =>
        MergeWithOpenXml(templateBytes, values);

    private static byte[] MergeWithOpenXml(byte[] templateBytes, Dictionary<string, object> values)
    {
        var rows = TryGetCourseRows(values);
        templateBytes = NormalizeDocxZipEntryPaths(templateBytes);

        using var ms = new MemoryStream();
        ms.Write(templateBytes, 0, templateBytes.Length);
        ms.Position = 0;

        var tokens = ScalarTokenMap(values);
        if (tokens.Count == 0)
            throw new InvalidOperationException(
                "Yazlık mektubu Word birleştirme: yer tutucular için skalar etiket sözlüğü boş (şablon doldurulamaz).");

        using (var wd = WordprocessingDocument.Open(ms, true))
        {
            ReplaceScalarPlaceholders(wd, tokens);
            wd.Save();
        }

        ms.Position = 0;
        if (rows is { Count: > 0 })
            ExpandNestedCourseTable(ms, rows);

        ms.Position = 0;
        return ms.ToArray();
    }

    /// <summary>
    /// Bazı araçların ürettiği .docx’lerde ZIP giriş adları <c>word\document.xml</c> biçimindedir; OOXML
    /// özünde hep <c>/</c> ister ve Open XML SDK burada ana parça ilişkisini kaybedebilir. Okunabilir paket için yollar düzeltilir.
    /// </summary>
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

    private static Dictionary<string, string> ScalarTokenMap(Dictionary<string, object> values)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in values)
        {
            if (kv.Key == "CourseTable")
                continue;
            if (kv.Value is IList)
                continue;

            map[kv.Key] = kv.Value?.ToString() ?? "";
        }

        return map;
    }

    /// <summary>
    /// Open XML SDK ile bazı .docx’lerde <see cref="MainDocumentPart.Document"/> null kalır; gövde
    /// aslında <see cref="OpenXmlPartRootElement"/> olarak yüklenir. Yoksa yer tutucu değişimi sessizce atlanır.
    /// </summary>
    private static Document? ResolveMainDocument(WordprocessingDocument wd) =>
        wd.MainDocumentPart?.RootElement as Document ?? wd.MainDocumentPart?.Document;

    private static void ReplaceScalarPlaceholders(WordprocessingDocument wd, Dictionary<string, string> tokens)
    {
        var mdp = wd.MainDocumentPart;
        var documentRoot = ResolveMainDocument(wd);
        if (mdp == null || documentRoot == null)
            return;

        var ordered = tokens
            .OrderByDescending(kv => kv.Key.Length)
            .ToList();

        foreach (var paragraph in documentRoot.Descendants<Paragraph>())
            ReplaceMergedParagraphParagraph(paragraph, ordered);

        foreach (var hp in mdp.HeaderParts)
        {
            if (hp.Header == null)
                continue;
            foreach (var paragraph in hp.Header.Descendants<Paragraph>())
                ReplaceMergedParagraphParagraph(paragraph, ordered);
        }

        foreach (var fp in mdp.FooterParts)
        {
            if (fp.Footer == null)
                continue;
            foreach (var paragraph in fp.Footer.Descendants<Paragraph>())
                ReplaceMergedParagraphParagraph(paragraph, ordered);
        }
    }

    /// <summary>Word’ün böldüğü çalıştırmaları düz bir metin olarak birleştirip <c>{{Token}}</c> değiştirir.</summary>
    private static void ReplaceMergedParagraphParagraph(
        Paragraph paragraph,
        List<KeyValuePair<string, string>> orderedTokens)
    {
        var texts = paragraph.Descendants<Text>().ToList();
        if (!texts.Any())
            return;

        var merged = string.Concat(texts.Select(t => t.Text));
        foreach (var (key, value) in orderedTokens)
        {
            var token = "{{" + key + "}}";
            merged = merged.Replace(token, value, StringComparison.Ordinal);
        }

        if (merged == string.Concat(texts.Select(t => t.Text)))
            return;

        texts[0].Text = merged;
        for (var i = 1; i < texts.Count; i++)
            texts[i].Text = "";
    }

    private static List<Dictionary<string, string>>? TryGetCourseRows(Dictionary<string, object> values)
    {
        if (!values.TryGetValue("CourseTable", out var o) || o is not IList list)
            return null;

        var result = new List<Dictionary<string, string>>();
        foreach (var item in list)
        {
            if (item is not IDictionary<string, object> d)
                continue;
            result.Add(new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["Code"] = Pick(d, "Code"),
                ["Name"] = Pick(d, "Name"),
                ["Registered"] = Pick(d, "Registered"),
                ["Grade"] = Pick(d, "Grade"),
            });
        }

        return result.Count == 0 ? null : result;
    }

    private static string Pick(IDictionary<string, object> row, string key) =>
        row.TryGetValue(key, out var v) ? v?.ToString() ?? "" : "";

    /// <summary>İç tabloda <c>{{CourseTable.*}}</c> içeren ilk veri satırını bulup N-1 kez çoğaltır ve metinleri doldurur.</summary>
    private static void ExpandNestedCourseTable(MemoryStream editableDoc, IReadOnlyList<Dictionary<string, string>> rows)
    {
        using var wd = WordprocessingDocument.Open(editableDoc, true);
        var document = ResolveMainDocument(wd);
        if (document?.Body == null)
            return;

        var templateRow = FindCourseTemplateRow(document.Body);
        if (templateRow is not { Parent: Table innerTable })
            return;

        var anchor = templateRow;
        for (var i = 1; i < rows.Count; i++)
        {
            var nr = (TableRow)templateRow.CloneNode(true);
            anchor = innerTable.InsertAfter(nr, anchor)!;
        }

        var tblRows = innerTable.Elements<TableRow>().ToList();
        var startIdx = tblRows.FindIndex(o => ReferenceEquals(o, templateRow));
        if (startIdx < 0)
            return;

        var dataRows = tblRows.Skip(startIdx).Take(rows.Count).ToList();
        if (dataRows.Count < rows.Count)
            return;

        for (var r = 0; r < rows.Count; r++)
            FillCourseRowTextsMerged(dataRows[r], rows[r]);

        wd.Save();
    }

    private static TableRow? FindCourseTemplateRow(Body body)
    {
        foreach (var table in body.Descendants<Table>())
        {
            if (table.Descendants<Table>().Any())
                continue;

            foreach (var row in table.Elements<TableRow>())
            {
                if (RowContainsCourseMarkers(row))
                    return row;
            }
        }

        return null;
    }

    private static bool RowContainsCourseMarkers(TableRow row) =>
        row.InnerText.Contains("{{CourseTable.", StringComparison.Ordinal);

    /// <summary>Bölük çalıştırmalı hücreler için satırdaki tüm <see cref="Text"/> düğümlerini birleştirip sonra dersetiketini değiştirir.</summary>
    private static void FillCourseRowTextsMerged(TableRow row, Dictionary<string, string> data)
    {
        foreach (var cell in row.Descendants<TableCell>())
        {
            var texts = cell.Descendants<Text>().ToList();
            if (!texts.Any())
                continue;
            var merged = string.Concat(texts.Select(t => t.Text));
            merged = merged.Replace("{{CourseTable.Code}}", data["Code"], StringComparison.Ordinal);
            merged = merged.Replace("{{CourseTable.Name}}", data["Name"], StringComparison.Ordinal);
            merged = merged.Replace("{{CourseTable.Registered}}", data["Registered"], StringComparison.Ordinal);
            merged = merged.Replace("{{CourseTable.Grade}}", data["Grade"], StringComparison.Ordinal);

            texts[0].Text = merged;
            for (var i = 1; i < texts.Count; i++)
                texts[i].Text = "";
        }
    }
}
