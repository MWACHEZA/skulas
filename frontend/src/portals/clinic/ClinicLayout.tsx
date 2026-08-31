import React from 'react';
import DashboardLayout, { type NavItem } from '../../components/portals/DashboardLayout';

const clinicNav: NavItem[] = [
  { section: 'Main', label: 'Dashboard', icon: 'fas fa-chart-pie', to: '/clinic/dashboard' },
  { section: 'Management', label: 'Patient Records', icon: 'fas fa-users', to: '/clinic/patients' },
  { label: 'Triage & Vitals', icon: 'fas fa-heartbeat', to: '/clinic/triage' },
  { label: 'Health Complaints', icon: 'fas fa-stethoscope', to: '/clinic/complaints' },
  { label: 'Appointments', icon: 'fas fa-calendar-check', to: '/clinic/appointments' },
  { label: 'Patient History', icon: 'fas fa-notes-medical', to: '/clinic/patient-history' },
  { label: 'Pharmacy & Stock', icon: 'fas fa-pills', to: '/clinic/pharmacy' },
  { label: 'Billing & GL Checkout', icon: 'fas fa-file-invoice-dollar', to: '/clinic/billing' },
  { label: 'Emergencies', icon: 'fas fa-ambulance', to: '/clinic/emergencies' },
  { label: 'Referrals', icon: 'fas fa-file-medical', to: '/clinic/referrals' },
  { label: 'Immunization', icon: 'fas fa-syringe', to: '/clinic/immunization' },
  { section: 'Reports & Analytics', label: 'Clinical Reports', icon: 'fas fa-chart-line', to: '/clinic/reports' },
  { section: 'Communication', label: 'Messages', icon: 'fas fa-envelope', to: '/clinic/messages' },
  { section: 'Account', label: 'My Profile', icon: 'fas fa-user', to: '/clinic/profile' },
  { label: 'Settings', icon: 'fas fa-cog', to: '/clinic/settings' },
];

export default function ClinicLayout() {
  return (
    <DashboardLayout
      portalName="Clinic Portal"
      portalIcon="fas fa-user-md"
      roleBadge="Medical Staff"
      navItems={clinicNav}
      accentColor='var(--portal-success)'
    />
  );
}
