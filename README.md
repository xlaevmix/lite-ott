
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

