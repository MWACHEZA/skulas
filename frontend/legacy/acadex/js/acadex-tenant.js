/**
 * ACADEX Tenant Branding & Footer Injector
 * Injects school-specific branding and the "Powered by ACADEX" footer
 * into every portal page dynamically based on the active school session.
 *
 * Usage: Drop this script into any portal page's </body>:
 *   <script src="../acadex/js/acadex-core.js"></script>
 *   <script src="../acadex/js/acadex-tenant.js"></script>
 */

const AcadexTenant = (() => {

  // ── Branding ──────────────────────────────────────────────

  function applyBranding(school) {
    if (!school) school = window.AcadexCore ? AcadexCore.getActiveSchool() : null;
    if (!school) return;
    const b = school.branding || {};
    const root = document.documentElement;
    if (b.primaryColor) {
      root.style.setProperty('--school-primary', b.primaryColor);
      document.body.style.setProperty('--school-primary', b.primaryColor);
      
      const dark = darkenColor(b.primaryColor, 20);
      root.style.setProperty('--school-primary-dark', dark);
      document.body.style.setProperty('--school-primary-dark', dark);

      const light = lightenColor(b.primaryColor, 15);
      root.style.setProperty('--school-primary-light', light);
      document.body.style.setProperty('--school-primary-light', light);

      const rgb = transformHexToRgb(b.primaryColor);
      if (rgb) {
        root.style.setProperty('--school-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        document.body.style.setProperty('--school-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }
    if (b.accentColor) {
      root.style.setProperty('--school-accent',  b.accentColor);
      document.body.style.setProperty('--school-accent',  b.accentColor);

      const dark = darkenColor(b.accentColor, 20);
      root.style.setProperty('--school-accent-dark', dark);
      document.body.style.setProperty('--school-accent-dark', dark);

      const light = lightenColor(b.accentColor, 15);
      root.style.setProperty('--school-accent-light', light);
      document.body.style.setProperty('--school-accent-light', light);

      const rgb = transformHexToRgb(b.accentColor);
      if (rgb) {
        root.style.setProperty('--school-accent-rgb',  `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        document.body.style.setProperty('--school-accent-rgb',  `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }

    document.querySelectorAll('.acadex-school-name, #currentSchoolName, .sidebar-brand h3, .sidebar-header h3, .logo h1, .footer-logo h2').forEach(el => {
      el.textContent = school.name;
    });
    document.querySelectorAll('.acadex-school-address').forEach(el => el.textContent = school.address || el.textContent);
    document.querySelectorAll('.acadex-school-phone').forEach(el => el.textContent = school.phone || el.textContent);
    document.querySelectorAll('.acadex-school-email').forEach(el => el.textContent = school.email || el.textContent);
    if (b.logo) {
      // Update specific classes and common image containers
      document.querySelectorAll('.acadex-school-logo, .logo img, .sidebar-brand img, .footer-logo img, .login-header img, .login-card i.fa-user-check, .login-card i.fa-user-shield').forEach(el => {
        // If it's an image, update src. If it's an icon, replace with image.
        if (el.tagName === 'IMG') {
          el.src = b.logo;
          el.alt = school.name + " Logo";
        } else if (el.tagName === 'I') {
          const newImg = document.createElement('img');
          newImg.src = b.logo;
          newImg.alt = school.name + " Logo";
          newImg.style.width = '64px'; // Example styling, adjust as needed
          newImg.style.marginBottom = '15px'; // Example styling
          el.parentNode.replaceChild(newImg, el);
        }
      });
      // Fallback: update images in common sidebar/header containers that might use brand-icon
      document.querySelectorAll('.sidebar-header img, .sidebar-brand .brand-icon').forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = b.logo;
          el.alt = school.name + ' Logo';
        } else if (el.classList.contains('brand-icon')) {
          // Replace placeholder icon with img
          el.innerHTML = `<img src="${b.logo}" style="width:100%;height:100%;object-fit:contain;">`;
          el.style.background = 'transparent';
          el.style.boxShadow = 'none';
        }
      });
    }
    if (school.name && !document.title.includes(school.name)) {
      document.title = school.name + ' — ' + document.title;
    }
  }

  // ── Top banner (slim) ─────────────────────────────────────

  function injectSchoolBanner(school) {
    if (!school) school = window.AcadexCore ? AcadexCore.getActiveSchool() : null;
    if (!school) return;
    const existing = document.getElementById('acadex-school-banner');
    if (existing) existing.remove();
    const primary = school.branding?.primaryColor || '#1a1a2e';
    const accent  = school.branding?.accentColor  || '#2563eb';
    const plan = (window.ACADEX_PLANS || {})[school.plan] || {};
    const banner = document.createElement('div');
    banner.id = 'acadex-school-banner';
    banner.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:99999',
      `background:linear-gradient(135deg,${primary},${accent})`,
      'color:white;font-size:11px;font-family:Inter,Poppins,sans-serif',
      'display:flex;align-items:center;justify-content:space-between',
      'padding:4px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.25)',
      'line-height:1.4'
    ].join(';');
    banner.innerHTML = `
      <span style="font-weight:700;letter-spacing:0.02em;">🏫 ${school.name}</span>
      <span style="opacity:0.75;font-size:10px;display:flex;align-items:center;gap:12px;">
        <span>Powered by <strong style="opacity:1;">ACADEX</strong> &bull; Code: <strong style="font-family:monospace">${school.code}</strong></span>
        <a href="#" onclick="sessionStorage.clear(); window.location.reload(); return false;" style="color:white;text-decoration:none;font-weight:600;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px;transition:0.2s;">Switch School</a>
      </span>`;
    document.body.prepend(banner);
    document.body.style.paddingTop = ((parseInt(document.body.style.paddingTop) || 0) + 26) + 'px';
  }

  // ── Bottom footer ─────────────────────────────────────────

  function injectFooter(school) {
    const existing = document.getElementById('acadex-powered-footer');
    if (existing) existing.remove();

    const schoolName   = school?.name   || '';
    const schoolCode   = school?.code   || '';
    const plan         = (window.ACADEX_PLANS || {})[school?.plan] || {};
    const planName     = plan.name || '';
    const primary      = school?.branding?.primaryColor || '#1a1a2e';
    const accent       = school?.branding?.accentColor  || '#2563eb';

    const footer = document.createElement('div');
    footer.id = 'acadex-powered-footer';
    footer.style.cssText = [
      'width:100%',
      `background:linear-gradient(135deg, ${primary} 0%, ${primary}ee 100%)`,
      'border-top:2px solid ' + accent,
      'color:rgba(255,255,255,0.85)',
      'font-family:Inter,Poppins,sans-serif',
      'font-size:12px',
      'padding:10px 20px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'flex-wrap:wrap',
      'gap:6px',
      'box-sizing:border-box',
      'position:fixed',
      'bottom:0',
      'left:0',
      'z-index:9999'
    ].join(';');

    // Left: school name + plan badge
    const left = schoolName ? `
      <span style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:700;color:white;">🏫 ${schoolName}</span>
        ${planName ? `<span style="background:${accent};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">${planName}</span>` : ''}
      </span>` : '<span></span>';

    // Centre: Powered by ACADEX
    const centre = `
      <span style="display:flex;align-items:center;gap:6px;font-size:11px;opacity:0.85;">
        Powered by
        <span style="font-weight:900;color:white;letter-spacing:0.05em;font-size:12px;">ACAD<span style="color:#f59e0b;">EX</span></span>
      </span>`;

    // Right: Copyright
    const right = `
      <span style="font-size:11px;opacity:0.7;">
        &copy; Santana 2025. All rights reserved.
      </span>`;

    footer.innerHTML = `${left}${centre}${right}`;
    footer.style.flexShrink = '0';

    // Append to main content area if it exists to avoid breaking flex layouts on body
    const mainArea = document.querySelector('.main-content, .content-area, .dashboard-container, main, .register-container');
    if (mainArea && !document.body.classList.contains('acadex-fixed-footer')) {
      // Ensure the container is a flex column to allow footer to stick to bottom via margin-top: auto
      if (mainArea.tagName !== 'MAIN' && !mainArea.classList.contains('register-container')) {
          mainArea.style.display = 'flex';
          mainArea.style.flexDirection = 'column';
          if (!mainArea.style.minHeight) mainArea.style.minHeight = '100vh';
      }
      
      footer.style.marginTop = 'auto';
      if (mainArea.classList.contains('register-container')) {
          mainArea.parentNode.appendChild(footer);
      } else {
          mainArea.appendChild(footer);
      }
    } else {
      // If appending to body or fixed footer is requested
      const body = document.body;
      if (body.classList.contains('acadex-fixed-footer')) {
          footer.style.position = 'fixed';
          footer.style.bottom = '0';
          footer.style.left = '0';
      } else {
          const bodyStyle = window.getComputedStyle(body);
          if (bodyStyle.display === 'flex') {
            footer.style.position = 'absolute';
            footer.style.bottom = '0';
            footer.style.left = '0';
            if (bodyStyle.position === 'static') body.style.position = 'relative';
          }
      }
      body.appendChild(footer);
    }
  }

  // ── Remove helpers ────────────────────────────────────────

  function removeBanner() {
    const b = document.getElementById('acadex-school-banner');
    if (b) b.remove();
  }

  function removeFooter() {
    const f = document.getElementById('acadex-powered-footer');
    if (f) f.remove();
  }

  // ── Subscription Enforcement ──────────────────────────────

  function enforceSubscription(school) {
    if (!school) return;
    
    // Check if school is suspended
    if (school.status === 'suspended') {
      const primary = school.branding?.primaryColor || '#1a1a2e';
      const blocker = document.createElement('div');
      blocker.id = 'acadex-suspension-wall';
      blocker.style.cssText = [
        'position:fixed;inset:0;z-index:999999',
        'background:rgba(15,23,42,0.95);backdrop-filter:blur(10px)',
        'display:flex;align-items:center;justify-content:center',
        'font-family:Inter,Poppins,sans-serif;color:white;text-align:center'
      ].join(';');
      
      blocker.innerHTML = `
        <div style="background:${primary};padding:3rem;border-radius:20px;max-width:480px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);">
          <div style="font-size:3.5rem;margin-bottom:1rem;">⚠️</div>
          <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 0.5rem;">Access Suspended</h2>
          <p style="font-size:0.95rem;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:2rem;">
            The portal for <strong>${school.name}</strong> is currently unavailable due to an inactive or unpaid subscription.
          </p>
          <div style="background:rgba(0,0,0,0.2);padding:1rem;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);">
            <strong>School Administrator:</strong> Please log in to the ACADEX Super Admin portal to update your billing details and restore access immediately.
          </div>
          <p style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-top:2rem;">
            Powered by ACADEX Billing Services
          </p>
        </div>
      `;
      document.body.appendChild(blocker);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
  }

  // ── Dynamic Content Injection ─────────────────────────────

  function loadDynamicContent(school) {
    if (!school) school = window.AcadexCore ? AcadexCore.getActiveSchool() : null;
    if (!school) return;
    const c = school.customContent || {};

    // 0. Base Branding / Text
    if (c.motto) {
        document.querySelectorAll('.school-motto, #school-motto').forEach(el => el.textContent = c.motto);
    }
    if (c.welcomeTitle) {
        document.querySelectorAll('#hero-title, .hero-content h1').forEach(el => el.textContent = c.welcomeTitle);
    }
    if (c.welcomeSubtitle) {
        document.querySelectorAll('#hero-subtitle, .hero-content p').forEach(el => el.textContent = c.welcomeSubtitle);
    }
    if (c.footerText) {
        document.querySelectorAll('#footer-tagline, .footer-logo p').forEach(el => el.textContent = c.footerText);
    }

    // 1. Injects Clubs
    const clubsContainer = document.querySelector('.clubs-grid, #clubs-container');
    if (clubsContainer && school.customContent?.clubs) {
      clubsContainer.innerHTML = school.customContent.clubs.map(club => `
        <div class="club-card" style="background:white; padding:30px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.05); text-align:center; transition:0.3s;">
          <div class="club-icon" style="font-size:2.5rem; color:var(--school-primary); margin-bottom:20px;"><i class="${club.icon || 'fas fa-users'}"></i></div>
          <h3 style="margin-bottom:15px; color:#333;">${club.name}</h3>
          <p style="color:#666; font-size:0.9rem; line-height:1.6;">${club.description}</p>
        </div>
      `).join('');
    }

    // 2. Injects Departments
    const deptContainer = document.querySelector('.departments-grid, #departments-container');
    if (deptContainer && school.customContent?.departments) {
      deptContainer.innerHTML = school.customContent.departments.map(dept => `
        <div class="dept-card" style="background:white; padding:30px; border-radius:15px; border-left:5px solid var(--school-primary); box-shadow:0 5px 15px rgba(0,0,0,0.05);">
          <h3 style="color:var(--school-primary); margin-bottom:15px;">${dept.name}</h3>
          <p style="color:#666; margin-bottom:15px;">${dept.description}</p>
          <ul style="list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:10px;">
            ${dept.subjects.map(s => `<li style="background:#f0f7ff; color:#0056b3; padding:5px 12px; border-radius:20px; font-size:0.8rem;">${s}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    }
    
    // 3. Injects Gallery
    const galleryContainer = document.querySelector('.gallery-grid, #gallery-container');
    if (galleryContainer && school.customContent?.gallery) {
      galleryContainer.innerHTML = school.customContent.gallery.map(img => `
        <div class="gallery-item" style="position:relative; border-radius:15px; overflow:hidden; aspect-ratio:1/1;">
          <img src="${img.url}" alt="${img.caption}" style="width:100%; height:100%; object-fit:cover; transition:0.5s;">
          <div class="gallery-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s; color:white; padding:20px; text-align:center;">
            <span style="font-weight:600;">${img.caption}</span>
          </div>
        </div>
      `).join('');
    }

    // 4. Injects Sports
    const sportsContainer = document.querySelector('#sports-container');
    if (sportsContainer && school.customContent?.sports) {
      sportsContainer.innerHTML = school.customContent.sports.map(sport => `
        <div class="sport-card" style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <div style="font-size:2rem; color:var(--school-primary); margin-bottom:10px;"><i class="${sport.icon || 'fas fa-trophy'}"></i></div>
          <h3 style="margin-bottom:8px;">${sport.name}</h3>
          <p style="font-size:0.9rem; color:#666;">${sport.description}</p>
        </div>
      `).join('');
    }

    // 5. Injects News / Announcements
    const newsContainer = document.querySelector('#news-dynamic-container');
    if (newsContainer && school.customContent?.news) {
      newsContainer.innerHTML = school.customContent.news.map(item => `
        <div class="news-card" style="background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
          ${item.image ? `<img src="${item.image}" style="width:100%; height:180px; object-fit:cover;">` : ''}
          <div style="padding:20px;">
            <span style="font-size:0.8rem; color:#888;">${item.date || new Date().toLocaleDateString()}</span>
            <h3 style="margin:10px 0;">${item.title}</h3>
            <p style="font-size:0.9rem; color:#666;">${item.summary || item.content}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // ── Auto-init ─────────────────────────────────────────────
  // Called once DOM is ready. Loads school from active session and injects everything.

  function init() {
    let school = null;
    if (window.AcadexCore) {
      school = AcadexCore.getActiveSchool();
    }
    // Always inject footer (with or without school data)
    injectFooter(school);
    if (school) {
      applyBranding(school);
      injectSchoolBanner(school);
      enforceSubscription(school);
      loadDynamicContent(school);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function transformHexToRgb(hex) {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function darkenColor(hex, percent) {
    const rgb = transformHexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.max(0, Math.floor(rgb.r * (1 - percent / 100)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - percent / 100)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - percent / 100)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function lightenColor(hex, percent) {
    const rgb = transformHexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * (percent / 100)));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * (percent / 100)));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * (percent / 100)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  return { applyBranding, injectSchoolBanner, injectFooter, removeBanner, removeFooter, init, transformHexToRgb, darkenColor, lightenColor };
})();

window.AcadexTenant = AcadexTenant;

