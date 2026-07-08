<?php

namespace App\Listeners;

use App\Models\AuditLog;
use App\Services\Audit\AuditLogger;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Events\Dispatcher;
use Laravel\Fortify\Events\PasswordUpdatedViaController;

class AuditLogSubscriber
{
    public function __construct(protected AuditLogger $logger) {}

    public function handleLogin(Login $event): void
    {
        if ($this->alreadyLogged('login', $event->user->getKey())) {
            return;
        }

        $this->logger->logWithoutModel('login', [
            'email' => $event->user->email,
        ]);
    }

    public function handleLogout(Logout $event): void
    {
        if ($this->alreadyLogged('logout', $event->user->getKey())) {
            return;
        }

        $this->logger->logWithoutModel('logout', [
            'email' => $event->user->email,
        ]);
    }

    public function handlePasswordReset(PasswordReset $event): void
    {
        $this->logger->logWithoutModel('password_reset', [
            'email' => $event->user->email,
        ]);
    }

    public function handlePasswordChanged(PasswordUpdatedViaController $event): void
    {
        $this->logger->logWithoutModel('password_changed', [
            'email' => $event->user->email,
        ]);
    }

    public function handleRegistered(Registered $event): void
    {
        $this->logger->logWithoutModel('registered', [
            'email' => $event->user->email,
        ]);
    }

    public function handleVerified(Verified $event): void
    {
        $this->logger->logWithoutModel('verified', [
            'email' => $event->user->email,
        ]);
    }

    protected function alreadyLogged(string $action, int|string $userId): bool
    {
        return AuditLog::where('action', $action)
            ->where('user_id', $userId)
            ->where('auditable_type', 'auth')
            ->where('created_at', '>=', now()->subSeconds(5))
            ->exists();
    }

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Login::class, [$this, 'handleLogin']);
        $events->listen(Logout::class, [$this, 'handleLogout']);
        $events->listen(PasswordReset::class, [$this, 'handlePasswordReset']);
        $events->listen(PasswordUpdatedViaController::class, [$this, 'handlePasswordChanged']);
        $events->listen(Registered::class, [$this, 'handleRegistered']);
        $events->listen(Verified::class, [$this, 'handleVerified']);
    }
}
