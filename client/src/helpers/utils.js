export function getWindDirectionFromBearing(bearing) {
  if (bearing < 0) {
    return '';
  } else if (bearing <= 11.25) {
    return 'N';
  } else if (bearing <= 33.75) {
    return 'NNE';
  } else if (bearing <= 56.25) {
    return 'NE';
  } else if (bearing <= 78.75) {
    return 'ENE';
  } else if (bearing <= 101.25) {
    return 'E';
  } else if (bearing <= 123.75) {
    return 'ESE';
  } else if (bearing <= 146.25) {
    return 'SE';
  } else if (bearing <= 168.75) {
    return 'SSE';
  } else if (bearing <= 191.25) {
    return 'S';
  } else if (bearing <= 213.75) {
    return 'SSW';
  } else if (bearing <= 236.25) {
    return 'SW';
  } else if (bearing <= 258.75) {
    return 'WSW';
  } else if (bearing <= 281.25) {
    return 'W';
  } else if (bearing <= 303.75) {
    return 'WNW';
  } else if (bearing <= 326.25) {
    return 'NW';
  } else if (bearing <= 348.75) {
    return 'NNW';
  } else {
    return 'N';
  }
}

export function getStationTypeName(code) {
  switch (code) {
    case 'wu':
      return 'Weather Underground';
    case 'po':
      return 'Port Otago';
    case 'wp':
      return 'Weather Pro';
    case 'cp':
      return 'CentrePort';
    case 'gw':
      return 'Greater Wellington';
    case 'cwu':
      return 'Canterbury Weather Updates';
    case 'mpyc':
      return 'Mt Pleasant Yacht Club';
    case 'lpc':
      return 'Lyttelton Port Company';
    case 'mrc':
      return 'Mountain Research Centre';
    case 'mfhb':
      return "Model Flying Hawke's Bay";
    case 'wainui':
      return 'Wainuiomata';
    case 'prime':
      return 'Prime Port';
    case 'wl':
      return 'Weather Link';
    case 'hw':
      return 'Hutt Weather';
    default:
      return code.charAt(0).toUpperCase() + code.slice(1);
  }
}

export function getWindColor(wind) {
  if (wind == null) {
    return '';
  } else if (wind <= 2) {
    return '';
  } else if (wind <= 4) {
    return '#d1f9ff';
  } else if (wind <= 6) {
    return '#b5fffe';
  } else if (wind <= 8) {
    return '#a8ffec';
  } else if (wind <= 10) {
    return '#a8ffe2';
  } else if (wind <= 12) {
    return '#a8ffd1';
  } else if (wind <= 14) {
    return '#a8ffc2';
  } else if (wind <= 16) {
    return '#a8ffb1';
  } else if (wind <= 18) {
    return '#abffa8';
  } else if (wind <= 20) {
    return '#95ff91';
  } else if (wind <= 22) {
    return '#87ff82';
  } else if (wind <= 24) {
    return '#9dff82';
  } else if (wind <= 26) {
    return '#c3ff82';
  } else if (wind <= 28) {
    return '#e2ff82';
  } else if (wind <= 30) {
    return '#fff582';
  } else if (wind <= 32) {
    return '#ffda82';
  } else if (wind <= 34) {
    return '#ff9966';
  } else if (wind <= 36) {
    return '#ff8766';
  } else if (wind <= 38) {
    return '#ff7d66';
  } else if (wind <= 40) {
    return '#ff6666';
  } else if (wind <= 42) {
    return '#ff4d4d';
  } else if (wind <= 50) {
    return '#ff365e';
  } else if (wind <= 60) {
    return '#ff3683';
  } else if (wind <= 70) {
    return '#ff36a8';
  } else if (wind <= 80) {
    return '#ff36c6';
  } else if (wind <= 90) {
    return '#ff36e1';
  } else {
    return '#f536ff';
  }
}

export function getWebcamTypeName(code) {
  switch (code) {
    case 'lw':
      return 'Lake Wanaka';
    case 'qa':
      return 'Queenstown Airport';
    case 'wa':
      return 'Wanaka Airport';
    case 'cgc':
      return 'Canterbury Gliding Club';
    case 'ch':
      return 'Castle Hill';
    case 'cm':
      return 'Mt Cheeseman';
    case 'cwu':
      return 'Canterbury Weather Updates';
    case 'ap':
      return 'Arthurs Pass';
    case 'hutt':
      return 'Mt Hutt';
    case 'ts':
      return 'Taylors Surf';
    default:
      webcam.type.charAt(0).toUpperCase() + webcam.type.slice(1);
  }
}
