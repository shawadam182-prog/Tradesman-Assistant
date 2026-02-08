import React, { Suspense, lazy } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { ENABLE_TEAM_FEATURES } from '../lib/constants';
import { Loader2 } from 'lucide-react';

const MainApp = lazy(() => import('./MainApp'));
const WorkerApp = lazy(() => import('./WorkerApp'));

const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
  </div>
);

const AppRouter: React.FC = () => {
  const { isFieldWorker, loading } = useTeam();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {ENABLE_TEAM_FEATURES && isFieldWorker ? <WorkerApp /> : <MainApp />}
    </Suspense>
  );
};

export default AppRouter;
