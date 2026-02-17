/**
 * Maximum over-the-wire size of a Transaction (Arch Network limit)
 */
export const PACKET_DATA_SIZE = 10240;

export const VERSION_PREFIX_MASK = 0x7f;

export const SIGNATURE_LENGTH_IN_BYTES = 64;

/** Maximum number of signers allowed per transaction */
export const MAX_SIGNERS = 16;

/** Maximum number of instructions allowed per transaction */
export const MAX_INSTRUCTION_COUNT = 255;

/** Maximum number of transactions allowed in a batch send */
export const MAX_TX_BATCH_SIZE = 100;

/** Current transaction version */
export const TRANSACTION_VERSION = 0;
