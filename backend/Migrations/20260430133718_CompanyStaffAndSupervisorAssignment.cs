using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternshipManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class CompanyStaffAndSupervisorAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyMembershipTier",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManagedByCompanyUserId",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanySupervisorUserId",
                table: "Applications",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_ManagedByCompanyUserId",
                table: "Users",
                column: "ManagedByCompanyUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Applications_CompanySupervisorUserId",
                table: "Applications",
                column: "CompanySupervisorUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Applications_Users_CompanySupervisorUserId",
                table: "Applications",
                column: "CompanySupervisorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Users_ManagedByCompanyUserId",
                table: "Users",
                column: "ManagedByCompanyUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Applications_Users_CompanySupervisorUserId",
                table: "Applications");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Users_ManagedByCompanyUserId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_ManagedByCompanyUserId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Applications_CompanySupervisorUserId",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "CompanyMembershipTier",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ManagedByCompanyUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CompanySupervisorUserId",
                table: "Applications");
        }
    }
}
