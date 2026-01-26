param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory=$true)]
    [string]$AwsAccessKey,

    [Parameter(Mandatory=$true)]
    [string]$AwsSecretKey,

    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = 'ap-southeast-1',

    [Parameter(Mandatory=$false)]
    [string]$BucketNameOverride
)
# Set environment variables for AWS authentication
$env:AWS_ACCESS_KEY_ID = $AwsAccessKey
$env:AWS_SECRET_ACCESS_KEY = $AwsSecretKey
$env:AWS_DEFAULT_REGION = $AwsRegion

# Initialize Terraform
Write-Host "Initializing Terraform..."
$initOutput = terraform init -reconfigure 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform initialization failed: $initOutput"
    exit 1
}

# Default values
$bucketName = "lynxbox-ph-terraform-state"
$lockTable = "lynxbox-ph-terraform-locks"

# Try to parse backend.tf for custom configuration
try {
    $backendContent = Get-Content -Path "$PSScriptRoot/../backend.tf" -Raw -ErrorAction Stop
    
    # Simple regex to extract bucket and dynamodb_table
    if ($backendContent -match 'bucket\s*=\s*"([^"]+)"') {
        $bucketName = $matches[1]
    }
    
    if ($backendContent -match 'dynamodb_table\s*=\s*"([^"]+)"') {
        $lockTable = $matches[1]
    }
} catch {
    Write-Warning "Could not read or parse backend.tf, using default values"
}

Write-Host "Using S3 Bucket: $bucketName"
Write-Host "Using DynamoDB Lock Table: $lockTable"

# Get the directory where this script is located
$scriptDir = $PSScriptRoot
$infraDir = Split-Path -Parent $scriptDir

# Set paths relative to the infra directory
$envVarsPath = Join-Path $infraDir "environments\$Environment.tfvars"

# Change to the infra directory where terraform files are located
Push-Location $infraDir

# Helper: Resolve S3 bucket name from Terraform (state preferred, then outputs)
function Get-TerraformS3BucketName {
    # Try to get the bucket name from the frontend module
    $bucketName = terraform output -raw frontend_bucket_name 2>$null
    if ($LASTEXITCODE -eq 0 -and $bucketName) {
        return $bucketName.Trim()
    }
    
    # If that fails, try to find it in the state
    $state = terraform state list | Where-Object { $_ -match 'aws_s3_bucket.frontend' }
    if ($state) {
        $stateOutput = terraform state show $state 2>$null
        $bucketLine = $stateOutput | Where-Object { $_ -match 'bucket\s+=' }
        if ($bucketLine) {
            $value = $bucketLine.Split('=')[1].Trim()
            return $value.Trim('"').Trim("'")
        }
    }
    
    Write-Verbose "Could not determine S3 bucket name from Terraform state or outputs"
    return $null
}

Write-Host ""
Write-Host "=== Destroy Configuration ===" -ForegroundColor Cyan
Write-Host "Environment:       $Environment"
Write-Host "AWS Region:        $AwsRegion"
Write-Host "S3 Bucket:        $bucketName"
Write-Host "DynamoDB Lock:    $lockTable"
Write-Host "Environment Vars: $envVarsPath"
Write-Host "Working Directory: $PWD"
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Initialize Terraform with the backend configuration
Write-Host "`nInitializing Terraform..." -ForegroundColor Cyan

# Initialize Terraform
$initOutput = terraform init -reconfigure 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform initialization failed: $initOutput"
    exit 1
}

# Select or create workspace
Write-Host "`nSetting up workspace: $Environment" -ForegroundColor Cyan
$workspaceList = terraform workspace list
if ($workspaceList -match "^[* ] $($Environment)$") {
    Write-Host "Switching to workspace: $Environment"
    terraform workspace select $Environment
} else {
    Write-Error "Workspace '$Environment' does not exist. Cannot destroy non-existent environment."
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to select workspace"
    exit 1
}

# Check for and remove any existing state locks
Write-Host "`nChecking for and removing any existing state locks..." -ForegroundColor Cyan
try {
    # First, check if there's a lock using terraform show
    $showOutput = terraform show -json 2>&1
    
    if ($showOutput -match '"lock_info"\s*:') {
        Write-Host "Found a state lock. Attempting to remove..." -ForegroundColor Yellow
        
        # Get the lock ID from the state
        $lockId = ($showOutput | ConvertFrom-Json -ErrorAction SilentlyContinue).serial
        
        if ($lockId) {
            Write-Host "Removing lock with ID: $lockId"
            $unlockOutput = terraform force-unlock -force $lockId 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully removed state lock." -ForegroundColor Green
            } else {
                Write-Warning "Failed to remove lock. Error: $unlockOutput"
                Write-Host "Attempting to continue with destroy operation..." -ForegroundColor Yellow
            }
        } else {
            Write-Warning "Could not determine lock ID. The lock might be in an inconsistent state."
        }
    } else {
        Write-Host "No active state locks found." -ForegroundColor Green
    }
} catch {
    Write-Warning "Error while checking for state locks: $_"
    Write-Host "Proceeding with destroy operation..." -ForegroundColor Yellow
}

# Run terraform destroy with variables and auto-approve

Write-Host "`n=== DESTROYING INFRASTRUCTURE FOR ENVIRONMENT: $Environment ===" -ForegroundColor Red -BackgroundColor Black
Write-Host "This action cannot be undone!" -ForegroundColor Red
Write-Host "The following resources will be destroyed:"
terraform plan -destroy -var="aws_access_key=$AwsAccessKey" -var="aws_secret_key=$AwsSecretKey" -var="aws_region=$AwsRegion" -var="environment=$Environment" -var-file="$envVarsPath"

$confirmation = Read-Host "`nAre you sure you want to destroy all resources in the '$Environment' environment? (type 'destroy-$Environment' to confirm)"

if ($confirmation -ne "destroy-$Environment") {
    Write-Host "`nDestroy operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nDestroying infrastructure..." -ForegroundColor Red
$destroyCmd = "terraform destroy -auto-approve " +
              "-var='aws_access_key=$AwsAccessKey' " +
              "-var='aws_secret_key=$AwsSecretKey' " +
              "-var='aws_region=$AwsRegion' " +
              "-var='environment=$Environment' " +
              "-var-file='$envVarsPath'"

Write-Host "Running: $destroyCmd"
try {
    Invoke-Expression $destroyCmd
    
    # Delete the workspace after successful destroy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nDeleting workspace '$Environment'..." -ForegroundColor Cyan
        terraform workspace select default
        terraform workspace delete $Environment
    }
} catch {
    Write-Error "Error during destroy: $_"
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform destroy failed with exit code $LASTEXITCODE"
    exit 1
}

# Return to original directory
Pop-Location
