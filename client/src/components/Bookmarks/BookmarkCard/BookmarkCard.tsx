import { useState } from 'react';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { Bookmark, Category } from '../../../interfaces';

// Other
import classes from './BookmarkCard.module.css';
import { Icon } from '../../UI';
import { iconParser, isImage, isSvg, isUrl, urlParser } from '../../../utility';
import { useFavicon } from '../../../hooks/useFavicon';

interface Props {
  category: Category;
  fromHomepage?: boolean;
}

// 根据名称生成稳定且高质感的 Material / 莫兰迪色标
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

interface BookmarkItemProps {
  bookmark: Bookmark;
  bookmarksSameTab: boolean;
}

const BookmarkItem = ({ bookmark, bookmarksSameTab }: BookmarkItemProps): JSX.Element => {
  const [showSecret, setShowSecret] = useState(false);
  const [, redirectUrl] = urlParser(bookmark.url);
  const { icon, name, description } = bookmark;
  const { faviconUrl, imgLoaded, imgFailed, onLoad, onError } =
    useFavicon(redirectUrl, !icon || !icon.trim());

  let iconEl: JSX.Element;

  if (icon && icon.trim().length > 0) {
    if (isImage(icon)) {
      const source = isUrl(icon) ? icon : `/uploads/${icon}`;
      iconEl = (
        <div className={classes.BookmarkIcon}>
          <img
            src={source}
            alt={`${name} icon`}
            className={classes.CustomIcon}
          />
        </div>
      );
    } else if (isSvg(icon)) {
      const source = isUrl(icon) ? icon : `/uploads/${icon}`;
      iconEl = (
        <div className={classes.BookmarkIcon}>
          <svg
            data-src={source}
            fill="var(--color-primary)"
            className={classes.BookmarkIconSvg}
          ></svg>
        </div>
      );
    } else {
      iconEl = (
        <div className={classes.BookmarkIcon}>
          <Icon icon={iconParser(icon)} />
        </div>
      );
    }
  } else {
    // 自动获取 Favicon：若图片成功加载，完全隐藏底层圆徽；若失败或无图，才展示首字圆徽
    const firstChar = (name || '').trim().charAt(0).toUpperCase() || '•';
    const avatarColor = getAvatarColor(name || redirectUrl);

    iconEl = (
      <div className={classes.BookmarkIcon}>
        {/* 当且仅当 Favicon 未加载成功且失败时，才显示彩色字母圆徽 */}
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

        {/* 顶层 Favicon 图片：加载成功后原生透明呈现，彻底告别底层杂色污染 */}
        {faviconUrl && !imgFailed && (
          <img
            src={faviconUrl}
            alt={`${name} icon`}
            className={`${classes.FaviconImg} ${imgLoaded ? classes.FaviconImgVisible : ''}`}
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
      target={bookmarksSameTab ? '' : '_blank'}
      rel="noreferrer"
      key={`bookmark-${bookmark.id}`}
      className={classes.BookmarkCardLink}
    >
      {iconEl}
      <div className={classes.BookmarkCardDetails}>
        <div className={classes.BookmarkName}>{bookmark.name}</div>
        {description && description.trim().length > 0 && (
          <div className={classes.BookmarkSecretRow}>
            <span className={classes.SecretText}>
              {showSecret ? description : '••••••••'}
            </span>
            <span
              className={classes.EyeButton}
              title={showSecret ? '隐藏私密备注' : '查看私密备注'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSecret(!showSecret);
              }}
            >
              <Icon
                icon={showSecret ? 'mdiEyeOff' : 'mdiEye'}
                color="var(--color-accent)"
              />
            </span>
          </div>
        )}
      </div>
    </a>
  );
};

export const BookmarkCard = (props: Props): JSX.Element => {
  const { category, fromHomepage = false } = props;

  const {
    config: { config },
    auth: { isAuthenticated },
  } = useSelector((state: State) => state);

  const dispatch = useDispatch();
  const { setEditCategory } = bindActionCreators(actionCreators, dispatch);

  return (
    <div className={classes.BookmarkCard}>
      <h3
        className={
          fromHomepage || !isAuthenticated ? '' : classes.BookmarkHeader
        }
        onClick={() => {
          if (!fromHomepage && isAuthenticated) {
            setEditCategory(category);
          }
        }}
      >
        {category.name}
      </h3>

      <div className={classes.Bookmarks}>
        {category.bookmarks.map((bookmark: Bookmark) => (
          <BookmarkItem
            key={`bookmark-${bookmark.id}`}
            bookmark={bookmark}
            bookmarksSameTab={config.bookmarksSameTab}
          />
        ))}
      </div>
    </div>
  );
};
