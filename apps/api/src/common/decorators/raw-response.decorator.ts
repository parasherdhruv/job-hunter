import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * Opt a route out of the standard API response envelope. Use for endpoints
 * that stream a body (file downloads, health probes consumed by platforms).
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
