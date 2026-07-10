import type { ReactNode } from 'react';
import type { Permission } from '@/config/permissions';
import { useAuth } from '@/hooks/use-auth';

type CanProps = {
    permission: Permission;
    children: ReactNode;
    fallback?: ReactNode;
};

export function Can({ permission, children, fallback = null }: CanProps) {
    const { can } = useAuth();

    if (can(permission)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
