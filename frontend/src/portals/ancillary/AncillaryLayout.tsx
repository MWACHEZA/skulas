import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function AncillaryLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('ancillary', user, location.pathname);

  return (
    <DashboardLayout
      portalName="Ancillary Staff Portal"
      portalIcon="fas fa-hands-helping"
      roleBadge="Staff"
      navGroups={navGroups}
    />
  );
}
