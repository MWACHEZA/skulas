const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'frontend', 'src', 'App.tsx');
let appTsx = fs.readFileSync(appTsxPath, 'utf8');

// 1. Update imports
appTsx = appTsx.replace(/from '\.\/portals\/student\/pages\/clinic\//g, "from './portals/shared/pages/clinic/");

const clinicImports = `
// ── Clinic Portal pages ──
import ClinicLayout from './portals/clinic/ClinicLayout';
import ClinicDashboard from './portals/clinic/pages/Dashboard';
import PatientManagement from './portals/clinic/pages/PatientManagement';
`;
appTsx = appTsx.replace('// ── Shared pages ──', clinicImports + '\n// ── Shared pages ──');

// 2. Add Clinic routes to all portals
const clinicRoutes = `            <Route path="clinic/complaints" element={<HealthComplaints />} />
            <Route path="clinic/appointments" element={<Appointments />} />
            <Route path="clinic/emergencies" element={<Emergencies />} />
            <Route path="clinic/referrals" element={<Referrals />} />
            <Route path="clinic/immunization" element={<Immunization />} />
`;

// It seems each portal has <Route path="support" element={<ITSupportPage />} />
// We can insert clinicRoutes before that.
appTsx = appTsx.replace(/(<Route path="support"\s+element={<ITSupportPage \/>} \/>)/g, clinicRoutes + '            $1');

// 3. Add Clinic Portal registration
const clinicReg = `<Route path="/register/clinic" element={<StaffRegister role="CLINIC" label="Clinic Staff" icon="fa-user-md" />} />\n`;
appTsx = appTsx.replace(/(<Route path="\/register\/bursar" .*? \/>)/, clinicReg + '$1');

// 4. Add Clinic Portal
const clinicPortal = `
          {/* ══════════ CLINIC PORTAL ══════════ */}
          <Route path="/clinic/login" element={
            <PortalLoginPage portalName="Clinic Portal" portalIcon="fas fa-user-md"
              roleBadge="Medical Staff" allowedRole="CLINIC" dashboardPath="/clinic/dashboard" 
              registrationPath="/register/clinic" />
          } />
          <Route path="/clinic" element={
            <ProtectedRoute allowedRole="CLINIC" loginPath="/clinic/login">
              <ClinicLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClinicDashboard />} />
            <Route path="dashboard" element={<ClinicDashboard />} />
            <Route path="patients" element={<PatientManagement />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="emergencies" element={<Emergencies />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="immunization" element={<Immunization />} />
            <Route path="support" element={<ITSupportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
`;
appTsx = appTsx.replace('{/* ══════════ APPLICANT PORTAL ══════════ */}', clinicPortal + '\n          {/* ══════════ APPLICANT PORTAL ══════════ */}');

fs.writeFileSync(appTsxPath, appTsx);

// Next, update all Layouts to add the Clinic navigation section
const layouts = [
  'TeacherLayout.tsx',
  'AdminLayout.tsx',
  'ParentLayout.tsx',
  'AncillaryLayout.tsx',
  'BursarLayout.tsx',
  'LibraryLayout.tsx',
];

const clinicNavItems = `    { section: 'Clinic', label: 'Health Complaints', icon: 'fas fa-stethoscope', to: 'clinic/complaints' },
    { label: 'Appointments', icon: 'fas fa-calendar-check', to: 'clinic/appointments' },
    { label: 'Emergencies', icon: 'fas fa-ambulance', to: 'clinic/emergencies' },
    { label: 'Referrals', icon: 'fas fa-file-medical', to: 'clinic/referrals' },
    { label: 'Immunization', icon: 'fas fa-syringe', to: 'clinic/immunization' },
`;

layouts.forEach(layout => {
  // Find layout recursively
  function findFile(dir, name) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        const res = findFile(full, name);
        if (res) return res;
      } else if (file === name) {
        return full;
      }
    }
    return null;
  }
  
  const layoutPath = findFile(path.join(__dirname, 'frontend', 'src', 'portals'), layout);
  if (layoutPath) {
    let content = fs.readFileSync(layoutPath, 'utf8');
    // Most layouts have a "Help" or "Settings" section at the end.
    // Try to insert before IT Support
    if (content.includes("to: 'support'")) {
      content = content.replace(/({\s*label:\s*'IT Support',\s*icon:\s*'fas fa-headset',\s*to:\s*'support'.*?},)/, clinicNavItems + '    $1');
    } else if (content.includes("to: '/teacher/support'")) {
      // Fix for absolute paths
      const absClinicNavItems = clinicNavItems.replace(/to: 'clinic/g, "to: '/teacher/clinic");
      content = content.replace(/({\s*label:\s*'IT Support',\s*icon:\s*'fas fa-headset',\s*to:\s*'\/teacher\/support'.*?},)/, absClinicNavItems + '    $1');
    } else {
      // Just insert before Settings
      content = content.replace(/({\s*label:\s*'Settings',\s*icon:\s*'fas fa-cog')/, clinicNavItems + '    $1');
    }
    
    // Convert absolute to relative if needed or replace correctly based on prefix
    const portalName = layout.replace('Layout.tsx', '').toLowerCase();
    if (portalName !== 'teacher' && content.includes(`to: '/${portalName}/support'`)) {
       const fixedNav = clinicNavItems.replace(/to: 'clinic/g, `to: '/${portalName}/clinic`);
       content = fs.readFileSync(layoutPath, 'utf8');
       content = content.replace(new RegExp(`({\\s*label:\\s*'IT Support',\\s*icon:\\s*'fas fa-headset',\\s*to:\\s*'/${portalName}/support'.*?},)`), fixedNav + '    $1');
    } else if (portalName === 'admin' && content.includes(`to: '/admin/helpdesk'`)) {
       const fixedNav = clinicNavItems.replace(/to: 'clinic/g, `to: '/admin/clinic`);
       content = fs.readFileSync(layoutPath, 'utf8');
       content = content.replace(/({\s*label:\s*'Helpdesk & IT Support',\s*icon:\s*'fas fa-headset',\s*to:\s*'\/admin\/helpdesk'.*?},)/, fixedNav + '    $1');
    }

    fs.writeFileSync(layoutPath, content);
  }
});

console.log("Done updating routes and layouts.");
