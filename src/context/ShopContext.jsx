import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';

const ShopContext = createContext();

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }) => {
  const { user } = useAuth();
  const [shopSettings, setShopSettings] = useState({
    shopName: 'TuNegocio',
    shopSlogan: 'Gestiona. Vende. Crece.',
    currency: 'L',
    taxRate: 15
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'settings', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setShopSettings(docSnap.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const value = {
    shopSettings,
    loading
  };

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
};
