import React, { useState, useCallback, Suspense, lazy } from 'react';
import { WorkerLayout } from '../../components/WorkerLayout';
import { WorkerHome } from '../../components/WorkerHome';
import { useTeam } from '../contexts/TeamContext';
import { Loader2 } from 'lucide-react';

const WorkerMyJobs = lazy(() => import('../../components/WorkerMyJobs').then(m => ({ default: m.WorkerMyJobs })));
const WorkerSchedule = lazy(() => import('../../components/WorkerSchedule').then(m => ({ default: m.WorkerSchedule })));
const TimesheetLogger = lazy(() => import('../../components/TimesheetLogger').then(m => ({ default: m.TimesheetLogger })));
const TimesheetHistory = lazy(() => import('../../components/TimesheetHistory').then(m => ({ default: m.TimesheetHistory })));
const WorkerJobDetail = lazy(() => import('../../components/WorkerJobDetail').then(m => ({ default: m.WorkerJobDetail })));

type WorkerTabType = 'home' | 'my_jobs' | 'my_schedule' | 'timesheets' | 'job_detail' | 'timesheet_history';

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
  </div>
);

const WorkerApp: React.FC = () => {
  const { membership } = useTeam();
  const [activeTab, setActiveTab] = useState<WorkerTabType>('home');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleViewJob = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab('job_detail');
  }, []);

  const handleBack = useCallback(() => {
    setActiveTab('home');
    setSelectedJobId(null);
  }, []);

  const handleBackToJobs = useCallback(() => {
    setActiveTab('my_jobs');
    setSelectedJobId(null);
  }, []);

  if (!membership) return null;

  return (
    <WorkerLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      teamName={membership.teamName}
      displayName={membership.displayName}
    >
      <Suspense fallback={<PageLoader />}>
        {activeTab === 'home' && (
          <WorkerHome
            memberId={membership.id}
            onViewJob={handleViewJob}
            onNavigate={(tab) => setActiveTab(tab as WorkerTabType)}
          />
        )}
        {activeTab === 'my_jobs' && (
          <WorkerMyJobs
            onViewJob={handleViewJob}
          />
        )}
        {activeTab === 'my_schedule' && (
          <WorkerSchedule />
        )}
        {activeTab === 'timesheets' && (
          <TimesheetLogger
            memberId={membership.id}
            onViewHistory={() => setActiveTab('timesheet_history')}
          />
        )}
        {activeTab === 'timesheet_history' && (
          <TimesheetHistory
            memberId={membership.id}
            onBack={() => setActiveTab('timesheets')}
          />
        )}
        {activeTab === 'job_detail' && selectedJobId && (
          <WorkerJobDetail
            jobPackId={selectedJobId}
            onBack={handleBackToJobs}
          />
        )}
      </Suspense>
    </WorkerLayout>
  );
};

export default WorkerApp;
