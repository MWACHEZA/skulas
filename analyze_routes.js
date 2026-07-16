const fs = require('fs');
const path = require('path');

const mapData = JSON.parse(fs.readFileSync(path.join(__dirname, 'route_map.json'), 'utf-8'));
const { backendEndpoints, frontendCalls } = mapData;

// Normalize paths for comparison
function normalizePath(p) {
    if (!p) return '';
    // replace :id with dynamic segments if necessary, or just basic mapping
    return p.replace(/\/$/, '').toLowerCase();
}

const backendMap = new Set(backendEndpoints.map(e => `${e.method}|${normalizePath(e.fullPath)}`));
const frontendMap = new Set(frontendCalls.map(e => `${e.method}|${normalizePath(e.endpoint)}`));

const orphanedBackend = backendEndpoints.filter(e => !frontendMap.has(`${e.method}|${normalizePath(e.fullPath)}`));
const orphanedFrontend = frontendCalls.filter(e => !backendMap.has(`${e.method}|${normalizePath(e.endpoint)}`));

// Group orphans by file/module for readability
const backendOrphansByFile = {};
orphanedBackend.forEach(e => {
    if (!backendOrphansByFile[e.file]) backendOrphansByFile[e.file] = [];
    backendOrphansByFile[e.file].push(`${e.method} ${e.fullPath}`);
});

const frontendOrphansByFile = {};
orphanedFrontend.forEach(e => {
    if (!frontendOrphansByFile[e.file]) frontendOrphansByFile[e.file] = [];
    frontendOrphansByFile[e.file].push(`${e.method} ${e.endpoint}`);
});

let report = `# Phase 1 Routing Mapping Report\n\n`;
report += `**Total Backend Endpoints Found:** ${backendEndpoints.length}\n`;
report += `**Total Frontend API Calls Found:** ${frontendCalls.length}\n\n`;

report += `## Orphaned Backend Endpoints (Potentially Unused)\n`;
report += `Found ${orphanedBackend.length} endpoints not called directly by the frontend.\n\n`;
Object.keys(backendOrphansByFile).sort().forEach(file => {
    // Only output a summary to keep it clean, maybe just first few if too many
    if (backendOrphansByFile[file].length > 0) {
        report += `### ${file}\n`;
        backendOrphansByFile[file].forEach(endpoint => {
            report += `- \`${endpoint}\`\n`;
        });
        report += '\n';
    }
});

report += `## Orphaned Frontend API Calls (Potentially Broken/Missing Endpoints)\n`;
report += `Found ${orphanedFrontend.length} calls that don't perfectly match a backend endpoint.\n`;
report += `*(Note: Some of these might be due to complex string interpolation in Axios calls that the parser missed)*\n\n`;
Object.keys(frontendOrphansByFile).sort().forEach(file => {
    if (frontendOrphansByFile[file].length > 0) {
        report += `### ${file.replace(/\\/g, '/')}\n`;
        frontendOrphansByFile[file].forEach(endpoint => {
            report += `- \`${endpoint}\`\n`;
        });
        report += '\n';
    }
});

fs.writeFileSync('C:\\\\Users\\\\comfo\\\\.gemini\\\\antigravity-ide\\\\brain\\\\6d764238-af4f-4e04-8b90-cc4632571912\\\\phase1_routing_report.md', report);
console.log('Report generated at phase1_routing_report.md');
