'use strict';

var Calendar = function (date) {
    if (date && !(date instanceof Date)) throw new Error('parameter should be a Date, not ' + date);
    this.time = date ? new Date(date.getTime()) : new Date();
};

Calendar.JANUARY = 0;
Calendar.FEBRUARY = 1;
Calendar.MARCH = 2;
Calendar.APRIL = 3;
Calendar.MAY = 4;
Calendar.JUNE = 5;
Calendar.JULY = 6;
Calendar.AUGUST = 7;
Calendar.SEPTEMBER = 8;
Calendar.OCTOBER = 9;
Calendar.NOVEMBER = 10;
Calendar.DECEMBER = 11;

Calendar.SUNDAY = 1;
Calendar.MONDAY = 2;
Calendar.TUESDAY = 3;
Calendar.WEDNESDAY = 4;
Calendar.THURSDAY = 5;
Calendar.FRIDAY = 6;
Calendar.SATURDAY = 7;

Calendar.ERA = 0;
Calendar.YEAR = 1;
Calendar.MONTH = 2;
Calendar.WEEK_OF_YEAR = 3;
Calendar.WEEK_OF_MONTH = 4;
Calendar.DATE = 5;
Calendar.DAY_OF_MONTH = 5;
Calendar.DAY_OF_YEAR = 6;
Calendar.DAY_OF_WEEK = 7;
Calendar.DAY_OF_WEEK_IN_MONTH = 8;
Calendar.AM_PM = 9;
Calendar.HOUR = 10;
Calendar.HOUR_OF_DAY = 11;
Calendar.MINUTE = 12;
Calendar.SECOND = 13;
Calendar.MILLISECOND = 14;
Calendar.ZONE_OFFSET = 15;
Calendar.DST_OFFSET = 16;

Calendar.SHORT_DATE_PATTERN = 0;
Calendar.LONG_DATE_PATTERN = 1;
Calendar.TIME_PATTERN = 2;
Calendar.INPUT_DATE_PATTERN = 3;
Calendar.INPUT_TIME_PATTERN = 4;
Calendar.INPUT_DATE_TIME_PATTERN = 5;

Calendar.prototype.getTimeZone = function () { throw new Error('not implemented: getTimeZone'); };
Calendar.prototype.setTimeZone = function () { throw new Error('not implemented: setTimeZone'); };
Calendar.prototype.add = function () {
    var value = Number(arguments[1]);
    if (arguments[0] === Calendar.ERA) {
        throw new Error('not implemented: add(ERA)');
    } else if (arguments[0] === Calendar.YEAR) {
        this.time.setFullYear(this.time.getFullYear() + value);
    } else if (arguments[0] === Calendar.MONTH) {
        this.time.setMonth(this.time.getMonth() + value);
    } else if (arguments[0] === Calendar.WEEK_OF_YEAR) {
        throw new Error('not implemented: add(WEEK_OF_YEAR)');
    } else if (arguments[0] === Calendar.WEEK_OF_MONTH) {
        throw new Error('not implemented: add(WEEK_OF_MONTH)');
    } else if (arguments[0] === Calendar.DATE || arguments[0] === Calendar.DAY_OF_MONTH) {
        this.time.setDate(this.time.getDate() + value);
    } else if (arguments[0] === Calendar.DAY_OF_YEAR) {
        throw new Error('not implemented: add(DAY_OF_YEAR)');
    } else if (arguments[0] === Calendar.DAY_OF_WEEK) {
        throw new Error('not implemented: add(DAY_OF_WEEK)');
    } else if (arguments[0] === Calendar.DAY_OF_WEEK_IN_MONTH) {
        throw new Error('not implemented: add(DAY_OF_WEEK_IN_MONTH)');
    } else if (arguments[0] === Calendar.AM_PM) {
        throw new Error('not implemented: add(AM_PM)');
    } else if (arguments[0] === Calendar.HOUR) {
        throw new Error('not implemented: add(HOUR)');
    } else if (arguments[0] === Calendar.HOUR_OF_DAY) {
        this.time.setHours(this.time.getHours() + value);
    } else if (arguments[0] === Calendar.MINUTE) {
        this.time.setMinutes(this.time.getMinutes() + value);
    } else if (arguments[0] === Calendar.SECOND) {
        this.time.setSeconds(this.time.getSeconds() + value);
    } else if (arguments[0] === Calendar.MILLISECOND) {
        this.time.setMilliseconds(this.time.getMilliseconds() + value);
    } else if (arguments[0] === Calendar.ZONE_OFFSET) {
        throw new Error('not implemented: add(ZONE_OFFSET)');
    } else if (arguments[0] === Calendar.DST_OFFSET) {
        throw new Error('not implemented: add(DST_OFFSET)');
    }
};
Calendar.prototype.get = function () {
    if (arguments[0] === Calendar.ERA) {
        throw new Error('not implemented: get(ERA)');
    } else if (arguments[0] === Calendar.YEAR) {
        return this.time.getFullYear();
    } else if (arguments[0] === Calendar.MONTH) {
        return this.time.getMonth();
    } else if (arguments[0] === Calendar.WEEK_OF_YEAR) {
        throw new Error('not implemented: get(WEEK_OF_YEAR)');
    } else if (arguments[0] === Calendar.WEEK_OF_MONTH) {
        throw new Error('not implemented: get(WEEK_OF_MONTH)');
    } else if (arguments[0] === Calendar.DATE || arguments[0] === Calendar.DAY_OF_MONTH) {
        return this.time.getDate();
    } else if (arguments[0] === Calendar.DAY_OF_YEAR) {
        throw new Error('not implemented: get(DAY_OF_YEAR)');
    } else if (arguments[0] === Calendar.DAY_OF_WEEK) {
        return this.time.getDay() + 1;
    } else if (arguments[0] === Calendar.DAY_OF_WEEK_IN_MONTH) {
        throw new Error('not implemented: get(DAY_OF_WEEK_IN_MONTH)');
    } else if (arguments[0] === Calendar.AM_PM) {
        throw new Error('not implemented: get(AM_PM)');
    } else if (arguments[0] === Calendar.HOUR) {
        throw new Error('not implemented: get(HOUR)');
    } else if (arguments[0] === Calendar.HOUR_OF_DAY) {
        return this.time.getHours();
    } else if (arguments[0] === Calendar.MINUTE) {
        return this.time.getMinutes();
    } else if (arguments[0] === Calendar.SECOND) {
        return this.time.getSeconds();
    } else if (arguments[0] === Calendar.MILLISECOND) {
        return this.time.getMilliseconds();
    } else if (arguments[0] === Calendar.ZONE_OFFSET) {
        throw new Error('not implemented: get(ZONE_OFFSET)');
    } else if (arguments[0] === Calendar.DST_OFFSET) {
        throw new Error('not implemented: get(DST_OFFSET)');
    }
    return null;
};
Calendar.prototype.equals = function () { throw new Error('not implemented: equals'); };
Calendar.prototype.hashCode = function () { throw new Error('not implemented: hashCode'); };
Calendar.prototype.compareTo = function () { throw new Error('not implemented: compareTo'); };
Calendar.prototype.clear = function () { throw new Error('not implemented: clear'); };
Calendar.prototype.isSet = function () { throw new Error('not implemented: isSet'); };
Calendar.prototype.set = function () {
    if (arguments.length === 2) {
        // called as: set(field, value)
        var value = Number(arguments[1]);
        if (arguments[0] === Calendar.ERA) {
            throw new Error('not implemented: set(ERA)');
        } else if (arguments[0] === Calendar.YEAR) {
            this.time.setFullYear(value);
        } else if (arguments[0] === Calendar.MONTH) {
            this.time.setMonth(value);
        } else if (arguments[0] === Calendar.WEEK_OF_YEAR) {
            throw new Error('not implemented: set(WEEK_OF_YEAR)');
        } else if (arguments[0] === Calendar.WEEK_OF_MONTH) {
            throw new Error('not implemented: set(WEEK_OF_MONTH)');
        } else if (arguments[0] === Calendar.DATE || arguments[0] === Calendar.DAY_OF_MONTH) {
            this.time.setDate(value);
        } else if (arguments[0] === Calendar.DAY_OF_YEAR) {
            throw new Error('not implemented: set(DAY_OF_YEAR)');
        } else if (arguments[0] === Calendar.DAY_OF_WEEK) {
            throw new Error('not implemented: set(DAY_OF_WEEK)');
        } else if (arguments[0] === Calendar.DAY_OF_WEEK_IN_MONTH) {
            throw new Error('not implemented: set(DAY_OF_WEEK_IN_MONTH)');
        } else if (arguments[0] === Calendar.AM_PM) {
            throw new Error('not implemented: set(AM_PM)');
        } else if (arguments[0] === Calendar.HOUR) {
            throw new Error('not implemented: set(HOUR)');
        } else if (arguments[0] === Calendar.HOUR_OF_DAY) {
            this.time.setHours(value);
        } else if (arguments[0] === Calendar.MINUTE) {
            this.time.setMinutes(value);
        } else if (arguments[0] === Calendar.SECOND) {
            this.time.setSeconds(value);
        } else if (arguments[0] === Calendar.MILLISECOND) {
            this.time.setMilliseconds(value);
        } else if (arguments[0] === Calendar.ZONE_OFFSET) {
            throw new Error('not implemented: set(ZONE_OFFSET)');
        } else if (arguments[0] === Calendar.DST_OFFSET) {
            throw new Error('not implemented: set(DST_OFFSET)');
        }
    } else if (arguments.length >= 3) {
        // called as: set(year, month, date, ...)
        this.time.setFullYear(Number(arguments[0]));
        this.time.setDate(Number(arguments[2]));
        this.time.setMonth(Number(arguments[1]));
        if (arguments.length >= 4) this.time.setHours(Number(arguments[3]));
        if (arguments.length >= 5) this.time.setMinutes(Number(arguments[4]));
        if (arguments.length >= 6) this.time.setSeconds(Number(arguments[5]));
    }
};
Calendar.prototype.before = function (otherCalendar) {
    if (this.time.getFullYear() < otherCalendar.time.getFullYear()) return true;
    if (this.time.getFullYear() > otherCalendar.time.getFullYear()) return false;
    if (this.time.getMonth() < otherCalendar.time.getMonth()) return true;
    if (this.time.getMonth() > otherCalendar.time.getMonth()) return false;
    if (this.time.getDate() < otherCalendar.time.getDate()) return true;
    if (this.time.getDate() > otherCalendar.time.getDate()) return false;
    if (this.time.getHours() < otherCalendar.time.getHours()) return true;
    if (this.time.getHours() > otherCalendar.time.getHours()) return false;
    if (this.time.getMinutes() < otherCalendar.time.getMinutes()) return true;
    if (this.time.getMinutes() > otherCalendar.time.getMinutes()) return false;
    if (this.time.getSeconds() < otherCalendar.time.getSeconds()) return true;
    if (this.time.getSeconds() > otherCalendar.time.getSeconds()) return false;
    if (this.time.getMilliseconds() < otherCalendar.time.getMilliseconds()) return true;
    if (this.time.getMilliseconds() > otherCalendar.time.getMilliseconds()) return false;
    return false;
};
Calendar.prototype.after = function (otherCalendar) {
    return this.time.getTime() !== otherCalendar.time.getTime() && !this.before(otherCalendar);
};
Calendar.prototype.getTime = function () { return this.time; };
Calendar.prototype.setTime = function () { throw new Error('not implemented: setTime'); };
Calendar.prototype.getMinimum = function () { throw new Error('not implemented: getMinimum'); };
Calendar.prototype.getMaximum = function () { throw new Error('not implemented: getMaximum'); };
Calendar.prototype.getActualMinimum = function () { throw new Error('not implemented: getActualMinimum'); };
Calendar.prototype.getActualMaximum = function () { throw new Error('not implemented: getActualMaximum'); };
Calendar.prototype.isLeapYear = function () { throw new Error('not implemented: isLeapYear'); };
Calendar.prototype.roll = function () { throw new Error('not implemented: roll'); };
Calendar.prototype.getFirstDayOfWeek = function () { throw new Error('not implemented: getFirstDayOfWeek'); };
Calendar.prototype.setFirstDayOfWeek = function () { throw new Error('not implemented: setFirstDayOfWeek'); };
Calendar.prototype.parseByFormat = function (timeString, format) {
    if (format === 'yyyy-MM-dd') {
        if (timeString.length < 10) throw new Error('Incorrect timeString value');
        var year = parseInt(timeString.substr(0, 4), 10);
        var month = parseInt(timeString.substr(5, 2), 10);
        var day = parseInt(timeString.substr(8, 2), 10);
        this.set(Calendar.YEAR, year);
        this.set(Calendar.DATE, day);
        this.set(Calendar.MONTH, month - 1);
        this.set(Calendar.HOUR_OF_DAY, 0);
        this.set(Calendar.MINUTE, 0);
        this.set(Calendar.SECOND, 0);
        this.set(Calendar.MILLISECOND, 0);
        return;
    }
    throw new Error('not implemented: parseByFormat');
};
Calendar.prototype.parseByLocale = function () { throw new Error('not implemented: parseByLocale'); };
Calendar.prototype.isSameDay = function (otherCalendar) {
    if (this.time.getFullYear() !== otherCalendar.time.getFullYear()) return false;
    if (this.time.getMonth() !== otherCalendar.time.getMonth()) return false;
    return this.time.getDate() === otherCalendar.time.getDate();
};
Calendar.prototype.timeZone = null;
Calendar.prototype.firstDayOfWeek = Calendar.MONDAY;

// helper functions, not part of original Calendar object, ignores timezone
Calendar.prototype.toISOString = function () {
    function pad2(nr) { // eslint-disable-line require-jsdoc
        if (nr < 10) return '0' + nr;
        return nr.toString();
    }
    function pad3(nr) { // eslint-disable-line require-jsdoc
        if (nr < 10) return '00' + nr;
        if (nr < 100) return '0' + nr;
        return nr.toString();
    }
    var time = this.time;
    return time.getFullYear() + '-' + pad2(time.getMonth() + 1) + '-' + pad2(time.getDate()) + 'T' + pad2(time.getHours()) + ':' + pad2(time.getMinutes()) + ':' + pad2(time.getSeconds()) + '.' + pad3(time.getMilliseconds()) + 'Z';
};
Calendar.prototype.toISODateString = function () {
    function pad2(nr) { // eslint-disable-line require-jsdoc
        if (nr < 10) return '0' + nr;
        return nr.toString();
    }
    var time = this.time;
    return time.getFullYear() + '-' + pad2(time.getMonth() + 1) + '-' + pad2(time.getDate());
};

module.exports = Calendar;
