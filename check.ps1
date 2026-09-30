# check.ps1 — finds empty source files, invalid JSON, corruption markers

Write-Host "=== Empty source files ===" -ForegroundColor Yellow
Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.js,*.json,*.css -Path apps,services,packages |
  Where-Object { $_.FullName -notmatch 'node_modules' -and $_.Length -eq 0 } |
  Select-Object @{N='Path';E={$_.FullName.Replace((Get-Location).Path + '\', '')}} |
  Format-Table -AutoSize

Write-Host "=== Invalid JSON files ===" -ForegroundColor Yellow
Get-ChildItem -Recurse -Filter package.json -File |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  ForEach-Object {
    try { Get-Content $_.FullName -Raw | ConvertFrom-Json | Out-Null }
    catch { Write-Host "INVALID: $($_.FullName)" }
  }

Write-Host "=== Files containing stray 'workspace:*' outside JSON ===" -ForegroundColor Yellow
Get-ChildItem -Recurse -File -Include *.ts,*.tsx |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  ForEach-Object {
    if ((Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match 'workspace:\*') {
      Write-Host "SUSPECT: $($_.FullName)"
    }
  }

Write-Host "=== Done ===" -ForegroundColor Green
