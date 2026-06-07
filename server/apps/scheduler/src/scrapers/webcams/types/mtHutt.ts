import pLimit from 'p-limit';

import { httpClient, logger, type WebcamAttrs, type WithId } from '@zephyr/shared';
import processScrapedData from '../processScrapedData';

type WebcamFrame = {
  Date: string;
  Url: string;
  DateTaken: string; // format: "/Date(1780792980000)/"
};

type CameraAngles = {
  Angle1: WebcamFrame[];
  Angle2: WebcamFrame[];
  Angle3?: WebcamFrame[];
};

type HuttResponse = {
  BaseCamera: CameraAngles;
  SummitCamera: CameraAngles;
};

const BASE_URL = 'https://webcams-awb2e0ceg7cccsba.a02.azurefd.net';

export default async function scrapeMtHuttData(webcams: WithId<WebcamAttrs>[]): Promise<void> {
  const limit = pLimit(5);

  await Promise.allSettled(
    webcams.map((webcam) =>
      limit(async () => {
        try {
          let updated: Date | null = null;
          let base64: string | null = null;

          const baseCam = webcam.externalId?.includes('BaseCamera');
          const summitCam = webcam.externalId?.includes('SummitCamera');
          const angle1 = webcam.externalId?.includes('Angle-1');
          const angle2 = webcam.externalId?.includes('Angle-2');
          const angle3 = webcam.externalId?.includes('Angle-3');

          if (!baseCam && !summitCam && !angle1 && !angle2 && !angle3) {
            logger.warn(`mt hutt error - ${webcam.externalId} is not valid`, {
              service: 'webcam',
              type: 'hutt'
            });

            return;
          }

          const { data } = await httpClient.get<HuttResponse>(
            `${BASE_URL}/webcams-json/MtHutt.json`
          );
          if (data) {
            const frames =
              data[baseCam ? 'BaseCamera' : 'SummitCamera']?.[
                angle1 ? 'Angle1' : angle2 ? 'Angle2' : 'Angle3'
              ];
            const latest = frames?.at(-1);

            let imgPath = latest?.Url;

            updated = new Date(
              parseInt(latest?.DateTaken.replace(/\/Date\((\d+)\)\//, '$1') || '')
            );

            if (imgPath && updated && updated > new Date(webcam.lastUpdate)) {
              imgPath = imgPath
                .replace('/Webcams/', '/webcams-frames/')
                .replace('.jpg', '_1280.jpg');
              const response = await httpClient.get<ArrayBuffer>(`${BASE_URL}${imgPath}`, {
                responseType: 'arraybuffer'
              });
              base64 = Buffer.from(response.data).toString('base64');
            }
          }

          await processScrapedData(webcam, updated, base64);
        } catch {
          logger.warn(`mt hutt error - ${webcam.externalId}`, {
            service: 'webcam',
            type: 'hutt'
          });
        }
      })
    )
  );
}
