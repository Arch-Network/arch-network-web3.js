import {Buffer} from 'buffer';

import {Signer} from '../keypair';
import assert from '../utils/assert';
import {VersionedMessage} from '../message/versioned';
import {SIGNATURE_LENGTH_IN_BYTES, TRANSACTION_VERSION, PACKET_DATA_SIZE} from './constants';
import {sign} from '../utils/ed25519';
import {PublicKey} from '../publickey';

export type TransactionVersion = 'legacy' | 0;

/**
 * Versioned transaction class
 */
export class VersionedTransaction {
  signatures: Array<Uint8Array>;
  message: VersionedMessage;

  get version(): TransactionVersion {
    return this.message.version;
  }

  constructor(message: VersionedMessage, signatures?: Array<Uint8Array>) {
    if (signatures !== undefined) {
      assert(
        signatures.length === message.header.numRequiredSignatures,
        'Expected signatures length to be equal to the number of required signatures',
      );
      this.signatures = signatures;
    } else {
      const defaultSignatures = [];
      for (let i = 0; i < message.header.numRequiredSignatures; i++) {
        defaultSignatures.push(new Uint8Array(SIGNATURE_LENGTH_IN_BYTES));
      }
      this.signatures = defaultSignatures;
    }
    this.message = message;
  }

  /**
   * Arch Network wire format:
   * [version: u32 LE (4 bytes)] [sig_count: u8 (1 byte)] [sig_1..sig_n (64 bytes each)] [message_bytes]
   */
  serialize(): Uint8Array {
    const serializedMessage = this.message.serialize();

    const versionSize = 4;
    const sigCountSize = 1;
    const totalLength =
      versionSize +
      sigCountSize +
      this.signatures.length * SIGNATURE_LENGTH_IN_BYTES +
      serializedMessage.length;

    const buf = Buffer.alloc(totalLength);
    let offset = 0;

    buf.writeUInt32LE(TRANSACTION_VERSION, offset);
    offset += 4;

    buf.writeUInt8(this.signatures.length, offset);
    offset += 1;

    for (const sig of this.signatures) {
      Buffer.from(sig).copy(buf, offset);
      offset += SIGNATURE_LENGTH_IN_BYTES;
    }

    Buffer.from(serializedMessage).copy(buf, offset);

    assert(
      buf.length <= PACKET_DATA_SIZE,
      `Transaction too large: ${buf.length} > ${PACKET_DATA_SIZE}`,
    );

    return new Uint8Array(buf);
  }

  /**
   * Deserialize Arch Network wire format:
   * [version: u32 LE (4 bytes)] [sig_count: u8 (1 byte)] [sig_1..sig_n (64 bytes each)] [message_bytes]
   */
  static deserialize(serializedTransaction: Uint8Array): VersionedTransaction {
    const buf = Buffer.from(serializedTransaction);
    let offset = 0;

    const _version = buf.readUInt32LE(offset);
    offset += 4;

    const signaturesLength = buf.readUInt8(offset);
    offset += 1;

    const signatures = [];
    for (let i = 0; i < signaturesLength; i++) {
      signatures.push(
        new Uint8Array(buf.slice(offset, offset + SIGNATURE_LENGTH_IN_BYTES)),
      );
      offset += SIGNATURE_LENGTH_IN_BYTES;
    }

    const messageBytes = new Uint8Array(buf.slice(offset));
    const message = VersionedMessage.deserialize(messageBytes);
    return new VersionedTransaction(message, signatures);
  }

  sign(signers: Array<Signer>) {
    const messageData = this.message.serialize();
    const signerPubkeys = this.message.staticAccountKeys.slice(
      0,
      this.message.header.numRequiredSignatures,
    );
    for (const signer of signers) {
      const signerIndex = signerPubkeys.findIndex(pubkey =>
        pubkey.equals(signer.publicKey),
      );
      assert(
        signerIndex >= 0,
        `Cannot sign with non signer key ${signer.publicKey.toBase58()}`,
      );
      this.signatures[signerIndex] = sign(messageData, signer.secretKey);
    }
  }

  addSignature(publicKey: PublicKey, signature: Uint8Array) {
    assert(signature.byteLength === 64, 'Signature must be 64 bytes long');
    const signerPubkeys = this.message.staticAccountKeys.slice(
      0,
      this.message.header.numRequiredSignatures,
    );
    const signerIndex = signerPubkeys.findIndex(pubkey =>
      pubkey.equals(publicKey),
    );
    assert(
      signerIndex >= 0,
      `Can not add signature; \`${publicKey.toBase58()}\` is not required to sign this transaction`,
    );
    this.signatures[signerIndex] = signature;
  }
}
