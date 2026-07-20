import sys

filepath = r'c:\Users\comfo\Videos\skulas\frontend\src\portals\shared\pages\ReportViewerPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "          {/* â”€â”€ Visualizations â”€â”€ */}"
if start_marker not in content:
    start_marker = "          {/* ── Visualizations ── */}"

if start_marker not in content:
    print("Could not find visualizations marker")
    sys.exit(1)

# Find the start of the block
start_idx = content.find(start_marker)
# Find the end of the block. It ends with:
#             return null;
#           })()}
end_marker = "            return null;\n          })()}"
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if end_idx < len(end_marker):
    print("Could not find end marker")
    sys.exit(1)

viz_block_raw = content[start_idx:end_idx]

# Remove the inline IIFE wrapper and create a function body
# Replace start
start_replace = start_marker + "\n" + "          {(['student-balances','single-fee-group','balances-summary','student-debtors','fees-payments','fees-takings',\n             'enrollment-grouped','profit-loss','detailed-expenses','revenue-allocation','grocery-consumption',\n             'payroll-runs','employee-payslips','uniforms-analytics','fee-reminders'].includes(type || '')) && data && (() => {"

viz_function = '''
  const renderVisualizations = (isExport: boolean = false) => {
    if (!(['student-balances','single-fee-group','balances-summary','student-debtors','fees-payments','fees-takings',
             'enrollment-grouped','profit-loss','detailed-expenses','revenue-allocation','grocery-consumption',
             'payroll-runs','employee-payslips','uniforms-analytics','fee-reminders'].includes(type || ''))) return null;
    if (!data) return null;
''' + viz_block_raw[len(start_replace):-len("})()}")] + "\n  };"

# Remove from original location and replace with function call
content = content[:start_idx] + "          {/* ── Visualizations ── */}\n          {renderVisualizations(false)}" + content[end_idx:]

# Insert viz_function before exportToPDF
pdf_idx = content.find("  const exportToPDF = async () => {")
content = content[:pdf_idx] + viz_function + "\n\n" + content[pdf_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully extracted renderVisualizations")
