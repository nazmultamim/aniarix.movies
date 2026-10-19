'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Share2, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthProvider';
import DashboardNav, { DASHBOARD_TABS } from '@/components/user/Dashboardnav';
import ProfileTab from '@/components/user/Profiletab';
// import ComingSoonTab from '@/components/user/Comingsoontab';
import ContinueWatching from '@/components/user/ContinuewatchingTab';
import MyListTab from '@/components/user/Mylisttab';
import SettingsTab from '@/components/user/Settingstab';

export default function UserDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut, refreshAuth } = useAuth();

  const validTabs = new Set(DASHBOARD_TABS.map((tab) => tab.id));
  const activeTab = (() => {
    if (!pathname) return 'profile';
    const parts = pathname.split('/').filter(Boolean);
    const tabFromUrl = parts[parts.length - 1];
    return validTabs.has(tabFromUrl) ? tabFromUrl : 'profile';
  })();

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push('/');
    router.refresh();
  }, [signOut, router]);

  const handleTabChange = useCallback((tab) => {
    const targetPath = tab === 'profile' ? '/user/dash/profile' : `/user/dash/${tab}`;
    router.push(targetPath);
  }, [router]);

  const handleProfileUpdated = useCallback(() => {
    refreshAuth?.();
  }, [refreshAuth]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
      <DashboardNav activeTab={activeTab} onChange={handleTabChange} />

      <div className=" backdrop-blur-xl overflow-hidden">
        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
            onLogout={handleLogout}
          />
        )}
        {activeTab === 'continue' && (
          <ContinueWatching />
        )}

        {/* {activeTab === 'favourite' && (
          <ComingSoonTab icon={Bell} title="Favourite" description="Coming soon!" />
        )} */}
        {activeTab === 'mylist' && (
          <MyListTab />
        )}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
}
