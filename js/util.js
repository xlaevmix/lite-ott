/* Lite OTT/IPTV Web Player */
/*     Util script      */

function toTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}

function fromTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000);
}

function toTime(date) {
  const hours = "0" + date.getHours();
  const minutes = "0" + date.getMinutes();
  const timestr = hours.slice(-2) + ':' + minutes.slice(-2);
  return timestr;
}

function DateToUtcYMD(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function DateFromUtcYMD(yyyymmdd) {
  const year = parseInt(yyyymmdd.slice(0, 4), 10);
  const month = parseInt(yyyymmdd.slice(4, 6), 10) - 1; 
  const day = parseInt(yyyymmdd.slice(6, 8), 10);
  return new Date(Date.UTC(year, month, day));
}

function parseDate(dateStr) { //"YYYYMMDDhhmmss +hhmm"
  dateStr = dateStr.trim();
  const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));
    const timezoneOffset = dateStr.substring(15);

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    
    const offsetHours = parseInt(timezoneOffset.substring(0, 3));
    const offsetMinutes = parseInt(timezoneOffset.substring(3, 5));
    date.setUTCHours(date.getUTCHours() - offsetHours);
    date.setUTCMinutes(date.getUTCMinutes() - offsetMinutes);

    return date;  
}

function generateStreamUrl(template, epg = []) {
  const now = new Date();
  const timestamp = toTimestamp(now);
  const [ start = 0, end = 0 ] = epg;

  const offset = start ? timestamp - start : 0;
  const duration = end && start ? end - start : 0;

  return template
    .replace(/\${start}/g, start.toString())
    .replace(/\${end}/g, end.toString())
    .replace(/\${timestamp}/g, timestamp.toString()) 
    .replace(/\${offset}/g, offset.toString())
    .replace(/\${duration}/g, duration.toString());
}

async function get_data(data_url, mime) {
  try {
    const response = await fetch(data_url, {
      headers: {
        'Accept': mime
      },
      redirect: 'follow'
    });
    if (response.status === 404) {
      throw new Error(`404 Not Found: ${data_url}`);
    }
    if (!response.ok) {
      const errorMsg = `HTTP error: ${response.status} ${response.statusText} (${data_url})`;
      throw new Error(errorMsg);
    }
    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const isGzip = uint8[0] === 0x1f && uint8[1] === 0x8b;
    return isGzip ? buffer : new TextDecoder().decode(uint8);

  } catch (error) {
    const errorMsg = `Network or fetch error: ${error.message} (${data_url})`;
    throw new Error(errorMsg);
  }
}


function parseApiUrl(template, params) {
  // 1. Replace query params like ?key=${value} or &key=${value}
  let rawUrl = template.replace(/([?&])([^=]+)=\$\{(.*?)\}/g, (match, sep, paramName, key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      return ''; 
    }
    return `${sep}${paramName}=${value}`;
  });
  // 2. Replace path parameters like /${key}
  rawUrl = rawUrl.replace(/\/\$\{(.*?)\}/g, (match, key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      return ''; 
    }
    return `/${value}`;
  });
  // 3. Clean up leftover ? or & at the end
  rawUrl = rawUrl.replace(/[?&]+$/, '').replace(/\?&/, '?');

  return encodeURI(rawUrl);
}


async function getJson(url) {
  try {
    const response = await get_data(url, 'application/json');
    const data = await JSON.parse(response);
    return data;
  } catch (err) {
    throw err;
  }

}
