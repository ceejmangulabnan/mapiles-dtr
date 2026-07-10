import { usePage } from '@inertiajs/react';
import type { Permission, Role } from '@/config/permissions';
import { roleCan } from '@/config/permissions';
import type { Auth } from '@/types';

export const useAuth = () => {
    const auth = usePage().props.auth as Auth;
    const role = auth.user?.role as Role | undefined;

    return {
        ...auth,
        role,
        isAdmin: () => role === 'admin',
        isManagement: () => role === 'management',
        isEmployee: () => role === 'employee',
        can: (permission: Permission) => (role ? roleCan(role, permission) : false),
    };
};
