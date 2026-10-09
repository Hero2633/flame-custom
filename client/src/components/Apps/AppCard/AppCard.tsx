import classes from './AppCard.module.css';
import { isImage, isSvg, isUrl, urlParser } from '../../../utility';
import { useFavicon } from '../../../hooks/useFavicon';

import { App } from '../../../interfaces';
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';

interface Props {
  app: App;
}

// 稳定 Material / 莫兰迪高质感头像底色
const getAvatarColor = (str: string): string => {
  const colors = [
    '#2563EB', '#7C3AED', '#DB2777', '#EA580C',
    '#16A34A', '#0891B2', '#4F46E5', '#059669',
    '#D97706', '#DC2626', '#475569'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const AppCard = ({ app }: Props): JSX.Element => {
  const { config } = useSelector((state: State) => state.config);

  const [displayUrl, redirectUrl] = urlParser(app.url);
  const { icon, name, description } = app;

  let iconEl: JSX.Element;

  const isCustomFile = icon && (isImage(icon) || isSvg(icon));
  const { faviconUrl, imgLoaded, imgFailed, onLoad, onError } =
    useFavicon(redirectUrl, !isCustomFile);

  if (isCustomFile) {
    const source = isUrl(icon) ? icon : `/uploads/${icon}`;
    if (isSvg(icon)) {
      iconEl = (
        <div className={classes.CustomIcon}>
          <svg
            data-src={source}
            fill="var(--color-primary)"
            className={classes.CustomIcon}
          ></svg>
        </div>
      );
    } else {
      iconEl = (
        <img
          src={source}
          alt={`${name} icon`}
          className={classes.CustomIcon}
        />
      );
    }
  } else {
    const firstChar = (name || '').trim().charAt(0).toUpperCase() || '•';
    const avatarColor = getAvatarColor(name || redirectUrl);

    iconEl = (
      <div className={classes.AppCardIconInner}>
        {/* 未加载时占位，加载成功后彻底隐藏，绝不产生杂色 */}
        {(!faviconUrl || imgFailed || !imgLoaded) && (
          <div
            className={classes.LetterAvatar}
            style={{
              backgroundColor: imgLoaded ? 'transparent' : avatarColor,
              display: imgLoaded ? 'none' : 'flex'
            }}
          >
            {!imgLoaded && firstChar}
          </div>
        )}

        {/* 顶层 Favicon 图片 */}
        {faviconUrl && !imgFailed && (
          <img
            src={faviconUrl}
            alt={`${name} icon`}
            className={`${classes.CustomIcon} ${classes.FaviconOverlay} ${imgLoaded ? classes.FaviconVisible : ''}`}
            key={faviconUrl}
            onLoad={onLoad}
            onError={onError}
          />
        )}
      </div>
    );
  }

  return (
    <a
      href={redirectUrl}
      target={config.appsSameTab ? '' : '_blank'}
      rel="noreferrer"
      className={classes.AppCard}
    >
      <div className={classes.AppCardIcon}>{iconEl}</div>
      <div className={classes.AppCardDetails}>
        <h5>{app.name}</h5>
        <span>{!description.length ? displayUrl : description}</span>
      </div>
    </a>
  );
};
