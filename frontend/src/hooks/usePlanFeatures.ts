import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PLANS } from '../portals/acadex/pages/Subscriptions';

/**
 * Returns which Acadex platform features are available
 * for the currently logged-in school based on their subscription plan.
 *
 * Usage:
 *   const { hasFeature } = usePlanFeatures();
 *   if (!hasFeature('Sports Management')) return null;
 */
export function usePlanFeatures() {
  const { user } = useAuth();

  const planName = user?.schoolPlan || 'Starter';

  // Find the plan definition — fall back to Starter
  const planDef = DEFAULT_PLANS.find(p => p.name === planName) ?? DEFAULT_PLANS[0];

  const featuresEnabled: string[] = planDef?.features ?? [];

  /**
   * Returns true if the current school's plan includes this feature.
   * Pass the EXACT feature string from ALL_SYSTEM_FEATURES.
   */
  const hasFeature = (feature: string): boolean => {
    // Enterprise gets everything
    if (planName === 'Enterprise') return true;
    return featuresEnabled.includes(feature);
  };

  /**
   * Returns true if ANY of the given features is in the plan.
   */
  const hasAnyFeature = (...features: string[]): boolean =>
    features.some(f => hasFeature(f));

  return {
    planName,
    featuresEnabled,
    hasFeature,
    hasAnyFeature,
  };
}
