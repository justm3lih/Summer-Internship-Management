using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class TrainingReportsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TrainingReports",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApplicationId = table.Column<string>(type: "text", nullable: false),
                    StudentId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ContentJson = table.Column<string>(type: "text", nullable: false),
                    CoordinatorFeedback = table.Column<string>(type: "text", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedByUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainingReports_Applications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "Applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TrainingReports_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrainingReportFigures",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    TrainingReportId = table.Column<string>(type: "text", nullable: false),
                    FileId = table.Column<string>(type: "text", nullable: false),
                    Caption = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingReportFigures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainingReportFigures_TrainingReports_TrainingReportId",
                        column: x => x.TrainingReportId,
                        principalTable: "TrainingReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrainingReportSubmissionSnapshots",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    TrainingReportId = table.Column<string>(type: "text", nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingReportSubmissionSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainingReportSubmissionSnapshots_TrainingReports_TrainingR~",
                        column: x => x.TrainingReportId,
                        principalTable: "TrainingReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingReportFigures_TrainingReportId",
                table: "TrainingReportFigures",
                column: "TrainingReportId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingReports_ApplicationId",
                table: "TrainingReports",
                column: "ApplicationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrainingReports_StudentId",
                table: "TrainingReports",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingReportSubmissionSnapshots_TrainingReportId",
                table: "TrainingReportSubmissionSnapshots",
                column: "TrainingReportId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TrainingReportFigures");

            migrationBuilder.DropTable(
                name: "TrainingReportSubmissionSnapshots");

            migrationBuilder.DropTable(
                name: "TrainingReports");
        }
    }
}
