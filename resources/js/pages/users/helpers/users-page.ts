import { index as usersIndex } from '@/routes/users';
import type { BreadcrumbItem } from '@/types';

export type EmployeeRow = {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
};

export type UserRow = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'management' | 'employee';
    status: string;
    employee: EmployeeRow | null;
};

export type UsersPageProps = {
    users: UserRow[];
    unlinkedEmployees: EmployeeRow[];
};

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: usersIndex(),
    },
];
