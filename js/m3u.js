/* Lite OTT/IPTV Web Player */
/*  m3u playlist parser */

async function parseM3u(m3uContent) {
  return new Promise((resolve, reject) => {
    try {
      const lines = m3uContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const channelsarray = [];
      let currentChannel = {};
      let currentName = '';
      let currentGroup = '';
      let currentTvg = {};
      let chnum = 1;
      let ch_catchup = '';
      let ch_catchup_days = '';
      let ch_catchup_source = '';
      let catchup = '';
      let catchup_days = '';
      let catchup_source = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('#EXTM3U')) {
          const extm3uAttrs = line.match(/(\w+(?:-\w+)*)="([^"]*)"/g);
          if (extm3uAttrs) {
            extm3uAttrs.forEach(attr => {
              const [key, value] = attr.split('=').map(s => s.replace(/"/g, ''));
              if (key === 'catchup') catchup = value;
              else if (key === 'catchup-days') catchup_days = value;
              else if (key === 'catchup-source') catchup_source = value;
            });
          }
        }

        if (line.startsWith('#EXTGRP')) {
          currentGroup = line.split(':')[1].trim();
        }

        if (line.startsWith('#EXTINF')) {
          const infoLine = line;
          const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
          let match;
          while ((match = attrRegex.exec(infoLine)) !== null) {
            const key = match[1];
            const value = match[2];
            if (key.startsWith('tvg-')) {
              if (key === "tvg-rec") {
                ch_catchup = "shift";
                ch_catchup_days = value;
              } else {
                currentTvg[key.slice(4)] = value;
              }
            } else if (key === 'group-title') {
              currentGroup = value;
            } else if (key === 'catchup') {
              ch_catchup = value;
            } else if (key === 'catchup-days') {
              ch_catchup_days = value;
            } else if (key === 'catchup-source') {
              ch_catchup_source = value;
            }
          }

          if (!("logo" in currentTvg)) currentTvg["logo"] = "";
          //if (!("id" in currentTvg)) 
            currentTvg["id"] = "";
            currentTvg["isepg"] = "";

          const nameMatch = infoLine.match(/,(.*)$/);
          if (nameMatch) {
            currentName = nameMatch[1].trim();
          }
        }

        if (line.startsWith('http')) {
          const streamUrl = generateStreamUrl(line);

          if (!ch_catchup_source) {
            ch_catchup_source = (/\$\{(start|end|timestamp|offset|duration)\}/.test(line) ? line : '');
          }

          if (ch_catchup === "" && catchup === "") {
            if (ch_catchup_source != "" || catchup_source != "") {
              ch_catchup = "default";
            } else if (ch_catchup_days != "" || catchup_days != "") {
              ch_catchup = "shift";
            }
          }

          currentChannel = {
            num: chnum,
            name: currentName,
            group: currentGroup || 'nogroup',
            url: streamUrl || '',
            tvg: currentTvg,
            catchup: ch_catchup || catchup,
            catchup_days: ch_catchup_days || catchup_days,
            catchup_source: ch_catchup_source || catchup_source
          };

          channelsarray.push(currentChannel);
          chnum += 1;
          currentChannel = {};
          currentName = '';
          currentGroup = '';
          currentTvg = {};
          ch_catchup = '';
          ch_catchup_days = '';
          ch_catchup_source = '';
        }
      }

      resolve(channelsarray);
    } catch (error) {
      reject(error);
    }
  });
}