# Blockchain Integration Implementation Plan
## Aureum: From Demo to Live On-Chain Provenance

---

> [!IMPORTANT]
> This plan transforms Aureum from its current state (SQLite + mocked Web3 UI) into a working
> blockchain-anchored provenance system. It is scoped for a **local Hardhat testnet first**,
> then Polygon Amoy testnet, then mainnet — each phase gated by the previous one passing.

---

## 1. Current State Assessment

### What Exists Today

| Layer | Current State | Target State |
|---|---|---|
| **Smart Contracts** | Specification only ([smart_contract_spec.md](file:///c:/.claude_code/aureum-test/docs/interfaces%20and%20trust%20model/smart_contract_spec.md)) — no `.sol` files | Compiled, tested, deployed `ArtchainRegistry.sol` |
| **Backend** | Express + Prisma/SQLite ([index.ts](file:///c:/.claude_code/aureum-test/backend/src/index.ts)) — no blockchain calls | Express + Prisma/PostgreSQL + ethers.js contract interaction |
| **Frontend** | Tailwind UI with mocked hashes and wallet pills | MetaMask wallet connection, real tx signing, live chain reads |
| **Storage** | `metadataCid` column stores placeholder strings | IPFS via Pinata SDK with real CID generation |
| **Database** | SQLite with simplified schema ([schema.prisma](file:///c:/.claude_code/aureum-test/backend/prisma/schema.prisma)) | PostgreSQL with full relational schema + chain-synced fields |
| **ethers.js** | Listed in [package.json](file:///c:/.claude_code/aureum-test/backend/package.json) but never imported | Active provider connections and contract instance calls |

### Key Gaps

```mermaid
graph LR
    A["📄 Contract Spec<br/>(docs only)"] -->|"Phase 1"| B["⚙️ Hardhat Project<br/>+ Compiled Contracts"]
    B -->|"Phase 2"| C["🔗 Backend Service<br/>+ ethers.js Integration"]
    C -->|"Phase 3"| D["🖥️ Frontend<br/>+ MetaMask Signing"]
    D -->|"Phase 4"| E["📦 IPFS Pinning<br/>+ CID Anchoring"]
    E -->|"Phase 5"| F["🔄 Event Indexer<br/>+ DB Sync"]
    F -->|"Phase 6"| G["🚀 Testnet Deploy<br/>+ E2E Verification"]
```

---

## 2. Implementation Phases

### Phase 1: Smart Contract Development & Local Testing

**Goal**: Translate the spec into compilable, tested Solidity contracts.

#### 1.1 Initialize Hardhat Project

```
aureum-test/
├── blockchain/                    ← NEW directory
│   ├── contracts/
│   │   ├── ArtchainRegistry.sol   ← Core registry
│   │   ├── AccessControlExtension.sol
│   │   └── interfaces/
│   │       └── IArtchainRegistry.sol
│   ├── scripts/
│   │   └── deploy.ts              ← Deployment script
│   ├── test/
│   │   ├── ArtchainRegistry.test.ts
│   │   └── AccessControl.test.ts
│   ├── hardhat.config.ts
│   └── package.json
```

**Steps**:
1. Run `npx hardhat init` inside `blockchain/` with TypeScript config
2. Install dependencies: `@openzeppelin/contracts`, `@nomicfoundation/hardhat-toolbox`
3. Configure `hardhat.config.ts` with local network + Polygon Amoy testnet

#### 1.2 Implement `ArtchainRegistry.sol`

Translate the full specification from [smart_contract_spec.md](file:///c:/.claude_code/aureum-test/docs/interfaces%20and%20trust%20model/smart_contract_spec.md) sections 4.1–4.5:

| Function | Role Restriction | Key Behavior |
|---|---|---|
| `approveInstitution(address)` | `ARTCHAIN_ADMIN` | Add wallet to authenticated institution mapping |
| `revokeInstitution(address)` | `ARTCHAIN_ADMIN` | Remove from mapping, emit event |
| `createGenesisRecord(...)` | `AUTHENTICATOR` | Mint artwork ID, store CID hashes, emit `GenesisRecordCreated` |
| `initiateTransfer(...)` | Current owner (authenticated institution) | Create pending transfer, enforce single-pending constraint |
| `acceptTransfer(uint256)` | Intended buyer only | Finalize transfer, clear pending marker |
| `expireTransfer(uint256)` | Anyone (if expired) | Mark `EXPIRED`, free pending slot |
| `cancelTransfer(uint256, string)` | Seller or admin | Mark `CANCELLED` |
| `appendAmendmentRecord(...)` | `AUTHENTICATOR` | Append correction, emit event |
| `flagArtwork(...)` | Owner, authenticator, or institution | Create dispute flag |
| `resolveFlag(uint256, string)` | Authorized parties | Resolve active flag |
| `getArtwork(uint256)` | Public (view) | Return full artwork struct |
| `getCurrentOwner(uint256)` | Public (view) | Walk transfer chain to current holder |

**On-chain storage is minimal by design** — only `bytes32` hashes, addresses, timestamps, and enum states. All bulky data (images, PDFs, metadata JSON) lives on IPFS; only their CIDs are anchored.

#### 1.3 Write Hardhat Tests

Cover every function with role permutation tests:
- **Happy paths**: Authenticated institution creates Genesis → initiates transfer → buyer accepts
- **Access control**: Unauthorized callers revert with custom errors
- **Edge cases**: Expired transfers, double-pending rejection, zero-address validation
- **Event verification**: Every state change emits the correct indexed event

**Target: 100% function coverage, all tests passing on local Hardhat node.**

#### 1.4 Deliverables

- [ ] `ArtchainRegistry.sol` compiles with `npx hardhat compile`
- [ ] `AccessControlExtension.sol` compiles
- [ ] `IArtchainRegistry.sol` interface
- [ ] Full test suite passes (`npx hardhat test`)
- [ ] Generated TypeScript types via `hardhat-toolbox` (ABI + type bindings)
- [ ] Local deployment script producing a deployed contract address

---

### Phase 2: Backend Blockchain Service Layer

**Goal**: Create a backend service that reads/writes to the deployed contract via ethers.js.

#### 2.1 Create `BlockchainService`

New file: `backend/src/services/blockchain.service.ts`

```typescript
// Pseudocode structure
import { ethers } from 'ethers';
import ArtchainRegistryABI from '../../blockchain/artifacts/...';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      ArtchainRegistryABI,
      this.signer
    );
  }

  async createGenesisRecord(params: GenesisParams): Promise<GenesisResult> { ... }
  async initiateTransfer(params: TransferParams): Promise<TransferResult> { ... }
  async acceptTransfer(transferId: bigint): Promise<TxReceipt> { ... }
  async getArtwork(artworkId: bigint): Promise<ArtworkOnChain> { ... }
  async getCurrentOwner(artworkId: bigint): Promise<string> { ... }
  async verifyProvenance(artworkId: bigint): Promise<ProvenanceChain> { ... }
}
```

#### 2.2 Update Backend API Routes

Modify [backend/src/index.ts](file:///c:/.claude_code/aureum-test/backend/src/index.ts) to call `BlockchainService` alongside Prisma:

| Route | Current Behavior | New Behavior |
|---|---|---|
| `POST /api/artworks` | Write to SQLite only | 1. Pin metadata to IPFS → get CID<br/>2. Call `contract.createGenesisRecord(...)` → get tx hash<br/>3. Write to DB with real `txHash`, `metadataCid`, on-chain `artworkId` |
| `POST /api/transfers` | Write to SQLite only | 1. Call `contract.initiateTransfer(...)` → get transfer ID<br/>2. Write to DB with `PENDING` status |
| `POST /api/transfers/:id/accept` | *(doesn't exist yet)* | 1. Call `contract.acceptTransfer(...)` → finalized<br/>2. Update DB status to `FINALIZED` |
| `GET /api/artworks/:id` | Read from SQLite | Read from DB (cached) + optional on-chain verification |

#### 2.3 Environment Configuration

New `.env` variables:
```env
RPC_URL=http://127.0.0.1:8545          # Local Hardhat node (dev)
CONTRACT_ADDRESS=0x5FbDB2...            # Deployed ArtchainRegistry
DEPLOYER_PRIVATE_KEY=0xac09...          # Hardhat account #0 (dev only)
PINATA_API_KEY=...                      # For IPFS pinning
PINATA_SECRET_KEY=...
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

#### 2.4 Deliverables

- [ ] `BlockchainService` class with all contract call methods
- [ ] Updated API routes calling blockchain + DB in sequence
- [ ] Error handling for failed transactions (revert reasons, gas estimation)
- [ ] Environment config for local Hardhat, testnet, and mainnet

---

### Phase 3: IPFS Integration (Pinata)

**Goal**: Replace placeholder CID strings with real IPFS content addressing.

#### 3.1 Create `IPFSService`

New file: `backend/src/services/ipfs.service.ts`

```typescript
export class IPFSService {
  // Pin artwork metadata JSON to IPFS, return CID
  async pinMetadata(metadata: ArtworkMetadata): Promise<string> { ... }

  // Pin uploaded image file, return CID
  async pinImage(fileBuffer: Buffer, fileName: string): Promise<string> { ... }

  // Pin uploaded document (PDF), return CID
  async pinDocument(fileBuffer: Buffer, fileName: string): Promise<string> { ... }

  // Verify a CID still resolves (health check)
  async verifyCid(cid: string): Promise<boolean> { ... }
}
```

#### 3.2 Updated Artwork Registration Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as Backend API
    participant IPFS as Pinata/IPFS
    participant SC as Smart Contract

    UI->>API: POST /api/artworks (form data + files)
    API->>IPFS: Pin images → imageCIDs[]
    API->>IPFS: Pin documents → documentCIDs[]
    API->>IPFS: Pin metadata JSON → metadataCID
    API->>SC: createGenesisRecord(metadataCID, docCIDs, imgCIDs, bindingRef)
    SC-->>API: tx receipt (artworkId, txHash, blockNumber)
    API->>API: Write to Prisma DB (cache all fields)
    API-->>UI: { artworkId, txHash, metadataCID, status: "VERIFIED" }
```

#### 3.3 Deliverables

- [ ] `IPFSService` with Pinata SDK integration
- [ ] Multipart file upload endpoint for images and documents
- [ ] CID stored both on-chain (as `bytes32`) and in DB (as string)
- [ ] Verification endpoint to check CID ↔ on-chain hash match

---

### Phase 4: Frontend Wallet Integration

**Goal**: Connect MetaMask for real transaction signing and on-chain reads.

#### 4.1 Install Frontend Dependencies

```bash
cd frontend
npm install ethers@6 @web3modal/ethers
```

#### 4.2 Create Wallet Context

New file: `frontend/src/contexts/WalletContext.tsx`

Provides:
- `connectWallet()` → prompts MetaMask
- `account` → connected address
- `chainId` → current network
- `signer` → ethers.BrowserProvider signer for tx signing
- `isConnected` → boolean state

#### 4.3 Create Contract Hook

New file: `frontend/src/hooks/useArtchainContract.ts`

```typescript
export function useArtchainContract() {
  const { signer } = useWallet();

  // Read-only contract instance (public RPC)
  const readContract = useMemo(() => ...);

  // Write contract instance (requires connected signer)
  const writeContract = useMemo(() => ...);

  return {
    getArtwork: (id: bigint) => readContract.getArtwork(id),
    getCurrentOwner: (id: bigint) => readContract.getCurrentOwner(id),
    acceptTransfer: (id: bigint) => writeContract.acceptTransfer(id),
    // ... other methods
  };
}
```

#### 4.4 Update Dashboard Pages

| Page | Current State | New Behavior |
|---|---|---|
| **CollectorDashboard** | Mocked wallet pill `0x71C...49A2` | Real connected wallet address from MetaMask |
| **CollectorDashboard** | "Review & Accept Transfer" → `alert()` | Calls `contract.acceptTransfer(id)` → signs in MetaMask → updates UI on success |
| **ArtworkRegistration** | Posts form to backend → mock success | Posts form → backend pins to IPFS → backend calls contract → returns real tx hash |
| **ProvenanceVerification** | Mocked hash lookups | Reads directly from contract `getArtwork()` + `getTransfer()` → live chain data |
| **InstitutionDashboard** | Mocked activity feed | Queries contract events for real Genesis/Transfer history |

#### 4.5 Deliverables

- [ ] `WalletContext` provider wrapping `App.tsx`
- [ ] "Connect Wallet" button in navbar replaces static pill
- [ ] Transfer acceptance triggers MetaMask signature popup
- [ ] Provenance verification reads live on-chain data
- [ ] Chain ID validation (warn if wrong network)

---

### Phase 5: Event Indexer Service

**Goal**: Keep the database in sync with on-chain events for fast queries.

#### 5.1 Create Indexer Service

New file: `backend/src/services/indexer.service.ts`

```typescript
export class IndexerService {
  // Listen for contract events and sync to database
  async startListening(): Promise<void> {
    contract.on("GenesisRecordCreated", async (artworkId, authenticator, ...) => {
      await prisma.artwork.upsert({
        where: { onChainId: artworkId.toString() },
        create: { /* map event args to DB fields */ },
        update: { /* update if re-org detected */ },
      });
    });

    contract.on("TransferFinalized", async (transferId, artworkId, buyer, ...) => {
      await prisma.transfer.update({
        where: { onChainId: transferId.toString() },
        data: { status: "FINALIZED", buyerId: buyer, ... },
      });
    });

    // ... listeners for all events
  }

  // Backfill: query past events from block 0 to current
  async backfill(fromBlock: number): Promise<void> { ... }

  // Reconciliation: compare DB state with on-chain state
  async reconcile(): Promise<MismatchReport> { ... }
}
```

#### 5.2 Database Schema Upgrade

Upgrade [schema.prisma](file:///c:/.claude_code/aureum-test/backend/prisma/schema.prisma) to match the full relational schema from [implementation_plan.md](file:///c:/.claude_code/aureum-test/docs/product%20definition/implementation_plan.md):

Key additions:
- `Institution` model with `walletAddress`, `status` (PENDING/APPROVED/REVOKED)
- `onChainId` field on Artwork and Transfer (mapping DB record ↔ contract ID)
- `Amendment` and `Flag` models
- Proper foreign key relations between all models
- Migration from SQLite → PostgreSQL

#### 5.3 Deliverables

- [ ] `IndexerService` listening to all contract events
- [ ] Backfill script for historical events
- [ ] Reconciliation job (cron or manual trigger)
- [ ] Upgraded Prisma schema with all models and relations
- [ ] PostgreSQL migration tested

---

### Phase 6: Testnet Deployment & End-to-End Verification

**Goal**: Deploy to Polygon Amoy testnet and verify the full flow works.

#### 6.1 Testnet Deployment

1. Configure Hardhat for Polygon Amoy:
   ```typescript
   // hardhat.config.ts
   networks: {
     amoy: {
       url: process.env.AMOY_RPC_URL,  // Alchemy or Infura
       accounts: [process.env.DEPLOYER_PRIVATE_KEY],
       chainId: 80002,
     }
   }
   ```
2. Deploy: `npx hardhat run scripts/deploy.ts --network amoy`
3. Verify on Polygonscan: `npx hardhat verify --network amoy <address>`

#### 6.2 End-to-End Test Checklist

- [ ] Institution connects MetaMask → approved by admin on-chain
- [ ] Institution uploads artwork images + docs → pinned to IPFS → CIDs returned
- [ ] Institution submits Genesis record → MetaMask signs tx → `GenesisRecordCreated` event emitted
- [ ] Artwork appears in Institution Dashboard with real tx hash link to Polygonscan
- [ ] Institution initiates transfer to collector wallet → `TransferInitiated` event
- [ ] Collector connects MetaMask → sees pending transfer → clicks Accept → signs tx → `TransferFinalized`
- [ ] Public verification page reads on-chain data → shows full provenance chain
- [ ] IPFS CIDs from on-chain record resolve to actual images/documents
- [ ] Indexer syncs all events to PostgreSQL → dashboard queries are fast

#### 6.3 Deliverables

- [ ] Contract deployed and verified on Polygon Amoy
- [ ] Backend `.env` pointed to Amoy RPC
- [ ] Frontend configured for Amoy chain ID (80002)
- [ ] All E2E tests passing on testnet
- [ ] Polygonscan links working for all transactions

---

## 3. New File Inventory

```
aureum-test/
├── blockchain/                              ← NEW: Hardhat project
│   ├── contracts/
│   │   ├── ArtchainRegistry.sol
│   │   ├── AccessControlExtension.sol
│   │   └── interfaces/
│   │       └── IArtchainRegistry.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   ├── ArtchainRegistry.test.ts
│   │   └── helpers.ts
│   ├── hardhat.config.ts
│   ├── package.json
│   └── .env.example
├── backend/
│   └── src/
│       └── services/
│           ├── auth.service.ts              (existing)
│           ├── blockchain.service.ts        ← NEW
│           ├── ipfs.service.ts              ← NEW
│           └── indexer.service.ts           ← NEW
├── frontend/
│   └── src/
│       ├── contexts/
│       │   └── WalletContext.tsx             ← NEW
│       ├── hooks/
│       │   └── useArtchainContract.ts       ← NEW
│       └── ...
```

---

## 4. Dependency Additions

### `blockchain/package.json` (new)
| Package | Purpose |
|---|---|
| `hardhat` | Solidity dev framework |
| `@nomicfoundation/hardhat-toolbox` | Testing, coverage, gas reports |
| `@openzeppelin/contracts` v5 | AccessControl, Pausable, ReentrancyGuard |
| `ethers` v6 | Contract interaction in scripts/tests |

### `backend/package.json` (additions)
| Package | Purpose |
|---|---|
| `@pinata/sdk` | IPFS pinning via Pinata |
| `multer` | Multipart file upload handling |
| `pg` + migrate to PostgreSQL | Production database |

### `frontend/package.json` (additions)
| Package | Purpose |
|---|---|
| `ethers` v6 | Browser provider + contract reads/writes |
| `@web3modal/ethers` (optional) | Multi-wallet connection UI |

---

## 5. Environment Variables

```env
# ── Blockchain ──
RPC_URL=http://127.0.0.1:8545              # Local dev (Hardhat node)
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x...                       # Deployed ArtchainRegistry
DEPLOYER_PRIVATE_KEY=0x...                   # Backend relayer key (NEVER commit)

# ── IPFS ──
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# ── Database ──
DATABASE_URL=postgresql://user:pass@localhost:5432/aureum

# ── Frontend (.env) ──
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=31337                          # Hardhat local (80002 for Amoy)
```

---

## 6. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Smart contract bug | Permanent data corruption | Full test suite + Slither static analysis + manual audit before testnet |
| IPFS pinning failure | CID unreachable, broken provenance | Retry logic + secondary pin provider + DB stores CID as backup reference |
| MetaMask UX friction | Users confused by tx signing | Clear modal explanations before each sign prompt + loading states |
| Gas cost spikes | Genesis/transfer too expensive | `bytes32` for hashes (not strings), `calldata` params, batch operations if needed |
| Chain reorg | DB/chain state mismatch | Indexer waits for N confirmations before marking final + reconciliation job |
| Private key leak | Funds/contract compromised | Use hardware wallet for admin keys; backend relayer has minimal permissions |

---

## 7. Execution Order & Estimated Effort

| Phase | Description | Dependencies | Estimated Effort |
|---|---|---|---|
| **Phase 1** | Smart Contracts (Solidity + Hardhat tests) | None | 3–5 days |
| **Phase 2** | Backend BlockchainService + route updates | Phase 1 (ABI artifacts) | 2–3 days |
| **Phase 3** | IPFS/Pinata integration | Phase 2 (service layer exists) | 1–2 days |
| **Phase 4** | Frontend wallet + contract hooks | Phase 1 (ABI), Phase 2 (API) | 2–3 days |
| **Phase 5** | Event indexer + DB schema upgrade | Phase 1, Phase 2 | 2–3 days |
| **Phase 6** | Testnet deploy + E2E verification | All phases | 1–2 days |
| **Total** | | | **11–18 days** |

> [!TIP]
> Phases 2, 3, and 4 can partially overlap once Phase 1 produces compiled ABI artifacts.
> Phase 5 can begin as soon as Phase 2's `BlockchainService` is functional.

---

## 8. Success Criteria

The integration is complete when a user can:

1. **Connect MetaMask** on the frontend and see their real wallet address
2. **Register an artwork** → images pinned to IPFS → Genesis record written on-chain → tx hash verifiable on Polygonscan
3. **Initiate a custody transfer** → pending transfer recorded on-chain → recipient notified
4. **Accept a transfer** → recipient signs in MetaMask → transfer finalized on-chain → ownership updated
5. **Verify provenance** → public page reads directly from the smart contract → shows full chain of custody with real CIDs and tx hashes
6. **Click any IPFS CID** → resolves to the actual uploaded image or document
7. **Click any tx hash** → opens Polygonscan showing the real confirmed transaction

> [!CAUTION]
> The current backend stores passwords in plaintext ([schema.prisma](file:///c:/.claude_code/aureum-test/backend/prisma/schema.prisma) line 16).
> Before any testnet deployment with real users, passwords must be hashed with bcrypt and
> the authentication flow must be secured. This is out of scope for blockchain integration
> but is a critical prerequisite for any non-demo deployment.
