export const APIROOT =
  process.env.NODE_ENV === 'development'
    ? `http://localhost:${process.env.NODE_LOCAL_PORT}`
    : 'https://api.zephyrapp.nz';
