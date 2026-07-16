# ============================================================
# ACADEX Footer Injector -- Add Powered-by Scripts to All Portals
# ============================================================

$root = "c:\Users\ICT-OFFICE\Desktop\skulas"

$portals = @{
    "admin"     = "../acadex/js"
    "teacher"   = "../acadex/js"
    "student"   = "../acadex/js"
    "bursar"    = "../acadex/js"
    "library"   = "../acadex/js"
    "parent"    = "../acadex/js"
    "ancillary" = "../acadex/js"
    "supplier"  = "../acadex/js"
    "alumni"    = "../acadex/js"
    "applicant" = "../acadex/js"
}

$injected  = 0
$skipped   = 0
$notfound  = 0

foreach ($portal in $portals.Keys) {
    $folder  = Join-Path $root $portal
    $jspath  = $portals[$portal]

    if (-not (Test-Path $folder)) {
        Write-Host "  [NOT FOUND]  $portal/" -ForegroundColor Red
        $notfound++
        continue
    }

    $files = Get-ChildItem -Path $folder -Filter "*.html" -Recurse

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8

        # Skip if already injected
        if ($content -match 'acadex-tenant\.js') {
            Write-Host "  [SKIP]   $portal/$($file.Name)" -ForegroundColor DarkGray
            $skipped++
            continue
        }

        # Build the script block to inject (no angle bracket issues)
        $scriptBlock = "`n    <!-- ACADEX: Powered-by footer and school branding -->`n    <script src=`"$jspath/acadex-core.js`"></script>`n    <script src=`"$jspath/acadex-tenant.js`"></script>`n"

        # Insert just before closing body tag
        if ($content -match '</body>') {
            $newContent = $content -replace '(\s*</body>)', "$scriptBlock`$1"
            Set-Content -Path $file.FullName -Value $newContent -NoNewline -Encoding UTF8
            Write-Host "  [OK]     $portal/$($file.Name)" -ForegroundColor Green
            $injected++
        } else {
            Write-Host "  [WARN]   No closing body tag in $portal/$($file.Name)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " ACADEX Injection Complete" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Injected : $injected files" -ForegroundColor Green
Write-Host " Skipped  : $skipped files (already done)" -ForegroundColor Yellow
Write-Host " Not found: $notfound portals" -ForegroundColor Red
Write-Host ""
