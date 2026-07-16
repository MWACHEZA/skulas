/**
 * Asset Manager - Handles school assets and incidents
 */

const AssetManager = {
    /**
     * Seed data for initial display
     */
    SEED_ASSETS: [
        { id: 'EHS-VEH-001', name: 'Toyota Hilux (School Bus)', category: 'vehicles', custodian: 'Tendai Moyo', email: 't.moyo@embakwe.ac.zw', location: 'Transport Dept', status: 'good', cost: 35000, nextMaintenance: '2026-03-15' },
        { id: 'EHS-ICT-242', name: 'Dell Latitude Laptop', category: 'ict equipment', custodian: 'Blessing Phiri', email: 'b.phiri@embakwe.ac.zw', location: 'Admin Block', status: 'excellent', cost: 1200, nextMaintenance: '2026-06-01' },
        { id: 'EHS-TL-055', name: 'Industrial Lawn Mower', category: 'maintenance tools', custodian: 'Tendai Moyo', email: 't.moyo@embakwe.ac.zw', location: 'Grounds', status: 'damaged', cost: 850, nextMaintenance: '2026-02-28' },
        { id: 'EHS-KTC-012', name: 'Commercial Gas Oven', category: 'kitchen equipment', custodian: 'Nomsa Khumalo', email: 'n.khumalo@embakwe.ac.zw', location: 'Dining Hall', status: 'fair', cost: 4500, nextMaintenance: '2026-04-20' }
    ],

    /**
     * Gets all assets from localStorage
     */
    getAssets: function () {
        return getTenantData('school_assets', this.SEED_ASSETS);
    },

    /**
     * Saves assets to localStorage
     */
    saveAssets: function (assets) {
        saveTenantData('school_assets', assets);
    },

    /**
     * Gets assets for a specific user
     */
    getUserAssets: function (email) {
        return this.getAssets().filter(a => a.email === email);
    },

    /**
     * Adds a new asset
     */
    addAsset: function (asset) {
        const assets = this.getAssets();
        assets.push(asset);
        this.saveAssets(assets);
        return true;
    },

    /**
     * Gets all incidents
     */
    getIncidents: function () {
        return getTenantData('asset_incidents', []);
    },

    /**
     * Adds an incident report
     */
    addIncident: function (incident) {
        const incidents = this.getIncidents();
        incidents.push({
            ...incident,
            id: 'INC-' + Date.now(),
            timestamp: new Date().toISOString(),
            status: 'Pending',
            resolvedAt: null,
            resolvedBy: null,
            resolutionDetails: null
        });
        saveTenantData('asset_incidents', incidents);
        return true;
    },

    /**
     * Resolves an incident with detailed metadata
     */
    resolveIncident: function (incidentId, resolverInfo) {
        const incidents = this.getIncidents();
        const index = incidents.findIndex(i => i.id === incidentId);
        if (index !== -1) {
            const incident = incidents[index];
            incident.status = 'Resolved';
            incident.resolvedAt = new Date().toISOString();
            incident.resolvedBy = resolverInfo.name;
            incident.resolutionDetails = resolverInfo.details;
            incident.actionTaken = resolverInfo.actionTaken;
            incident.discoveryMethod = resolverInfo.discoveryMethod;
            incident.fixDetails = resolverInfo.fixDetails;

            saveTenantData('asset_incidents', incidents);

            // Audit Log
            if (window.AuditLogger) {
                window.AuditLogger.log(
                    'Incident Resolved',
                    {
                        incidentId: incidentId,
                        assetId: incident.assetId,
                        resolvedBy: resolverInfo.name,
                        actionTaken: resolverInfo.actionTaken
                    },
                    'info',
                    'System',
                    'Assets'
                );
            }

            // Update Asset Status if provided
            if (resolverInfo.newStatus) {
                this.updateAssetStatus(incident.assetId, resolverInfo.newStatus, 'Resolution: ' + resolverInfo.details);
            }

            return true;
        }
        return false;
    },

    /**
     * Updates an asset's status and logs it
     */
    updateAssetStatus: function (assetId, newStatus, reason = '') {
        const assets = this.getAssets();
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            const oldStatus = asset.status;
            asset.status = newStatus;
            this.saveAssets(assets);

            if (window.AuditLogger) {
                window.AuditLogger.log(
                    'Asset Status Updated',
                    {
                        assetId: assetId,
                        name: asset.name,
                        oldStatus: oldStatus,
                        newStatus: newStatus,
                        reason: reason
                    },
                    newStatus === 'damaged' || newStatus === 'unusable' ? 'warning' : 'info',
                    'System',
                    'Assets'
                );
            }
            return true;
        }
        return false;
    },

    /**
     * Decommissions an asset
     */
    decommissionAsset: function (assetId, reason) {
        return this.updateAssetStatus(assetId, 'unusable', 'Decommissioned: ' + reason);
    }
};

