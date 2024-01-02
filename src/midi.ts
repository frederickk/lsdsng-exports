import { CHANS, MIDIOFFSET } from './defaults';
import { LsdsngObj, deltaTime, getVersionEffects, toBytes } from './lsdsng';

function findCommandInTable(lsdsngObj: LsdsngObj, instrument: number, com: number) {
  if (instrument > 0x3f) {
    return Number.MAX_VALUE;
  }
  let table = lsdsngObj.instruments.params[instrument][6] - 32;
  if (table >= 0) {
    for (let i = 0; i < 16; i++) {
      if (lsdsngObj.tables.fx[table][i] === com) {
        return i + lsdsngObj.tables.fxval[table][i];
      } else if (lsdsngObj.tables.fx2[table][i] === com) {
        return i + lsdsngObj.tables.fx2val[table][i];
      }
    }
  }

  return Number.MAX_VALUE;
}

function compare(a: any, b: any) {
  let comparison = 0;
  if (a.time > b.time) {
    comparison = 1;
  } else if (a.time < b.time) {
    comparison = -1;
  }
  return comparison;
}

const processTempoMetaTrack = (metaEventList: any[], tempoAdjust: number) => {
  let prefix = [0xff, 0x51, 0x03];
  let sortedEvents = [];
  let trackOutput = [];
  let seen: any = {};
  for (let i = 0; i < metaEventList.length; i++) {
    let temp =
      String(metaEventList[i].time) +
      String(metaEventList[i].type) +
      String(metaEventList[i].val);
    if (!(temp in seen)) {
      seen[temp] = true;
      sortedEvents.push(metaEventList[i]);
    }
  }
  sortedEvents = sortedEvents.sort(compare);
  let lastEvent = sortedEvents[0];
  trackOutput.push(
    ...deltaTime(lastEvent.time + 5),
    ...prefix,
    ...toBytes(
      Math.round((1 / ((lastEvent.val * tempoAdjust) / 60)) * 1000000),
      3
    )
  );
  for (let i = 1; i < sortedEvents.length; i++) {
    let currEvent = sortedEvents[i];
    trackOutput.push(
      ...deltaTime(currEvent.time - lastEvent.time),
      ...prefix,
      ...toBytes(
        Math.round((1 / ((currEvent.val * tempoAdjust) / 60)) * 1000000),
        3
      )
    );
    lastEvent = currEvent;
  }
  return trackOutput;
}

const makeMidi = (ldsnsngObj: LsdsngObj) => {
  const EFFECTS = getVersionEffects(ldsnsngObj);

  let grooveSum = 0;
  let grooveLength = 16;
  for (let i = 0; i < 16; i++) {
    grooveSum += ldsnsngObj.grooves[0][i];
    if (ldsnsngObj.grooves[0][i] === 0) {
      grooveLength = i;
      break;
    }
  }
  let ticksPerQuarter = toBytes(((grooveSum * 1.0) / grooveLength) * 80, 2);
  let adjustedTempo = (ldsnsngObj.tempo * grooveLength * 6.0) / grooveSum;
  let midiTempo = Math.round((1 / (adjustedTempo / 60.0)) * 1000000);
  let tracks: number[][] = [];
  let trackLength;
  // standard midi file header for multitrack with 5 tracks (1st track is just tempo and general midi info)
  let mThd = [
    0x4d,
    0x54,
    0x68,
    0x64,
    0x00,
    0x00,
    0x00,
    0x06,
    0x00,
    0x01,
    0x00,
    0x05,
    ...ticksPerQuarter
  ];
  // standard midi track header
  let mTrk = [0x4d, 0x54, 0x72, 0x6b];
  // time signature and key signature data
  let metaTrack = [
    0x00,
    0xff,
    0x58,
    0x04,
    0x04,
    0x02,
    0x18,
    0x08,
    0x00,
    0xff,
    0x59,
    0x02,
    0x00,
    0x00
  ];
  // Throw midi tempo into the initial midi data
  metaTrack.push(...[0x00, 0xff, 0x51, 0x03, ...toBytes(midiTempo, 3)]);
  let currEvent: any;
  let lastEvent: any;
  let eventList: any[][] = [];
  let metaEventList: any[] = [];
  // loop through channels
  for (let channel = 0; channel < 4; channel++) {
    console.log('Processing channel ' + CHANS[channel]);
    // keep track of time since last event
    let lastEventTime = 0;
    let currNote;
    let currInstrument;
    let noteKillTime;
    let delayTime;
    let groove = 0;
    let grooveStep = 0;
    lastEvent = {
      time: 0
    };
    // create new array for the current track
    tracks.push([]);
    eventList.push([]);
    eventList[channel].push(lastEvent);
    // add track name (just the number of the track)
    tracks[channel].push(0x00, 0xff, 0x03, 0x01, channel + 0x31);
    let currChan = CHANS[channel];
    // loop through chains
    let startOffset = 0;
    let hopsLeft = 0;
    for (let i = 0; i < 254; i++) {
      let currChain = ldsnsngObj.songchains[currChan][i];
      if (currChain != 255) {
        console.log('-- Processing chain ' + currChain.toString(16));
        // loop through phrases
        for (let j = 0; j < 16; j++) {
          let currPhrase = ldsnsngObj.chains.phrases[currChain][j];
          let transpose = ldsnsngObj.chains.transpose[currChain][j];
          if (transpose > 127) {
            transpose = transpose - 256;
          }
          if (currPhrase != 255) {
            console.log('---- Processing phrase ' + currPhrase.toString(16));
            // loop through notes and create events for all note starts
            for (let k = 0; k < 16; k++) {
              console.log('------ Processing note row ' + k.toString(16));
              if (EFFECTS[ldsnsngObj.phrases.fx[currPhrase][k]] === 'H') {
                if (ldsnsngObj.phrases.fxval[currPhrase][k] < 0x10) {
                  startOffset = ldsnsngObj.phrases.fxval[currPhrase][k];
                  k += 16;
                } else {
                  startOffset = ldsnsngObj.phrases.fxval[currPhrase][k] % 16;
                  hopsLeft = ldsnsngObj.phrases.fxval[currPhrase][k] / 16;
                  console.log(hopsLeft);
                  k += 16;
                }
              } else {
                if (EFFECTS[ldsnsngObj.phrases.fx[currPhrase][k]] === 'T') {
                  metaEventList.push({
                    time: lastEventTime,
                    type: 'Tempo',
                    val: ldsnsngObj.phrases.fxval[currPhrase][k]
                  });
                }
                if (EFFECTS[ldsnsngObj.phrases.fx[currPhrase][k]] === 'G') {
                  groove = ldsnsngObj.phrases.fxval[currPhrase][k];
                  grooveStep = 0;
                }
                if (ldsnsngObj.grooves[groove][grooveStep] === 0 || grooveStep > 15) {
                  grooveStep = 0;
                }
                currNote = ldsnsngObj.phrases.notes[currPhrase][k];
                if (currNote != 0) {
                  if (ldsnsngObj.phrases.instruments[currPhrase][k] != 255) {
                    currInstrument = ldsnsngObj.phrases.instruments[currPhrase][k];
                  }
                  if (currInstrument === 0x40 || ldsnsngObj.instruments.params[currInstrument][5] & 32) {
                    currNote += MIDIOFFSET;
                  } else {
                    currNote += MIDIOFFSET + transpose;
                  }
                  if (EFFECTS[ldsnsngObj.phrases.fx[currPhrase][k]] === 'D') {
                    delayTime = 20 * ldsnsngObj.phrases.fxval[currPhrase][k];
                  } else {
                    delayTime = 0;
                  }
                  noteKillTime =
                    20 * findCommandInTable(ldsnsngObj, currInstrument, 8);
                  currEvent = {
                    time: lastEventTime + delayTime,
                    note: currNote,
                    kill: noteKillTime
                  };
                  if (currEvent.time <= lastEvent.time) {
                    eventList[channel].pop();
                  }
                  eventList[channel].push(currEvent);
                  lastEvent = eventList[channel][eventList[channel].length - 1];
                }
                if (EFFECTS[ldsnsngObj.phrases.fx[currPhrase][k]] === 'K') {
                  eventList[channel][
                    eventList[channel].length - 1
                  ].kill = Math.min(
                    ldsnsngObj.phrases.fxval[currPhrase][k] * 20,
                    lastEvent.kill
                  );
                }
                lastEventTime += 20 * ldsnsngObj.grooves[groove][grooveStep];
                grooveStep += 1;
              }
            }
          }
          // skip to next chain upon first blank phrase row
          else {
            j += 16;
          }
        }
      }
    }
    // process note off and write the track
    lastEvent = eventList[channel][0];
    tracks[channel].push(
      ...[...deltaTime(0x0), 0x90 + channel, lastEvent.note, 0x70]
    );
    for (let event = 1; event < eventList[channel].length; event++) {
      currEvent = eventList[channel][event];
      if (currEvent.time > lastEvent.time + lastEvent.kill) {
        tracks[channel].push(
          ...[...deltaTime(lastEvent.kill), 0x80 + channel, lastEvent.note, 0x0]
        );
        tracks[channel].push(
          ...[
            ...deltaTime(currEvent.time - (lastEvent.time + lastEvent.kill)),
            0x90 + channel,
            currEvent.note,
            0x70
          ]
        );
      } else {
        tracks[channel].push(
          ...[
            ...deltaTime(currEvent.time - lastEvent.time),
            0x80 + channel,
            lastEvent.note,
            0x0
          ]
        );
        tracks[channel].push(
          ...[...deltaTime(0), 0x90 + channel, currEvent.note, 0x70]
        );
      }
      lastEvent = currEvent;
    }
    // push last note kill
    tracks[channel].push(
      ...[
        ...deltaTime(Math.min(currEvent.kill, 120)),
        0x80 + channel,
        currEvent.note,
        0x0
      ]
    );
    tracks[channel].push(...[0x00, 0xff, 0x2f, 0x00]);
    trackLength = tracks[channel].length;
    tracks[channel].unshift(...toBytes(trackLength, 4));
    tracks[channel].unshift(...mTrk);
  }
  if (metaEventList.length > 0) {
    metaTrack.push(
      ...processTempoMetaTrack(metaEventList, adjustedTempo / ldsnsngObj.tempo)
    );
  }
  metaTrack.push(...[0x00, 0xff, 0x2f, 0x00]);
  metaTrack.unshift(...toBytes(metaTrack.length, 4));
  metaTrack.unshift(...mTrk);
  let midiOutput = Uint8Array.from(mThd.concat(...metaTrack, ...tracks));
  return midiOutput;
};

export default makeMidi;