import express, { Request, Response } from 'express';
import fs from 'fs'
import http from 'http'
import formidable from 'formidable';

import makeMIDI from './midi';
import makeHTML from './html';
import unpack from './unpack';
import { LsdsngObj } from './lsdsng';

const port: string | number = process.env.PORT || 3000;

const app = express();
app.use(express.static('public'));

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/', (req: Request, res: Response) => {
  const form = new formidable.IncomingForm();
  let lsdsngObj: LsdsngObj;
  let output: any;

  form.parse(req, (_err, fields: any, _files) => {
    output = fields.output;
  });

  form.on('fileBegin', (_name, _file) => {});

  form.on('file', (_, file: any) => {
    const name = file.name.split('.')[0];
    fs.readFile(file.path, (_err, data) => {
      try {
        lsdsngObj = unpack(data);
      } catch (err) {
        res.send(err);
        return;
      }

      if (output === 'html') {
        // HTML
        const html: string = makeHTML(lsdsngObj);
        res.send(html);
      } else if (output === 'midi') {
        // MIDI
        const midi: Uint8Array = makeMIDI(lsdsngObj);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-disposition': `attachment;filename=${name}.mid`,
          'Content-Length': midi.length,
        });
        res.end(Buffer.from(midi));
      } else {
        // JSON
        res.send(lsdsngObj);
      }
    });
  });
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
