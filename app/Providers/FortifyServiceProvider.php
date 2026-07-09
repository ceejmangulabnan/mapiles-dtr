<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(
            LoginResponse::class,
            \App\Http\Responses\LoginResponse::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function inertiaResponse(string $component, array $data = []): JsonResponse|Response
    {
        /** @var JsonResponse|Response $response */
        $response = Inertia::render($component, $data)->toResponse(request());

        return $response->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
    }

    private function configureViews(): void
    {
        Fortify::loginView(function (Request $request) {
            return $this->inertiaResponse('auth/login', [
                'canResetPassword' => Features::enabled(Features::resetPasswords()),
                // 'canRegister' => Features::enabled(Features::registration()),
                'status' => $request->session()->get('status'),
            ]);
        });

        Fortify::registerView(function () {
            return $this->inertiaResponse('auth/register');
        });

        Fortify::resetPasswordView(function (Request $request) {
            return $this->inertiaResponse('auth/reset-password', [
                'email' => $request->email,
                'token' => $request->route('token'),
            ]);
        });

        Fortify::requestPasswordResetLinkView(function (Request $request) {
            return $this->inertiaResponse('auth/forgot-password', [
                'status' => $request->session()->get('status'),
            ]);
        });

        Fortify::verifyEmailView(function (Request $request) {
            return $this->inertiaResponse('auth/verify-email', [
                'status' => $request->session()->get('status'),
            ]);
        });

        Fortify::twoFactorChallengeView(function () {
            return $this->inertiaResponse('auth/two-factor-challenge');
        });

        Fortify::confirmPasswordView(function () {
            return $this->inertiaResponse('auth/confirm-password');
        });
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
