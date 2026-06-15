using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class LogbookSupervisorApprovalAndWeeklyApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SupervisorApprovedAt",
                table: "LogbookEntries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorApprovedByUserId",
                table: "LogbookEntries",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LogbookWeeklyApprovals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    StudentId = table.Column<string>(type: "text", nullable: false),
                    WeekStartUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedByUserId = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LogbookWeeklyApprovals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LogbookWeeklyApprovals_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LogbookWeeklyApprovals_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LogbookEntries_SupervisorApprovedByUserId",
                table: "LogbookEntries",
                column: "SupervisorApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LogbookWeeklyApprovals_ApprovedByUserId",
                table: "LogbookWeeklyApprovals",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LogbookWeeklyApprovals_StudentId_WeekStartUtc",
                table: "LogbookWeeklyApprovals",
                columns: new[] { "StudentId", "WeekStartUtc" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_LogbookEntries_Users_SupervisorApprovedByUserId",
                table: "LogbookEntries",
                column: "SupervisorApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LogbookEntries_Users_SupervisorApprovedByUserId",
                table: "LogbookEntries");

            migrationBuilder.DropTable(
                name: "LogbookWeeklyApprovals");

            migrationBuilder.DropIndex(
                name: "IX_LogbookEntries_SupervisorApprovedByUserId",
                table: "LogbookEntries");

            migrationBuilder.DropColumn(
                name: "SupervisorApprovedAt",
                table: "LogbookEntries");

            migrationBuilder.DropColumn(
                name: "SupervisorApprovedByUserId",
                table: "LogbookEntries");
        }
    }
}
