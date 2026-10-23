import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  DEMO_PROFILES,
  DemoUserProfile,
  ensureStorageMigration,
  getActiveDemoUser,
  setActiveDemoRole,
  subscribeDemoUser,
} from '../services/api';

interface AuthContextValue {
  user: DemoUserProfile;
  isLoading: boolean;
  switchRole: (role: 'ESTUDIANTE' | 'ARRENDADOR') => DemoUserProfile;
}

const AuthContext = createContext<AuthContextValue>({
  user: DEMO_PROFILES.ESTUDIANTE,
  isLoading: false,
  switchRole: (role) => setActiveDemoRole(role),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<DemoUserProfile>(() => getActiveDemoUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      ensureStorageMigration();
      const hydrated = getActiveDemoUser() ?? DEMO_PROFILES.ESTUDIANTE;
      setUser(hydrated);
    } finally {
      setIsLoading(false);
    }

    const unsubscribe = subscribeDemoUser((updatedProfile) => {
      setUser(updatedProfile ?? DEMO_PROFILES.ESTUDIANTE);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const switchRole = (role: 'ESTUDIANTE' | 'ARRENDADOR'): DemoUserProfile => {
    const next = setActiveDemoRole(role);
    setUser(next);
    return next;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export default AuthContext;
