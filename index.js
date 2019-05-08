const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const userAgent =
  'Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0';

const assert = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

const cachePath = (...components) => path.join('cache', ...components);

const copyFile = (source, destination) => {
  fs.copyFileSync(source, makeDirectories(destination));
  return destination;
};

const decodeHTMLEntities = html => {
  const entities = {
    amp: '&',
    apos: "'",
    cent: '¢',
    copy: '©',
    euro: '€',
    gt: '>',
    lt: '<',
    nbsp: ' ',
    pound: '£',
    quot: '"',
    reg: '®',
    yen: '¥',
  };
  return html.replace(/\&([^;]+);/g, (entity, code) => {
    var match;
    return code in entities
      ? entities[code]
      : (match = code.match(/^#x([\da-fA-F]+)$/))
      ? String.fromCharCode(parseInt(match[1], 16))
      : (match = code.match(/^#(\d+)$/))
      ? String.fromCharCode(~~match[1])
      : entity;
  });
};

const distributionPath = (...components) => path.join('dist', ...components);

const downloadFile = (url, output, options = []) => {
  const temp = tempPath(path.basename(output));
  executeCurl(['-o', temp, ...options, url]);
  return moveFile(temp, output);
};

const executeCommand = (args, options = {}) =>
  log(`Executing ${args.join(' ')}`, () =>
    execFileSync(args[0], args.slice(1), {
      encoding: 'utf8',
      ...options,
    })
  );

const executeCurl = (options, buffer = false) =>
  executeCommand(['curl', '-Lf', '--retry', 2, ...options], {
    encoding: buffer ? 'buffer' : 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });

const extractPath = urlOrPath =>
  isURL(urlOrPath) ? new URL(urlOrPath).pathname : urlOrPath;

const fetchURL = (url, options = [], buffer = false) =>
  executeCurl([...options, url], buffer);

const isURL = string => /^\w+:\/\//.test(string);

const log = (message, func) => {
  console.log(message);
  return func();
};

const makeDirectories = (directoryOrFile, directory = false) => {
  fs.mkdirSync(directory ? directoryOrFile : path.dirname(directoryOrFile), {
    recursive: true,
  });
  return directoryOrFile;
};

const memoize = func => (...args) => {
  func.memoized || (func.memoized = {});
  const key = JSON.stringify(args);
  key in func.memoized || (func.memoized[key] = func(...args));
  return func.memoized[key];
};

const moveFile = (source, destination) => {
  try {
    fs.renameSync(source, makeDirectories(destination));
  } catch (error) {
    if (error.code === 'EXDEV') {
      fs.copyFileSync(source, makeDirectories(destination));
      fs.unlinkSync(source);
    } else {
      throw error;
    }
  }
  return destination;
};

const removeFiles = files => {
  executeCommand(['rm', '-fr', '--', ...files]);
};

const symlinkFile = (target, link) => {
  try {
    var exists = fs.readlinkSync(link) === target;
  } catch {}
  if (!exists) {
    try {
      fs.unlinkSync(link);
    } catch {}
    fs.symlinkSync(target, makeDirectories(link));
  }
  return link;
};

const tempPath = (...components) => path.join(os.tmpdir(), ...components);

const unpackArchive = (archive, directory) => {
  executeCommand([
    'unzip',
    '-o',
    '-d',
    makeDirectories(directory, true),
    archive,
  ]);
  return directory;
};

module.exports = {
  assert,
  cachePath,
  copyFile,
  decodeHTMLEntities,
  distributionPath,
  downloadFile,
  executeCommand,
  executeCurl,
  extractPath,
  fetchURL,
  isURL,
  log,
  makeDirectories,
  memoize,
  moveFile,
  removeFiles,
  symlinkFile,
  tempPath,
  unpackArchive,
  userAgent,
};
