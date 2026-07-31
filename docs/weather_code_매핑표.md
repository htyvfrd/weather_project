# WMO weather_code → 아이콘/문구 매핑표

Open-Meteo가 반환하는 `weather_code`는 [WMO(세계기상기구) 코드](https://open-meteo.com/en/docs)를 따릅니다.
값이 27개나 되어 학생이 하나하나 외우기 어려우므로, **7개 카테고리**로 단순화해서 사용합니다.
(`demo_weather_app.html`의 `getWeatherInfo()` 함수와 동일한 분류입니다.)

> 아이콘은 `icons/` 폴더의 **애니메이션 SVG**([Meteocons](https://github.com/basmilius/weather-icons), MIT 라이선스)를 사용합니다.
> 프로젝트 폴더에 `icons/` 폴더를 그대로 복사해 넣어야 아이콘이 표시됩니다.

## 1. 전체 코드표 (WMO 원본)

| code | 의미(영문) | 의미(한글) |
|---|---|---|
| 0 | Clear sky | 맑음 |
| 1 | Mainly clear | 대체로 맑음 |
| 2 | Partly cloudy | 구름 조금 |
| 3 | Overcast | 흐림 |
| 45 | Fog | 안개 |
| 48 | Depositing rime fog | 짙은 안개(서리) |
| 51 | Light drizzle | 약한 이슬비 |
| 53 | Moderate drizzle | 이슬비 |
| 55 | Dense drizzle | 강한 이슬비 |
| 56 | Light freezing drizzle | 약한 언 이슬비 |
| 57 | Dense freezing drizzle | 강한 언 이슬비 |
| 61 | Slight rain | 약한 비 |
| 63 | Moderate rain | 비 |
| 65 | Heavy rain | 강한 비 |
| 66 | Light freezing rain | 약한 언 비 |
| 67 | Heavy freezing rain | 강한 언 비 |
| 71 | Slight snow fall | 약한 눈 |
| 73 | Moderate snow fall | 눈 |
| 75 | Heavy snow fall | 강한 눈 |
| 77 | Snow grains | 싸락눈 |
| 80 | Slight rain showers | 약한 소나기 |
| 81 | Moderate rain showers | 소나기 |
| 82 | Violent rain showers | 강한 소나기 |
| 85 | Slight snow showers | 약한 소낙눈 |
| 86 | Heavy snow showers | 소낙눈 |
| 95 | Thunderstorm | 뇌우 |
| 96 | Thunderstorm with slight hail | 우박 동반 뇌우 |
| 99 | Thunderstorm with heavy hail | 강한 우박 동반 뇌우 |

## 2. 수업/코드에서 쓰는 7개 카테고리 매핑

`data-weather` 값은 `demo_weather_app.html`의 CSS 배경 테마(`body[data-weather="..."]`)와 그대로 연결됩니다.

| 카테고리 (theme) | 포함 코드 | 아이콘 파일 | 문구 예시 |
|---|---|---|---|
| sunny (맑음) | 0 | `icons/clear-day.svg` | 맑음 |
| sunny (맑음) | 1 | `icons/partly-cloudy-day.svg` | 대체로 맑음 |
| cloudy (흐림) | 2 | `icons/cloudy.svg` | 구름 조금 |
| cloudy (흐림) | 3 | `icons/overcast.svg` | 흐림 |
| foggy (안개) | 45, 48 | `icons/fog.svg` | 안개 |
| rainy (비) | 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82 | `icons/rain.svg` | 비 |
| snowy (눈) | 71, 73, 75, 77, 85, 86 | `icons/snow.svg` | 눈 |
| thunder (뇌우) | 95, 96, 99 | `icons/thunderstorms.svg` | 뇌우 |
| (기타) | 그 외 | `icons/thermometer.svg` | 알 수 없음 |

## 3. 코드에 바로 붙여넣는 JS 함수

```js
function getWeatherInfo(code) {
  if (code === 0)  return { icon: 'icons/clear-day.svg',         label: '맑음',        theme: 'sunny'   };
  if (code === 1)  return { icon: 'icons/partly-cloudy-day.svg', label: '대체로 맑음', theme: 'sunny'   };
  if (code === 2)  return { icon: 'icons/cloudy.svg',            label: '구름 조금',  theme: 'cloudy'  };
  if (code === 3)  return { icon: 'icons/overcast.svg',          label: '흐림',        theme: 'cloudy'  };
  if (code === 45 || code === 48) return { icon: 'icons/fog.svg', label: '안개', theme: 'foggy' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { icon: 'icons/rain.svg', label: '비', theme: 'rainy' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { icon: 'icons/snow.svg', label: '눈', theme: 'snowy' };
  }
  if ([95, 96, 99].includes(code)) {
    return { icon: 'icons/thunderstorms.svg', label: '뇌우', theme: 'thunder' };
  }
  return { icon: 'icons/thermometer.svg', label: '알 수 없음', theme: 'sunny' };
}
```

아이콘은 HTML 에서 `<img>` 태그로 넣습니다 (장식용이므로 `alt=""`):

```js
'<img class="city-row-icon" src="' + info.icon + '" alt="" />'
```

## 3-1. 날씨 테마 배경 CSS (복붙용)

`theme` 값과 1:1로 연결되는 배경 그라디언트입니다. **색상 값을 바꾸는 것이 커스터마이징 포인트** — 선택자 이름(`sunny` 등)은 바꾸면 안 됩니다(JS의 theme 값과 연결됨).

```css
body[data-weather="sunny"]   { --bg-start: #6fb1fc; --bg-end: #4d6ef7; }
body[data-weather="cloudy"]  { --bg-start: #93a5b8; --bg-end: #5c6f83; }
body[data-weather="foggy"]   { --bg-start: #b9c6d1; --bg-end: #8592a1; }
body[data-weather="rainy"]   { --bg-start: #4b6584; --bg-end: #24344a; }
body[data-weather="snowy"]   { --bg-start: #8fb8d9; --bg-end: #5c86ab; }
body[data-weather="thunder"] { --bg-start: #3c3b56; --bg-end: #18172a; }
```

## 3-2. 시간별 날씨 보조 함수 (복붙용 — Day 3)

시간별 예보 표시에 쓰는 데이터 변환 함수들입니다. 로직 수업의 대상이 아니므로 복붙해서 씁니다.

```js
// "2026-07-15T13:00" → "오후 1시"
function formatHourLabel(isoTime) {
  var hour = parseInt(isoTime.split('T')[1].split(':')[0], 10);
  var period = hour < 12 ? '오전' : '오후';
  var h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return period + ' ' + h12 + '시';
}

// 풍향(도) → 16방위 한글 표기
function degToCompass(deg) {
  if (deg === null || deg === undefined) return '';
  var dirs = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
              '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// 자외선지수 → 한글 등급
function uvLabel(uv) {
  if (uv < 3) return '낮음';
  if (uv < 6) return '보통';
  if (uv < 8) return '높음';
  if (uv < 11) return '매우 높음';
  return '위험';
}

// "2026-07-15T05:32" → "05:32" (일출/일몰 시각 표시용)
function formatClock(isoTime) {
  return isoTime.split('T')[1];
}
```

## 3-3. 미세먼지 등급 기준 (복붙용 — ⭐선택 기능)

Open-Meteo 대기질 API의 PM10/PM2.5 농도(㎍/㎥)를 한국 기준 4단계로 바꾸는 함수입니다.

```js
var PM10_THRESHOLDS = [30, 80, 150];
var PM25_THRESHOLDS = [15, 35, 75];

function pmGrade(value, thresholds) {
  if (value === null || value === undefined) return { label: '정보 없음', className: '' };
  if (value <= thresholds[0]) return { label: '좋음', className: 'grade-good' };
  if (value <= thresholds[1]) return { label: '보통', className: 'grade-normal' };
  if (value <= thresholds[2]) return { label: '나쁨', className: 'grade-bad' };
  return { label: '매우나쁨', className: 'grade-verybad' };
}
```

## 4. 학생 커스터마이징 팁

- `icons/` 폴더의 SVG 를 다른 파일로 바꾸면 아이콘이 통째로 바뀝니다 — [Meteocons 전체 목록](https://basmilius.github.io/weather-icons/)에서 다른 스타일(라인형 등)을 받거나, 직접 그린 PNG/SVG 를 넣어도 됩니다(파일명만 맞추면 코드 수정 불필요).
- 이모지로 되돌리고 싶다면 `icon` 값을 이모지 문자로 바꾸고 `<img>` 를 `<span>` 으로 되돌리면 됩니다.
- 카테고리를 더 세분화하고 싶다면(예: 눈 중에서도 폭설만 따로) `if` 조건을 code 단위로 쪼개면 됩니다.
- 심화: Open-Meteo 의 `is_day` 값(1=낮, 0=밤)을 받아서 밤에는 `clear-night.svg`, `partly-cloudy-night.svg` 로 바꿔치기할 수 있습니다.
- `theme` 값은 반드시 CSS의 `body[data-weather="..."]` 선택자 이름과 철자가 똑같아야 배경이 바뀝니다. 오타 주의!
