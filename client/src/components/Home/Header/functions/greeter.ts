import i18n from '../../../../i18n';

export const greeter = (): string => {
  const now = new Date().getHours();
  let msg: string;

  const isEn = (i18n.language || 'zh').startsWith('en');
  const defaultGreetings = isEn
    ? 'Good evening!;Good afternoon!;Good morning!;Good night!'
    : '晚上好！;下午好！;早上好！;夜深了，注意休息！';

  const greetingsSchemaRaw =
    localStorage.getItem('greetingsSchema') || defaultGreetings;
  const greetingsSchema = greetingsSchemaRaw.split(';');

  if (now >= 18) msg = greetingsSchema[0];
  else if (now >= 12) msg = greetingsSchema[1];
  else if (now >= 6) msg = greetingsSchema[2];
  else if (now >= 0) msg = greetingsSchema[3];
  else msg = isEn ? 'Hello!' : '你好！';

  return msg;
};
