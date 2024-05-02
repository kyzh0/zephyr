# Zephyr

<p align="center">
<a href="https://www.zephyrapp.nz/">
  <img src="https://github.com/kyzh0/zephyr/blob/main/client/public/logo192.png?raw=true" />
  </a>
</p>

<p align="center">
 <a href="https://www.zephyrapp.nz/">https://www.zephyrapp.nz/</a> 
</p>

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies](#technologies)
- [Setup](#setup)
- [Contribute](#contribute)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Introduction

Zephyr is an interactive weather map aimed towards paraglider pilots in New Zealand, scraping real-time data from various stations across the country.

## Features

- Real-time data - average wind speed, gust, direction, and temperature.
- Webcams - live images from various cameras.
- Interactive map - easy to use with intuitive colours and icons.
- Charts and tables - a tidy representation of each station's data over time.
- Live grid view - easy to integrate with XCTrack for in-flight updates.
- Mobile-first design - scalable across different screen sizes.
- Help tab - provides a way for users to contact the developer.
- Admin-only area - for adding new weather stations and viewing errors.
- Error checker - scheduled function to identify issues with stations or the scraper.

<p align="center">
  <img src = "https://i.imgur.com/CGOYE31.png" width=700>
  <br/>
  Interactive map view
</p>
<p align="center">
  <img src = "https://i.imgur.com/QdaaxCb.png" width=700>
  <br/>
  Tables and graphs
</p>
<p align="center">
  <img src = "https://i.imgur.com/hK6Dyg6.png" width=300>
  <br/>
  Live grid view on mobile
</p>

## Technologies

### Frontend

- React
- MUI
- Mapbox GL
- Recharts

### Backend

- Node JS
- Express
- MongoDB

## Setup

### Clone the Repository

`git clone https://github.com/kyzh0/zephyr.git`

### Initialise Environment Variables

Follow the instructions in `client/.env.example` and `server/.env.example` to set up your own environment variables.

### Client

```
# go to directory
$ cd ./client

# install dependencies
$ npm install

# run the web app
$ npm run start
```

### Server

```
# go to directory
$ cd ./server

# install dependencies
$ npm install

# run the web server with nodemon
$ npm run dev
```

## Contribute

Spotted a bug, or got a new feature in mind? Open a new [issue](https://github.com/kyzh0/zephyr/issues), or even better, fork the repo and submit your own pull request! Any help on open issues is appreciated.

## Acknowledgements

Thanks to Jonas Yang for providing the icons and logo design.

## License

[MIT © 2024 Kyle Zhou](https://github.com/kyzh0/zephyr/blob/main/LICENSE.md)
