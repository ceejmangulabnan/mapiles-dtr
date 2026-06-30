import type { Auth } from '@/types';
import { usePage } from '@inertiajs/react';

export const useAuth = () => {
    const auth = usePage().props.auth as Auth;
    return auth;
};
