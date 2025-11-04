/* Lite OTT/IPTV Web Player */
/*     EPG script      */

function initEPGDB(dbVersion = 1) {
  return new Promise((resolve, reject) => {
    if (epgDB) return resolve(epgDB);

    const request = indexedDB.open('EPG_DB', dbVersion);

    request.onupgradeneeded = function () {
      const db = request.result;

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

  const workerPath = 'js/xmlworker.js?' + Math.random();
  worker = new Worker(workerPath);
  const allchannels = [...new Set(playlist.map(channel => channel.name))];

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


async function getEpgProgress(chId) {
  const now = new Date();
  const dt = toTimestamp(now);
  let channel = EPGnow.find(ch => ch.id === chId);
  let current = "";
  let description = "";
  let next = "";
  let percent = 0;
  if ((!channel && epgSource === "server") || ((channel?.events) && (channel.events.length > 0) && (dt > channel.events[0].stop))) {
    await epg_now(chId);
    channel = EPGnow.find(ch => ch.id === chId);
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
    getCurrentEpgDB();
  } else {
    //server json api
    if (isNewPlaylist) return;
    getCurrentEpgJson(chname);
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

async function getCurrentEpgDB() {
  const processRecord = (record) => {
    let events = [];
    let currentepg = {};
    const now = new Date();
    const dt = toTimestamp(now);
    if (!record.events || !Array.isArray(record.events)) {
      events = [];
    } else {
      for (let i = 0; i < record.events.length; i++) {
        const event = record.events[i];
        if (dt >= event.start && dt < event.stop) {
          const nextEvent = record.events[i + 1] || null;
          events = [event, nextEvent].filter(Boolean);
        }
      }
    }
    currentepg = {
      id: record.id,
      names: record.names,
      icon: record.icon,
      events: events
    };
    setCurrentEpg(currentepg);
  };
  const done = () => { };
  await processEpgDataDB(processRecord, done, 'readonly');
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
        }

        const year = parseInt(dateYMD.slice(0, 4), 10);
        const month = parseInt(dateYMD.slice(4, 6), 10) - 1;
        const day = parseInt(dateYMD.slice(6, 8), 10);

        const dayStart = toTimestamp(new Date(year, month, day));
        const dayEnd = toTimestamp(new Date(year, month, day + 1));

        const filteredEvents = result.events.filter(event => {
          const start = Number(event.start);
          return start >= dayStart && start < dayEnd;
        });

        resolve(filteredEvents);
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


