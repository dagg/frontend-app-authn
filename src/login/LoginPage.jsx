import React, {useEffect, useMemo, useState} from 'react';
import { connect } from 'react-redux';

import { getConfig } from '@edx/frontend-platform';
import { sendPageEvent, sendTrackEvent } from '@edx/frontend-platform/analytics';
import {injectIntl, useIntl} from '@edx/frontend-platform/i18n';
import {
  Form, StatefulButton,
} from '@edx/paragon';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

import {
  backupLoginFormBegin,
  loginRequest,
} from './data/actions';
import { INVALID_FORM } from './data/constants';
import LoginFailureMessage from './LoginFailure';
import messages from './messages';
import {
  FormGroup, InstitutionLogistration, PasswordField, RedirectLogistration,
  RenderInstitutionButton, SocialAuthProviders, ThirdPartyAuthAlert,
} from '../common-components';
import { getThirdPartyAuthContext } from '../common-components/data/actions';
import { thirdPartyAuthContextSelector } from '../common-components/data/selectors';
import EnterpriseSSO from '../common-components/EnterpriseSSO';
import {
  DEFAULT_STATE, ENTERPRISE_LOGIN_URL, PENDING_STATE, RESET_PAGE,
} from '../data/constants';
import {
  getActivationStatus,
  getAllPossibleQueryParams,
  getTpaHint,
  getTpaProvider,
  setSurveyCookie,
  updatePathWithQueryParams,
  windowScrollTo,
} from '../data/utils';
import ResetPasswordSuccess from '../reset-password/ResetPasswordSuccess';

const LoginPage = (props) => {
  const {
    backedUpFormData,
    loginResult,
    shouldBackupState,
    submitState,
    // Actions
    backupFormState,
    loginRequest,
  } = props;
  const { formatMessage } = useIntl();
  const queryParams = useMemo(() => getAllPossibleQueryParams(), []);

  const [formFields, setFormFields] = useState({ ...backedUpFormData.formFields });
  const [errors, setErrors] = useState({ ...backedUpFormData.errors });
  const [loginError, setLoginError] = useState({ errorCode: '' });

  useEffect(() => {
    sendPageEvent('login_and_registration', 'login');
  }, []);

  /**
   * Backup the login form in redux when login page is toggled.
   */
  useEffect(() => {
    if (shouldBackupState) {
      backupFormState({
        formFields: { ...formFields },
        errors: { ...errors },
      });
    }
  }, [shouldBackupState, formFields, errors, backupFormState]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = { ...formFields };

    const validationErrors = validateFormFields(formData);
    if (validationErrors.emailOrUsername || validationErrors.password) {
      setErrors({ ...validationErrors });
      setLoginError({ errorCode: INVALID_FORM });
      return;
    }

    // add query params to the payload
    const payload = { email_or_username: formData.emailOrUsername, password: formData.password, ...queryParams };
    loginRequest(payload);
  };

  const handleOnChange = (event) => {
    const { name, value } = event.target;
    setFormFields(prevState => ({ ...prevState, [name]: value }));
  };

  const handleOnFocus = (event) => {
    const { name } = event.target;
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  const validateFormFields = (payload) => {
    const { emailOrUsername, password } = payload;
    const fieldErrors = { ...errors };

    if (emailOrUsername === '') {
      fieldErrors.emailOrUsername = formatMessage(messages['email.validation.message']);
    } else if (emailOrUsername < 3) {
      fieldErrors.emailOrUsername = formatMessage(messages['username.or.email.format.validation.less.chars.message']);
    }
    if (password === '') {
      fieldErrors.password = formatMessage(messages['password.validation.message']);
    }

    return { ...fieldErrors };
  }

  const handleForgotPasswordLinkClick = () => {
    sendTrackEvent('edx.bi.password-reset_form.toggled', { category: 'user-engagement' });
  };

  return (
    <>
      <Helmet>
        <title>{formatMessage(messages['login.page.title'], { siteName: getConfig().SITE_NAME })}</title>
      </Helmet>
      <RedirectLogistration
        success={loginResult.success}
        redirectUrl={loginResult.redirectUrl}
      />
      <div className="mw-xs mt-3">
        <LoginFailureMessage
          errorCode={loginError.errorCode}
        />
        <Form id="sign-in-form" name="sign-in-form">
          <FormGroup
            name="emailOrUsername"
            value={formFields.emailOrUsername}
            autoComplete="on"
            handleChange={handleOnChange}
            handleFocus={handleOnFocus}
            errorMessage={errors.emailOrUsername}
            floatingLabel={formatMessage(messages['login.user.identity.label'])}
          />
          <PasswordField
            name="password"
            value={formFields.password}
            autoComplete="off"
            showRequirements={false}
            handleChange={handleOnChange}
            handleFocus={handleOnFocus}
            errorMessage={errors.password}
            floatingLabel={formatMessage(messages['login.password.label'])}
          />
          <StatefulButton
            name="sign-in"
            id="sign-in"
            type="submit"
            variant="brand"
            className="login-button-width"
            state={submitState}
            labels={{
              default: formatMessage(messages['sign.in.button']),
              pending: '',
            }}
            onClick={handleSubmit}
            onMouseDown={(event) => event.preventDefault()}
          />
          <Link
            id="forgot-password"
            name="forgot-password"
            className="btn btn-link font-weight-500 text-body"
            to={updatePathWithQueryParams(RESET_PAGE)}
            onClick={handleForgotPasswordLinkClick}
          >
            {formatMessage(messages['forgot.password'])}
          </Link>
        </Form>
      </div>
    </>
  );
}

const mapStateToProps = state => {
  const loginPageState = state.login;
  return {
    backedUpFormData: loginPageState.loginFormData,
    loginResult: loginPageState.loginResult,
    shouldBackupState: loginPageState.shouldBackupState,
    submitState: loginPageState.submitState,
  };
};

LoginPage.propTypes = {
  loginResult: PropTypes.shape({
    redirectUrl: PropTypes.string,
    success: PropTypes.bool,
  }),
  submitState: PropTypes.string,
  // Actions
  backupFormState: PropTypes.func.isRequired,
  loginRequest: PropTypes.func.isRequired,
};

LoginPage.defaultProps = {
  loginRequest: null,
  submitState: DEFAULT_STATE,
};

export default connect(
  mapStateToProps,
  {
    backupFormState: backupLoginFormBegin,
    loginRequest,
  },
)(injectIntl(LoginPage));
