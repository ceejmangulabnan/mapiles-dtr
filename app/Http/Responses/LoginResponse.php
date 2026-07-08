<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): RedirectResponse|JsonResponse
    {
        $user = $request->user();

        $home = match (true) {
            $user->isAdmin(), $user->isManagement() => route('employees.index'),
            default => route('ranking.index'),
        };

        return $request->wantsJson()
            ? new JsonResponse(['two_factor' => false])
            : redirect()->intended($home);
    }
}
