# Zephyr

<p align="center">
<a href="https://www.zephyrapp.nz/">
  <img src="https://github.com/kyzh0/zephyr/blob/main/client/public/logo192.png?raw=true" />
  </a>
</p>

<p align="center">
 <a href="https://zephyrapp.nz/">zephyrapp.nz</a> 
</p>

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Setup](#setup)
- [Contribute](#contribute)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Introduction

Zephyr is an interactive weather map aimed towards paraglider pilots in New Zealand, scraping real-time data from various stations across the country. The frontend is built on React and Vite, while the backend is built with NodeJS, Express, and MongoDB.

## Features

- Real-time data - average wind speed, gust, direction, and temperature.
- Interactive map - easy to use with intuitive colours and icons.
- Filtering and history - a flexible way to interface with the data.
- Charts and tables - a tidy representation of each station's data over time.
- Live grid view - easy to integrate with XCTrack for in-flight updates.
- Site guide - information for free flying sites around NZ.
- Webcams - live images from various cameras.
- RASP soudings - overlay of skew-T plots from [RASP](https://rasp.nz).
- Mobile-first design - scalable across different screen sizes.
- Help & contact - provides information and a way for users to send feedback.
- Admin-only area - for adding new stations and viewing errors.
- Error checker - scheduled function to identify issues with stations.
- API - endpoints for integration with external apps.
- Export - data is preserved and can be exported for analysis.

<table style="width: 100%;">
  <tr>
    <td>
      <p align="center">
        <img src = "https://i.postimg.cc/brLCk4tT/Screenshot-2026-03-10-144326.png" width=100>
        <br/>
        Interactive map view
      </p>
    </td>
    <td>
      <p align="center">
        <img src = "https://i.postimg.cc/L8gD8JNL/Screenshot-2026-03-10-144638.png" width=100>
        <br/>
        Station data
      </p>
    </td>
  </tr>
  <tr>
    <td>
      <p align="center">
        <img src = "https://i.postimg.cc/NMcpVQ8H/Screenshot-2026-03-10-144459.png" width=100>
        <br/>
        Live grid view
      </p>
    </td>
    <td>
      <p align="center">
        <img src = "https://i.postimg.cc/Gh7g2wR6/Screenshot-2026-03-10-144347.png" width=100>
        <br/>
        Site Guide
      </p>
    </td>
  </tr>
</table>

## Setup

### Clone the Repository

`git clone https://github.com/kyzh0/zephyr.git`

### Install Dependencies

The `server` app requires [MongoDB](https://www.mongodb.com/docs/manual/installation/) and [Seq](https://docs.datalust.co/v3/docs/getting-started) to be installed. You will need the MongoDB connection string and Seq URL for the next section.

### Initialise Environment Variables

Follow the instructions in `client/.env.example`, and `server/.env.example` to set up your own environment variables.

### Server

```
$ cd ./server
$ pnpm i

$ npm run build
$ npm run dev
```

### Client

```
$ cd ./client
$ npm i

$ npm run dev

# build to dist/
$ npm run build
```

## Contribute

Spotted a bug, or got a new feature in mind? Open a new [issue](https://github.com/kyzh0/zephyr/issues), or even better, fork the repo and submit your own pull request! Any help on open issues is appreciated.

## Acknowledgements

Thanks to James Bayly for his efforts on modernising the frontend, and Jonas Yang for providing the logo design.

## License

[MIT © 2026 Kyle Zhou](https://github.com/kyzh0/zephyr/blob/main/LICENSE.md)
