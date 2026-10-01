import type { AddressLabel, OrderStatus, PaymentMethod, PaymentStatus, RestaurantStatus } from "@/types";

export const BRAND = {
  name: "FAST CHICKN",
  slogan: "Seu pedido. Rápido. Fácil. Do seu jeito.",
} as const;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmado",
  preparing: "Preparando seu pedido",
  ready: "Pronto para entrega",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
  rejected: "Recusado",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "warning" | "success" | "danger" | "brand"> = {
  pending: "warning",
  confirmed: "info",
  preparing: "brand",
  ready: "info",
  out_for_delivery: "brand",
  delivered: "success",
  cancelled: "danger",
  rejected: "danger",
};

/** Sequência exibida no acompanhamento do pedido. */
export const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "out_for_delivery"];

/** Próxima ação disponível para o restaurante em cada status. */
export const PARTNER_NEXT_ACTION: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending: { status: "confirmed", label: "Aceitar pedido" },
  confirmed: { status: "preparing", label: "Iniciar preparo" },
  preparing: { status: "ready", label: "Pedido pronto" },
  ready: { status: "out_for_delivery", label: "Saiu para entrega" },
  out_for_delivery: { status: "delivered", label: "Finalizar pedido" },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  on_delivery: "Pagamento na entrega",
};

export const PAYMENT_METHOD_HINT: Record<PaymentMethod, string> = {
  pix: "Pague agora pelo app com QR Code ou copia e cola",
  credit_card: "Na maquininha, no momento da entrega",
  debit_card: "Na maquininha, no momento da entrega",
  cash: "Informe se precisa de troco",
  on_delivery: "Vale-refeição ou outra forma combinada com o entregador",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Estornado",
  cancelled: "Cancelado",
};

export const RESTAURANT_STATUS_LABEL: Record<RestaurantStatus, string> = {
  pending: "Pendente",
  active: "Ativo",
  suspended: "Suspenso",
  blocked: "Bloqueado",
  rejected: "Reprovado",
};

export const ADDRESS_LABEL: Record<AddressLabel, { label: string; icon: string }> = {
  home: { label: "Casa", icon: "🏠" },
  work: { label: "Trabalho", icon: "💼" },
  other: { label: "Outro", icon: "📍" },
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
