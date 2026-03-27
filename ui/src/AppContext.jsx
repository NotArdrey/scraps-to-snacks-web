import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [pantryItems, setPantryItems] = useState(() => {
    const saved = localStorage.getItem('pantryItems');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, name: 'Eggs', quantity: 12, unit: 'pcs', expires: '2026-03-30', status: 'available' },
      { id: 2, name: 'Milk', quantity: 1, unit: 'gallon', expires: '2026-03-25', status: 'available' },
      { id: 3, name: 'Spinach', quantity: 200, unit: 'g', expires: '2026-03-23', status: 'warning' }
    ];
  });

  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem('recipes');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, title: 'Leftover Veggie Stir-Fry', rating: 4, date: '2026-03-20', ingredients: [], instructions: [], nutrition: {cals: 250, protein: 10} },
      { id: 2, title: 'Quick Chicken Salad', rating: 5, date: '2026-03-18', ingredients: [], instructions: [], nutrition: {cals: 320, protein: 25} }
    ];
  });

  const [dietOption, setDietOption] = useState(() => {
    const saved = localStorage.getItem('dietOption');
    return saved || 'None';
  });

  const [isSubscribed, setIsSubscribed] = useState(() => {
    const saved = localStorage.getItem('isSubscribed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pantryItems', JSON.stringify(pantryItems));
  }, [pantryItems]);

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('dietOption', dietOption);
  }, [dietOption]);

  useEffect(() => {
    localStorage.setItem('isSubscribed', isSubscribed);
  }, [isSubscribed]);

  return (
    <AppContext.Provider value={{ pantryItems, setPantryItems, recipes, setRecipes, dietOption, setDietOption, isSubscribed, setIsSubscribed }}>
      {children}
    </AppContext.Provider>
  );
};
