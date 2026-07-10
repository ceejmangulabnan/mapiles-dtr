import { Link } from '@inertiajs/react';
import { Calculator, FileText, ScrollText, Shield, Trophy, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { index as auditLogsIndex } from '@/routes/audit-logs';
import { index as calculateIndex } from '@/routes/calculate';
import { index as employeesIndex } from '@/routes/employees';
import { index as rankingIndex } from '@/routes/ranking';
import { index as summaryIndex } from '@/routes/summary';
import { index as usersIndex } from '@/routes/users';
import type { NavItem } from '@/types';

const ALL_NAV_ITEMS: (NavItem & { permission?: string })[] = [
    { title: 'Employees', href: employeesIndex(), icon: Users, permission: 'view-employees' },
    { title: 'Calculate', href: calculateIndex(), icon: Calculator, permission: 'view-calculate' },
    { title: 'Summary', href: summaryIndex(), icon: FileText, permission: 'view-summary' },
    { title: 'Ranking', href: rankingIndex(), icon: Trophy, permission: 'view-ranking' },
    { title: 'Users', href: usersIndex(), icon: Shield, permission: 'manage-users' },
    { title: 'Audit Logs', href: auditLogsIndex(), icon: ScrollText, permission: 'view-audit-logs' },
];

const permissionMap: Record<string, string> = {};

for (const item of ALL_NAV_ITEMS) {
    if (item.permission) {
        permissionMap[item.title] = item.permission;
    }
}

export function AppSidebar() {
    const { can } = useAuth();

    const mainNavItems = ALL_NAV_ITEMS.filter((item) => {
        const perm = permissionMap[item.title];

        return !perm || can(perm as any);
    });

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={employeesIndex()}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
