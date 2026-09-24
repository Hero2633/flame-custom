import { Fragment, ReactNode, isValidElement } from 'react';
import classes from './Headline.module.css';
import { Icon } from '../../Icons/Icon/Icon';

interface Props {
  title: string;
  subtitle?: ReactNode;
}

export const Headline = (props: Props): JSX.Element => {
  const renderSubtitle = () => {
    if (!props.subtitle) return null;

    if (isValidElement(props.subtitle)) {
      const children = props.subtitle.props.children;
      const elementWithIcon = {
        ...props.subtitle,
        props: {
          ...props.subtitle.props,
          children: (
            <Fragment>
              <span className={classes.BackIcon}>
                <Icon icon="mdiArrowLeft" color="currentColor" />
              </span>
              {children}
            </Fragment>
          ),
        },
      };
      return elementWithIcon;
    }

    return props.subtitle;
  };

  return (
    <Fragment>
      <h1 className={classes.HeadlineTitle}>{props.title}</h1>
      {props.subtitle && (
        <p className={classes.HeadlineSubtitle}>{renderSubtitle()}</p>
      )}
    </Fragment>
  );
};
