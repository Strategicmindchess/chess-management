import { NextRequest } from 'next/server';
import { handleWhatsAppVerification, handleWhatsAppWebhookEvent } from '@/actions/webhook/whatsapp';

export async function GET(req: NextRequest) {
  return handleWhatsAppVerification(req);
}

export async function POST(req: NextRequest) {
  return handleWhatsAppWebhookEvent(req);
}
