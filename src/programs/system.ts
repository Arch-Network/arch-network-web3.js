import * as BufferLayout from '@solana/buffer-layout';
import {Buffer} from 'buffer';

import {
  encodeData,
  decodeData,
  InstructionType,
  IInstructionInputData,
} from '../instruction';
import * as Layout from '../layout';
import {PublicKey} from '../publickey';
import {TransactionInstruction} from '../transaction';
import {toBuffer} from '../utils/to-buffer';
import {u64} from '../utils/bigint';

/**
 * Create account system transaction params
 */
export type CreateAccountParams = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: PublicKey;
  /** Public key of the created account */
  newAccountPubkey: PublicKey;
  /** Amount of lamports to transfer to the created account */
  lamports: number;
  /** Amount of space in bytes to allocate to the created account */
  space: number;
  /** Public key of the program to assign as the owner of the created account */
  programId: PublicKey;
};

/**
 * Create account with UTXO anchor system transaction params (Arch-specific)
 */
export type CreateAccountWithAnchorParams = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: PublicKey;
  /** Public key of the created account */
  newAccountPubkey: PublicKey;
  /** Amount of lamports to transfer to the created account */
  lamports: number;
  /** Amount of space in bytes to allocate to the created account */
  space: number;
  /** Public key of the program to assign as the owner of the created account */
  programId: PublicKey;
  /** Bitcoin transaction ID (32 bytes) for the UTXO anchor */
  txid: Uint8Array;
  /** Output index (vout) of the UTXO anchor */
  vout: number;
};

/**
 * Transfer system transaction params
 */
export type TransferParams = {
  /** Account that will transfer lamports */
  fromPubkey: PublicKey;
  /** Account that will receive transferred lamports */
  toPubkey: PublicKey;
  /** Amount of lamports to transfer */
  lamports: number | bigint;
};

/**
 * Assign system transaction params
 */
export type AssignParams = {
  /** Public key of the account which will be assigned a new owner */
  accountPubkey: PublicKey;
  /** Public key of the program to assign as the owner */
  programId: PublicKey;
};

/**
 * Anchor account to UTXO system transaction params (Arch-specific)
 */
export type AnchorParams = {
  /** Public key of the account to anchor */
  accountPubkey: PublicKey;
  /** Bitcoin transaction ID (32 bytes) for the UTXO anchor */
  txid: Uint8Array;
  /** Output index (vout) of the UTXO anchor */
  vout: number;
};

/**
 * Sign Bitcoin transaction input system transaction params (Arch-specific)
 */
export type SignInputParams = {
  /** Public key of the signer account */
  signerPubkey: PublicKey;
  /** Index of the Bitcoin transaction input to sign */
  index: number;
};

/**
 * Create account with seed system transaction params
 */
export type CreateAccountWithSeedParams = {
  /** The account that will transfer lamports to the created account */
  fromPubkey: PublicKey;
  /** Public key of the created account. Must be pre-calculated with PublicKey.createWithSeed() */
  newAccountPubkey: PublicKey;
  /** Base public key to use to derive the address of the created account. Must be the same as the base key used to create `newAccountPubkey` */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the created account. Must be the same as the seed used to create `newAccountPubkey` */
  seed: string;
  /** Amount of lamports to transfer to the created account */
  lamports: number;
  /** Amount of space in bytes to allocate to the created account */
  space: number;
  /** Public key of the program to assign as the owner of the created account */
  programId: PublicKey;
};

/**
 * Allocate account system transaction params
 */
export type AllocateParams = {
  /** Account to allocate */
  accountPubkey: PublicKey;
  /** Amount of space in bytes to allocate */
  space: number;
};

/**
 * Allocate account with seed system transaction params
 */
export type AllocateWithSeedParams = {
  /** Account to allocate */
  accountPubkey: PublicKey;
  /** Base public key to use to derive the address of the allocated account */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the allocated account */
  seed: string;
  /** Amount of space in bytes to allocate */
  space: number;
  /** Public key of the program to assign as the owner of the allocated account */
  programId: PublicKey;
};

/**
 * Assign account with seed system transaction params
 */
export type AssignWithSeedParams = {
  /** Public key of the account which will be assigned a new owner */
  accountPubkey: PublicKey;
  /** Base public key to use to derive the address of the assigned account */
  basePubkey: PublicKey;
  /** Seed to use to derive the address of the assigned account */
  seed: string;
  /** Public key of the program to assign as the owner */
  programId: PublicKey;
};

/**
 * Transfer with seed system transaction params
 */
export type TransferWithSeedParams = {
  /** Account that will transfer lamports */
  fromPubkey: PublicKey;
  /** Base public key to use to derive the funding account address */
  basePubkey: PublicKey;
  /** Account that will receive transferred lamports */
  toPubkey: PublicKey;
  /** Amount of lamports to transfer */
  lamports: number | bigint;
  /** Seed to use to derive the funding account address */
  seed: string;
  /** Program id to use to derive the funding account address */
  programId: PublicKey;
};

/** Decoded transfer system transaction instruction */
export type DecodedTransferInstruction = {
  /** Account that will transfer lamports */
  fromPubkey: PublicKey;
  /** Account that will receive transferred lamports */
  toPubkey: PublicKey;
  /** Amount of lamports to transfer */
  lamports: bigint;
};

/** Decoded transferWithSeed system transaction instruction */
export type DecodedTransferWithSeedInstruction = {
  /** Account that will transfer lamports */
  fromPubkey: PublicKey;
  /** Base public key to use to derive the funding account address */
  basePubkey: PublicKey;
  /** Account that will receive transferred lamports */
  toPubkey: PublicKey;
  /** Amount of lamports to transfer */
  lamports: bigint;
  /** Seed to use to derive the funding account address */
  seed: string;
  /** Program id to use to derive the funding account address */
  programId: PublicKey;
};

/**
 * System Instruction class
 */
export class SystemInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a system instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): SystemInstructionType {
    this.checkProgramId(instruction.programId);

    const instructionTypeLayout = BufferLayout.u32('instruction');
    const typeIndex = instructionTypeLayout.decode(instruction.data);

    let type: SystemInstructionType | undefined;
    for (const [ixType, layout] of Object.entries(SYSTEM_INSTRUCTION_LAYOUTS)) {
      if (layout.index == typeIndex) {
        type = ixType as SystemInstructionType;
        break;
      }
    }

    if (!type) {
      throw new Error('Instruction type incorrect; not a SystemInstruction');
    }

    return type;
  }

  /**
   * Decode a create account system instruction and retrieve the instruction params.
   */
  static decodeCreateAccount(
    instruction: TransactionInstruction,
  ): CreateAccountParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {lamports, space, programId} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.Create,
      instruction.data,
    );

    return {
      fromPubkey: instruction.keys[0].pubkey,
      newAccountPubkey: instruction.keys[1].pubkey,
      lamports,
      space,
      programId: new PublicKey(programId),
    };
  }

  /**
   * Decode a transfer system instruction and retrieve the instruction params.
   */
  static decodeTransfer(
    instruction: TransactionInstruction,
  ): DecodedTransferInstruction {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {lamports} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.Transfer,
      instruction.data,
    );

    return {
      fromPubkey: instruction.keys[0].pubkey,
      toPubkey: instruction.keys[1].pubkey,
      lamports,
    };
  }

  /**
   * Decode a transfer with seed system instruction and retrieve the instruction params.
   */
  static decodeTransferWithSeed(
    instruction: TransactionInstruction,
  ): DecodedTransferWithSeedInstruction {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 3);

    const {lamports, seed, programId} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.TransferWithSeed,
      instruction.data,
    );

    return {
      fromPubkey: instruction.keys[0].pubkey,
      basePubkey: instruction.keys[1].pubkey,
      toPubkey: instruction.keys[2].pubkey,
      lamports,
      seed,
      programId: new PublicKey(programId),
    };
  }

  /**
   * Decode an allocate system instruction and retrieve the instruction params.
   */
  static decodeAllocate(instruction: TransactionInstruction): AllocateParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {space} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.Allocate,
      instruction.data,
    );

    return {
      accountPubkey: instruction.keys[0].pubkey,
      space,
    };
  }

  /**
   * Decode an allocate with seed system instruction and retrieve the instruction params.
   */
  static decodeAllocateWithSeed(
    instruction: TransactionInstruction,
  ): AllocateWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {base, seed, space, programId} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.AllocateWithSeed,
      instruction.data,
    );

    return {
      accountPubkey: instruction.keys[0].pubkey,
      basePubkey: new PublicKey(base),
      seed,
      space,
      programId: new PublicKey(programId),
    };
  }

  /**
   * Decode an assign system instruction and retrieve the instruction params.
   */
  static decodeAssign(instruction: TransactionInstruction): AssignParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {programId} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.Assign,
      instruction.data,
    );

    return {
      accountPubkey: instruction.keys[0].pubkey,
      programId: new PublicKey(programId),
    };
  }

  /**
   * Decode an assign with seed system instruction and retrieve the instruction params.
   */
  static decodeAssignWithSeed(
    instruction: TransactionInstruction,
  ): AssignWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 1);

    const {base, seed, programId} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.AssignWithSeed,
      instruction.data,
    );

    return {
      accountPubkey: instruction.keys[0].pubkey,
      basePubkey: new PublicKey(base),
      seed,
      programId: new PublicKey(programId),
    };
  }

  /**
   * Decode a create account with seed system instruction and retrieve the instruction params.
   */
  static decodeCreateWithSeed(
    instruction: TransactionInstruction,
  ): CreateAccountWithSeedParams {
    this.checkProgramId(instruction.programId);
    this.checkKeyLength(instruction.keys, 2);

    const {base, seed, lamports, space, programId} = decodeData(
      SYSTEM_INSTRUCTION_LAYOUTS.CreateWithSeed,
      instruction.data,
    );

    return {
      fromPubkey: instruction.keys[0].pubkey,
      newAccountPubkey: instruction.keys[1].pubkey,
      basePubkey: new PublicKey(base),
      seed,
      lamports,
      space,
      programId: new PublicKey(programId),
    };
  }

  /**
   * @internal
   */
  static checkProgramId(programId: PublicKey) {
    if (!programId.equals(SystemProgram.programId)) {
      throw new Error('invalid instruction; programId is not SystemProgram');
    }
  }

  /**
   * @internal
   */
  static checkKeyLength(keys: Array<any>, expectedLength: number) {
    if (keys.length < expectedLength) {
      throw new Error(
        `invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`,
      );
    }
  }
}

/**
 * An enumeration of valid SystemInstructionType's
 * Arch Network v0.6.1 discriminant order
 */
export type SystemInstructionType =
  | 'Create'
  | 'CreateWithAnchor'
  | 'Assign'
  | 'Anchor'
  | 'SignInput'
  | 'Transfer'
  | 'Allocate'
  | 'CreateWithSeed'
  | 'AllocateWithSeed'
  | 'AssignWithSeed'
  | 'TransferWithSeed';

type SystemInstructionInputData = {
  Create: IInstructionInputData & {
    lamports: number;
    programId: Uint8Array;
    space: number;
  };
  CreateWithAnchor: IInstructionInputData & {
    lamports: number;
    space: number;
    programId: Uint8Array;
    txid: Uint8Array;
    vout: number;
  };
  Assign: IInstructionInputData & {
    programId: Uint8Array;
  };
  Anchor: IInstructionInputData & {
    txid: Uint8Array;
    vout: number;
  };
  SignInput: IInstructionInputData & {
    index: number;
  };
  Transfer: IInstructionInputData & {
    lamports: bigint;
  };
  Allocate: IInstructionInputData & {
    space: number;
  };
  CreateWithSeed: IInstructionInputData & {
    base: Uint8Array;
    lamports: number;
    programId: Uint8Array;
    seed: string;
    space: number;
  };
  AllocateWithSeed: IInstructionInputData & {
    base: Uint8Array;
    programId: Uint8Array;
    seed: string;
    space: number;
  };
  AssignWithSeed: IInstructionInputData & {
    base: Uint8Array;
    seed: string;
    programId: Uint8Array;
  };
  TransferWithSeed: IInstructionInputData & {
    lamports: bigint;
    programId: Uint8Array;
    seed: string;
  };
};

/**
 * An enumeration of valid system InstructionType's
 * Arch Network v0.6.1 discriminant ordering
 * @internal
 */
export const SYSTEM_INSTRUCTION_LAYOUTS = Object.freeze<{
  [Instruction in SystemInstructionType]: InstructionType<
    SystemInstructionInputData[Instruction]
  >;
}>({
  Create: {
    index: 0,
    layout: BufferLayout.struct<SystemInstructionInputData['Create']>([
      BufferLayout.u32('instruction'),
      BufferLayout.ns64('lamports'),
      BufferLayout.ns64('space'),
      Layout.publicKey('programId'),
    ]),
  },
  CreateWithAnchor: {
    index: 1,
    layout: BufferLayout.struct<SystemInstructionInputData['CreateWithAnchor']>([
      BufferLayout.u32('instruction'),
      BufferLayout.ns64('lamports'),
      BufferLayout.ns64('space'),
      Layout.publicKey('programId'),
      BufferLayout.blob(32, 'txid'),
      BufferLayout.u32('vout'),
    ]),
  },
  Assign: {
    index: 2,
    layout: BufferLayout.struct<SystemInstructionInputData['Assign']>([
      BufferLayout.u32('instruction'),
      Layout.publicKey('programId'),
    ]),
  },
  Anchor: {
    index: 3,
    layout: BufferLayout.struct<SystemInstructionInputData['Anchor']>([
      BufferLayout.u32('instruction'),
      BufferLayout.blob(32, 'txid'),
      BufferLayout.u32('vout'),
    ]),
  },
  SignInput: {
    index: 4,
    layout: BufferLayout.struct<SystemInstructionInputData['SignInput']>([
      BufferLayout.u32('instruction'),
      BufferLayout.u32('index'),
    ]),
  },
  Transfer: {
    index: 5,
    layout: BufferLayout.struct<SystemInstructionInputData['Transfer']>([
      BufferLayout.u32('instruction'),
      u64('lamports'),
    ]),
  },
  Allocate: {
    index: 6,
    layout: BufferLayout.struct<SystemInstructionInputData['Allocate']>([
      BufferLayout.u32('instruction'),
      BufferLayout.ns64('space'),
    ]),
  },
  CreateWithSeed: {
    index: 7,
    layout: BufferLayout.struct<SystemInstructionInputData['CreateWithSeed']>([
      BufferLayout.u32('instruction'),
      Layout.publicKey('base'),
      Layout.rustString('seed'),
      BufferLayout.ns64('lamports'),
      BufferLayout.ns64('space'),
      Layout.publicKey('programId'),
    ]),
  },
  AllocateWithSeed: {
    index: 8,
    layout: BufferLayout.struct<SystemInstructionInputData['AllocateWithSeed']>(
      [
        BufferLayout.u32('instruction'),
        Layout.publicKey('base'),
        Layout.rustString('seed'),
        BufferLayout.ns64('space'),
        Layout.publicKey('programId'),
      ],
    ),
  },
  AssignWithSeed: {
    index: 9,
    layout: BufferLayout.struct<SystemInstructionInputData['AssignWithSeed']>([
      BufferLayout.u32('instruction'),
      Layout.publicKey('base'),
      Layout.rustString('seed'),
      Layout.publicKey('programId'),
    ]),
  },
  TransferWithSeed: {
    index: 10,
    layout: BufferLayout.struct<SystemInstructionInputData['TransferWithSeed']>(
      [
        BufferLayout.u32('instruction'),
        u64('lamports'),
        Layout.rustString('seed'),
        Layout.publicKey('programId'),
      ],
    ),
  },
});

/**
 * Factory class for transactions to interact with the System program
 */
export class SystemProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the System program
   */
  static programId: PublicKey = new PublicKey(
    '11111111111111111111111111111111',
  );

  /**
   * Generate a transaction instruction that creates a new account
   */
  static createAccount(params: CreateAccountParams): TransactionInstruction {
    const type = SYSTEM_INSTRUCTION_LAYOUTS.Create;
    const data = encodeData(type, {
      lamports: params.lamports,
      space: params.space,
      programId: toBuffer(params.programId.toBuffer()),
    });

    return new TransactionInstruction({
      keys: [
        {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
        {pubkey: params.newAccountPubkey, isSigner: true, isWritable: true},
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that creates a new account anchored to a Bitcoin UTXO
   */
  static createAccountWithAnchor(
    params: CreateAccountWithAnchorParams,
  ): TransactionInstruction {
    const type = SYSTEM_INSTRUCTION_LAYOUTS.CreateWithAnchor;
    const data = encodeData(type, {
      lamports: params.lamports,
      space: params.space,
      programId: toBuffer(params.programId.toBuffer()),
      txid: Buffer.from(params.txid),
      vout: params.vout,
    });

    return new TransactionInstruction({
      keys: [
        {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
        {pubkey: params.newAccountPubkey, isSigner: true, isWritable: true},
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that anchors an existing account to a Bitcoin UTXO
   */
  static anchor(params: AnchorParams): TransactionInstruction {
    const type = SYSTEM_INSTRUCTION_LAYOUTS.Anchor;
    const data = encodeData(type, {
      txid: Buffer.from(params.txid),
      vout: params.vout,
    });

    return new TransactionInstruction({
      keys: [
        {pubkey: params.accountPubkey, isSigner: true, isWritable: true},
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that signs a Bitcoin transaction input
   */
  static signInput(params: SignInputParams): TransactionInstruction {
    const type = SYSTEM_INSTRUCTION_LAYOUTS.SignInput;
    const data = encodeData(type, {
      index: params.index,
    });

    return new TransactionInstruction({
      keys: [
        {pubkey: params.signerPubkey, isSigner: true, isWritable: false},
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that transfers lamports from one account to another
   */
  static transfer(
    params: TransferParams | TransferWithSeedParams,
  ): TransactionInstruction {
    let data;
    let keys;
    if ('basePubkey' in params) {
      const type = SYSTEM_INSTRUCTION_LAYOUTS.TransferWithSeed;
      data = encodeData(type, {
        lamports: BigInt(params.lamports),
        seed: params.seed,
        programId: toBuffer(params.programId.toBuffer()),
      });
      keys = [
        {pubkey: params.fromPubkey, isSigner: false, isWritable: true},
        {pubkey: params.basePubkey, isSigner: true, isWritable: false},
        {pubkey: params.toPubkey, isSigner: false, isWritable: true},
      ];
    } else {
      const type = SYSTEM_INSTRUCTION_LAYOUTS.Transfer;
      data = encodeData(type, {lamports: BigInt(params.lamports)});
      keys = [
        {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
        {pubkey: params.toPubkey, isSigner: false, isWritable: true},
      ];
    }

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that assigns an account to a program
   */
  static assign(
    params: AssignParams | AssignWithSeedParams,
  ): TransactionInstruction {
    let data;
    let keys;
    if ('basePubkey' in params) {
      const type = SYSTEM_INSTRUCTION_LAYOUTS.AssignWithSeed;
      data = encodeData(type, {
        base: toBuffer(params.basePubkey.toBuffer()),
        seed: params.seed,
        programId: toBuffer(params.programId.toBuffer()),
      });
      keys = [
        {pubkey: params.accountPubkey, isSigner: false, isWritable: true},
        {pubkey: params.basePubkey, isSigner: true, isWritable: false},
      ];
    } else {
      const type = SYSTEM_INSTRUCTION_LAYOUTS.Assign;
      data = encodeData(type, {
        programId: toBuffer(params.programId.toBuffer()),
      });
      keys = [{pubkey: params.accountPubkey, isSigner: true, isWritable: true}];
    }

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that creates a new account at
   *   an address generated with `from`, a seed, and programId
   */
  static createAccountWithSeed(
    params: CreateAccountWithSeedParams,
  ): TransactionInstruction {
    const type = SYSTEM_INSTRUCTION_LAYOUTS.CreateWithSeed;
    const data = encodeData(type, {
      base: toBuffer(params.basePubkey.toBuffer()),
      seed: params.seed,
      lamports: params.lamports,
      space: params.space,
      programId: toBuffer(params.programId.toBuffer()),
    });
    let keys = [
      {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
      {pubkey: params.newAccountPubkey, isSigner: false, isWritable: true},
    ];
    if (!params.basePubkey.equals(params.fromPubkey)) {
      keys.push({
        pubkey: params.basePubkey,
        isSigner: true,
        isWritable: false,
      });
    }

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Generate a transaction instruction that allocates space in an account without funding
   */
  static allocate(
    params: AllocateParams | AllocateWithSeedParams,
  ): TransactionInstruction {
    let data;
    let keys;
    if ('basePubkey' in params) {
      const type = SYSTEM_INSTRUCTION_LAYOUTS.AllocateWithSeed;
      data = encodeData(type, {
        base: toBuffer(params.basePubkey.toBuffer()),
        seed: params.seed,
        space: params.space,
        programId: toBuffer(params.programId.toBuffer()),
      });
      keys = [
        {pubkey: params.accountPubkey, isSigner: false, isWritable: true},
        {pubkey: params.basePubkey, isSigner: true, isWritable: false},
      ];
    } else {
      const type = SYSTEM_INSTRUCTION_LAYOUTS.Allocate;
      data = encodeData(type, {
        space: params.space,
      });
      keys = [{pubkey: params.accountPubkey, isSigner: true, isWritable: true}];
    }

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }
}
