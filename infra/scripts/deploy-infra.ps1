# Lynxbox PH Infrastructure Deployment Script
# This script handles the deployment of Lynxbox PH infrastructure using Terraform

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
    
    # Update environment files after successful deployment
    Write-Host "`nUpdating environment files..." -ForegroundColor Cyan
    & "$PSScriptRoot\update-env-files.ps1" -Environment $Environment
    
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
} finally {
    # Clean up
    if ($planFile -and (Test-Path "$infraRoot/$planFile")) {
        Remove-Item "$infraRoot/$planFile" -Force -ErrorAction SilentlyContinue
    }
}
