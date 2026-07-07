<?php

namespace App\Providers;

use App\Listeners\AuditLogSubscriber;
use App\Models\Dtr;
use App\Models\DtrEntry;
use App\Models\Employee;
use App\Models\User;
use App\Observers\DtrEntryObserver;
use App\Observers\DtrObserver;
use App\Observers\EmployeeObserver;
use App\Observers\UserObserver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        Gate::define('access-admin-ui', function (User $user) {
            return $user->isAdmin();
        });

        Employee::observe(EmployeeObserver::class);
        User::observe(UserObserver::class);
        Dtr::observe(DtrObserver::class);
        DtrEntry::observe(DtrEntryObserver::class);

        Event::subscribe(AuditLogSubscriber::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
