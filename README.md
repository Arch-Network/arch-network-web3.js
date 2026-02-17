# Arch Network JavaScript SDK

A JavaScript/TypeScript SDK for interacting with the [Arch Network](https://arch.network/) through its JSON-RPC API. This SDK enables developers to build applications on the Arch Network -- a Bitcoin-native execution layer.

This library is a fork of `@solana/web3.js` v1.x, adapted for Arch Network v0.6.1.

## Installation

```bash
npm install @aspect-build/arch-web3.js
```

## Quick Start

```typescript
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from '@aspect-build/arch-web3.js';

// Connect to an Arch Network node
const connection = new Connection('http://localhost:9002');

// Check if the node is ready
const ready = await connection.isNodeReady();

// Create a keypair
const keypair = Keypair.generate();

// Get account info
const accountInfo = await connection.getAccountInfo(keypair.publicKey);

// Build and send a transaction
const transaction = new Transaction({
  blockhash: await connection.getBestBlockHash(),
  lastValidBlockHeight: await connection.getBlockCount(),
});

transaction.add(
  SystemProgram.createAccount({
    fromPubkey: keypair.publicKey,
    newAccountPubkey: Keypair.generate().publicKey,
    lamports: 0,
    space: 100,
    programId: SystemProgram.programId,
  }),
);

transaction.sign(keypair);
const txid = await connection.sendTransaction(transaction.serialize());
```

## Key Differences from Solana web3.js

This SDK has been updated to support the Arch Network v0.6.1 protocol. The key differences from the original Solana web3.js are:

### Transaction Serialization

Arch Network uses a different wire format than Solana:

- **Version prefix**: Transactions start with a 4-byte u32 LE version field (currently `0`)
- **Signature count**: Uses a 1-byte u8 instead of Solana's shortvec encoding
- **Message encoding**: All count/length fields in messages use 4-byte u32 LE instead of shortvec
- **Max transaction size**: 10,240 bytes (vs Solana's 1,232 bytes)

### System Program Instructions

The instruction discriminants match the Arch Network v0.6.1 enum ordering:

| Index | Instruction |
| ----- | --- |
| 0 | CreateAccount |
| 1 | CreateAccountWithAnchor |
| 2 | Assign |
| 3 | Anchor |
| 4 | SignInput |
| 5 | Transfer |
| 6 | Allocate |
| 7 | CreateAccountWithSeed |
| 8 | AllocateWithSeed |
| 9 | AssignWithSeed |
| 10 | TransferWithSeed |

Three Arch-specific instructions are available:

- **`SystemProgram.createAccountWithAnchor()`** -- Create an account anchored to a Bitcoin UTXO
- **`SystemProgram.anchor()`** -- Anchor an existing account to a Bitcoin UTXO
- **`SystemProgram.signInput()`** -- Sign a Bitcoin transaction input

Nonce-related instructions are **not supported** on Arch Network.

### RPC Methods

The SDK translates method names to the Arch Network snake_case RPC format automatically. In addition to the standard methods, the following Arch-specific methods are available on the `Connection` class:

| Method | Description |
| --- | --- |
| `isNodeReady()` | Check if the node is ready |
| `getAccountAddress(pubkey)` | Get Bitcoin address for an account |
| `sendTransactions(txs[])` | Batch send transactions (max 100) |
| `getProcessedTransaction(txid)` | Get a processed transaction result |
| `recentTransactions(params?)` | Paginated recent transactions |
| `getTransactionsByBlock(params)` | Get transactions from a block |
| `getTransactionsByIds(ids[])` | Get multiple transactions by ID |
| `getBestBlockHash()` | Get the latest block hash |
| `getBestFinalizedBlockHash()` | Get the latest finalized block hash |
| `getBlockHash(height)` | Get block hash by height |
| `getBlockByHeight(height, filter?)` | Get a block by height |
| `getFullBlockWithTxids(hash)` | Get full block with transaction IDs |
| `getBlockCount()` | Get the current block count |
| `getBlockExecutionReport(hash)` | Get block execution report |
| `getPeers()` | Get peer statistics |
| `getCurrentState()` | Get current validator state |
| `getNetworkPubkey()` | Get the network group public key |
| `createAccountWithFaucet(pubkey)` | Create account via faucet (testnet) |
| `checkPreAnchorConflict(pubkeys[])` | Check for pre-anchor conflicts |

### Account Model

`AccountInfo` includes an optional `utxo` field (format: `"txid_hex:vout"`) for Bitcoin UTXO anchoring.

### Compute Budget

Only two compute budget instructions are supported:

| Index | Instruction |
| ----- | --- |
| 0 | RequestHeapFrame |
| 1 | SetComputeUnitLimit |

`RequestUnits` and `SetComputeUnitPrice` are **not supported** on Arch Network.

### Deprecated Modules

The following modules are retained for backward compatibility but are not used by Arch Network:

- `NonceAccount` / nonce-related types
- `EpochSchedule`
- `FeeCalculator`
- `VoteAccount`
- `ValidatorInfo`
- `AddressLookupTable`

## Arch-Specific Types

```typescript
import type {
  ArchTransactionStatus,   // 'Queued' | 'Processed' | { Failed: string }
  ArchRollbackStatus,      // 'NotRolledback' | { Rolledback: string }
  ArchProcessedTransaction,
  ArchBlock,
  ArchFullBlock,
} from '@aspect-build/arch-web3.js';
```

## Compatibility

This library requires a JavaScript runtime that supports [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) and the [exponentiation operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation). Both are supported in:

- **Browsers**: Chrome 67+, Firefox 68+, Safari 14+, Edge 79+
- **Node.js**: >= 10.4.0
- **Deno**: >= 1.0
- **React Native**: >= 0.70 with the Hermes engine

## Development

### Running Tests

```bash
npm install
npm test
```

### Running Arch Network-Specific Tests

```bash
npx cross-env NODE_ENV=test NODE_OPTIONS='--import tsx' npx mocha './test/arch-network.test.ts'
```

## Contributing

If you found a bug or would like to request a feature, please [file an issue](https://github.com/Arch-Network/arch-network-web3.js/issues/new). Pull requests are welcome.

## License

MIT
