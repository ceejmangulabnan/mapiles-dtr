<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Employees: name sort (EmployeeController@index — ORDER BY last_name, first_name)
        Schema::table('employees', function (Blueprint $table) {
            $table->index(['last_name', 'first_name'], 'idx_employees_name_sort');
        });

        // Users: name sort (UserController@index — ORDER BY name)
        Schema::table('users', function (Blueprint $table) {
            $table->index('name', 'idx_users_name');
        });

        // Users: role + status filter (admin management screens)
        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'status'], 'idx_users_role_status');
        });

        // DTRs: employee listing with date sort
        // (SummaryController@index — ORDER BY updated_at DESC, id DESC filtered by employee)
        Schema::table('dtrs', function (Blueprint $table) {
            $table->index(['employee_id', 'updated_at'], 'idx_dtrs_employee_id_updated_at');
        });

        // DTRs: global updated_at sort (SummaryController@index)
        Schema::table('dtrs', function (Blueprint $table) {
            $table->index('updated_at', 'idx_dtrs_updated_at');
        });

        // DTR entries: date-range lookups
        // (CalculateController::store, dtrQueryForPeriod — WHERE BETWEEN work_date)
        Schema::table('dtr_entries', function (Blueprint $table) {
            $table->index('work_date', 'idx_dtr_entries_work_date');
        });
    }

    public function down(): void
    {
        Schema::table('dtr_entries', function (Blueprint $table) {
            $table->dropIndex('idx_dtr_entries_work_date');
        });

        Schema::table('dtrs', function (Blueprint $table) {
            $table->dropIndex('idx_dtrs_updated_at');
            $table->dropIndex('idx_dtrs_employee_id_updated_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_role_status');
            $table->dropIndex('idx_users_name');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('idx_employees_name_sort');
        });
    }
};
