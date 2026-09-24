import { useEffect } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import 'external-svg-loader';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { autoLogin, getConfig } from './store/action-creators';
import { actionCreators, store } from './store';
import { State } from './store/reducers';

import i18n from './i18n';
import { checkVersion, decodeToken, parsePABToTheme } from './utility';

// Routes
import { Home } from './components/Home/Home';
import { Apps } from './components/Apps/Apps';
import { Settings } from './components/Settings/Settings';
import { Bookmarks } from './components/Bookmarks/Bookmarks';
import { NotificationCenter } from './components/NotificationCenter/NotificationCenter';

// Get config
store.dispatch<any>(getConfig());

// Validate token
if (localStorage.token) {
  store.dispatch<any>(autoLogin());
}

export const App = (): JSX.Element => {
  const { config, loading } = useSelector((state: State) => state.config);

  const dispath = useDispatch();
  const { fetchQueries, setTheme, logout, createNotification, fetchThemes } =
    bindActionCreators(actionCreators, dispath);

  useEffect(() => {
    // check if token is valid
    const tokenIsValid = setInterval(() => {
      if (localStorage.token) {
        const expiresIn = decodeToken(localStorage.token).exp * 1000;
        const now = new Date().getTime();

        if (now > expiresIn) {
          logout();
          createNotification({
            title: i18n.t('common.info'),
            message: i18n.t('settings.auth.sessionExpired'),
          });
        }
      }
    }, 1000);

    // load themes
    fetchThemes();

    // set user theme if present
    if (localStorage.theme) {
      setTheme(parsePABToTheme(localStorage.theme));
    }

    // Apply font scale if present
    const savedScale = localStorage.fontScale || '1.15';
    document.documentElement.style.setProperty('--font-scale', savedScale);

    // check for updated
    checkVersion();

    // load custom search queries
    fetchQueries();

    return () => window.clearInterval(tokenIsValid);
  }, []);

  // If there is no user theme, set the default one
  useEffect(() => {
    if (!loading) {
      if (!localStorage.theme) {
        setTheme(parsePABToTheme(config.defaultTheme), false);
      }
      if (config.fontScale) {
        document.documentElement.style.setProperty('--font-scale', config.fontScale);
      }
    }
  }, [loading]);

  return (
    <>
      <BrowserRouter>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/settings" component={Settings} />
          <Route path="/applications" component={Apps} />
          <Route path="/bookmarks" component={Bookmarks} />
        </Switch>
      </BrowserRouter>
      <NotificationCenter />
    </>
  );
};
