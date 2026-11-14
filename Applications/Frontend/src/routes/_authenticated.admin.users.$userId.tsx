import { createFileRoute } from '@tanstack/react-router';
import { UserScreen } from '../features/admin/users';

export const Route = createFileRoute('/_authenticated/admin/users/$userId')({
  component: UserRoute,
});

function UserRoute() {
  const { userId } = Route.useParams();
  return <UserScreen key={userId} userId={userId} />;
}
