const { getFirestore } = require('firebase-admin/firestore');
const { getStorage, getDownloadURL } = require('firebase-admin/storage');

const functions = require('firebase-functions');
const axios = require('axios');
const fns = require('date-fns');
const fnsTz = require('date-fns-tz');
const sharp = require('sharp');
const md5 = require('md5');

async function getHarvestImage(siteId, hsn, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(
      `https://live.harvest.com/php/device_camera_images_functions.php?device_camera_images&request_type=initial&site_id=${siteId}&hsn=${hsn}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data.date_utc) {
      updated = new Date(data.date_utc);
      // skip if image already up to date
      if (updated > lastUpdate && data.main_image) {
        base64 = data.main_image.replace('\\/', '/').replace('data:image/jpeg;base64,', '');
      }
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getMetserviceImage(id, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(
      `https://www.metservice.com/publicData/webdata/traffic-camera/${id}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    const modules = data.layout.secondary.slots.major.modules;
    if (modules && modules.length) {
      const sets = modules[0].sets;
      if (sets && sets.length) {
        const times = sets[0].times;
        if (times.length) {
          const d = times[times.length - 1];
          if (d.displayTime) {
            updated = new Date(d.displayTime);
            // skip if image already up to date
            if (updated > lastUpdate && d.url) {
              const response = await axios.get(`https://www.metservice.com${d.url}`, {
                responseType: 'arraybuffer',
                headers: {
                  Connection: 'keep-alive'
                }
              });
              base64 = Buffer.from(response.data, 'binary').toString('base64');
            }
          }
        }
      }
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getLakeWanakaImage(id, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(`https://api.lakewanaka.co.nz/webcam/feed/${id}`, {
      headers: {
        Connection: 'keep-alive'
      }
    });
    const d = data.latest_image;
    if (d && d.timestamp) {
      updated = fnsTz.fromZonedTime(
        fns.parse(d.timestamp, 'yyyy-MM-dd HH:mm:ss', new Date()),
        'Pacific/Auckland'
      );
      // skip if image already up to date
      if (updated > lastUpdate && d.url) {
        const response = await axios.get(d.url, {
          responseType: 'arraybuffer',
          headers: {
            Connection: 'keep-alive'
          }
        });
        base64 = Buffer.from(response.data, 'binary').toString('base64');
      }
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getCheesemanImage(id, lastUpdate) {
  let updated = null;
  let base64 = null;

  try {
    const { data } = await axios.get(
      `https://www.mtcheeseman.co.nz/wp-content/webcam-player/?cam=${id}`,
      {
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    if (data.length) {
      const matches = data.match(/\/wp-content\/webcam\/aframe\/\d{4}-\d{2}-\d{2}\/\d{12}\.jpg/g);
      if (matches && matches.length) {
        const url = matches[matches.length - 1];
        const match = url.match(/\d{12}/g);
        updated = fnsTz.fromZonedTime(
          fns.parse(match[0], 'yyyyMMddHHmm', new Date()),
          'Pacific/Auckland'
        );

        // skip if image already up to date
        if (updated > lastUpdate) {
          const response = await axios.get(`https://www.mtcheeseman.co.nz${url}`, {
            responseType: 'arraybuffer',
            headers: {
              Connection: 'keep-alive'
            }
          });
          base64 = Buffer.from(response.data, 'binary').toString('base64');
        }
      }
    }
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getQueenstownAirportImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: 'Pacific/Auckland'
    });
    const parts = dateTimeFormat.formatToParts(new Date());

    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';
    for (const p of parts) {
      switch (p.type) {
        case 'year':
          year = p.value;
          break;
        case 'month':
          month = p.value.padStart(2, '0');
          break;
        case 'day':
          day = p.value.padStart(2, '0');
          break;
        case 'hour':
          hour = p.value.padStart(2, '0');
          break;
        case 'minute':
          minute = p.value.padStart(2, '0');
          break;
      }
    }

    const response = await axios.get(
      `https://www.queenstownairport.co.nz/WebCam/${id}.jpg?dt=${year}-${month}-${day}-${hour}-${minute}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getWanakaAirportImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: 'Pacific/Auckland'
    });
    const parts = dateTimeFormat.formatToParts(new Date());

    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';
    for (const p of parts) {
      switch (p.type) {
        case 'year':
          year = p.value;
          break;
        case 'month':
          month = p.value.padStart(2, '0');
          break;
        case 'day':
          day = p.value.padStart(2, '0');
          break;
        case 'hour':
          hour = p.value.padStart(2, '0');
          break;
        case 'minute':
          minute = p.value.padStart(2, '0');
          break;
      }
    }

    const response = await axios.get(
      `https://www.wanakaairport.com/WebCam/${id}.jpg?dt=${year}-${month}-${day}-${hour}-${minute}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getCgcImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get(
      `https://canterburyglidingclub.nz/images/CGCHdCam${id}_1.jpg`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getCastleHillImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get(
      `https://www.castlehill.nz/php/webcam_wll.php?cam=${id}/webcam.php.jpg`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getCwuImage(id) {
  let updated = null;
  let base64 = null;

  try {
    const dateTimeFormat = new Intl.DateTimeFormat('en-NZ', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: 'Pacific/Auckland'
    });
    const parts = dateTimeFormat.formatToParts(new Date());

    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';
    let temp = 0;
    for (const p of parts) {
      switch (p.type) {
        case 'year':
          year = p.value.slice(2);
          break;
        case 'month':
          month = p.value.padStart(2, '0');
          break;
        case 'day':
          day = p.value.padStart(2, '0');
          break;
        case 'hour':
          hour = p.value.padStart(2, '0');
          break;
        case 'minute':
          temp = Number(p.value);
          temp = temp - (temp % 15);
          minute = temp.toString().padStart(2, '0');
          break;
      }
    }

    const response = await axios.get(
      `https://cwu.co.nz/temp/seeit-${id}-${day}-${month}-${year}-${hour}-${minute}.jpg`,
      {
        responseType: 'arraybuffer',
        headers: {
          Connection: 'keep-alive'
        }
      }
    );
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

async function getTaylorsSurfImage() {
  let updated = null;
  let base64 = null;

  try {
    const response = await axios.get('https://stream.webmad.co.nz/shots/taylorssouth.jpg', {
      responseType: 'arraybuffer',
      headers: {
        Connection: 'keep-alive'
      }
    });
    base64 = Buffer.from(response.data, 'binary').toString('base64');
    updated = new Date();
  } catch (error) {
    functions.logger.error(error);
  }

  return {
    updated,
    base64
  };
}

exports.webcamWrapper = async function webcamWrapper() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('cams').get();
    if (!snapshot.empty) {
      const tempArray = [];
      snapshot.forEach((doc) => {
        tempArray.push(doc);
      });

      const bucket = getStorage().bucket();
      for (const doc of tempArray) {
        let data = null;
        const docData = doc.data();
        const lastUpdate = new Date(docData.lastUpdate._seconds * 1000);

        if (docData.type === 'harvest') {
          const ids = docData.externalId.split('_');
          data = await getHarvestImage(ids[0], ids[1], lastUpdate);
        } else if (docData.type === 'metservice') {
          data = await getMetserviceImage(docData.externalId, lastUpdate);
        } else if (docData.type === 'lw') {
          data = await getLakeWanakaImage(docData.externalId, lastUpdate);
        } else if (docData.type === 'cm') {
          data = await getCheesemanImage(docData.externalId, lastUpdate);
        } else if (docData.type === 'qa') {
          data = await getQueenstownAirportImage(docData.externalId);
        } else if (docData.type === 'wa') {
          data = await getWanakaAirportImage(docData.externalId);
        } else if (docData.type === 'cgc') {
          data = await getCgcImage(docData.externalId);
        } else if (docData.type === 'ch') {
          data = await getCastleHillImage(docData.externalId);
        } else if (docData.type === 'cwu') {
          data = await getCwuImage(docData.externalId);
        } else if (docData.type === 'ts') {
          data = await getTaylorsSurfImage();
        }

        if (data && data.updated && data.base64) {
          // save base64 to storage
          const imgBuff = Buffer.from(data.base64, 'base64');

          const img = {
            time: data.updated,
            expiry: new Date(data.updated.getTime() + 24 * 60 * 60 * 1000) // 1 day expiry to be deleted by TTL policy
          };

          // for types that don't have embedded timestamps, check for duplicate image
          if (
            docData.type === 'qa' ||
            docData.type === 'wa' ||
            docData.type === 'cgc' ||
            docData.type === 'ch' ||
            docData.type === 'cwu' ||
            docData.type === 'ts'
          ) {
            img.hash = md5(imgBuff);
            img.fileSize = imgBuff.length;
            const query = db.collection(`cams/${doc.id}/images`).orderBy('time', 'desc').limit(1);
            const snap = await query.get();
            if (!snap.empty) {
              const d = snap.docs[0].data();
              if (d.fileSize == img.fileSize && d.hash == img.hash) {
                functions.logger.log(
                  `${docData.type} image update skipped${docData.externalId ? ` - ${docData.externalId}` : ''}`
                );
                continue;
              }
            }
          }

          const resizedBuff = await sharp(imgBuff).resize({ width: 600 }).toBuffer();
          const imgByteArray = new Uint8Array(resizedBuff);
          const file = bucket.file(
            `cams/${docData.type}/${doc.id}/${data.updated.toISOString()}.jpg`
          );
          await file.save(imgByteArray);
          const url = await getDownloadURL(file);

          img.url = url;

          // update cam
          await db.doc(`cams/${doc.id}`).update({
            lastUpdate: new Date(),
            currentTime: data.updated,
            currentUrl: url
          });

          // add image
          await db.collection(`cams/${doc.id}/images`).add(img);

          functions.logger.log(
            `${docData.type} image updated${docData.externalId ? ` - ${docData.externalId}` : ''}`
          );
        } else {
          functions.logger.log(
            `${docData.type} image update skipped${docData.externalId ? ` - ${docData.externalId}` : ''}`
          );
        }
      }
    }
    functions.logger.log('Webcam images updated.');
  } catch (error) {
    functions.logger.error(error);
    return null;
  }
};
