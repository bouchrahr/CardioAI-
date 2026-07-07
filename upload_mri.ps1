# upload_mri.ps1
# Upload de 2 fichiers IRM (ED + ES) vers l'endpoint CardioAI.
# Compatible PowerShell 5.x (construit le multipart/form-data manuellement).

param(
    [int]$PatientId = 17,
    [string]$Token = $token,
    [string]$EdFile = "test_data\mri\ACDC_009_ED_0000.nii.gz",
    [string]$EsFile = "test_data\mri\ACDC_009_ES_0000.nii.gz",
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

Add-Type -AssemblyName System.Net.Http

$httpClient = New-Object System.Net.Http.HttpClient
$httpClient.Timeout = [System.TimeSpan]::FromMinutes(5)  # 5 min pour laisser le temps au CPU
$httpClient.DefaultRequestHeaders.Authorization = `
    New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)

$content = New-Object System.Net.Http.MultipartFormDataContent

# --- Fichier ED ---
$edStream = [System.IO.File]::OpenRead((Resolve-Path $EdFile))
$edContent = New-Object System.Net.Http.StreamContent($edStream)
$edContent.Headers.ContentType = `
    [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/gzip")
$content.Add($edContent, "ed_file", [System.IO.Path]::GetFileName($EdFile))

# --- Fichier ES ---
$esStream = [System.IO.File]::OpenRead((Resolve-Path $EsFile))
$esContent = New-Object System.Net.Http.StreamContent($esStream)
$esContent.Headers.ContentType = `
    [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/gzip")
$content.Add($esContent, "es_file", [System.IO.Path]::GetFileName($EsFile))

$url = "$BaseUrl/api/cdt/upload-mri/$PatientId"
Write-Host "Upload en cours vers $url ..."
Write-Host "(patiente ~30-60s, nnU-Net tourne 2x sur CPU)"

try {
    $response = $httpClient.PostAsync($url, $content).Result
    $body = $response.Content.ReadAsStringAsync().Result

    Write-Host ""
    Write-Host "Status: $($response.StatusCode) ($([int]$response.StatusCode))"
    Write-Host ""
    Write-Host "Reponse :"
    # Joli affichage JSON
    try {
        $body | ConvertFrom-Json | ConvertTo-Json -Depth 6
    } catch {
        Write-Host $body
    }
}
finally {
    $edStream.Dispose()
    $esStream.Dispose()
    $httpClient.Dispose()
}