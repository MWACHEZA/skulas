import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import EntitySwitcher from '../../components/portals/shared/EntitySwitcher';
import ForceLinkOverlay from '../../components/portals/shared/ForceLinkOverlay';
import { useAuth } from '../../contexts/AuthContext';
import { useTerminology } from '../../hooks/useTerminology';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function ParentLayout() {
  const { t, isMedical } = useTerminology();
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('parent', user, location.pathname);

  return (
    <>
      <DashboardLayout
        portalName={isMedical ? "Guardian Portal" : "Parent Portal"}
        portalIcon={isMedical ? "fas fa-clinic-medical" : "fas fa-home"}
        roleBadge={t('parent')}
        navGroups={navGroups}
        sidebarHeaderExtra={<EntitySwitcher />}
      />
      <ForceLinkOverlay />
    </>
  );
}
