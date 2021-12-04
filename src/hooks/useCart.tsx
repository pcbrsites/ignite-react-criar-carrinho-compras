import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";

import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const { data: stockInfo } = await api.get<Stock>(`/stock/${productId}`);
      const cartProduct = cart.find((product) => product.id === productId);

      if (!cartProduct) {
        const { data: productInfo } = await api.get<Product>(
          `/products/${productId}`
        );
        if (!productInfo) {
          return null;
        }
        productInfo.amount = 1;
        setCart([...cart, productInfo]);
        return;
      }

      if (cartProduct.amount >= stockInfo.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      setCart(
        cart.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
        )
      );
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((product) => product.id === productId)) {
        toast.error("Erro na remoção do produto");
        return;
      }
      setCart(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }
      const cartProduct = cart.find((product) => product.id === productId);
      if (cartProduct) {
        const { data: stockInfo } = await api.get<Stock>(`/stock/${productId}`);

        if (amount > stockInfo.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        setCart(
          cart.map((product) =>
            product.id === productId ? { ...product, amount: amount } : product
          )
        );
      } else {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
