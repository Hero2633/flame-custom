import { useTranslation } from 'react-i18next';
import classes from './Spinner.module.css';

export const Spinner = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={classes.SpinnerWrapper}>
      <div className={classes.Spinner}>{t('common.loading')}</div>
    </div>
  );
};
