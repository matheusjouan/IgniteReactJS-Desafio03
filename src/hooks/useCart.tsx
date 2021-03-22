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
      const findProduct = cart.find(product => product.id === productId);

      if (!findProduct) {
        const response = await api.get(`/products/${productId}`);
        const newProduct = {
          ...response.data,
          amount: 1
        }

        const updatedCart = [...cart, newProduct];
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

        setCart(updatedCart);

      } else {
        const response = await api.get(`stock/${productId}`);
        const availableStock = response.data;

        if (findProduct.amount >= availableStock.amount) {
          throw new Error('not stock');
        }

        const updatedCart = cart.map(product => product.id === productId ?
          { ...product, amount: product.amount + 1 }
          : product
        );

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart);
      }

    } catch (err) {
      if (err.message === 'not stock') {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        toast.error('Erro na adição do produto');
      }

    }
  };

  const removeProduct = (productId: number) => {
    try {

      const product = cart.find(product => product.id === productId)

      if (!product) throw new Error('Erro na remoção do produto');

      const updatedCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      setCart(updatedCart);


    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      const findProduct = cart.find(product => product.id === productId);

      if (!findProduct) {
        throw new Error('Erro na alteração de quantidade do produto')
      }

      if (amount <= 0) {
        return;
      }

      const response = await api.get<Stock>(`stock/${productId}`);
      const availableStock = response.data.amount;

      if (amount > availableStock) {
        throw new Error('Quantidade solicitada fora de estoque');
      }



      const updatedCart = cart.map(product => product.id === productId ?
        { ...product, amount: amount } : product
      )

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      setCart(updatedCart);


    } catch (err) {
      toast.error(err.message);
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
