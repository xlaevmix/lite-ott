/* Lite OTT/IPTV Web Player */
/*     EPG script      */

function initEPGDB() {
  return new Promise((resolve, reject) => {
    if (epgDB) return resolve(epgDB);

    const request = indexedDB.open('EPG_DB', dbVersion);

    request.onupgradeneeded = function () {
      const db = request.result;
      isNewPlaylist = true;
      if (!db.objectStoreNames.contains('programmes')) {
        db.createObjectStore('programmes', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = function () {
      epgDB = request.result;
      resolve(epgDB);
    };

    request.onerror = function () {
      reject('Failed to open EPG_DB');
    };
  });
}

function deleteEPGDB() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('EPG_DB');

      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase('EPG_DB');
        resolve(true);
      };
    } catch {
      resolve(false);
    }
  });
}

async function isEpgOutdated() {
  return new Promise((resolve, reject) => {
    if (!epgDB) {
      reject('epgDB is not initialized');
      return;
    }

    if (!epgDB.objectStoreNames.contains('metadata')) {
      resolve(true);
      return;
    }

    const tx = epgDB.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.get('dbTimestamp');

    request.onsuccess = function () {
      const result = request.result;

      if (!result || !result.timestamp) {
        resolve(true);
        return;
      }
      const storedDate = fromTimestamp(result.timestamp);
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      resolve(storedDate < today);
    };

    request.onerror = function () {
      reject('Failed to read dbTimestamp from metadata');
    };
  });
}

async function clearEpg() {
  if (!epgDB) {
    console.error('epgDB is not initialized');
    return;
  }

  if (!epgDB.objectStoreNames.contains('programmes')) {
    console.error('Object store "programmes" not found');
    return;
  }

  console.log('Clear EPG storage');
  statusbar.textContent = "Clear EPG storage";

  const tx = epgDB.transaction('programmes', 'readwrite');
  const store = tx.objectStore('programmes');

  return new Promise((resolve, reject) => {
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      resolve();
    };

    clearRequest.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function cleanUpEpg() {
  console.log('Cleanup EPG storage');
  statusbar.textContent = "Cleanup EPG storage";

  const processRecord = (record, store) => {
    const originalEvents = record.events || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tstoday = toTimestamp(today);
    const channel = playlist.find(ch => ch.tvg.id === record.id);
    const days = Number(channel?.catchup_days || 0);
    const maxday = (days > 0 && keepEpgArchive > 0) ? Math.floor(tstoday - (days * 24 * 60 * 60)) : 0;
    const updatedEvents = originalEvents.filter(event => {
        return (((maxday > 0) && (Number(event.start) >= maxday)) || (Number(event.start) >= tstoday));
      });
    if (updatedEvents.length !== originalEvents.length) {
      record.events = updatedEvents;
      store.put(record);
    }
  };

  const done = () => {
    console.log('EPG cleanup completed');
    statusbar.textContent = "EPG cleanup completed";
  };

  await processEpgDataDB(processRecord, done, 'readwrite');
}


async function getXmlEPG(xmlUrl) {
  console.log("START parsing EPG data..");
  statusbar.style.display = 'block';
  statusbar.textContent = "Start parsing EPG data..";

  const blob = new Blob([window.workerCode], { type: 'application/javascript' });
  worker = new Worker(URL.createObjectURL(blob));
  const allchannels = [
    ...new Set(
      playlist
        .map(channel => channel.name?.trim().toLowerCase())
        .filter(Boolean)
    )
  ];

  return new Promise((resolve, reject) => {
    worker.onmessage = function (e) {
      const { status, message } = e.data;

      if (status === 'info') {
        statusbar.textContent = message;

      } else if (status === 'warn') {
        console.warn(`[EPG Parser] ${status.toUpperCase()}: ${message}`);

      } else if (status === 'done') {
        workerRunning = false;
        console.log(`${status.toUpperCase()}: ${message}`);
        statusbar.textContent = message;
        worker = null;
        statusbar.style.display = 'none';
        resolve(); 
      } else {
        console.error(`[EPG Parser] ${status.toUpperCase()}: ${message}`);
        statusbar.textContent = message;
        setTimeout(() => {
          statusbar.style.display = 'none';
        }, 1000);
        worker.terminate();
        workerRunning = false;
        reject(new Error(message)); 
      }
    };
    workerRunning = true;
    worker.postMessage({ xmlUrl, allchannels, locale, dbVersion, keepEpgDescr, keepEpgArchive });
  });
}

function processEpgDataDB(callback, doneCallback, mode = 'readonly') {
  return new Promise((resolve, reject) => {
    if (!epgDB) {
      console.error('epgDB is not initialized');
      return reject('epgDB not initialized');
    }

    if (!epgDB.objectStoreNames.contains('programmes')) {
      console.error('Object store "programmes" not found');
      return reject('Object store "programmes" not found');
    }

    const tx = epgDB.transaction('programmes', mode);
    const store = tx.objectStore('programmes');
    const cursorRequest = store.openCursor();

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        try {
          callback(cursor.value, store, cursor);
        } catch (err) {
          console.error('Error in callback:', err);
        }
        cursor.continue();
      } else {
        if (doneCallback) doneCallback();
        resolve();
      }
    };

    cursorRequest.onerror = (event) => {
      console.error('Failed to iterate through programmes');
      reject(event.target.error);
    };
  });
}

async function getAllChannels() {
  const channels = [];
  const processRecord = (record) => {
            channels.push({
              id: record.id,
              names: record.names,
              icon: record.icon
            });    
  };
  const done = () => {  };
  await processEpgDataDB(processRecord, done, 'readonly');
  return channels;
}

async function getEpgProgress(chId) {
  const now = new Date();
  const dt = toTimestamp(now);
  let channel = EPGnow.find(ch => ch.id === chId);
  let current = "";
  let description = "";
  let next = "";
  let percent = 0;
  if ((!channel && epgSource === "server") || !channel || ((channel?.events) && (channel.events.length > 0) && (dt > channel.events[0].stop))) {
      channel = await epg_now(chId);
  }
  let events = channel?.events || [];
  if (events.length > 0) {
    current = events[0]?.title || "";
    description = events[0]?.descr || "";
    if (events.length > 1) {
      const startDate = fromTimestamp(events[1]?.start);
      const startTime = toTime(startDate);
      next = '[' + startTime + '] ' + events[1]?.title || "";
    } else {
      next = events[1]?.title || "";
    }
    let t = events[0].start;   
    let tt = events[0].stop;
    if (dt > tt) {
      percent = 100;
    } else {
      percent = Math.floor(((dt - t) / (tt - t)) * 100).toFixed(0);
    }
  }
  return [current, next, percent, description];
}

async function epg_now(chname = "") {
  if (epgSource === "none") return;
  if (useDB) {
    if (workerRunning) return;
    return await getCurrentEpgDB(chname);
  } else {
    //server json api
    if (isNewPlaylist) return;
    return await getCurrentEpgJson(chname);
  }
}

function setCurrentEpg(currentepg) {
  if (!(currentepg && typeof currentepg === 'object' && !Array.isArray(currentepg) && Object.keys(currentepg).length > 0)) return;
  const channel = EPGnow.find(ch => ch.id === currentepg.id);
  if (channel) {
    channel.events = currentepg.events;
  } else {
    EPGnow.push(currentepg);
  }
}

function getCurrentEpgDB(channelId) {
  return new Promise((resolve, reject) => {
      const tx = epgDB.transaction('programmes', 'readonly');
      const store = tx.objectStore('programmes');

      const request = store.get(channelId);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const record = request.result;

        if (!record || !Array.isArray(record.events)) {
          resolve(null);
          return;
        }

        const now = new Date();
        const dt = toTimestamp(now);

        let currentepg = null;
        let currentEvent = null;
        let nextEvent = null;

        for (const event of record.events) {
          if (event.start <= dt && event.stop > dt) {
            currentEvent = event;
          } else if (event.start > dt) {
            if (!nextEvent || event.start < nextEvent.start) {
              nextEvent = event;
            }
          }
        }
        if (currentEvent && nextEvent) {        
        currentepg = {
          id: record.id,
          names: record.names,
          icon: record.icon,
          events: [currentEvent, nextEvent]
        };
        setCurrentEpg(currentepg);
        resolve(currentepg);
        } else {
          resolve(null);
          return;
        }
      };
  });
}


async function getCurrentEpgJson(chname) {
  let currentepg = {};
  try {
    const url = parseApiUrl(epgApi_Url, { mode: 'now', name: chname });
    const data = await getJson(url);

    currentepg = {
      id: data.ch_name || chname,
      names: [data.ch_name || chname],
      icon: data.icon || "",
      events: data.events || []
    };

    setCurrentEpg(currentepg);

    return currentepg;
  } catch (err) {
    return null;
  }
}

function getChannelEpg(channelIDorName, dateYMD) { //YYYYMMDD
  if (useDB) {
    return getChannelEpgDB(channelIDorName, dateYMD);
  } else {
    //server json api
    return getChannelEpgJson(channelIDorName, dateYMD);
  }
}

function getChannelEpgDB(channelIDorName, dateYMD) { 
  return new Promise((resolve, reject) => {
      if (!epgDB) {
        reject('epgDB is not initialized');
        return;
      }

      if (!epgDB.objectStoreNames.contains('programmes')) {
        reject('Object store "programmes" not found');
        return;
      }

      const tx = epgDB.transaction('programmes', 'readonly');
      const store = tx.objectStore('programmes');
      const request = store.get(channelIDorName);

      request.onsuccess = () => {
        const result = request.result;

        if (!result || !Array.isArray(result.events)) {
          reject('No events found');
          return;
        }

        const datestart = DateFromUtcYMD(dateYMD);
        const dateend = DateFromUtcYMD(dateYMD);
        dateend.setUTCDate(dateend.getUTCDate() + 1);

        const dayStart = toTimestamp(datestart);
        const dayEnd = toTimestamp(dateend);

        const filteredEvents = result.events.filter(event => {
          const start = Number(event.start);
          return start >= dayStart && start < dayEnd;
        });

        if (filteredEvents.length > 0) {
          resolve(filteredEvents);
        } else {
          resolve(result.events);
        }
      };

      request.onerror = () => {
        reject('Failed to retrieve data');
      };
  });
}

function getChannelEpgJson(channelIDorName, dateYMD) {
  return new Promise((resolve, reject) => {
    try {
      const url = parseApiUrl(epgApi_Url, { mode: 'day', date: dateYMD, name: channelIDorName });
      getJson(url)
        .then(data => {
          if (data && data.events) {
            resolve(data.events);
          } else {
            reject(new Error("No events found"));
          }
        })
        .catch(err => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}





