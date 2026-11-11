import { router } from 'expo-router';

import { PeopleList } from '@/components/admin-tools';
import { Screen } from '@/components/ui';

/** Administrators only (guarded in the root layout). */
export default function PeopleScreen() {
  return (
    <Screen
      title="People"
      subtitle="Everyone with an account"
      backLabel="Settings"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}>
      <PeopleList />
    </Screen>
  );
}
