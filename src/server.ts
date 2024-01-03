import express, { Request, Response } from 'express';
import fs from 'fs'
import { writeFile } from 'fs/promises';
import http from 'http'
import formidable from 'formidable';
import { Buffer } from 'buffer';
import { gzip, ungzip } from 'pako';
import * as bodyParser from 'body-parser';
import * as nunjucks from 'nunjucks';
import * as path from 'path';
import * as defaults from './defaults';
import makeMIDI from './midi';
import unpack from './unpack';
import { LsdsngObj } from './lsdsng';

const port: string | number = process.env.PORT || 3000;

const app = express();

const nunjucksEnv: nunjucks.Environment =
  nunjucks.configure(path.join(__dirname, './views'), {
    autoescape: true,
    express: app,
  })
  .addFilter('format', (num: number) => {
    return (`0${num?.toString(16)}`).slice(-2).toUpperCase();
  });

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));

app.set('view engine', 'html');
app.set('engine', nunjucksEnv);

app.get('/', (_req: Request, res: Response) => {
  res.render('./index.njk', {
    title: 'lsdsng Export',
  })
});

app.get('/b', (_req: Request, res: Response) => {
  res.render('./base.njk', {
    title: '',
  });
});

app.get('/j', (req: Request, res: Response) => {
  const data = req.query.data;
  let jsonObj = {
    "error": "no data"
  };

  if (data) {
    const uint8Array = Buffer.from(data as string, 'base64');
    const decompressed = ungzip(uint8Array, {
      to: 'string',
    });
    jsonObj = JSON.parse(decompressed);
  }

  res.send(jsonObj);
});

app.get('/m/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const file = `/tmp/${filename}`;
  res.sendFile(file);
});

app.post('/d', (req: Request, res: Response) => {
  const form = formidable({});
  let lsdsngObj: LsdsngObj;
  let output: any;
  let title: string;

  form.parse(req, (_err, fields: any, _files) => {
    output = fields.output[0];
  });

  form.on('fileBegin', (_formName, file: any) => {
    title = file.originalFilename.split('.')[0];
  });

  form.on('file', (_formName, file: any) => {
    fs.readFile(file.filepath, async (_err, data) => {
      try {
        lsdsngObj = unpack(data);
      } catch (err) {
        res.send(err);
        return;
      }

      if (output === 'html') {
        res.send(nunjucks.render('./html.njk', {
          defaults,
          lsdsng: lsdsngObj,
          title,
        }));
      } else if (output === 'midi') {
        const midi: Uint8Array = makeMIDI(lsdsngObj);
        const midiFile = `${title}.mid`;
        await writeFile(`/tmp/${midiFile}`, Buffer.from(midi));

        res.send(nunjucks.render('./midi.njk', {
          title,
          midiFile,
        }));
      } else {
        const compressed = gzip(JSON.stringify(lsdsngObj));
        const base64Compressed = Buffer.from(compressed).toString('base64');

        res.send(nunjucks.render('./json.njk', {
          lsdsng: JSON.stringify(lsdsngObj, null, 4),
          title,
          url: encodeURIComponent(base64Compressed),
        }));
      }
    });
  });
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
