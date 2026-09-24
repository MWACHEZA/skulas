import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function ClinicLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('clinic', user, location.pathname);

  return (
    <DashboardLayout
      portalName="Clinic Portal"
      portalIcon="fas fa-user-md"
      roleBadge="Medical Staff"
      navGroups={navGroups}
      accentColor='var(--portal-success)'
    />
  );
}
