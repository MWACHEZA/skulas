const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../frontend/src/App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

// Add imports
if (!app.includes('import QuestionBank')) {
  app = app.replace(
    "import ManageCBT from './portals/shared/pages/cbt/ManageCBT';",
    "import ManageCBT from './portals/shared/pages/cbt/ManageCBT';\nimport QuestionBank from './portals/teacher/pages/QuestionBank';\nimport OnlineExamsCbt from './portals/teacher/pages/OnlineExamsCbt';"
  );
}

// Replace route inside teacher block
const teacherBlockRegex = /(<Route path="cbt\/manage" element=\{<ManageCBT \/>\} \/>\s*<Route path="cbt\/manage\/:id\/questions" element=\{<ManageQuestions \/>\} \/>)/;
app = app.replace(
  teacherBlockRegex,
  '<Route path="cbt/manage" element={<OnlineExamsCbt />} />\n              <Route path="question-bank" element={<QuestionBank />} />\n              <Route path="cbt/manage/:id/questions" element={<ManageQuestions />} />'
);

fs.writeFileSync(appPath, app);
console.log('App.tsx updated.');
