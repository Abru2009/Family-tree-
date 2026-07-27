import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getActiveSession,
  registerUserAccount,
  loginUserAccount,
  logoutUserAccount,
} from './utils/cryptoAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => getActiveSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // If no user is logged in, show auth modal by default so user can sign in or sign up
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }
  }, []);

  const signUp = async (name, email, password) => {
    const session = await registerUserAccount({ name, email, password });
    setCurrentUser(session);
    setIsAuthModalOpen(false);
    return session;
  };

  const signIn = async (email, password) => {
    const session = await loginUserAccount({ email, password });
    setCurrentUser(session);
    setIsAuthModalOpen(false);
    return session;
  };

  const signOut = () => {
    logoutUserAccount();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
