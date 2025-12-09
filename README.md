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

Zephyr is an interactive weather map aimed towards paraglider pilots in New Zealand, scraping real-time data from various stations across the country. The frontend is build on React, TypeScript, and Vite, while the backend is built with NodeJS, Express, and MongoDB.

## Features

- Real-time data - average wind speed, gust, direction, and temperature.
- Interactive map - easy to use with intuitive colours and icons.
- Filtering and history - a flexible way to interface with the data.
- Charts and tables - a tidy representation of each station's data over time.
- Live grid view - easy to integrate with XCTrack for in-flight updates.
- Webcams - live images from various cameras.
- RASP soudings - overlay of skew-T plots from [RASP](https://rasp.nz).
- Mobile-first design - scalable across different screen sizes.
- Help tab - provides information and a way for users to contact the developer.
- Admin-only area - for adding new weather stations and viewing errors.
- Error checker - scheduled function to identify issues with stations or the scraper.
- API - endpoints for integration with external apps.
- Export - data is preserved and can be exported for analysis.

<p align="center">
  <img src = "https://i.postimg.cc/RCyCtyQX/Untitled.png" width=200>
  <br/>
  Interactive map view
</p>
<p align="center">
  <img src = "https://i.postimg.cc/pTkZ7KkH/Untitled.png" width=200>
  <br/>
  Station data
</p>
<p align="center">
  <img src = "https://i.imgur.com/hK6Dyg6.png" width=200>
  <br/>
  Live grid view
</p>

## Setup

### Clone the Repository

`git clone https://github.com/kyzh0/zephyr.git`

### Install Dependencies

The `server` app requires [MongoDB](https://www.mongodb.com/docs/manual/installation/) and [Seq](https://docs.datalust.co/v3/docs/getting-started) to be installed. You will need the MongoDB connection string and Seq URL for the next section.

### Initialise Environment Variables

Follow the instructions in `.env.example`, `client/.env.example`, and `server/.env.example` to set up your own environment variables.

### Server

```
$ cd ./server
$ npm i

$ npm run start
$ npm run scheduler

# OR
# run both with nodemon
$ npm run dev
```

### Client

```
$ cd ./client
$ npm i

$ npm run dev

# build to 'dist' folder
$ npm run build
```

## Contribute

Spotted a bug, or got a new feature in mind? Open a new [issue](https://github.com/kyzh0/zephyr/issues), or even better, fork the repo and submit your own pull request! Any help on open issues is appreciated.

## Acknowledgements

Thanks to James Bayly for his efforts on modernising the frontend, and Jonas Yang for providing the logo design.

## License

[MIT © 2024 Kyle Zhou](https://github.com/kyzh0/zephyr/blob/main/LICENSE.md)
