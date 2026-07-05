<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // ========================================================================
            // Step 1: Create migration mapping table
            // ========================================================================
            DB::statement('
                CREATE TABLE id_migration_map (
                    table_name TEXT NOT NULL,
                    old_id BIGINT NOT NULL,
                    new_id UUID NOT NULL,
                    PRIMARY KEY (table_name, old_id)
                )
            ');

            // ========================================================================
            // Step 2: Add UUID PK columns to all four tables and backfill
            // ========================================================================
            $pkTables = ['users', 'employees', 'dtrs', 'dtr_entries'];

            foreach ($pkTables as $table) {
                DB::statement("ALTER TABLE {$table} ADD COLUMN _new_id UUID DEFAULT gen_random_uuid()");
                DB::statement("UPDATE {$table} SET _new_id = gen_random_uuid() WHERE _new_id IS NULL");
                DB::statement("ALTER TABLE {$table} ALTER COLUMN _new_id SET NOT NULL");
                DB::statement("
                    INSERT INTO id_migration_map (table_name, old_id, new_id)
                    SELECT '{$table}', id, _new_id FROM {$table}
                ");
            }

            // ========================================================================
            // Step 3: Drop existing constraints that would block column operations
            // ========================================================================

            // Drop unique constraint on dtr_entries that includes dtr_id
            DB::statement('ALTER TABLE dtr_entries DROP CONSTRAINT IF EXISTS dtr_entries_dtr_id_work_date_unique');

            // ========================================================================
            // Step 4: Add new UUID FK columns to child tables and backfill
            // ========================================================================

            // --- employees: user_id, created_by, updated_by → users.id ---
            $employeeFkMap = [
                'user_id'     => ['users', false],
                'created_by'  => ['users', false],
                'updated_by'  => ['users', false],
            ];

            foreach ($employeeFkMap as $fkCol => [$refTable, $notNull]) {
                DB::statement("ALTER TABLE employees ADD COLUMN _{$fkCol} UUID");
                DB::statement("
                    UPDATE employees e
                    SET _{$fkCol} = m.new_id
                    FROM id_migration_map m
                    WHERE m.table_name = '{$refTable}' AND m.old_id = e.{$fkCol}
                ");
                if ($notNull) {
                    DB::statement("ALTER TABLE employees ALTER COLUMN _{$fkCol} SET NOT NULL");
                }
            }

            // --- dtrs: employee_id → employees.id, confirmed_by / created_by / updated_by → users.id ---
            $dtrFkMap = [
                'employee_id'   => ['employees', true],
                'confirmed_by'  => ['users', false],
                'created_by'    => ['users', false],
                'updated_by'    => ['users', false],
            ];

            foreach ($dtrFkMap as $fkCol => [$refTable, $notNull]) {
                DB::statement("ALTER TABLE dtrs ADD COLUMN _{$fkCol} UUID");
                DB::statement("
                    UPDATE dtrs d
                    SET _{$fkCol} = m.new_id
                    FROM id_migration_map m
                    WHERE m.table_name = '{$refTable}' AND m.old_id = d.{$fkCol}
                ");
                if ($notNull) {
                    DB::statement("ALTER TABLE dtrs ALTER COLUMN _{$fkCol} SET NOT NULL");
                }
            }

            // --- dtr_entries: dtr_id → dtrs.id ---
            DB::statement('ALTER TABLE dtr_entries ADD COLUMN _dtr_id UUID');
            DB::statement("
                UPDATE dtr_entries de
                SET _dtr_id = m.new_id
                FROM id_migration_map m
                WHERE m.table_name = 'dtrs' AND m.old_id = de.dtr_id
            ");
            DB::statement('ALTER TABLE dtr_entries ALTER COLUMN _dtr_id SET NOT NULL');

            // ========================================================================
            // Step 5: Drop old PK constraints (CASCADE drops all dependent FKs)
            // ========================================================================
            DB::statement('ALTER TABLE users DROP CONSTRAINT users_pkey CASCADE');
            DB::statement('ALTER TABLE employees DROP CONSTRAINT employees_pkey CASCADE');
            DB::statement('ALTER TABLE dtrs DROP CONSTRAINT dtrs_pkey CASCADE');
            DB::statement('ALTER TABLE dtr_entries DROP CONSTRAINT dtr_entries_pkey CASCADE');

            // ========================================================================
            // Step 6: Drop old PK columns (drops associated indexes automatically)
            // ========================================================================
            DB::statement('ALTER TABLE users DROP COLUMN id');
            DB::statement('ALTER TABLE employees DROP COLUMN id');
            DB::statement('ALTER TABLE dtrs DROP COLUMN id');
            DB::statement('ALTER TABLE dtr_entries DROP COLUMN id');

            // ========================================================================
            // Step 7: Rename _new_id → id on all PK tables
            // ========================================================================
            DB::statement('ALTER TABLE users RENAME COLUMN _new_id TO id');
            DB::statement('ALTER TABLE employees RENAME COLUMN _new_id TO id');
            DB::statement('ALTER TABLE dtrs RENAME COLUMN _new_id TO id');
            DB::statement('ALTER TABLE dtr_entries RENAME COLUMN _new_id TO id');

            // ========================================================================
            // Step 8: Add new PRIMARY KEY constraints
            // ========================================================================
            DB::statement('ALTER TABLE users ADD PRIMARY KEY (id)');
            DB::statement('ALTER TABLE employees ADD PRIMARY KEY (id)');
            DB::statement('ALTER TABLE dtrs ADD PRIMARY KEY (id)');
            DB::statement('ALTER TABLE dtr_entries ADD PRIMARY KEY (id)');

            // ========================================================================
            // Step 9: Set DEFAULT gen_random_uuid() on PK columns
            // ========================================================================
            DB::statement('ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()');
            DB::statement('ALTER TABLE employees ALTER COLUMN id SET DEFAULT gen_random_uuid()');
            DB::statement('ALTER TABLE dtrs ALTER COLUMN id SET DEFAULT gen_random_uuid()');
            DB::statement('ALTER TABLE dtr_entries ALTER COLUMN id SET DEFAULT gen_random_uuid()');

            // ========================================================================
            // Step 10: Drop old BIGINT FK columns from child tables
            //          (indexes on these columns are dropped automatically)
            // ========================================================================
            $oldFkColumns = [
                'employees'  => ['user_id', 'created_by', 'updated_by'],
                'dtrs'       => ['employee_id', 'confirmed_by', 'created_by', 'updated_by'],
                'dtr_entries'=> ['dtr_id'],
            ];

            foreach ($oldFkColumns as $table => $columns) {
                foreach ($columns as $column) {
                    DB::statement("ALTER TABLE {$table} DROP COLUMN {$column}");
                }
            }

            // ========================================================================
            // Step 11: Rename _fk → original FK column names
            // ========================================================================
            DB::statement('ALTER TABLE employees RENAME COLUMN _user_id TO user_id');
            DB::statement('ALTER TABLE employees RENAME COLUMN _created_by TO created_by');
            DB::statement('ALTER TABLE employees RENAME COLUMN _updated_by TO updated_by');
            DB::statement('ALTER TABLE dtrs RENAME COLUMN _employee_id TO employee_id');
            DB::statement('ALTER TABLE dtrs RENAME COLUMN _confirmed_by TO confirmed_by');
            DB::statement('ALTER TABLE dtrs RENAME COLUMN _created_by TO created_by');
            DB::statement('ALTER TABLE dtrs RENAME COLUMN _updated_by TO updated_by');
            DB::statement('ALTER TABLE dtr_entries RENAME COLUMN _dtr_id TO dtr_id');

            // ========================================================================
            // Step 12: Add FOREIGN KEY constraints
            // ========================================================================
            DB::statement('ALTER TABLE employees ADD CONSTRAINT employees_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE employees ADD CONSTRAINT employees_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id)');
            DB::statement('ALTER TABLE employees ADD CONSTRAINT employees_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES users(id)');
            DB::statement('ALTER TABLE dtrs ADD CONSTRAINT dtrs_employee_id_foreign FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE');
            DB::statement('ALTER TABLE dtrs ADD CONSTRAINT dtrs_confirmed_by_foreign FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE dtrs ADD CONSTRAINT dtrs_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id)');
            DB::statement('ALTER TABLE dtrs ADD CONSTRAINT dtrs_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES users(id)');
            DB::statement('ALTER TABLE dtr_entries ADD CONSTRAINT dtr_entries_dtr_id_foreign FOREIGN KEY (dtr_id) REFERENCES dtrs(id) ON DELETE CASCADE');

            // ========================================================================
            // Step 13: Recreate UNIQUE constraints
            // ========================================================================
            DB::statement('ALTER TABLE dtr_entries ADD CONSTRAINT dtr_entries_dtr_id_work_date_unique UNIQUE (dtr_id, work_date)');

            // ========================================================================
            // Step 14: Recreate indexes that were dropped with old columns
            // ========================================================================
            // The composite index idx_dtrs_employee_id_updated_at was dropped
            // when the old employee_id column was removed — recreate it
            DB::statement('CREATE INDEX idx_dtrs_employee_id_updated_at ON dtrs (employee_id, updated_at)');

            // Add FK-column indexes for join performance
            DB::statement('CREATE INDEX idx_employees_user_id ON employees (user_id)');
            DB::statement('CREATE INDEX idx_employees_created_by ON employees (created_by)');
            DB::statement('CREATE INDEX idx_employees_updated_by ON employees (updated_by)');
            DB::statement('CREATE INDEX idx_dtrs_confirmed_by ON dtrs (confirmed_by)');
            DB::statement('CREATE INDEX idx_dtrs_created_by ON dtrs (created_by)');
            DB::statement('CREATE INDEX idx_dtrs_updated_by ON dtrs (updated_by)');
            DB::statement('CREATE INDEX idx_dtr_entries_dtr_id ON dtr_entries (dtr_id)');

            // ========================================================================
            // Step 15: Drop the migration mapping table (no longer needed)
            // ========================================================================
            Schema::dropIfExists('id_migration_map');
        });
    }

    public function down(): void
    {
        // This migration is destructive and cannot be cleanly reverted.
        // Restore from a backup taken before the migration.
        throw new RuntimeException('This UUID migration cannot be reversed. Restore from backup.');
    }
};
