const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'backend', 'src', 'api');
const backendIndex = path.join(__dirname, 'backend', 'src', 'index.ts');
const frontendSrcDir = path.join(__dirname, 'frontend', 'src');

const backendMounts = {};
const indexContent = fs.readFileSync(backendIndex, 'utf-8');

// Parse imports in index.ts
const importRegex = /import (\w+) from ['"]\.\/api\/([\w-]+)['"]/g;
let match;
const importsMap = {}; // e.g. { authRoutes: 'auth' }
while ((match = importRegex.exec(indexContent)) !== null) {
    importsMap[match[1]] = match[2];
}

// Parse app.use in index.ts
const useRegex = /app\.use\(['"](.*?)['"],\s*(?:[\w]+,\s*)?(\w+)\)/g;
while ((match = useRegex.exec(indexContent)) !== null) {
    const mountPath = match[1];
    const routerName = match[2];
    if (importsMap[routerName]) {
        backendMounts[importsMap[routerName]] = mountPath;
    }
}

// Ensure api/public is mapped manually if missing (just in case)
if (!backendMounts['public']) backendMounts['public'] = '/api/public';

// Find endpoints in backend
const backendEndpoints = [];
const apiFiles = fs.readdirSync(backendDir).filter(f => f.endsWith('.ts'));

apiFiles.forEach(file => {
    const filename = file.replace('.ts', '');
    const mountPath = backendMounts[filename] || '';
    
    const content = fs.readFileSync(path.join(backendDir, file), 'utf-8');
    const routeRegex = /router\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    
    let routeMatch;
    while ((routeMatch = routeRegex.exec(content)) !== null) {
        const method = routeMatch[1].toUpperCase();
        const routePath = routeMatch[2];
        const fullPath = `${mountPath}${routePath === '/' ? '' : routePath}`.replace(/\/+/g, '/');
        
        backendEndpoints.push({
            file,
            method,
            fullPath
        });
    }
});

// Find API calls in frontend
const frontendCalls = [];

function walkFrontendDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkFrontendDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Look for api.get('/path'), axios.post(`/path`), fetch('/path')
            const apiRegex = /(?:api|axios)\.(get|post|put|delete|patch)\(\s*[`'"](.*?)[`'"]/g;
            let apiMatch;
            while ((apiMatch = apiRegex.exec(content)) !== null) {
                const method = apiMatch[1].toUpperCase();
                let endpoint = apiMatch[2];
                // strip query params for basic mapping
                endpoint = endpoint.split('?')[0]; 
                // handle string interpolation like /api/users/${id}
                endpoint = endpoint.replace(/\$\{[^}]+\}/g, ':id');
                
                frontendCalls.push({
                    file: fullPath.replace(frontendSrcDir, ''),
                    method,
                    endpoint
                });
            }
        }
    }
}

walkFrontendDir(frontendSrcDir);

const output = {
    backendEndpoints,
    frontendCalls
};

fs.writeFileSync(path.join(__dirname, 'route_map.json'), JSON.stringify(output, null, 2));
console.log(`Mapped ${backendEndpoints.length} backend endpoints and ${frontendCalls.length} frontend API calls.`);
