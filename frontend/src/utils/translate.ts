const translations: Record<string, Record<string, string>> = {
  French: {
    "Home": "Accueil",
    "About Us": "À Propos",
    "Departments": "Départements",
    "Apply": "Postuler",
    "News": "Actualités",
    "Sports": "Sports",
    "Clubs": "Clubs",
    "Gallery": "Galerie",
    "Contact": "Contact",
    "Portals": "Portails",
    "Admin Portal": "Portail Admin",
    "Teacher Portal": "Portail Enseignant",
    "Student Portal": "Portail Étudiant",
    "Parent Portal": "Portail Parent",
    "Bursar Portal": "Portail Économe",
    "Library Portal": "Portail Bibliothèque",
    "Alumni Portal": "Portail Anciens Élèves",
    "Supplier Portal": "Portail Fournisseur",
    "Ancillary Portal": "Portail Auxiliaire",
    "Access Portals": "Accéder aux Portails",
    "Welcome to": "Bienvenue à",
    "School News & Updates": "Actualités et Mises à Jour",
    "Sports Programs": "Programmes Sportifs",
    "Clubs & Activities": "Clubs et Activités",
    "Life at": "La vie à",
    "Contact Us": "Contactez-nous",
    "Academic Departments": "Départements Académiques"
  },
  Spanish: {
    "Home": "Inicio",
    "About Us": "Sobre Nosotros",
    "Departments": "Departamentos",
    "Apply": "Aplicar",
    "News": "Noticias",
    "Sports": "Deportes",
    "Clubs": "Clubes",
    "Gallery": "Galería",
    "Contact": "Contacto",
    "Portals": "Portales",
    "Admin Portal": "Portal de Administración",
    "Teacher Portal": "Portal del Profesor",
    "Student Portal": "Portal del Estudiante",
    "Parent Portal": "Portal de Padres",
    "Bursar Portal": "Portal del Tesorero",
    "Library Portal": "Portal de la Biblioteca",
    "Alumni Portal": "Portal de Exalumnos",
    "Supplier Portal": "Portal de Proveedores",
    "Ancillary Portal": "Portal Auxiliar",
    "Access Portals": "Acceder a Portales",
    "Welcome to": "Bienvenido a",
    "School News & Updates": "Noticias y Actualizaciones",
    "Sports Programs": "Programas Deportivos",
    "Clubs & Activities": "Clubes y Actividades",
    "Life at": "Vida en",
    "Contact Us": "Contáctenos",
    "Academic Departments": "Departamentos Académicos"
  }
};

export const t = (text: string): string => {
  try {
    const localPrefs = localStorage.getItem('personal_prefs');
    if (localPrefs) {
      const prefs = JSON.parse(localPrefs);
      const lang = prefs.preferredLanguage || 'English';
      if (lang !== 'English' && translations[lang] && translations[lang][text]) {
        return translations[lang][text];
      }
    }
  } catch (err) {}
  return text;
};
