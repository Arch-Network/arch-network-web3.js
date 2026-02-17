import {Buffer} from 'buffer';
import {expect} from 'chai';

import {Keypair} from '../src/keypair';
import {PublicKey} from '../src/publickey';
import {
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '../src/transaction';
import {Message} from '../src/message';
import {SystemProgram} from '../src/programs';
import {
  PACKET_DATA_SIZE,
  SIGNATURE_LENGTH_IN_BYTES,
  MAX_SIGNERS,
  MAX_INSTRUCTION_COUNT,
  MAX_TX_BATCH_SIZE,
  TRANSACTION_VERSION,
} from '../src/transaction/constants';

describe('Arch Network v0.6.1', () => {
  describe('Constants', () => {
    it('has correct PACKET_DATA_SIZE', () => {
      expect(PACKET_DATA_SIZE).to.equal(10240);
    });

    it('has correct MAX_SIGNERS', () => {
      expect(MAX_SIGNERS).to.equal(16);
    });

    it('has correct MAX_INSTRUCTION_COUNT', () => {
      expect(MAX_INSTRUCTION_COUNT).to.equal(255);
    });

    it('has correct MAX_TX_BATCH_SIZE', () => {
      expect(MAX_TX_BATCH_SIZE).to.equal(100);
    });

    it('has correct TRANSACTION_VERSION', () => {
      expect(TRANSACTION_VERSION).to.equal(0);
    });
  });

  describe('Transaction Serialization', () => {
    it('serializes with 4-byte version prefix and 1-byte sig count', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const recentBlockhash = Keypair.generate().publicKey.toBase58();

      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      });
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: 1000,
        }),
      );
      transaction.sign(from);

      const serialized = transaction.serialize();
      const buf = Buffer.from(serialized);

      const version = buf.readUInt32LE(0);
      expect(version).to.equal(0);

      const sigCount = buf.readUInt8(4);
      expect(sigCount).to.equal(1);

      const signatureStart = 5;
      const signature = buf.slice(
        signatureStart,
        signatureStart + SIGNATURE_LENGTH_IN_BYTES,
      );
      expect(signature.length).to.equal(64);
    });

    it('roundtrips serialize/deserialize', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const recentBlockhash = Keypair.generate().publicKey.toBase58();

      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      });
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: 42,
        }),
      );
      transaction.sign(from);

      const serialized = transaction.serialize();
      const deserialized = Transaction.from(serialized);

      expect(deserialized.recentBlockhash).to.equal(recentBlockhash);
      expect(deserialized.feePayer?.toBase58()).to.equal(
        from.publicKey.toBase58(),
      );
      expect(deserialized.instructions.length).to.equal(1);
      expect(deserialized.signatures.length).to.equal(1);
    });
  });

  describe('Message Serialization', () => {
    it('serializes account keys count as u32 LE', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const recentBlockhash = Keypair.generate().publicKey.toBase58();

      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      });
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: 100,
        }),
      );
      transaction.feePayer = from.publicKey;
      const message = transaction.compileMessage();
      const serialized = message.serialize();
      const buf = Buffer.from(serialized);

      const numRequiredSignatures = buf.readUInt8(0);
      expect(numRequiredSignatures).to.equal(1);

      const accountCount = buf.readUInt32LE(3);
      expect(accountCount).to.equal(3);
    });

    it('roundtrips Message serialize/from', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const recentBlockhash = Keypair.generate().publicKey.toBase58();

      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      });
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: 500,
        }),
      );
      transaction.feePayer = from.publicKey;
      const message = transaction.compileMessage();
      const serialized = message.serialize();

      const deserialized = Message.from(serialized);
      expect(deserialized.recentBlockhash).to.equal(recentBlockhash);
      expect(deserialized.accountKeys.length).to.equal(3);
      expect(deserialized.instructions.length).to.equal(1);
      expect(deserialized.header.numRequiredSignatures).to.equal(
        message.header.numRequiredSignatures,
      );
    });
  });

  describe('System Program Instructions', () => {
    it('CreateAccount uses discriminant 0', () => {
      const from = Keypair.generate();
      const newAccount = Keypair.generate();
      const ix = SystemProgram.createAccount({
        fromPubkey: from.publicKey,
        newAccountPubkey: newAccount.publicKey,
        lamports: 1000,
        space: 100,
        programId: SystemProgram.programId,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(0);
    });

    it('CreateAccountWithAnchor uses discriminant 1', () => {
      const from = Keypair.generate();
      const newAccount = Keypair.generate();
      const txid = Buffer.alloc(32, 0xab);
      const ix = SystemProgram.createAccountWithAnchor({
        fromPubkey: from.publicKey,
        newAccountPubkey: newAccount.publicKey,
        lamports: 1000,
        space: 100,
        programId: SystemProgram.programId,
        txid,
        vout: 0,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(1);
      expect(ix.keys.length).to.equal(2);
    });

    it('Assign uses discriminant 2', () => {
      const account = Keypair.generate();
      const ix = SystemProgram.assign({
        accountPubkey: account.publicKey,
        programId: SystemProgram.programId,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(2);
    });

    it('Anchor uses discriminant 3', () => {
      const account = Keypair.generate();
      const txid = Buffer.alloc(32, 0xcd);
      const ix = SystemProgram.anchor({
        accountPubkey: account.publicKey,
        txid,
        vout: 1,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(3);
      expect(ix.keys.length).to.equal(1);
      expect(ix.keys[0].isSigner).to.be.true;
      expect(ix.keys[0].isWritable).to.be.true;
    });

    it('SignInput uses discriminant 4', () => {
      const signer = Keypair.generate();
      const ix = SystemProgram.signInput({
        signerPubkey: signer.publicKey,
        index: 0,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(4);
      expect(ix.keys.length).to.equal(1);
      expect(ix.keys[0].isSigner).to.be.true;
      expect(ix.keys[0].isWritable).to.be.false;
    });

    it('Transfer uses discriminant 5', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const ix = SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to.publicKey,
        lamports: 1000,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(5);
    });

    it('Allocate uses discriminant 6', () => {
      const account = Keypair.generate();
      const ix = SystemProgram.allocate({
        accountPubkey: account.publicKey,
        space: 100,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(6);
    });

    it('CreateAccountWithSeed uses discriminant 7', () => {
      const from = Keypair.generate();
      const newAccount = Keypair.generate();
      const ix = SystemProgram.createAccountWithSeed({
        fromPubkey: from.publicKey,
        newAccountPubkey: newAccount.publicKey,
        basePubkey: from.publicKey,
        seed: 'test',
        lamports: 1000,
        space: 100,
        programId: SystemProgram.programId,
      });

      const discriminant = ix.data.readUInt32LE(0);
      expect(discriminant).to.equal(7);
    });
  });

  describe('VersionedTransaction Serialization', () => {
    it('serializes with 4-byte version prefix', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const recentBlockhash = Keypair.generate().publicKey.toBase58();

      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      });
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: 100,
        }),
      );
      transaction.feePayer = from.publicKey;

      const message = transaction.compileMessage();
      const versioned = new VersionedTransaction(message);
      versioned.sign([from]);

      const serialized = versioned.serialize();
      const buf = Buffer.from(serialized);

      const version = buf.readUInt32LE(0);
      expect(version).to.equal(0);

      const sigCount = buf.readUInt8(4);
      expect(sigCount).to.equal(1);
    });

    it('roundtrips VersionedTransaction serialize/deserialize', () => {
      const from = Keypair.generate();
      const to = Keypair.generate();
      const recentBlockhash = Keypair.generate().publicKey.toBase58();

      const transaction = new Transaction({
        blockhash: recentBlockhash,
        lastValidBlockHeight: 9999,
      });
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to.publicKey,
          lamports: 100,
        }),
      );
      transaction.feePayer = from.publicKey;

      const message = transaction.compileMessage();
      const versioned = new VersionedTransaction(message);
      versioned.sign([from]);

      const serialized = versioned.serialize();
      const deserialized = VersionedTransaction.deserialize(serialized);

      expect(deserialized.signatures.length).to.equal(1);
      expect(deserialized.message.staticAccountKeys.length).to.equal(3);
    });
  });
});
