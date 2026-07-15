<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Models\Employee;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(protected AuditLogger $auditLogger) {}
    public function index(): Response
    {
        $users = User::query()
            ->with('employee')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'status' => $user->status?->value ?? 'active',
                'employee' => $user->employee ? [
                    'id' => $user->employee->id,
                    'first_name' => $user->employee->first_name,
                    'last_name' => $user->employee->last_name,
                    'full_name' => trim($user->employee->first_name . ' ' . $user->employee->last_name),
                ] : null,
            ]);

        $unlinkedEmployees = Employee::query()
            ->whereNull('user_id')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'full_name' => trim($employee->first_name . ' ' . $employee->last_name),
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'unlinkedEmployees' => $unlinkedEmployees,
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

    public function linkEmployee(Request $request, User $user): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
        ]);

        $employee = Employee::findOrFail($request->input('employee_id'));

        if ($employee->user_id && $employee->user_id !== $user->id) {
            return back()->with('error', 'This employee is already linked to another user account.');
        }

        Employee::where('user_id', $user->id)->update(['user_id' => null]);

        $employee->update(['user_id' => $user->id]);

        $this->auditLogger->logWithoutModel('link-employee', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'employee_id' => $employee->id,
            'employee_name' => trim($employee->first_name . ' ' . $employee->last_name),
        ]);

        return to_route('users.index')->with('success', 'Employee linked successfully.');
    }

    public function unlinkEmployee(Request $request, User $user): RedirectResponse
    {
        if (! $request->user()->isAdmin() && ! $request->user()->isManagement()) {
            abort(403, 'Unauthorized action.');
        }

        if ($user->employee) {
            $employeeName = trim($user->employee->first_name . ' ' . $user->employee->last_name);
            $employeeId = $user->employee->id;
            $user->employee->update(['user_id' => null]);

            $this->auditLogger->logWithoutModel('unlink-employee', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'employee_id' => $employeeId,
                'employee_name' => $employeeName,
            ]);
        }

        return to_route('users.index')->with('success', 'Employee unlinked successfully.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Unauthorized action.');
        }

        if ($request->user()->is($user)) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        if ($user->employee) {
            $user->employee->update(['user_id' => null]);
        }

        $user->delete();

        return to_route('users.index')->with('success', 'User deleted successfully.');
    }
}
