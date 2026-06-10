# Smoke registration script
# Usage: .\scripts\smoke-register.ps1
param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ts = Get-Date -Format 'yyyyMMddHHmmss'
$json = @"
{"schoolName":"Smoke Test School","schoolAlias":"smoke-test-$ts","email":"smoke$ts@example.com","password":"Password123!","firstName":"Smoke","lastName":"Tester"}
"@

try {
  Write-Host "Posting registration to $BaseUrl/api/auth/register"
  $resp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -ContentType 'application/json' -Body $json -ErrorAction Stop
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Error "Smoke test failed: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try {
      $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      Write-Host "Response body:"
      Write-Host $body
    } catch {}
  }
  exit 1
}