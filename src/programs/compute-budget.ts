import * as BufferLayout from '@solana/buffer-layout';

import {
  encodeData,
  decodeData,
  InstructionType,
  IInstructionInputData,
} from '../instruction';
import {PublicKey} from '../publickey';
import {TransactionInstruction} from '../transaction';

/**
 * Compute Budget Instruction class
 */
export class ComputeBudgetInstruction {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Decode a compute budget instruction and retrieve the instruction type.
   */
  static decodeInstructionType(
    instruction: TransactionInstruction,
  ): ComputeBudgetInstructionType {
    this.checkProgramId(instruction.programId);

    const instructionTypeLayout = BufferLayout.u8('instruction');
    const typeIndex = instructionTypeLayout.decode(instruction.data);

    let type: ComputeBudgetInstructionType | undefined;
    for (const [ixType, layout] of Object.entries(
      COMPUTE_BUDGET_INSTRUCTION_LAYOUTS,
    )) {
      if (layout.index == typeIndex) {
        type = ixType as ComputeBudgetInstructionType;
        break;
      }
    }

    if (!type) {
      throw new Error(
        'Instruction type incorrect; not a ComputeBudgetInstruction',
      );
    }

    return type;
  }

  /**
   * Decode request heap frame compute budget instruction and retrieve the instruction params.
   */
  static decodeRequestHeapFrame(
    instruction: TransactionInstruction,
  ): RequestHeapFrameParams {
    this.checkProgramId(instruction.programId);
    const {bytes} = decodeData(
      COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.RequestHeapFrame,
      instruction.data,
    );
    return {bytes};
  }

  /**
   * Decode set compute unit limit compute budget instruction and retrieve the instruction params.
   */
  static decodeSetComputeUnitLimit(
    instruction: TransactionInstruction,
  ): SetComputeUnitLimitParams {
    this.checkProgramId(instruction.programId);
    const {units} = decodeData(
      COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.SetComputeUnitLimit,
      instruction.data,
    );
    return {units};
  }

  /**
   * @internal
   */
  static checkProgramId(programId: PublicKey) {
    if (!programId.equals(ComputeBudgetProgram.programId)) {
      throw new Error(
        'invalid instruction; programId is not ComputeBudgetProgram',
      );
    }
  }
}

/**
 * An enumeration of valid ComputeBudgetInstructionType's
 * Arch Network v0.6.1 discriminant ordering
 */
export type ComputeBudgetInstructionType =
  | 'RequestHeapFrame'
  | 'SetComputeUnitLimit';

type ComputeBudgetInstructionInputData = {
  RequestHeapFrame: IInstructionInputData & Readonly<RequestHeapFrameParams>;
  SetComputeUnitLimit: IInstructionInputData &
    Readonly<SetComputeUnitLimitParams>;
};

/**
 * Request heap frame instruction params
 */
export type RequestHeapFrameParams = {
  /** Requested transaction-wide program heap size in bytes. Must be multiple of 1024. Applies to each program, including CPIs. */
  bytes: number;
};

/**
 * Set compute unit limit instruction params
 */
export interface SetComputeUnitLimitParams {
  /** Transaction-wide compute unit limit */
  units: number;
}

/**
 * An enumeration of valid ComputeBudget InstructionType's
 * Arch Network v0.6.1 discriminant ordering
 * @internal
 */
export const COMPUTE_BUDGET_INSTRUCTION_LAYOUTS = Object.freeze<{
  [Instruction in ComputeBudgetInstructionType]: InstructionType<
    ComputeBudgetInstructionInputData[Instruction]
  >;
}>({
  RequestHeapFrame: {
    index: 0,
    layout: BufferLayout.struct<
      ComputeBudgetInstructionInputData['RequestHeapFrame']
    >([BufferLayout.u8('instruction'), BufferLayout.u32('bytes')]),
  },
  SetComputeUnitLimit: {
    index: 1,
    layout: BufferLayout.struct<
      ComputeBudgetInstructionInputData['SetComputeUnitLimit']
    >([BufferLayout.u8('instruction'), BufferLayout.u32('units')]),
  },
});

/**
 * Factory class for transaction instructions to interact with the Compute Budget program
 */
export class ComputeBudgetProgram {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the Compute Budget program
   */
  static programId: PublicKey = new PublicKey(
    'ComputeBudget111111111111111111111111111111',
  );

  static requestHeapFrame(
    params: RequestHeapFrameParams,
  ): TransactionInstruction {
    const type = COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.RequestHeapFrame;
    const data = encodeData(type, params);
    return new TransactionInstruction({
      keys: [],
      programId: this.programId,
      data,
    });
  }

  static setComputeUnitLimit(
    params: SetComputeUnitLimitParams,
  ): TransactionInstruction {
    const type = COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.SetComputeUnitLimit;
    const data = encodeData(type, params);
    return new TransactionInstruction({
      keys: [],
      programId: this.programId,
      data,
    });
  }
}
