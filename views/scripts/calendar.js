class Calendar extends HTMLElement {
    constructor() {
        super();
        const today = new Date();
        this.monthDays = [];
        this.month = today.getMonth();
        this.year = today.getFullYear();

        // this.apiURL = 'http://localhost:3000'
        this.apiURL = 'https://weprayallday.com'

        this.draw();
    }

    draw = async () => {
        this.innerHTML = `
            <div class="calendar">
                <div id="context">    
                    <h1>Choose A Day To Pray</h1>
                    <ol>
                        <li>⏱️ Pick an hour</li>
                        <li>🗃️ Drop your info (we won't spam you)</li>
                        <li>📲 Get a text reminder when it's your time</li>
                    </ol>
                </div>
                <div id="month-header">
                    <div id="btn-container">
                        <button class="btn" id="prev-month"><i class="material-icons">keyboard_arrow_left</i></button>
                        <h3 id="month-label"></h3>
                        <button class="btn" id="next-month"><i class="material-icons">keyboard_arrow_right</i></button>
                    </div>
                    <div id="legend">
                        <div id="empty-square"></div>
                        <p>: Open for Prayer</p>
                        <div id="filled-square"></div>
                        <p>: Booked for Prayer (More? Bring it on!)</p>
                    </div>
                </div>
                <div id="weekdays"></div>
                <div id="days-grid"></div>
            </div>
        `;

        const nextBtn = document.querySelector('#next-month')
            nextBtn.onclick = this.nextMonth;
        const prevBtn = document.querySelector('#prev-month');
            prevBtn.onclick = this.prevMonth;

        return this.update(this.year, this.month)
    }

    getNumLabel = (date) => {
        const dateArray = date.toString().split('')
        const lastDateDigit = dateArray[dateArray.length - 1];
        return [11,12,13].includes(date) ? 'th' : lastDateDigit == 1 ? 'st' : lastDateDigit == 2 ? 'nd' : lastDateDigit == 3 ? 'rd' : 'th'
    }

    update = async (year, month) => {
        loading();
        // Create Month Data ------------------------------------------------------------
        
        const date = new Date(year, month, 1);
        //loops and iterates day by one until month no longer is the same
        while (date.getMonth() === month) {
            //saves each day of the month parameter
            this.monthDays.push(date.toDateString());
            date.setDate(date.getDate() + 1);
        }
        
        const bufferDays = parseInt(new Date(this.monthDays[0]).getDay());
        for (let i = 0; i < bufferDays; i ++) {
            const earliestDate = new Date(this.monthDays[0]);
            this.monthDays.unshift(new Date(earliestDate.setDate(earliestDate.getDate() - 1)).toDateString())
        }
        // ------------------------------------------------------------------------------
        
        // Create Header Row ------------------------------------------------------------
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthHeaderDOM = document.querySelector('#month-label');
        monthHeaderDOM.innerHTML = `${months[month]} ${year}`;

        // ------------------------------------------------------------------------------
        
        // Create Week Row ------------------------------------------------------------
        
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdaysDOM = document.querySelector('#weekdays');
        weekdaysDOM.innerHTML = weekdays.map(weekday => {
            const otherLetters = weekday.split('').slice(1).join('');
            const firstLetter = weekday.split('')[0];
            return `<p>${firstLetter}<span>${otherLetters}</span></p>`
        }).join('')
        
        // ----------------------------------------------------------------------------

        
        // Create Calendar Days ------------------------------------------------------------

        const daysGridDOM = document.querySelector('#days-grid');
        daysGridDOM.innerHTML = this.monthDays.map(day => {
            if (day == 0) return '<div class="calendar-day hidden"></div>'
            const currDate = new Date(day);
            const date = currDate.getDate();
            const month = currDate.getMonth();
            const hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]

            const disabled = new Date().setHours(0, 0, 0, -1) >= currDate;

            return `
                <button class="calendar-day" onclick="window.location='/signup?date=${day}'" ${disabled ? 'disabled' : ''}>
                    <p class="date">${date}<sup>${this.getNumLabel(date)}</sup></p>
                    <p class="community-title" id="title-${date}-${month}-${year}"></p>
                    <div class="hours-container">
                        ${hours.map(hour => {
                            return `<a href="${disabled ? '' : `/signup?date=${day}&hour=${hour}`}" id="${hour}-${date}-${month}-${year}" class="hour"></a>` //booked class makes it blue
                        }).join('')}
                    </div>
                    <p class="progress-label"><span id="progress-${date}-${month}-${year}">0</span>% <span class="covered-label">Covered</span></p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="bar-${date}-${month}-${year}" style="max-width: 0%;"></bar>
                    </div>
                </button>
                `
        }).join('')

        document.querySelectorAll('.hour').forEach(elem => {
            const {id} = elem;
            const hour = id.split('-')[0];
            const time = hour == 0 ? `12:00 am` : hour == 12 ? `${hour}:00 pm` : hour > 12 ? `${hour - 12}:00 pm` : `${hour}:00 am`
            elem.setAttribute('data-content', time);
        })
        
        // ---------------------------------------------------------------------------------
        
        // Get booked hours from api -------------------------------------------------------

        const data = await axios({
            method: 'get',
            url: `${this.apiURL}/api/v1/Prayer_Schedules?$filter=MONTH(Start_Date)=${month} OR MONTH(Start_Date)=${month + 1} AND YEAR(Start_Date)=${year}`
        })
            .then(response => response.data)
            .catch(err => {
                console.error(JSON.stringify(err))
                doneLoading();
            })
        
        const {Prayer_Schedules} = data;


        for (let i = 0; i < Prayer_Schedules.length; i ++) {
            const {Start_Date, End_Date} = Prayer_Schedules[i];
            const startDate = new Date(Start_Date);
            const hour = startDate.getHours();
            const date = startDate.getDate();
            const month = startDate.getMonth();
            const year = startDate.getFullYear();

            const currHourDOM = document.getElementById(`${hour}-${date}-${month}-${year}`);
                if (currHourDOM) currHourDOM.classList.add('booked')
        }
        // ---------------------------------------------------------------------------------
        
        // Calculate percentage and number of hours ----------------------------------------
        
        for (let i = 0; i < this.monthDays.length; i ++) {
            const currDate = new Date(this.monthDays[i]);
            const date = currDate.getDate();
            const month = currDate.getMonth();
            let hourCount = 0;
            for (let j = 0; j < 24; j ++) {
                const currHourDOM = document.getElementById(`${j}-${date}-${month}-${year}`);
                // console.log(`${j}-${date}-${month}-${this.year}`)
                if (currHourDOM.classList.contains('booked')) hourCount ++;
            }

            const percentage = Math.round(hourCount / 24 * 100);
            const beforeToday = currDate < new Date().setHours(-1)
            const s = beforeToday ? hourCount == 1 ? '' : 's' : 24 - hourCount == 1 ? '' : 's';
            
            const dayTitleDOM = document.getElementById(`title-${date}-${month}-${year}`)
                dayTitleDOM.innerText = beforeToday ? `${hourCount} Hour${s} Prayed For` : `${24 - hourCount} Hour${s} Available`;
            
                const progressLabelDOM = document.getElementById(`progress-${date}-${month}-${year}`);
                    progressLabelDOM.innerText = percentage;
                const progressBarDOM = document.getElementById(`bar-${date}-${month}-${year}`);
                    progressBarDOM.style.maxWidth = `${percentage}%`;
        }

        // ---------------------------------------------------------------------------------
        
        doneLoading();
    }

    nextMonth = () => {
        this.monthDays = [];
        if (this.month < 11) {
            this.month ++;
        } else {
            this.month = 0;
            this.year ++;
        }
        this.update(this.year, this.month)
    }
    prevMonth = () => {
        this.monthDays = [];
        if (this.month > 0) {
            this.month --;
        } else {
            this.month = 11;
            this.year --;
        }
        this.update(this.year, this.month)
    }
}

customElements.define('prayer-calendar', Calendar);