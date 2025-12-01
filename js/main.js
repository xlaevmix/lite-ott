/* Lite OTT/IPTV Web Player */
/*     Main script      */


const translations = {
  "en": {
    "yes": "Yes",
    "no": "No",
    "hint": "Use OK/Enter to change value, arrow keys for navigation",
    "lang": "Language",
    "log": "Log",
    "settings": "Settings",
    "groups": "Groups",
    "channels": "Channels",
    "epg": "TV Guide",
    "tvguide": "TV Guide Channel",
    "m3uUrl": "playlist address (.m3u)",
    "epgsource": "EPG Source",
    "epgsourceDescr": "(Do not use large file unless your device has enough memory and disk space or traffic limits)",
    "xmltvUrl": "EPG address in XMLTV format",
    "keepEpgDescr": "keep EPG descriptions",
    "keepEpgArchive": "keep EPG archive",
    "rowscount": "number of lines in menu lists",
    "playerType": "player type",
    "playAtStart": "play last channel on startup",
    "keyBindings": "Button bindings (OK/Enter - clear)",
    "redbutton": "RED (settings)",
    "greenbutton": "GREEN (TV guide)",
    "yellowbutton": "YELLOW (audio track)",
    "bluebutton": "BLUE (info)",
    "add-keyBindings": "Additional button bindings (OK/Enter - clear)",
    "buttonOKUpd": "ОК / Update",
    "exitConfirm": "Close Application?",
  },
  "uk": {
    "yes": "Так",
    "no": "Ні",
    "hint": "Використовуйте OK/Enter щоб змінити значення, клавіші зі стрілками для навігації",
    "lang": "Мова",
    "log": "Лог",
    "settings": "Налаштування",
    "groups": "Групи",
    "channels": "Канали",
    "epg": "Телегід",
    "tvguide": "Телегід каналу",
    "m3uUrl": "адреса плейлиста (.m3u)",
    "epgsource": "джерело телепрограми",
    "epgsourceDescr": "(Не використовуйте великий файл, якщо на вашому пристрої немає достатньо пам'яті та місця на диску або є ліміт трафіку)",
    "xmltvUrl": "адреса EPG у форматі XMLTV",
    "keepEpgDescr": "зберігати опис телепрограм",
    "keepEpgArchive": "зберігати архів телепрограм",
    "rowscount": "кількість рядків у списках меню",
    "playerType": "тип плеєра",
    "playAtStart": "програвати останній канал після старту",
    "keyBindings": "Прив'язка кнопок (OK/Enter - стерти)",
    "redbutton": "ЧЕРВОНА (налаштування)",
    "greenbutton": "ЗЕЛЕНА (телегід)",
    "yellowbutton": "ЖОВТА (аудіо доріжка)",
    "bluebutton": "СИНЯ (інфо)",
    "add-keyBindings": "Додаткова прив'язка кнопок (OK/Enter - серти)",
    "buttonOKUpd": "ОК / Оновити",
    "exitConfirm": "Закрити застосунок?",
  },
  "ru": {
    "yes": "Да",
    "no": "Нет",
    "hint": "Используйте OK/Enter чтобы изменить значение, клавиши со стрелками для навигации",
    "lang": "Язык",
    "log": "Лог",
    "settings": "Настройки",
    "groups": "Группы",
    "channels": "Каналы",
    "epg": "Телегид",
    "tvguide": "Телегид канала",
    "m3uUrl": "адрес плейлиста (.m3u)",
    "epgsource": "источник телепрограммы",
    "epgsourceDescr": "(Не используйте большой файл, если на вашем устройстве недостаточно памяти и места на диске или есть лимит по траффику)",
    "xmltvUrl": "адрес EPG в формате XMLTV",
    "keepEpgDescr": "хранить описания телепрограмм",
    "keepEpgArchive": "хранить архив телепрограмм",
    "rowscount": "количество строк в списках меню",
    "playerType": "тип плеера",
    "playAtStart": "проигрывать последний канал при старте",
    "keyBindings": "Привязка кнопок (OK/Enter - очистить)",
    "redbutton": "КРАСНАЯ (настройки)",
    "greenbutton": "ЗЕЛЕНАЯ (телегид)",
    "yellowbutton": "ЖЕЛТАЯ (аудио дорожка)",
    "bluebutton": "СИНЯЯ (инфо)",
    "add-keyBindings": "Дополнительная привязка кнопок (OK/Enter - очистить)",
    "buttonOKUpd": "ОК / Обновить",
    "exitConfirm": "Закрыть приложение?",
  },
};

/* DOM elements */
const video = document.getElementsByTagName("video")[0];
const spinner = document.getElementById("spinner");
const loadingstatus = document.getElementById("statusText");
const statusbar = document.getElementById("statusbar");
const chNum = document.getElementById("chNum");
const infobar = document.getElementById("infobar");
const infodescr = document.getElementById("infodescr");
const modalexit = document.getElementById("modalexit");

const loglist = document.getElementById("loglist");
const settings = document.getElementById("settingslist");

const groupsList = document.getElementById("grouplist");

const channelsList = document.getElementById("channellist");
const channelListHeader = document.getElementById("channelListHeader");
const channelsContainer = document.getElementById("channelsContainer");

const epglist = document.getElementById("epglist");
const epgContainer = document.getElementById("epgContainer");

/* Variables */
const dbVersion = 1;
let epgDB = null;
let useDB = false;
let worker = null;
let workerRunning = false;
let hls;
const defaultLocale = "en";
const supportedLocales = Object.keys(translations);
const playerTypeList = ["native", "hlsjs"];
/* 
epgApi_Url = 'http://example.com/epg/get_epg.php?mode=${mode}&date=${date}&name=${name}';
epgApi_Url = window.location.origin + '/${mode}/${date}/${name}';

  url for server json api (mode: [now , day], date: yyyymmdd, name: channel_name).
  undefined parameters will be removed when parse url
  when mode=now - server should return only current and next event for given channel
  start/stop - timestamps
  {
    "ch_id": "Channel 1",
    "ch_name": "Channel 1",
    "icon": "http://example.com/picons/ch1.png",
    "events": [
        {
            "start": 1761044100,
            "stop": 1761047100,
            "title": "current programme title",
            "descr": "current programme description"
        },
        {
            "start": 1761047100,
            "stop": 1761049800,
            "title": "next programme title",
            "descr": "next programme description"
        }
    ]
}
*/
const epgApi_Url = "";

const defaultEpgLink = "";

const dummyIcon = "img/dummy.png";

/* Settings and current state variables */
let locale = "";
let playerType = "native";
let epgSource = "none";

let keepEpgDescr = 0;
let keepEpgArchive = 0;
let playAtStart = 0;
let m3ulink = "";
let epglink = "";
let rowscount = 15;
let keys = {};
let playlist = [];
let isNewPlaylist = false;
let lastPlayIndex = -1;
let lastGroupIndex = 0;

/* Runtime variables */
let groups = [];
let channels = [];
let EPGnow = [];
let catchup = "";
let catchup_days = "";
let catchup_source = "";

let isArchivePlaying = false;

let currentGroupIndex = 0;
let currentChannelIndex = 0;
let prevGroupIndex = 0;
let prevChannelIndex = 0;

let listItemHeight = "4vh";
let chNumHideTimeout;
let infoBarHideTimeout;

/* Functions */
function exitApp() {
  if (epgDB) {
    epgDB.close();
  }

  if (worker && workerRunning) {
    worker.terminate();
    workerRunning = false;

    const deleteRequest = indexedDB.deleteDatabase('EPG_DB');
    deleteRequest.onsuccess = () => {
      console.log('Database deleted.');
      window.close(); // Only close window after DB deletion
    };
    deleteRequest.onerror = () => {
      console.error('Failed to delete DB.');
      window.close(); // Still close app even if delete fails
    };
    deleteRequest.onblocked = () => {
      console.warn('Delete blocked. DB is still in use.');
    };
  } else {
    window.close();
  }
}

function getBrowserLocale() {
  const browserLocales = navigator.languages.map(lang => lang.split("-")[0]);
  return browserLocales.find(lang => supportedLocales.includes(lang)) || defaultLocale;
}

function setLocale() {
  document.documentElement.dir = ((locale === "ar") && supportedLocales.includes("ar")) ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach(translateElement);
}

function translateElement(element) {
  const key = element.getAttribute("data-i18n");
  const translation = translations[locale][key];
  element.innerText = translation;
}




function incrowscount() {
  var val = rowscount;
  val += 5;
  if (val > 25) {
    val = 15;
  }
  rowscount = val;
  listItemHeight = "calc(90vh/" + rowscount + ")"; //"calc((100vh - 8vh - 14px)/" + rowscount + ")";
  document.getElementById("rowscount").value = rowscount;
}

function changeLanguage() {
  var val = supportedLocales.indexOf(locale);
  val += 1;
  if (val > supportedLocales.length - 1) {
    val = 0;
  }
  locale = supportedLocales[val];
  document.getElementById("language").value = locale;
  setLocale();
}

function changePlayerType() {
  var val = playerTypeList.indexOf(playerType);
  val += 1;
  if (val > playerTypeList.length - 1) {
    val = 0;
  }
  playerType = playerTypeList[val];
  document.getElementById("playerType").value = playerType;
}


async function init() {
  console.log("User-agent: " + window.navigator.userAgent);  

  getSettings();
  setLocale();
  getState();
   
  if (!window.indexedDB) {
    console.warn('IndexedDB not available');
  } else {
    if (epgSource === "xmltv") useDB = true;
  }

  if (useDB) await initEPGDB();

  listItemHeight = "calc(90vh/" + rowscount + ")"; //"calc((100vh - 8vh - 14px)/" + rowscount + ")";

  if (m3ulink != "" && m3ulink != null) {
    await loadPlaylist();
    if (playlist.length > 0) {
      await loadEPG();
      currentGroupIndex = lastGroupIndex;
      currentChannelIndex = lastPlayIndex;
      parseGroups();
      if (currentGroupIndex >= 0 && currentGroupIndex < groups.length) {
        parseChannels(currentGroupIndex);
        if (currentChannelIndex >= 0 && currentChannelIndex < channels.length) {
          if (playAtStart > 0) {
            setChannelInfo(currentChannelIndex);
            playChannel();
          } else {
            setTimeout(() => {
              toggleMenu(3)
            }, 1000);
          }
        } else {
          currentChannelIndex = 0;
          setTimeout(() => {
            toggleMenu(3)
          }, 1000);
        }
      }
    }
  } else {
    setTimeout(() => {
      toggleMenu(2)
    }, 1000);
  }
  setTimeout(() => {
    spinnerShow(false)
  }, 1000);
}

async function loadPlaylist() {
  console.log('Loading playlist..');
  loadingstatus.textContent = "Loading playlist..";

  if (!(playlist.length > 0)) {
    isNewPlaylist = true;

    const urlParts = m3ulink.split('#');
    const baseUrl = urlParts[0];
    const fragment = urlParts[1] || '';

    const params = new URLSearchParams(fragment);
    if (params.has('catchup')) catchup = params.get('catchup');
    if (params.has('catchup-days')) catchup_days = params.get('catchup-days');
    if (params.has('catchup-source')) catchup_source = params.get('catchup-source');

    try {
      const text = await get_data(baseUrl, 'text/plain');
      playlist = await parseM3u(text);
      localStorage.setItem('playlist', JSON.stringify(playlist));
      loadingstatus.textContent = "Playlist loaded.";
    } catch (err) {
      console.error('Failed to load playlist! ' + err);
      loadingstatus.textContent = "Failed to load playlist!";
      setTimeout(() => {
        toggleMenu(1);
      }, 1000);
    }
  }
}

async function loadEPG() {
  if (epgSource === "none") return;

  console.log('Loading epg..');
  loadingstatus.textContent = "Loading TV guide..";

  if (epgSource === "xmltv") {
    if (epglink != "" && epglink != null) {
      if (isNewPlaylist || await isEpgOutdated()) {
        if (isNewPlaylist) {
          try {
            await clearEpg();
            console.log("EPG storage cleared.");
          } catch (err) {
            console.error("Failed to clear EPG storage:", err);
          }
        }
        getXmlEPG(epglink)
          .then(() => {
            if (isNewPlaylist) {
              setChannelsTvgIds();
            } else {
              cleanUpEpg();
              epg_now();
            }
          })
          .catch(error => {
            console.error("EPG parsing failed:", error);
          });
      } else {
        loadingstatus.textContent = "";
        cleanUpEpg();
        epg_now();
      }
    } else {
      return;
    }
  } else {    
    setChannelsTvgIds(); 
  }
}


function saveSettings() {
  localStorage.clear();
  sessionStorage.clear();
  playlist = [];
  channels = [];
  groups = [];
  keys = {};

  currentGroupIndex = 0;
  currentChannelIndex = 0;
  lastGroupIndex = 0;
  lastPlayIndex = 0;

  locale = document.getElementById("language").value;  
  rowscount = Number(document.getElementById("rowscount").value);
  playerType = document.getElementById("playerType").value;
  m3ulink = document.getElementById("m3uUrl").value;
  epgSource = document.querySelector('input[name="epgsource"]:checked').value; 
  epglink = document.getElementById("xmltvUrl").value;
  playAtStart = document.getElementById("playAtStart").checked ? 1 : 0;
  keepEpgArchive = document.getElementById("keepEpgArchive").checked ? 1 : 0;
  keepEpgDescr = document.getElementById("keepEpgDescr").checked ? 1 : 0;
  document.querySelectorAll('.remotekey').forEach(el => { if (el.value != "") { keys[el.id] = Number(el.value); } });  

  localStorage.setItem('language', locale);
  localStorage.setItem('rowscount', rowscount);
  localStorage.setItem('playerType', playerType);
  localStorage.setItem('playAtStart', playAtStart);
  localStorage.setItem('m3u-url', m3ulink);
  localStorage.setItem('epgSource', epgSource);
  localStorage.setItem('xmltv-url', epglink);  
  localStorage.setItem('keepEpgArchive', keepEpgArchive);
  localStorage.setItem('keepEpgDescr', keepEpgDescr);  
  localStorage.setItem('remotekeys', JSON.stringify(keys));

  location.reload();
}

function getSettings() {
  console.log('Loading settings..');
  loadingstatus.textContent = "Loading settings..";
  const browserLocale = getBrowserLocale();
  locale = localStorage.getItem('language') || browserLocale;
  rowscount = +localStorage.getItem('rowscount') || rowscount;
  playerType = localStorage.getItem('playerType') || playerType;
  playAtStart = +localStorage.getItem('playAtStart') || playAtStart;
  m3ulink = localStorage.getItem('m3u-url');
  epgSource = localStorage.getItem('epgSource') || epgSource;  
  epglink = localStorage.getItem('xmltv-url') || defaultEpgLink;
  keepEpgArchive = +localStorage.getItem('keepEpgArchive') || keepEpgArchive;
  keepEpgDescr = +localStorage.getItem('keepEpgDescr') || keepEpgDescr;

  document.getElementById("language").value = locale;
  document.getElementById("rowscount").value = rowscount;
  document.getElementById("playerType").value = playerType;
  document.getElementById("m3uUrl").value = m3ulink;
  document.getElementById("xmltvUrl").value = epglink;
  document.getElementById("playAtStart").checked = (playAtStart === 1) ? true : false;
  document.getElementById("keepEpgDescr").checked = (keepEpgDescr === 1) ? true : false;
  document.getElementById("keepEpgArchive").checked = (keepEpgArchive === 1) ? true : false;  

  if (epgApi_Url === "") document.querySelector('input[name="epgsource"][value="server"]').disabled = true;
  document.querySelector(`input[name="epgsource"][value="${epgSource}"]`).checked = true;

  const xmlInput = document.getElementById('xmltvUrl');
  if (epgSource === 'xmltv') {
    xmlInput.disabled = false;
  } else {
    xmlInput.disabled = true;
  }

  keys = JSON.parse(localStorage.getItem('remotekeys')) || keys;
  Object.entries(keys).forEach(([key, value]) => { document.getElementById(key).value = value; });
}

function saveState() {
  localStorage.setItem('lastPlayIndex', lastPlayIndex);
  localStorage.setItem('lastGroupIndex', lastGroupIndex);
  localStorage.setItem('playlist', JSON.stringify(playlist));
}

function getState() {
  console.log('Loading state..');
  loadingstatus.textContent = "Loading state..";
  lastPlayIndex = +localStorage.getItem('lastPlayIndex') || 0;
  lastGroupIndex = +localStorage.getItem('lastGroupIndex') || 0;
  playlist = JSON.parse(localStorage.getItem('playlist')) || playlist;
}

//video.addEventListener("loadstart", () => spinnerShow());

video.addEventListener("waiting", () => spinnerShow());

video.addEventListener("playing", () => {
  spinnerShow(false);
  if (video.hasAttribute("controls")) {
    video.removeAttribute("controls");
  }
  let qualityName = "";
  let vheight = video.videoHeight;
  let vwidth = video.videoWidth;
  if (vheight < 720) {
    qualityName = "SD";
  } else if (vheight < 1080) {
    qualityName = "HD";
  } else if (vheight < 1440) {
    qualityName = "FHD";
  } else if (vheight < 2160) {
    qualityName = "QHD";
  } else {
    qualityName = "UHD";
  }
  let quality = qualityName + " [ " + vwidth + " x " + vheight + " ]";
  document.getElementById("infoquality").textContent = quality;
});

function playVideo(streamUrl) {
  spinnerShow();

  video.src = "";
  video.load();

  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (playerType === "native") {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.play().then(() => {
        spinnerShow(false);
      }).catch(err => {
        console.error("Error in play (native):", err);
        spinnerShow(false);
      });
    } else {
      alert("Your browser does not support HLS streaming.\n Choose other player.");
      spinnerShow(false);
    }
  }

  if (playerType === "hlsjs") {
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        startLevel: 0,
        lowLatencyMode: true,
        liveDurationInfinity: true,
        abrMaxWithRealBitrate: true,
        enableWebVTT: true,
        enableCEA708Captions: true
      });

      hls.once(Hls.Events.MANIFEST_PARSED, (event, data) => {
        video.play().then(() => {          
          spinnerShow(false);
        }).catch(err => {
          console.error("Error in play:", err);
          spinnerShow(false);
        });
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("Error HLS:", data);
        spinnerShow(false);
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

    } else {
      alert("HLS.JS not supported.\n Choose other player.");
      spinnerShow(false);
    }
  }
}



function parseGroups() {
  const groupsContainer = document.getElementById("groupsContainer");
  const groupsarray = [...new Set(playlist.map(channel => channel.group))];
  groupsContainer.innerHTML = "";
  groups = [];
  groupsarray.forEach(item => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "container-item";
    groupDiv.style.height = listItemHeight;
    groupDiv.textContent = item;
    groupsContainer.appendChild(groupDiv);
    groups.push(groupDiv);
  });
}

function parseChannels(groupindex) {
  const lines = playlist.filter(channel => channel.group === groups[groupindex].textContent);
  channelsContainer.innerHTML = "";
  channels = [];
  var i = 1;
  lines.forEach(line => {
    const chnum = line.num;
    const chName = line.name;
    const icon = line.tvg.logo || dummyIcon;
    const channelDiv = document.createElement("div");
    channelDiv.className = "container-item";
    channelDiv.setAttribute("num", chnum);
    channelDiv.style.height = listItemHeight;
    channelDiv.innerHTML = "<span style=\"width: 5%; display: flex;\"><img class=\"progicon\" id=\"logo\" style=\"height: " + listItemHeight + ";\"  src=\"" + icon + "\"></span><span class=\"prognum\">" + ('000' + i).slice(-4) + "</span><span class=\"progname\">" + chName + "</span><span class=\"prog\"></span>";
    channelsContainer.appendChild(channelDiv);
    channels.push(channelDiv);
    i += 1;
  });
}

function renderEpg(events) {
  let htmlString = "";
  if (events.length > 0) {
    const channel = getChannelInfo(currentChannelIndex);
    const url = channel.url;
    let days = Number(channel?.catchup_days || 0);
    let template = "";
    if (channel.catchup === "default") {
      template = channel.catchup_source || url;
    } else if (channel.catchup === "append") {
      template = url + channel.catchup_source;
    } else if (channel.catchup === "shift") {
      template = url + "?utc=${start}&lutc=${timestamp}";
    } else {
      template = url;
      days = 0;
    }
    let markColor;
    let now = new Date();
    const dtnow = toTimestamp(now);
    now.setHours(0, 0, 0, 0);

    const maxday = days > 0 ? Math.floor(dtnow - (days * 24 * 60 * 60)) : 0;

    const pad = n => String(n).padStart(2, '0');
    events.forEach(line => {
      let markCurrent = "";
      const startDate = fromTimestamp(line.start);
      let startTime = toTime(startDate);
      let dateYMD = DateToUtcYMD(startDate);
      if (startDate.toDateString() != now.toDateString()) {
        const month = pad(startDate.getMonth() + 1);
        const day = pad(startDate.getDate());
        const time = toTime(startDate);
        startTime = `(${day}.${month}) ${time}`;
      }
      const currentTitle = line.title;
      const streamUrl = generateStreamUrl(template, [line.start, line.stop]);

      const epgDiv = document.createElement("div");
      epgDiv.className = "container-item";
      epgDiv.style.height = listItemHeight;
      if (Number(line.start) > dtnow) {
        epgDiv.style.color = "gray";
      }
      if ((Number(line.start) < dtnow) && (Number(line.stop) > dtnow)) {
        markCurrent = ">>";
        epgDiv.classList.add("selected");
      }
      if (Number(line.stop) < dtnow) {
        if ((maxday > 0) && (Number(line.start) >= maxday)) {
          markColor = 'rgba(0,255,0,1)';
          epgDiv.addEventListener("click", function () {
            isArchivePlaying = true;
            playVideo(streamUrl);
            epgShow(false);
          });
        } else {
          markColor = 'rgba(255,0,0,1)';
        }
      } else {
        markColor = 'rgba(0,0,0,0)';
      }
      const recinfo = "<span class=\"progicon circle\" style=\"background-color: " + markColor + ";\"></span>";
      epgDiv.innerHTML = "<span class=\"epgDate\" epgutc=\"" + dateYMD + "\">" + startTime + "</span><span class=\"progicon\" style=\"width: 5%; display: flex; align-items: center;\">" + markCurrent + "</span><span class=\"epgTitle\">" + currentTitle + "</span>" + recinfo;
      htmlString += epgDiv.outerHTML;
    });
  }
  return htmlString;
}



function getChannelInfo(index) {
  const chnum = Number(channels[index].getAttribute("num"));
  const channel = playlist.find(ch => ch.num === chnum);
  return channel;
}

async function setChannelInfo(index) {
  const channel = getChannelInfo(index);
  const chId = channel.tvg.id;  
  const isepg = channel.tvg.isepg;
  let currprog, nextprog, descr;
  currprog = nextprog = descr = "";
  let perc = 0;
  if (chId != "" && isepg != "") {
    [currprog, nextprog, perc, descr] = await getEpgProgress(chId);
    const last = 100 - perc;
    if (perc > 50) {
      style = 'linear-gradient(to right, #058 0%, #058 ' + perc + '%, transparent ' + last + '%, transparent 100%)';
    } else {
      style = 'linear-gradient(to left, transparent 0%, transparent ' + last + '%, #058 ' + perc + '%, #058 100%)';
    }
    channels[index].querySelector(".prog").textContent = currprog;
    channels[index].querySelector(".prog").style.background = style;
    channels[index].querySelector(".prog").style["font-size"] = (1 - (rowscount - 15) * 0.02) + 'em';
  }
}

function spinnerShow(show = true) {
  if (!show) loadingstatus.textContent = "";
  spinner.style.display = show ? "flex" : "none";
}

function logShow(show = true) {
  loglist.style.display = show ? "block" : "none";
  if (show) {
    const logDiv = document.getElementById('logContainer');
    logDiv.scrollTop = logDiv.scrollHeight;
  }
}

function settingsShow(show = true) {
  settings.style.display = show ? "block" : "none";
  if (show) {
    document.getElementById("language").focus();
  }
}

function groupsShow(show = true) {
  groupsList.style.display = show ? "block" : "none";
  if (show) {
    groups[currentGroupIndex].classList.add("selected");
    cursorMove(groupsContainer, '.container-item', 1, 0, true);
  } else {
    groupsList.querySelectorAll('.selected').forEach(el => el.classList.remove("selected"));
  }
}

function channelsShow(show = true) {
  channelsList.style.display = show ? "block" : "none";
  if (show) {
    channelListHeader.innerHTML = "<span>" + groups[currentGroupIndex].textContent + " [" + (currentChannelIndex + 1) + "/" + (channels.length) + "]</span>";
    channels[currentChannelIndex].classList.add("selected");
    cursorMove(channelsContainer, '.container-item', 1, 0, true);
    channels.forEach((channel, index) => {
      setChannelInfo(index);
    });
  } else {
    channelsList.querySelectorAll('.selected').forEach(el => el.classList.remove("selected"));
    chNum.innerHTML = "<span>" + (lastPlayIndex + 1) + "</span>";
  }
}

function epgShow(show = true) {
  const epgListHeader = document.getElementById("epgListHeader");
  epgContainer.innerHTML = "";
  epglist.style.display = show ? "block" : "none";
  if (show) {
    const channel = getChannelInfo(currentChannelIndex);
    const chId = channel.tvg.id;
    const isepg = channel.tvg.isepg;
    const child = document.createElement("span");
    child.innerText = ": " + channel.name;
    epgListHeader.removeChild(epgListHeader.lastChild);
    epgListHeader.appendChild(child);
    if (chId != "" && isepg != "") {
      loadingstatus.textContent = "Loading TV guide";
      spinnerShow();
      const now = new Date();
      getChannelEpg(chId, DateToUtcYMD(now)) 
        .then(programmes => {
          epgContainer.innerHTML = renderEpg(programmes);
          spinnerShow(false);
          cursorMove(epgContainer, '.container-item', 1, 0, true);
        })
        .catch(err => {
          console.error('Error:', err);
          spinnerShow(false);
        });
    }
  }
}

function chNumShow(show = true) {
  if (show) {
    chNum.innerHTML = "<span>" + (currentChannelIndex + 1) + "</span>";
    chNum.style.display = 'block';
    clearTimeout(chNumHideTimeout);
    chNumHideTimeout = setTimeout(() => chNumShow(false), 5000);
  } else {
    chNum.style.display = 'none';
    clearTimeout(chNumHideTimeout);
  }
}

async function infobarShow(show = true) {
  if (show) {
    const channel = getChannelInfo(currentChannelIndex);
    const chId = channel.tvg.id;
    const isepg = channel.tvg.isepg;
    const name = channel.name;
    const logo = channel.tvg.logo || dummyIcon;
    const progn = ('000' + (currentChannelIndex + 1)).slice(-4);
    let currprog, nextprog, descr;
    currprog = nextprog = descr = "";
    let perc = 0;
    
    if (chId != "" && isepg != "") {
      [currprog, nextprog, perc, descr] = await getEpgProgress(chId);
    }
    
    if (currprog === "") {
      document.getElementById("infoprogress").style.display = 'none';
    } else {
      document.getElementById("infoprogress").style.display = 'inline-block';
    }    
    document.getElementById("infoname").textContent = name;
    document.getElementById("infochnum").textContent = progn;
    document.getElementById("infocurrent").textContent = currprog;
    document.getElementById("infologo").src = logo;
    document.getElementById("infoprogress").value = perc;
    document.getElementById("infonext").textContent = nextprog;
    if (descr === "") {
      descr = currprog;
      if (descr === "") descr = "No data";
    }
    infodescr.innerHTML = '<b>' + name + '</b><br>' + currprog + '<hr>' + descr;
    infodescr.style.display = 'none';
    infobar.style.display = 'flex';
    clearTimeout(infoBarHideTimeout);
    infoBarHideTimeout = setTimeout(() => infobarShow(false), 5000);
  } else {
    if (infodescr.style.display === 'none') {
      infobar.style.display = 'none';
      clearTimeout(infoBarHideTimeout);
    }
  }
}

function infodescrShow(show = true) {
  infodescr.style.display = show ? "block" : "none";
  if (show) {
    infodescr.focus();
  } else {
    clearTimeout(infoBarHideTimeout);
    infoBarHideTimeout = setTimeout(() => infobarShow(false), 5000);
  }
}

function exitShow(show = true) {
  modalexit.style.display = show ? "block" : "none";
  if (show) {
    document.getElementById("cancelBtn").focus();
  }
}

function NextCh(inc) {
  currentChannelIndex = (currentChannelIndex + inc) % channels.length;
  setChannelInfo(currentChannelIndex);
}

function PrevCh(inc) {
  currentChannelIndex = (currentChannelIndex - inc + channels.length) % channels.length;
  setChannelInfo(currentChannelIndex);
}

function cursorMove(container, selector, direction = 1, count = 1, scroll = false) {
  var items = Array.prototype.slice.call(container.querySelectorAll(selector)) || [];
  if (items.length > 0) {
    var currentItem = container.querySelector(".selected");
    if (!currentItem) currentItem = items[items.length - 1];
    var currItemIndex = items.indexOf(currentItem);
    let nextItemIndex = (currItemIndex + count) % items.length;
    if (direction < 0) {
      nextItemIndex = (currItemIndex - count + items.length) % items.length;
    }
    var item = items[nextItemIndex];
    if (item) {
      currentItem?.classList.remove("selected");
      item.classList.add("selected");
      item.focus();

      if (scroll) {
        items[Math.floor(nextItemIndex / rowscount) * rowscount].scrollIntoView({ behavior: "auto", block: "start", inline: "start" });
      }
    }
  }
}

function EnterGroup() {
  parseChannels(currentGroupIndex);
  if (currentGroupIndex != lastGroupIndex) {
    currentChannelIndex = 0;
  } else {
    currentChannelIndex = lastPlayIndex;
  }
  toggleMenu(4);
}

function playChannel() {
  const channel = getChannelInfo(currentChannelIndex);
  const streamUrl = channel.url;
  channelsShow(false);
  chNumShow();
  infobarShow();
  if ((currentChannelIndex != lastPlayIndex) || (currentGroupIndex != lastGroupIndex) || (video.src === "") || (isArchivePlaying === true)) {
    [prevChannelIndex, prevGroupIndex] = [lastPlayIndex, lastGroupIndex];
    [lastPlayIndex, lastGroupIndex] = [currentChannelIndex, currentGroupIndex];
    saveState();
    isArchivePlaying = false;
    playVideo(streamUrl);
  }
}

function getCurrentMenuPage() {
  let result;
  if (modalexit.style.display === 'block') { result = -1; }
  else if (loglist.style.display === 'block') { result = 1; }
  else if (settings.style.display === 'block') { result = 2; }
  else if (groupsList.style.display === 'block') { result = 3; }
  else if (channelsList.style.display === 'block') { result = 4; }
  else if (epglist.style.display === 'block') { result = 5; }
  else { result = 0; }
  return result;
}

function toggleMenu(page) {
  document.querySelectorAll(".menu-wrapper").forEach(el => el.style.display = 'none');
  infodescrShow(false);
  infobarShow(false);
  switch (page) {
    case -1:
      exitShow();
      break;
    case 1:
      logShow();
      break;
    case 2:
      settingsShow();
      break;
    case 3:
      if (playlist.length > 0) {
        groupsShow();
      } else {
        toggleMenu(2);
      }
      break;
    case 4:
      if (playlist.length > 0) {
        channelsShow();
      } else {
        toggleMenu(2);
      }
      break;
    case 5:
      if (playlist.length > 0) {
        epgShow();
      } else {
        toggleMenu(2);
      }
      break;
    default:
      groupsList.querySelectorAll('.selected').forEach(el => el.classList.remove("selected"));
      channelsList.querySelectorAll('.selected').forEach(el => el.classList.remove("selected"));
      currentChannelIndex = lastPlayIndex;
      if (currentGroupIndex != lastGroupIndex) {
        currentGroupIndex = lastGroupIndex;
        parseChannels(currentGroupIndex);
      }
  }
}

function is_input_mode() {
  return document.activeElement.id === "m3uUrl" || document.activeElement.id === "xmltvUrl";
}


/********** KEYBOARD EVENTS **********/


document.getElementById("language").addEventListener("keydown", function (e) {
  e.preventDefault();
  if (e.repeat) return;
  if (e.key === "Enter") {
    changeLanguage();
  }
});

document.querySelectorAll('input[type="radio"]').forEach(el => el.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  if (e.key === "Enter") {
    e.preventDefault();
    e.target.click();
  }
}));

document.querySelectorAll('input[name="epgsource"]').forEach(radio => {
  radio.addEventListener('change', function (e) {
    const xmlInput = document.getElementById('xmltvUrl');
    const selectedValue = document.querySelector('input[name="epgsource"]:checked').value;
    if (selectedValue === 'none') {
      epgSource = "none";
      xmlInput.disabled = true;
    } else if (selectedValue === 'server') {
      epgSource = "server";
      xmlInput.disabled = true;
    } else if (selectedValue === 'xmltv') {
      epgSource = "xmltv";
      xmlInput.disabled = false;      
    } 
  });
});

document.getElementById("rowscount").addEventListener("keydown", function (e) {
  e.preventDefault();
  if (e.repeat) return;
  if (e.key === "Enter") {
    incrowscount();
  }
});

document.getElementById("playerType").addEventListener("keydown", function (e) {
  e.preventDefault();
  if (e.repeat) return;
  if (e.key === "Enter") {
    changePlayerType();
  }
});

document.querySelectorAll('input[type="checkbox"]').forEach(el => el.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  if (e.key === "Enter") {
    e.preventDefault();
    e.target.checked = !e.target.checked;
  }
}));


document.querySelectorAll('.remotekey').forEach(el => el.addEventListener("keydown", function (e) {
  if (e.key != "ArrowLeft" && e.key != "ArrowRight" && e.key != "ArrowUp" && e.key != "ArrowDown") {
    e.preventDefault();
    if (e.repeat) return;
    if (e.key != "Enter" || e.keyCode != 13) {
      e.target.value = e.keyCode;
    } else {
      e.target.value = "";
    }
  }
}));

document.addEventListener("keyup", function (e) {
  if ((getCurrentMenuPage() === 0) && (infodescr.style.display === 'none')) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp" || e.keyCode === keys.CH_DOWN || e.keyCode === keys.CH_UP) {
      e.preventDefault();
      playChannel();
    }
    return;
  }
});


document.addEventListener("keydown", function (e) {
  switch (getCurrentMenuPage()) {
    case -1: //exit
      const buttons = Array.from(modalexit.querySelectorAll('button'));
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        var current = buttons.indexOf(document.activeElement);
        current = (current + 1) % buttons.length;
        buttons[current].focus();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.target.click();
      }
      break;
    case 1: //log
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.repeat) return;
        toggleMenu(2); //switch to settings
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        document.getElementById('logContainer').scrollBy({
          top: -100,
          left: 0,
          behavior: "smooth",
        });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        document.getElementById('logContainer').scrollBy({
          top: 100,
          left: 0,
          behavior: "smooth",
        });
      }
      break;
    case 2: //settings
      var inputs = Array.prototype.slice.call(
        settings.querySelectorAll('.input:not(:disabled)')
      );
      if (e.key === "ArrowLeft") {
        if (!is_input_mode()) {
          e.preventDefault();
          if (e.repeat) return;
          toggleMenu(1); //switch to logs  
        }
      }
      if (e.key === "ArrowRight") {
        if (!is_input_mode()) {
          e.preventDefault();
          if (e.repeat) return;
          toggleMenu(3); //switch to groups  
        }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        var currInput = document.activeElement;
        var currInputIndex = inputs.indexOf(currInput);
        var nextinputIndex = (currInputIndex + 1) % inputs.length;
        var input = inputs[nextinputIndex];
        input.focus();
        input.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" })
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        var currInput = document.activeElement;
        var currInputIndex = inputs.indexOf(currInput);
        var nextinputIndex = (currInputIndex - 1 + inputs.length) % inputs.length;
        var input = inputs[nextinputIndex];
        input.focus();
        input.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" })
      }
      break;
    case 3: //groups
      if (groups.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          currentGroupIndex = (currentGroupIndex + 1) % groups.length;
          cursorMove(groupsContainer, '.container-item', 1, 1, true);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          currentGroupIndex = (currentGroupIndex - 1 + groups.length) % groups.length;
          cursorMove(groupsContainer, '.container-item', -1, 1, true);
        }
        if (e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          if (e.repeat) return;
          EnterGroup();
        }
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (e.repeat) return;
        toggleMenu(2); //switch to settings
      }
      break;
    case 4: //channels
      if (channels.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          NextCh(1);
          cursorMove(channelsContainer, '.container-item', 1, 1, true);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          PrevCh(1);
          cursorMove(channelsContainer, '.container-item', -1, 1, true);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          playChannel();
        }
        if (e.key === "PageDown" || e.keyCode === keys.CH_DOWN) {
          e.preventDefault();
          NextCh(rowscount);
          cursorMove(channelsContainer, '.container-item', 1, rowscount, true);
        }
        if (e.key === "PageUp" || e.keyCode === keys.CH_UP) {
          e.preventDefault();
          PrevCh(rowscount);
          cursorMove(channelsContainer, '.container-item', -1, rowscount, true);
        }
        channelListHeader.innerHTML = "<span>" + groups[currentGroupIndex].textContent + " [" + (currentChannelIndex + 1) + "/" + (channels.length) + "]</span>";
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (e.repeat) return;
        toggleMenu(3); //switch to groups
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.repeat) return;
        toggleMenu(5); //switch to epg
      }
      break;
    case 5: //epg
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (e.repeat) return;
        toggleMenu(4); //switch to channels
      }
      if (e.key === "Enter") {
        e.preventDefault();
        epgContainer.querySelector(".selected").click();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        var items = Array.prototype.slice.call(epgContainer.querySelectorAll('.container-item')) || [];
        if (items.length > 0) {
          var currentItem = epgContainer.querySelector(".selected");
          var currItemIndex = items.indexOf(currentItem);
          if (currItemIndex === (items.length - 1)) {
            loadingstatus.textContent = "Loading TV guide";
            spinnerShow();
            const dateYMD = currentItem.querySelector(".epgDate").getAttribute("epgutc");
            const channel = getChannelInfo(currentChannelIndex);
            const chId = channel.tvg.id;
            let date = DateFromUtcYMD(dateYMD);
            date.setDate(date.getDate() + 1);
            getChannelEpg(chId, DateToUtcYMD(date))
              .then(programmes => {
                if (programmes.length > 0) {
                  const htmlString = renderEpg(programmes);
                  epgContainer.insertAdjacentHTML('beforeend', htmlString);                  
                } 
                spinnerShow(false);
                cursorMove(epgContainer, '.container-item', 1, 1, true);
              })
              .catch(err => {
                //console.error('Error:', err);
                spinnerShow(false);
                cursorMove(epgContainer, '.container-item', 1, 1, true);
              });
          } else {
            cursorMove(epgContainer, '.container-item', 1, 1, true);
          }
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        var items = Array.prototype.slice.call(epgContainer.querySelectorAll('.container-item')) || [];
        if (items.length > 0) {
          var currentItem = epgContainer.querySelector(".selected");
          var currItemIndex = items.indexOf(currentItem);
          if (currItemIndex === 0) {
            loadingstatus.textContent = "Loading TV guide";
            spinnerShow();            
            const dateYMD = currentItem.querySelector(".epgDate").getAttribute("epgutc");
            const channel = getChannelInfo(currentChannelIndex);
            const chId = channel.tvg.id;
            let date = DateFromUtcYMD(dateYMD);
            date.setDate(date.getDate() - 1);
            getChannelEpg(chId, DateToUtcYMD(date))
              .then(programmes => {
                if (programmes.length > 0) {
                  const htmlString = renderEpg(programmes);
                  epgContainer.insertAdjacentHTML('afterbegin', htmlString);
                }
                spinnerShow(false);
                cursorMove(epgContainer, '.container-item', -1, 1, true);
              })
              .catch(err => {
                //console.error('Error:', err);
                spinnerShow(false);
                cursorMove(epgContainer, '.container-item', -1, 1, true);
              });
          } else {
            cursorMove(epgContainer, '.container-item', -1, 1, true);
          }
        }
      }
      break;
    default: //player
      //settings
      if (e.keyCode === keys.RED) {
        e.preventDefault();
        toggleMenu(2);
        return;
      }
      //epg
      if (e.keyCode === keys.GREEN || e.keyCode === keys.EPG) {
        e.preventDefault();
        toggleMenu(5);
        return;
      }
      //audiotrack
      if (e.keyCode === keys.YELLOW) {
        e.preventDefault();
        //TODO: show audiotrack switcher  
        return;
      }
      //infobar
      if (e.keyCode === keys.INFO || e.keyCode === keys.BLUE) {
        e.preventDefault();
        if (infobar.style.display === 'none') {
          infobarShow();
        } else {
          if (infodescr.style.display === 'none') {
            infodescrShow();
          } else {
            infodescrShow(false);
          }
        }
        return;
      }
      if ((e.key === "ArrowDown" || e.key === "PageDown" || e.keyCode === keys.CH_DOWN) && channels.length > 0) {
        if (infodescr.style.display === 'none') {
          e.preventDefault();
          PrevCh(1);
          chNumShow();
          infobarShow();
        }
      }
      if ((e.key === "ArrowUp" || e.key === "PageUp" || e.keyCode === keys.CH_UP) && channels.length > 0) {
        if (infodescr.style.display === 'none') {
          e.preventDefault();
          NextCh(1);
          chNumShow();
          infobarShow();
        }
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        if (!isArchivePlaying) {
          toggleMenu(4);
        } else {
          toggleMenu(5);
        }
      }
      if (e.keyCode === keys.PRE_CH) { //Previous channel / recall
        e.preventDefault();
        if (e.repeat) return;
        if (prevGroupIndex != currentGroupIndex) {
          [currentChannelIndex, currentGroupIndex] = [prevChannelIndex, prevGroupIndex];
          parseChannels(currentGroupIndex);
          playChannel();
        } else {
          if (prevChannelIndex != currentChannelIndex) {
            currentChannelIndex = prevChannelIndex;
            playChannel();
          }
        }
      }
      // Keyboard player controls
      if (e.key === "MediaPlay" || e.keyCode === keys.PLAY) {
        e.preventDefault();
        if (video.paused) {
          if (playerType === "hlsjs") hls.startLoad();
          video.play();
        }
      }
      if (e.key === "Pause" || e.key === "MediaStop" || e.keyCode === keys.PAUSE || e.keyCode === keys.STOP) {
        e.preventDefault();
        if (!video.paused) {
          if (playerType === "hlsjs") hls.stopLoad();
          video.pause();
        }
        if (!video.hasAttribute("controls")) {
          video.setAttribute("controls", "")
        }
      }
      if (isArchivePlaying) {
        if (e.key === "MediaRewind" || e.keyCode === keys.REWIND) {
          e.preventDefault();
          if (!video.hasAttribute("controls")) {
            video.setAttribute("controls", "")
          }
          if (!video.paused) video.currentTime += -10;
        }
        if (e.key === "MediaFastForward" || e.keyCode === keys.FORWARD) {
          e.preventDefault();
          if (!video.hasAttribute("controls")) {
            video.setAttribute("controls", "")
          }
          if (!video.paused) {
            video.currentTime += 10;
          }
        }
      }
      break;
  }

  //Close menu
  if (e.key === "Escape" || e.key === "Backspace") {
    e.preventDefault();
    if (e.repeat) return;
    if (getCurrentMenuPage() != 0) {
      toggleMenu(0);
    } else {
      if (infobar.style.display === 'none') {
        toggleMenu(-1);
      } else {
        toggleMenu(0);
      }
    }
    return;
  }
});



async function setChannelsTvgIds() {
  if (!isNewPlaylist) return;
  statusbar.style.display = 'block';
  statusbar.textContent = "Processing channels..";
  console.log("Processing channels..");

  if (useDB) {
    await getCurrentEpgDB();
    for (const plEntry of playlist) {
      EPGnow.forEach(channel => {
        const matched = channel.names.some(name => name.toLowerCase() === plEntry.name.toLowerCase());
        if (matched) {
          plEntry.tvg = plEntry.tvg || {};
          plEntry.tvg.id = channel.id;
          plEntry.tvg.isepg = "1";
          plEntry.tvg.logo = channel.icon;
        }
      });
    }
  } else { //server json api
    for (const plEntry of playlist) {
      let currentepg = await getCurrentEpgJson(plEntry.name);
      if (currentepg != null) {
        plEntry.tvg = plEntry.tvg || {};
        plEntry.tvg.id = currentepg.id;
        plEntry.tvg.isepg = "1";
        plEntry.tvg.logo = currentepg.icon;
      }
    }
  }
  localStorage.setItem('playlist', JSON.stringify(playlist));
  statusbar.style.display = 'none';
  isNewPlaylist = false;
  parseChannels(currentGroupIndex);
  if (getCurrentMenuPage() === 4) {
    channels[currentChannelIndex].classList.add("selected");
    channels.forEach((channel, index) => {
      setChannelInfo(index);
    });
  }
}



