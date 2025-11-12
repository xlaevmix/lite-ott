
# ![Logo](https://github.com/xlaevmix/lite-ott/blob/main/img/dummy.png?raw=true)Lite-OTT 

Lite OTT/IPTV WEB Player is a web-based IPTV streaming application for Smart TVs. Lite OTT supports .m3u or .m3u8 playlists loaded by url and xmltv-format for EPG (TV guide), keyboard or remote control for navigation.


## Features

- Designed for Smart TVs (tested on Hisense VIDAA)
- Does not collect or sending any data, can be run locally
- Support .m3u or .m3u8 playlists via url
- Support EPG in xmltv format via url or json-api
- Support archive (catchup, tvg-shift)
- Pure html/css/javascript, no frameworks
- Uses browser's Local Storage and IndexedDB for storing playlist and EPG
- Navigation and control by keyboard or TV remote
- Additional key bindings for remote control
- Uses "pako" as fallback to unpack gzipped xmltv and "sax parser"
- Added HLS.js player, if browser's native html player not working
## Roadmap

- Add audiotrack/subtitle switcher


## Demo
https://xlaevmix.github.io/lite-ott/

## Screenshots
You can see in "Screenshots" folder of repository.

## Usage and navigation
1) on settings page fill necessary fields (playlist url, optional: epg url, optional: key bindings by pressing specified key on selected field)
   navigate by arrows
2) press OK/Update button on bottom of settings page (this will save your playlist url and settings in browser's Local storage and reload window to init app again with saved settings)
   Once the settings and playlist are saved, they will be loaded from the browser's Local storage every time you visit the application page.   
3) App initialization:
   - Loading playlist from browser's Local storage or given URL if there is no parsed playlist yet:
       App loads playlist from url, parses and saves to browser's Local storage only once after new settings saved, if you want to update playlist just press OK/Update button on settings page.
   - Loading EPG (xmltv):
       App loads EPG (xmltv) in separate thread using browser's web-worker to not blocking UI, parse and save to browser's Indexed database.
       EPG loaded every time when there is no EPG yet, or it is outdated (last event date is less than today).
       If you need to reload EPG manually just press OK/Update button on settings page.
   - If playlist is new and loaded from url, or new EPG loaded: Processing EPG to match epg channels against playlist channels by channel name, assign tvg-id, picons, etc.
4) Ready to use.
   ### Navigation:
   #### when channel stream is playing:
      - arrows Up/Down or buttons PageUp/PageDown switches Next/Previous channel
      - OK/Enter shows semi-transparent menu with channels list of current group
      - Esc/Backspace shows "Exit application" dialog
      - PRECH switches to previously playing channel and back even from other group
      - RED show settings
      - GREEN show EPG of current playing channel
      - YELLOW show audiotrack/subtitle switcher (not implemented yet)
      - BLUE show infobar with info of current playing channel, second press show description of current programme
   #### when menu is shown:
      - Esc/Backspace closes menu
      - arrows Left/Right navigates through menu pages
      - on Groups page:          
          - arrows Up/Down select group
          - buttons PageDown/PageUp scrolls to Next/Previous page (skip lines defined by number of rows in settings) and select group
          - OK/Enter or arrow "Right" - click on selected item - enter group
      - on Channels page:
          - arrows Up/Down select channel
          - buttons PageDown/PageUp scrolls to Next/Previous page (skip lines defined by number of rows in settings) and select channel
          - arrow "Right" show TV Guide of selected channel
          - OK/Enter play selected channel (same on TV Guide page to play archived programme)
    
    Player controls (PLAY/STOP/PAUSE/REWIND/FORWARD) available only when archived programme is playing.
   
## Usage of json-api as EPG source
1) You need a script on a web server which accepts requests with params:
- mode: [now , day], 
- date: yyyymmdd, 
- name: channel_name
```comment
mode=now - server should return only current and next event for given channel
mode=day - server should return all events for given channel and date
```
and response json data in following format:
```json
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
```
start/stop are timestamps.

2) assign url of your api endpoint to variable "epgApi_Url" in main.js:
```javascript
const epgApi_Url = 'http://example.com/epg/get_epg.php?mode=${mode}&date=${date}&name=${name}';
```
or if json api and app on same domain:
```javascript
const epgApi_Url = window.location.origin + '/${mode}/${date}/${name}';
```
or other pattern with params ${mode}, ${date}, ${name}.

Undefined parameters will be removed automatically when app parse url for sending request. For example: if mode=now then parameter ${date} not necessary and will be removed from resulting url.
## Acknowledgements

 - [HLS.js](https://github.com/video-dev/hls.js/): This project uses HLS.js for streaming.
 - [sax-js](https://github.com/isaacs/sax-js): SAX Parser to parse xmltv
 - [pako](https://github.com/nodeca/pako): pako inflate library to decompress gzipped data


## Contributing

Contributions are always welcome!

## Sponsor me
BTC: bc1qnum44a9pa77up40hjswkzzm66crfjvruep43hh
