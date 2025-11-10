/* Lite OTT/IPTV Web Player */
/*  XMLTV worker script */

window.workerCode = `  
importScripts('https://unpkg.com/sax');
importScripts('https://unpkg.com/pako@2.1.0/dist/pako_inflate.min.js');

function parseDate(dateStr) { //"YYYYMMDDhhmmss +hhmm"
  dateStr = dateStr.trim();
  const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));
    const timezoneOffset = dateStr.substring(15).trim();

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));

    const sign = timezoneOffset[0] === '-' ? -1 : 1;
    const offsetHours = parseInt(timezoneOffset.substring(1, 3));
    const offsetMinutes = parseInt(timezoneOffset.substring(3, 5));
    const totalOffsetMinutes = sign * (offsetHours * 60 + offsetMinutes);
    
    date.setUTCMinutes(date.getUTCMinutes() - totalOffsetMinutes);

    return date;  
}


function toTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const tstoday = toTimestamp(today);

async function fetchXML(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(` + "`Failed to fetch ${url}`" + `);
  return await response.arrayBuffer();
}

function isGzipped(data) {
  const arr = new Uint8Array(data);
  return arr[0] === 0x1f && arr[1] === 0x8b;
}

function PakoInflateAndParse(compressedData, parser) {
  const inflator = new pako.Inflate();
  inflator.onData = (chunk) => {
    const text = new TextDecoder('utf-8').decode(chunk);
    parser.write(text);
  };
  inflator.onEnd = (status) => {
    if (status === 0) {
      parser.close();
    } else {
      self.postMessage({ status: 'error', message: 'GZIP decompression failed' });
    }
  };
  inflator.push(compressedData, true);
}

async function streamUnGzipAndParse(compressedData, parser) {
  if ('DecompressionStream' in self) {
    try {
      const ds = new DecompressionStream('gzip');
      const compressedStream = new Response(compressedData).body;
      const decompressedStream = compressedStream.pipeThrough(ds);
      const reader = decompressedStream.getReader();
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.write(decoder.decode(value, { stream: true }));
      }
      parser.close();
    } catch (err) {
      self.postMessage({ status: 'error', message: ` + "`GZIP decompression failed: ${err.message}`" + `});
    }
  } else {
    PakoInflateAndParse(compressedData, parser);
  }
}

self.onmessage = function (e) {
  const { xmlUrl, allchannels, locale, dbVersion, keepEpgDescr, keepEpgArchive } = e.data;
  const matchedChannelIds = new Set();
  const channelIdToInfo = {};
  let maxStartTime = 0;
  let currentChannelId = '';
  let currentChannelNames = [];
  let currentIcon = null;
  let currentProgram = null;
  let currentLang = '';
  let currentText = '';
  let db;
  let bufferedCount = 0;
  let totalProgrammes = 0;
  let totalChannels = 0;
  let notifyCount = 0;
  let notifyChCount = 0;
  const pendingEPG = {};
  let flushPending = false;
  let flushInProgress = false;
  let flushInterval = null;

  async function finalizeWorker() {
    await flushBuffer();

    const tx = db.transaction('metadata', 'readwrite');
    const metadataStore = tx.objectStore('metadata');
    await metadataStore.put({ key: 'dbTimestamp', timestamp: maxStartTime });
    self.postMessage({ status: 'done', message: ` + "`Stored ${totalChannels} channels and ${totalProgrammes} programmes.`" + `});    
  }


  async function flushBuffer() {
    const tx = db.transaction(['programmes'], 'readwrite');
    const store = tx.objectStore('programmes');

    const putPromises = [];

    for (const chId in pendingEPG) {
      putPromises.push(new Promise((resolve, reject) => {
        const request = store.put(pendingEPG[chId]);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(` + "`Failed to store channel: ${chId}`" + `);
      }));
    }

    try {
      await Promise.all(putPromises);
      for (const chId in pendingEPG) delete pendingEPG[chId];
      bufferedCount = 0;
    } catch (err) {
      self.postMessage({ status: 'warn', message: err });
    }
  }


  const parser = sax.parser(true);

  parser.onopentag = function (node) {
    switch (node.name) {
      case 'channel':
        currentChannelId = node.attributes.id;
        currentChannelNames = [];
        currentIcon = null;
        break;
      case 'icon':
        if (node.attributes.src) currentIcon = node.attributes.src.trim();
        break;
      case 'programme':
        const chId = node.attributes.channel;
        if (matchedChannelIds.has(chId)) {
          if (keepEpgArchive > 0) {
            currentProgram = {
              channelId: chId,
              start: toTimestamp(parseDate(node.attributes.start)),
              stop: toTimestamp(parseDate(node.attributes.stop)),
              title: '',
              descr: ''
            };
          } else if (toTimestamp(parseDate(node.attributes.start)) >= tstoday) {
            currentProgram = {
              channelId: chId,
              start: toTimestamp(parseDate(node.attributes.start)),
              stop: toTimestamp(parseDate(node.attributes.stop)),
              title: '',
              descr: ''
            };
          }
        }
        break;
      case 'title':
      case 'desc':
        currentLang = node.attributes.lang || '';
        break;
    } currentText = '';
  };
  parser.ontext = (text) => {
    currentText += text;
  };

  parser.onclosetag = function (tagName) {
    switch (tagName) {
      case 'display-name':
        currentChannelNames.push(currentText.trim());
        break;
      case 'channel':
        allchannels.forEach(chname => {
          const matched = currentChannelNames.some(n => chname.toLowerCase() === n.toLowerCase());
          if (matched) {
            matchedChannelIds.add(currentChannelId);
            if (channelIdToInfo[currentChannelId]) {
              const existing = channelIdToInfo[currentChannelId];
              const mergedNames = [...new Set([...existing.names, ...currentChannelNames])];
              existing.names = mergedNames;
              if (!existing.icon && currentIcon) {
                existing.icon = currentIcon;
              }
            } else {
              channelIdToInfo[currentChannelId] = {
                id: currentChannelId,
                names: [...currentChannelNames],
                icon: currentIcon || null
              };
            }
            totalChannels++;
            notifyChCount++;
            if (notifyChCount >= 100) {
              self.postMessage({ status: 'info', message: ` + "`Parsing channels: ${totalChannels} total`" + `});
              notifyChCount = 0;
            }
          }
        });

        currentChannelId = '';
        currentChannelNames = [];
        currentIcon = null;
        break;

      case 'title':
        if (currentProgram) {
          const text = currentText.trim();
          if (currentLang === locale) {
            currentProgram.title = text;
          } else if (!currentProgram.title) {
            currentProgram.title = text;
          }
        }
        break;
      case 'desc':
        if (keepEpgDescr > 0) {
          if (currentProgram) {
            const text = currentText.trim();
            if (currentLang === locale) {
              currentProgram.descr = text;
            } else if (!currentProgram.descr) {
              currentProgram.descr = text;
            }
          }
        }
        break;
      case 'programme':
        if (currentProgram) {
          const chId = currentProgram.channelId;
          maxStartTime = Math.max(maxStartTime, currentProgram.start);
          if (!pendingEPG[chId]) {
            const info = channelIdToInfo[chId] || {};
            pendingEPG[chId] = {
              id: chId,
              names: info.names || chId,
              icon: info.icon || null,
              events: []
            };
          }
          pendingEPG[chId].events.push(currentProgram);
          bufferedCount++;
          totalProgrammes++;
          notifyCount++;
          if (bufferedCount >= 100) {
            flushPending = true;
            if (notifyCount >= 1000) {
              self.postMessage({ status: 'info', message: ` + "`Parsing programmes: ${totalProgrammes} total`" + `});
              notifyCount = 0;
            }
          }
          currentProgram = null;
        }
        break;
    }
    currentText = '';
    currentLang = '';
  };

  parser.onend = async function () {
    clearInterval(flushInterval);
    while (flushInProgress) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (bufferedCount > 0) {
      await flushBuffer();
    }
    await finalizeWorker();
    //self.close();
  };

  parser.onerror = function (err) {
    self.postMessage({ status: 'error', message: 'SAX parser error: ' + err.message });
    self.close();
  };

  const openRequest = indexedDB.open('EPG_DB', dbVersion);

  openRequest.onsuccess = async function () {
    db = openRequest.result;
    const tx = db.transaction(['programmes'], 'readwrite');
    const store = tx.objectStore('programmes');

    flushInterval = setInterval(() => {
      if (flushPending && !flushInProgress) {
        flushPending = false;
        flushInProgress = true;
        flushBuffer().then(() => {
          flushInProgress = false;
        });
      }
    }, 100);
    try {

      const response = await fetchXML(xmlUrl); 

      if (isGzipped(response)) {
        self.postMessage({ status: 'info', message: 'Decompressing gzipped XML...' });
        streamUnGzipAndParse(response, parser);
      } else {
        const responseData = new TextDecoder().decode(response);
        parser.write(responseData).close();
      }
    } catch (err) {
      self.postMessage({ status: 'error', message: 'Parser error: ' + err.message });
    }
  };

  openRequest.onerror = function () {
    self.postMessage({ status: 'error', message: 'Failed to open IndexedDB' });
  };
};
`;


