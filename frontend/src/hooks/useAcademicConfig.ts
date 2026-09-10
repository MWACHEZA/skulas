import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTerminology } from './useTerminology';
import api from '../lib/api';

export interface AcademicConfig {
  schoolType: string;
  isK12: boolean;
  isTertiary: boolean;
  isUniversity: boolean;
  isPoly: boolean;
  isMedical: boolean;
  isSeminary: boolean;
  academicPeriodLabel: string; // 'Term' vs 'Semester'
  registeredTerms: string[];   // ['Term 1', 'Term 2', 'Term 3'] or ['Semester 1', 'Semester 2']
  activeTerm: string;
  activeYear: number;
  classLabel: string;
  subjectLabel: string;
  syllabusLabel: string;
  headRoleLabel: string;
  t: (key: any) => string;
  loading: boolean;
  schoolSettings: any;
}

export function useAcademicConfig(): AcademicConfig {
  const { user } = useAuth();
  const terminology = useTerminology();
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/schools/settings');
        if (isMounted && res.data) {
          setSchoolSettings(res.data);
        }
      } catch (err) {
        // Silently use defaults if settings cannot be fetched
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user?.schoolId) {
      fetchSettings();
    }
    return () => {
      isMounted = false;
    };
  }, [user?.schoolId]);

  const rawSchoolType = user?.schoolType || schoolSettings?.school?.type || 'Secondary';
  const isTertiary = terminology.isTertiary;
  const isK12 = terminology.isK12;

  const academicPeriodLabel = isTertiary ? 'Semester' : 'Term';

  const registeredTerms = useMemo(() => {
    if (schoolSettings?.terms && Array.isArray(schoolSettings.terms) && schoolSettings.terms.length > 0) {
      return schoolSettings.terms;
    }
    if (isTertiary) {
      return ['Semester 1', 'Semester 2'];
    }
    return ['Term 1', 'Term 2', 'Term 3'];
  }, [schoolSettings, isTertiary]);

  const activeTerm = useMemo(() => {
    if (schoolSettings?.currentTerm && registeredTerms.includes(schoolSettings.currentTerm)) {
      return schoolSettings.currentTerm;
    }
    return registeredTerms[0] || (isTertiary ? 'Semester 1' : 'Term 1');
  }, [schoolSettings?.currentTerm, registeredTerms, isTertiary]);

  const activeYear = useMemo(() => {
    if (schoolSettings?.runningSession) {
      const parts = schoolSettings.runningSession.split('-');
      const parsedYear = parseInt(parts[0], 10);
      if (!isNaN(parsedYear)) return parsedYear;
    }
    return new Date().getFullYear();
  }, [schoolSettings?.runningSession]);

  return {
    schoolType: rawSchoolType,
    isK12,
    isTertiary,
    isUniversity: terminology.isUniversity,
    isPoly: terminology.isPoly,
    isMedical: terminology.isMedical,
    isSeminary: terminology.isSeminary,
    academicPeriodLabel,
    registeredTerms,
    activeTerm,
    activeYear,
    classLabel: terminology.t('class'),
    subjectLabel: terminology.t('subject'),
    syllabusLabel: terminology.t('syllabus'),
    headRoleLabel: terminology.t('headTitle'),
    t: terminology.t,
    loading,
    schoolSettings
  };
}

export default useAcademicConfig;
