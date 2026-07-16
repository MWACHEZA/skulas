/**
 * ACADEX Core - Multi-Tenant School Context Manager
 * Manages school registrations, active school session, and tenant data
 */

/**
 * ACADEX MULTI-TENANT STORAGE INTERCEPTOR
 * Automatically scopes local storage keys to the active school tenant.
 */
(function() {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    // Keys that must be isolated per school tenant
    const tenantPrefixKeys = [
        'adminUsers',
        'ancillaryStaff',
        'fees_transactions',
        'school_fees',
        'library_books',
        'studentGrades',
        'officialSubjects',
        'publishedReports',
        'sharedAssignmentData',
        'itTickets',
        'school_applications'
    ];

    function getTenantKey(storageInstance, key) {
        if (!key || typeof key !== 'string') return key;

        // Ensure we only partition localStorage, not sessionStorage
        if (storageInstance === sessionStorage) return key;

        // Fetch active session without triggering recursion
        const activeCode = originalGetItem.call(sessionStorage, 'activeSchoolCode');
        
        if (activeCode) {
            // Apply tenant prefix if the key starts with 'school_' or is in the explicit list
            if (key.startsWith('school_') || tenantPrefixKeys.includes(key)) {
                return `acadex_${activeCode}_${key}`;
            }
        }
        return key;
    }

    Storage.prototype.getItem = function(key) {
        return originalGetItem.call(this, getTenantKey(this, key));
    };

    Storage.prototype.setItem = function(key, value) {
        originalSetItem.call(this, getTenantKey(this, key), value);
    };

    Storage.prototype.removeItem = function(key) {
        originalRemoveItem.call(this, getTenantKey(this, key));
    };
})();

const AcadexCore = (() => {
  const STORAGE_KEY = 'acadex_tenant_registry';
  const ACTIVE_KEY = 'acadex_active_school';
  const SESSION_KEY = 'acadex_session';

  // ---------- Registry ----------
  function _loadRegistry() {
    try {
      return JSON.parse(getTenantData(STORAGE_KEY, 'null')) || [];
    } catch { return []; }
  }

  function _saveRegistry(list) {
    saveTenantData(STORAGE_KEY, list);
  }

  // Generate unique school code: AX-XXXXXX
  function _generateCode() {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AX-${rand}`;
  }

  // ---------- Public API ----------
  function registerSchool(data) {
    const registry = _loadRegistry();
    const existing = registry.find(s =>
      s.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'A school with this email already exists.' };
    }

    const parentId = `SCH-${Date.now()}`;
    const branding = {
      primaryColor: data.primaryColor || '#1e3a5f',
      accentColor: data.accentColor || '#3b82f6',
      logo: data.logo || ''
    };

    if (data.type === 'combined') {
      // 1. Parent Billing Record
      const parentSchool = {
        id: parentId,
        isParent: true,
        name: data.name + ' (Group)',
        type: 'combined',
        address: data.address,
        country: data.country,
        email: data.email,
        phone: data.phone,
        website: data.website || '',
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword || 'Admin@123',
        students: parseInt(data.students) || 0,
        plan: data.plan || 'starter',
        status: 'trial',
        trialEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        joinedAt: new Date().toISOString(),
        branding
      };

      // 2. Child 1: Primary
      const primarySchool = {
        ...parentSchool,
        id: `SCH-${Date.now()}-P`,
        parentId: parentId,
        isParent: false,
        name: data.name + ' Primary',
        type: 'primary',
        code: _generateCode(),
        plan: 'included', // Billed under parent
        status: 'active' // inherits from parent ultimately
      };

      // 3. Child 2: Secondary
      const secondarySchool = {
        ...parentSchool,
        id: `SCH-${Date.now()}-S`,
        parentId: parentId,
        isParent: false,
        name: data.name + ' Secondary',
        type: 'secondary',
        code: _generateCode(),
        plan: 'included'
      };

      registry.push(parentSchool, primarySchool, secondarySchool);
      _saveRegistry(registry);
      return { success: true, school: parentSchool, children: [primarySchool, secondarySchool] };

    } else {
      // Standard Single School Registration
      const school = {
        id: parentId,
        isParent: true, // Acts as its own parent for billing
        code: _generateCode(),
        name: data.name,
        type: data.type,
        address: data.address,
        country: data.country,
        email: data.email,
        phone: data.phone,
        website: data.website || '',
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword || 'Admin@123',
        students: parseInt(data.students) || 0,
        plan: data.plan || 'starter',
        status: 'trial',
        trialEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        joinedAt: new Date().toISOString(),
        branding
      };
      registry.push(school);
      _saveRegistry(registry);
      return { success: true, school };
    }
  }

  function getAllSchools() {
    return _loadRegistry();
  }

  function getSchoolByCode(code) {
    return _loadRegistry().find(s => s.code === code.toUpperCase()) || null;
  }

  function getSchoolById(id) {
    return _loadRegistry().find(s => s.id === id) || null;
  }

  function updateSchool(id, updates) {
    const registry = _loadRegistry();
    const idx = registry.findIndex(s => s.id === id);
    if (idx === -1) return { success: false, error: 'School not found.' };
    registry[idx] = { ...registry[idx], ...updates, id };
    _saveRegistry(registry);
    return { success: true, school: registry[idx] };
  }

  function deleteSchool(id) {
    const registry = _loadRegistry().filter(s => s.id !== id);
    _saveRegistry(registry);
    return { success: true };
  }

  // ---------- Active Session ----------
  function setActiveSchool(code) {
    const school = getSchoolByCode(code);
    if (!school) return false;
    saveTenantData(ACTIVE_KEY, school.id);
    return true;
  }

  function getActiveSchool() {
    const id = getTenantData(ACTIVE_KEY, 'null');
    if (!id) return null;
    const school = getSchoolById(id);
    if (school && !school.customContent) {
      // Inject sample content for demonstration
      school.customContent = {
        motto: "Excellence in Education",
        welcomeTitle: "Welcome to " + school.name,
        welcomeSubtitle: "Nurturing minds, building character, and preparing leaders for tomorrow.",
        footerText: "Excellence in Education",
        clubs: [
          { name: "Robotics Club", description: "Designing and building the future.", icon: "fas fa-robot" },
          { name: "Debate Society", description: "Critical thinking and persuasive speaking.", icon: "fas fa-comments" },
          { name: "Environmental Club", description: "Going green and protecting our planet.", icon: "fas fa-seedling" }
        ],
        departments: [
          { name: "Science", description: "Exploring the natural world.", subjects: ["Biology", "Chemistry", "Physics"] },
          { name: "Humanities", description: "Understanding society and culture.", subjects: ["History", "Geography", "Sociology"] }
        ],
        gallery: [
          { url: "images/gallery-1.jpg", caption: "Sports Day 2025" },
          { url: "images/gallery-2.jpg", caption: "Annual Prize Giving" }
        ],
        sports: [
          { name: "Soccer", description: "Our champion soccer team.", icon: "fas fa-futbol" },
          { name: "Athletics", description: "Speed and endurance.", icon: "fas fa-running" }
        ],
        news: [
          { title: "2026 Enrollment Open", summary: "Applications for the next academic year are now being accepted.", date: new Date().toLocaleDateString() }
        ]
      };
    }
    return school;
  }

  function clearActiveSchool() {
    saveTenantData(ACTIVE_KEY, []);
    saveTenantData(SESSION_KEY, []);
  }

  // ---------- Session ----------
  function setSession(role, userData) {
    const school = getActiveSchool();
    const session = {
      schoolId: school ? school.id : null,
      schoolCode: school ? school.code : null,
      role,
      user: userData,
      loginAt: new Date().toISOString()
    };
    saveTenantData(SESSION_KEY, session);
  }

  function getSession() {
    try {
      return JSON.parse(getTenantData(SESSION_KEY, 'null')) || null;
    } catch { return null; }
  }

  // ---------- Stats ----------
  function getPlatformStats() {
    const schools = _loadRegistry();
    const billingEntities = schools.filter(s => s.isParent); // Only count billing entities
    
    return {
      totalSchools: billingEntities.length,
      active: billingEntities.filter(s => s.status === 'active').length,
      trial: billingEntities.filter(s => s.status === 'trial').length,
      suspended: billingEntities.filter(s => s.status === 'suspended').length,
      starter: billingEntities.filter(s => s.plan === 'starter').length,
      professional: billingEntities.filter(s => s.plan === 'professional').length,
      enterprise: billingEntities.filter(s => s.plan === 'enterprise').length,
      totalStudents: billingEntities.reduce((sum, s) => sum + (s.students || 0), 0),
      monthlyRevenue: billingEntities.reduce((sum, s) => {
        if (s.status === 'active') {
          if (s.plan === 'starter') return sum + 29;
          if (s.plan === 'professional') return sum + 79;
          if (s.plan === 'enterprise') return sum + 199;
        }
        return sum;
      }, 0)
    };
  }

  function getSubscription() {
    const school = getActiveSchool();
    if (!school) return null;

    // Calculate usage
    const students = (getTenantData(`acadex_${school.code}_school_students`, '[]')).length;
    const teachers = (getTenantData(`acadex_${school.code}_school_teachers`, '[]')).length;
    
    // Limits based on plan
    const limits = {
      'starter': { students: 100, staff: 10 },
      'professional': { students: 1000, staff: 100 },
      'enterprise': { students: 10000, staff: 1000 }
    };

    const currentLimits = limits[school.plan] || limits['starter'];

    return {
      plan: (school.plan || 'Starter').charAt(0).toUpperCase() + (school.plan || 'Starter').slice(1),
      status: (school.status || 'Active').charAt(0).toUpperCase() + (school.status || 'Active').slice(1),
      renewalDate: school.trialEnds || school.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usage: {
        students: { current: students, limit: currentLimits.students },
        staff: { current: teachers, limit: currentLimits.staff }
      }
    };
  }

  return {
    registerSchool,
    getAllSchools,
    getSchoolByCode,
    getSchoolById,
    updateSchool,
    deleteSchool,
    setActiveSchool,
    getActiveSchool,
    clearActiveSchool,
    setSession,
    getSession,
    getPlatformStats,
    getSubscription,
    logPlatformEvent,
    getPlatformLogs
  };

  function logPlatformEvent(type, message, schoolId = null) {
    const PLATFORM_LOGS_KEY = 'acadex_platform_audit_logs';
    const logs = JSON.parse(localStorage.getItem(PLATFORM_LOGS_KEY) || '[]');
    logs.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      schoolId,
      user: 'Super Admin' // Typically the logged-in SA user
    });
    // Keep max 1000 logs
    if (logs.length > 1000) logs.shift();
    localStorage.setItem(PLATFORM_LOGS_KEY, JSON.stringify(logs));
  }

  function getPlatformLogs() {
    const PLATFORM_LOGS_KEY = 'acadex_platform_audit_logs';
    return JSON.parse(localStorage.getItem(PLATFORM_LOGS_KEY) || '[]');
  }
})();

// Expose globally
window.AcadexCore = AcadexCore;

