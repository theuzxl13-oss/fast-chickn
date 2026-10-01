import { getDefaultAddress, getSession } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { ShopHeader } from "@/components/layout/shop-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartBar } from "@/components/cart/cart-bar";
import { ShopFooter } from "@/components/layout/shop-footer";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [{ user, profile }, defaultAddress] = await Promise.all([getSession(), getDefaultAddress()]);

  const sessionUser =
    user && profile ? { id: user.id, name: profile.full_name, email: profile.email, role: profile.role } : null;

  return (
    <SessionProvider value={{ user: sessionUser, defaultAddress }}>
      <CartProvider>
        <ShopHeader />
        <main className="mx-auto min-h-[70dvh] w-full max-w-6xl px-4 pb-32 pt-4 md:px-6 md:pb-16">{children}</main>
        <ShopFooter />
        <CartBar />
        <BottomNav />
      </CartProvider>
    </SessionProvider>
  );
}
