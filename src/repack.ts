import { LsdsngObj } from './lsdsng';

const repack = (lsdsngObj: LsdsngObj): Buffer => {
  const buffer: Buffer = Buffer.alloc(32768);

  // set name (first 8 bytes)
  let nameBuffer = Buffer.from(lsdsngObj.name);
  nameBuffer.copy(buffer, 0, 0, 8);

  // set ver (9th byte)
  let verBuffer = Buffer.from(String(lsdsngObj.ver));
  verBuffer.copy(buffer, 0, 0, 9);

  return Buffer.from(buffer)
}