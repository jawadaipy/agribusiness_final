/**
 * Payment initiation utilities for JazzCash & EasyPaisa.
 * Plan constants and subscription helpers for the frontend.
 */
import { supabase } from '@/lib/supabase';
import type { MemberProfile } from '@/lib/member';

// ----------------------------------------------------------------
// Plan configuration
// ----------------------------------------------------------------
export const SUBSCRIPTION_PLANS = {
  standard: {
    name: 'standard',
    label: 'Normal User',
    price: 1500,
    trialDays: 14,
    forRoles: ['farmer', 'buyer', 'consultant', 'student'] as const,
    features: [
      'Publish products & services',
      'Post RFPs & requirements',
      'Access plant & animal clinic',
      'Network feed & updates',
      'Marketplace browsing & listing',
      'WhatsApp connect with sellers',
      'Smart matching & directory',
      'Mandi rate intelligence',
    ],
  },
  enterprise: {
    name: 'enterprise',
    label: 'Enterprise & Company',
    price: 4500,
    trialDays: 14,
    forRoles: ['company'] as const,
    features: [
      'Everything in Standard plan',
      'Priority listing placement',
      'Corporate ad studio & campaigns',
      'Unlimited product catalog',
      'B2B tender & contract system',
      'Advanced analytics dashboard',
      'Dedicated account support',
      'Corporate verification badge',
    ],
  },
} as const;

export type PlanName = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Get the plan that applies to a given user role.
 */
export function getPlanForRole(role: string): (typeof SUBSCRIPTION_PLANS)[PlanName] {
  if (role === 'company') return SUBSCRIPTION_PLANS.enterprise;
  return SUBSCRIPTION_PLANS.standard;
}

/**
 * Get the number of trial days remaining for a profile.
 * Returns 0 if trial is expired or not in trial.
 */
export function getTrialDaysRemaining(profile: MemberProfile): number {
  if (profile.subscription_status !== 'trial' || !profile.trial_ends_at) return 0;
  const now = Date.now();
  const end = new Date(profile.trial_ends_at).getTime();
  const remaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, remaining);
}

/**
 * Check if the user's trial has expired and they have no active subscription.
 */
export function isSubscriptionExpired(profile: MemberProfile): boolean {
  return profile.subscription_status === 'expired';
}

/**
 * Check if user has full access (trial active or paid subscription).
 */
export function hasFullAccess(profile: MemberProfile): boolean {
  return profile.subscription_status === 'trial' || profile.subscription_status === 'active';
}

// ----------------------------------------------------------------
// JazzCash Payment Initiation
// ----------------------------------------------------------------

/**
 * Generate a unique transaction reference for JazzCash.
 */
function generateTxnRef(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AB${timestamp}${random}`.toUpperCase().slice(0, 20);
}

/**
 * Format date for JazzCash (yyyyMMddHHmmss).
 */
function formatJazzCashDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

export interface PaymentInitResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

/**
 * Initiate a JazzCash payment by creating a form and auto-submitting it.
 * JazzCash requires a browser POST redirect with signed parameters.
 */
export function initiateJazzCashPayment(
  profileId: string,
  planName: PlanName,
): void {
  const plan = SUBSCRIPTION_PLANS[planName];
  const amountPaise = (plan.price * 100).toString(); // JazzCash uses paise
  const txnRef = generateTxnRef();
  const now = new Date();
  const expiry = new Date(now.getTime() + 30 * 60 * 1000); // 30 min expiry

  const params: Record<string, string> = {
    pp_Version: '1.1',
    pp_TxnType: 'subscription',
    pp_Language: 'EN',
    pp_MerchantID: import.meta.env?.['VITE_JAZZCASH_MERCHANT_ID'] ?? '',
    pp_SubMerchantID: '',
    pp_Password: '', // Filled server-side in production
    pp_BankID: 'TBANK',
    pp_ProductID: planName,
    pp_TxnRefNo: txnRef,
    pp_Amount: amountPaise,
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: formatJazzCashDate(now),
    pp_TxnExpiryDateTime: formatJazzCashDate(expiry),
    pp_BillReference: `user:${profileId}`,
    pp_Description: `AgriBusiness ${plan.label} - PKR ${plan.price}/month`,
    pp_ReturnURL: `${window.location.origin}/dashboard?payment=complete`,
  };

  // Create an auto-submitting form (JazzCash requires POST redirect)
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = import.meta.env?.['VITE_JAZZCASH_API_URL'] ??
    'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';
  form.style.display = 'none';

  for (const [key, value] of Object.entries(params)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Initiate an EasyPaisa payment by creating a form and auto-submitting it.
 */
export function initiateEasyPaisaPayment(
  profileId: string,
  planName: PlanName,
): void {
  const plan = SUBSCRIPTION_PLANS[planName];
  const txnRef = generateTxnRef();

  const params: Record<string, string> = {
    storeId: import.meta.env?.['VITE_EASYPAISA_STORE_ID'] ?? '',
    amount: plan.price.toString(),
    postBackURL: `${window.location.origin}/dashboard?payment=complete`,
    orderRefNum: txnRef,
    orderId: `user:${profileId}`,
    paymentType: 'subscription',
    productId: planName,
    emailAddr: '',
    mobileNum: '',
  };

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = import.meta.env?.['VITE_EASYPAISA_API_URL'] ??
    'https://easypay.easypaisa.com.pk/easypay/Index.jsf';
  form.style.display = 'none';

  for (const [key, value] of Object.entries(params)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Fetch the current user's subscription details from the database.
 */
export async function fetchSubscription(profileId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { subscription: data, error: error?.message ?? null };
}

/**
 * Fetch payment history for a user.
 */
export async function fetchPaymentHistory(profileId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);

  return { payments: data ?? [], error: error?.message ?? null };
}
