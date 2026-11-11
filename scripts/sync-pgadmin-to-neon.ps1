param(
  [string]$LocalHost = "localhost",
  [int]$LocalPort = 5433,
  [string]$LocalUser = "postgres",
  [string]$LocalDb = "sharma_dairy"
)

$ErrorActionPreference = "Stop"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgDump = Join-Path $pgBin "pg_dump.exe"
$psql = Join-Path $pgBin "psql.exe"

if (!(Test-Path $pgDump) -or !(Test-Path $psql)) {
  throw "PostgreSQL client binaries not found in $pgBin"
}

$envFile = if (Test-Path ".env") { ".env" } elseif (Test-Path ".env.local") { ".env.local" } else { $null }
if (!$envFile) {
  throw ".env not found. Ensure Neon DIRECT_URL or DATABASE_URL is configured."
}

$neonUrl = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^DIRECT_URL="?([^"]+)"?$') { $neonUrl = $matches[1] }
  elseif (!$neonUrl -and $_ -match '^DATABASE_URL="?([^"]+)"?$') { $neonUrl = $matches[1] }
}
if (!$neonUrl) { throw "Could not find Neon connection URL in $envFile" }
$neonDirect = ($neonUrl -replace '-pooler\.', '.') -replace '([?&])channel_binding=require(&|$)', '$1' -replace '([?&])pgbouncer=true(&|$)', '$1' -replace '[?&]$', ''
if ($neonDirect -notmatch 'connect_timeout=') {
  $neonDirect += $(if ($neonDirect -match '\?') { '&connect_timeout=30' } else { '?connect_timeout=30' })
}

$localPassSecure = Read-Host "Enter your local pgAdmin PostgreSQL password for user '$LocalUser'" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($localPassSecure)
$localPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

$dumpFile = Join-Path $env:TEMP "sharma_dairy_dump_$(Get-Date -Format 'yyyyMMddHHmmss').sql"
Write-Host "Dumping local pgAdmin database '$LocalDb'..."
$env:PGPASSWORD = $localPass
& $pgDump -h $LocalHost -p $LocalPort -U $LocalUser -d $LocalDb --data-only --disable-triggers --no-owner --no-privileges --exclude-table="_prisma_migrations" -f $dumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed. Check your local PostgreSQL password and port $LocalPort." }

Write-Host "Clearing existing rows in Neon and restoring local pgAdmin data..."
$truncateSql = @'
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;
'@
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
$truncateSql | & $psql $neonDirect
if ($LASTEXITCODE -ne 0) { throw "Failed to prepare Neon tables." }

& $psql $neonDirect -v ON_ERROR_STOP=1 -f $dumpFile
if ($LASTEXITCODE -ne 0) { throw "Restore into Neon failed." }

Remove-Item $dumpFile -ErrorAction SilentlyContinue
Write-Host "✅ All local pgAdmin data successfully copied into Neon!"

