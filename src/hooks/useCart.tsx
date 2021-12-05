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

  const addProduct = async (productId: number) => {
    try {
      const { amount: stockAmount } = await api
        .get<Stock>(`/stock/${productId}`)
        .then((res) => res.data);

      const newCart = [...cart];
      let cartProduct = newCart.find((product) => product.id === productId);
      const currentAmount = cartProduct ? cartProduct.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!cartProduct) {
        const product = await api
          .get(`/products/${productId}`)
          .then((res) => res.data);

        const newProduct: Product = {
          ...product,
          amount: 1,
        };

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...newCart, newProduct])
        );
        setCart([...newCart, newProduct]);
        return;
      } else {
        updateProductAmount({ productId, amount });
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCard = [...cart];
      if (!newCard.find((product) => product.id === productId)) {
        toast.error("Erro na remoção do produto");
        return;
      }
      setCart(newCard.filter((product) => product.id !== productId));
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(newCard.filter((product) => product.id !== productId))
      );
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
      const newCart = [...cart];
      const cartProduct = newCart.find((product) => product.id === productId);
      if (cartProduct) {
        const { data: stockInfo } = await api.get<Stock>(`/stock/${productId}`);

        if (amount > stockInfo.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        setCart(
          newCart.map((product) =>
            product.id === productId ? { ...product, amount: amount } : product
          )
        );
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(
            newCart.map((product) =>
              product.id === productId
                ? { ...product, amount: amount }
                : product
            )
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
