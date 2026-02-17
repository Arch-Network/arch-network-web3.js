import bs58 from 'bs58';
import {Buffer} from 'buffer';

import {Blockhash} from '../blockhash';
import {
  MessageHeader,
  MessageAddressTableLookup,
  MessageCompiledInstruction,
} from './index';
import {PublicKey, PUBLIC_KEY_LENGTH} from '../publickey';
import assert from '../utils/assert';
import {PACKET_DATA_SIZE} from '../transaction/constants';
import {TransactionInstruction} from '../transaction';
import {AddressLookupTableAccount} from '../programs';
import {CompiledKeys} from './compiled-keys';
import {AccountKeysFromLookups, MessageAccountKeys} from './account-keys';

/**
 * Message constructor arguments
 */
export type MessageV0Args = {
  /** The message header, identifying signed and read-only `accountKeys` */
  header: MessageHeader;
  /** The static account keys used by this transaction */
  staticAccountKeys: PublicKey[];
  /** The hash of a recent ledger block */
  recentBlockhash: Blockhash;
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  compiledInstructions: MessageCompiledInstruction[];
  /** Instructions that will be executed in sequence and committed in one atomic transaction if all succeed. */
  addressTableLookups: MessageAddressTableLookup[];
};

export type CompileV0Args = {
  payerKey: PublicKey;
  instructions: Array<TransactionInstruction>;
  recentBlockhash: Blockhash;
  addressLookupTableAccounts?: Array<AddressLookupTableAccount>;
};

export type GetAccountKeysArgs =
  | {
      accountKeysFromLookups?: AccountKeysFromLookups | null;
    }
  | {
      addressLookupTableAccounts?: AddressLookupTableAccount[] | null;
    };

export class MessageV0 {
  header: MessageHeader;
  staticAccountKeys: Array<PublicKey>;
  recentBlockhash: Blockhash;
  compiledInstructions: Array<MessageCompiledInstruction>;
  addressTableLookups: Array<MessageAddressTableLookup>;

  constructor(args: MessageV0Args) {
    this.header = args.header;
    this.staticAccountKeys = args.staticAccountKeys;
    this.recentBlockhash = args.recentBlockhash;
    this.compiledInstructions = args.compiledInstructions;
    this.addressTableLookups = args.addressTableLookups;
  }

  get version(): 0 {
    return 0;
  }

  get numAccountKeysFromLookups(): number {
    let count = 0;
    for (const lookup of this.addressTableLookups) {
      count += lookup.readonlyIndexes.length + lookup.writableIndexes.length;
    }
    return count;
  }

  getAccountKeys(args?: GetAccountKeysArgs): MessageAccountKeys {
    let accountKeysFromLookups: AccountKeysFromLookups | undefined;
    if (
      args &&
      'accountKeysFromLookups' in args &&
      args.accountKeysFromLookups
    ) {
      if (
        this.numAccountKeysFromLookups !=
        args.accountKeysFromLookups.writable.length +
          args.accountKeysFromLookups.readonly.length
      ) {
        throw new Error(
          'Failed to get account keys because of a mismatch in the number of account keys from lookups',
        );
      }
      accountKeysFromLookups = args.accountKeysFromLookups;
    } else if (
      args &&
      'addressLookupTableAccounts' in args &&
      args.addressLookupTableAccounts
    ) {
      accountKeysFromLookups = this.resolveAddressTableLookups(
        args.addressLookupTableAccounts,
      );
    } else if (this.addressTableLookups.length > 0) {
      throw new Error(
        'Failed to get account keys because address table lookups were not resolved',
      );
    }
    return new MessageAccountKeys(
      this.staticAccountKeys,
      accountKeysFromLookups,
    );
  }

  isAccountSigner(index: number): boolean {
    return index < this.header.numRequiredSignatures;
  }

  isAccountWritable(index: number): boolean {
    const numSignedAccounts = this.header.numRequiredSignatures;
    const numStaticAccountKeys = this.staticAccountKeys.length;
    if (index >= numStaticAccountKeys) {
      const lookupAccountKeysIndex = index - numStaticAccountKeys;
      const numWritableLookupAccountKeys = this.addressTableLookups.reduce(
        (count, lookup) => count + lookup.writableIndexes.length,
        0,
      );
      return lookupAccountKeysIndex < numWritableLookupAccountKeys;
    } else if (index >= this.header.numRequiredSignatures) {
      const unsignedAccountIndex = index - numSignedAccounts;
      const numUnsignedAccounts = numStaticAccountKeys - numSignedAccounts;
      const numWritableUnsignedAccounts =
        numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
      return unsignedAccountIndex < numWritableUnsignedAccounts;
    } else {
      const numWritableSignedAccounts =
        numSignedAccounts - this.header.numReadonlySignedAccounts;
      return index < numWritableSignedAccounts;
    }
  }

  resolveAddressTableLookups(
    addressLookupTableAccounts: AddressLookupTableAccount[],
  ): AccountKeysFromLookups {
    const accountKeysFromLookups: AccountKeysFromLookups = {
      writable: [],
      readonly: [],
    };

    for (const tableLookup of this.addressTableLookups) {
      const tableAccount = addressLookupTableAccounts.find(account =>
        account.key.equals(tableLookup.accountKey),
      );
      if (!tableAccount) {
        throw new Error(
          `Failed to find address lookup table account for table key ${tableLookup.accountKey.toBase58()}`,
        );
      }

      for (const index of tableLookup.writableIndexes) {
        if (index < tableAccount.state.addresses.length) {
          accountKeysFromLookups.writable.push(
            tableAccount.state.addresses[index],
          );
        } else {
          throw new Error(
            `Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`,
          );
        }
      }

      for (const index of tableLookup.readonlyIndexes) {
        if (index < tableAccount.state.addresses.length) {
          accountKeysFromLookups.readonly.push(
            tableAccount.state.addresses[index],
          );
        } else {
          throw new Error(
            `Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`,
          );
        }
      }
    }

    return accountKeysFromLookups;
  }

  static compile(args: CompileV0Args): MessageV0 {
    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);

    const addressTableLookups = new Array<MessageAddressTableLookup>();
    const accountKeysFromLookups: AccountKeysFromLookups = {
      writable: new Array(),
      readonly: new Array(),
    };
    const lookupTableAccounts = args.addressLookupTableAccounts || [];
    for (const lookupTable of lookupTableAccounts) {
      const extractResult = compiledKeys.extractTableLookup(lookupTable);
      if (extractResult !== undefined) {
        const [addressTableLookup, {writable, readonly}] = extractResult;
        addressTableLookups.push(addressTableLookup);
        accountKeysFromLookups.writable.push(...writable);
        accountKeysFromLookups.readonly.push(...readonly);
      }
    }

    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
    const accountKeys = new MessageAccountKeys(
      staticAccountKeys,
      accountKeysFromLookups,
    );
    const compiledInstructions = accountKeys.compileInstructions(
      args.instructions,
    );
    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash: args.recentBlockhash,
      compiledInstructions,
      addressTableLookups,
    });
  }

  /**
   * Arch Network message format (no version prefix in message, version is at transaction level):
   * [header: 3 bytes] [account_count: u32 LE] [pubkeys] [blockhash: 32 bytes] [instruction_count: u32 LE] [instructions...]
   */
  serialize(): Uint8Array {
    const buf = Buffer.alloc(PACKET_DATA_SIZE);
    let offset = 0;

    buf.writeUInt8(this.header.numRequiredSignatures, offset);
    offset += 1;
    buf.writeUInt8(this.header.numReadonlySignedAccounts, offset);
    offset += 1;
    buf.writeUInt8(this.header.numReadonlyUnsignedAccounts, offset);
    offset += 1;

    buf.writeUInt32LE(this.staticAccountKeys.length, offset);
    offset += 4;
    for (const key of this.staticAccountKeys) {
      Buffer.from(key.toBytes()).copy(buf, offset);
      offset += PUBLIC_KEY_LENGTH;
    }

    Buffer.from(bs58.decode(this.recentBlockhash)).copy(buf, offset);
    offset += PUBLIC_KEY_LENGTH;

    buf.writeUInt32LE(this.compiledInstructions.length, offset);
    offset += 4;

    for (const instruction of this.compiledInstructions) {
      buf.writeUInt8(instruction.programIdIndex, offset);
      offset += 1;

      buf.writeUInt32LE(instruction.accountKeyIndexes.length, offset);
      offset += 4;
      for (const idx of instruction.accountKeyIndexes) {
        buf.writeUInt8(idx, offset);
        offset += 1;
      }

      buf.writeUInt32LE(instruction.data.length, offset);
      offset += 4;
      Buffer.from(instruction.data).copy(buf, offset);
      offset += instruction.data.length;
    }

    return new Uint8Array(buf.slice(0, offset));
  }

  /**
   * Deserialize Arch Network message format (no version prefix, that's at transaction level).
   */
  static deserialize(serializedMessage: Uint8Array): MessageV0 {
    const buf = Buffer.from(serializedMessage);
    let offset = 0;

    const header: MessageHeader = {
      numRequiredSignatures: buf.readUInt8(offset),
      numReadonlySignedAccounts: buf.readUInt8(offset + 1),
      numReadonlyUnsignedAccounts: buf.readUInt8(offset + 2),
    };
    offset += 3;

    const staticAccountKeysLength = buf.readUInt32LE(offset);
    offset += 4;

    const staticAccountKeys = [];
    for (let i = 0; i < staticAccountKeysLength; i++) {
      staticAccountKeys.push(
        new PublicKey(buf.slice(offset, offset + PUBLIC_KEY_LENGTH)),
      );
      offset += PUBLIC_KEY_LENGTH;
    }

    const recentBlockhash = bs58.encode(
      buf.slice(offset, offset + PUBLIC_KEY_LENGTH),
    );
    offset += PUBLIC_KEY_LENGTH;

    const instructionCount = buf.readUInt32LE(offset);
    offset += 4;

    const compiledInstructions: MessageCompiledInstruction[] = [];
    for (let i = 0; i < instructionCount; i++) {
      const programIdIndex = buf.readUInt8(offset);
      offset += 1;

      const accountKeyIndexesLength = buf.readUInt32LE(offset);
      offset += 4;
      const accountKeyIndexes = Array.from(
        buf.slice(offset, offset + accountKeyIndexesLength),
      );
      offset += accountKeyIndexesLength;

      const dataLength = buf.readUInt32LE(offset);
      offset += 4;
      const data = new Uint8Array(buf.slice(offset, offset + dataLength));
      offset += dataLength;

      compiledInstructions.push({
        programIdIndex,
        accountKeyIndexes,
        data,
      });
    }

    return new MessageV0({
      header,
      staticAccountKeys,
      recentBlockhash,
      compiledInstructions,
      addressTableLookups: [],
    });
  }
}
