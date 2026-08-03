$(function () {

    /*
        날씨 코드(weather code) → 아이콘, 날씨, 테마 정보 반환 
         - Open-Meteo API 의 날씨 코드를 7개의 카테고리로 단순화
         - theme 는 body[data-weather="..."] 에 사용
         - 자세한 매칭 자료는 weather_code_매핑표.md 파일 참고
    */
    function getWeatherInfo(code) {
        if (code === 0) return { icon: 'icons/clear-day.svg', label: '맑음', theme: 'sunny' };
        if (code === 1) return { icon: 'icons/partly-cloudy-day.svg', label: '대체로 맑음', theme: 'sunny' };
        if (code === 2) return { icon: 'icons/cloudy.svg', label: '구름 조금', theme: 'cloudy' };
        if (code === 3) return { icon: 'icons/overcast.svg', label: '흐림', theme: 'cloudy' };
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

    // API 에서 전달된 값 중 일부가 null 로 전달되기 대문에
    // null 이거나 값이 없으면 '-' 으로 표시
    function safeRound(value, suffix) {
        if(value === null || value === undefined) return '-';
        return Math.round(value) + (suffix || "");
    }

    // 2026-07-30T15:05 → "15:05"
    function formatClock(isoTime) {
        return isoTime.split("T")[1];
    }

    // 2026-07-30T15:05 → 오후 3시
    function formatHourLabel(isoTime) { 
        let time = isoTime.split("T")[1];
        const hour = parseInt(time.split(":")[0]);
        const period = hour < 12 ? "오전" : "오후";

        let h12 = hour % 12;
        if(h12 == 0) h12 = 12;
        return period + " " + h12 + "시";
    }

    // 풍향(도) → 16방위 한글 표기
    function degToCompass(deg) { 
        if(deg === null || deg === undefined) return '';

        const dirs = [
            "북", "북북동", "북동", "동북동", "동", "동남동", "남동", "남남동",
            "남", "남남서", "남서", "서남서", "서", "서북서", "북서", "북북서"
        ];

        return dirs[Math.round(deg / 22.5) % 16];
    }

    // 자외선지수 → 한글 표기
    function uvLabel(uv) {
        if(uv < 3) return "낮음";
        if(uv < 6) return "보통";
        if(uv < 8) return "높음";
        if(uv < 11) return "매우 높음";
        return "위험";
    }

    // 주요 도시 21곳의 좌표 폴백 목록
    //  - 지오코딩 API 호출 없이 바로 좌표를 찾아 응답 속도/정확도를 높임
    const FALLBACK_CITIES = {
        '서울': { lat: 37.5665, lon: 126.9780 },
        '부산': { lat: 35.1796, lon: 129.0756 },
        '대구': { lat: 35.8714, lon: 128.6014 },
        '인천': { lat: 37.4563, lon: 126.7052 },
        '광주': { lat: 35.1595, lon: 126.8526 },
        '대전': { lat: 36.3504, lon: 127.3845 },
        '울산': { lat: 35.5384, lon: 129.3114 },
        '세종': { lat: 36.4800, lon: 127.2890 },
        '수원': { lat: 37.2636, lon: 127.0286 },
        '고양': { lat: 37.6584, lon: 126.8320 },
        '용인': { lat: 37.2411, lon: 127.1776 },
        '성남': { lat: 37.4449, lon: 127.1388 },
        '청주': { lat: 36.6424, lon: 127.4890 },
        '전주': { lat: 35.8242, lon: 127.1480 },
        '천안': { lat: 36.8151, lon: 127.1139 },
        '포항': { lat: 36.0190, lon: 129.3435 },
        '창원': { lat: 35.2281, lon: 128.6811 },
        '제주': { lat: 33.4996, lon: 126.5312 },
        '춘천': { lat: 37.8813, lon: 127.7298 },
        '강릉': { lat: 37.7519, lon: 128.8761 },
        '순천': { lat: 34.9505, lon: 127.4878}
    };

    // 홈 화면에 표시할 주요 도시 (FALLBACK_CITIES 중 8곳 선정)
    const HOME_CITIES = ['서울', '부산', '대구', '인천', '광주', '대전', '제주', '순천'];


    // ----------------------------------------
    // 화면 전환: 홈 ↔ 상세
    // ----------------------------------------
    function showScreen(name) {
        $("#screen-home").prop("hidden", name !== "home");
        $("#screen-detail").prop("hidden", name !== "detail");

        // 홈인 경우 홈 테마를 기본 테마로 지정
        if(name === "home") {
            $("body").attr("data-weather", "sunny");
        }
    }

    // 상세 화면으로 전환
    function openDetail(lat, lon, name) {
        showScreen("detail");
        loadWeather(lat, lon, name);
    }



    // ----------------------------------------
    // 상태 표시
    //  - 로딩/에러 메세지 표시
    //  - 탭바, 패널 숨기기
    // ----------------------------------------
    function showStatus(msg) {
        $("#statusMsg").text(msg).prop("hidden", false);

        $("#tabBar").prop("hidden", true);
        $("#panel-summary").prop("hidden", true);
        $("#panel-hourly").prop("hidden", true);
    }
    function showError(msg) {
        showStatus("⚠️ " + msg);
    }

    // ----------------------------------------
    // Open-Meteo Forecast API 호출
    // ----------------------------------------
    function loadWeather(lat, lon, displayName) {
        showStatus("날씨 정보를 불러오는 중입니다...");

        $.getJSON("https://api.open-meteo.com/v1/forecast", {
            latitude: lat,
            longitude: lon,
            current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
            hourly: 'temperature_2m,apparent_temperature,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m,wind_direction_10m,uv_index,dew_point_2m,cloud_cover,visibility',
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
            forecast_days: 5,
            timezone:"auto"
        })
        .done(function(data) { 
            // 정상적으로 불러온 경우
            renderWeather(data, displayName);
            renderHourly(data);
            showResult();
        })
        .fail(function() { 
            // 불어오기가 실패한 경우
            showError("날씨 정보를 가져오지 못했습니다. 잠시후 다시 시도해주세요.");
        })
    }

    function renderWeather(data, displayName) {
        // 현재 날씨
        const cur = data.current;
        const info = getWeatherInfo(cur.weather_code);
        
        $("body").attr("data-weather", info.theme);
       
        $('#locationName').text(displayName);
        // 2026-07-30T15:05 → "2026-07-30 15:05기준"
        $('#updatedTime').text(cur.time.replace('T', ' ') + ' 기준');
        
        $('#weatherIcon').attr('src', info.icon);
        $('#temperature').text(Math.round(cur.temperature_2m) + '°');
        $('#weatherDesc').text(info.label);
        $('#feelsLike').text(Math.round(cur.apparent_temperature) + '°');
        $('#humidity').text(Math.round(cur.relative_humidity_2m) + '%');
        $('#windSpeed').text(Math.round(cur.wind_speed_10m) + ' km/h');
        $('#precipProb').text(safeRound(data.daily.precipitation_probability_max[0], '%'));
        $('#sunriseTime').text(formatClock(data.daily.sunrise[0]));
        $('#sunsetTime').text(formatClock(data.daily.sunset[0]));


        // 5일 예보 카드를 반복문으로 조립하여 #forecastRow 에 한 번에 작성
        const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
        let cards = "";
        for(let i = 0; i < data.daily.time.length; i++) {
            // i 번째 일차의 날씨 코드로 날씨 정보 반환
            const dayInfo = getWeatherInfo(data.daily.weather_code[i]);
            let label = "";
            if(i === 0) label = "오늘";
            else if(i === 1) label = "내일";
            else label = WEEKDAY[new Date(data.daily.time[i]).getDay()];
            cards +=
                `<div class="forecast-card">
                    <p class="forecast-label">${label}</p>
                    <img src="${dayInfo.icon}" alt="" class="forecast-icon">
                    <p class="forecast-max">${Math.round(data.daily.temperature_2m_max[i])}°</p>
                    <p class="forecast-min">${Math.round(data.daily.temperature_2m_min[i])}°</p>
                    <p class="forecast-precip">☔${safeRound(data.daily.precipitation_probability_max[i])}%</p>
                </div>`
        }
        $("#forecastRow").html(cards);
    }

    // 도시 리스트
    function loadCityList() {
        //HOME_CITIES 내의 도시들의 위도를 하나의 문자열로 연결
        const lats = HOME_CITIES.map(function(name) {return FALLBACK_CITIES[name].lat;}).join(",");
        //HOME_CITIES 내의 도시들의 경도를 하나의 문자열로 연결
        const lons = HOME_CITIES.map(function(name) {return FALLBACK_CITIES[name].lon;}).join(",");

        $.getJSON("https://api.open-meteo.com/v1/forecast", {
            latitude: lats,
            longitude: lons,
            current: "temperature_2m,weather_code",
            daily: "temperature_2m_max,temperature_2m_min",
            forecast_days: 1,
            timezone:"auto"
        })        
        .done(function(results) { 
            let rows = "";
            // 오늘 최고 기온이 가장 높은 도시의 인덱스
            let hotIdx = 0;
            // 오늘 최저 기온이 가장 낮은 도시의 인덱스
            let coldIdx = 0;

            for(let i = 0; i < results.length; i++) {
                const name = HOME_CITIES[i];
                const city = FALLBACK_CITIES[name];

                // 각 도시 정보를 기반으로 HTML 형식의 코드를 생성
                rows += cityRowHTML(
                            name, 
                            city.lat, 
                            city.lon, 
                            results[i].current.weather_code,
                            results[i].current.temperature_2m
                        );

                // 최고/최소 기온 검사 및 저장
                if(results[i].daily.temperature_2m_max[0] > results[hotIdx].daily.temperature_2m_max[0]) {
                    hotIdx = i;
                }
                if(results[i].daily.temperature_2m_min[0] < results[coldIdx].daily.temperature_2m_min[0]) {
                    coldIdx = i;
                }
            }
            $("#cityList").html(rows);

            // 오늘의 전국 최고/최저 기온 2개
            const hotName = HOME_CITIES[hotIdx];
            const coldName = HOME_CITIES[coldIdx];
            const hotCity = FALLBACK_CITIES[hotName];
            const coldCity = FALLBACK_CITIES[coldName];

            $("#hotCity").data({
                name:hotName,
                lat:hotCity.lat,
                lon:hotCity.lon
            });
            $("#hotCity .extream-value")
                .html(hotName + " " + safeRound(results[hotIdx].daily.temperature_2m_max[0]) + "°");
                
            $("#coldCity")
                .data({name: coldName, lat:coldCity.lat, lon:coldCity.lon})
                .find(".extream-value")
                .html(coldName + " " + safeRound(results[coldIdx].daily.temperature_2m_min[0]) + "°");
        })
        .fail(function() { a
            alert("주요 도시 날씨를 불러오지 못했습니다.")
        });
    }

    // 시간별 날씨 예보
    function renderHourly(data) {
        const hourly = data.hourly;
        const HOURS_TO_SHOW = 12;

        // 현재 시각 이후의 인덱스
        let startIndex = 0;
        for(let h = 0; h < hourly.time.length; h++) {
            if(hourly.time[h] >= data.current.time) {
                startIndex = h;
                break;
            }
        }

        let rows = "";

        for(let n = 0; n < HOURS_TO_SHOW; n++) {
            const idx = startIndex + n;
            if(idx >= hourly.time.length) break;

            // idx 시간대의 날씨 정보
            const info = getWeatherInfo(hourly.weather_code[idx]);

            const uv = hourly.uv_index[idx];
            const uvText = (uv === null || uv === undefined) ? "-" : uv.toFixed(1) + "(" + uvLabel(uv) + ")";
            const vis = hourly.visibility[idx];
            const visText = (vis === null || vis === undefined) ? "-" : (vis/1000).toFixed(1) + "km";

            rows += 
                `<div class="hour-row">
                    <button type="button" class="hour-row-head" aria-expanded="false">
                        <span class="hour-main">
                            <span class="hour-time-col">
                                <span class="hour-time">${formatHourLabel(hourly.time[idx])}</span>
                                <span class="hour-desc">${info.label}</span>
                            </span>
                            <img src="${info.icon}" alt="" class="hour-icon">
                            <span class="hour-temp">${safeRound(hourly.temperature_2m[idx])}°</span>
                            <span class="hour-realfeel">체감 ${safeRound(hourly.apparent_temperature[idx])}°</span>
                            <span class="hour-precip">☔ ${safeRound(hourly.precipitation_probability[idx])}%</span>
                        </span>
                        <span class="hour-side">
                            <span class="hour-chevron">▼</span>
                        </span>
                    </button>
                    
                    <!-- 상세 날씨 정보 -->
                    <div class="hour-detail">
                        <div class="hour-detail-item"><span>바람</span><strong>${degToCompass(hourly.wind_direction_10m[idx])} ${safeRound(hourly.wind_speed_10m[idx])}km/h</strong></div>
                        <div class="hour-detail-item"><span>습도</span><strong>${safeRound(hourly.relative_humidity_2m[idx])}%</strong></div>
                        <div class="hour-detail-item"><span>자외선지수</span><strong>${uvText}</strong></div>
                        <div class="hour-detail-item"><span>이슬점</span><strong>${safeRound(hourly.dew_point_2m[idx])}°</strong></div>
                        <div class="hour-detail-item"><span>구름량</span><strong>${safeRound(hourly.cloud_cover[idx])}%</strong></div>
                        <div class="hour-detail-item"><span>가시거리</span><strong>${visText}</strong></div>
                    </div>
                </div>`
        }   // for(let n...)

        $("#hourlyList").html(rows).find(".hour-detail").hide();
    }

    // 주요 도시 항목 HTML 생성
    function cityRowHTML(name, lat, lon, weatherCode, temp) {
        const info = getWeatherInfo(weatherCode);

        return `<button type="button" class="city-row" data-name="${name}" data-lat="${lat}" data-lon="${lon}">
                    <span class="city-row-name">${name}</span>
                    <span class="city-row-weather">
                        <img src="${info.icon}" alt="" class="city-row-icon">
                        <span class="city-row-temp">${safeRound(temp)}°</span>
                        <span class="city-row-chevron">›</span>
                    </span>
                </button>`
    }

    // 내 위치 정보 탐색
    function loadMyLocation() { 
        if(!navigator.geolocation) {
            $("#myLocation").html("<p class='my-location-msg'>이 브라우저는 위치 기능을 지원하지 않습니다.</p>");
            return;
        }
        $("#myLocation").html("<p class='my-location-msg'>내 위치를 찾는 중...</p>");

        // 현재 위치 좌표를 기준으로 날씨 정보 구하기
        navigator.geolocation.getCurrentPosition(
            // 성공: 위치 권환을 받아서 위치 정보를 기반으로 날씨 카드 표시
            function(pos) {
                // 위도와 경도
                const lat = pos.coords.latitude.toFixed(4);
                const lon = pos.coords.longitude.toFixed(4);

                $.getJSON("https://api.open-meteo.com/v1/forecast", {
                    latitude: lat,
                    longitude: lon,
                    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
                    daily: "precipitation_probability_max,sunrise,sunset",
                    forecast_days: 5,
                    timezone:"auto"
                })
                .done(function(res) { 
                    renderMyLocation(res, lat, lon);
                })
                .fail(function() {  $("#myLocation").html("<p class='my-location-msg'>내 위치 날씨를 불러오지 못했습니다.</p>");});
            },
            // 실패: 권한 부여 실패, 거부 등
            function() {
                $("#myLocation").html("<p class='my-location-msg'>위치 권한이 필요합니다. 브라우저 설정을 확인해주세요.</p>")
            });      
    }

    function renderMyLocation(res, lat, lon) { 
        const cur = res.current;
        const info = getWeatherInfo(cur.weather_code);


        $("#myLocation").html(
            `<div class="current-card my-location-card" data-name="📍 내 위치" data-lat="${lat}" data-lon="${lon}">
                <div class="current-content">
                    <h2 class="location">📍 내 위치</h2>
                    <p class="updated">${cur.time.replace("T", " ") + "기준"}</p>

                    <div class="temp-row">
                        <img src="${info.icon}" alt="" class=" weather-icon">
                        <span class="temp">${safeRound(cur.temperature_2m)}°</span>
                    </div>
                    <p class="desc">${info.label}</p>

                    <div class="sub-info">
                        <div class="sub-item">
                            <span class="sub-label">체감</span>
                            <span>${safeRound(cur.apparent_temperature)}°</span>
                        </div>
                        <div class="sub-item">
                            <span class="sub-label">습도</span>
                            <span>${safeRound(cur.relative_humidity_2m)}%</span>
                        </div>
                        <div class="sub-item">
                            <span class="sub-label">풍속</span>
                            <span>${safeRound(cur.wind_speed_10m)}km/h</span>
                        </div>
                        <div class="sub-item">
                            <span class="sub-label">강수확률</span>
                            <span>${safeRound(res.daily.precipitation_probability_max[0])}%</span>
                        </div>
                    </div>

                    <!-- 일출/일몰 정보 -->
                    <div id="sunInfo" class="sun-info">
                        <span>🌅일출 <span>${formatClock(res.daily.sunrise[0])}</span></span>
                        <span>🌇일몰 <span>${formatClock(res.daily.sunset[0])}</span></span>
                    </div>

                    <!-- 미세먼지/초미세먼지 정보 -->
                    <div id="airInfo" class="air-info">
                        <div class="air-badge grade-good">미세먼지 -</div>
                        <div class="air-badge grade-bad">초미세먼지 -</div>
                    </div>
                </div>
            </div>`
        );

    }

    
    // ----------------------------------------
    // 데이터 로딩 완료
    //  - 상태 메세지 숨기기
    //  - 탭바 + 패널 표시
    // ----------------------------------------
    function showResult() {
        $("#statusMsg").prop("hidden", true);
        $("#tabBar").prop("hidden", false);

        const activeTab = $(".tab-btn.active").data("tab") || "summary";
        $("#panel-summary").prop("hidden", activeTab !== "summary");
        $("#panel-hourly").prop("hidden", activeTab !== "hourly");
    }

    //-----------------------------------------
    // 도시 이름 검색
    //  - 폴백 목록에 있으면 목록에서 반환(빠른 검색)
    //  - 없으면 Open-Meteo Geocoding API 로 검색
    //-----------------------------------------
    function searchCity(rawQuery) {
        const query = $.trim(rawQuery); // 앞뒤 공백을 제거한 검색한 값
        if(!query) return;

        if(FALLBACK_CITIES[query]) {
            const c = FALLBACK_CITIES[query];
            $("#cityInput").val("");    // 입력 요소의 입력 값 지우기
            openDetail(c.lat, c.lon, query);
            return;
        }

        showScreen("detail");
        showStatus(`"${query}" 검색중`);

        $.getJSON("https://geocoding-api.open-meteo.com/v1/search", {
            name:query,
            count:1,
            language:"ko",
            format:"json"
        })
        .done(function(res) { 
            console.log(res);
            if(res.results && res.results.length > 0) {
                const city = res.results[0];
                $("#cityInput").val("");
                openDetail(city.latitude, city.longitude, city.name);
            }
            else {
                showStatus(`"${query}"의 검색 결과가 없습니다. 영문 도시 명으로 시도해보세요.`);
            }
         })
        .fail(function() { showStatus("검색에 실패했습니다. 네트워크 상태를 확인해주세요."); });

    }

    // ----------------------------------------
    // 이벤트 연결
    // ----------------------------------------
    // 검색 기능
    $("#searchForm").on("submit", function(e) {
        e.preventDefault();
        searchCity($("#cityInput").val());
    });

    $("#myLocation").on("click", ".my-location-btn", function() {
        loadMyLocation();
    });

    // 도시 리스트 행/최고최저 기온 카드/내 위치 카드 → 상세 화면
    $(".page-content").on("click", ".city-row, .extream-card, .my-location-card", function() {
        const btn = $(this);
        openDetail(btn.data("lat"), btn.data("lon"), btn.data("name"));
    });

    // 뒤로가기: 상세 화면 → 홈 전환
    $("#backBtn").on("click", function() {
        showScreen("home");
        // 도시별 날씨 리스트 표시
        loadCityList();
    });

    // 탭 전환(주간 날씨(summary) ↔ 시간별 날씨(hourly))
    $("#tabBar").on("click", ".tab-btn", function() {
        
        $(".tab-btn").removeClass("active").attr("aria-selected", "false");
        $(this).addClass("active").attr("aria-selected", "true");
        
        // summary 또는 hourly 를 반환
        const tab = $(this).data("tab");
        $("#panel-summary").prop("hidden", tab !== "summary");
        $("#panel-hourly").prop("hidden", tab !== "hourly");
    });

    // 시간별 날씨 카드 클릭 → 상세 정보 펼치기/접기
    $("#hourlyList").on("click", ".hour-row-head", function() {
        const row = $(this).closest(".hour-row");
        row.toggleClass("open");
        $(this).attr("aria-expanded", row.hasClass("open") ? "true" : "false");
        row.find(".hour-detail").slideToggle(150);
    });

    // 첫 화면 홈으로 표시
    showScreen("home");
    loadCityList();
});