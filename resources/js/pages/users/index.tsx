import UsersPageContent from './components/users-page-content';
import type { UsersPageProps } from './helpers/users-page';

export default function Users(props: UsersPageProps) {
    return <UsersPageContent {...props} />;
}
