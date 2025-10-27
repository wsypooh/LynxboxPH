# ListSpace PH Infrastructure Deployment Script
# This script handles the deployment of ListSpace PH infrastructure using Terraform

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsAccessKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsSecretKey,
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoApprove = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$TerraformVarsFile = "../environments/$Environment.tfvars"
)

# Set error action preference
$ErrorActionPreference = 'Stop'

# Set working directory to the infrastructure root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraRoot = Resolve-Path "$scriptPath/.."
Set-Location $infraRoot

# Resolve the variables file path
$TerraformVarsFile = Resolve-Path -Path "$infraRoot/environments/$Environment.tfvars" -ErrorAction Stop

# Set AWS credentials as environment variables
$env:AWS_ACCESS_KEY_ID = $AwsAccessKey
$env:AWS_SECRET_ACCESS_KEY = $AwsSecretKey
$env:AWS_DEFAULT_REGION = "ap-southeast-1"  # Default to Singapore region

# Check if Terraform is installed
function Test-TerraformInstalled {
    try {
        $tfVersion = terraform --version
        Write-Host "Terraform version: $($tfVersion[0])" -ForegroundColor Green
        return $true
    } catch {
        Write-Error "Terraform not found. Please install Terraform and ensure it's in your PATH."
        return $false
    }
}

# Initialize Terraform
function Initialize-Terraform {
    Write-Host "Initializing Terraform..."
    $initOutput = terraform init -reconfigure 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform initialization failed: $initOutput"
        exit 1
    }
}

# Select or create workspace
function Select-Workspace {
    Write-Host "`nSetting up workspace: $Environment" -ForegroundColor Cyan
    $workspaceList = terraform workspace list
    if ($workspaceList -match "^[* ] $($Environment)$") {
        Write-Host "Switching to existing workspace: $Environment"
        terraform workspace select $Environment
    } else {
        Write-Host "Creating new workspace: $Environment"
        terraform workspace new $Environment
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to set up workspace"
        exit 1
    }
}

# Function to generate .env.local file with Terraform outputs
function Generate-EnvFile {
    param (
        [string]$Environment,
        [string]$ProjectRoot = "$PSScriptRoot\..\.."
    )
    
    Write-Host "`nGenerating .env.local file..." -ForegroundColor Cyan
    
    try {
        # Get Terraform outputs as JSON
        $tfOutput = terraform output -json
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to get Terraform outputs. .env.local file will not be generated."
            return
        }
        
        $outputs = $tfOutput | ConvertFrom-Json -AsHashtable
        
        # Define the path to the .env.local file
        $envFile = "$ProjectRoot\listspace-ph\.env.local"
        
        # Create the directory if it doesn't exist
        $envDir = Split-Path -Path $envFile -Parent
        if (-not (Test-Path $envDir)) {
            New-Item -ItemType Directory -Path $envDir -Force | Out-Null
        }
        
        # Create the .env.local content
        $envContent = @"
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
NEXT_PUBLIC_AWS_S3_BUCKET=$($outputs.s3_bucket_name.value)

# API Configuration
NEXT_PUBLIC_API_URL=$($outputs.api_gateway_url.value)
NEXT_PUBLIC_APP_URL=$($outputs.frontend_url.value)
NEXT_PUBLIC_COGNITO_DOMAIN=$($outputs.cognito_user_pool_domain.value).auth.ap-southeast-1.amazoncognito.com

# Environment
NEXT_PUBLIC_ENV=$Environment
"@

        # Write to .env.local
        $envContent | Out-File -FilePath $envFile -Encoding utf8 -Force
        
        Write-Host "Successfully generated .env.local file at: $envFile" -ForegroundColor Green
        
    } catch {
        Write-Warning "Error generating .env.local file: $_"
    }
}

# Main execution
try {
    # Check requirements
    if (-not (Test-TerraformInstalled)) { exit 1 }
    
    # Initialize Terraform
    Initialize-Terraform
    
    # Initialize workspace
    Write-Host "Setting up workspace: $Environment" -ForegroundColor Cyan
    terraform workspace select $Environment 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Creating new workspace: $Environment" -ForegroundColor Cyan
        terraform workspace new $Environment
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create workspace"
        }
    }
    
    # Run plan and apply
    $planFile = "$Environment.tfplan"
    
    # First run plan with all variables
    Write-Host "Running Terraform plan..." -ForegroundColor Cyan
    Write-Host "Using variables file: $TerraformVarsFile" -ForegroundColor Cyan
    
    # Create plan
    $planArgs = @(
        "plan"
        "-var=aws_access_key=$AwsAccessKey"
        "-var=aws_secret_key=$AwsSecretKey"
        "-var-file=$TerraformVarsFile"
        "-out=$planFile"
    )
    
    & terraform $planArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform plan failed"
    }
    
    # Now apply the plan without variables
    if ($AutoApprove) {
        $applyArgs = @(
            "apply"
            "-auto-approve"
            $planFile
        )
        & terraform $applyArgs
    } else {
        $confirmation = Read-Host "Do you want to apply these changes? (y/n)"
        if ($confirmation -eq 'y') {
            & terraform apply $planFile
        } else {
            Write-Host "Changes not applied." -ForegroundColor Yellow
            exit 0
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform apply failed"
    }
    
    # Output any important information
    Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
    
    # Generate .env.local file after successful deployment
    Generate-EnvFile -Environment $Environment
    
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
} finally {
    # Clean up
    if ($planFile -and (Test-Path "$infraRoot/$planFile")) {
        Remove-Item "$infraRoot/$planFile" -Force -ErrorAction SilentlyContinue
    }
}
