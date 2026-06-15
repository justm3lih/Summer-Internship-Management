-- Sıfırdan kurulum için: iş verisi temizlenir; admin kullanıcılar + AppSettings + KnowledgeBase kalır.
-- PostgreSQL / EF tablo adları (quoted).

BEGIN;

-- Önce bağımlı tablolar
DELETE FROM "Notifications";
DELETE FROM "LogbookEntries";
DELETE FROM "LogbookWeeklyApprovals";
DELETE FROM "TrainingReportSubmissionSnapshots";
DELETE FROM "TrainingReportFigures";
DELETE FROM "TrainingReports";
DELETE FROM "Applications";
DELETE FROM "FinalReports";
DELETE FROM "UploadedFiles";

-- Şirket FK’si / staff zinciri (Users silinmeden önce)
UPDATE "Users" SET "ManagedByCompanyUserId" = NULL WHERE "ManagedByCompanyUserId" IS NOT NULL;

DELETE FROM "Users" WHERE "Role" IS DISTINCT FROM 'admin';

DELETE FROM "Companies";

COMMIT;

-- Özet (admin sayısı ve kalan tablolar)
SELECT 'Users (admin only)' AS tbl, COUNT(*)::text AS cnt FROM "Users"
UNION ALL SELECT 'Companies', COUNT(*)::text FROM "Companies"
UNION ALL SELECT 'Applications', COUNT(*)::text FROM "Applications"
UNION ALL SELECT 'AppSettings', COUNT(*)::text FROM "AppSettings"
UNION ALL SELECT 'KnowledgeBaseEntries', COUNT(*)::text FROM "KnowledgeBaseEntries";
