using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationDualPlacementApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CoordinatorPlacementApprovedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CompanyPlacementApprovedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Applications"
                SET "CoordinatorPlacementApprovedAt" = COALESCE("AppliedDate", NOW()),
                    "CompanyPlacementApprovedAt" = COALESCE("AppliedDate", NOW())
                WHERE "Status" IN ('approved', 'ongoing', 'completed');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoordinatorPlacementApprovedAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CompanyPlacementApprovedAt",
                table: "Applications");
        }
    }
}
