declare module 'lunar-javascript' {
  export interface LunarDate {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact(): string;
    getEightChar(): EightChar;
  }

  export interface SolarDate {
    getLunar(): LunarDate;
  }

  export interface EightChar {
    getYun(gender: 0 | 1): Yun;
  }

  export interface Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    getDaYun(count?: number): DaYun[];
  }

  export interface DaYun {
    getIndex(): number;
    getStartAge(): number;
    getStartYear(): number;
    getGanZhi(): string;
  }

  export const Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): SolarDate;
  };
}
