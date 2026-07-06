<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the old BIGINT column and recreate as UUID
        // Existing session rows are discarded (users will need to re-login)
        DB::statement('ALTER TABLE sessions DROP COLUMN user_id');
        DB::statement('ALTER TABLE sessions ADD COLUMN user_id UUID');
        DB::statement('CREATE INDEX idx_sessions_user_id ON sessions (user_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_sessions_user_id');
        DB::statement('ALTER TABLE sessions DROP COLUMN user_id');
        DB::statement('ALTER TABLE sessions ADD COLUMN user_id BIGINT');
        DB::statement('CREATE INDEX sessions_user_id_index ON sessions (user_id)');
    }
};
