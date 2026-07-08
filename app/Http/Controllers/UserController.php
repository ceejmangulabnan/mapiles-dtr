<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'status' => $user->status?->value ?? 'active',
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'successMessage' => session('success'),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => $request->input('password'),
            'role' => $request->input('role'),
            'status' => $request->input('status', 'active'),
        ]);

        return to_route('users.index')->with('success', 'User created successfully.');
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): RedirectResponse
    {
        $authUser = $request->user();

        if (! $authUser->isAdmin() && ! $authUser->isManagement()) {
            abort(403, 'Unauthorized action.');
        }

        $user->update([
            'status' => $request->input('status'),
        ]);

        return to_route('users.index')->with('success', 'User status updated successfully.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        if ($request->user()->is($user)) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return to_route('users.index')->with('success', 'User deleted successfully.');
    }
}
