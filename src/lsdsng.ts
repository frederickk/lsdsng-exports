export interface Clock {
  hours: number;
  minutes: number;
  total: {
    days: number;
    hours: number;
    minutes: number;
    checksum: number;
  };
}

export interface Options {
  keydelay: number;
  keyrepeat: number;
  font: number;
  syncsetting: number;
  colorset: number;
  clone: number;
  powersave: number;
  prelisten: number;
  wavesynthoverwrite: any[];
}

export interface SongChains {
  pu1: any[];
  pu2: any[];
  wav: any[];
  noi: any[];
}

export interface Chains {
  allocation: any[];
  phrases: any[];
  transpose: any[];
}

export interface Phrases {
  allocation: any[];
  notes: any[];
  fx: any[];
  fxval: any[];
  instruments: any[];
}

export interface Tables {
  allocation: any[];
  envelope: any[];
  transpose: any[];
  fx: any[];
  fxval: any[];
  fx2: any[];
  fx2val: any[];
}

export interface Speech {
  words: any[];
  wordnames: any[];
}

export interface Instruments {
  allocation: any[];
  names: any[];
  params: any[];
  speech: Speech;
  softsynthparams: any[];
  waveframes: any[];
}

export interface LsdsngObj {
  name: any[];
  ver: number;
  version: number;
  initflags: any[];
  tempo: number;
  tunesetting: number;
  filechanged: number;
  clock: Clock;
  options: Options;
  songchains: SongChains | any;
  chains: Chains;
  phrases: Phrases;
  tables: Tables;
  instruments: Instruments;
  bookmarks: any[];
  grooves: any[];
}

export const deltaTime = (time: number): number[] => {
  let vlq: number = time & 0x7f;
  const outBytes: number[] = [];

  if (time === 0) {
    return [0];
  }
  while (time > 0) {
    time = time >> 7;
    outBytes.unshift(vlq);
    vlq = (time & 0x7f) | 0x80;
  }

  return outBytes;
}

export const toBytes = (num: number, len: number): number[] => {
  const arr: number[] = [];
  for (let i = (len - 1) * 8; i >= 0; i -= 8) {
    arr.push((num >> i) & 0xff);
  }

  return arr;
}

export const getVersionEffects = (data: LsdsngObj): string[] => {
  const output = ["-", "A"];

  if (data.version > 7) {
    output.push("B");
  }

  return output.concat([
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "K",
    "L",
    "M",
    "O",
    "P",
    "R",
    "S",
    "T",
    "V",
    "Z"
  ]);
}


// base object for all data
const lsdsng: LsdsngObj = {
  name: [],
  ver: 0,
  version: 0,
  initflags: [],
  tempo: 0,
  tunesetting: 0,
  filechanged: 0,
  clock: {
    hours: 0,
    minutes: 0,
    total: {
      days: 0,
      hours: 0,
      minutes: 0,
      checksum: 0
    }
  },
  options: {
    keydelay: 0,
    keyrepeat: 0,
    font: 0,
    syncsetting: 0,
    colorset: 0,
    clone: 0,
    powersave: 0,
    prelisten: 0,
    wavesynthoverwrite: []
  },
  songchains: {
    pu1: [],
    pu2: [],
    wav: [],
    noi: []
  },
  chains: {
    allocation: [],
    phrases: [],
    transpose: []
  },
  phrases: {
    allocation: [],
    notes: [],
    fx: [],
    fxval: [],
    instruments: []
  },
  tables: {
    allocation: [],
    envelope: [],
    transpose: [],
    fx: [],
    fxval: [],
    fx2: [],
    fx2val: []
  },
  instruments: {
    allocation: [],
    names: [],
    params: [],
    speech: {
      words: [],
      wordnames: []
    },
    softsynthparams: [],
    waveframes: []
  },
  bookmarks: [],
  grooves: []
};

export default lsdsng;