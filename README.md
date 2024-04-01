# Zephyr

<p align="center">
<a href="https://zephyr-3fb26.web.app/">
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
- Interactive map - easy to use with intuitive colours and icons.
- Charts and tables - a tidy representation of each station's data over time.
- Mobile-first design - scalable across different screen sizes.
- Help tab - provides a way for users to contact the developer.
- Admin-only area - for adding new weather stations and viewing errors.
- Error checker - scheduled function to identify issues with stations or the scraper.

<p align="center">
  <img src = "https://i.imgur.com/CGOYE31.png" width=700>
</p>
<p align="center">
  <img src = "https://i.imgur.com/QdaaxCb.png" width=700>
</p>

## Technologies

### Frontend

- React
- Mapbox GL
- MUI
- Recharts

### Backend

- Cloud Firestore
- Google Cloud Functions
- Firebase Authentication

## Setup

### Clone the Repository

`git clone https://github.com/kyzh0/zephyr.git`

### Initialise Environment Variables

Follow the instructions in `client/.env.example` and `functions/.env.example` to set up your own environment variables.

### Client

```
# go to directory
$ cd ./client

# install dependencies
$ npm install

# run the web app
$ npm run start
```

### Functions

```
# go to directory
$ cd ./functions

# install dependencies
$ npm install

# run emulators
$ firebase emulators:start

# deploy functions
$ firebase deploy --only functions
```

## Contribute

Spotted a bug, or got a new feature in mind? Open a new [issue](https://github.com/kyzh0/zephyr/issues), or even better, fork the repo and submit your own pull request! Any help on open issues is appreciated.

## Acknowledgements

Thanks to Jonas Yang for providing the icons and logo design.

## License

[MIT © 2024 Kyle Zhou](https://github.com/kyzh0/zephyr/blob/main/LICENSE.md)
