import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NavBarContext = createContext({
  compact: false,
  setCompact: () => {},
  expand: () => {},
});

export function NavBarProvider({ children }) {
  const [compact, setCompactState] = useState(false);
  const setCompact = useCallback((value) => setCompactState(Boolean(value)), []);
  const expand = useCallback(() => setCompactState(false), []);
  const value = useMemo(() => ({ compact, setCompact, expand }), [compact, setCompact, expand]);
  return <NavBarContext.Provider value={value}>{children}</NavBarContext.Provider>;
}

export function useNavBar() {
  return useContext(NavBarContext);
}
