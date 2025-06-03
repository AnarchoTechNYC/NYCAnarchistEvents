/**
 * Utility module to support the calendar's Squarespace
 * event sources.
 */
import { useCorsProxy } from '../utils.js';
import FullCalendarEvent from '../event.js';

export default function Squarespace ( optionsObj ) {
    this.url = new URL(optionsObj.url);

    // TODO: Fetch next month's events, but only after a view change.
//    var url_start_date = (optionsObj.fetchInfo.start.getMonth() + 1).toString().padStart(2, '0')
//        + '-' + optionsObj.fetchInfo.start.getFullYear();
//    url.searchParams.set('month', url_start_date);

    return this.fetch(this.url).then((ss) => {
        optionsObj.successCallback(ss.parse().events.map(
            this.toFullCalendarEventObject.bind(this)
        ));
    });
};

Squarespace.prototype.fetch = async function ( url ) {
    var response = await fetch(useCorsProxy(url));
    var json = {};
    try {
        var json = await response.json();
    }
    catch (e) {
        console.error(e);
    }
    this.json = json;
    return this;
};

Squarespace.prototype.parse = function () {
    this.events = this.json.upcoming || this.json.items;
    return this;
};

Squarespace.prototype.toFullCalendarEventObject = function ( e ) {
    // If we have a `location` object, grab its data.
    var location = ( e.location ) ? {
        geoJSON: ( e.location.mapLat && e.location.mapLng ) ? {
            type: "Point",
            coordinates: [
                e.location.mapLng,
                e.location.mapLat
            ]
        } : undefined,
        eventVenue: {
            name: e.location.addressTitle,
            address: {
                streetAddress: e.location.addressLine1,
                // TODO: Some of these are not provided.
                //addressLocality: e.location.addressLine2.split(',')[0].trim(),
                //addressRegion: e.location.addressLine2.split(',')[1].trim(),
                //postalCode: e.location.addressLine2.split(',')[2].trim(),
                addressCountry: e.location.addressCountry
            },
            geo: {
                latitude: e.location.mapLat,
                longitude: e.location.mapLng
            }
        }
    } : null; // Otherwise, set it to `null`.
    return new FullCalendarEvent({
        title: e.title,
        start: e.startDate,
        end: e.endDate,
        url: new URL(this.url).origin + e.fullUrl,
        extendedProps: {
            description: e.body,
            image: e.assetUrl,
            location: location,
            raw: e
        }
    });
};
