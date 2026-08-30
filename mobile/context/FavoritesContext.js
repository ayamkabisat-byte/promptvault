import { createContext, useContext, useMemo, useState } from 'react';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState([]);

  const toggle = (item, kind) => {
    const key = `${kind}:${item.id}`;
    setItems((current) => current.some((entry) => entry.key === key)
      ? current.filter((entry) => entry.key !== key)
      : [...current, { key, kind, item }]);
  };

  const has = (id, kind) => items.some((entry) => entry.key === `${kind}:${id}`);

  const value = useMemo(() => ({ items, toggle, has }), [items]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
