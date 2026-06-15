using System.Text.Json;
using InternshipManagement.API.Models;
using InternshipManagement.API.Services;

// SWEN300 rapor şablonunu DB/API olmadan test verisiyle doldurur.
// Çıktı: arg verilirse o yol, yoksa %TEMP%/training_report_sample_<utc>.docx

static string FindTemplatesDir()
{
    var dir = new DirectoryInfo(AppContext.BaseDirectory);
    while (dir != null)
    {
        var candidate = Path.Combine(dir.FullName, "Templates", "logbook_template.docx");
        if (File.Exists(candidate))
            return Path.Combine(dir.FullName, "Templates");
        dir = dir.Parent;
    }

    throw new InvalidOperationException(
        "Templates klasörü bulunamadı. Komutu backend klasöründen veya çözüm kökünden çalıştırın.");
}

static string ReadTrainingReportTemplateFileName(string templatesDir)
{
    try
    {
        var appsettings = Path.Combine(Directory.GetParent(templatesDir)!.FullName, "appsettings.json");
        if (!File.Exists(appsettings))
            return "SWEN300_REPORT_TEMPLATE_2022_v1.docx";
        using var doc = JsonDocument.Parse(File.ReadAllText(appsettings));
        if (doc.RootElement.TryGetProperty("WordTemplates", out var wt)
            && wt.TryGetProperty("TrainingReportFileName", out var n))
        {
            var name = n.GetString()?.Trim();
            if (!string.IsNullOrEmpty(name))
                return name;
        }
    }
    catch
    {
        /* fallback */
    }

    return "SWEN300_REPORT_TEMPLATE_2022_v1.docx";
}

var templatesDir = FindTemplatesDir();
var templateName = ReadTrainingReportTemplateFileName(templatesDir);
var templatePath = Path.Combine(templatesDir, templateName);
if (!File.Exists(templatePath))
{
    Console.Error.WriteLine($"Şablon yok: {templatePath}");
    Console.Error.WriteLine("WordTemplates:TrainingReportFileName veya portal şablonunu Templates altına koyun.");
    return 1;
}

var outPath = args.Length > 0
    ? Path.GetFullPath(args[0])
    : Path.Combine(Path.GetTempPath(), $"training_report_sample_{DateTime.UtcNow:yyyyMMdd_HHmmss}.docx");

var company = new Company
{
    Id = "co-demo",
    Name = "Atlas Yazılım ve Danışmanlık Ltd.",
    Sector = "Bilgi teknolojileri ve yazılım ürünleri",
    Address = "Organize Sanayi Bölgesi, Teknoloji Cad. No: 14, Yenişehir, Lefkoşa 99010, KKTC",
    Location = "Lefkoşa",
    Description =
        "Kamu ve özel sektöre kurumsal web, mobil ve entegrasyon projeleri sunan; .NET ve bulut tabanlı çözümlerde uzmanlaşmış yazılım şirketi.",
    FieldsOfWork =
        "Özel yazılım geliştirme, API ve mikroservis mimarisi, DevOps, iş analizi ve sürekli destek.",
    Phone = "+90 392 444 12 90",
    Fax = "+90 392 444 12 91",
    ContactEmail = "iletisim@atlas-yazilim.demo.kktc",
    Website = "https://www.atlas-yazilim.demo.kktc",
};

var student = new User
{
    Id = "st-demo",
    Name = "Elif Yılmaz",
    Email = "elif.yilmaz2024@std.ciu.edu.tr",
    Role = "student",
    StudentId = "202403218",
    Department = "Software Engineering",
    CurrentSemester = 6,
    Cgpa = 3.41,
    HomeAddress = "Alsancak, Girne — KKTC",
    MobileTelephone = "+90 533 210 44 67",
    AddressNorthCyprus = "Yurt: CIU Kampüsü, Üçköşeler, Lefkoşa",
};

var application = new Application
{
    Id = "app-demo",
    Status = "completed",
    StudentId = student.Id,
    Student = student,
    CompanyId = company.Id,
    Company = company,
    InternshipStartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
    InternshipEndDate = new DateTime(2026, 8, 28, 0, 0, 0, DateTimeKind.Utc),
};

var content = new TrainingReportContentDto
{
    Introduction =
        "Bu rapor, Uluslararası Kıbrıs Üniversitesi (CIU) Mühendislik Fakültesi Bilgisayar Mühendisliği lisans programı çerçevesinde alınması "
        + "zorunlu olan yaz stajı (SWEN300) dersine ilişkin sahada geçirdiğim süreyi ve çıktıları akademik formatta belgelemektedir. Staj, "
        + "yalnızca kod yazmak değil; gereksinimleri doğru anlamak, teslim tarihlerine saygı duymak, ekip içi iletişimi sürdürmek ve üretim "
        + "ortamının beklentilerini gözetmek gibi yazılım mühendisliğinin ‘yumuşak’ ve ‘sert’ boyutlarını birlikte deneyimlememi sağlamıştır.\n\n"
        + "Stajımı Atlas Yazılım ve Danışmanlık Ltd. şirketinin Lefkoşa’daki ana ofisinde tam zamanlı olarak gerçekleştirdim. Kuruma dahil "
        + "olmadan önce iş güvenliği ve bilgi güvenliği farkındalığı eğitimleri, geliştirici araçlarına erişim (kurumsal VPN, kaynak kod "
        + "depoları, iş takip panosu) ve kurumsal iletişim kanalları (Teams, e-posta grupları) konusunda yönlendirme aldım. İlk hafta boyunca "
        + "mentorum eşliğinde şirket içi wiki’de yer alan mimari özetleri, sözlük terimlerini ve müşteri bazlı yapılandırma farklılıklarını "
        + "okuyarak bağlam oluşturmaya çalıştım.\n\n"
        + "Teknik olarak önceliğim, halihazırda kullanımda olan ancak yıllar içinde büyümüş bir ödeme ve mutabakat modülünün modern bir API "
        + "katmanı üzerinden dış dünyaya güvenli biçimde açılmasına katkı vermek oldu. Bu süreçte Scrum takımının parçası olarak sprint "
        + "planlama toplantılarına katıldım, günlük durum güncellemelerini paylaştım ve görev tahminlerinde bulundum. Kod incelemelerinde "
        + "hem öğrenen hem de küçük ölçekte geri bildirim veren roller üstlendim.\n\n"
        + "Raporun ilerleyen bölümlerinde sırasıyla şirketin kuruluş amacı ve örgütlenmesi, staj süresince üstlendiğim iş deneyiminin bağlamı, "
        + "problem tanımı, yürütülen işler ve alt başlıklar, karşılaştığım kısıtlar ile kazanılan deneyim, güncel teknik konularla ilişkilendirme, "
        + "sonuç değerlendirmesi, kaynakça ve ekler yer almaktadır. Metinlerde müşteri ve kurum içi gizli bilgiler yer almaması için gerçek "
        + "kurumsal adlar, kurumsal anahtarlar ve iş kuralları ayrıntıları genelleştirilmiş ya da anonimleştirilmiştir.",

    CompanyIntro =
        "Atlas Yazılım ve Danışmanlık Ltd., Kuzey Kıbrıs Türk Cumhuriyeti’nde faaliyet gösteren ve başlıca kamu kurumları ile orta ve büyük "
        + "ölçekli özel sektör kuruluşlarına yazılım projesi teslim eden bir mühendislik şirketidir. Şirketin iş modeli, uzun süreli bakım "
        + "sözleşmeleri ve proje bazlı siparişlerin bir arada yürütülmesine dayanır; bu da hem sürekli ürün geliştirme hem de müşteriye özel "
        + "uyarlama ihtiyacını aynı anda yönetmeyi gerektirir.\n\n"
        + "Yazılım süreçleri açısından Atlas’ta çevik (Agile) prensipler ile iki haftalık sprint döngüleri benimsenmiştir. Sprint başında "
        + "ürün sahibi ve iş analistleri önceliklendirilmiş iş kalemlerini backlog’a yerleştirir; geliştirme ekibi görevleri kullanıcı hikâyesi "
        + "kabul ölçütleriyle birlikte ‘In Progress’, ‘In Review’, ‘Done’ sütunlarında takip eder. Retrospektif toplantılarında süreç "
        + "darboğazları tartışılır ve bir sonraki sprint için iyileştirici aksiyonlar kayda geçirilir.\n\n"
        + "Kalite güvencesi kültürü günlük işin ayrılmaz parçasıdır: birleştirme istekleri (pull request) için asgari bir onay sayısı ve "
        + "otomatik test koşumu zorunludur; kritik modüller için ek manuel test senaryoları hazırlanır. Üretim sorunlarında önce log ve "
        + "izleme panelleri üzerinden kök neden analizi yapılır; gerektiğinde geçici çözüm (hotfix) ile kalıcı düzeltme ayrı iş kalemleri "
        + "olarak planlanır.",

    Company21 =
        "Şirketin kuruluş hikâyesi, yerel finans ve lojistik sektöründeki kuruluşların dijital dönüşüm ihtiyaçlarıyla paralel gelişmiştir. "
        + "İlk yıllarda tek kiracılı (single-tenant) mimariyle geliştirilen kurumsal paneller ve raporlama motorları, müşteri sayısı "
        + "arttıkça yapılandırılabilirlik ve çok kiracılı kiracı izolasyonu gerektiren bir mimariye evrilmiştir. Bugün ürün portföyünde "
        + "mobil tamamlayıcı uygulamalar, web tabanlı self-servis portallar ve üçüncü parti sistemlerle konuşan entegrasyon katmanları "
        + "birlikte yer almaktadır.\n\n"
        + "Teknoloji seçimlerinde Microsoft ekosistemi (.NET, ASP.NET Core), ilişkisel veri için PostgreSQL, oturum ve hızlı önbellek için "
        + "Redis ve konteyner orkestrasyonu için Kubernetes öne çıkmaktadır. Kimlik ve yetkilendirme tarafında OAuth2/OpenID Connect "
        + "uyumlu çözümler ile kurum içi dizin servisleri birlikte kullanılabilmektedir. Bu sayede hem geliştirici verimliliği hem de "
        + "işletme maliyetleri dengelenmeye çalışılır.\n\n"
        + "Ar-Ge faaliyetleri resmi proje teslimatlarından ayrı zaman bloklarında yürütülür; prototip çalışmalar çoğunlukla ayrı bir "
        + "‘labs’ deposunda tutulur ve üretime geçmeden önce güvenlik ve uyumluluk incelemelerinden geçer.",

    Company22 =
        "Şirketin örgüt yapısı başlıca Proje Yönetimi ve İş Analizi, Backend Geliştirme, Frontend Geliştirme, Kalite Güvencesi (QA), DevOps "
        + "ve Müşteri İkinci Seviye Destek birimlerinden oluşur. Backend ve frontend ekipleri aynı çatı altında çalışsa da kod depoları ve "
        + "sorumluluk alanları domain bazlı ayrılmıştır; böylece bilgi sahipliği netleşir ve paralel geliştirme kolaylaşır.\n\n"
        + "Lefkoşa’daki merkez ofiste yaklaşık elli tam zamanlı çalışan bulunmaktadır. Yoğun dönemlerde sözleşmeli danışmanlar ve uzaktan "
        + "çalışan uzmanlar projeye dahil edilir; ancak erişim hakları rol tabanlı ve süre sınırlı şekilde verilir. İnsan kaynakları "
        + "birimi yıllık performans görüşmelerinde teknik ve iletişim becerilerini birlikte değerlendirir.\n\n"
        + "Stajyerler için standart uygulama, ilk günden itibaren bir mentor atanması ve haftalık ilerleme görüşmesidir. Mentor; görev "
        + "önerisi, kod incelemesi yorumları ve kariyer planlamasına dair genel tavsiyelerde bulunur. Stajyerin ürettiği kod da aynı kalite "
        + "kapılarından geçer; üretime çıkan ilk katkının güven vermesi için küçük ve iyi tanımlı iş kalemleriyle başlanması teşvik edilir.",

    WorkExperienceIntro =
        "Staj süresince ‘Ödemeler ve Mutabakat’ iş alanında (bounded context) yer alan ve yıllar içinde büyümüş bir monolitik uygulamanın "
        + "parçalanması ve dış sistemlerle konuşması için tasarlanan REST tabanlı servis katmanında görev aldım. Kendimi bir mikroservise "
        + "özgü tam zamanlı geliştirici olarak değil; geçiş döneminde monolit ile yan yana çalışan ‘adaptör’ ve ‘facade’ katmanlarında "
        + "çalışan bir ekip üyesi olarak konumlandırdım.\n\n"
        + "Çalışma metodolojisi Scrum ile iki haftalık sprintler şeklinde yürütüldü. Görevler Azure DevOps üzerinde iş kalemi olarak "
        + "açıldı; dallanma stratejisi ‘feature branch’ ve ana hatta birleştirmede squash merge tercihi ile yürütüldü. Günlük stand-up "
        + "toplantılarında bloklayıcı riskleri paylaştım; bazı günler çözüm tasarımı için mentor ve kıdemli geliştirici ile ek teknik "
        + "oturumlar düzenlendi.\n\n"
        + "İlk iki hafta ağırlıklı olarak kod tabanı gezintisi, hata kayıtlarının (issue tracker) okunması ve iş kuralları dokümanının "
        + "anlamlandırılmasıyla geçti. Üçüncü haftadan itibaren doğrudan geliştirme, birim testi yazımı ve staging ortamında doğrulama "
        + "döngüsüne dahil oldum. Müşteri ile doğrudan görüşme fırsatım sınırlı olsa da iş analistlerinin düzenlediği refinery oturumlarına "
        + "dinleyici olarak katılarak gereksinimlerin nasıl netleştirildiğini gözlemledim.",

    ProblemDefinition =
        "Legacy monolit içinde ödeme ve mutabakatla ilişkili iş kuralları; kullanıcı arayüzü olay işleyicileri, doğrudan veri erişim "
        + "katmanı çağrıları ve çoğu zaman tekrarlanan doğrulama kodları arasında dağılmış durumdadır. Bu yapı, küçük bir değişikliğin "
        + "beklenmeyen yan etkiler üretmesine ve regresyon maliyetinin artmasına yol açar. Öte yandan harici kurumsal kaynak planlama (ERP) "
        + "sistemleri ve banka tarafı ödeme bildirimleri, güvenilir bir API sözleşmesi ve tutarlı hata semantiği olmadan güvenli biçimde "
        + "bağlanamaz.\n\n"
        + "Projenin hedefi; kimlik doğrulama için JWT tabanlı taşıyıcı belirteçler, yetkilendirme için rol ve ilkelere dayalı erişim kontrolü, "
        + "işlemlerde tekrar gönderim riskine karşı idempotent tasarım ilkeleri, HTTP düzeyinde anlamlı durum kodları ve gövde şeması için "
        + "ProblemDetails uyumu ve denetim için yapılandırılmış audit kayıtları ile üretime yakışır bir servis sınırı oluşturmaktır. "
        + "Performans hedefleri resmi olarak latency yüzdelik dilimleri ve hata oranı eşikleri ile tanımlanmıştır.\n\n"
        + "Teknik borç olarak öne çıkan başlıca riskler şunlardır: tutarsız günlük biçimi, örtük zaman aşımı ve yeniden deneme politikalarının "
        + "eksikliği, bazı uç noktalarda kimlik doğrulamanın gevşekliği ve şema değişikliklerinin geriye dönük uyumluluğunun izlenmemesi. "
        + "Staj kapsamında bu risklerden bir alt kümesi üzerinde çalışılmış ve sprint teslimatlarıyla iyileştirmeler kanıtlanmıştır.",

    WorkDoneIntro =
        "Yürütülen işler öncesinde ilgili bounded context için olay akışlarını (happy path ve istisna senaryoları) kâğıt üzerinde çizerek "
        + "mentorum ile doğruladım. Ardından küçük iyileştirmelerden başlayarak karmaşıklığı artıran görevlere geçtim; her iş kalemi için "
        + "kabul ölçütleri ve test kanıtı tanımlandı.\n\n"
        + "Aşağıda iki ana başlık altında özetlenen görevler, Azure DevOps sprint panosunda ‘Done’ durumuna getirilmiş ve kod incelemesi "
        + "ile birleştirilmiş teslimatlara karşılık gelir. Bunlara ek olarak raporun dinamik alt başlıklarında üç tamamlayıcı çalışma daha "
        + "ayrıntılı anlatılmıştır.",

    Task1Title = "API gözlemlenebilirliği ve hata yönetimi",
    Task1Body =
        "Üretim ve staging loglarında gezinirken aynı hatanın farklı HTTP kodlarıyla döndüğü ve günlük mesajlarının makine tarafından "
        + "kolayca taranamadığı görüldü. Bu durum, destek ekibinin olay çözüm süresini uzattığı gibi yanlış alarm üretimini de artırıyordu.\n\n"
        + "Çözüm olarak Serilog zenginleştirmeleri ile istek bazlı CorrelationId ve kullanıcı bağlamı (kimlik bilgisi olmadan, anonim "
        + "tanımlayıcı düzeyinde) günlük kayıtlarına eklendi. ASP.NET Core tarafında ortak bir istisna filtresi ile ProblemDetails gövdesi "
        + "standartlaştırıldı; müşteri yüzüne dönük mesajlar ile dahili ayrıntılar ayrıştırıldı. Kabul ölçütü olarak belirli senaryolarda "
        + "beklenen HTTP kodları tablo halinde dokümante edildi.\n\n"
        + "Postman koleksiyonu güncellenerek kritik uç noktalar için ortak ortam değişkenleri tanımlandı; koleksiyon runner ile staging "
        + "üzerinde kısa bir regresyon seti oluşturuldu. Sprint sonunda destek ekibi ile yapılan gayriresmî geri bildirimde, log arama "
        + "süresinin hissedilir biçimde kısaldığı ve hatalı 5xx dönüşlerinin azaldığı gözlemlendi.",

    Task2Title = "Servis katmanı birim testleri ve sözleşme doğrulaması",
    Task2Body =
        "Ödeme durumu geçişlerini yöneten üç servis sınıfında iş kuralları yoğun olduğu için birim testleri ile davranışların sabitlenmesine "
        + "karar verildi. xUnit çatısı kullanıldı; bağımlılıklar Moq ile taklit edildi. Testler ‘Arrange-Act-Assert’ düzeninde yazıldı ve "
        + "anlamlı test adları ile okunabilirlik artırıldı.\n\n"
        + "OpenAPI şeması üzerinden breaking change riski taşıyan alanlar listelendi; istemci ekipleriyle uyum için geriye dönük uyumluluk "
        + "notları wiki’ye işlendi. Küçük bir doğrulama kontrol listesi ile yayın öncesi şema diff’inin gözden geçirilmesi teşvik edildi.\n\n"
        + "Azure DevOps YAML boru hattında test görevi başarısız olduğunda birleştirmenin bloke edilmesi ve coverage raporunun artefakt olarak "
        + "saklanması sağlandı. Coverage tek başına kalite ölçütü olmasa da özellikle yeni yazılan kritik dallarda göreli artışın görünür "
        + "olması hedeflendi.",

    Limitations =
        "Üretim veritabanına ve gerçek müşteri verisine doğrudan erişim, bilgi güvenliği politikası gereği stajyer hesaplarına kapalıydı. Bu "
        + "nedenle bazı uç durumlar yalnızca anonimleştirilmiş veya sentetik veri üreticileri ile oluşturulan staging senaryolarında "
        + "doğrulanabildi. Özellikle yüksek hacimli eşzamanlı işlem davranışları gerçek üretim trafiği kadar güvenilir şekilde taklit "
        + "edilemedi.\n\n"
        + "Geçiş stratejisi gereği eski monolit ile yeni servis katmanı uzun süre paralel çalıştığı için ‘çift yazım’ ve tutarlılık kontrolleri "
        + "devreye alınmıştır. Bu dönemde tam kesinti gerektirmeyen dağıtımlarda davranış farkları geçici olarak tolere edilmiştir; bu da "
        + "gözlemlerimin bir kısmının üretim ölçeğinde yüzde yüz doğrulanmış sayılamayacağı anlamına gelir.\n\n"
        + "Staj süresi akademik takvimle sınırlı olduğundan, planlanan bazı iyileştirmeler (örneğin dağıtık izleme ile özel metrik panosu "
        + "entegrasyonu) backlog’da kalmış ve bir sonraki sprintlere devredilmiştir. Bu raporda yalnızca gerçekten tamamladığım veya doğrudan "
        + "katkı verdiğim işler anlatılmıştır.",

    RecentTopics =
        "Staj boyunca ekip içinde düzenlenen lightning talk ve teknik kulüp oturumlarında güncel konular tartışılmıştır. Öne çıkan başlıklar "
        + "arasında dağıtık sistemlerde gözlemlenebilirlik (örnek olarak Prometheus metrikleri ve OpenTelemetry ile iz sürmeler), konteyner "
        + "imajlarının imzalanması ve minimal taban imaj kullanımı ile tedarik zinciri risklerinin azaltılması ve OpenAPI sürümleme stratejileri "
        + "(semver, uyumluluk matrisi) yer almıştır.\n\n"
        + "Bu tartışmaların doğrudan üzerinde çalıştığım API tasarımı ve günlük standardizasyonu ile ilişkili olduğunu düşünüyorum. Örneğin "
        + "iz sürmeler konusundaki farkındalık, CorrelationId’nin öneminin ekiple daha iyi paylaşılmasına yardımcı olmuştur.\n\n"
        + "Ayrıca üniversitede aldığım veri yapıları, veritabanları ve yazılım mühendisliği derslerinin sahada nasıl bir araya geldiğini "
        + "gözlemlemek açısından faydalı bir bağ kurabildim; teorik bilginin pratikte sürekli müzakere ve önceliklendirme gerektirdiğini "
        + "deneyimledim.",

    Conclusion =
        "Atlas Yazılım’da geçirdiğim yaz stajı, bilgisayar mühendisliği eğitimimin sahada somutlaştığı anlamlı bir dönem oldu. Üniversitede "
        + "öğrendiğim gereksinim analizi, yazılım mimarisi, test ve proje yönetimi kavramlarının gerçek müşteri teslimatlarında birlikte "
        + "işlediğini görmek motivasyonumu artırdı.\n\n"
        + "Teknik olarak REST servisleri, günlük standardizasyonu, birim testleri ve sürekli entegrasyon pratikleri üzerinde yoğunlaştım; "
        + "kurumsal güvenlik ve erişim politikalarının günlük iş akışını nasıl şekillendirdiğini de yakından tanıdım. İletişim becerilerimin "
        + "özellikle kod incelemesi ve görev netleştirme süreçlerinde geliştiğini düşünüyorum.\n\n"
        + "İlerleyen dönemde backend geliştirme ve sistem mimarisi alanında derinleşmeyi, açık kaynak projelere küçük katkılarla başlamayı ve "
        + "mezuniyet sonrası üretim ölçeğinde güvenilir sistemler tasarlama yönünde kariyer planımı şekillendirmeyi hedefliyorum. Bu raporun "
        + "hazırlanması sürecinde mentoruma ve ekibe teşekkür ederim.",

    Appendix =
        "Bu ek bölümde yerel geliştirme ortamında kullanılan docker-compose hizmetleri için özet bir tablo (servis adı, iç port, amaç), "
        + "staging ile uyumlu .env.example şablonu için anahtar listesi (örnek değerler üretim sırları içermez) ve Postman’den dışa aktarılmış "
        + "örnek HTTP istek gövdeleri yer alır. Gerçek anahtarlar ve müşteri kimlikleri rapordan çıkarılmıştır.\n\n"
        + "Ayrıca sprint boyunca tuttuğum kısa günlük notları (kişisel, anonim) ve katıldığım eğitimlerin tarihleri kurumsal arşivde saklanmakta "
        + "olup bu dosyada yalnızca özet başlıkları listelenmiştir.",

    References =
    [
        "Richardson, C. (2018). Microservices Patterns: With Examples in Java. Manning Publications.",
        "Newman, S. (2021). Building Microservices: Designing Fine-Grained Systems. O’Reilly Media.",
        "Microsoft Corporation (2026). ASP.NET Core documentation: Fundamentals, authentication, and diagnostics. https://learn.microsoft.com/aspnet/core/",
        "Gamma, E., Helm, R., Johnson, R., Vlissides, J. (1994). Design Patterns: Elements of Reusable Object-Oriented Software. Addison-Wesley.",
        "OWASP Foundation (2025). API Security Top 10 — guidelines for securing REST services.",
        "CIU (2026). Faculty of Engineering internship / SWEN300 course outline and assessment criteria (student handbook).",
    ],

    DynamicSections =
    [
        new TrainingReportDynamicSectionDto
        {
            OutlineNumber = "3.2.3",
            Title = "CI/CD hattında iyileştirme",
            Body =
                "Azure DevOps YAML boru hattında NuGet paket önbelleği ve derleme artefakt önbelleği etkinleştirildi; ortalama iş süresi "
                + "ölçümlerinde yaklaşık yüzde yirmi iki iyileşme gözlendi. Önbellek anahtarlarının dal ve bağımlılık manifestosu ile "
                + "tutarlı seçilmesi, yanlış önbellek isabetlerinin önüne geçilmesini sağladı.\n\n"
                + "Aynı sprint içinde staging ortamına otomatik dağıtım sonrası çalışan hafif bir duman testi adımı eklendi; kritik "
                + "uç noktalar için üç kontrollü istek atan bir script kullanıldı. Başarısızlık halinde bildirim kanalı üzerinden "
                + "DevOps ve ilgili takım üyelerine uyarı düşecek şekilde yapılandırıldı.\n\n"
                + "Bu iyileştirmelerin amacı yalnızca süreyi kısaltmak değil, erken geri bildirim ile hatalı birleştirmelerin ana hatta "
                + "yerleşmeden yakalanmasıdır.",
        },
        new TrainingReportDynamicSectionDto
        {
            OutlineNumber = "3.2.4",
            Title = "Kod incelemesi ve güvenlik geri bildirimi",
            Body =
                "İki ayrı pull request için reviewer olarak katıldım. Birinde kimlik doğrulaması atlanabilecek bir yardımcı metot için "
                + "uyarı yazdım ve güvenli varsayılanların nasıl uygulanabileceğini önerdim. Diğerinde ise hata mesajlarında iç uygulama "
                + "ayrıntılarının istemciye sızmaması gerektiğini savunarak ProblemDetails kullanımına uygun bir düzeltme önerdim.\n\n"
                + "Yorumların Azure DevOps tartışma iş öğelerine bağlanması ve kararların wiki’de özetlenmesi, bilginin kaybolmaması için "
                + "işe yarayan bir alışkanlık olarak görüldü. Küçük tartışmalarda bile nazik ve yapıcı iletişimin kod kalitesine doğrudan "
                + "etki ettiğini gözlemledim.",
        },
        new TrainingReportDynamicSectionDto
        {
            OutlineNumber = "3.2.5",
            Title = "Dokümantasyon ve geliştirici deneyimi",
            Body =
                "Swagger/OpenAPI açıklamaları ve örnek istekler güncellendi; alanların anlamı, zorunlulukları ve tipik hata kodları "
                + "metin olarak genişletildi. Yeni başlayan geliştiriciler için kurumsal wiki’de ‘İlk gün’ sayfasına kimlik bilgisi "
                + "alma, VPN bağlantısı, doğru Postman ortamının seçilmesi ve yerel çalıştırma adımları eklendi.\n\n"
                + "Bu çalışmanın beklenen faydası, mentorluk süresinin daha çok mimari derinlik ve kod tasarımına ayrılabilmesi ve "
                + "tekrarlayan soruların azalmasıdır.",
        },
        new TrainingReportDynamicSectionDto
        {
            OutlineNumber = "3.2.6",
            Title = "Performans ve gözlemlenebilirlik gözden geçirmesi",
            Body =
                "Seçilen endpoint’ler için temel latency ölçümleri staging ortamında toplandı; sonuçlar sprint gözden geçirmesinde "
                + "paylaşıldı. Veritabanı sorgu sayısı fazla olan bir akışta önbellek kullanımının tartışıldığı ancak geçiş riski "
                + "nedeniyle sonraki sprinte ertelendiği karara bağlandı.\n\n"
                + "Gözlemlenebilirlik tarafında günlük örnekleme seviyelerinin geliştirme ve staging için daha ayrıntılı, üretim için "
                + "daha seçici olması gerektiği konusunda ekip içi fikir birliği oluştu; bu konuda küçük bir dokümantasyon güncellemesi "
                + "yapıldı.",
        },
    ],
};

var scalars = TrainingReportWordExporter.BuildMergeDictionary(application, student, company, content);

// Küçük PNG — şekil bloğunda iki örnek görsel (başlık ve ekte TOC satırı daha gerçekçi)
var pngBytes = Convert.FromBase64String(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
using var fig1 = new MemoryStream(pngBytes);
using var fig2 = new MemoryStream(pngBytes);
var figures = new List<(Stream PngStream, string Caption)>
{
    (fig1, "Staging ortamı bileşenleri (API, veritabanı, önbellek — özet şema)."),
    (fig2, "CI boru hattı: derleme, testler ve staging dağıtım adımları."),
};

var templateBytes = await File.ReadAllBytesAsync(templatePath);
var docBytes = TrainingReportWordExporter.MergeDocument(templateBytes, scalars, figures);

await File.WriteAllBytesAsync(outPath, docBytes);
Console.WriteLine("Yazıldı: " + Path.GetFullPath(outPath));
Console.WriteLine($"Şablon: {templatePath}");
return 0;
