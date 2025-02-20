import { useCallback, useContext, useEffect } from "preact/compat";

import { User } from "@teamhanko/hanko-frontend-sdk";

import { AppContext } from "../contexts/AppProvider";

import ErrorPage from "./ErrorPage";
import ProfilePage from "./ProfilePage";
import LoginEmailPage from "./LoginEmailPage";
import LoginFinishedPage from "./LoginFinishedPage";
import RegisterPasskeyPage from "./RegisterPasskeyPage";

import LoadingSpinner from "../components/icons/LoadingSpinner";

const InitPage = () => {
  const {
    hanko,
    componentName,
    setConfig,
    setUser,
    setEmails,
    setWebauthnCredentials,
    setPage,
  } = useContext(AppContext);

  const afterLogin = useCallback(
    (_user: User) =>
      hanko.webauthn
        .shouldRegister(_user)
        .then((shouldRegister) =>
          shouldRegister ? <RegisterPasskeyPage /> : <LoginFinishedPage />
        ),
    [hanko]
  );

  const initHankoAuth = useCallback(() => {
    const thirdPartyError = hanko.thirdParty.getError();
    if (thirdPartyError) {
      window.history.replaceState(null, null, window.location.pathname);
      return new Promise((resolve) =>
        resolve(<ErrorPage initialError={thirdPartyError} />)
      );
    }

    return hanko.token
      .validate()
      .then(() => {
        let _user: User;
        return Promise.allSettled([
          hanko.config.get().then(setConfig),
          hanko.user.getCurrent().then((resp) => setUser((_user = resp))),
        ]).then(([configResult, userResult]) => {
          if (configResult.status === "rejected") {
            return <ErrorPage initialError={configResult.reason} />;
          }
          if (userResult.status === "fulfilled") {
            return afterLogin(_user);
          }
          return <LoginEmailPage />;
        });
      })
      .catch((validateError) => <ErrorPage initialError={validateError} />);
  }, [afterLogin, hanko, setConfig, setUser]);

  const initHankoProfile = useCallback(
    () =>
      Promise.all([
        hanko.config.get().then(setConfig),
        hanko.user.getCurrent().then(setUser),
        hanko.email.list().then(setEmails),
        hanko.webauthn.listCredentials().then(setWebauthnCredentials),
      ]).then(() => <ProfilePage />),
    [hanko, setConfig, setEmails, setUser, setWebauthnCredentials]
  );

  const getInitializer = useCallback(() => {
    switch (componentName) {
      case "auth":
        return initHankoAuth;
      case "profile":
        return initHankoProfile;
      default:
        return;
    }
  }, [componentName, initHankoAuth, initHankoProfile]);

  useEffect(() => {
    if (!hanko) return;
    const initializer = getInitializer();
    if (initializer) {
      initializer()
        .then(setPage)
        .catch((e) => setPage(<ErrorPage initialError={e} />));
    }
  }, [hanko, getInitializer, setPage]);

  return <LoadingSpinner isLoading />;
};

export default InitPage;
