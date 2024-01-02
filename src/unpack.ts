import { BLOCKSIZE, DEFAULT_INSTRUMENT, DEFAULT_WAV } from './defaults';
import lsdsng, { LsdsngObj } from './lsdsng';

const unpack = (data: Buffer): LsdsngObj => {
  const lsdsngObj: LsdsngObj = JSON.parse(JSON.stringify(lsdsng));
  const decompressedData = [];

  let bank = 0;

  // set name (first 8 bytes)
  let name = data.slice(0, 8);
  lsdsngObj.name = [...name];

  // set ver (9th byte)
  lsdsngObj.ver = data.readUInt8(8);

  // slice the buffer for unpacking based on LSDSNG spec noted at the top
  data = data.slice(9);
  let i = 0;

  // start unpacking
  // pretty hacky, just start unpacking until we get to 32768 bytes which might support lsdprj files?
  while (decompressedData.length < 32768) {
    // if you reach a special byte
    if (data[i] == 0xc0) {
      // if you reach a special byte twice in a row
      // add that byte to the decompressed data
      if (data[i + 1] == 0xc0) {
        decompressedData.push(0xc0);
        i += 2;
      }
      // otherwise repeat data[i+1] into decompressedData, data[i+2] times
      else {
        for (let j = 0; j < data[i + 2]; j++) {
          decompressedData.push(data[i + 1]);
        }
        i += 3;
      }
    }
    // if you reach a special byte
    else if (data[i] == 0xe0) {
      // if you reach a special byte twice in a row
      // add that byte to the decompressed data
      if (data[i + 1] == 0xe0) {
        decompressedData.push(0xe0);
        i += 2;
      }
      // otherwise if following byte == 0xf1,
      // add DEFAULT_INSTRUMENT to decompressedData, data[i+2] times
      else if (data[i + 1] == 0xf1) {
        for (let j = 0; j < data[i + 2]; j++) {
          decompressedData.push(...DEFAULT_INSTRUMENT);
        }
        i += 3;
      }
      // otherwise if following byte == 0xf0,
      // add DEFAULT_WAV to decompressedData, data[i+2] times
      else if (data[i + 1] == 0xf0) {
        for (let j = 0; j < data[i + 2]; j++) {
          decompressedData.push(...DEFAULT_WAV);
        }
        i += 3;
      }
      // otherwise if following byte == 0xff
      // end of file reached, break
      else if (data[i + 1] == 0xff) {
        break;
      }
      // else, increment bank and increment i to the next bank
      else {
        bank++;
        i = bank * BLOCKSIZE;
      }
    }
    // if there was no special byte, just add the byte to decompressedData
    else {
      decompressedData.push(data[i]);
      i++;
    }
  }
  // check file size, should be 32768
  // if (decompressedData.length != 32768) {
  //   throw "Error processing file.";
  // }

  // start categorizing the data that was unpacked as per LSDSNG Spec
  i = 0;
  // phrase notes
  for (i; i < 0x0ff0; i += 16) {
    lsdsngObj.phrases.notes.push(decompressedData.slice(i, i + 16));
  }
  // bookmarks
  for (i; i < 0x1030; i += 64) {
    lsdsngObj.bookmarks = decompressedData.slice(i, i + 64);
  }
  // 96 bytes empty data, skip it
  i += 96;
  // grooves
  for (i; i < 0x1290; i += 16) {
    lsdsngObj.grooves.push(decompressedData.slice(i, i + 16));
  }
  // chains
  for (i; i < 0x1690; i += 4) {
    lsdsngObj.songchains.pu1.push(decompressedData[i]);
    lsdsngObj.songchains.pu2.push(decompressedData[i + 1]);
    lsdsngObj.songchains.wav.push(decompressedData[i + 2]);
    lsdsngObj.songchains.noi.push(decompressedData[i + 3]);
  }
  // tables.envelope
  for (i; i < 0x1890; i += 16) {
    lsdsngObj.tables.envelope.push(decompressedData.slice(i, i + 16));
  }
  // speech.words
  for (i; i < 0x1dd0; i += 32) {
    lsdsngObj.instruments.speech.words.push(decompressedData.slice(i, i + 32));
  }
  // speech.wordnames
  for (i; i < 0x1e78; i += 4) {
    lsdsngObj.instruments.speech.wordnames.push(
      decompressedData.slice(i, i + 4)
    );
  }
  // skip 2 bytes empty data
  i += 2;
  // instruments.names
  for (i; i < 0x1fba; i += 5) {
    lsdsngObj.instruments.names.push(decompressedData.slice(i, i + 5));
  }
  // skip 102 bytes empty data
  i += 102;
  // tables.allocation
  lsdsngObj.tables.allocation = decompressedData.slice(i, (i += 32));
  // instruments.allocation
  lsdsngObj.instruments.allocation = decompressedData.slice(i, (i += 64));
  // chains.phrases
  for (i; i < 0x2880; i += 16) {
    lsdsngObj.chains.phrases.push(decompressedData.slice(i, i + 16));
  }
  // chains.transpose
  for (i; i < 0x3080; i += 16) {
    lsdsngObj.chains.transpose.push(decompressedData.slice(i, i + 16));
  }
  // instruments.params
  for (i; i < 0x3480; i += 16) {
    lsdsngObj.instruments.params.push(decompressedData.slice(i, i + 16));
  }
  // tables.transpose
  for (i; i < 0x3680; i += 16) {
    lsdsngObj.tables.transpose.push(decompressedData.slice(i, i + 16));
  }
  // tables.fx
  for (i; i < 0x3880; i += 16) {
    lsdsngObj.tables.fx.push(decompressedData.slice(i, i + 16));
  }
  // tables.fxval
  for (i; i < 0x3a80; i += 16) {
    lsdsngObj.tables.fxval.push(decompressedData.slice(i, i + 16));
  }
  // tables.fx2
  for (i; i < 0x3c80; i += 16) {
    lsdsngObj.tables.fx2.push(decompressedData.slice(i, i + 16));
  }
  // tables.fx2val
  for (i; i < 0x3e80; i += 16) {
    lsdsngObj.tables.fx2val.push(decompressedData.slice(i, i + 16));
  }
  // initflags
  lsdsngObj.initflags.push(decompressedData.slice(i, (i += 2)));
  // phrases.allocation
  lsdsngObj.phrases.allocation = decompressedData.slice(i, (i += 32));
  // chains.allocation
  lsdsngObj.chains.allocation = decompressedData.slice(i, (i += 16));
  // instruments.softsynthparams
  for (i; i < 0x3fb2; i += 16) {
    lsdsngObj.instruments.softsynthparams.push(
      decompressedData.slice(i, i + 16)
    );
  }
  // clock.hours
  lsdsngObj.clock.hours = decompressedData[i++];
  // clock.minutes
  lsdsngObj.clock.minutes = decompressedData[i++];
  // tempo
  lsdsngObj.tempo = decompressedData[i++];
  // tunesetting
  lsdsngObj.tunesetting = decompressedData[i++];
  // clock.total.days
  lsdsngObj.clock.total.days = decompressedData[i++];
  // clock.total.hours
  lsdsngObj.clock.total.hours = decompressedData[i++];
  // clock.total.minutes
  lsdsngObj.clock.total.minutes = decompressedData[i++];
  //clock.total.checksum
  lsdsngObj.clock.total.checksum = decompressedData[i++];
  // options.keydelay
  lsdsngObj.options.keydelay = decompressedData[i++];
  // options.keyrepeat
  lsdsngObj.options.keyrepeat = decompressedData[i++];
  // options.font
  lsdsngObj.options.font = decompressedData[i++];
  // options.syncsetting
  lsdsngObj.options.syncsetting = decompressedData[i++];
  // options.colorset
  lsdsngObj.options.colorset = decompressedData[i++];

  // skip 1 byte empty data
  i++;

  // options.clone
  lsdsngObj.options.clone = decompressedData[i++];
  // filechanged
  lsdsngObj.filechanged = decompressedData[i++];
  // options.powersave
  lsdsngObj.options.powersave = decompressedData[i++];
  // options.prelisten
  lsdsngObj.options.prelisten = decompressedData[i++];
  // options.wavesynthoverwrite
  lsdsngObj.options.wavesynthoverwrite = decompressedData.slice(i, (i += 2));

  // skip 58 bytes empty data
  i += 58;

  // phrases.fx
  for (i; i < 0x4ff0; i += 16) {
    lsdsngObj.phrases.fx.push(decompressedData.slice(i, i + 16));
  }
  // phrases.fxval
  for (i; i < 0x5fe0; i += 16) {
    lsdsngObj.phrases.fxval.push(decompressedData.slice(i, i + 16));
  }

  // skip 32 bytes empty data
  i += 32;

  // instruments.waveframes
  for (i; i < 0x7000; i += 16) {
    lsdsngObj.instruments.waveframes.push(decompressedData.slice(i, i + 16));
  }
  // phrases.instruments
  for (i; i < 0x7ff0; i += 16) {
    lsdsngObj.phrases.instruments.push(decompressedData.slice(i, i + 16));
  }
  // initflags
  lsdsngObj.initflags.push(decompressedData.slice(i, (i += 2)));

  // skip 13 bytes empty data
  i += 13;

  // version
  lsdsngObj.version = decompressedData[i++];

  return lsdsngObj;
};

export default unpack;