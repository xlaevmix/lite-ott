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
  const decoder = new TextDecoder('utf-8');

  inflator.onData = (chunk) => {
    parser.write(decoder.decode(chunk, { stream: true }));
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
        //await new Promise(r => setTimeout(r, 0));
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
  const channelNameSet = new Set(allchannels);
  const matchedChannelIds = new Set();
  const EpgMap = new Map();
  let maxStartTime = 0;
  let currentChannelId = '';
  let currentChannelNames = [];
  let currentIcon = null;
  let currentProgram = null;
  let currentLang = '';
  let currentText = '';
  let db;

  let totalProgrammes = 0;
  let totalChannels = 0;
  let notifyCount = 0;
  let notifyChCount = 0;
  let channelsProcessed = 0;
  let lastChid = null;


  function finalizeWorker() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['metadata', 'programmes'], 'readwrite');
      const metadataStore = tx.objectStore('metadata');
      const programmeStore = tx.objectStore('programmes');

      let i = 0;

      for (const value of EpgMap.values()) {
        i++;
        const percent = Math.floor((i / totalChannels) * 100);
        self.postMessage({ status: 'info', message: ` + "`Save data ${ percent } % `" + `});

        programmeStore.put(value);
      }

      metadataStore.put({ key: 'dbTimestamp', timestamp: maxStartTime });

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error || new Error('Transaction failed'));
      };

      tx.onabort = () => {
        reject(tx.error || new Error('Transaction aborted'));
      };
    });
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
        currentProgram = null;
        const chId = node.attributes.channel;
        if (matchedChannelIds.has(chId)) {
          const startTs = toTimestamp(parseDate(node.attributes.start));
          const stopTs = toTimestamp(parseDate(node.attributes.stop));
          if (keepEpgArchive > 0 || stopTs >= tstoday) {
            currentProgram = {
              channelId: chId,
              start: startTs,
              stop: stopTs,
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
    } 
    currentText = '';
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
        const matched = currentChannelNames.some(n => channelNameSet.has(n.toLowerCase()));
          if (matched) {
            matchedChannelIds.add(currentChannelId);
            const existing = EpgMap.get(currentChannelId);

            if (existing) {
              existing.names = [...new Set([...existing.names, ...currentChannelNames])];

              if (!existing.icon && currentIcon) {
                existing.icon = currentIcon;
              }
            } else {
              EpgMap.set(currentChannelId, {
                id: currentChannelId,
                names: [...currentChannelNames],
                icon: currentIcon || null,
                events: []
              });
              totalChannels++;
            }
            
            notifyChCount++;
            if (notifyChCount >= 100) {
              self.postMessage({ status: 'info', message: ` + "`Parse channels: ${totalChannels} total`" + `});
              notifyChCount = 0;
            }
          }

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
        if (keepEpgDescr > 0 && currentProgram) {
            const text = currentText.trim();
            if (currentLang === locale) {
              currentProgram.descr = text;
            } else if (!currentProgram.descr) {
              currentProgram.descr = text;
            }          
        }
        break;

      case 'programme':
        if (currentProgram) {
          const chId = currentProgram.channelId;
          maxStartTime = Math.max(maxStartTime, currentProgram.start);
          const existingchannel = EpgMap.get(chId);
            if (existingchannel) {
              existingchannel.events.push(currentProgram);
            }
          totalProgrammes++;
          notifyCount++;
            if (lastChid !== chId) {
              lastChid = chId;
              if (lastChid !== null) channelsProcessed++;
            }
            if (notifyCount >= 1000) {
              let percent = Math.floor((channelsProcessed / totalChannels) * 100);
              self.postMessage({ status: 'info', message: ` + "`Parse programmes: ${totalProgrammes} ( ${percent}% )`" + `});
              notifyCount = 0;
            }
          //currentProgram = null;
        }
        break;
    }
    currentText = '';
    currentLang = '';
  };

  parser.onend = async function () {
    self.postMessage({ status: 'info', message: ` + "`Parse programmes: ${totalProgrammes} ( 100% )`" + `});

    try {
      await finalizeWorker();
      self.postMessage({ status: 'done', message: ` + "`Stored ${ totalChannels } channels and ${ totalProgrammes } programmes.`" + `});
    } catch (err) {
      self.postMessage({ status: 'error', message: 'Finalization error: ' + err.message });
    }

    EpgMap.clear();
    channelNameSet.clear();
    matchedChannelIds.clear();
    //self.close();
  };

  parser.onerror = function (err) {
    self.postMessage({ status: 'error', message: 'SAX parser error: ' + err.message });
    self.close();
  };

  const openRequest = indexedDB.open('EPG_DB', dbVersion);

  openRequest.onsuccess = async function () {
    db = openRequest.result;
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


