<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dtrs', function (Blueprint $table) {
            $table->decimal('sss_deduction', 12, 2)->default(0)->after('total_overtime_amount');
        });
    }

    public function down(): void
    {
        Schema::table('dtrs', function (Blueprint $table) {
            $table->dropColumn('sss_deduction');
        });
    }
};
