import { CHANS, NOTES, TRANSPOSE } from './defaults';
import { LsdsngObj, getVersionEffects } from './lsdsng';


const intNameToStr = (arr: number[]): string => {
  return arr.map(num => String.fromCharCode(num)).join('');
};

/**
 * Creates the HTML header for the webpage.
 * @returns The HTML header as a string.
 */
const createHTMLHeader = (lsdsngObj: LsdsngObj): string => {
  return `
    <html>
      <head>
        <link rel="stylesheet" href="styles.css" type="text/css">
      </head>
      <body>
        <main class="divTableBody">
          <div class="dt">
            <div class="dr dr__metadata">
              <div class="dc"></div>
              <div class="dc">
                NAME<br>
                ${intNameToStr(lsdsngObj.name)}
              </div>
              <div class="dc">
                VERSION<br>
                ${lsdsngObj.version}.${lsdsngObj.ver}
              </div>
              <div class="dc">
                TEMPO<br>
                ${lsdsngObj.tempo}
              </div>
              <div class="dc">
                ◴ CLOCK<br>
                ${lsdsngObj.clock.hours}:${lsdsngObj.clock.minutes}
              </div>
            </div>
            <div class="dr">
              <div class="dc"></div>
              <div class="dc">PU1</div>
              <div class="dc">PU2</div>
              <div class="dc">WAV</div>
              <div class="dc">NOI</div>
            </div>
  `;
}

/**
 * Creates the HTML footer.
 * @returns The HTML footer as a string.
 */
const createHTMLFooter = (): string => {
  return `
        <script type="text/javascript">
          function expand(selector) {
            const elem = document.querySelector(selector);
            elem.style.visibility = (elem.style.visibility === 'collapse') ? 'visible' : 'collapse';
          }
        </script>
      </body>
    </html>`;
};

const createChannelRows = (lsdsngObj: LsdsngObj, i: number, chain: any, EFFECTS: string[]): string => {
  let outputHTML = '';

  for (let j = 0; j < CHANS.length; j++) {
    outputHTML += `<div class="dc3">\n`;
    chain = lsdsngObj.songchains[CHANS[j]][i];
    if (chain === 255) {
      chain = "--";
    }
    for (let k = 0; k < 16; k++) {
      if (chain == "--") {
        // outputHTML += `<div class="divTableCell">${t}</div>`;
      } else {
        let phrase = lsdsngObj.chains.phrases[chain][k];
        let transpose = lsdsngObj.chains.transpose[chain][k];
        // to do: implement transpose into the note display
        if (transpose > 127) {
          transpose = transpose - 256;
        }
        if (phrase == "255") {
          phrase = "--";
        }
        outputHTML += `<div class="dr3">\n`;
        outputHTML += `<div class="dc4">↳${String("0" + phrase.toString(16))
          .toUpperCase()
          .slice(-2)}</div>\n`;
        outputHTML += `<div class="dc5">\n`;
        for (let l = 0; l < 16; l++) {
          // outputHTML += `<div class="dr">\n`;
          if (phrase != "--") {
            // outputHTML += `<div class="dc">${String('0'+l.toString(16)).toUpperCase().slice(-2)}</div>`;
            outputHTML += `${l.toString(16).toUpperCase()} | `;
            let note = lsdsngObj.phrases.notes[phrase][l];
            if (note != 0) {
              if (note + transpose <= 0) {
                note = TRANSPOSE[(((note + transpose) % 12) + 12) % 12];
              } else {
                note = NOTES[note + transpose];
              }
            } else {
              note = NOTES[0];
            }
            // outputHTML += `<div class="dc">${note}</div>`;
            outputHTML += `${note.replace(' ', '&puncsp;')} | `;
            let instrument = lsdsngObj.phrases.instruments[phrase][l];
            if (instrument === 255) {
              instrument = "--";
            }
            // outputHTML += `<div class="dc">${'I'+String('0'+instrument.toString(16)).toUpperCase().slice(-2)}</div>`;
            // outputHTML += `<div class="dc dc2">${EFFECTS[lsdsngObj.phrases.fx[phrase][l]]+String('0'+lsdsngObj.phrases.fxval[phrase][l].toString(16)).toUpperCase().slice(-2)}</div>`;
            outputHTML += `${"I" +
              String("0" + instrument.toString(16))
                .toUpperCase()
                .slice(-2)} | `;
            outputHTML += `${EFFECTS[lsdsngObj.phrases.fx[phrase][l]] +
              " " +
              String("0" + lsdsngObj.phrases.fxval[phrase][l].toString(16))
                .toUpperCase()
                .slice(-2)}<br>`;
            // outputHTML += `<div class="dc">${String('0'+lsdsngObj.phrases.fxval[phrase][l].toString(16)).toUpperCase().slice(-2)}</div>`;
          }
          // outputHTML += `</div>`;
        }
        outputHTML += `</div></div>`;
      }
    }
    outputHTML += `</div>\n`;
  }

  return outputHTML;
}

// Output the HTML
const makeHTML = (lsdsngObj: LsdsngObj): string => {
  const EFFECTS = getVersionEffects(lsdsngObj);

  let outputHTML = '';
  let chain;

  // create the top of the html file
  outputHTML = createHTMLHeader(lsdsngObj);

  for (let i = 0; i < 256; i++) {
    outputHTML += `
      <div class="dr" onclick="expand('#r${i}')">
        <div class="dc">${String('0' + i.toString(16)).toUpperCase().slice(-2)}
      </div>\n`;

    for (let j = 0; j < CHANS.length; j++) {
      chain = lsdsngObj.songchains[CHANS[j]][i];
      if (chain === 255) {
        chain = '--';
      }
      outputHTML += `<div class="dc dc1">${String('0' + chain.toString(16))
        .toUpperCase()
        .slice(-2)}</div>\n`;
    }
    outputHTML += `</div>\n`;
    outputHTML += `<div class="dr2" id='r${i}' style="visibility: collapse">\n`;
    outputHTML += `<div class="dc3"></div>\n`;

    // create channel rows
    outputHTML += createChannelRows(lsdsngObj, i, chain, EFFECTS);
    outputHTML += `</div>\n`;
  }
  outputHTML += `</main>\n`;

  // Add script and closing body/html tags.
  outputHTML += createHTMLFooter();

  return outputHTML;
};

export default makeHTML;