export const ROLES = ['admin', 'management', 'employee'] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
    | 'view-employees'
    | 'manage-employees'
    | 'delete-employees'
    | 'view-calculate'
    | 'view-summary'
    | 'view-ranking'
    | 'manage-users'
    | 'delete-users'
    | 'export-dtr'
    | 'delete-dtr';

const PERMISSIONS: Record<Role, Permission[]> = {
    admin: [
        'view-employees',
        'manage-employees',
        'delete-employees',
        'view-calculate',
        'view-summary',
        'view-ranking',
        'manage-users',
        'delete-users',
        'export-dtr',
        'delete-dtr',
    ],
    management: [
        'view-employees',
        'manage-employees',
        'view-calculate',
        'view-summary',
        'view-ranking',
        'manage-users',
        'export-dtr',
        'delete-dtr',
    ],
    employee: ['view-ranking'],
};

export function roleCan(role: Role, permission: Permission): boolean {
    return PERMISSIONS[role]?.includes(permission) ?? false;
}
