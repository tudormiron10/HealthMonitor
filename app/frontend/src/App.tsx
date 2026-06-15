
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/presentation/components/layout/MainLayout';
import { AuthLayout } from '@/presentation/components/layout/AuthLayout';
import { DashboardLayout } from '@/presentation/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/presentation/components/routing/ProtectedRoute';
import LandingPage from '@/presentation/pages/public/LandingPage';
import PlatformPage from '@/presentation/pages/public/PlatformPage';
import RegisterPage from '@/presentation/pages/auth/RegisterPage';
import LoginPage from '@/presentation/pages/auth/LoginPage';
import DesignTest from '@/presentation/pages/_dev/DesignTest';
import { PatientDashboard } from '@/presentation/pages/patient/PatientDashboard';
import { SpecialistHomePage } from '@/presentation/pages/specialist/SpecialistHomePage';
import { SpecialistPatientsPage } from '@/presentation/pages/specialist/SpecialistPatientsPage';
import { SpecialistRequestsPage } from '@/presentation/pages/specialist/SpecialistRequestsPage';
import { AdminDashboard } from '@/presentation/pages/admin/AdminDashboard';
import { AdminUsersPage } from '@/presentation/pages/admin/AdminUsersPage';
import { AdminVerificationPage } from '@/presentation/pages/admin/AdminVerificationPage';
import { ManualRecordEntryPage } from '@/presentation/pages/patient/ManualRecordEntryPage';
import { PredictionResultsPage } from '@/presentation/pages/patient/PredictionResultsPage';
import { PatientHistoryPage } from '@/presentation/pages/patient/PatientHistoryPage';
import { CompareRecordsPage } from '@/presentation/pages/patient/CompareRecordsPage';
import { SingleRecordDetailPage } from '@/presentation/pages/patient/SingleRecordDetailPage';
import { PatientMedicalSheetPage } from '@/presentation/pages/specialist/PatientMedicalSheetPage';
import { SpecialistVerificationPage } from '@/presentation/pages/specialist/SpecialistVerificationPage';
import { MySpecialistsPage } from '@/presentation/pages/patient/MySpecialistsPage';
import { MyPlansPage } from '@/presentation/pages/patient/MyPlansPage';
import { SpecialistVerificationGuard } from '@/presentation/components/routing/SpecialistVerificationGuard';
import { DashboardRedirect } from '@/presentation/components/routing/DashboardRedirect';
import { SpecialistProfilePage } from '@/presentation/pages/specialist/SpecialistProfilePage';
import { SpecialistSingleRecordPage } from '@/presentation/pages/specialist/SpecialistSingleRecordPage';
import { SentPlansPage } from '@/presentation/pages/specialist/SentPlansPage';
import { PublicSpecialistProfilePage } from '@/presentation/pages/specialists/PublicSpecialistProfilePage';
import { MessagesPage } from '@/presentation/pages/messages/MessagesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Public Routes wrapped with Navbar & Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          {/* Debug/Design Test Route */}
          <Route path="/design" element={<DesignTest />} />
        </Route>

        {/* Auth Routes wrapped with AuthLayout */}
        <Route element={<AuthLayout />}>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Public specialist profiles — auth required, no DashboardLayout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/specialists/:userId" element={<PublicSpecialistProfilePage />} />
        </Route>

        {/* Protected Dashboard Routes wrapped with DashboardLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* We will route user to specific dashboards depending on role,
                but for now we explicitly map them so we can test. */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/patient" element={<PatientDashboard />} />
            <Route path="/dashboard/patient/add-record" element={<ManualRecordEntryPage />} />
            <Route path="/dashboard/patient/history" element={<PatientHistoryPage />} />
            <Route path="/dashboard/patient/compare" element={<CompareRecordsPage />} />
            <Route path="/dashboard/patient/predictions/:recordId" element={<PredictionResultsPage />} />
            <Route path="/dashboard/patient/records/:recordId" element={<SingleRecordDetailPage />} />
            <Route path="/dashboard/messages" element={<MessagesPage />} />
            <Route path="/dashboard/messages/:conversationId" element={<MessagesPage />} />
            <Route element={<ProtectedRoute allowedRoles={['DOCTOR', 'NUTRITIONIST', 'COACH']} />}>
              <Route path="/dashboard/specialist/verification" element={<SpecialistVerificationPage />} />
              <Route element={<SpecialistVerificationGuard />}>
                <Route path="/dashboard/specialist" element={<SpecialistHomePage />} />
                <Route path="/dashboard/specialist/profile" element={<SpecialistProfilePage />} />
                <Route path="/dashboard/specialist/patients" element={<SpecialistPatientsPage />} />
                <Route path="/dashboard/specialist/patients/:patientUserId" element={<PatientMedicalSheetPage />} />
                <Route path="/dashboard/specialist/patients/:patientUserId/records/:recordId" element={<SpecialistSingleRecordPage />} />
                <Route path="/dashboard/specialist/requests" element={<SpecialistRequestsPage />} />
                <Route element={<ProtectedRoute allowedRoles={['NUTRITIONIST', 'COACH']} />}>
                  <Route path="/dashboard/specialist/sent-plans" element={<SentPlansPage />} />
                </Route>
              </Route>
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
              <Route path="/dashboard/patient/specialists" element={<MySpecialistsPage />} />
              <Route path="/dashboard/patient/my-plans" element={<MyPlansPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
              <Route path="/dashboard/admin/verification" element={<AdminVerificationPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
