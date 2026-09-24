import { parseTime } from '../../../../utility';
import i18n from '../../../../i18n';

export const getDateTime = (): string => {
  const isEn = (i18n.language || 'zh').startsWith('en');

  const defaultDaysZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const defaultDaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const defaultMonthsZh = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const defaultMonthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const days = localStorage.getItem('daySchema')?.split(';') || (isEn ? defaultDaysEn : defaultDaysZh);
  const months = localStorage.getItem('monthSchema')?.split(';') || (isEn ? defaultMonthsEn : defaultMonthsZh);

  const now = new Date();

  const useAmericanDate = localStorage.useAmericanDate === 'true';
  const showTime = localStorage.showTime === 'true';
  const hideDate = localStorage.hideDate === 'true';

  // Date
  let dateEl = '';

  if (!hideDate) {
    if (!isEn && !localStorage.getItem('daySchema')) {
      dateEl = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;
    } else if (!useAmericanDate) {
      dateEl = `${days[now.getDay()]}, ${now.getDate()} ${
        months[now.getMonth()]
      } ${now.getFullYear()}`;
    } else {
      dateEl = `${days[now.getDay()]}, ${
        months[now.getMonth()]
      } ${now.getDate()} ${now.getFullYear()}`;
    }
  }

  // Time
  const p = parseTime;
  let timeEl = '';

  if (showTime) {
    const time = `${p(now.getHours())}:${p(now.getMinutes())}:${p(
      now.getSeconds()
    )}`;

    timeEl = time;
  }

  // Separator
  let separator = '';

  if (!hideDate && showTime) {
    separator = ' - ';
  }

  // Output
  return `${dateEl}${separator}${timeEl}`;
};
