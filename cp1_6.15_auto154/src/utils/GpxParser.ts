import type { Coordinate, GpxParseResult } from '../../../shared/types';

export class GpxParser {
  private domParser: DOMParser;

  constructor() {
    this.domParser = new DOMParser();
  }

  public parse(gpxContent: string): GpxParseResult {
    const xmlDoc = this.domParser.parseFromString(gpxContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid GPX format: ' + parserError.textContent);
    }

    const coordinates: Coordinate[] = [];
    const trackPoints = xmlDoc.querySelectorAll('trkpt, wpt, rtept');

    trackPoints.forEach((point) => {
      const lat = parseFloat(point.getAttribute('lat') || '0');
      const lon = parseFloat(point.getAttribute('lon') || '0');

      const timeElement = point.querySelector('time');
      const eleElement = point.querySelector('ele');

      const coordinate: Coordinate = {
        lat,
        lon,
      };

      if (timeElement?.textContent) {
        coordinate.time = timeElement.textContent;
      }

      if (eleElement?.textContent) {
        coordinate.ele = parseFloat(eleElement.textContent);
      }

      coordinates.push(coordinate);
    });

    const metadata = this.extractMetadata(xmlDoc, coordinates);

    return {
      coordinates,
      metadata,
    };
  }

  private extractMetadata(
    xmlDoc: XMLDocument,
    coordinates: Coordinate[]
  ): GpxParseResult['metadata'] {
    const metadata: GpxParseResult['metadata'] = {};

    const nameElement = xmlDoc.querySelector('metadata > name, trk > name');
    if (nameElement?.textContent) {
      metadata.name = nameElement.textContent;
    }

    const times = coordinates
      .filter((c) => c.time)
      .map((c) => new Date(c.time!).getTime());

    if (times.length > 0) {
      const sortedTimes = [...times].sort((a, b) => a - b);
      metadata.startTime = new Date(sortedTimes[0]).toISOString();
      metadata.endTime = new Date(sortedTimes[sortedTimes.length - 1]).toISOString();
    }

    if (coordinates.length > 1) {
      metadata.distance = this.calculateDistance(coordinates);
    }

    return metadata;
  }

  private calculateDistance(coordinates: Coordinate[]): number {
    let distance = 0;
    const earthRadius = 6371000;

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];

      const dLat = this.toRad(curr.lat - prev.lat);
      const dLon = this.toRad(curr.lon - prev.lon);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(prev.lat)) *
          Math.cos(this.toRad(curr.lat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance += earthRadius * c;
    }

    return Math.round(distance);
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  public static parseGpx(gpxContent: string): GpxParseResult {
    const parser = new GpxParser();
    return parser.parse(gpxContent);
  }
}

export default GpxParser;
