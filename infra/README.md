# ListSpace PH Infrastructure

This directory contains the infrastructure as code for deploying the ListSpace PH application to AWS using Terraform and PowerShell scripts.

## Prerequisites

1. Install [Terraform](https://www.terraform.io/downloads.html) (v1.0+)
2. Install [AWS CLI](https://aws.amazon.com/cli/)
3. [AWS Credentials Setup](#aws-credentials-setup)
4. [PowerShell 7.0+](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell) (Required for the deployment scripts)

## AWS Credentials Setup

Before running any scripts, create AWS access key and secret for the AWS user account. They will be used as parameters in the Powershell Scripts.

## Initial Setup (One-time)

1. Run the initialization script to set up the S3 bucket and DynamoDB table for Terraform state management:
   ```powershell
   .\scripts\init-setup.ps1 -AwsAccessKey "YOUR_AWS_ACCESS_KEY" -AwsSecretKey "YOUR_AWS_SECRET_KEY" -AwsRegion "ap-southeast-1"
   ```

   This will create:
   - An S3 bucket for storing Terraform state
   - A DynamoDB table for state locking
   - Configure the backend.tf file automatically

2. The script will output the names of the created resources. These are automatically configured in the backend.tf file.

## Directory Structure

```
infra/
├── bootstrap/           # Bootstrap configuration for Terraform state
│   └── main.tf          # S3 and DynamoDB setup for state management
├── environments/        # Environment-specific variable files
│   ├── dev.tfvars       # Development environment variables
│   └── prod.tfvars      # Production environment variables
├── modules/             # Reusable Terraform modules
│   ├── api/             # API Gateway and Lambda
│   ├── auth/            # Cognito User Pool
│   ├── database/        # DynamoDB tables
│   ├── frontend/        # S3 and CloudFront
│   └── networking/      # VPC and networking resources
├── scripts/             # Deployment scripts
│   ├── deploy-frontend.ps1  # Frontend deployment script
│   ├── deploy-infra.ps1     # Infrastructure deployment
│   ├── destroy-infra.ps1    # Destroy infrastructure
│   └── init-setup.ps1       # Initial setup script
├── backend.tf           # Terraform backend configuration
├── main.tf              # Main Terraform configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
└── README.md            # This file
```

## Naming Conventions

All resources follow a standardized naming convention:

```
{prefix}-{project_name}-{environment}-{location_short}-{suffix}
```

Where:
- `prefix`: Short code for the resource type (e.g., `rg` for resource group)
- `project_name`: Name of the project (e.g., `listspace-ph`)
- `environment`: Deployment environment (e.g., `dev`, `test`, `prod`)
- `location_short`: Short code for AWS region (e.g., `apse1` for ap-southeast-1)
- `suffix`: Optional additional identifier

### Examples:
- Development VPC: `vnet-listspace-ph-dev-apse1`
- Production S3 Bucket: `s3-listspace-ph-prod-apse1-<guid>`
- Test DynamoDB Table: `listspace-ph-test`

## Environment Configuration

Environment-specific variables are stored in the `environments` directory. Each environment has its own `.tfvars` file.

### Available Environments:

1. **Development (`environments/dev/dev.tfvars`)**
   - For development and testing
   - Uses `dev` prefix for resources
   - Lower security settings
   - Detailed logging enabled

2. **Test (`environments/test/test.tfvars`)**
   - For staging and pre-production testing
   - Mirrors production configuration
   - Similar security settings to production

3. **Production (`environments/prod/prod.tfvars`)**
   - Production environment
   - Highest security settings
   - Minimal logging to reduce costs
   - Backup and monitoring enabled

## Deployment Workflow

### 1. Deploy Infrastructure

To create or update the infrastructure for a specific environment (dev/prod):

```powershell
# For development environment
.\scripts\deploy-infra.ps1 -Environment "dev" -AwsAccessKey "YOUR_AWS_ACCESS_KEY" -AwsSecretKey "YOUR_AWS_SECRET_KEY" 

# For production environment
.\scripts\deploy-infra.ps1 -Environment "prod" -AwsAccessKey "YOUR_AWS_ACCESS_KEY" -AwsSecretKey "YOUR_AWS_SECRET_KEY" 
```

This will:
- Initialize Terraform if needed
- Select the correct workspace
- Plan and apply the infrastructure changes
- Output the deployment results

### 2. Deploy Frontend

After the infrastructure is deployed, deploy the frontend application:

```powershell
# For development environment
.\scripts\deploy-frontend.ps1 -Environment "dev"

# For production environment
.\scripts\deploy-frontend.ps1 -Environment "prod"
```

This will:
- Build the Next.js application
- Sync the build output with the S3 bucket
- Invalidate the CloudFront cache

### 3. Destroying Resources

To completely remove all resources for an environment:

```powershell
# For development environment
.\scripts\destroy-infra.ps1 -Environment "dev" -AwsAccessKey "YOUR_AWS_ACCESS_KEY" -AwsSecretKey "YOUR_AWS_SECRET_KEY" 

# For production environment (requires confirmation)
.\scripts\destroy-infra.ps1 -Environment "prod" -Force -AwsAccessKey "YOUR_AWS_ACCESS_KEY" -AwsSecretKey "YOUR_AWS_SECRET_KEY" 
```

> **Warning:** This action is irreversible and will delete all resources in the specified environment.

## Local Development and Testing

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (v24+)
2. Install [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
3. Clone the repository
4. Install dependencies:
   ```bash
   cd listspace-ph
   npm install
   ```

### Running the Application Locally

1. **Start the development server**:
   ```bash
   npm run dev
   ```
   This will start the Next.js development server at `http://localhost:3000`

2. **Configure environment variables**:
   Create a `.env.local` file in the `listspace-ph` directory with the following variables:
   ```
   NEXT_PUBLIC_AWS_REGION=your_aws_region
   NEXT_PUBLIC_USER_POOL_ID=your_cognito_user_pool_id
   NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID=your_cognito_client_id
   NEXT_PUBLIC_API_ENDPOINT=your_api_gateway_url
   ```

### Common Issues

- **CORS Errors**: Ensure your API Gateway and Cognito are configured to accept requests from `http://localhost:3000`
- **Authentication Issues**: Verify your Cognito configuration and environment variables
- **Missing Dependencies**: Run `npm install` if you encounter module not found errors

