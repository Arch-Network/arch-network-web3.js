import {Message} from './legacy';
import {MessageV0} from './v0';

export type VersionedMessage = Message | MessageV0;
// eslint-disable-next-line no-redeclare
export const VersionedMessage = {
  /**
   * In Arch Network, the version is at the transaction level, not the message level.
   * Messages are always deserialized using the same format.
   */
  deserialize: (serializedMessage: Uint8Array): VersionedMessage => {
    return Message.from(serializedMessage);
  },
};
