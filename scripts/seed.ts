/**
 * FAST CHICKN — Seed de demonstração
 *
 * Cria usuários (admin, 8 parceiros, 5 clientes), 10 categorias, 8 restaurantes,
 * 48 produtos com adicionais, cupons, banners, pedidos em diferentes status e
 * avaliações. Todas as marcas e pessoas são FICTÍCIAS.
 *
 * Uso:  npm run db:seed
 * Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e
 * SEED_DEMO_PASSWORD (senha aplicada a todas as contas de demonstração).
 *
 * ATENÇÃO: usa a service role key — rode apenas localmente, nunca no navegador.
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_DEMO_PASSWORD;

if (!URL || !SERVICE_KEY) {
  console.error("✖ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}
if (!PASSWORD || PASSWORD.length < 8) {
  console.error("✖ Defina SEED_DEMO_PASSWORD (mínimo 8 caracteres) em .env.local");
  process.exit(1);
}

const db: SupabaseClient = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function must<T>(result: { data: T; error: { message: string } | null }, ctx: string): NonNullable<T> {
  if (result.error || result.data == null) throw new Error(`${ctx}: ${result.error?.message ?? "sem dados"}`);
  return result.data as NonNullable<T>;
}

async function ensureUser(email: string, fullName: string, accountType: "client" | "restaurant", phone: string) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD!,
    email_confirm: true,
    user_metadata: { full_name: fullName, account_type: accountType, phone },
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

const daysAgo = (d: number, hour = 19, minute = 30) => {
  const date = new Date(Date.now() - d * 86_400_000);
  date.setUTCHours(hour + 3, minute, 0, 0); // horário de Brasília
  return date.toISOString();
};

const ALL_DAYS_LATE = Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, { open: "08:00", close: "04:00" }]));

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { name: "Hambúrguer", slug: "hamburguer", icon: "🍔" },
  { name: "Pizza", slug: "pizza", icon: "🍕" },
  { name: "Frango", slug: "frango", icon: "🍗" },
  { name: "Japonês", slug: "japones", icon: "🍣" },
  { name: "Saudável", slug: "saudavel", icon: "🥗" },
  { name: "Doces", slug: "doces", icon: "🍰" },
  { name: "Sorvetes", slug: "sorvetes", icon: "🍦" },
  { name: "Bebidas", slug: "bebidas", icon: "🥤" },
  { name: "Massas", slug: "massas", icon: "🍝" },
  { name: "Café", slug: "cafe", icon: "☕" },
];

type OptionPreset = "burgerSize" | "addons" | "sauces" | "pizzaSize" | "crust" | "drinkSize" | "bowlProtein" | "iceCream";
const OPTIONS: Record<OptionPreset, { name: string; min: number; max: number; items: [string, number][] }> = {
  burgerSize: { name: "Tamanho", min: 1, max: 1, items: [["Simples", 0], ["Duplo", 8]] },
  addons: { name: "Adicionais", min: 0, max: 5, items: [["Bacon", 4], ["Queijo", 3], ["Frango", 6], ["Ovo", 2.5], ["Cebola crispy", 3]] },
  sauces: { name: "Molhos", min: 0, max: 2, items: [["Molho especial", 2], ["Barbecue", 2], ["Maionese verde", 2], ["Mostarda e mel", 2]] },
  pizzaSize: { name: "Tamanho", min: 1, max: 1, items: [["Média (6 fatias)", 0], ["Grande (8 fatias)", 12], ["Gigante (12 fatias)", 22]] },
  crust: { name: "Borda", min: 0, max: 1, items: [["Catupiry", 8], ["Cheddar", 8], ["Chocolate", 10]] },
  drinkSize: { name: "Tamanho", min: 1, max: 1, items: [["Lata 350ml", 0], ["Garrafa 600ml", 3]] },
  bowlProtein: { name: "Proteína", min: 1, max: 1, items: [["Frango grelhado", 0], ["Salmão", 9], ["Tofu", 0]] },
  iceCream: { name: "Coberturas", min: 0, max: 3, items: [["Calda de chocolate", 2], ["Granulado", 1.5], ["Paçoca", 2], ["Chantilly", 2]] },
};

interface SeedProduct {
  cat: string;
  name: string;
  desc: string;
  price: number;
  promo?: number;
  ingredients?: string[];
  options?: OptionPreset[];
  featured?: boolean;
}
interface SeedRestaurant {
  slug: string;
  name: string;
  category: string;
  tags: string[];
  color: string;
  description: string;
  fee: number;
  min: number;
  time: [number, number];
  promo?: string;
  featured?: boolean;
  hours?: Record<string, { open: string; close: string } | null>;
  coords: [number, number];
  neighborhood: string;
  menu: { name: string; icon: string }[];
  products: SeedProduct[];
}

const RESTAURANTS: SeedRestaurant[] = [
  {
    slug: "chicken-house",
    name: "Chicken House",
    category: "frango",
    tags: ["Lanches", "Porções"],
    color: "#E8361C",
    description: "Frango crocante, lanches caprichados e porções para dividir.",
    fee: 4.99,
    min: 20,
    time: [25, 35],
    promo: "Combo do dia 20% OFF",
    featured: true,
    coords: [-23.5489, -46.6388],
    neighborhood: "República",
    menu: [
      { name: "Lanches", icon: "🍔" },
      { name: "Frangos", icon: "🍗" },
      { name: "Porções", icon: "🍟" },
      { name: "Bebidas", icon: "🥤" },
      { name: "Sobremesas", icon: "🍰" },
    ],
    products: [
      { cat: "Lanches", name: "X-Frango Especial", desc: "Pão, frango, queijo, bacon, salada e molho especial.", price: 28.9, ingredients: ["cebola", "tomate", "alface", "maionese"], options: ["burgerSize", "addons", "sauces"], featured: true },
      { cat: "Lanches", name: "Chicken Crispy Burger", desc: "Filé de frango empanado, cheddar e picles.", price: 31.9, promo: 26.9, ingredients: ["picles", "cebola roxa"], options: ["addons", "sauces"] },
      { cat: "Frangos", name: "Balde de Frango (8 pedaços)", desc: "Coxas e sobrecoxas crocantes temperadas na casa.", price: 54.9, options: ["sauces"], featured: true },
      { cat: "Frangos", name: "Tirinhas de Frango", desc: "10 tirinhas empanadas com molho à escolha.", price: 32.9, options: ["sauces"] },
      { cat: "Porções", name: "Batata Rústica", desc: "Batatas com casca, alecrim e sal grosso.", price: 19.9, options: ["sauces"] },
      { cat: "Bebidas", name: "Refrigerante", desc: "Sabores variados.", price: 7, options: ["drinkSize"] },
      { cat: "Sobremesas", name: "Brownie com Sorvete", desc: "Brownie quentinho com bola de baunilha.", price: 16.9 },
    ],
  },
  {
    slug: "brasa-burger",
    name: "Brasa Burger",
    category: "hamburguer",
    tags: ["Artesanal"],
    color: "#3D3631",
    description: "Hambúrgueres artesanais grelhados na brasa.",
    fee: 0,
    min: 30,
    time: [30, 45],
    featured: true,
    coords: [-23.5614, -46.6559],
    neighborhood: "Bela Vista",
    menu: [
      { name: "Burgers", icon: "🍔" },
      { name: "Acompanhamentos", icon: "🍟" },
      { name: "Bebidas", icon: "🥤" },
    ],
    products: [
      { cat: "Burgers", name: "Brasa Clássico", desc: "Blend 160g, queijo prato, alface, tomate e maionese da casa.", price: 32, ingredients: ["alface", "tomate", "maionese"], options: ["burgerSize", "addons"], featured: true },
      { cat: "Burgers", name: "Smash Duplo", desc: "Dois smash 80g, cheddar duplo e cebola caramelizada.", price: 34.9, ingredients: ["cebola caramelizada"], options: ["addons", "sauces"] },
      { cat: "Burgers", name: "Bacon Lovers", desc: "Blend 160g, muito bacon, cheddar e barbecue.", price: 38.9, promo: 33.9, options: ["burgerSize", "addons"] },
      { cat: "Burgers", name: "Veggie Brasa", desc: "Burger de grão-de-bico, queijo coalho e rúcula.", price: 31.9, ingredients: ["rúcula"], options: ["addons"] },
      { cat: "Acompanhamentos", name: "Fritas com Cheddar e Bacon", desc: "Porção generosa para dividir.", price: 24.9 },
      { cat: "Acompanhamentos", name: "Onion Rings", desc: "Anéis de cebola empanados.", price: 21.9, options: ["sauces"] },
      { cat: "Bebidas", name: "Milkshake de Ovomaltine", desc: "500ml, cremoso.", price: 19.9 },
    ],
  },
  {
    slug: "forno-vivo",
    name: "Pizzaria Forno Vivo",
    category: "pizza",
    tags: ["Forno a lenha"],
    color: "#C22E0C",
    description: "Pizzas de massa longa fermentação assadas no forno a lenha.",
    fee: 6.9,
    min: 40,
    time: [40, 55],
    promo: "2ª pizza com 30% OFF",
    coords: [-23.5432, -46.6292],
    neighborhood: "Sé",
    menu: [
      { name: "Pizzas salgadas", icon: "🍕" },
      { name: "Pizzas doces", icon: "🍫" },
      { name: "Bebidas", icon: "🥤" },
    ],
    products: [
      { cat: "Pizzas salgadas", name: "Margherita", desc: "Molho de tomate, muçarela, tomate e manjericão.", price: 49.9, options: ["pizzaSize", "crust"], featured: true },
      { cat: "Pizzas salgadas", name: "Calabresa", desc: "Calabresa fatiada, cebola e azeitonas.", price: 47.9, ingredients: ["cebola", "azeitona"], options: ["pizzaSize", "crust"] },
      { cat: "Pizzas salgadas", name: "Frango com Catupiry", desc: "Frango desfiado temperado e catupiry.", price: 54.9, options: ["pizzaSize", "crust"] },
      { cat: "Pizzas salgadas", name: "Quatro Queijos", desc: "Muçarela, provolone, parmesão e gorgonzola.", price: 56.9, promo: 49.9, options: ["pizzaSize", "crust"] },
      { cat: "Pizzas doces", name: "Chocolate com Morango", desc: "Chocolate ao leite e morangos frescos.", price: 52.9, options: ["pizzaSize"] },
      { cat: "Bebidas", name: "Suco Natural de Laranja", desc: "500ml.", price: 11.9 },
    ],
  },
  {
    slug: "sushi-kaze",
    name: "Sushi Kaze",
    category: "japones",
    tags: ["Sushi", "Temaki"],
    color: "#17130F",
    description: "Culinária japonesa contemporânea. Fechado às segundas.",
    fee: 8.9,
    min: 50,
    time: [45, 60],
    hours: { "0": { open: "11:00", close: "23:30" }, "1": null, "2": { open: "11:00", close: "23:30" }, "3": { open: "11:00", close: "23:30" }, "4": { open: "11:00", close: "23:30" }, "5": { open: "11:00", close: "00:30" }, "6": { open: "11:00", close: "00:30" } },
    coords: [-23.5587, -46.6346],
    neighborhood: "Liberdade",
    menu: [
      { name: "Combinados", icon: "🍱" },
      { name: "Temakis", icon: "🍣" },
      { name: "Quentes", icon: "🔥" },
    ],
    products: [
      { cat: "Combinados", name: "Combinado Kaze (20 peças)", desc: "Sashimi, uramaki, hossomaki e niguiri.", price: 79.9, featured: true },
      { cat: "Combinados", name: "Combinado Salmão (16 peças)", desc: "Tudo de salmão.", price: 69.9, promo: 59.9 },
      { cat: "Temakis", name: "Temaki Salmão Completo", desc: "Salmão, cream cheese e cebolinha.", price: 32.9, ingredients: ["cebolinha", "cream cheese"] },
      { cat: "Temakis", name: "Temaki Hot Philadelphia", desc: "Empanado, salmão e cream cheese.", price: 34.9 },
      { cat: "Quentes", name: "Yakisoba de Frango", desc: "Macarrão, legumes e frango ao molho shoyu.", price: 42.9 },
      { cat: "Quentes", name: "Guioza (6 un.)", desc: "Pastel japonês de carne suína.", price: 26.9 },
    ],
  },
  {
    slug: "verde-bowl",
    name: "Verde Bowl",
    category: "saudavel",
    tags: ["Bowls", "Saladas"],
    color: "#2F855A",
    description: "Comida de verdade, leve e colorida.",
    fee: 0,
    min: 25,
    time: [20, 30],
    featured: true,
    coords: [-23.5651, -46.6515],
    neighborhood: "Paulista",
    menu: [
      { name: "Bowls", icon: "🥗" },
      { name: "Sucos", icon: "🧃" },
    ],
    products: [
      { cat: "Bowls", name: "Bowl Mediterrâneo", desc: "Quinoa, grão-de-bico, pepino, tomate e homus.", price: 36.9, ingredients: ["pepino", "tomate", "cebola roxa"], options: ["bowlProtein"], featured: true },
      { cat: "Bowls", name: "Poke de Salmão", desc: "Arroz japonês, salmão, manga, edamame e gergelim.", price: 44.9, ingredients: ["manga", "edamame"] },
      { cat: "Bowls", name: "Salada Caesar com Frango", desc: "Alface americana, frango grelhado, croutons e parmesão.", price: 32.9, ingredients: ["croutons"], options: ["bowlProtein"] },
      { cat: "Bowls", name: "Wrap Integral de Frango", desc: "Frango, cenoura, rúcula e molho de iogurte.", price: 27.9, promo: 23.9 },
      { cat: "Sucos", name: "Suco Verde Detox", desc: "Couve, maçã, gengibre e limão. 400ml.", price: 13.9 },
      { cat: "Sucos", name: "Kombucha de Hibisco", desc: "Garrafa 350ml.", price: 15.9 },
    ],
  },
  {
    slug: "doce-nuvem",
    name: "Doce Nuvem Confeitaria",
    category: "doces",
    tags: ["Bolos", "Café"],
    color: "#D53F8C",
    description: "Bolos, tortas e doces feitos todos os dias.",
    fee: 5.5,
    min: 20,
    time: [25, 40],
    coords: [-23.5521, -46.6602],
    neighborhood: "Higienópolis",
    menu: [
      { name: "Fatias", icon: "🍰" },
      { name: "Docinhos", icon: "🍫" },
      { name: "Cafés", icon: "☕" },
    ],
    products: [
      { cat: "Fatias", name: "Bolo de Cenoura com Chocolate", desc: "Fatia generosa com cobertura de brigadeiro.", price: 14.9, featured: true },
      { cat: "Fatias", name: "Torta de Limão", desc: "Massa amanteigada, creme de limão e merengue.", price: 16.9 },
      { cat: "Fatias", name: "Cheesecake de Frutas Vermelhas", desc: "Base crocante e calda caseira.", price: 18.9, promo: 15.9 },
      { cat: "Docinhos", name: "Caixa com 6 Brigadeiros", desc: "Tradicional, ninho e pistache.", price: 21.9 },
      { cat: "Cafés", name: "Cappuccino", desc: "Café espresso, leite vaporizado e canela.", price: 11.9 },
      { cat: "Cafés", name: "Café Coado", desc: "Grãos especiais, 250ml.", price: 8.9 },
    ],
  },
  {
    slug: "gelato-polar",
    name: "Gelato Polar",
    category: "sorvetes",
    tags: ["Gelato", "Açaí"],
    color: "#3182CE",
    description: "Gelatos artesanais e açaí na tigela.",
    fee: 3.99,
    min: 15,
    time: [20, 30],
    promo: "Frete R$ 3,99",
    hours: Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, { open: "10:00", close: "23:59" }])),
    coords: [-23.5468, -46.6451],
    neighborhood: "Consolação",
    menu: [
      { name: "Gelatos", icon: "🍦" },
      { name: "Açaí", icon: "🍇" },
    ],
    products: [
      { cat: "Gelatos", name: "Pote de Gelato 500ml", desc: "Escolha até 2 sabores no campo de observação.", price: 34.9, options: ["iceCream"], featured: true },
      { cat: "Gelatos", name: "Casquinha Dupla", desc: "Duas bolas na casquinha crocante.", price: 16.9, options: ["iceCream"] },
      { cat: "Açaí", name: "Açaí 500ml", desc: "Açaí puro batido com banana.", price: 24.9, options: ["iceCream"] },
      { cat: "Açaí", name: "Açaí 700ml Completo", desc: "Com granola, banana, leite em pó e mel.", price: 32.9, promo: 28.9 },
      { cat: "Gelatos", name: "Milkshake de Pistache", desc: "400ml.", price: 22.9 },
      { cat: "Gelatos", name: "Sundae de Caramelo", desc: "Baunilha, caramelo salgado e amendoim.", price: 18.9 },
    ],
  },
  {
    slug: "cantina-nonna-lina",
    name: "Cantina Nonna Lina",
    category: "massas",
    tags: ["Italiana"],
    color: "#B7791F",
    description: "Massas frescas e molhos de receita de família.",
    fee: 7.5,
    min: 35,
    time: [35, 50],
    coords: [-23.5598, -46.6421],
    neighborhood: "Bixiga",
    menu: [
      { name: "Massas", icon: "🍝" },
      { name: "Bebidas", icon: "🥤" },
      { name: "Sobremesas", icon: "🍮" },
    ],
    products: [
      { cat: "Massas", name: "Spaghetti à Bolonhesa", desc: "Massa fresca com ragu de carne cozido lentamente.", price: 42.9, featured: true },
      { cat: "Massas", name: "Fettuccine Alfredo", desc: "Molho cremoso de parmesão.", price: 44.9, options: ["addons"] },
      { cat: "Massas", name: "Lasanha da Nonna", desc: "Camadas de massa, bolonhesa, presunto e queijo.", price: 46.9, promo: 39.9 },
      { cat: "Massas", name: "Nhoque ao Sugo", desc: "Nhoque de batata com molho de tomate fresco.", price: 38.9 },
      { cat: "Bebidas", name: "Água com Gás", desc: "500ml.", price: 5.9 },
      { cat: "Sobremesas", name: "Tiramisù", desc: "Clássico italiano com café e mascarpone.", price: 19.9 },
    ],
  },
];

const CLIENTS = [
  { email: "ana@fastchickn.dev", name: "Ana Souza", phone: "11987650001", street: "Rua Augusta", number: "1200", neighborhood: "Consolação", cep: "01304001", coords: [-23.5555, -46.6577] },
  { email: "joao@fastchickn.dev", name: "João Pereira", phone: "11987650002", street: "Avenida Paulista", number: "900", neighborhood: "Bela Vista", cep: "01310100", coords: [-23.5645, -46.6522] },
  { email: "marina@fastchickn.dev", name: "Marina Lima", phone: "11987650003", street: "Rua da Consolação", number: "250", neighborhood: "Consolação", cep: "01302000", coords: [-23.5478, -46.6449] },
  { email: "carlos@fastchickn.dev", name: "Carlos Mendes", phone: "11987650004", street: "Rua Vergueiro", number: "1500", neighborhood: "Paraíso", cep: "04101000", coords: [-23.5759, -46.6403] },
  { email: "beatriz@fastchickn.dev", name: "Beatriz Rocha", phone: "11987650005", street: "Rua Frei Caneca", number: "560", neighborhood: "Consolação", cep: "01307001", coords: [-23.5531, -46.6526] },
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
/** Remove os dados de demonstração (mantém as contas de login, que são reaproveitadas). */
async function resetDemoData() {
  console.log("→ Limpando dados de demonstração anteriores");
  const all = (table: string, col = "id") => db.from(table).delete().not(col, "is", null);
  for (const table of ["orders", "coupons", "banners", "carts", "favorites", "notifications"]) {
    const { error } = await all(table, table === "favorites" ? "user_id" : "id");
    if (error) throw new Error(`limpar ${table}: ${error.message}`);
  }
  for (const table of ["restaurants", "categories"]) {
    const { error } = await all(table);
    if (error) throw new Error(`limpar ${table}: ${error.message}`);
  }
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const demoIds = (list?.users ?? []).filter((u) => u.email?.endsWith("@fastchickn.dev")).map((u) => u.id);
  if (demoIds.length) await db.from("addresses").delete().in("user_id", demoIds);
}

async function main() {
  if (process.argv.includes("--reset")) await resetDemoData();

  const { count } = await db.from("restaurants").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log("ℹ O banco já possui restaurantes — seed ignorado. Para recriar os dados de demonstração: npm run db:seed -- --reset");
    return;
  }

  console.log("→ Usuários");
  const adminId = await ensureUser("admin@fastchickn.dev", "Admin FAST CHICKN", "client", "11900000000");
  must(await db.from("profiles").update({ role: "admin" }).eq("id", adminId).select("id"), "promover admin");

  const clientIds: string[] = [];
  for (const c of CLIENTS) {
    const id = await ensureUser(c.email, c.name, "client", c.phone);
    clientIds.push(id);
    must(
      await db.from("addresses").insert({
        user_id: id, label: "home", cep: c.cep, street: c.street, number: c.number, neighborhood: c.neighborhood,
        city: "São Paulo", state: "SP", latitude: c.coords[0], longitude: c.coords[1], is_default: true,
      }).select("id"),
      `endereço ${c.email}`,
    );
  }

  console.log("→ Categorias");
  const cats = must(
    await db.from("categories").insert(CATEGORIES.map((c, i) => ({ ...c, sort_order: i }))).select("id, slug"),
    "categorias",
  );
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  console.log("→ Restaurantes, cardápios e adicionais");
  const restaurantIds = new Map<string, string>();
  const productsByRestaurant = new Map<string, { id: string; name: string; price: number }[]>();
  let productCount = 0;

  for (const [i, r] of RESTAURANTS.entries()) {
    const ownerId = await ensureUser(`parceiro${i + 1}@fastchickn.dev`, `Responsável ${r.name}`, "restaurant", `1133330${String(i + 1).padStart(3, "0")}`);
    const restaurant = must(
      await db.from("restaurants").insert({
        slug: r.slug, name: r.name, description: r.description, brand_color: r.color,
        category_id: catId.get(r.category), tags: r.tags, phone: `1133330${String(i + 1).padStart(3, "0")}`,
        document: `1234567800010${i}`, cep: "01000000", street: "Rua Demonstração", number: String(100 + i),
        neighborhood: r.neighborhood, city: "São Paulo", state: "SP", latitude: r.coords[0], longitude: r.coords[1],
        delivery_fee: r.fee, min_order: r.min, delivery_time_min: r.time[0], delivery_time_max: r.time[1],
        opening_hours: r.hours ?? ALL_DAYS_LATE, promo_label: r.promo ?? null, is_featured: !!r.featured,
        status: "active", created_at: daysAgo(60 - i * 7),
      }).select("id").single(),
      `restaurante ${r.name}`,
    );
    restaurantIds.set(r.slug, restaurant.id);
    must(await db.from("restaurant_users").insert({ restaurant_id: restaurant.id, user_id: ownerId, member_role: "owner" }).select("user_id"), "vínculo");

    const menuCats = must(
      await db.from("menu_categories").insert(r.menu.map((m, j) => ({ restaurant_id: restaurant.id, name: m.name, icon: m.icon, sort_order: j }))).select("id, name"),
      "menu",
    );
    const menuId = new Map(menuCats.map((m) => [m.name, m.id]));

    const list: { id: string; name: string; price: number }[] = [];
    for (const [j, p] of r.products.entries()) {
      const product = must(
        await db.from("products").insert({
          restaurant_id: restaurant.id, menu_category_id: menuId.get(p.cat), name: p.name, description: p.desc,
          price: p.price, promo_price: p.promo ?? null, ingredients: p.ingredients ?? [], is_featured: !!p.featured, sort_order: j,
        }).select("id").single(),
        `produto ${p.name}`,
      );
      productCount++;
      list.push({ id: product.id, name: p.name, price: p.promo ?? p.price });
      for (const [k, preset] of (p.options ?? []).entries()) {
        const o = OPTIONS[preset];
        const group = must(
          await db.from("product_options").insert({ product_id: product.id, name: o.name, min_select: o.min, max_select: o.max, sort_order: k }).select("id").single(),
          "grupo",
        );
        must(
          await db.from("product_option_items").insert(o.items.map(([name, price], n) => ({ option_id: group.id, name, price, sort_order: n }))).select("id"),
          "itens",
        );
      }
    }
    productsByRestaurant.set(restaurant.id, list);
  }

  console.log("→ Cupons e banners");
  const chickenId = restaurantIds.get("chicken-house")!;
  const coupons = must(
    await db.from("coupons").insert([
      { code: "FAST10", description: "10% OFF em qualquer restaurante (até R$ 15)", discount_type: "percent", discount_value: 10, max_discount: 15, min_order_value: 30, usage_per_user: 3, created_by: adminId },
      { code: "BEMVINDO", description: "R$ 15 OFF no primeiro pedido", discount_type: "fixed", discount_value: 15, min_order_value: 40, usage_per_user: 1, usage_limit: 1000, created_by: adminId },
      { code: "PIZZA20", description: "20% OFF em pizzarias participantes", discount_type: "percent", discount_value: 20, max_discount: 25, min_order_value: 50, usage_per_user: 2, created_by: adminId },
      { code: "CHICKEN5", description: "R$ 5 OFF na Chicken House", discount_type: "fixed", discount_value: 5, min_order_value: 25, usage_per_user: 5, owner_restaurant_id: chickenId },
      { code: "VERAO2026", description: "Cupom expirado (exemplo)", discount_type: "percent", discount_value: 15, min_order_value: 0, starts_at: daysAgo(90), ends_at: daysAgo(30), created_by: adminId },
    ].map((c) => ({
      // Inserção em lote: o PostgREST grava NULL nas colunas ausentes de qualquer
      // linha, então todas as linhas precisam ter as mesmas chaves.
      starts_at: daysAgo(30),
      ends_at: null,
      max_discount: null,
      usage_limit: null,
      usage_per_user: 1,
      owner_restaurant_id: null,
      created_by: null,
      ...c,
    }))).select("id, code"),
    "cupons",
  );
  const pizzaCoupon = coupons.find((c) => c.code === "PIZZA20")!;
  must(await db.from("coupon_restaurants").insert({ coupon_id: pizzaCoupon.id, restaurant_id: restaurantIds.get("forno-vivo") }).select("coupon_id"), "participantes");

  must(
    await db.from("banners").insert([
      { title: "Frete grátis hoje", subtitle: "Em dezenas de restaurantes selecionados", bg_color: "#FF5A1F", emoji: "🛵", link_url: "/busca?gratis=1", sort_order: 0 },
      { title: "Até 30% OFF", subtitle: "Promoções que valem o pedido", bg_color: "#17130F", emoji: "🔥", link_url: "/busca?promo=1", sort_order: 1 },
      { title: "Os melhores perto de você", subtitle: "Use o cupom FAST10 e economize", bg_color: "#DD7A02", emoji: "🍗", link_url: "/busca?ordem=rating", sort_order: 2 },
    ]).select("id"),
    "banners",
  );

  console.log("→ Pedidos e avaliações");
  const FLOW = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"] as const;
  const plan: { client: number; slug: string; status: (typeof FLOW)[number] | "cancelled" | "rejected"; day: number; hour: number; method: string }[] = [];
  const slugs = RESTAURANTS.map((r) => r.slug);
  const methods = ["pix", "credit_card", "debit_card", "cash", "pix", "on_delivery"];
  for (let n = 0; n < 42; n++) {
    plan.push({ client: n % 5, slug: slugs[(n * 3) % slugs.length], status: "delivered", day: 1 + (n % 14), hour: 11 + ((n * 5) % 12), method: methods[n % methods.length] });
  }
  plan.push(
    { client: 0, slug: "chicken-house", status: "pending", day: 0, hour: 0, method: "pix" },
    { client: 1, slug: "chicken-house", status: "confirmed", day: 0, hour: 0, method: "cash" },
    { client: 2, slug: "brasa-burger", status: "preparing", day: 0, hour: 0, method: "credit_card" },
    { client: 3, slug: "verde-bowl", status: "ready", day: 0, hour: 0, method: "debit_card" },
    { client: 4, slug: "forno-vivo", status: "out_for_delivery", day: 0, hour: 0, method: "pix" },
    { client: 1, slug: "sushi-kaze", status: "cancelled", day: 3, hour: 20, method: "credit_card" },
    { client: 2, slug: "gelato-polar", status: "rejected", day: 5, hour: 15, method: "cash" },
  );

  const comments = ["Chegou quentinho e muito rápido!", "Muito saboroso, recomendo.", "Embalagem caprichada.", "Entregador super educado.", "Bom, mas poderia vir mais molho.", null];
  let orderCount = 0;
  for (const [n, p] of plan.entries()) {
    const client = CLIENTS[p.client];
    const userId = clientIds[p.client];
    const restaurantId = restaurantIds.get(p.slug)!;
    const r = RESTAURANTS.find((x) => x.slug === p.slug)!;
    const products = productsByRestaurant.get(restaurantId)!;
    const picks = [products[n % products.length], products[(n + 2) % products.length]];
    const items = picks.map((prod, k) => ({ prod, qty: 1 + ((n + k) % 2) }));
    const subtotal = items.reduce((s, i) => s + i.prod.price * i.qty, 0);
    const total = Math.round((subtotal + r.fee) * 100) / 100;
    const createdAt = p.day === 0 ? new Date(Date.now() - (n % 5) * 6 * 60_000).toISOString() : daysAgo(p.day, p.hour, (n * 7) % 60);

    const order = must(
      await db.from("orders").insert({
        user_id: userId, restaurant_id: restaurantId, status: "pending", customer_name: client.name, customer_phone: client.phone,
        delivery_address: { label: "home", cep: client.cep, street: client.street, number: client.number, complement: null, neighborhood: client.neighborhood, city: "São Paulo", state: "SP", reference: null },
        subtotal, delivery_fee: r.fee, discount: 0, total, payment_method: p.method,
        change_for: p.method === "cash" ? Math.ceil(total / 50) * 50 : null,
        estimated_min: r.time[0], estimated_max: r.time[1], created_at: createdAt,
      }).select("id").single(),
      "pedido",
    );
    orderCount++;

    must(
      await db.from("order_items").insert(items.map(({ prod, qty }) => ({
        order_id: order.id, product_id: prod.id, product_name: prod.name, quantity: qty,
        unit_price: prod.price, total_price: Math.round(prod.price * qty * 100) / 100, options: [],
      }))).select("id"),
      "itens do pedido",
    );

    const paid = p.status === "delivered" || (p.method === "pix" && !["pending", "cancelled", "rejected"].includes(p.status));
    must(
      await db.from("payments").insert({
        order_id: order.id, method: p.method, amount: total, provider: p.method === "pix" ? "demo" : "offline",
        status: p.status === "cancelled" || p.status === "rejected" ? "cancelled" : paid ? "paid" : "pending",
        paid_at: paid ? createdAt : null,
      }).select("id"),
      "pagamento",
    );

    // Avança o status passo a passo para gerar histórico e notificações
    const target = p.status;
    if (target === "cancelled" || target === "rejected") {
      await db.from("orders").update({ status: target, cancelled_at: createdAt, cancel_reason: target === "rejected" ? "Item em falta" : "Cancelado pelo cliente" }).eq("id", order.id);
    } else {
      for (const step of FLOW.slice(1, FLOW.indexOf(target) + 1)) {
        const patch: Record<string, unknown> = { status: step };
        if (step === "confirmed") patch.confirmed_at = createdAt;
        if (step === "delivered") patch.delivered_at = createdAt;
        await db.from("orders").update(patch).eq("id", order.id);
      }
    }

    if (target === "delivered") {
      for (const { prod, qty } of items) {
        const { data: cur } = await db.from("products").select("sold_count").eq("id", prod.id).single();
        await db.from("products").update({ sold_count: (cur?.sold_count ?? 0) + qty }).eq("id", prod.id);
      }
      const { data: rest } = await db.from("restaurants").select("total_orders").eq("id", restaurantId).single();
      await db.from("restaurants").update({ total_orders: (rest?.total_orders ?? 0) + 1 }).eq("id", restaurantId);

      if (n % 3 !== 2) {
        const rating = [5, 5, 4, 5, 3, 4][n % 6];
        await db.from("reviews").insert({
          order_id: order.id, user_id: userId, restaurant_id: restaurantId, rating,
          food_rating: Math.min(5, rating + (n % 2)), delivery_rating: rating, comment: comments[n % comments.length],
          reply: n % 4 === 0 ? "Obrigado pela preferência! Volte sempre 🧡" : null,
          replied_at: n % 4 === 0 ? createdAt : null, created_at: createdAt,
        });
      }
    }
  }

  // Pedidos antigos não devem poluir o sino de notificações dos clientes
  await db.from("notifications").update({ read_at: new Date().toISOString() }).lt("created_at", new Date().toISOString());

  console.log(`
✔ Seed concluído
  • ${CATEGORIES.length} categorias, ${RESTAURANTS.length} restaurantes, ${productCount} produtos
  • ${CLIENTS.length} clientes, ${orderCount} pedidos, ${coupons.length} cupons, 3 banners

Contas de demonstração (senha = SEED_DEMO_PASSWORD):
  • Admin:     admin@fastchickn.dev            → /admin
  • Parceiro:  parceiro1@fastchickn.dev        → /parceiro (Chicken House)
  • Clientes:  ana@ / joao@ / marina@ / carlos@ / beatriz@fastchickn.dev
`);
}

main().catch((err) => {
  console.error("✖ Falha no seed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
