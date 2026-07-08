<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAuthenticated
{
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        if (! $request->isMethod('GET')) {
            return $next($request);
        }

        $authPaths = ['login', 'register', 'forgot-password', 'reset-password*'];

        if (! $request->is(...$authPaths)) {
            return $next($request);
        }

        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                $user = Auth::guard($guard)->user();
                $home = match (true) {
                    $user->isAdmin(), $user->isManagement() => '/employees',
                    default => '/ranking',
                };

                return redirect()->to($home);
            }
        }

        return $next($request);
    }
}
