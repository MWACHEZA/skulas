import sys
filepath = r'c:\Users\comfo\Videos\skulas\frontend\src\portals\shared\pages\ReportViewerPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "visualizations={renderVisualizations(true)}\n            visualizations={renderVisualizations(true)}",
    "visualizations={renderVisualizations(true)}"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed duplicate visualizations prop")
