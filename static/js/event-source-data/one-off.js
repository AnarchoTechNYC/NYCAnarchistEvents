/**
 * Temporary(?) file for storing any "one off" event sources. These
 * are effectively custom parsers that don't have their own JavaScript
 * Module themselves.
 *
 * TODO: Still need to figure out how to generalize these so that they
 *       can be used as proper event sources?
 */
import * as Utils from '../utils.js';
import { default as FullCalendarEvent } from '../event.js';
const OneOffEventSources = [
    {
        sourceType: 'one-off',
        //options: {}, // TODO: These are ignored, for now.
        sources: [
            // This is actually Bluestockings, but they use Bookmanager for events now.
            // So here is a simple implementation of a Bookmanager event scraper.
            {
                name: 'Bluestockings Cooperative',
                id: 'bluestocksings-cooperative',
                className: 'bluestockings-cooperative',
                events: async function (fetchInfo, successCallback, failureCallback) {
                    var session_id = 'x'; // This can be whatever.
                    var store_id = '576827';
                    var response = await fetch('https://api.bookmanager.com/customer/event/getList?session_id=' + session_id + '&store_id=' + store_id);
                    var json = await response.json();
                    // This needs some work.
                    successCallback(json.rows.map(function (item) {
                        var tz_offset_milliseconds = (new Date()).getTimezoneOffset() * 60 * 1000;
                        return {
                            title: item.info.name,
                            start: new Date(item.from * 1000 - tz_offset_milliseconds),
                            end: new Date(item.to * 1000 - tz_offset_milliseconds),
                            url: 'https://bluestockings.com/events/' + item.id
                        };
                    }));
                }
            },

            // This one-off event source helpfully published Schema.org-style Linked Data JSON!
            {
                name: 'EastVille Comedy Club',
                id: 'eastville-comedy-club',
                className: 'eastville-comedy-club',
                events: async function (fetchInfo, successCallback, failureCallback) {
                    var response = await fetch(Utils.useCorsProxy('https://www.eastvillecomedy.com/calendar'));
                    var html = await response.text();
                    var doc = Utils.domparser.parseFromString(html, 'text/html');
                    var ld_json = JSON.parse(doc.querySelector('script[type="application/ld+json"]').innerText);
                    successCallback(ld_json.map(FullCalendarEvent.fromSchemaDotOrg));
                },
                color: 'purple'
            },

            // Eris Evolution is another venue but they only have a simplistic HTML page for a "calendar."
            {
                name: 'Eris Evolution',
                id: 'eris-evolution',
                className: 'eris-evolution',
                events: async function (fetchInfo, successCallback, failureCallback) {
                    var response = await fetch(Utils.useCorsProxy('https://www.erisevolution.com/events/'));
                    var html = await response.text();
                    var doc = Utils.domparser.parseFromString(html, 'text/html');
                    var events = [];
                    var items = doc.querySelectorAll('.event');
                    for (var i = 0; i < items.length; i++) {
                        var date_info = items[i].querySelector('b').textContent.split(',').map(function (i) {
                            return i.trim();
                        });
                        var start_date = date_info[0].substring(0, date_info[0].length - 2);
                        var start_year = date_info[1];
                        var time_info  = items[i].textContent.match(/(\d?\d:\d\d) (am|pm)/i)[0];
                        var event_link = items[i].querySelector('[href^="/tickets/"]');
                        events.push({
                            title: items[i].querySelector('i').textContent,
                            start: new Date(`${start_date} ${start_year} ${time_info}`),
                            url: event_link ? `https://www.erisevolution.com${event_link.getAttribute('href')}` : null
                        });
                    }
                    successCallback(events);
                },
                color: '#243C94'
            },

            // Elsewhere uses Dice.fm but they don't use its widget. So we'll just get
            // the same data the way their own Web site does, by requesting a JSON file.
            {
                name: 'Elsewhere Brooklyn',
                id: 'elsewhere-brooklyn',
                className: 'elsewhere-brooklyn',
                events: async function (fetchInfo, successCallback, failureCallback) {
                    var response = await fetch(Utils.useCorsProxy('https://www.elsewhere.club/events'));
                    var html = await response.text();
                    var doc = Utils.domparser.parseFromString(html, 'text/html');
                    var buildId = JSON.parse(doc.getElementById('__NEXT_DATA__').textContent).buildId;
                    var response = await fetch(Utils.useCorsProxy(`https://www.elsewhere.club/_next/data/${buildId}/events.json`));
                    var json = await response.json();
                    successCallback(json.pageProps.initialEventData.events.map(function (item) {
                        return {
                            title: item.name,
                            start: new Date(item.date),
                            end: new Date(item.dateEnd),
                            url: item.url
                        };
                    }));
                },
                color: '#42D177',
                textColor: '#000'
            },

            // Hacienda simply published HTML from what looks like a custom-ish PHP system.
            {
                name: 'Hacienda Villa',
                id: 'hacienda-villa',
                className: 'hacienda-villa',
                events: async function (fetchInfo, successCallback, failureCallback) {
                    var response = await fetch(Utils.useCorsProxy('https://members.wearehacienda.com/events'));
                    var html = await response.text();
                    var doc = Utils.domparser.parseFromString(html, 'text/html');
                    var items = doc.querySelectorAll('.more-event');
                    var events = [];
                    for (var i = 0; i < items.length; i++) {
                        var date = items[i].querySelector('.event-date').textContent.trim();
                        var time = items[i].querySelector('.event-date + h5').textContent.match(/\d?\d:\d\d [AP]M/i);
                        var title = items[i].querySelector('.event-title').textContent.trim();
                        title += ' - ' + items[i].querySelector('.event-short').textContent.trim();
                        var url = items[i].querySelector('.reserve-btn-right').getAttribute('href');
                        if (! url.match(/^http?/)) {
                            url = 'https://www.wearehacienda.com/' + url;
                        }
                        events.push({
                            title: title,
                            start: new Date(`${date} ${time}`),
                            url: url
                        });
                    }
                    successCallback(events);
                },
                color: '#000',
                textColor: '#FFF'
            },

            {
                name: 'Transgression',
                id: 'transgression',
                className: 'transgression',
                events: async function (fetchInfo, successCallback, failureCallback) {
                    var response = await fetch('https://transgression.party/events/');
                    var html = await response.text();
                    var doc = Utils.domparser.parseFromString(html, 'text/html');
                    var ld_json = JSON.parse(doc.querySelector('.yoast-schema-graph').textContent);
                    var itemList = ld_json['@graph'].find(function (x) {
                        return 'ItemList' === x['@type'] }
                    ).itemListElement;
                    successCallback(itemList.map(FullCalendarEvent.fromSchemaDotOrg));
                },
                color: 'black',
                textColor: 'white',
            }

        ]
    }
];
export default OneOffEventSources;
