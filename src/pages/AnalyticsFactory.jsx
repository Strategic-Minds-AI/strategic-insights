import React from 'react';
import GA4Provisioning from '@/components/command/GA4Provisioning';
import GSCProvisioningPanel from '@/components/analytics/GSCProvisioningPanel';
import TrackingGapsPanel from '@/components/analytics/TrackingGapsPanel';
import CrossSiteComparison from '@/components/analytics/CrossSiteComparison';
import { Factory, Globe, Search, AlertTriangle, Trophy } from 'lucide-react';

export default function AnalyticsFactory() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Factory className="w-6 h-6 text-blue-600" /> Analytics Factory
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Universal analytics provisioning, tracking gap detection, and cross-site comparison for every business.
        </p>
      </div>

      {/* Provisioning row */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Globe className="w-4 h-4" /> Auto-Provisioning
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GA4Provisioning />
          <GSCProvisioningPanel />
        </div>
      </div>

      {/* Gap detection */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> Tracking Health
        </h2>
        <TrackingGapsPanel />
      </div>

      {/* Cross-site comparison */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Cross-Site Comparison
        </h2>
        <CrossSiteComparison />
      </div>
    </div>
  );
}