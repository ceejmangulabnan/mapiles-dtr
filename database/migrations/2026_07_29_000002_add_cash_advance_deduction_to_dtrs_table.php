<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dtrs', function (Blueprint $table): void {
            $table->decimal('cash_advance_deduction', 12, 2)->default(0.00)->after('philhealth_ee_share');
        });
    }

    public function down(): void
    {
        Schema::table('dtrs', function (Blueprint $table): void {
            $table->dropColumn('cash_advance_deduction');
        });
    }
};
