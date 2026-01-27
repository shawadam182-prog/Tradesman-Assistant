param (
    [Parameter(Mandatory = $true)]
    [string]$InputPath,
    
    [Parameter(Mandatory = $true)]
    [string]$OutputDir,
    
    [int]$Fps = 1
)

# Create output directory if it doesn't exist
if (-not (Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created directory: $OutputDir"
}

# Clean directory
Get-ChildItem -Path $OutputDir -Include *.jpg, *.png -Recurse | Remove-Item

Write-Host "Extracting frames from $InputPath at $Fps FPS..."

# Run ffmpeg
# -i: Input file
# -vf fps=$Fps: Video filter to set frame rate
# -q:v 2: High quality JPEG
# -y: Overwrite output files
ffmpeg -i $InputPath -vf "fps=$Fps" -q:v 2 -y "$OutputDir\frame_%04d.jpg"

if ($LASTEXITCODE -eq 0) {
    $count = (Get-ChildItem $OutputDir).Count
    Write-Host "Successfully extracted $count frames to $OutputDir"
}
else {
    Write-Error "FFmpeg failed with exit code $LASTEXITCODE"
}
