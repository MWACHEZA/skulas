# Script to add interactive functionality to remaining admin pages
$pages = @(
    'payments.html',
    'classes-management.html',
    'subjects.html',
    'timetable-management.html',
    'attendance-overview.html',
    'grades-overview.html',
    'announcements-management.html',
    'messages.html',
    'notifications.html'
)

$scriptTags = "    <script src=`"../js/admin-common.js`"></script>`r`n    <script src=`"../js/page-enhancer.js`"></script>`r`n"

foreach ($page in $pages) {
    $filePath = "c:\Users\ICT-OFFICE\Desktop\skulas\admin\$page"
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Check if scripts already exist
        if ($content -notmatch 'admin-common.js') {
            # Find the closing body tag and add scripts before it
            $content = $content -replace '(\s*</body>)', "$scriptTags`$1"
            Set-Content $filePath $content -NoNewline
            Write-Host "Added scripts to $page" -ForegroundColor Green
        } else {
            Write-Host "Scripts already in $page" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $page" -ForegroundColor Red
    }
}

Write-Host "Done! Added scripts to all remaining pages." -ForegroundColor Cyan
