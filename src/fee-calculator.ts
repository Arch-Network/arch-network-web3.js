/**
 * @deprecated Fee calculator is not used in Arch Network.
 * This module is retained for backward compatibility only.
 */
import * as BufferLayout from '@solana/buffer-layout';

/**
 * @internal
 * @deprecated
 */
export const FeeCalculatorLayout = BufferLayout.nu64('lamportsPerSignature');

/**
 * Calculator for transaction fees.
 *
 * @deprecated Not used in Arch Network.
 */
export interface FeeCalculator {
  /** Cost in lamports to validate a signature. */
  lamportsPerSignature: number;
}
