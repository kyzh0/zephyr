import axios from 'axios';
import http from 'http';
import https from 'https';

const httpClient = axios.create({
  timeout: 10000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
});

export default httpClient;
