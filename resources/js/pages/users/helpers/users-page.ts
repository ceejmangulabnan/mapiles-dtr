import { index as usersIndex } from '@/routes/users';
import type { BreadcrumbItem } from '@/types';

export type UserRow = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'management' | 'employee';
    status: string;
};

export type UsersPageProps = {
    users: UserRow[];
    successMessage?: string | null;
};

export const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: usersIndex(),
    },
];
