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
    function formatHourLabel(isoTime) {
        let time = isoTime.split("T")[1];
        const hour = parseInt(time.split(":")[0]);
        const period = hour < 12 ? "오전" : "오후";

        let h12 = hour % 12;
        if(h12 == 0 )h12= 12;
        return period + " "+ h12 + "시";
    }

    // 풍량
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
            showResult();
        })
        .fail(function() { 
            // 불어오기가 실패한 경우
            showError("날씨 정보를 가져오지 못했습니다. 잠시후 다시 시도해주세요.");
        })
    }

    // ----------------------------------------
    // 받아온 데이터 화면에 표시
    // ----------------------------------------
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

        const WEEKDAY = ["일","월","화","수","목","금","토"]
        
        let cards = "";
        for(let i = 0; i < data.daily.time.length; i++) {
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
                    <p class="forecast-min">${Math.round(data.daily.temperature_2m_max[i])}°</p>
                    <p class="forecast-precip">☔${safeRound(data.daily.precipitation_probability_max[i])}%</p>
                </div>`
        }
        $("#forecastRow").html(cards);
    }
    
    function renderHourly(data) {
        const hurly = data.houtly;
        const HOURS_TO_SHOW = 12;

        let startIndex = 0;
        for(let h = 0; h < renderHourly.time.length; h++) {
            if(renderHourly.time[h] >= data.current.time) {
                startIndex = h;
                break
            }
        }

        let rows ="";

        rows += 
            `<div class="hour-row">
                <button type="button" class="hour-row-head" aria-expanded="false">
                    <span class="hour-main">
                        <span class="hour-time-col">
                            <span class="hour-time">오후 1시</span>
                            <span class="hour-desc">맑음</span>
                        </span>
                        <img src="icons/clear-day.svg" alt="" class="hour-icon">
                        <span class="hour-temp">30°</span>
                        <span class="hour-realfeel">체감 35°</span>
                        <span class="hour-precip">☔ 0%</span>
                    </span>
                    <span class="hour-side">
                        <span class="hour-chevron">▼</span>
                    </span>
                </button>
                <div class="hour-detail">
                    <div class="hour-detail-item"><span>바람</span><strong>서북서 7km/h</strong></div>
                    <div class="hour-detail-item"><span>습도</span><strong>36%</strong></div>
                    <div class="hour-detail-item"><span>자외선 지수</span><strong>7.9(높음)</strong></div>
                    <div class="hour-detail-item"><span>이슬점</span><strong>22</strong></div>
                    <div class="hour-detail-item"><span>구름량</span><strong>26%</strong></div>
                    <div class="hour-detail-item"><span>가시거리</span><strong>31.7km</strong></div>
                </div>
            </div>`;
        
        $("#hourlyList").html(rows).find(".hour-detail").hide();
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


    //| 서울 | 37.5665 | 126.9780 |
    loadWeather(37.5665, 126.9780, "서울");

    // ----------------------------------------
    // 이벤트 연결
    // ----------------------------------------
    // 검색 기능
    $("#searchForm").on("submit", function(e) {
        e.preventDefault();
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
    
    

});