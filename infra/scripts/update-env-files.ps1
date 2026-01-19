param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [string]$ProjectRoot = "$PSScriptRoot\..\.."
)

# Change to the infra directory where terraform state is located
$infraDir = Split-Path -Parent $PSScriptRoot
Push-Location $infraDir

Write-Host ""; Write-Host "=== Update Environment Files: $Environment ===" -ForegroundColor Cyan
Write-Host "Working directory:       $PWD"
Write-Host "Project root:           $ProjectRoot"

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

# 2) Get Terraform outputs
Write-Host "`nGetting Terraform outputs..." -ForegroundColor Cyan

try {
    # Get Terraform outputs as JSON
    $tfOutput = terraform output -json
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Failed to get Terraform outputs. Environment files will not be updated."
        return
    }
    
    $outputs = $tfOutput | ConvertFrom-Json -AsHashtable
    
    # Define the path to the environment file
    $envFile = "$ProjectRoot\listspace-ph\.env"
    
    # Create the directory if it doesn't exist
    $envDir = Split-Path -Path $envFile -Parent
    if (-not (Test-Path $envDir)) {
        New-Item -ItemType Directory -Path $envDir -Force | Out-Null
    }
    
    # Create the environment file content
    $envContent = @"
# $Environment Environment - Generated from Terraform outputs
NEXT_PUBLIC_ENV=$Environment

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=ap-southeast-1
NEXT_PUBLIC_AWS_USER_POOL_ID=$($outputs.cognito_user_pool_id.value)
NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID=$($outputs.cognito_user_pool_client_id.value)
NEXT_PUBLIC_AWS_IDENTITY_POOL_ID=$($outputs.cognito_identity_pool_id.value)

# DynamoDB Configuration
NEXT_PUBLIC_AWS_DYNAMODB_TABLE_PROPERTIES=$($outputs.dynamodb_table_name.value)
NEXT_PUBLIC_AWS_DYNAMODB_TABLE_USERS=$($outputs.dynamodb_table_name.value)-users
NEXT_PUBLIC_AWS_DYNAMODB_TABLE_INVOICES=$($outputs.dynamodb_table_name.value)-invoices

# S3 Configuration
NEXT_PUBLIC_AWS_S3_BUCKET=$($outputs.s3_objects_bucket_name.value)

# API Configuration
NEXT_PUBLIC_API_URL=$($outputs.api_gateway_url.value)
NEXT_PUBLIC_APP_URL=$($outputs.frontend_url.value)
NEXT_PUBLIC_COGNITO_DOMAIN=$($outputs.cognito_user_pool_domain.value).auth.ap-southeast-1.amazoncognito.com
"@

    # Write to environment file
    $envContent | Out-File -FilePath $envFile -Encoding utf8 -Force
    
    Write-Host "Successfully generated .env.$Environment file at: $envFile" -ForegroundColor Green
    
    # Display key values for verification
    Write-Host "`nKey values updated:" -ForegroundColor Cyan
    Write-Host "  API URL: $($outputs.api_gateway_url.value)" -ForegroundColor White
    Write-Host "  Frontend URL: $($outputs.frontend_url.value)" -ForegroundColor White
    Write-Host "  S3 Bucket: $($outputs.s3_bucket_name.value)" -ForegroundColor White
    Write-Host "  Cognito Domain: $($outputs.cognito_user_pool_domain.value).auth.ap-southeast-1.amazoncognito.com" -ForegroundColor White
    
} catch {
    Write-Warning "Error generating environment file: $_"
}

# Return to original directory
Pop-Location

Write-Host "`nEnvironment file update completed." -ForegroundColor Green
