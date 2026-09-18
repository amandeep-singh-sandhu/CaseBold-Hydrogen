import {configureStore} from '@reduxjs/toolkit';
import {type TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';
import drawerReducer from './drawerSlice';
import cartReducer from './cartSlice';

export const store = configureStore({
  reducer: {
    drawer: drawerReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Prevents warnings for Hydrogen Storefront API objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
