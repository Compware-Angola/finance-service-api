import { randomBytes } from 'crypto';

export  async function generateReferenceNumber(): Promise<string> {
  const randomBuffer = randomBytes(4);
  const randomInt = randomBuffer.readUInt32BE(0);

  const nineDigitNumber = randomInt % 1_000_000_000;
  return nineDigitNumber.toString().padStart(9, '0');
}
