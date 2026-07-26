<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dtrs', function (Blueprint $table) {
            $table->decimal('philhealth_ee_share', 12, 2)->default(0)->after('pagibig_deduction');
        });
    }

    public function down(): void
    {
        Schema::table('dtrs', function (Blueprint $table) {
            $table->dropColumn('philhealth_ee_share');
        });
    }
};
