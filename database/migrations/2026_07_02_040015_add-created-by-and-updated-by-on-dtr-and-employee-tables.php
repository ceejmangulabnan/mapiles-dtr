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
        // Add created_by (user_id) and updated_by (user_id) to employees table for auditing and tracking transactions.
        Schema::table('employees', function(Blueprint $table) 
        {
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {   
        // Drop foreign key and columns: created_by and updated_by on employees table
        Schema::table('employees', function(Blueprint $table) 
        {
            $table->dropForeign('created_by');
            $table->dropForeign('updated_by');
            $table->dropColumn(['created_by', 'updated_by']);
        });
    }
};
