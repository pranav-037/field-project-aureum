# Deployment Runbook
## Aureum: Artchain Provenance Trail

### 1. Overview
This document provides step-by-step procedures for deploying the Aureum platform to various environments (development, staging, production). It covers infrastructure provisioning, smart contract deployment, backend services, frontend deployment, database migrations, and post-deployment verification.

### 2. Prerequisites
Before beginning deployment, ensure the following are available:

#### 2.1 Accounts & Access
- **Polygon Network Access**: 
  - Mumbai testnet RPC endpoint (for staging/dev)
  - Polygon Mainnet RPC endpoint (for production)
  - Deployer wallet with sufficient MATIC for gas
- **Cloud Provider Accounts** (AWS/GCP/Azure or equivalent):
  - Permissions to create: VPC, subnets, security groups, EC2/ECS/EKS/RDS, S3-compatible storage, IAM roles
- **Third-party Services**:
  - Pinata API key & secret (IPFS pinning)
  - Email service (SendGrid, SES, or similar)
  - Monitoring (Datadog, New Relic, or Prometheus/Grafana)
  - Logging (ELK stack or CloudWatch)
  - Sentry account for error tracking
- **Development Tools**:
  - Node.js >=18.x
  - npm or yarn
  - Docker & Docker Compose
  - Hardhat (for smart contract deployment)
  - Prisma CLI
  - Git

#### 2.2 Environment Variables
Prepare `.env` files for each service with the following variables (examples shown):

**Backend (.env.backend)**:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/aureum?schema=public
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
SIWE_NONCE_TEMPLATE="aureum.app wants you to sign in with your Ethereum account:"
NETWORK=matic  # or maticmum for Mumbai
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_key
CONTRACT_ADDRESS=0xYourDeployedContract
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
EMAIL_FROM=noreply@aureum.art
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
SENTRY_DSN=https://xxx@sentry.io/yyy
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env.frontend)**:
```
VITE_APP_NAME=Aureum
VITE_API_URL=https://api.aureum.art
VITE_CONTRACT_ADDRESS=0xYourDeployedContract
VITE_NETWORK=matic
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy
```

**Infrastructure (Terraform vars or equivalent)**:
```
aws_region=us-east-1
vpc_cidr=10.0.0.0/16
db_subnet_cidrs=["10.0.1.0/24","10.0.2.0/24"]
ecs_subnet_cidrs=["10.0.3.0/24","10.0.4.0/24"]
```

### 3. Deployment Environments
Aureum uses three primary environments:

| Environment | Purpose | Network | Data | Access |
|-------------|---------|---------|------|--------|
| **Development** | Local development, feature branches | Mumbai (testnet) | Local PostgreSQL/Docker | Internal team only |
| **Staging** | Integration testing, QA, pre-release validation | Mumbai (testnet) | Isolated staging database | Internal + invited testers |
| **Production** | Live user environment | Polygon Mainnet | Production database | Public (with auth) |

### 4. Infrastructure Provisioning
We use Infrastructure as Code (Terraform) for reproducible environments.

#### 4.1 Network & Security
1. Create VPC with public and private subnets
2. Set up security groups:
   - **ALB SG**: Allow 443 from 0.0.0.0/0
   - **ECS/Fargate SG**: Allow 3000 from ALB SG
   - **RDS SG**: Allow 5432 from ECS/Fargate SG
   - ** Bastion SG** (optional): Allow 22 from corporate IP
3. Configure NAT gateways for private subnet outbound internet
4. Set up VPC endpoints for S3 (if using self-hosted IPFS pinning) and CloudWatch Logs

#### 4.2 Compute & Storage
1. **Database**:
   - Create RDS PostgreSQL instance (db.t3.medium for staging, db.t3.large for prod)
   - Enable automated backups and point-in-time recovery
   - Enable encryption at rest
   - Set maintenance window (e.g., Sun 03:00-04:00 UTC)
   - Create database and user via Terraform or manual setup
2. **Application Hosting**:
   - Option A: AWS ECS Fargate (recommended)
     - Create ECS cluster
     - Define task definitions for backend and frontend (separate services)
     - Configure service discovery via Cloud Map or ALB
   - Option B: EKS (if team prefers Kubernetes)
     - Create EKS cluster
     - Deploy using Helm charts
   - Option C: Traditional EC2 with Auto Scaling Group (legacy)
3. **Load Balancing & CDN**:
   - Create Application Load Balancer (ALB) with HTTPS listener
   - Configure target groups for backend (port 3000) and frontend (port 80/443 via Nginx)
   - Set up AWS Certificate Manager certificate for *.aureum.art
   - Configure CloudFront CDN for frontend static assets (optional but recommended)
4. **Additional Services**:
   - ElastiCache Redis (for rate limiting, session store if needed)
   - SQS queues for asynchronous tasks (email, report generation)
   - S3 bucket for build artifacts and deployment packages
   - CloudWatch Logs groups for backend, frontend, and system logs
   - Optional: Self-hosted IPFS cluster (if not using Pinata exclusively)

#### 4.3 DNS & Domain
1. Register domain aureum.art (if not already)
2. Create hosted zone in Route53 (or equivalent)
3. Create records:
   - `api.aureum.art` → ALB (A alias)
   - `www.aureum.art` → CloudFront or S3 static site (CNAME)
   - `aureum.art` → CloudFront or S3 static site (A alias or CNAME)
   - Optional: `docs.aureum.art`, `blog.aureum.art`

### 5. Smart Contract Deployment
Aureum's core contracts are deployed via Hardhat with verified source on Polygonscan.

#### 5.1 Preparation
1. Ensure `.env` contains `POLYGON_RPC_URL` and deployer private key (`DEPLOYER_PRIVATE_KEY`)
2. Verify compiler version matches contract (`solidity: ^0.8.19`)
3. Run `npm install` in the `contracts/` directory
4. Compile contracts: `npx hardhat compile`
5. Run tests: `npx hardhat test` (should pass)

#### 5.2 Deployment Scripts
We maintain separate scripts for each network:
- `scripts/deploy-mumbai.ts` (for testnet)
- `scripts/deploy-matic.ts` (for mainnet)

#### 5.3 Deployment Steps
1. **Select Network**:
   ```bash
   # For Mumbai testnet
   npx hardhat run scripts/deploy-mumbai.ts --network maticmum
   
   # For Polygon mainnet
   npx hardhat run scripts/deploy-matic.ts --network matic
   ```
2. **Verify Deployment**:
   - Script outputs contract address
   - Save this address to `.env` files for backend and frontend
3. **Contract Verification** (on Polygonscan):
   ```bash
   npx hardhat verify --network maticmum DEPLOYED_CONTRACT_ADDRESS "ConstructorArg1" "ConstructorArg2"
   ```
   - Repeat for mainnet
4. **Access Control Setup**:
   - After deployment, initialize authenticator role:
     ```bash
     npx hardhat console --network maticmum
     > const contract = await ethers.getContractAt("ArtchainRegistry", "DEPLOYED_ADDRESS")
     > const adminRole = await contract.DEFAULT_ADMIN_ROLE()
     > await contract.grantRole(adminRole, "DEPLOYER_ADDRESS")
     ```
   - Add initial institution authenticators via multisig governance (see Admin Console)
5. **Post-Deployment Checks**:
   - Verify contract bytecode matches compiled version
   - Test basic functions via Hardhat console or scripts:
     - Create a test Genesis record
     - Verify transfer events
     - Check access controls

#### 5.4 Upgrade Strategy
Current contracts are immutable. For future upgrades:
1. Deploy new implementation contract
2. Use proxy pattern (if adopted later) or migration script
3. Update frontend/backend contract address
4. Notify users via announcements
5. Maintain old contract address for historical reference

### 6. Backend Deployment
The backend is a Node.js/Express service with TypeScript.

#### 6.1 Build Process
1. Clone repository to deployment server or use CI artifact
2. Install dependencies:
   ```bash
   cd backend
   npm ci  # or yarn install --frozen-lockfile
   ```
3. Build TypeScript:
   ```bash
   npm run build  # compiles to dist/
   ```
4. Prisma migration generation:
   ```bash
   npx prisma migrate deploy
   ```
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

#### 6.2 Configuration
1. Copy `.env.example` to `.env` and populate with environment-specific values
2. Verify database connection:
   ```bash
   npx prisma db pull  # should match schema
   npx prisma studio   # optional UI check
   ```
3. Confirm third-party service credentials (Pinata, email, Sentry)

#### 6.3 Deployment Methods
**Option A: Docker (Recommended)**
1. Build image:
   ```bash
   docker build -t aureum-backend:$(git rev-parse --short HEAD) .
   ```
2. Push to container registry (ECR, GCR, etc.)
3. Update task definition with new image tag
4. Deploy service:
   ```bash
   # AWS ECS example
   aws ecs update-service --cluster aureum-cluster --service aureum-backend --force-new-deployment
   ```

**Option B: Direct Server/VM**
1. Pull latest code
2. Follow build process above
3. Start service with PM2 or systemd:
   ```bash
   pm2 start dist/main.js --name aureum-backend
   # or
   systemctl start aureum-backend
   ```

**Option C: Serverless (AWS Lambda via Serverless Framework)**
1. Configure `serverless.yml` for HTTP API
2. Deploy:
   ```bash
   serverless deploy
   ```

#### 6.4 Health Checks
Backend exposes `/health` endpoint:
```bash
curl -s https://api.aureum.art/health
# Expected: {"status":"ok","timestamp":"2026-10-08T12:00:00Z","version":"1.0.0"}
```

#### 6.5 Scaling
- **Horizontal**: Increase ECS service desired count or ASG size
- **Auto Scaling**: Configure based on CPU (>70%) or request count
- **Database**: Consider read replicas for heavy verification traffic
- **Cache**: Ensure Redis is sized for rate limiting workload

### 7. Frontend Deployment
The frontend is a React 18 application built with Vite.

#### 7.1 Build Process
1. Install dependencies:
   ```bash
   cd frontend
   npm ci
   ```
2. Build for production:
   ```bash
   npm run build  # outputs to dist/
   ```
3. Verify build:
   ```bash
   npx serve -s dist  # test locally
   ```

#### 7.2 Deployment Methods
**Option A: Static Site Hosting (Recommended)**
1. Upload `dist/` contents to S3 bucket configured for static website hosting
2. Set bucket policy for public read
3. Invalidate CloudFront cache (if used):
   ```bash
   aws cloudfront create-invalidation --distribution-id EXAMPLE --paths "/*"
   ```

**Option B: Traditional Web Server**
1. Copy `dist/` contents to web root (/var/www/html, etc.)
2. Configure Nginx/Apache for SPA fallback:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

**Option C: CDN Direct**
1. Some CI/CD pipelines can deploy directly to CloudFront/Azure CDN

#### 7.3 Environment Specific Builds
Frontend builds are environment-agnostic; configuration comes from runtime `.env` variables loaded via Vite:
- For Dockerized frontend: bake in build-time args or use runtime config service
- For S3/CloudFront: use Lambda@Edge or CloudFront Functions to inject config based on hostname/path

#### 7.4 Cache Busting
Vite automatically hashes filenames; ensure CDN/cache respects these.

#### 7.5 Post-Deploy Verification
1. Load homepage: `https://aureum.art`
2. Check network tab for correct API calls to `https://api.aureum.art`
3. Verify wallet connection works
4. Test artwork verification with known testnet address

### 8. Database Migrations
We use Prisma Migrate for schema changes.

#### 8.1 Migration Workflow
1. **Development**: 
   ```bash
   npx prisma migrate dev --name add_new_field
   ```
   - Creates migration file and applies to local dev db
2. **Review**: 
   - Check generated SQL in `prisma/migrations/xxxx_add_new_field/migration.sql`
3. **Staging/Production**: 
   ```bash
   npx prisma migrate deploy
   ```
   - Applies all pending migrations

#### 8.2 Safety Procedures
1. **Backup**: Before any migration, take database snapshot:
   ```bash
   aws rds create-db-snapshot --db-instance-identifier aureum-prod --db-snapshot-identifier pre-mig-$(date +%Y%m%d%H%M%S)
   ```
2. **Test**: Apply migration to staging copy of production data
3. **Validate**: Run automated test suite against migrated staging
4. **Monitor**: Watch error logs and performance metrics during/after migration
5. **Rollback Plan**:
   - Prisma migrate does not support down migrations by default
   - Rollback via restoring from pre-migration snapshot
   - For data-preserving changes, create manual rollback scripts

#### 8.3 Data Migration (when needed)
For complex data transformations:
1. Write migration script in TypeScript/Node.js
2. Run via `ts-node scripts/migrate-data.ts`
3. Verify with data samples
4. Log execution for audit trail

### 9. CI/CD Pipeline
We use GitHub Actions for automated testing and deployment.

#### 9.1 Workflow Overview
```
Workflow: build-test-deploy.yml
Triggers: push to main, pull_request
Jobs:
  1. test
     - Install dependencies
     - Run lint, unit, integration tests
     - Upload coverage
  2. build-backend
     - Build Docker image
     - Push to ECR with git SHA tag
  3. build-frontend
     - Build static assets
     - Upload as artifact
  4. deploy-staging (on main push)
     - Deploy backend ECS service
     - Deploy frontend to staging S3/CloudFront
     - Run db migrations
     - Run smoke tests
  5. deploy-production (manual workflow_dispatch)
     - Similar to staging but to prod environment
     - Requires approval from tech lead
```

#### 9.2 Deployment Triggers
- **Staging**: Auto-deploy on merge to main branch
- **Production**: Manual trigger with required approvals
- **Hotfix**: Branch-based deployment to specific environment

#### 9.3 Rollback Procedures
1. **Frontend**: Redeploy previous known-good S3 version or invalidate CDN and rely on browser cache fallback
2. **Backend**: 
   - ECS: Update service to previous task definition
   - EC2/VM: Use previous AMI or redeploy previous version
3. **DB**: Restore from pre-deployment snapshot (if needed)
4. **Contracts**: Generally not rolled back; if critical bug, deploy new contract and migrate

### 10. Post-Deployment Verification
After deployment, run verification checklists.

#### 10.1 Smoke Tests (Automated)
Execute via `npm run test:smoke` or similar:
1. API Health Check
2. Database Connection
3. Contract Read Access (name, symbol)
4. IPFS Pin Test (small file)
5. Email Send Test (to sandbox address)
6. Auth Flow (JWT login, SIWE signature verification)
7. Basic Genesis Record Creation (testnet only)
8. Transfer Simulation (testnet only)

#### 10.2 Manual Verification Checklist
**Frontend**:
- [ ] Homepage loads within 2s
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Network shows correct (Polygon/Mumbai)
- [ ] Artwork verification returns expected results
- [ ] Transfer initiation UI functional
- [ ] Report generation produces downloadable PDF/JSON
- [ ] Responsive breakpoints work (mobile, tablet, desktop)

**Backend**:
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints respond with correct schemas
- [ ] Rate limiting active (test with >100 req/15min)
- [ ] Webhooks fire correctly (if applicable)
- [ ] Logs show no errors at startup
- [ ] Sentry captures test exceptions

**Infrastructure**:
- [ ] SSL certificates valid and not expired
- [ ] Security groups only allow required ports
- [ ] DB backups running and verified
- [ ] CloudWatch alarms configured (CPU, memory, error rates)
- [ ] Log retention set (30 days for app, 90 days for audit)
- [ ] VPC flow logs enabled (for security)

**Contracts** (testnet/mainnet as appropriate):
- [ ] Contract address matches deployment transaction
- [ ] Verified on Polygonscan with correct source
- [ ] Access control roles assigned correctly
- [ ] Pausable functions work (if implemented)
- [ ] Upgradeability not affected (if using proxy)

#### 10.3 Performance Baseline
Record baseline metrics for future comparison:
- API response time (95th percentile) for `/artwork/:id`
- Page load time (Fully Loaded) on homepage
- Database query latency for common lookups
- Blockchain read/write confirmation times

### 11. Monitoring & Alerting
Set up observability before declaring deployment complete.

#### 11.1 Metrics to Collect
**Application-Level**:
- HTTP request latency (by endpoint, method, status)
- Request throughput (RPM)
- Error rates (5xx, 4xx)
- Business metrics: Genesis records/day, transfers/day, active users
- Database connection pool usage
- External service latency (IPFS, email, RPC)

**Infrastructure-Level**:
- CPU/Memory utilization (ECS tasks, RDS)
- Network throughput
- Disk I/O and storage utilization
- Load balancer request counts and error rates
- Container restart rates

**Blockchain-Level**:
- RPC node health and latency
- Contract interaction success rate
- Gas price trends
- Mempool pending transactions (if submitting txs)

#### 11.2 Logging Strategy
- **Application Logs**: Structured JSON to CloudWatch Logs or ELK
  - Levels: error, warn, info, debug
  - Include request ID for tracing
- **Access Logs**: Standard combined format from ALB/Nginx
- **Audit Logs**: Immutable append-only store (consider AWS QLDB or append-only DynamoDB table)
- **Database Logs**: Enable general log for troubleshooting (disabled in prod for performance)

#### 11.3 Alerting Rules
Set up in monitoring system (Datadog, Prometheus Alertmanager, CloudWatch Alarms):

**Critical (Page Immediately)**:
- API error rate >5% for 5min
- Health endpoint failing for 2min
- Database CPU >90% for 10min
- Memory utilization >95% on ECS tasks
- Failed deployment health checks

**Warning (Ticket within 1hr)**:
- API latency p95 >2s for 15min
- CPU >80% for 30min
- Disk usage >85%
- Restart rate >5/min
- Sentry error spike (>10 new errors/min)

**Info (Daily Digest)**:
- Daily active users
- New Genesis records
- New transfers
- Gas cost average
- Logins by auth type

#### 11.4 Dashboards
Create dashboards showing:
- System overview (health, traffic, errors)
- User activity (registrations, transfers, verifications)
- Performance (latency, throughput)
- Business metrics (growth, engagement)
- Infrastructure (resource utilization)

### 12. Rollback & Disaster Recovery
Prepare for worst-case scenarios.

#### 12.1 Rollback Triggers
- Critical bugs causing data corruption or loss
- Security breach requiring immediate containment
- Severe performance degradation impacting usability
- Failed migration causing downtime

#### 12.2 Rollback Procedures
**Frontend**:
1. Identify previous known-good deployment (by timestamp or git tag)
2. Redeploy that version to S3/CloudFront
3. Invalidate CDN cache if necessary
4. Verify functionality

**Backend**:
1. Identify previous stable image tag
2. Update ECS service/task definition to use previous image
3. Force new deployment
4. Verify health and functionality
5. If database schema changed, evaluate if rollback safe:
   - If additive only: safe to rollback code
   - If destructive: may require data restore

**Database**:
1. If migration caused issues and rollback involves schema change:
   - Restore from latest pre-migration snapshot
   - Point-in-time recovery if within window
   - Export/import specific tables if partial loss
2. If data corruption but schema OK:
   - Restore specific tables from point-in-time recovery
   - Apply manual corrective scripts

**Infrastructure**:
1. Use Terraform taint and reapply for specific resources
2. For complete environment loss, reapply full Terraform state
3. Maintain separate state files per environment

#### 12.3 Disaster Recovery Plan
**RPO (Recovery Point Objective)**: 1 hour
**RTO (Recovery Time Objective)**: 4 hours

**Procedures**:
1. **Daily Snapshots**: Automated RDS snapshots retained 30 days
2. **Cross-Region Replication**: 
   - Optionally replicate RDS snapshot to secondary region
   - Store Terraform state in remote backend with versioning
3. **Runbooks**: 
   - Document step-by-step recovery for:
     - Regional outage (failover to secondary region)
     - Account compromise (key rotation, access revocation)
     - Total service loss (full rebuild from backups)
4. **Testing**: 
   - Annual DR test simulating regional failure
   - Quarterly backup restore verification
5. **Communication Plan**:
   - Status page (status.aureum.art)
   - Pre-drafted user notifications
   - Escalation tree (DevOps -> Tech Lead -> CTO -> Legal/PR)

### 13. Maintenance Windows & Update Procedures
Regular maintenance ensures security and stability.

#### 13.1 Scheduled Maintenance
- **Weekly**: 
  - Dependency vulnerability scans (npm audit, snyk)
  - Log rotation verification
- **Monthly**:
  - OS patches on EC2/ECS-optimized AMIs
  - Database minor version upgrades (during maintenance window)
  - Load balancer SSL certificate renewal (if not using ACM auto-renew)
- **Quarterly**:
  - Penetration test and security review
  - Chaos engineering experiments (latency injection, instance termination)
  - Architecture review and tech debt assessment

#### 13.2 Update Procedures
**Security Patches**:
1. Monitor CVE databases for dependencies
2. Apply patch in dev branch
3. Run full test suite
4. Deploy to staging for 24hr soak test
5. Deploy to production during maintenance window
6. Monitor post-deploy for 4hr

**Feature Updates**:
1. Follow Git flow: feature -> develop -> main
2. Use feature flags for risky changes
3. Deploy to staging with canary (10% traffic)
4. Monitor metrics and error rates
5. Gradually increase to 100%
6. Remove feature flag after stabilization

#### 13.3 Database Maintenance
- **Vacuum/Analyze**: Enable autovacuum, monitor bloat
- **Index Maintenance**: 
  - Quarterly: REINDEX heavily written indexes
  - Monitor pg_stat_user_indexes for idx_scan = 0
- **Connection Limits**: 
  - Set max_connections appropriately for instance size
  - Use PgBouncer for connection pooling if needed
- **Extensions**: 
  - Keep PostGIS, pgcrypto, etc. updated
  - Test extensions on staging before prod

### 14. Versioning & Release Strategy
Clear versioning helps track changes and manage expectations.

#### 14.1 Semantic Versioning
Use `MAJOR.MINOR.PATCH`:
- **MAJOR**: Incompatible API changes, breaking contract updates
- **MINOR**: Backwards-compatible functionality
- **PATCH**: Backwards-compatible bug fixes

#### 14.2 Release Channels
- **dev**: Latest commit from develop branch (unstable)
- **staging**: Latest release tag from main (release candidate)
- **prod**: Latest stable release tag

#### 14.3 Release Notes Template
```
# Aureum vX.Y.Z Release Notes

## 🚀 New Features
- Feature 1: Description and user impact
- Feature 2: Description and user impact

## 🐛 Bug Fixes
- Fix 1: Issue description
- Fix 2: Issue description

## 🔧 Improvements
- Improvement 1: Performance, UX, or DX enhancement
- Improvement 2: Performance, UX, or DX enhancement

## 📝 Breaking Changes
- Only if MAJOR version increment
- Description and migration steps

## 🔒 Security
- Security patches applied
- Any CVEs addressed

## 📦 Deployment Notes
- Any special deployment instructions
- Database migrations required
- Contract address changes

## 🙏 Acknowledgments
- Contributors, testers, audit participants

## 🐳 Docker Images
- backend: aureum-backend:vX.Y.Z
- frontend: aureum-frontend:vX.Y.Z

## 🔗 Links
- Changelog: link
- Migration guide: link (if applicable)
- Known issues: link (if any)
```

### 15. Appendix

#### 15.1 Useful Commands
**Check Deployment Status**:
```bash
# ECS services
aws ecs describe-services --cluster aureum-cluster --services aureum-backend aureum-frontend

# RDS status
aws rds describe-db-instances --db-instance-identifier aureum-prod

# CloudFront invalidation
aws cloudfront get-invalidation --distribution-id EXAMPLE --id EXAMPLE
```

**View Logs**:
```bash
# CloudWatch Logs (backend)
aws logs tail /ecs/aureum-backend --follow --since 1h

# CloudWatch Logs (frontend access)
aws logs tail /aws/elasticloadbalancing/access_logs --follow --since 1h
```

**Database Access** (via bastion or direct if allowed):
```bash
psql "host=aureum-prod.xxxxxx.us-east-1.rds.amazonaws.com port=5432 dbname=aureum user=auruser password=yourpassword"
```

**Contract Interaction**:
```bash
npx hardhat console --network maticmum
> const contract = await ethers.getContractAt("ArtchainRegistry", "0xYourAddress")
> await contract.totalSupply()
```

#### 15.2 Emergency Contacts
| Role | Name | Email | Phone |
|------|------|-------|-------|
| DevOps Lead | [Name] | devops@aureum.art | +1-XXX-XXX-XXXX |
| Tech Lead / CTO | [Name] | cto@aureum.art | +1-XXX-XXX-XXXX |
| Security Officer | [Name] | security@aureum.art | +1-XXX-XXX-XXXX |
| Legal / Compliance | [Name] | legal@aureum.art | +1-XXX-XXX-XXXX |
| Product Lead | [Name] | product@aureum.art | +1-XXX-XXX-XXXX |
| Customer Support Lead | [Name] | support@aureum.art | +1-XXX-XXX-XXXX |

#### 15.3 Runbook Maintenance
- **Owner**: DevOps Team
- **Review Frequency**: Quarterly
- **Last Updated**: 2026-10-08
- **Next Review**: 2027-01-08
- **Location**: This file (`deployment_runbook.md`) in `aureum_plan/` directory
- **Change Process**: 
  1. Propose change in `#devops` Slack channel
  2. Review by at least two DevOps engineers
  3. Update file and create PR to `main` branch
  4. After merge, notify team via email and Slack
  5. Test revised procedures during next scheduled deployment or DR drill

---
*This runbook is a living document. Procedures should be tested regularly and updated as the system evolves.*
*Always verify commands and scripts in a non-production environment before executing in production.*