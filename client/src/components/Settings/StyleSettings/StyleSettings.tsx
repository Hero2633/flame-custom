import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// Redux
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { ApiResponse } from '../../../interfaces';

// Other
import { InputGroup, Button } from '../../UI';
import { applyAuth } from '../../../utility';

export const StyleSettings = (): JSX.Element => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { createNotification } = bindActionCreators(actionCreators, dispatch);

  const [customStyles, setCustomStyles] = useState<string>('');

  useEffect(() => {
    axios
      .get<ApiResponse<string>>('/api/config/0/css')
      .then((data) => setCustomStyles(data.data.data))
      .catch((err) => console.log(err.response));
  }, []);

  const inputChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setCustomStyles(e.target.value);
  };

  const formSubmitHandler = (e: FormEvent) => {
    e.preventDefault();

    axios
      .put<ApiResponse<{}>>(
        '/api/config/0/css',
        { styles: customStyles },
        { headers: applyAuth() }
      )
      .then(() => {
        createNotification({
          title: t('common.success'),
          message: t('settings.css.cssSaved'),
        });
      })
      .catch((err) => console.log(err.response));
  };

  return (
    <form onSubmit={(e) => formSubmitHandler(e)}>
      <InputGroup>
        <label htmlFor="customStyles">{t('settings.css.headline')}</label>
        <textarea
          id="customStyles"
          name="customStyles"
          placeholder={t('settings.css.placeholder')}
          value={customStyles}
          onChange={(e) => inputChangeHandler(e)}
          spellCheck={false}
        ></textarea>
      </InputGroup>
      <Button>{t('settings.css.saveCss')}</Button>
    </form>
  );
};
