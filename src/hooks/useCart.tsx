import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const upadatedCart = [...cart];
      const productExists = upadatedCart.find(product => product.id === productId);
      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      if (productExists) {
        productExists.amount = amount;
      } else {
        const response = await api.get<Product>(`/products/${productId}`);
        const product = response.data;

        upadatedCart.push({ ...product, amount: 1 });
      }
      
      setCart(upadatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(upadatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const upadatedCart = [...cart];
      const  productIndex = upadatedCart.findIndex(product => product.id === productId);
      if(productIndex >= 0) {
        upadatedCart.splice(productIndex, 1);
        setCart(upadatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(upadatedCart));
      }else{
        throw Error('Produto não encontrado');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount<=0){
        return;
      }
      const upadatedCart = [...cart];
      const product = upadatedCart.find(product => product.id === productId);
    
      if (product) {
        const stock = await api.get<Stock>(`/stock/${productId}`);
        const stockAmount = stock.data.amount;
        if (amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        product.amount = amount;
        setCart(upadatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(upadatedCart));
      }else{
        throw Error('Produto não encontrado');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
