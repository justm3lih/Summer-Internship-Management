using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationLogbookApprovalWordFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SupervisorAcademicDegrees",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorDepartmentOrDivision",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorGraduatedUniversity",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorGraduationYear",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorSpecialty",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorYearsExperience",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupervisorYearsInCompany",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TraineeDepartmentOrDivision",
                table: "Applications",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SupervisorAcademicDegrees",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorDepartmentOrDivision",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorGraduatedUniversity",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorGraduationYear",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorSpecialty",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorYearsExperience",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SupervisorYearsInCompany",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "TraineeDepartmentOrDivision",
                table: "Applications");
        }
    }
}
