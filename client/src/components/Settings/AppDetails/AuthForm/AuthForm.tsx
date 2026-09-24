import { FormEvent, Fragment, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Redux
import { useSelector, useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../../store';
import { State } from '../../../../store/reducers';
import { decodeToken, parseTokenExpire } from '../../../../utility';

// Other
import { InputGroup, Button } from '../../../UI';
import classes from '../AppDetails.module.css';

export const AuthForm = (): JSX.Element => {
  const { t } = useTranslation();
  const { isAuthenticated, token } = useSelector((state: State) => state.auth);

  const dispatch = useDispatch();
  const { login, logout } = bindActionCreators(actionCreators, dispatch);

  const [tokenExpires, setTokenExpires] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    duration: '14d',
  });

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      const expiresIn = parseTokenExpire(decoded.exp);
      setTokenExpires(expiresIn);
    }
  }, [token]);

  const formHandler = (e: FormEvent) => {
    e.preventDefault();
    login(formData);
    setFormData({
      password: '',
      duration: '14d',
    });
  };

  return (
    <Fragment>
      {!isAuthenticated ? (
        <form onSubmit={formHandler}>
          <InputGroup>
            <label htmlFor="password">{t('settings.auth.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••"
              autoComplete="current-password"
              ref={passwordInputRef}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <span>
              <a
                href="https://github.com/pawelmalak/flame/wiki/Authentication"
                target="blank"
              >
                {t('settings.auth.wikiLink')}
              </a>
            </span>
          </InputGroup>

          <InputGroup>
            <label htmlFor="duration">{t('settings.auth.sessionDuration')}</label>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
            >
              <option value="1h">{t('settings.auth.duration1h')}</option>
              <option value="1d">{t('settings.auth.duration1d')}</option>
              <option value="14d">{t('settings.auth.duration14d')}</option>
              <option value="30d">{t('settings.auth.duration30d')}</option>
              <option value="1y">{t('settings.auth.duration1y')}</option>
            </select>
          </InputGroup>

          <Button>{t('settings.auth.login')}</Button>
        </form>
      ) : (
        <div>
          <p className={classes.text}>
            {t('settings.auth.sessionActive')}{' '}
            <span>{tokenExpires}</span>
          </p>
          <Button click={logout}>{t('settings.auth.logout')}</Button>
        </div>
      )}
    </Fragment>
  );
};
