import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

export interface OptimisticCartLine {
  id: string;
  isOptimistic?: boolean;
  quantity: number;
  cost?: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  merchandise: {
    id: string;
    title: string;
    product: {
      title: string;
      handle: string;
    };
    image?: {
      url: string;
      altText?: string;
    };
    selectedOptions: Array<{name: string; value: string}>;
  };
}

interface CartState {
  serverCart: any | null;
  optimisticLines: OptimisticCartLine[];
}

const initialState: CartState = {
  serverCart: null,
  optimisticLines: [],
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setServerCart: (state, action: PayloadAction<any>) => {
      state.serverCart = action.payload;
      // Reconcile optimistic items once Shopify server responds
      state.optimisticLines = [];
    },
    addOptimisticItem: (state, action: PayloadAction<OptimisticCartLine>) => {
      const existing = state.optimisticLines.find(
        (line) => line.merchandise.id === action.payload.merchandise.id,
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.optimisticLines.push(action.payload);
      }
    },
    clearOptimisticItems: (state) => {
      state.optimisticLines = [];
    },
  },
});

export const {setServerCart, addOptimisticItem, clearOptimisticItems} =
  cartSlice.actions;
export default cartSlice.reducer;
