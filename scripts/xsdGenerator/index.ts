import { assert } from '../../src/assert';
import fs from 'fs';
import path from 'path';
import { parseXsd } from './parser';

// assume cwd is the root of repo
const xsdFilePath = './vstst.xsd';

const absoluteXdsFilePath = path.resolve(xsdFilePath);

assert(fs.existsSync(absoluteXdsFilePath));

const xsdString = fs.readFileSync(absoluteXdsFilePath, 'utf8');

parseXsd(xsdString);
