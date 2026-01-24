param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [string]$ApiPath = "$PSScriptRoot\..\..\api",

    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "ap-southeast-1",

    [Parameter(Mandatory=$false)]
    [string]$AwsAccessKey,

    [Parameter(Mandatory=$false)]
    [string]$AwsSecretKey,

    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

Write-Host "Starting Lambda deployment for environment: $Environment" -ForegroundColor Green

# Set AWS credentials if provided
if ($AwsAccessKey -and $AwsSecretKey) {
    Write-Host "Setting AWS credentials..." -ForegroundColor Blue
    $env:AWS_ACCESS_KEY_ID = $AwsAccessKey
    $env:AWS_SECRET_ACCESS_KEY = $AwsSecretKey
    $env:AWS_DEFAULT_REGION = $AwsRegion
    $env:AWS_REGION = $AwsRegion
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
} else {
    Write-Host "No AWS credentials provided, using existing credentials" -ForegroundColor Yellow
}

# Change to the infra directory where terraform state is located
$infraDir = Split-Path -Parent $PSScriptRoot
Push-Location $infraDir

# Function to execute commands with error handling
function ExecOrFail {
    $Command = $args[0]
    $ErrorMessage = $args[1]
    Write-Host "`n> $Command" -ForegroundColor DarkGray
    try {
        $result = Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        if ($result) {
            Write-Host $result
        }
        return $result
    } catch {
        Write-Host "ERROR: $ErrorMessage" -ForegroundColor Red
        Write-Host "Command: $Command" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        throw $ErrorMessage
    }
}

# Function to create Lambda execution role if it doesn't exist
function New-LambdaExecutionRole {
    $Environment = $args[0]
    $Region = $args[1]
    $RoleName = "listspace-lambda-role-$Environment"
    
    Write-Host "Creating Lambda execution role: $RoleName" -ForegroundColor Cyan
    
    # Check if role already exists
    try {
        $existingRole = ExecOrFail "aws iam get-role --role-name '$RoleName' --query 'Role.Arn' --output text" "Role check failed" -ErrorAction SilentlyContinue
        if ($existingRole) {
            Write-Host "✓ Lambda execution role already exists: $existingRole" -ForegroundColor Green
            return $existingRole.Trim()
        }
    } catch {
        Write-Host "Role doesn't exist, creating new role..." -ForegroundColor Yellow
    }
    
    # Create trust policy for Lambda
    $trustPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Principal = @{
                    Service = "lambda.amazonaws.com"
                }
                Action = "sts:AssumeRole"
            }
        )
    } | ConvertTo-Json -Depth 3 -Compress
    
    # Create role
    $roleArn = ExecOrFail "aws iam create-role --role-name '$RoleName' --assume-role-policy-document '$trustPolicy' --query 'Role.Arn' --output text --region '$Region'" "Failed to create Lambda execution role"
    Write-Host "✓ Created Lambda execution role: $roleArn" -ForegroundColor Green
    
    # Attach basic execution policy
    ExecOrFail "aws iam attach-role-policy --role-name '$RoleName' --policy-arn 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'" "Failed to attach basic execution role"
    Write-Host "✓ Attached AWSLambdaBasicExecutionRole policy" -ForegroundColor Green
    
    # Attach DynamoDB access policy
    $dynamoDbPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Action = @(
                    "dynamodb:Query",
                    "dynamodb:Scan", 
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem"
                )
                Resource = "*"
            }
        )
    } | ConvertTo-Json -Depth 3 -Compress
    
    ExecOrFail "aws iam put-role-policy --role-name '$RoleName' --policy-name 'DynamoDBAccess' --policy-document '$dynamoDbPolicy'" "Failed to attach DynamoDB policy"
    Write-Host "✓ Attached DynamoDB access policy" -ForegroundColor Green
    
    # Wait for role to be ready
    Write-Host "Waiting for role to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    return $roleArn.Trim()
}

# 1) Get Terraform outputs
Write-Host "`nGetting Terraform outputs..." -ForegroundColor Cyan

$DynamoDbTable = "listspace-ph-$Environment"
try {
    $dynamoDbTable = ExecOrFail "terraform output -raw dynamodb_table_name" "Failed to get DynamoDB table name" -ErrorAction SilentlyContinue
    if ($dynamoDbTable) {
        $DynamoDbTable = $dynamoDbTable.Trim()
        Write-Host "✓ Found DynamoDB table: $DynamoDbTable" -ForegroundColor Green
    } else {
        Write-Host "Using default DynamoDB table: $DynamoDbTable" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Using default DynamoDB table: $DynamoDbTable" -ForegroundColor Yellow
}

$LambdaFunctionName = "listspace-ph-api-$Environment"
try {
    $lambdaName = ExecOrFail "terraform output -raw lambda_function_name" "Failed to get Lambda function name" -ErrorAction SilentlyContinue
    if ($lambdaName) {
        $LambdaFunctionName = $lambdaName.Trim()
        Write-Host "✓ Found Lambda function: $LambdaFunctionName" -ForegroundColor Green
    } else {
        Write-Host "Using default Lambda function: $LambdaFunctionName" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Using default Lambda function: $LambdaFunctionName" -ForegroundColor Yellow
}

$LambdaRoleArn = ""
try {
    $roleArn = ExecOrFail "terraform output -raw lambda_execution_role_arn" "Failed to get Lambda role ARN" -ErrorAction SilentlyContinue
    if ($roleArn) {
        $LambdaRoleArn = $roleArn.Trim()
        Write-Host "✓ Found Lambda role ARN" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Lambda role ARN not found in Terraform outputs" -ForegroundColor Yellow
        Write-Host "Creating Lambda execution role..." -ForegroundColor Cyan
        $LambdaRoleArn = New-LambdaExecutionRole -Environment $Environment -Region $AwsRegion
    }
} catch {
    Write-Host "WARNING: Lambda role ARN not found in Terraform outputs" -ForegroundColor Yellow
    Write-Host "Creating Lambda execution role..." -ForegroundColor Cyan
    $LambdaRoleArn = New-LambdaExecutionRole -Environment $Environment -Region $AwsRegion
}

# 2) Install Sharp for Linux x64 and build TypeScript (if not skipped)
if (-not $SkipBuild) {
    Write-Host "`nInstalling Sharp for Linux x64 and building TypeScript..." -ForegroundColor Cyan
    
    Push-Location $ApiPath
    
    # Install Sharp for Linux x64 target (required for AWS Lambda)
    Write-Host "Installing Sharp for Linux x64 target..." -ForegroundColor Yellow
    ExecOrFail "npm install --cpu=x64 --os=linux --libc=glibc sharp" "Sharp Linux installation failed"
    
    # Clean previous build
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    # Build TypeScript
    ExecOrFail "npm run build" "TypeScript build failed"
    Pop-Location
    Write-Host "✓ Sharp installation and build completed" -ForegroundColor Green
} else {
    Write-Host "Skipping build and Sharp installation" -ForegroundColor Yellow
}

# 3) Verify handler.js exists and create index.js
$handlerPath = "$ApiPath\dist\handlers\properties\handler.js"
$indexPath = "$ApiPath\dist\index.js"

if (-not (Test-Path $handlerPath)) {
    Write-Host "ERROR: handler.js not found at $handlerPath" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✓ Found handler.js at $handlerPath" -ForegroundColor Green
}

# Create index.js that exports the handler
$indexContent = @"
const { handler } = require('./handlers/properties/handler');

module.exports = { handler };
"@

$indexContent | Out-File -FilePath $indexPath -Encoding utf8 -Force
Write-Host "✓ Created index.js at $indexPath" -ForegroundColor Green

# 4) Create deployment package
Write-Host "`nCreating deployment package..." -ForegroundColor Cyan
$zipPath = "lambda-$Environment.zip"

# Remove existing zip file
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

# Create zip with dist and node_modules using 7-Zip (much faster)
Write-Host "Compressing deployment package with 7-Zip..." -ForegroundColor Yellow

# Check if 7-Zip is available
$sevenZip = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $sevenZip)) {
    $sevenZip = "C:\Program Files (x86)\7-Zip\7z.exe"
}

if (-not (Test-Path $sevenZip)) {
    Write-Host "ERROR: 7-Zip not found. Please install 7-Zip or use the default compression." -ForegroundColor Red
    exit 1
}

# Create deployment package using 7-Zip
$deployDir = "temp-deploy-$Environment"
if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy ALL files for maximum compatibility
Write-Host "Copying all files for comprehensive deployment..." -ForegroundColor Yellow
Copy-Item -Path "$ApiPath\dist\*" -Destination "$deployDir\" -Recurse -Force
Copy-Item -Path "$ApiPath\package.json" -Destination "$deployDir\" -Force
Copy-Item -Path "$ApiPath\package-lock.json" -Destination "$deployDir\" -Force
Copy-Item -Path "$ApiPath\node_modules" -Destination "$deployDir\" -Recurse -Force
Copy-Item -Path "$ApiPath\src\config" -Destination "$deployDir\" -Recurse -Force

# Also copy any additional config files that might be needed
$configFiles = @(".env", ".env.example", "tsconfig.json")
foreach ($configFile in $configFiles) {
    $configPath = "$ApiPath\$configFile"
    if (Test-Path $configPath) {
        Copy-Item -Path $configPath -Destination "$deployDir\" -Force
        Write-Host "✓ Copied config file: $configFile" -ForegroundColor Gray
    }
}

# Use 7-Zip to create the package (much faster than Compress-Archive)
Write-Host "Creating deployment package with 7-Zip..." -ForegroundColor Yellow
Push-Location $deployDir
$sevenZipArgs = @(
    "a", "-tzip", "-mx=5", "..\$zipPath", "*"
)
& $sevenZip $sevenZipArgs
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: 7-Zip compression failed" -ForegroundColor Red
    exit 1
}

# Clean up temp directory
Remove-Item -Recurse -Force $deployDir

Write-Host "✓ Created deployment package with 7-Zip" -ForegroundColor Green

if (Test-Path $zipPath) {
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "✓ Created deployment package: $zipPath ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create deployment package" -ForegroundColor Red
    exit 1
}

# 5) Deploy Lambda function
Write-Host "`nDeploying Lambda function..." -ForegroundColor Cyan

# Check if Lambda function exists
$functionExists = $false
try {
    ExecOrFail "aws lambda get-function --function-name '$LambdaFunctionName' --region '$AwsRegion'" "Lambda function check failed" -ErrorAction SilentlyContinue
    $functionExists = $true
    Write-Host "✓ Lambda function exists: $LambdaFunctionName" -ForegroundColor Green
} catch {
    Write-Host "Lambda function does not exist, creating new function..." -ForegroundColor Yellow
    $functionExists = $false
}

if ($functionExists) {
    # Update existing function
    ExecOrFail "aws lambda update-function-code --function-name '$LambdaFunctionName' --zip-file 'fileb://$zipPath' --region '$AwsRegion'" "Failed to update Lambda function"
    
    # Handler update removed - Lambda is working with current configuration
    
    Write-Host "✓ Updated Lambda function code" -ForegroundColor Green
} else {
    # Create new function
    $createCommand = @"
aws lambda create-function `
    --function-name '$LambdaFunctionName' `
    --runtime nodejs18.x `
    --role '$LambdaRoleArn' `
    --handler 'index.handler' `
    --zip-file 'fileb://$zipPath' `
    --region '$AwsRegion' `
    --environment Variables='{DYNAMODB_TABLE=$DynamoDbTable,S3_BUCKET_NAME=listspace-ph-objects-dev-ap-southeast-1,AWS_REGION=$AwsRegion,WATERMARK_ENABLED=true,WATERMARK_POSITION=bottom-right,WATERMARK_OPACITY=0.9,WATERMARK_SCALE=200,WATERMARK_MARGIN=20}' `
    --memory-size 1024 `
    --timeout 300
"@
    
    ExecOrFail $createCommand "Failed to create Lambda function"
    Write-Host "✓ Created Lambda function: $LambdaFunctionName" -ForegroundColor Green
}

# 6) Clean up
Write-Host "`nCleaning up..." -ForegroundColor Cyan
# Commented out to allow verification of zip file
# Remove-Item $zipPath
Write-Host "✓ Kept deployment package for verification: $zipPath" -ForegroundColor Green

# Return to original directory
Pop-Location
Pop-Location

Write-Host "`nLambda deployment complete!" -ForegroundColor Green
Write-Host "Function name: $LambdaFunctionName" -ForegroundColor Cyan
Write-Host "Region: $AwsRegion" -ForegroundColor Cyan