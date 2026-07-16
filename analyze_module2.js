const fs = require('fs');
const path = require('path');

const mapData = JSON.parse(fs.readFileSync(path.join(__dirname, 'route_map.json'), 'utf-8'));
const { backendEndpoints, frontendCalls } = mapData;

const targetModules = ['/api/classes', '/api/subjects', '/api/timetable', '/api/grades', '/api/grading', '/api/cbt', '/api/syllabus', '/api/teachers', '/api/lesson-plan'];

const moduleBackend = backendEndpoints.filter(e => targetModules.some(m => e.fullPath.startsWith(m)));
const moduleFrontend = frontendCalls.filter(e => targetModules.some(m => e.endpoint.startsWith(m)));

// Map by generic path
function normalizePath(p) {
    return p.replace(/\/$/, '').toLowerCase();
}

const backendMap = new Set(moduleBackend.map(e => `${e.method}|${normalizePath(e.fullPath)}`));
const frontendMap = new Set(moduleFrontend.map(e => `${e.method}|${normalizePath(e.endpoint)}`));

const orphanedBackend = moduleBackend.filter(e => !frontendMap.has(`${e.method}|${normalizePath(e.fullPath)}`));
const orphanedFrontend = moduleFrontend.filter(e => !backendMap.has(`${e.method}|${normalizePath(e.endpoint)}`));

console.log("=== ORPHANED BACKEND (Module 2) ===");
orphanedBackend.forEach(e => console.log(`${e.file}: ${e.method} ${e.fullPath}`));

console.log("\n=== ORPHANED FRONTEND (Module 2) ===");
orphanedFrontend.forEach(e => console.log(`${e.file}: ${e.method} ${e.endpoint}`));

