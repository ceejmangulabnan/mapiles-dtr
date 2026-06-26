<?php

namespace Database\Seeders;

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
        User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => env('SEED_ADMIN_PASSWORD', 'adminmapiles'),
            'role' => 'Admin',
        ]);

        User::factory()->create([
            'name' => 'Management',
            'email' => 'management@example.com',
            'password' => env('SEED_MANAGEMENT_PASSWORD', 'managementmapiles'),
            'role' => 'Management',
        ]);
    }
}
