<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => env('SEED_ADMIN_PASSWORD'),
                'role' => UserRole::Admin,
            ],
        );

        User::firstOrCreate(
            ['email' => 'management@example.com'],
            [
                'name' => 'Management',
                'password' => env('SEED_MANAGEMENT_PASSWORD'),
                'role' => UserRole::Management,
            ],
        );
    }
}
