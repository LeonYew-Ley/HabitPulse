
export const QUOTES = [
  "The only way to do great work is to love what you do.",
  "千里之行，始于足下。",
  "Consistency is the key to success.",
  "不积跬步，无以至千里。",
  "Your future is created by what you do today, not tomorrow.",
  "种一棵树最好的时间是十年前，其次是现在。",
  "Believe you can and you're halfway there.",
  "锲而不舍，金石可镂。",
  "Actions speak louder than words.",
  "世上无难事，只怕有心人。",
  "Success is the sum of small efforts, repeated day in and day out.",
  "流水不腐，户枢不蠹。",
  "Don't watch the clock; do what it does. Keep going.",
  "天道酬勤。",
  "It does not matter how slowly you go as long as you do not stop.",
  "学而不思则罔，思而不学则殆。",
  "Everything you've ever wanted is on the other side of fear.",
  "知行合一。",
  "Dream big and dare to fail.",
  "日拱一卒，功不唐捐。"
];

export function getDailyQuote(): string {
  // Use current date to pick a consistent quote for the day
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  return QUOTES[dayOfYear % QUOTES.length];
}
