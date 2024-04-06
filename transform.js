import fs from 'fs';
import csv from 'csvtojson';
import lowercaseKeys from 'lowercase-keys';

csv()
  .fromFile('./data/pubs.csv')
  .then((data) => {
    console.log('DATA:', data[0]);

    const geojsonFeatureArray = data
      .map((d) => {
        return lowercaseKeys(d);
      })
      .filter((d) => {
        return !!d.latitude && !!d.longitude;
      })
      .map((d) => {
        const properties = {
          ...d,
        };

        delete properties.longitude;
        delete properties.latitude;

        return {
          type: 'Feature',
          properties,
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(d.longitude), parseFloat(d.latitude)],
          },
        };
      });
    const outputFile = fs.createWriteStream('./data/venues.geojsonld');
    geojsonFeatureArray.forEach((feature) => {
      outputFile.write(`${JSON.stringify(feature)}\n`);
    });
  });
