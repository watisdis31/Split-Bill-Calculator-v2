export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import {
  jsonError,
  jsonSuccess,
  handleError,
} from '../../../../lib/response.js';
import { requireAuth } from '../../../../lib/auth.js';
import { parseScanImage } from '../../../../lib/validate.js';
import { isGeminiConfigured, scanBillImage } from '../../../../lib/gemini.js';

export async function POST(request) {
  try {
    const { unauthorized } = await requireAuth();
    if (unauthorized) return jsonError('Unauthorized', 401);
    if (!isGeminiConfigured())
      return jsonError('Bill scanning is not configured', 503);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Request body must be a JSON object', 400);
    }

    const image = parseScanImage(body.image);
    if (image.error) return jsonError(image.error, 400);

    let scan;
    try {
      scan = await scanBillImage(image.value);
    } catch (error) {
      console.error(error);
      if (error && error.message === 'QUOTA') {
        return jsonError(
          'Free scan limit reached for now. Please add the items manually or try again later.',
          429,
        );
      }
      if (error && error.message === 'BAD_KEY') {
        return jsonError('Bill scanning is not configured', 503);
      }
      if (error && error.message === 'TEMPORARY_UNAVAILABLE') {
        return jsonError(
          'Bill scanning is temporarily unavailable. Please try again shortly.',
          503,
        );
      }
      if (error && error.message === 'UNREADABLE') {
        return jsonError(
          'Could not read this bill. Please try a clearer photo.',
          502,
        );
      }
      return jsonError('Bill scanning failed. Please try again.', 502);
    }

    if (!scan.items.length) {
      return jsonError(
        'No items could be read from this bill. Please try a clearer photo.',
        422,
      );
    }

    return jsonSuccess('Bill scanned', { scan });
  } catch (error) {
    return handleError(error);
  }
}
