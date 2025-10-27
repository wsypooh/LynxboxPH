param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccessKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsSecretKey,
    
    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = 'ap-southeast-1',
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = 'listspace-ph'
)

# Set environment variables
$env:AWS_ACCESS_KEY_ID = $AwsAccessKey
$env:AWS_SECRET_ACCESS_KEY = $AwsSecretKey
$env:AWS_DEFAULT_REGION = $AwsRegion

# Change to bootstrap directory
$bootstrapDir = Join-Path $PSScriptRoot "..\bootstrap"
Push-Location $bootstrapDir

try {
    # Initialize Terraform
    Write-Host "Initializing Terraform..." -ForegroundColor Cyan
    terraform init

    # Apply the bootstrap configuration
    Write-Host "`nSetting up Terraform state storage..." -ForegroundColor Cyan
    terraform apply -auto-approve -var="project_name=$ProjectName" -var="aws_region=$AwsRegion"

    # Get outputs
    $s3Bucket = terraform output -raw s3_bucket_name
    $dynamoTable = terraform output -raw dynamodb_table_name

    Write-Host "`nBootstrap complete!" -ForegroundColor Green
    Write-Host "S3 Bucket for state: $s3Bucket"
    Write-Host "DynamoDB Table for locks: $dynamoTable"
    Write-Host "`nYou can now run deploy-infra.ps1 to deploy the infrastructure." -ForegroundColor Green
}
catch {
    Write-Host "`nError during setup: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Return to original directory
    Pop-Location
}
