param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [string]$AppPath = "$PSScriptRoot\..\..\listspace-ph",

    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "ap-southeast-1",

    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

# Change to the infra directory where terraform state is located
$infraDir = Split-Path -Parent $PSScriptRoot
Push-Location $infraDir

Write-Host ""; Write-Host "=== Frontend Deploy: $Environment ===" -ForegroundColor Cyan
Write-Host "Working directory:       $PWD"
Write-Host "App path:               $AppPath"
Write-Host "AWS Region:             $AwsRegion"

function ExecOrFail {
    param(
        [string]$Command,
        [string]$ErrorMessage
    )
    Write-Host "`n> $Command" -ForegroundColor DarkGray
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

# 1) Ensure correct Terraform workspace is selected
Write-Host "`nSetting up Terraform workspace..." -ForegroundColor Cyan

# Function to select or create Terraform workspace
function Set-TerraformWorkspace {
    param (
        [string]$Workspace
    )
    
    try {
        # List workspaces and check if the target exists
        $workspaces = terraform workspace list
        $workspaceExists = $workspaces -match "^[* ] $Workspace$"
        
        if ($workspaceExists) {
            Write-Host "Selecting existing workspace: $Workspace" -ForegroundColor Cyan
            terraform workspace select $Workspace 2>&1 | Out-Null
        } else {
            Write-Host "Creating new workspace: $Workspace" -ForegroundColor Cyan
            terraform workspace new $Workspace 2>&1 | Out-Null
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to select or create workspace '$Workspace'"
        }
        
        Write-Host "✓ Using workspace: $Workspace" -ForegroundColor Green
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "Failed to set up Terraform workspace" -ForegroundColor Red
        exit 1
    }
}

# Set the correct workspace
Set-TerraformWorkspace -Workspace $Environment

# 2) Read and validate Terraform outputs
Write-Host "`nValidating Terraform outputs..." -ForegroundColor Cyan

# Function to get and validate a required Terraform output
function Get-RequiredTerraformOutput {
    param (
        [string]$OutputName,
        [string]$ErrorMessage
    )
    
    try {
        $output = (terraform output -raw $OutputName 2>&1)
        if ($LASTEXITCODE -ne 0) {
            throw $output
        }
        
        $output = $output.Trim()
        if ([string]::IsNullOrWhiteSpace($output)) {
            throw "Output '$OutputName' is empty"
        }
        
        return $output
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host $ErrorMessage -ForegroundColor Red
        exit 1
    }
}

# Get required outputs
$requiredOutputs = @{
    's3_bucket_name' = "S3 bucket name not found. Make sure you've applied the Terraform configuration for environment '$Environment' and the outputs are available."
    'frontend_url' = "Frontend URL not found. Make sure you've applied the Terraform configuration for environment '$Environment' and the outputs are available."
}

$outputs = @{}
foreach ($key in $requiredOutputs.Keys) {
    $outputs[$key] = Get-RequiredTerraformOutput -OutputName $key -ErrorMessage $requiredOutputs[$key]
}

$bucketName = $outputs['s3_bucket_name']
$frontendUrl = $outputs['frontend_url']

Write-Host "✓ Successfully validated Terraform outputs" -ForegroundColor Green
Write-Host "  S3 Bucket: $bucketName" -ForegroundColor Cyan
Write-Host "  Frontend URL: $frontendUrl" -ForegroundColor Cyan

# frontend_url may be a custom domain or CloudFront domain
$frontendUrl = ""
try {
    $frontendUrl = (terraform output -raw frontend_url) 2>$null
} catch {}
$frontendUrl = $frontendUrl.Trim()
Write-Host "S3 bucket:   $bucketName"
if ($frontendUrl) { Write-Host "Frontend URL: $frontendUrl" }

# 2) Build Next.js app (if not skipped)
if (-not $SkipBuild) {
    Write-Host "`nBuilding Next.js app..." -ForegroundColor Cyan

    if (-not (Test-Path $AppPath)) {
        throw "AppPath '$AppPath' not found. Adjust the -AppPath parameter."
    }

    Push-Location $AppPath
    try {
        # Backup .env.local if it exists and temporarily rename it to ensure .env.dev is used
        $envLocalPath = ".env.local"
        $envLocalBackup = ".env.local.backup"
        $envLocalExists = Test-Path $envLocalPath
        
        if ($envLocalExists) {
            Write-Host "Temporarily backing up .env.local to ensure .env is used for build..." -ForegroundColor Yellow
            Rename-Item -Path $envLocalPath -NewName $envLocalBackup
        }
        
        try {
            # Create environment-specific .env file from Terraform outputs
            Write-Host "Creating .env from Terraform outputs for $Environment..." -ForegroundColor Cyan
            
            # Use the update-env-files.ps1 script to generate the environment file properly
            Write-Host "Generating environment file using update-env-files.ps1..." -ForegroundColor Cyan
            $updateEnvScript = Join-Path $PSScriptRoot "update-env-files.ps1"
            $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
            ExecOrFail "& `"$updateEnvScript`" -Environment `"$Environment`" -ProjectRoot `"$projectRoot`"" "Failed to generate environment file"
        
        $useYarn = Test-Path "yarn.lock"
        $usePnpm = Test-Path "pnpm-lock.yaml"

        if ($useYarn) {
            ExecOrFail "yarn install --frozen-lockfile" "yarn install failed"
            # Explicitly load environment variables from .env before build
            Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
            Get-Content ".env" | ForEach-Object {
                if ($_ -match '^NEXT_PUBLIC_(.+)=(.*)$') {
                    $name = $matches[1]
                    $value = $matches[2]
                    $envName = "NEXT_PUBLIC_$name"
                    Write-Host "Setting $envName=$value" -ForegroundColor DarkGray
                    [System.Environment]::SetEnvironmentVariable($envName, $value)
                }
            }
            ExecOrFail "yarn build" "yarn build failed"
        } elseif ($usePnpm) {
            ExecOrFail "pnpm install --frozen-lockfile" "pnpm install failed"
            # Explicitly load environment variables from .env before build
            Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
            Get-Content ".env" | ForEach-Object {
                if ($_ -match '^NEXT_PUBLIC_(.+)=(.*)$') {
                    $name = $matches[1]
                    $value = $matches[2]
                    $envName = "NEXT_PUBLIC_$name"
                    Write-Host "Setting $envName=$value" -ForegroundColor DarkGray
                    [System.Environment]::SetEnvironmentVariable($envName, $value)
                }
            }
            ExecOrFail "pnpm build" "pnpm build failed"
        } else {
            ExecOrFail "npm ci" "npm ci failed"
            # Explicitly load environment variables from .env before build
            Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
            Get-Content ".env" | ForEach-Object {
                if ($_ -match '^NEXT_PUBLIC_(.+)=(.*)$') {
                    $name = $matches[1]
                    $value = $matches[2]
                    $envName = "NEXT_PUBLIC_$name"
                    Write-Host "Setting $envName=$value" -ForegroundColor DarkGray
                    [System.Environment]::SetEnvironmentVariable($envName, $value)
                }
            }
            ExecOrFail "npm run build" "npm run build failed"
        }

        $artifactDir = Join-Path (Get-Location) "out"
        if (-not (Test-Path $artifactDir)) {
            throw "Could not find static export directory '$artifactDir'. Ensure next.config.js has output: 'export' and that 'next build' succeeded."
        }
        Write-Host "Build artifact: $artifactDir"
        } finally {
            # Restore .env.local if it was backed up
            if ($envLocalExists -and (Test-Path $envLocalBackup)) {
                Write-Host "Restoring .env.local from backup..." -ForegroundColor Yellow
                Rename-Item -Path $envLocalBackup -NewName $envLocalPath
            }
            Pop-Location
        }
        } catch {
            Write-Host "Build failed: $_" -ForegroundColor Red
            # Ensure .env.local is restored even on error
            if ($envLocalExists -and (Test-Path $envLocalBackup)) {
                Write-Host "Restoring .env.local from backup after error..." -ForegroundColor Yellow
                Rename-Item -Path $envLocalBackup -NewName $envLocalPath
            }
            Pop-Location
            throw
        }
} else {
    Write-Host "Skipping build as requested (-SkipBuild)." -ForegroundColor Yellow
}

# Resolve artifact directory (relative to AppPath)
$artifactPath = Join-Path (Resolve-Path $AppPath) "out"
if (-not (Test-Path $artifactPath)) {
    throw "Artifact path '$artifactPath' not found. Build must produce an 'out' directory when using output: 'export' in next.config.js."
}

# 3) Sync to S3
Write-Host "`nSyncing to s3://$bucketName ..." -ForegroundColor Cyan
# Ensure AWS region is set for CLI
$env:AWS_DEFAULT_REGION = $AwsRegion
$env:AWS_REGION = $AwsRegion

# Use cache-control for static assets; index.html minimal cache
# First, sync everything with a sensible default
ExecOrFail "aws s3 sync `"$artifactPath`" s3://$bucketName --delete --only-show-errors" "S3 sync failed"

# Make sure index.html has short cache
if (Test-Path (Join-Path $artifactPath "index.html")) {
    ExecOrFail "aws s3 cp `"$artifactPath/index.html`" s3://$bucketName/index.html --cache-control 'no-cache, no-store, must-revalidate' --content-type text/html" "Failed to set cache-control for index.html"
}

# 4) Find CloudFront distribution ID and invalidate cache
Write-Host "`nCreating CloudFront invalidation..." -ForegroundColor Cyan

function Get-HostnameFromUrl([string]$url) {
    try {
        if (-not $url) { return $null }
        $u = [Uri]$url
        return $u.Host
    } catch { return $null }
}

$hostFromOutput = Get-HostnameFromUrl $frontendUrl

# Get all distributions and select the one matching either DomainName or Aliases
$cfListRaw = aws cloudfront list-distributions --output json 2>$null
if (-not $cfListRaw) {
    Write-Host "Warning: Could not list CloudFront distributions. Skipping invalidation." -ForegroundColor Yellow
    exit 0
}
$cfList = $cfListRaw | ConvertFrom-Json
$items = @()
if ($cfList.DistributionList -and $cfList.DistributionList.Items) {
    $items = $cfList.DistributionList.Items
}

$distribution = $null
if ($hostFromOutput) {
    $distribution = $items | Where-Object {
        $_.DomainName -eq $hostFromOutput -or ($_.Aliases -and $_.Aliases.Items -and ($_.Aliases.Items -contains $hostFromOutput))
    } | Select-Object -First 1
}

# Fallback: try to match by S3 origin id
if (-not $distribution) {
    $originId = "S3-$bucketName"
    $distribution = $items | Where-Object {
        $_.Origins.Items | Where-Object { $_.Id -eq $originId }
    } | Select-Object -First 1
}

if (-not $distribution) {
    Write-Host "Warning: Could not find matching CloudFront distribution. Skipping invalidation." -ForegroundColor Yellow
    exit 0
}

$distId = $distribution.Id
Write-Host "Using distribution: $distId"

aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --output json
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create CloudFront invalidation." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully." -ForegroundColor Green

# Return to original directory
Pop-Location
