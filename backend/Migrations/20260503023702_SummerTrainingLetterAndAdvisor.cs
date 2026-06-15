using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class SummerTrainingLetterAndAdvisor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdvisorUserId",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SummerTrainingApplicationLetters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    StudentId = table.Column<string>(type: "text", nullable: false),
                    AcademicPeriodKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    StudentElectronicAcceptanceAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedToAdvisorAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdvisorApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdvisorRejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdvisorComments = table.Column<string>(type: "text", nullable: true),
                    CoordinatorApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CoordinatorRejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CoordinatorComments = table.Column<string>(type: "text", nullable: true),
                    CourseRowsJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SummerTrainingApplicationLetters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SummerTrainingApplicationLetters_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_AdvisorUserId",
                table: "Users",
                column: "AdvisorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SummerTrainingApplicationLetters_StudentId_AcademicPeriodKey",
                table: "SummerTrainingApplicationLetters",
                columns: new[] { "StudentId", "AcademicPeriodKey" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Users_AdvisorUserId",
                table: "Users",
                column: "AdvisorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Users_AdvisorUserId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "SummerTrainingApplicationLetters");

            migrationBuilder.DropIndex(
                name: "IX_Users_AdvisorUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AdvisorUserId",
                table: "Users");
        }
    }
}
