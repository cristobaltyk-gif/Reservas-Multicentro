import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  function login(data) {
    setSession(data);
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, isAuth: !!session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
